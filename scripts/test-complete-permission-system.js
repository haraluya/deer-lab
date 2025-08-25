// 完整權限系統測試
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Firebase 配置 - 使用模擬配置避免金鑰外流
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "mock-api-key-for-testing",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "deer-lab.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "deer-lab",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "deer-lab.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.FIREBASE_APP_ID || "1:123456789:web:abcdefghijklmnop"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testCompletePermissionSystem() {
  console.log('🧪 開始完整權限系統測試...\n');

  try {
    // 測試登入
    console.log('🔐 測試登入...');
    const userCredential = await signInWithEmailAndPassword(auth, '001@deer-lab.local', 'password123');
    const user = userCredential.user;
    console.log('✅ 登入成功:', user.uid);

    // 獲取用戶資料
    console.log('\n👤 獲取用戶資料...');
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log('❌ 用戶資料不存在');
      return;
    }

    const userData = userDoc.data();
    console.log('📋 用戶資料:', {
      name: userData.name,
      employeeId: userData.employeeId,
      roleRef: userData.roleRef?.path
    });

    // 獲取角色資料
    if (userData.roleRef) {
      console.log('\n🎭 獲取角色資料...');
      const roleDoc = await getDoc(userData.roleRef);
      if (roleDoc.exists()) {
        const roleData = roleDoc.data();
        console.log('📋 角色資料:', {
          name: roleData.name,
          permissions: roleData.permissions
        });

        // 模擬前端權限檢查
        console.log('\n🔍 模擬前端權限檢查...');
        const personnelPermissions = [
          'personnel:create', 'personnel:edit', 'personnel:delete', 'personnel:view',
          '新增人員', '編輯人員', '刪除人員', '查看人員管理'
        ];

        const hasPersonnelPermission = personnelPermissions.some(permission => 
          roleData.permissions.includes(permission)
        );

        console.log('✅ 人員管理權限檢查:', hasPersonnelPermission ? '通過' : '失敗');
        if (hasPersonnelPermission) {
          const foundPermissions = personnelPermissions.filter(permission => 
            roleData.permissions.includes(permission)
          );
          console.log('✅ 找到的人員管理權限:', foundPermissions);
        }

        // 模擬後端權限檢查
        console.log('\n🔍 模擬後端權限檢查...');
        const backendPermission = 'personnel:create';
        const hasBackendPermission = roleData.permissions.includes(backendPermission);
        console.log(`✅ 後端權限檢查 ${backendPermission}:`, hasBackendPermission ? '通過' : '失敗');

        // 測試具體功能權限
        console.log('\n🎯 測試具體功能權限...');
        const functionPermissions = [
          { name: '新增人員', permission: 'personnel:create' },
          { name: '編輯人員', permission: 'personnel:edit' },
          { name: '刪除人員', permission: 'personnel:delete' },
          { name: '查看人員', permission: 'personnel:view' }
        ];

        functionPermissions.forEach(({ name, permission }) => {
          const hasPermission = roleData.permissions.includes(permission);
          console.log(`${hasPermission ? '✅' : '❌'} ${name}: ${hasPermission ? '有權限' : '無權限'}`);
        });

        // 總結
        console.log('\n' + '='.repeat(60));
        console.log('📊 權限系統測試總結:');
        console.log(`👤 用戶: ${userData.name} (${userData.employeeId})`);
        console.log(`🎭 角色: ${roleData.name}`);
        console.log(`📋 權限數量: ${roleData.permissions.length}`);
        console.log(`✅ 人員管理權限: ${hasPersonnelPermission ? '有' : '無'}`);
        console.log(`✅ 後端權限檢查: ${hasBackendPermission ? '通過' : '失敗'}`);

        if (hasPersonnelPermission && hasBackendPermission) {
          console.log('\n🎉 權限系統測試通過！');
          console.log('💡 用戶應該可以正常進行人員管理操作');
        } else {
          console.log('\n❌ 權限系統測試失敗！');
          if (!hasPersonnelPermission) console.log('💡 問題: 前端權限檢查失敗');
          if (!hasBackendPermission) console.log('💡 問題: 後端權限檢查失敗');
        }

      } else {
        console.log('❌ 角色資料不存在');
      }
    } else {
      console.log('❌ 用戶沒有分配角色');
    }

  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
  }
}

// 執行測試
testCompletePermissionSystem();
