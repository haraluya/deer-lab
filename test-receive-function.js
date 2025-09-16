// 測試採購單收貨函數
// 在瀏覽器控制台執行此腳本

async function testReceiveFunction() {
  try {
    // 獲取 Firebase 實例
    const { auth, functions } = window.firebaseInstances || {};

    if (!auth || !functions) {
      console.error('Firebase 未初始化');
      return;
    }

    // 檢查用戶登入狀態
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('用戶未登入');
      return;
    }

    console.log('當前用戶:', {
      uid: currentUser.uid,
      email: currentUser.email
    });

    // 測試調用函數
    const { httpsCallable } = await import('firebase/functions');
    const receivePurchaseOrderItems = httpsCallable(functions, 'receivePurchaseOrderItems');

    // 測試資料
    const testData = {
      purchaseOrderId: 'TEST_ID',
      items: [
        {
          itemRefPath: 'materials/test',
          code: 'TEST_CODE',
          name: 'Test Item',
          receivedQuantity: 1
        }
      ]
    };

    console.log('發送測試資料:', testData);

    const result = await receivePurchaseOrderItems(testData);
    console.log('函數回應:', result.data);

  } catch (error) {
    console.error('測試失敗:', error);
    console.error('錯誤詳情:', {
      code: error.code,
      message: error.message,
      details: error.details
    });
  }
}

// 執行測試
testReceiveFunction();