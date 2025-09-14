/**
 * 驗證 Firestore 集合狀態
 * 檢查哪些集合存在並顯示文檔數量
 */

const admin = require('firebase-admin');

// 初始化 Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// 所有可能的集合名稱
const ALL_COLLECTIONS = [
  // 核心集合（應該存在）
  { name: 'users', expected: true },
  { name: 'roles', expected: true },
  { name: 'materials', expected: true },
  { name: 'fragrances', expected: true },
  { name: 'products', expected: true },
  { name: 'suppliers', expected: true },
  { name: 'globalCart', expected: true },
  { name: 'timeEntries', expected: true },

  // 工單和採購（兩種命名）
  { name: 'work_orders', expected: true },
  { name: 'workOrders', expected: true },
  { name: 'purchase_orders', expected: true },
  { name: 'purchaseOrders', expected: true },

  // 庫存相關
  { name: 'inventory_records', expected: true },

  // 分類集合
  { name: 'materialCategories', expected: true },
  { name: 'materialSubCategories', expected: true },
  { name: 'fragranceTypes', expected: true },
  { name: 'fragranceStatuses', expected: true },

  // 歷史記錄
  { name: 'fragranceChangeHistory', expected: true },
  { name: 'productSeries', expected: true },

  // 已刪除的集合（不應該存在）
  { name: 'timeRecords', expected: false },
  { name: 'inventoryMovements', expected: false },
  { name: 'inventoryLogs', expected: false },
  { name: 'inventorySnapshots', expected: false },
  { name: 'inventoryCounts', expected: false },
  { name: 'recentSearches', expected: false },
  { name: 'activity_logs', expected: false },
  { name: 'personnel', expected: false }
];

/**
 * 檢查單個集合
 */
async function checkCollection(collectionInfo) {
  try {
    const snapshot = await db.collection(collectionInfo.name).limit(1).get();

    if (!snapshot.empty) {
      // 集合存在且有文檔
      const countSnapshot = await db.collection(collectionInfo.name).count().get();
      const count = countSnapshot.data().count;

      return {
        name: collectionInfo.name,
        exists: true,
        count: count,
        expected: collectionInfo.expected
      };
    } else {
      // 集合為空或不存在
      return {
        name: collectionInfo.name,
        exists: false,
        count: 0,
        expected: collectionInfo.expected
      };
    }
  } catch (error) {
    return {
      name: collectionInfo.name,
      exists: false,
      count: 0,
      expected: collectionInfo.expected,
      error: error.message
    };
  }
}

/**
 * 主程序
 */
async function main() {
  console.log('========================================');
  console.log('Firestore 集合狀態驗證');
  console.log('========================================\n');

  const results = [];

  // 檢查所有集合
  for (const collection of ALL_COLLECTIONS) {
    const result = await checkCollection(collection);
    results.push(result);
  }

  // 分類顯示結果
  const existingExpected = results.filter(r => r.exists && r.expected);
  const existingUnexpected = results.filter(r => r.exists && !r.expected);
  const missingExpected = results.filter(r => !r.exists && r.expected);
  const missingConfirmed = results.filter(r => !r.exists && !r.expected);

  console.log('✅ 正常存在的集合:');
  if (existingExpected.length > 0) {
    existingExpected.forEach(r => {
      console.log(`  - ${r.name.padEnd(25)} (${r.count} 個文檔)`);
    });
  } else {
    console.log('  （無）');
  }

  console.log('\n⚠️  意外存在的集合（應該已刪除）:');
  if (existingUnexpected.length > 0) {
    existingUnexpected.forEach(r => {
      console.log(`  - ${r.name.padEnd(25)} (${r.count} 個文檔) ⚠️`);
    });
  } else {
    console.log('  （無）');
  }

  console.log('\n❓ 預期存在但未找到的集合:');
  if (missingExpected.length > 0) {
    missingExpected.forEach(r => {
      console.log(`  - ${r.name}`);
    });
  } else {
    console.log('  （無）');
  }

  console.log('\n✅ 確認已刪除的集合:');
  if (missingConfirmed.length > 0) {
    missingConfirmed.forEach(r => {
      console.log(`  - ${r.name}`);
    });
  } else {
    console.log('  （無）');
  }

  // 統計摘要
  console.log('\n========================================');
  console.log('統計摘要');
  console.log('========================================');

  const totalExpected = ALL_COLLECTIONS.filter(c => c.expected).length;
  const totalDeleted = ALL_COLLECTIONS.filter(c => !c.expected).length;
  const actualExisting = results.filter(r => r.exists).length;
  const actualDeleted = results.filter(r => !r.exists && !r.expected).length;

  console.log(`預期存在的集合: ${existingExpected.length}/${totalExpected}`);
  console.log(`成功刪除的集合: ${actualDeleted}/${totalDeleted}`);

  if (existingUnexpected.length === 0 && actualDeleted === totalDeleted) {
    console.log('\n✨ 所有集合狀態正常！廢棄集合已成功清理。');
  } else if (existingUnexpected.length > 0) {
    console.log('\n⚠️  警告：仍有一些應該刪除的集合存在，請檢查上方列表。');
  }

  process.exit(0);
}

// 執行主程序
main().catch(error => {
  console.error('執行失敗:', error);
  process.exit(1);
});