// 檢查當前用戶權限
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

async function checkCurrentUserPermissions() {
  console.log('🔍 檢查當前用戶權限...\n');

  try {
    // 登入測試用戶
    console.log('🔐 登入測試用戶...');
    const userCredential = await signInWithEmailAndPassword(auth, '001@deer-lab.local', 'password123');
    const user = userCredential.user;
    console.log('✅ 登入成功:', user.uid);

    // 獲取用戶資料
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log('❌ 用戶資料不存在');
      return;
    }

    const userData = userDoc.data();
    console.log('👤 用戶資料:', {
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

        // 檢查各種權限
        const allPermissions = [
          'personnel:create', 'personnel:edit', 'personnel:delete', 'personnel:view',
          'roles:create', 'roles:edit', 'roles:delete', 'roles:view',
          'materials:create', 'materials:edit', 'materials:delete', 'materials:view',
          'products:create', 'products:edit', 'products:delete', 'products:view',
          'workorders:create', 'workorders:edit', 'workorders:delete', 'workorders:view',
          'suppliers:create', 'suppliers:edit', 'suppliers:delete', 'suppliers:view',
          'purchase:create', 'purchase:edit', 'purchase:delete', 'purchase:view',
          'inventory:view', 'inventory:adjust',
          'reports:view', 'cost:view'
        ];

        console.log('\n🔍 權限檢查結果:');
        allPermissions.forEach(permission => {
          const hasPermission = roleData.permissions.includes(permission);
          console.log(`   ${hasPermission ? '✅' : '❌'} ${permission}`);
        });

      } else {
        console.log('❌ 角色資料不存在');
      }
    } else {
      console.log('❌ 用戶沒有分配角色');
    }

  } catch (error) {
    console.error('❌ 檢查過程中發生錯誤:', error);
  }
}

// 執行檢查
checkCurrentUserPermissions();
