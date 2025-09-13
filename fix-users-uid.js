// 🔧 修復 users.uid 為 undefined 的記錄
// 將所有用戶的 uid 設定為對應的文檔ID (employeeId)

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function fixUsersUid() {
  console.log('🔧 === 修復 users.uid 記錄 ===\n');

  try {
    // 1. 查找所有 uid 為 undefined 的記錄
    console.log('📋 1. 查找需要修復的記錄:');
    const usersSnapshot = await db.collection('users').get();

    const recordsToFix = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.uid === undefined) {
        recordsToFix.push({
          docId: doc.id,
          name: data.name || '未知',
          employeeId: data.employeeId,
          currentUid: data.uid
        });
      }
    });

    console.log(`   發現 ${recordsToFix.length} 筆需要修復的記錄\n`);

    if (recordsToFix.length === 0) {
      console.log('✅ 沒有發現需要修復的記錄');
      process.exit(0);
    }

    // 2. 顯示修復計劃
    console.log('📋 2. 修復計劃:');
    recordsToFix.forEach((record, index) => {
      console.log(`   ${index + 1}. 文檔ID: ${record.docId}`);
      console.log(`      姓名: ${record.name}`);
      console.log(`      employeeId: ${record.employeeId}`);
      console.log(`      當前 uid: ${record.currentUid}`);
      console.log(`      將設定 uid: ${record.docId}\n`);
    });

    // 3. 執行修復（批次操作）
    console.log('🔧 3. 執行修復:');
    const batch = db.batch();
    let successCount = 0;
    let errorCount = 0;

    recordsToFix.forEach(record => {
      try {
        const userRef = db.collection('users').doc(record.docId);
        batch.update(userRef, {
          uid: record.docId,  // 設定 uid = 文檔ID (employeeId)
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'system-fix-script'
        });
        successCount++;
      } catch (error) {
        console.error(`   ❌ 處理 ${record.docId} 失敗:`, error.message);
        errorCount++;
      }
    });

    if (successCount > 0) {
      console.log(`   準備修復 ${successCount} 筆記錄...`);

      // 執行批次更新
      await batch.commit();

      console.log(`   ✅ 成功修復 ${successCount} 筆記錄`);

      if (errorCount > 0) {
        console.log(`   ❌ 失敗 ${errorCount} 筆記錄`);
      }
    }

    // 4. 驗證修復結果
    console.log('\n📊 4. 驗證修復結果:');
    const verifySnapshot = await db.collection('users').get();

    let verifyStats = {
      total: verifySnapshot.size,
      uidDefined: 0,
      uidUndefined: 0,
      uidMatchesDocId: 0,
      uidMismatchesDocId: 0
    };

    verifySnapshot.forEach(doc => {
      const data = doc.data();
      const docId = doc.id;
      const uid = data.uid;

      if (uid !== undefined) {
        verifyStats.uidDefined++;
        if (uid === docId) {
          verifyStats.uidMatchesDocId++;
        } else {
          verifyStats.uidMismatchesDocId++;
        }
      } else {
        verifyStats.uidUndefined++;
      }
    });

    console.log(`   總記錄數: ${verifyStats.total}`);
    console.log(`   ✅ uid 已定義: ${verifyStats.uidDefined}/${verifyStats.total} 筆`);
    console.log(`   ❌ uid 未定義: ${verifyStats.uidUndefined}/${verifyStats.total} 筆`);
    console.log(`   ✅ uid 與文檔ID匹配: ${verifyStats.uidMatchesDocId}/${verifyStats.uidDefined} 筆`);
    console.log(`   ❌ uid 與文檔ID不匹配: ${verifyStats.uidMismatchesDocId}/${verifyStats.uidDefined} 筆`);

    // 5. 最終狀態確認
    if (verifyStats.uidUndefined === 0 && verifyStats.uidMismatchesDocId === 0) {
      console.log('\n🎉 修復完成！所有用戶記錄的 uid 已正確設定');
      console.log('   employeeId = Firebase Auth UID = users.uid = 文檔ID');
      console.log('   系統現在擁有完全統一的ID映射機制');
    } else {
      console.log('\n⚠️  修復未完全成功，仍有問題記錄需要處理');
    }

    console.log('\n🎯 === 修復完成 ===');

  } catch (error) {
    console.error('❌ 修復過程出現錯誤:', error);
  }

  process.exit(0);
}

fixUsersUid();