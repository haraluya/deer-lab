const admin = require('firebase-admin');

// 初始化 Firebase Admin SDK
const serviceAccount = require('../functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'deer-lab'
});

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    const auth = admin.auth();
    const db = admin.firestore();
    
    // 創建 Firebase Auth 使用者
    const userRecord = await auth.createUser({
      email: '001@deer-lab.local',
      password: '123456',
      displayName: '測試用戶',
      uid: '001'
    });
    
    console.log('✅ Firebase Auth user created:', userRecord.uid);
    
    // 創建 Firestore 使用者資料
    const userData = {
      name: '測試用戶',
      employeeId: '001',
      email: '001@deer-lab.local',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc('001').set(userData);
    console.log('✅ Firestore user data created');
    
    console.log('🎉 Test user setup completed!');
    console.log('Login credentials:');
    console.log('  Email: 001@deer-lab.local');
    console.log('  Password: 123456');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    
    if (error.code === 'auth/uid-already-exists') {
      console.log('ℹ️ User already exists, updating password...');
      try {
        await admin.auth().updateUser('001', {
          password: '123456'
        });
        console.log('✅ Password updated successfully');
      } catch (updateError) {
        console.error('❌ Error updating password:', updateError.message);
      }
    }
  } finally {
    process.exit(0);
  }
}

createTestUser();
