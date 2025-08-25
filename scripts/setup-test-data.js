// 設置測試資料
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');

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

async function setupTestData() {
  console.log('🧪 設置測試資料...\n');

  try {
    // 登入測試用戶
    console.log('🔐 登入測試用戶...');
    const userCredential = await signInWithEmailAndPassword(auth, '001@deer-lab.local', 'password123');
    const user = userCredential.user;
    console.log('✅ 登入成功:', user.uid);

    // 檢查現有資料
    console.log('\n📋 檢查現有資料...');
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('👤 現有用戶資料:', {
        name: userData.name,
        employeeId: userData.employeeId,
        roleRef: userData.roleRef?.path
      });

      if (userData.roleRef) {
        const roleDoc = await getDoc(userData.roleRef);
        if (roleDoc.exists()) {
          const roleData = roleDoc.data();
          console.log('🎭 現有角色資料:', {
            name: roleData.name,
            permissions: roleData.permissions
          });
        }
      }
    }

    console.log('\n✅ 測試資料檢查完成');

  } catch (error) {
    console.error('❌ 設置測試資料時發生錯誤:', error);
  }
}

// 執行設置
setupTestData();
