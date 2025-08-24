// scripts/create-test-user.js
const admin = require('firebase-admin');

// 初始化 Firebase Admin
const serviceAccount = require('../functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'deer-lab'
});

const db = admin.firestore();

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // 創建管理員角色（如果不存在）
    const adminRoleRef = db.collection('roles').doc('admin');
    const adminRoleDoc = await adminRoleRef.get();
    
    if (!adminRoleDoc.exists) {
      await adminRoleRef.set({
        name: '管理員',
        description: '系統管理員',
        permissions: [
          'users:view', 'users:create', 'users:edit', 'users:delete',
          'roles:view', 'roles:create', 'roles:edit', 'roles:delete',
          'materials:view', 'materials:create', 'materials:edit', 'materials:delete',
          'fragrances:view', 'fragrances:create', 'fragrances:edit', 'fragrances:delete',
          'products:view', 'products:create', 'products:edit', 'products:delete',
          'workorders:view', 'workorders:create', 'workorders:edit', 'workorders:delete',
          'purchase:view', 'purchase:create', 'purchase:edit', 'purchase:receive',
          'personnel:view', 'personnel:create', 'personnel:edit', 'personnel:delete',
          'reports:view'
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Admin role created');
    } else {
      console.log('✅ Admin role already exists');
    }
    
    // 創建測試用戶（工號 001）
    const userData = {
      name: '測試用戶',
      employeeId: '001',
      email: '001@deer-lab.local',
      roleRef: adminRoleRef,
      hourlyWage: 200,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc('001').set(userData);
    console.log('✅ Test user created with employeeId: 001');
    
    // 創建 Firebase Auth 用戶
    const auth = admin.auth();
    await auth.createUser({
      uid: '001',
      email: '001@deer-lab.local',
      password: '123456',
      displayName: '測試用戶'
    });
    console.log('✅ Firebase Auth user created');
    
    console.log('🎉 Test user setup completed!');
    console.log('Login credentials:');
    console.log('  Employee ID: 001');
    console.log('  Password: 123456');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    process.exit(0);
  }
}

createTestUser();
