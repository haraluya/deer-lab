/**
 * 清理未使用的 Firestore 集合
 * 執行前請確保已備份重要資料
 *
 * 使用方式：
 * node cleanup-unused-collections.js
 */

const admin = require('firebase-admin');

// 初始化 Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// 確定可以安全刪除的集合清單
const COLLECTIONS_TO_DELETE = [
  'timeRecords',        // 舊版工時記錄，已被 timeEntries 取代
  'inventoryMovements', // 庫存移動記錄，未使用
  'inventoryLogs',      // 庫存日誌，未使用
  'inventorySnapshots', // 庫存快照，未使用
  'inventoryCounts',    // 庫存盤點，未使用
  'recentSearches',     // 近期搜索，未使用
  'activity_logs',      // 活動日誌，未使用
  'personnel'           // 人員集合（獨立），資料已在 users 集合中
];

/**
 * 刪除整個集合及其所有文檔
 */
async function deleteCollection(collectionName, batchSize = 100) {
  try {
    console.log(`\n🔍 檢查集合: ${collectionName}`);

    // 先檢查集合是否存在且有文檔
    const snapshot = await db.collection(collectionName).limit(1).get();

    if (snapshot.empty) {
      console.log(`✅ 集合 '${collectionName}' 為空或不存在`);
      return { collection: collectionName, status: 'empty', deletedCount: 0 };
    }

    // 統計文檔數量
    const countSnapshot = await db.collection(collectionName).count().get();
    const totalDocs = countSnapshot.data().count;
    console.log(`📊 發現 ${totalDocs} 個文檔`);

    // 批次刪除文檔
    let deletedCount = 0;
    const collectionRef = db.collection(collectionName);

    while (true) {
      const query = collectionRef.limit(batchSize);
      const snapshot = await query.get();

      if (snapshot.empty) {
        break;
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      deletedCount += snapshot.docs.length;

      console.log(`  已刪除 ${deletedCount}/${totalDocs} 個文檔...`);
    }

    console.log(`✅ 成功刪除集合 '${collectionName}' (共 ${deletedCount} 個文檔)`);
    return { collection: collectionName, status: 'deleted', deletedCount };

  } catch (error) {
    console.error(`❌ 刪除集合 '${collectionName}' 時發生錯誤:`, error.message);
    return { collection: collectionName, status: 'error', error: error.message };
  }
}

/**
 * 主程序
 */
async function main() {
  console.log('========================================');
  console.log('Firestore 未使用集合清理工具');
  console.log('========================================');
  console.log('\n⚠️  警告：此操作將永久刪除以下集合：');
  console.log(COLLECTIONS_TO_DELETE.map(c => `  - ${c}`).join('\n'));

  // 等待用戶確認（給 5 秒思考時間）
  console.log('\n⏱️  將在 5 秒後開始執行...');
  console.log('如要取消，請按 Ctrl+C');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n🚀 開始清理未使用的集合...\n');

  const results = [];

  // 逐個刪除集合
  for (const collection of COLLECTIONS_TO_DELETE) {
    const result = await deleteCollection(collection);
    results.push(result);
  }

  // 顯示總結
  console.log('\n========================================');
  console.log('清理結果總結');
  console.log('========================================\n');

  const deleted = results.filter(r => r.status === 'deleted');
  const empty = results.filter(r => r.status === 'empty');
  const errors = results.filter(r => r.status === 'error');

  if (deleted.length > 0) {
    console.log('✅ 成功刪除的集合：');
    deleted.forEach(r => {
      console.log(`  - ${r.collection} (${r.deletedCount} 個文檔)`);
    });
  }

  if (empty.length > 0) {
    console.log('\n📭 空集合或不存在：');
    empty.forEach(r => {
      console.log(`  - ${r.collection}`);
    });
  }

  if (errors.length > 0) {
    console.log('\n❌ 刪除失敗的集合：');
    errors.forEach(r => {
      console.log(`  - ${r.collection}: ${r.error}`);
    });
  }

  const totalDeleted = deleted.reduce((sum, r) => sum + r.deletedCount, 0);
  console.log(`\n📊 總計刪除 ${totalDeleted} 個文檔`);

  console.log('\n✨ 清理完成！');
  process.exit(0);
}

// 執行主程序
main().catch(error => {
  console.error('執行失敗:', error);
  process.exit(1);
});