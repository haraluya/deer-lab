const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyBvQvQvQvQvQvQvQvQvQvQvQvQvQvQvQvQ",
  authDomain: "deer-lab.firebaseapp.com",
  projectId: "deer-lab",
  storageBucket: "deer-lab.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

async function testPersonnelFunctions() {
  try {
    console.log('🧪 開始測試人員管理 Firebase Functions...');
    
    // 測試 createPersonnel
    console.log('\n📝 測試 createPersonnel...');
    const createPersonnel = httpsCallable(functions, 'createPersonnel');
    
    const testData = {
      name: '測試使用者',
      employeeId: 'test001',
      phone: '0900000000',
      roleId: 'test-role-id',
      password: 'test123456',
      status: 'active'
    };
    
    console.log('發送測試資料:', testData);
    
    const result = await createPersonnel(testData);
    console.log('✅ createPersonnel 結果:', result.data);
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    
    if (error.code === 'functions/unavailable') {
      console.log('💡 提示: Firebase Functions 可能未正確部署或配置');
    } else if (error.code === 'functions/permission-denied') {
      console.log('💡 提示: 權限不足，請檢查使用者角色');
    } else if (error.code === 'functions/unauthenticated') {
      console.log('💡 提示: 未認證，請先登入');
    }
  }
}

// 執行測試
testPersonnelFunctions();
