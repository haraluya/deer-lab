#!/usr/bin/env node

/**
 * Firebase Function 直接測試工具
 * 用於測試 quickUpdateInventory API 的實際行為
 */

const admin = require('firebase-admin');
const { httpsCallable, getApp } = require('firebase/app');
const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable: httpsCallableClient } = require('firebase/functions');

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

async function testQuickUpdateInventory() {
  console.log('🧪 開始直接測試 quickUpdateInventory Firebase Function...\n');

  try {
    // 1. 準備測試資料
    const testMaterial = 'nDlEuQCO7UeFjvSLN8zP'; // 使用一個已知的物料 ID
    console.log(`📦 使用測試物料 ID: ${testMaterial}`);

    // 2. 準備測試請求資料 (新格式)
    const requestData = {
      updates: [{
        type: 'material',
        itemId: testMaterial,
        newStock: 999,
        reason: '🧪 API 測試更新'
      }]
    };

    console.log('📤 發送請求資料:');
    console.log(JSON.stringify(requestData, null, 2));

    // 3. 調用 Firebase Function
    console.log('\n🚀 調用 quickUpdateInventory...');
    const quickUpdateFunction = httpsCallableClient(functions, 'quickUpdateInventory');

    const result = await quickUpdateFunction(requestData);

    console.log('\n📥 Firebase Function 原始回應:');
    console.log('- result:', result);
    console.log('- result.data:', result.data);
    console.log('- typeof result.data:', typeof result.data);

    if (result.data) {
      console.log('\n🔍 回應結構分析:');
      console.log('- 是否有 success 屬性:', 'success' in result.data);
      console.log('- 是否有 meta 屬性:', 'meta' in result.data);
      console.log('- 是否有 summary 屬性:', 'summary' in result.data);
      console.log('- 是否有 successful 屬性:', 'successful' in result.data);
      console.log('- 是否有 failed 屬性:', 'failed' in result.data);

      if (result.data.summary) {
        console.log('\n📊 Summary 內容:');
        console.log(JSON.stringify(result.data.summary, null, 2));
      }

      if (result.data.successful) {
        console.log(`\n✅ 成功項目數: ${result.data.successful.length}`);
      }

      if (result.data.failed) {
        console.log(`\n❌ 失敗項目數: ${result.data.failed.length}`);
        if (result.data.failed.length > 0) {
          console.log('失敗項目:', JSON.stringify(result.data.failed, null, 2));
        }
      }
    }

  } catch (error) {
    console.error('\n💥 調用 Firebase Function 發生錯誤:');
    console.error('- Error object:', error);
    console.error('- Error message:', error.message);
    console.error('- Error code:', error.code);
    console.error('- Error details:', error.details);

    if (error.message) {
      console.error(`\n🚨 錯誤訊息: ${error.message}`);
    }

    // 檢查是否是參數錯誤
    if (error.code === 'invalid-argument') {
      console.error('\n⚠️ 參數錯誤 - 可能是後端還在使用舊格式');
      console.log('嘗試使用舊格式測試...');

      try {
        const oldFormatData = {
          itemId: testMaterial,
          itemType: 'material',
          newStock: 999,
          remarks: '🧪 舊格式測試更新'
        };

        console.log('📤 舊格式請求資料:');
        console.log(JSON.stringify(oldFormatData, null, 2));

        const oldResult = await quickUpdateFunction(oldFormatData);
        console.log('\n✅ 舊格式調用成功:');
        console.log(JSON.stringify(oldResult.data, null, 2));

      } catch (oldError) {
        console.error('\n❌ 舊格式也失敗:', oldError.message);
      }
    }

    throw error;
  }
}

// 執行測試
testQuickUpdateInventory().then(() => {
  console.log('\n🎉 測試完成！');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 測試失敗，需要檢查：');
  console.error('1. Firebase Functions 是否已正確部署新版本');
  console.error('2. 網路連線是否正常');
  console.error('3. Firebase 專案權限是否正確');
  console.error('4. API 參數格式是否匹配後端期望');
  process.exit(1);
});