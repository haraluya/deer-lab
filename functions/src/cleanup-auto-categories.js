const admin = require('firebase-admin');

// 初始化 Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function findAndCleanupAutoCategories() {
  try {
    console.log('🔍 開始搜尋自動分類材料...');

    // 搜尋所有材料
    const materialsSnapshot = await db.collection('materials').get();

    console.log(`📊 總材料數量: ${materialsSnapshot.size}`);

    const autoCategories = [];
    const batch = db.batch();
    let updateCount = 0;

    materialsSnapshot.forEach(doc => {
      const data = doc.data();
      const category = data.category || '';
      const subCategory = data.subCategory || '';

      // 檢查是否包含自動分類
      if (category.includes('自動分類') || subCategory.includes('自動分類') ||
          category.includes('自動子分類') || subCategory.includes('自動子分類')) {

        console.log(`🚨 發現自動分類材料:`, {
          id: doc.id,
          name: data.name,
          code: data.code,
          category: category,
          subCategory: subCategory,
          createdAt: data.createdAt?.toDate?.() || '未知'
        });

        autoCategories.push({
          id: doc.id,
          data: data
        });

        // 修正分類為空值
        const docRef = db.collection('materials').doc(doc.id);
        batch.update(docRef, {
          category: '',
          subCategory: '',
          mainCategoryId: '',
          subCategoryId: '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        updateCount++;
      }
    });

    console.log(`\n📋 統計結果:`);
    console.log(`- 發現自動分類材料: ${autoCategories.length} 個`);
    console.log(`- 準備更新: ${updateCount} 個`);

    if (updateCount > 0) {
      console.log('\n🔧 開始批次更新...');
      await batch.commit();
      console.log('✅ 批次更新完成！');

      console.log('\n📝 已清理的材料:');
      autoCategories.forEach(item => {
        console.log(`- ${item.data.name} (${item.data.code}): ${item.data.category} → 清空`);
      });
    } else {
      console.log('✅ 沒有需要清理的自動分類材料');
    }

    return {
      total: materialsSnapshot.size,
      found: autoCategories.length,
      updated: updateCount
    };

  } catch (error) {
    console.error('❌ 清理過程發生錯誤:', error);
    throw error;
  }
}

// 執行清理
findAndCleanupAutoCategories()
  .then(result => {
    console.log('\n🎉 清理完成！', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 清理失敗:', error);
    process.exit(1);
  });