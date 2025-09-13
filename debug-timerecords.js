const admin = require('firebase-admin');

// 初始化 Firebase Admin
const serviceAccount = require('./functions/deer-lab-2022-firebase-adminsdk-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugTimeRecords() {
  console.log('=== 檢查工單資料 ===');

  // 1. 檢查工單集合
  const workOrdersSnapshot = await db.collection('work_orders').limit(5).get();
  console.log(`工單總數: ${workOrdersSnapshot.size}`);

  workOrdersSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`工單 ${doc.id}:`);
    console.log(`  - 狀態: ${data.status}`);
    console.log(`  - 工單號: ${data.workOrderNumber || data.code || '未設定'}`);
    console.log(`  - 建立時間: ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : '未設定'}`);
  });

  // 2. 檢查已完工和已入庫的工單
  const validWorkOrdersQuery = await db.collection('work_orders')
    .where('status', 'in', ['完工', '已入庫'])
    .get();

  console.log(`\n=== 已完工/已入庫工單 ===`);
  console.log(`已完工/已入庫工單數量: ${validWorkOrdersQuery.size}`);

  const validWorkOrderIds = [];
  validWorkOrdersQuery.forEach(doc => {
    validWorkOrderIds.push(doc.id);
    const data = doc.data();
    console.log(`有效工單 ${doc.id}: ${data.status} - ${data.workOrderNumber || data.code}`);
  });

  // 3. 檢查工時記錄集合
  console.log(`\n=== 檢查工時記錄 ===`);
  const timeEntriesSnapshot = await db.collection('timeEntries').limit(10).get();
  console.log(`工時記錄總數: ${timeEntriesSnapshot.size}`);

  timeEntriesSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`工時記錄 ${doc.id}:`);
    console.log(`  - 人員ID: ${data.personnelId}`);
    console.log(`  - 工單ID: ${data.workOrderId}`);
    console.log(`  - 工時: ${data.duration || '未設定'}`);
    console.log(`  - 開始時間: ${data.startTime || '未設定'}`);
    console.log(`  - 結束時間: ${data.endTime || '未設定'}`);
    console.log(`  - 建立時間: ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : '未設定'}`);
  });

  // 4. 檢查特定用戶的工時記錄（假設用戶ID存在）
  if (timeEntriesSnapshot.size > 0) {
    const firstRecord = timeEntriesSnapshot.docs[0].data();
    if (firstRecord.personnelId) {
      console.log(`\n=== 檢查用戶 ${firstRecord.personnelId} 的工時記錄 ===`);
      const userTimeEntriesQuery = await db.collection('timeEntries')
        .where('personnelId', '==', firstRecord.personnelId)
        .get();

      console.log(`該用戶的工時記錄數量: ${userTimeEntriesQuery.size}`);

      // 檢查這些記錄中有多少對應到有效工單
      let validRecordsCount = 0;
      userTimeEntriesQuery.forEach(doc => {
        const data = doc.data();
        if (validWorkOrderIds.includes(data.workOrderId)) {
          validRecordsCount++;
          console.log(`有效工時記錄: ${doc.id} - 工單: ${data.workOrderId}`);
        } else {
          console.log(`無效工時記錄: ${doc.id} - 工單: ${data.workOrderId} (工單不存在或狀態不符)`);
        }
      });

      console.log(`有效工時記錄數量: ${validRecordsCount}`);
    }
  }

  process.exit(0);
}

debugTimeRecords().catch(console.error);