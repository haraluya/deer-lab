// 臨時除錯腳本 - 直接測試 Firebase Functions
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");

// 這個腳本的目標是理解實際資料結構
async function debugTimeRecordsData() {
  const admin = require('firebase-admin');

  // 檢查是否已初始化
  if (!admin.apps.length) {
    admin.initializeApp();
  }

  const db = admin.firestore();

  console.log('=== 除錯工時記錄資料結構 ===');

  try {
    // 1. 檢查工單集合的狀態值
    console.log('\n1. 檢查工單狀態值:');
    const workOrdersSnapshot = await db.collection('work_orders').limit(10).get();
    const statusSet = new Set();

    workOrdersSnapshot.forEach(doc => {
      const data = doc.data();
      statusSet.add(data.status);
      console.log(`工單 ${doc.id.slice(-6)}: 狀態 = "${data.status}"`);
    });

    console.log('\n所有工單狀態值:', Array.from(statusSet));

    // 2. 檢查工時記錄的使用者ID字段
    console.log('\n2. 檢查工時記錄的欄位:');
    const timeEntriesSnapshot = await db.collection('timeEntries').limit(5).get();

    timeEntriesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`工時記錄 ${doc.id.slice(-6)}:`);
      console.log(`  - personnelId: ${data.personnelId || '無'}`);
      console.log(`  - userId: ${data.userId || '無'}`);
      console.log(`  - workOrderId: ${data.workOrderId || '無'}`);
      console.log(`  - duration: ${data.duration || '無'}`);
      console.log(`  - 建立時間: ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : '無'}`);
    });

    // 3. 檢查是否有使用者的工時記錄
    console.log('\n3. 檢查所有不重複的 personnelId:');
    const allPersonnelIds = new Set();
    timeEntriesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.personnelId) allPersonnelIds.add(data.personnelId);
      if (data.userId) allPersonnelIds.add(data.userId);
    });

    console.log('所有人員ID:', Array.from(allPersonnelIds));

  } catch (error) {
    console.error('除錯失敗:', error);
  }
}

// 模擬Firebase Functions環境
if (require.main === module) {
  debugTimeRecordsData();
}

module.exports = { debugTimeRecordsData };