#!/usr/bin/env node

/**
 * 測試 quickUpdateInventory API
 */

const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');

// 初始化 Firebase Admin (伺服器端)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'deer-lab'
  });
}

// 初始化 Firebase Client (模擬前端)
const firebaseConfig = {
  projectId: 'deer-lab',
  authDomain: 'deer-lab.firebaseapp.com',
  appId: '1:554942047858:web:your-app-id'
};

const clientApp = initializeApp(firebaseConfig, 'client');
const functions = getFunctions(clientApp);

async function testQuickUpdate() {
  console.log('🧪 測試 quickUpdateInventory API...\n');

  try {
    // 使用庫存頁面的格式
    const requestData = {
      updates: [{
        type: 'material',
        itemId: '04oQv2ntIudOGTrGif0Z', // 從截圖中的ID
        newStock: 2030,
        reason: '測試更新'
      }]
    };

    console.log('📤 發送請求資料:');
    console.log(JSON.stringify(requestData, null, 2));

    const quickUpdateFunction = httpsCallable(functions, 'quickUpdateInventory');
    const result = await quickUpdateFunction(requestData);

    console.log('\n✅ 調用成功:');
    console.log('- result:', result);
    console.log('- result.data:', result.data);

  } catch (error) {
    console.error('\n❌ 調用失敗:');
    console.error('- Error:', error);
    console.error('- Error message:', error.message);
    console.error('- Error code:', error.code);
    console.error('- Error details:', error.details);
  }
}

testQuickUpdate().then(() => {
  console.log('\n🎉 測試完成！');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 測試失敗:', error);
  process.exit(1);
});