const admin = require('firebase-admin');

// 初始化 Firebase Admin SDK
admin.initializeApp({
  projectId: 'deer-lab',
  credential: admin.credential.applicationDefault()
});

async function updateExistingUsers() {
  try {
    console.log('🔧 開始更新現有人員資料...');
    
    const db = admin.firestore();
    
    // 獲取所有現有使用者
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('ℹ️ 沒有找到任何使用者資料');
      return;
    }
    
    console.log(`📋 找到 ${usersSnapshot.size} 個使用者，開始更新...`);
    
    const batch = db.batch();
    let updatedCount = 0;
    
    usersSnapshot.docs.forEach((doc) => {
      const userData = doc.data();
      const updates = {};
      
      // 檢查是否需要添加電話欄位
      if (!userData.phone) {
        updates.phone = '0900000000'; // 預設電話
        console.log(`📞 為使用者 ${userData.name || userData.employeeId} 添加預設電話`);
      }
      
      // 移除不需要的欄位
      if (userData.department !== undefined) {
        updates.department = admin.firestore.FieldValue.delete();
        console.log(`🗑️ 移除使用者 ${userData.name || userData.employeeId} 的部門欄位`);
      }
      
      if (userData.position !== undefined) {
        updates.position = admin.firestore.FieldValue.delete();
        console.log(`🗑️ 移除使用者 ${userData.name || userData.employeeId} 的職位欄位`);
      }
      
      if (userData.email !== undefined) {
        updates.email = admin.firestore.FieldValue.delete();
        console.log(`🗑️ 移除使用者 ${userData.name || userData.employeeId} 的電子郵件欄位`);
      }
      
      if (userData.hourlyWage !== undefined) {
        updates.hourlyWage = admin.firestore.FieldValue.delete();
        console.log(`🗑️ 移除使用者 ${userData.name || userData.employeeId} 的時薪欄位`);
      }
      
      // 添加更新時間
      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      
      if (Object.keys(updates).length > 0) {
        batch.update(doc.ref, updates);
        updatedCount++;
      }
    });
    
    if (updatedCount > 0) {
      await batch.commit();
      console.log(`✅ 成功更新 ${updatedCount} 個使用者資料`);
    } else {
      console.log('ℹ️ 所有使用者資料都已經是最新格式');
    }
    
    console.log('\n🎉 人員資料更新完成！');
    
  } catch (error) {
    console.error('❌ 更新人員資料時發生錯誤:', error.message);
  } finally {
    process.exit(0);
  }
}

updateExistingUsers();
