// 調試當前登入用戶權限狀態
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

async function debugCurrentUserPermissions() {
  console.log('🔍 調試當前登入用戶權限狀態...\n');

  try {
    // 檢查當前登入狀態
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('❌ 沒有登入用戶');
      return;
    }

    console.log('👤 當前登入用戶:', {
      uid: currentUser.uid,
      email: currentUser.email
    });

    // 獲取用戶資料
    const userDocRef = doc(db, 'users', currentUser.uid);
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
      const roleDoc = await getDoc(userData.roleRef);
      if (roleDoc.exists()) {
        const roleData = roleDoc.data();
        console.log('🎭 角色資料:', {
          name: roleData.name,
          permissions: roleData.permissions
        });

        // 檢查人員管理權限
        const personnelPermissions = [
          'personnel:create', 'personnel:edit', 'personnel:delete', 'personnel:view',
          '新增人員', '編輯人員', '刪除人員', '查看人員管理'
        ];

        console.log('\n🔍 人員管理權限檢查:');
        personnelPermissions.forEach(permission => {
          const hasPermission = roleData.permissions.includes(permission);
          console.log(`   ${hasPermission ? '✅' : '❌'} ${permission}`);
        });

        // 檢查是否有任何人員管理權限
        const hasAnyPersonnelPermission = personnelPermissions.some(permission => 
          roleData.permissions.includes(permission)
        );

        console.log(`\n🎯 是否有任何人員管理權限: ${hasAnyPersonnelPermission ? '✅ 是' : '❌ 否'}`);

        if (hasAnyPersonnelPermission) {
          console.log('✅ 用戶應該可以進行人員管理操作');
        } else {
          console.log('❌ 用戶沒有人員管理權限');
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
debugCurrentUserPermissions();
