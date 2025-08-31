const admin = require('firebase-admin');

// 初始化 Firebase Admin SDK
const serviceAccount = require('./deer-lab-firebase-adminsdk-fbsvc-d35cefcad6.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugInventoryRecords() {
  try {
    console.log('=== 開始診斷 inventory_records 集合 ===');
    
    // 獲取最新的 10 筆記錄
    const snapshot = await db.collection('inventory_records')
      .orderBy('changeDate', 'desc')
      .limit(10)
      .get();
    
    console.log(`\n找到 ${snapshot.size} 筆記錄`);
    
    if (snapshot.empty) {
      console.log('沒有找到任何記錄');
      return;
    }
    
    // 檢查每筆記錄
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      const changeDate = data.changeDate?.toDate?.() || data.changeDate;
      
      console.log(`\n--- 記錄 ${index + 1} (ID: ${doc.id}) ---`);
      console.log('變更日期:', changeDate);
      console.log('變更原因:', data.changeReason);
      console.log('操作者:', data.operatorName || data.operatorId);
      console.log('備註:', data.remarks);
      console.log('details 陣列長度:', data.details?.length || 0);
      
      if (data.details && data.details.length > 0) {
        console.log('details 內容:');
        data.details.forEach((detail, i) => {
          console.log(`  ${i + 1}. ${detail.itemName} (${detail.itemCode}) - 變更: ${detail.quantityChange}, 新庫存: ${detail.quantityAfter}`);
        });
      } else {
        console.log('details 陣列為空或不存在');
      }
      
      // 檢查是否有舊格式的欄位
      const oldFields = ['itemId', 'itemType', 'itemCode', 'itemName', 'quantityChange', 'quantityAfter'];
      const hasOldFields = oldFields.some(field => data[field] !== undefined);
      if (hasOldFields) {
        console.log('⚠️  發現舊格式欄位:');
        oldFields.forEach(field => {
          if (data[field] !== undefined) {
            console.log(`    ${field}: ${data[field]}`);
          }
        });
      }
      
      // 顯示完整記錄內容（用於調試）
      console.log('完整記錄內容:', JSON.stringify(data, null, 2));
    });
    
  } catch (error) {
    console.error('診斷過程中發生錯誤:', error);
  } finally {
    process.exit(0);
  }
}

debugInventoryRecords();
