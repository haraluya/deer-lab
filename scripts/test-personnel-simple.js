// scripts/test-personnel-simple.js
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Firebase 配置 - 請根據您的實際配置修改
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "deer-lab.firebaseapp.com",
  projectId: "deer-lab",
  storageBucket: "deer-lab.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

async function testPersonnelFunctions() {
  try {
    console.log('🔧 開始測試人員管理功能...');
    
    // 登入測試用戶（請使用實際的測試帳號）
    console.log('🔐 正在登入...');
    const userCredential = await signInWithEmailAndPassword(auth, 'test@example.com', 'password123');
    console.log('✅ 登入成功:', userCredential.user.uid);
    
    // 測試建立人員
    console.log('📝 測試建立人員...');
    const createPersonnel = httpsCallable(functions, 'createPersonnel');
    const createResult = await createPersonnel({
      name: '測試人員',
      employeeId: 'TEST001',
      phone: '0912345678',
      roleId: 'admin-role-id', // 請使用實際的角色ID
      password: 'test123456',
      status: 'active'
    });
    console.log('✅ 建立人員成功:', createResult.data);
    
    // 測試更新人員
    console.log('📝 測試更新人員...');
    const updatePersonnel = httpsCallable(functions, 'updatePersonnel');
    const updateResult = await updatePersonnel({
      personnelId: createResult.data.uid,
      name: '測試人員-已更新',
      employeeId: 'TEST001',
      phone: '0987654321',
      roleId: 'admin-role-id',
      status: 'active'
    });
    console.log('✅ 更新人員成功:', updateResult.data);
    
    console.log('🎉 所有測試通過！');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    console.error('錯誤詳情:', error.message);
    if (error.code) {
      console.error('錯誤代碼:', error.code);
    }
  }
}

// 執行測試
testPersonnelFunctions();
