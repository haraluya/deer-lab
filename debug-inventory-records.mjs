// 使用前端的 Firebase 配置
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCMIAqNPsIyl3fJNllqNCuUJE2Rvcdf6fk",
  authDomain: "deer-lab.firebaseapp.com",
  projectId: "deer-lab",
  storageBucket: "deer-lab.firebasestorage.app",
  messagingSenderId: "554942047858",
  appId: "1:554942047858:web:607d3e27bb438c898644eb"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugInventoryRecords() {
  try {
    console.log('=== 開始診斷 inventory_records 集合 ===');
    
    // 獲取最新的 10 筆記錄
    const inventoryRecordsRef = collection(db, 'inventory_records');
    const q = query(inventoryRecordsRef, orderBy('changeDate', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    
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
        console.log('⚠️  發現舊格式欄位:', oldFields.filter(field => data[field] !== undefined));
      }
    });
    
    // 特別檢查 inventory_check 類型的記錄
    console.log('\n=== 檢查 inventory_check 類型的記錄 ===');
    const checkQuery = query(
      inventoryRecordsRef, 
      where('changeReason', '==', 'inventory_check'),
      orderBy('changeDate', 'desc'),
      limit(5)
    );
    
    const checkSnapshot = await getDocs(checkQuery);
    console.log(`找到 ${checkSnapshot.size} 筆 inventory_check 記錄`);
    
    checkSnapshot.forEach((doc, index) => {
      const data = doc.data();
      const changeDate = data.changeDate?.toDate?.() || data.changeDate;
      
      console.log(`\n--- inventory_check 記錄 ${index + 1} (ID: ${doc.id}) ---`);
      console.log('變更日期:', changeDate);
      console.log('操作者:', data.operatorName || data.operatorId);
      console.log('details 陣列長度:', data.details?.length || 0);
      
      if (data.details && data.details.length > 0) {
        console.log('details 內容:');
        data.details.forEach((detail, i) => {
          console.log(`  ${i + 1}. ${detail.itemName} (${detail.itemCode}) - 變更: ${detail.quantityChange}`);
        });
      }
    });
    
  } catch (error) {
    console.error('診斷過程中發生錯誤:', error);
  }
}

debugInventoryRecords();
