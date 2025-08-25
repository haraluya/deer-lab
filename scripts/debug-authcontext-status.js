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

async function debugAuthContextStatus() {
  try {
    console.log('🔍 檢查 AuthContext 狀態...');
    
    // 測試登入
    console.log('\n🔐 測試登入...');
    const email = '001@deer-lab.local';
    const password = '123456';
    
    console.log(`嘗試登入: ${email}`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ 登入成功:', userCredential.user.uid);
    
    // 模擬 AuthContext 的 loadUserData 函數
    console.log('\n🔍 模擬 AuthContext loadUserData...');
    
    // 從 Firestore 獲取用戶資料
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log('❌ 找不到使用者資料');
      return;
    }
    
    const userData = userDoc.data();
    console.log('📋 原始用戶資料:', {
      uid: userData.uid,
      name: userData.name,
      employeeId: userData.employeeId,
      phone: userData.phone,
      status: userData.status,
      roleRef: userData.roleRef?.path || 'null'
    });
    
    // 檢查 roleRef 是否存在
    if (!userData.roleRef) {
      console.log('❌ 使用者沒有指派角色 (roleRef 為 null)');
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
    
    // 模擬 AuthContext 的完整用戶資料
    const appUser = {
      ...userData,
      roleName: roleData.name,
      permissions: roleData.permissions || []
    };
    
    console.log('\n📊 模擬 AuthContext appUser 狀態:', {
      uid: appUser.uid,
      name: appUser.name,
      employeeId: appUser.employeeId,
      phone: appUser.phone,
      status: appUser.status,
      roleRef: appUser.roleRef?.path || 'null',
      roleName: appUser.roleName,
      permissionsCount: appUser.permissions?.length || 0
    });
    
    // 模擬權限檢查
    console.log('\n🔍 模擬權限檢查...');
    
    const personnelPermissions = [
      'personnel:create', 'personnel:edit', 'personnel:delete', 'personnel:view',
      '新增人員', '編輯人員', '刪除人員', '查看人員管理'
    ];
    
    const hasPersonnelPermission = personnelPermissions.some(permission => 
      appUser.permissions?.includes(permission)
    );
    
    console.log(`✅ 人員管理權限檢查: ${hasPersonnelPermission ? '通過' : '失敗'}`);
    
    if (hasPersonnelPermission) {
      const foundPermissions = personnelPermissions.filter(permission => 
        appUser.permissions?.includes(permission)
      );
      console.log('✅ 找到的人員管理權限:', foundPermissions);
    }
    
    // 檢查具體權限
    console.log('\n🎯 檢查具體權限...');
    const specificPermissions = [
      'personnel:create',
      'personnel:edit', 
      'personnel:delete',
      'personnel:view'
    ];
    
    specificPermissions.forEach(permission => {
      const hasPermission = appUser.permissions?.includes(permission);
      console.log(`${hasPermission ? '✅' : '❌'} ${permission}: ${hasPermission ? '有權限' : '無權限'}`);
    });
    
    // 總結
    console.log('\n' + '='.repeat(60));
    console.log('📊 AuthContext 狀態總結:');
    console.log(`👤 使用者: ${appUser.name} (${appUser.employeeId})`);
    console.log(`🎭 角色: ${appUser.roleName}`);
    console.log(`📋 權限數量: ${appUser.permissions?.length || 0}`);
    console.log(`✅ 人員管理權限: ${hasPersonnelPermission ? '有' : '無'}`);
    console.log(`✅ appUser 狀態: ${appUser ? '已載入' : '未載入'}`);
    console.log(`✅ roleRef: ${appUser.roleRef ? '存在' : 'null'}`);
    console.log(`✅ roleName: ${appUser.roleName ? '已載入' : '未載入'}`);
    console.log(`✅ permissions: ${appUser.permissions ? '已載入' : '未載入'}`);
    
    if (hasPersonnelPermission && appUser.roleName && appUser.permissions) {
      console.log('\n🎉 AuthContext 狀態正常！');
      console.log('💡 用戶應該可以正常進行人員管理操作');
    } else {
      console.log('\n❌ AuthContext 狀態異常！');
      if (!appUser.roleName) console.log('💡 問題: roleName 未載入');
      if (!appUser.permissions) console.log('💡 問題: permissions 未載入');
      if (!hasPersonnelPermission) console.log('💡 問題: 沒有人員管理權限');
    }
    
  } catch (error) {
    console.error('❌ 調試失敗:', error);
  }
}

// 執行調試
debugAuthContextStatus();
