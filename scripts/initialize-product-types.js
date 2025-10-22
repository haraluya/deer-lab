// scripts/initialize-product-types.js
/**
 * 初始化產品類型資料
 * 將現有的 5 種產品類型寫入 Firestore
 */

const admin = require('firebase-admin');
const path = require('path');

// 初始化 Firebase Admin
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 產品類型資料（使用不同顏色以便區分）
const productTypes = [
  {
    name: '罐裝油',
    code: 'BOT',
    color: 'blue',
    description: '罐裝油產品類型',
    isActive: true
  },
  {
    name: '一代棉芯煙彈',
    code: 'OMP',
    color: 'purple',
    description: '一代棉芯煙彈產品類型',
    isActive: true
  },
  {
    name: '一代陶瓷芯煙彈',
    code: 'OTP',
    color: 'pink',
    description: '一代陶瓷芯煙彈產品類型',
    isActive: true
  },
  {
    name: '五代陶瓷芯煙彈',
    code: 'FTP',
    color: 'orange',
    description: '五代陶瓷芯煙彈產品類型',
    isActive: true
  },
  {
    name: '其他',
    code: 'ETC',
    color: 'gray',
    description: '其他產品類型',
    isActive: true
  }
];

async function initializeProductTypes() {
  console.log('🚀 開始初始化產品類型資料...\n');

  try {
    // 檢查是否已經有產品類型資料
    const existingTypes = await db.collection('productTypes').get();

    if (!existingTypes.empty) {
      console.log('⚠️  發現已存在的產品類型資料：');
      existingTypes.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.name} (${data.code})`);
      });

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('\n是否要繼續新增？(y/n): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('❌ 已取消初始化');
        process.exit(0);
      }
    }

    let addedCount = 0;
    let skippedCount = 0;

    for (const type of productTypes) {
      // 檢查是否已存在相同代碼的類型
      const existing = await db.collection('productTypes')
        .where('code', '==', type.code)
        .limit(1)
        .get();

      if (!existing.empty) {
        console.log(`⏭️  跳過已存在的類型：${type.name} (${type.code})`);
        skippedCount++;
        continue;
      }

      // 新增產品類型
      const docRef = db.collection('productTypes').doc();
      const typeData = {
        id: docRef.id,
        ...type,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'system',
        updatedBy: 'system'
      };

      await docRef.set(typeData);
      console.log(`✅ 已新增產品類型：${type.name} (${type.code}) - 顏色：${type.color}`);
      addedCount++;
    }

    console.log('\n📊 初始化完成統計：');
    console.log(`   ✅ 新增：${addedCount} 筆`);
    console.log(`   ⏭️  跳過：${skippedCount} 筆`);
    console.log(`   📦 總計：${productTypes.length} 筆`);

    console.log('\n✨ 產品類型初始化完成！');

  } catch (error) {
    console.error('❌ 初始化失敗：', error);
    process.exit(1);
  }

  process.exit(0);
}

// 執行初始化
initializeProductTypes();
