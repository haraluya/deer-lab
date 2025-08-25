// 調試 AuthContext 狀態
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

async function debugAuthContextStatus() {
  console.log('🔍 調試 AuthContext 狀態...\n');

  try {
    // 登入測試用戶
    console.log('🔐 登入測試用戶...');
    const userCredential = await signInWithEmailAndPassword(auth, '001@deer-lab.local', 'password123');
    const user = userCredential.user;
    console.log('✅ 登入成功:', user.uid);

    // 模擬 AuthContext 的 loadUserData 函數
    console.log('\n📋 模擬 AuthContext loadUserData...');
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log('❌ 用戶資料不存在');
      return;
    }

    const userData = userDoc.data();
    console.log('👤 用戶基本資料:', {
      name: userData.name,
      employeeId: userData.employeeId,
      roleRef: userData.roleRef?.path
    });

    // 載入角色資料
    if (userData.roleRef) {
      console.log('\n🎭 載入角色資料...');
      const roleDoc = await getDoc(userData.roleRef);
      if (roleDoc.exists()) {
        const roleData = roleDoc.data();
        console.log('✅ 角色資料載入成功:', {
          name: roleData.name,
          permissions: roleData.permissions
        });

        // 模擬 usePermissions Hook 的權限檢查
        console.log('\n🔍 模擬 usePermissions Hook...');
        
        // 檢查 appUser 是否有權限資料
        const appUser = {
          ...userData,
          roleName: roleData.name,
          permissions: roleData.permissions || []
        };

        console.log('📋 appUser 權限資料:', appUser.permissions);

        // 模擬 canManagePersonnel 函數
        const personnelPermissions = [
          'personnel:create', 'personnel:edit', 'personnel:delete', 'personnel:view',
          '新增人員', '編輯人員', '刪除人員', '查看人員管理'
        ];

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
          return hasAnyPermission(personnelPermissions);
        };

        console.log('\n🎯 測試 canManagePersonnel():');
        const result = canManagePersonnel();
        console.log(`✅ canManagePersonnel() 結果: ${result}`);

        if (result) {
          console.log('✅ 用戶應該可以進行人員管理操作');
        } else {
          console.log('❌ 用戶無法進行人員管理操作');
        }

      } else {
        console.log('❌ 角色資料不存在');
      }
    } else {
      console.log('❌ 用戶沒有分配角色');
    }

  } catch (error) {
    console.error('❌ 調試過程中發生錯誤:', error);
  }
}

// 執行調試
debugAuthContextStatus();
