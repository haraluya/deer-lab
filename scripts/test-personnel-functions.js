// scripts/test-personnel-functions.js
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Firebase 配置
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

async function testPersonnelFunctions() {
  try {
    console.log('🔧 開始測試人員管理功能...');
    
    // 登入測試用戶
    console.log('🔐 正在登入測試用戶...');
    const userCredential = await signInWithEmailAndPassword(
      auth, 
      'test@deer-lab.local', 
      '123456'
    );
    
    console.log('✅ 登入成功:', userCredential.user.uid);
    
    // 測試 createPersonnel
    console.log('\n📝 測試 createPersonnel...');
    const createPersonnel = httpsCallable(functions, 'createPersonnel');
    
    const testData = {
      name: '測試用戶',
      employeeId: 'TEST001',
      phone: '0900000000',
      roleId: '9HYhawpDuUwUJk8xbpqC', // 使用現有的角色ID
      password: '123456',
      status: 'active'
    };
    
    console.log('📋 測試資料:', testData);
    
    const result = await createPersonnel(testData);
    console.log('✅ createPersonnel 成功:', result.data);
    
    // 測試 updatePersonnel
    console.log('\n📝 測試 updatePersonnel...');
    const updatePersonnel = httpsCallable(functions, 'updatePersonnel');
    
    const updateData = {
      personnelId: result.data.uid,
      name: '測試用戶（已更新）',
      employeeId: 'TEST001',
      phone: '0900000001',
      roleId: '9HYhawpDuUwUJk8xbpqC',
      status: 'active'
    };
    
    console.log('📋 更新資料:', updateData);
    
    const updateResult = await updatePersonnel(updateData);
    console.log('✅ updatePersonnel 成功:', updateResult.data);
    
    // 測試 deletePersonnel
    console.log('\n📝 測試 deletePersonnel...');
    const deletePersonnel = httpsCallable(functions, 'deletePersonnel');
    
    const deleteResult = await deletePersonnel({ personnelId: result.data.uid });
    console.log('✅ deletePersonnel 成功:', deleteResult.data);
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    console.error('錯誤代碼:', error.code);
    console.error('錯誤訊息:', error.message);
    if (error.details) {
      console.error('錯誤詳情:', error.details);
    }
  }
}

// 執行測試
testPersonnelFunctions();
