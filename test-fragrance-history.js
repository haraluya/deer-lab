// 測試腳本：手動創建香精歷史記錄
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// 初始化 Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://deer-lab.firebaseio.com`
});

const db = admin.firestore();

async function createTestHistory() {
  try {
    // 先檢查集合是否存在
    const collectionRef = db.collection('fragranceChangeHistory');
    const snapshot = await collectionRef.limit(1).get();
    console.log('集合狀態:', snapshot.empty ? '空集合' : '有資料');

    // 創建測試記錄
    const testRecord = {
      productId: '1KO',  // 使用您測試的產品ID
      productName: '測試產品',
      productCode: 'TEST-001',
      oldFragranceId: 'old-fragrance-id',
      oldFragranceName: '舊香精',
      oldFragranceCode: 'OLD-001',
      newFragranceId: 'new-fragrance-id',
      newFragranceName: '新香精',
      newFragranceCode: 'NEW-001',
      changeReason: '測試香精更換',
      changeDate: admin.firestore.FieldValue.serverTimestamp(),
      changedBy: 'test-user',
      changedByEmail: 'test@example.com',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await collectionRef.add(testRecord);
    console.log('測試記錄已創建，ID:', docRef.id);

    // 驗證記錄是否成功創建
    const verifyDoc = await docRef.get();
    if (verifyDoc.exists) {
      console.log('驗證成功，記錄內容:', verifyDoc.data());
    } else {
      console.log('驗證失敗：記錄不存在');
    }

    // 查詢該產品的所有歷史記錄
    const querySnapshot = await collectionRef
      .where('productId', '==', '1KO')
      .get();

    console.log(`產品 1KO 的香精歷史記錄數量: ${querySnapshot.size}`);
    querySnapshot.forEach(doc => {
      console.log('記錄ID:', doc.id, '資料:', doc.data());
    });

  } catch (error) {
    console.error('錯誤:', error);
  } finally {
    // 關閉連接
    await admin.app().delete();
    process.exit(0);
  }
}

// 執行測試
createTestHistory();