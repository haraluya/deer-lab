const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, httpsCallable, connectFunctionsEmulator } = require('firebase/functions');
const { getFirestore, connectFirestoreEmulator } = require('firebase/firestore');

// Firebase 配置
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
const auth = getAuth(app);
const functions = getFunctions(app);
const db = getFirestore(app);

// 連接到本地模擬器
connectFunctionsEmulator(functions, 'localhost', 5001);
connectFirestoreEmulator(db, 'localhost', 8080);

async function testLocalPermissions() {
  try {
    console.log('🧪 開始本地權限測試...');
    
    // 測試登入
    console.log('\n🔐 測試登入...');
    const email = '001@deer-lab.local'; // 哈雷雷的帳號
    const password = '123456'; // 請替換為實際密碼
    
    console.log(`嘗試登入: ${email}`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ 登入成功:', userCredential.user.uid);
    
    // 測試人員管理權限
    console.log('\n👥 測試人員管理權限...');
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
    
    try {
      const result = await createPersonnel(testData);
      console.log('✅ 權限檢查通過，可以新增人員');
      console.log('結果:', result.data);
    } catch (error) {
      console.log('❌ 權限檢查失敗:', error.message);
      
      if (error.code === 'functions/permission-denied') {
        console.log('💡 權限不足，請檢查角色權限設定');
      }
    }
    
    // 測試更新人員權限
    console.log('\n✏️ 測試更新人員權限...');
    const updatePersonnel = httpsCallable(functions, 'updatePersonnel');
    
    const updateData = {
      personnelId: 'test001',
      name: '測試使用者更新',
      employeeId: 'test001',
      phone: '0900000000',
      roleId: 'test-role-id',
      status: 'active'
    };
    
    console.log('發送更新資料:', updateData);
    
    try {
      const result = await updatePersonnel(updateData);
      console.log('✅ 更新權限檢查通過');
      console.log('結果:', result.data);
    } catch (error) {
      console.log('❌ 更新權限檢查失敗:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}

// 執行測試
testLocalPermissions();
