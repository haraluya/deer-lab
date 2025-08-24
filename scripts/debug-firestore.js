// scripts/debug-firestore.js
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// 手動載入環境變數
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('🔍 開始檢查 Firestore 用戶資料...');
console.log('📋 Firebase 配置:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUsers() {
  try {
    console.log('📊 檢查 users 集合...');
    
    // 檢查所有用戶
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    console.log(`✅ 找到 ${querySnapshot.size} 個用戶文檔`);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('👤 用戶資料:', {
        id: doc.id,
        employeeId: data.employeeId,
        name: data.name,
        email: data.email,
        status: data.status
      });
    });
    
    // 檢查特定工號
    const testEmployeeId = '001';
    console.log(`🔍 檢查工號 ${testEmployeeId}...`);
    
    const q = query(usersRef, where('employeeId', '==', testEmployeeId));
    const specificQuery = await getDocs(q);
    
    if (!specificQuery.empty) {
      const userDoc = specificQuery.docs[0];
      const userData = userDoc.data();
      console.log('✅ 找到指定工號的用戶:', {
        id: userDoc.id,
        employeeId: userData.employeeId,
        name: userData.name,
        email: userData.email
      });
    } else {
      console.log('❌ 未找到指定工號的用戶');
    }
    
  } catch (error) {
    console.error('❌ 檢查用戶資料時發生錯誤:', error);
  }
}

checkUsers().then(() => {
  console.log('🏁 檢查完成');
  process.exit(0);
}).catch((error) => {
  console.error('💥 腳本執行失敗:', error);
  process.exit(1);
});
