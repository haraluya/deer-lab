const admin = require('firebase-admin');

// 初始化 Firebase Admin SDK
admin.initializeApp({
  projectId: 'deer-lab',
  credential: admin.credential.applicationDefault()
});

async function createSuperAdmin() {
  try {
    console.log('🔧 創建超級管理員帳號...');
    
    const auth = admin.auth();
    const db = admin.firestore();
    
    // 超級管理員資訊
    const superAdminData = {
      employeeId: 'admin',
      name: '超級管理員',
      phone: '0900000000',
      email: 'admin@deer-lab.local',
      password: 'admin123456',
      status: 'active'
    };
    
    // 創建 Firebase Auth 使用者
    const userRecord = await auth.createUser({
      uid: superAdminData.employeeId,
      email: superAdminData.email,
      password: superAdminData.password,
      displayName: superAdminData.name
    });
    
    console.log('✅ Firebase Auth 超級管理員創建成功:', userRecord.uid);
    
    // 創建超級管理員角色
    const superAdminRole = {
      name: '超級管理員',
      description: '擁有系統所有權限，可進行完整的管理操作',
      permissions: [
        'users.read', 'users.write', 'users.delete',
        'roles.read', 'roles.write', 'roles.delete',
        'materials.read', 'materials.write', 'materials.delete',
        'suppliers.read', 'suppliers.write', 'suppliers.delete',
        'products.read', 'products.write', 'products.delete',
        'workOrders.read', 'workOrders.write', 'workOrders.delete',
        'purchaseOrders.read', 'purchaseOrders.write', 'purchaseOrders.delete',
        'inventory.read', 'inventory.write', 'inventory.delete',
        'reports.read', 'reports.write',
        'system.read', 'system.write', 'system.delete'
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const roleRef = await db.collection('roles').add(superAdminRole);
    console.log('✅ 超級管理員角色創建成功:', roleRef.id);
    
    // 創建 Firestore 使用者資料
    const userData = {
      name: superAdminData.name,
      employeeId: superAdminData.employeeId,
      phone: superAdminData.phone,
      roleRef: roleRef,
      status: superAdminData.status,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc(userRecord.uid).set(userData);
    console.log('✅ Firestore 超級管理員資料創建成功');
    
    console.log('\n🎉 超級管理員帳號創建完成！');
    console.log('📋 登入資訊:');
    console.log(`   工號: ${superAdminData.employeeId}`);
    console.log(`   密碼: ${superAdminData.password}`);
    console.log(`   電話: ${superAdminData.phone}`);
    console.log(`   角色: ${superAdminRole.name}`);
    console.log('\n⚠️  請妥善保管這些資訊，建議首次登入後立即修改密碼！');
    
  } catch (error) {
    console.error('❌ 創建超級管理員時發生錯誤:', error.message);
    
    if (error.code === 'auth/uid-already-exists') {
      console.log('ℹ️ 超級管理員已存在，更新密碼...');
      try {
        await admin.auth().updateUser(superAdminData.employeeId, {
          password: superAdminData.password
        });
        console.log('✅ 密碼更新成功');
      } catch (updateError) {
        console.error('❌ 更新密碼失敗:', updateError.message);
      }
    }
  } finally {
    process.exit(0);
  }
}

createSuperAdmin();
