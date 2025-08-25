const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, collection, addDoc, connectFirestoreEmulator } = require('firebase/firestore');

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

// 連接到本地 Firestore 模擬器
connectFirestoreEmulator(db, 'localhost', 8080);

async function setupTestData() {
  try {
    console.log('🔧 設置測試資料...');
    
    // 創建測試角色
    console.log('\n🎭 創建測試角色...');
    
    const testRoles = [
      {
        name: '測試管理員',
        description: '用於測試的管理員角色',
        permissions: [
          '查看系統總覽',
          '新增人員',
          '編輯人員',
          '刪除人員',
          '查看人員管理',
          '新增角色',
          '編輯角色',
          '刪除角色',
          '查看角色管理',
          '查看物料管理',
          '新增物料',
          '編輯物料',
          '刪除物料',
          '查看香精管理',
          '新增香精',
          '編輯香精',
          '刪除香精',
          '查看產品管理',
          '新增產品',
          '編輯產品',
          '刪除產品',
          '查看工單管理',
          '新增工單',
          '編輯工單',
          '刪除工單',
          '查看庫存管理',
          '調整庫存',
          '查看採購管理',
          '新增採購單',
          '編輯採購單',
          '確認入庫',
          '查看報表分析',
          '查看成本管理'
        ],
        createdAt: new Date()
      },
      {
        name: '計時人員（有權限）',
        description: '計時人員角色，但具有人員管理權限',
        permissions: [
          '查看工單管理',
          '新增工單',
          '編輯工單',
          '查看人員管理',
          '編輯人員' // 添加編輯人員權限
        ],
        createdAt: new Date()
      }
    ];
    
    const roleRefs = [];
    
    for (const roleData of testRoles) {
      const roleRef = await addDoc(collection(db, 'roles'), roleData);
      roleRefs.push(roleRef);
      console.log(`✅ 創建角色: ${roleData.name} (ID: ${roleRef.id})`);
    }
    
    // 創建測試使用者
    console.log('\n👤 創建測試使用者...');
    
    const testUsers = [
      {
        uid: 'test-admin',
        name: '測試管理員',
        employeeId: 'admin001',
        phone: '0900000001',
        roleRef: roleRefs[0], // 測試管理員角色
        status: 'active',
        createdAt: new Date()
      },
      {
        uid: 'test-hourly',
        name: '測試計時人員',
        employeeId: 'hourly001',
        phone: '0900000002',
        roleRef: roleRefs[1], // 計時人員（有權限）角色
        status: 'active',
        createdAt: new Date()
      }
    ];
    
    for (const userData of testUsers) {
      await setDoc(doc(db, 'users', userData.uid), userData);
      console.log(`✅ 創建使用者: ${userData.name} (ID: ${userData.uid})`);
    }
    
    console.log('\n🎉 測試資料設置完成！');
    console.log('\n📋 測試帳號資訊:');
    console.log('1. 測試管理員:');
    console.log('   - 工號: admin001');
    console.log('   - 電子郵件: admin001@deer-lab.local');
    console.log('   - 密碼: 123456');
    console.log('   - 權限: 完整的管理員權限');
    
    console.log('\n2. 測試計時人員:');
    console.log('   - 工號: hourly001');
    console.log('   - 電子郵件: hourly001@deer-lab.local');
    console.log('   - 密碼: 123456');
    console.log('   - 權限: 工單管理 + 編輯人員');
    
    console.log('\n💡 使用這些帳號測試人員管理功能');
    
  } catch (error) {
    console.error('❌ 設置測試資料失敗:', error);
  }
}

// 執行設置
setupTestData();
