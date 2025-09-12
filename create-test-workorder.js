// 創建測試工單資料 - 在 Firebase Console 或本地環境執行
// 這個腳本會在 workOrders 集合中創建一些測試資料

const testWorkOrders = [
  {
    code: "WO-2025-001",
    status: "預報",
    targetQuantity: 100,
    productSnapshot: {
      name: "測試產品 A",
      seriesName: "經典系列",
      code: "PROD-001"
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    code: "WO-2025-002", 
    status: "進行",
    targetQuantity: 50,
    productSnapshot: {
      name: "測試產品 B",
      seriesName: "高端系列",
      code: "PROD-002"
    },
    createdAt: new Date(Date.now() - 86400000), // 1天前
    updatedAt: new Date()
  },
  {
    code: "WO-2025-003",
    status: "完工", 
    targetQuantity: 200,
    productSnapshot: {
      name: "測試產品 C",
      seriesName: "經典系列",
      code: "PROD-003"
    },
    createdAt: new Date(Date.now() - 172800000), // 2天前
    updatedAt: new Date()
  }
];

// 如果在瀏覽器環境中運行
if (typeof window !== 'undefined') {
  window.createTestWorkOrders = async function() {
    try {
      // 假設您已經有 Firebase 初始化
      const { collection, addDoc } = window.firebase.firestore;
      const db = window.db; // 您的 Firestore 實例
      
      console.log('🔧 開始創建測試工單資料...');
      
      for (const workOrder of testWorkOrders) {
        const docRef = await addDoc(collection(db, 'workOrders'), workOrder);
        console.log(`✅ 創建工單: ${workOrder.code} (ID: ${docRef.id})`);
      }
      
      console.log('🎉 所有測試工單已創建完成！');
      console.log('📋 請重新載入頁面查看結果');
      
    } catch (error) {
      console.error('❌ 創建測試工單失敗:', error);
    }
  };
  
  console.log('💡 在控制台執行 createTestWorkOrders() 來創建測試資料');
}

// Node.js 環境 (如果需要的話)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testWorkOrders };
}

// 輸出資料供複製貼上到 Firebase Console
console.log('📋 測試工單資料 (可複製到 Firebase Console):');
console.log(JSON.stringify(testWorkOrders, null, 2));