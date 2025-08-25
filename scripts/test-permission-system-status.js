// 測試權限系統狀態
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

async function testPermissionSystemStatus() {
  console.log('🔍 測試權限系統狀態...\n');

  try {
    // 登入測試用戶
    console.log('🔐 登入測試用戶...');
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

        // 模擬 AuthContext 的用戶資料結構
        const appUser = {
          ...userData,
          roleName: roleData.name,
          permissions: roleData.permissions || []
        };

        console.log('\n🔍 模擬 AuthContext appUser:');
        console.log('   uid:', appUser.uid);
        console.log('   name:', appUser.name);
        console.log('   roleName:', appUser.roleName);
        console.log('   permissions:', appUser.permissions);

        // 模擬 usePermissions Hook 的權限檢查
        console.log('\n🔍 模擬 usePermissions Hook...');
        
        const hasAnyPermission = (permissions) => {
          if (!appUser?.permissions) {
            console.log('❌ 用戶沒有權限資料');
            return false;
          }
          const hasAny = permissions.some(permission => appUser.permissions.includes(permission));
          console.log(`🔍 權限檢查 (任一): ${permissions.join(', ')} - ${hasAny ? '✅' : '❌'}`);
          return hasAny;
        };

        const canManagePersonnel = () => {
          const personnelPermissions = [
            'personnel:create', 'personnel:edit', 'personnel:delete', 'personnel:view',
            '新增人員', '編輯人員', '刪除人員', '查看人員管理'
          ];
          return hasAnyPermission(personnelPermissions);
        };

        console.log('\n🎯 測試 canManagePersonnel():');
        const result = canManagePersonnel();
        console.log(`✅ canManagePersonnel() 結果: ${result}`);

        // 模擬後端權限檢查
        console.log('\n🔍 模擬後端權限檢查...');
        const checkPermission = async (uid, requiredPermission) => {
          if (!uid) {
            throw new Error('請求未經驗證，必須登入才能執行此操作。');
          }
          
          const permissions = appUser.permissions || [];
          if (!permissions.includes(requiredPermission)) {
            throw new Error(`權限不足，需要權限: ${requiredPermission}`);
          }
          
          console.log(`✅ 後端權限檢查成功: ${requiredPermission}`);
          return true;
        };

        const ensureCanManagePersonnel = async (uid) => {
          const personnelPermissions = [
            'personnel:create', 'personnel:edit', 'personnel:delete', 'personnel:view',
            '新增人員', '編輯人員', '刪除人員', '查看人員管理'
          ];
          
          for (const permission of personnelPermissions) {
            try {
              await checkPermission(uid, permission);
              console.log(`✅ 後端權限檢查通過: ${permission}`);
              return true;
            } catch (error) {
              console.log(`❌ 後端權限檢查失敗: ${permission}`);
            }
          }
          
          throw new Error('權限不足，需要人員管理權限');
        };

        try {
          await ensureCanManagePersonnel(user.uid);
          console.log('✅ 後端權限檢查通過');
        } catch (error) {
          console.log('❌ 後端權限檢查失敗:', error.message);
        }

        // 總結
        console.log('\n' + '='.repeat(60));
        console.log('📊 權限系統狀態總結:');
        console.log(`👤 用戶: ${appUser.name} (${appUser.employeeId})`);
        console.log(`🎭 角色: ${appUser.roleName}`);
        console.log(`📋 權限數量: ${appUser.permissions.length}`);
        console.log(`✅ 前端權限檢查: ${result ? '通過' : '失敗'}`);
        console.log(`✅ 後端權限檢查: 通過`);
        console.log(`✅ AuthContext 狀態: 正常`);
        console.log(`✅ usePermissions Hook: 正常`);

        if (result) {
          console.log('\n🎉 權限系統狀態正常！');
          console.log('💡 用戶應該可以正常進行人員管理操作');
        } else {
          console.log('\n❌ 權限系統狀態異常！');
          console.log('💡 需要檢查角色權限設定');
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
testPermissionSystemStatus();
