const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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
const db = getFirestore(app);

async function debugUserPermissions() {
  try {
    console.log('🔍 調試用戶權限問題...');
    
    // 測試登入
    console.log('\n🔐 測試登入...');
    const email = '001@deer-lab.local'; // 哈雷雷的帳號
    const password = '123456'; // 請替換為實際密碼
    
    console.log(`嘗試登入: ${email}`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ 登入成功:', userCredential.user.uid);
    
    // 獲取使用者資料
    console.log('\n👤 獲取使用者資料...');
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (!userDoc.exists()) {
      console.log('❌ 找不到使用者資料');
      return;
    }
    
    const userData = userDoc.data();
    console.log('📋 使用者資料:', {
      name: userData.name,
      employeeId: userData.employeeId,
      phone: userData.phone,
      status: userData.status,
      roleRef: userData.roleRef?.path || 'null'
    });
    
    // 檢查 roleRef 是否存在
    if (!userData.roleRef) {
      console.log('❌ 使用者沒有指派角色 (roleRef 為 null)');
      console.log('💡 這是權限檢查失敗的根本原因！');
      return;
    }
    
    // 獲取角色資料
    console.log('\n🎭 獲取角色資料...');
    const roleDoc = await getDoc(userData.roleRef);
    
    if (!roleDoc.exists()) {
      console.log('❌ 找不到角色資料');
      return;
    }
    
    const roleData = roleDoc.data();
    console.log('📋 角色資料:', {
      name: roleData.name,
      description: roleData.description,
      permissions: roleData.permissions
    });
    
    // 檢查人員管理相關權限
    console.log('\n🔍 檢查人員管理權限...');
    const personnelPermissions = [
      '新增人員',
      '編輯人員', 
      '刪除人員',
      '查看人員管理'
    ];
    
    personnelPermissions.forEach(permission => {
      const hasPermission = roleData.permissions?.includes(permission);
      console.log(`${hasPermission ? '✅' : '❌'} ${permission}: ${hasPermission ? '有權限' : '無權限'}`);
    });
    
    // 檢查是否有任何人員管理權限
    const hasAnyPersonnelPermission = personnelPermissions.some(permission => 
      roleData.permissions?.includes(permission)
    );
    
    console.log(`\n🎯 人員管理權限總結: ${hasAnyPersonnelPermission ? '✅ 有權限' : '❌ 無權限'}`);
    
    if (hasAnyPersonnelPermission) {
      console.log('✅ 角色具有人員管理權限，權限檢查應該通過');
      console.log('💡 如果仍然失敗，可能是 AuthContext 的問題');
    } else {
      console.log('❌ 角色沒有人員管理權限');
      console.log('💡 請為「系統管理員」角色添加人員管理權限');
    }
    
    // 模擬權限檢查邏輯
    console.log('\n🧪 模擬權限檢查邏輯...');
    const requiredPermission = '編輯人員';
    const hasPermission = roleData.permissions?.includes(requiredPermission);
    
    if (hasPermission) {
      console.log(`✅ 模擬權限檢查成功: 角色 ${roleData.name} 具有權限 ${requiredPermission}`);
    } else {
      console.log(`❌ 模擬權限檢查失敗: 角色 ${roleData.name} 需要權限 ${requiredPermission}，但只有權限: ${roleData.permissions?.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ 調試失敗:', error);
  }
}

// 執行調試
debugUserPermissions();
