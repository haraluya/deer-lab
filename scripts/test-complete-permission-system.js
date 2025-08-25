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

async function testCompletePermissionSystem() {
  try {
    console.log('🧪 開始完整權限系統測試...');
    
    // 測試登入
    console.log('\n🔐 測試登入...');
    const email = '001@deer-lab.local';
    const password = '123456';
    
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
    
    // 模擬前端權限檢查邏輯
    console.log('\n🔍 模擬前端權限檢查...');
    
    const personnelPermissions = [
      'personnel:create', 'personnel:edit', 'personnel:delete', 'personnel:view',
      '新增人員', '編輯人員', '刪除人員', '查看人員管理'
    ];
    
    const hasPersonnelPermission = personnelPermissions.some(permission => 
      roleData.permissions?.includes(permission)
    );
    
    console.log(`✅ 人員管理權限檢查: ${hasPersonnelPermission ? '通過' : '失敗'}`);
    
    if (hasPersonnelPermission) {
      const foundPermissions = personnelPermissions.filter(permission => 
        roleData.permissions?.includes(permission)
      );
      console.log('✅ 找到的人員管理權限:', foundPermissions);
    }
    
    // 模擬後端權限檢查邏輯
    console.log('\n🔍 模擬後端權限檢查...');
    
    const backendPermissions = [
      'personnel:create', 'personnel:edit', 'personnel:delete', 'personnel:view',
      '新增人員', '編輯人員', '刪除人員', '查看人員管理'
    ];
    
    let backendCheckPassed = false;
    for (const permission of backendPermissions) {
      if (roleData.permissions?.includes(permission)) {
        console.log(`✅ 後端權限檢查通過: ${permission}`);
        backendCheckPassed = true;
        break;
      }
    }
    
    if (!backendCheckPassed) {
      console.log('❌ 後端權限檢查失敗: 沒有人員管理權限');
    }
    
    // 測試具體功能權限
    console.log('\n🎯 測試具體功能權限...');
    
    const testCases = [
      { name: '新增人員', permissions: ['personnel:create', '新增人員'] },
      { name: '編輯人員', permissions: ['personnel:edit', '編輯人員'] },
      { name: '刪除人員', permissions: ['personnel:delete', '刪除人員'] },
      { name: '查看人員', permissions: ['personnel:view', '查看人員管理'] }
    ];
    
    testCases.forEach(testCase => {
      const hasPermission = testCase.permissions.some(permission => 
        roleData.permissions?.includes(permission)
      );
      console.log(`${hasPermission ? '✅' : '❌'} ${testCase.name}: ${hasPermission ? '有權限' : '無權限'}`);
    });
    
    // 總結
    console.log('\n' + '='.repeat(60));
    console.log('📊 權限系統測試總結:');
    console.log(`👤 使用者: ${userData.name} (${userData.employeeId})`);
    console.log(`🎭 角色: ${roleData.name}`);
    console.log(`📋 權限數量: ${roleData.permissions?.length || 0}`);
    console.log(`✅ 人員管理權限: ${hasPersonnelPermission ? '有' : '無'}`);
    console.log(`✅ 後端權限檢查: ${backendCheckPassed ? '通過' : '失敗'}`);
    
    if (hasPersonnelPermission && backendCheckPassed) {
      console.log('\n🎉 權限系統測試通過！');
      console.log('💡 用戶應該可以正常進行人員管理操作');
    } else {
      console.log('\n❌ 權限系統測試失敗！');
      console.log('💡 需要檢查權限設定或系統邏輯');
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}

// 執行測試
testCompletePermissionSystem();
