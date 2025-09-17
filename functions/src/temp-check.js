const admin = require('firebase-admin');

// 初始化 Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function checkAutoCategories() {
  try {
    console.log('開始查詢自動分類材料...');

    // 查詢包含「自動分類」的材料
    const materialsQuery = await db.collection('materials')
      .where('category', '>=', '自動分類')
      .where('category', '<', '自動分類\uFFFF')
      .get();

    console.log(`找到 ${materialsQuery.size} 個包含自動分類的材料:`);

    materialsQuery.forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}`);
      console.log(`  名稱: ${data.name}`);
      console.log(`  分類: ${data.category}`);
      console.log(`  子分類: ${data.subCategory || '無'}`);
      console.log(`  創建時間: ${data.createdAt?.toDate?.() || '未知'}`);
      console.log('---');
    });

    return materialsQuery.size;
  } catch (error) {
    console.error('查詢錯誤:', error);
    return -1;
  }
}

checkAutoCategories();