// scripts/test-permission-debug.js
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyBqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXq",
  authDomain: "deer-lab.firebaseapp.com",
  projectId: "deer-lab",
  storageBucket: "deer-lab.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testPermissions() {
  try {
    console.log('🔍 開始測試權限...');
    
    // 登入測試用戶
    const userCredential = await signInWithEmailAndPassword(auth, 'test@deer-lab.local', 'test123');
    const user = userCredential.user;
    console.log('✅ 登入成功:', user.uid);
    
    // 獲取用戶資料
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      console.log('❌ 找不到用戶資料');
      return;
    }
    
    const userData = userDoc.data();
    console.log('📋 用戶資料:', userData);
    
    // 獲取角色資料
    const roleDoc = await getDoc(userData.roleRef);
    if (!roleDoc.exists()) {
      console.log('❌ 找不到角色資料');
      return;
    }
    
    const roleData = roleDoc.data();
    console.log('📋 角色資料:', roleData);
    console.log('📋 權限列表:', roleData.permissions);
    
    // 檢查人員管理權限
    const personnelPermissions = [
      'personnel:create', 'personnel:edit', 'personnel:delete', 'personnel:view',
      '新增人員', '編輯人員', '刪除人員', '查看人員管理'
    ];
    
    console.log('🔍 檢查人員管理權限:');
    for (const permission of personnelPermissions) {
      const hasPermission = roleData.permissions.includes(permission);
      console.log(`  ${permission}: ${hasPermission ? '✅' : '❌'}`);
    }
    
    const hasAnyPermission = personnelPermissions.some(p => roleData.permissions.includes(p));
    console.log(`🎯 是否有任何人員管理權限: ${hasAnyPermission ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}

testPermissions();
