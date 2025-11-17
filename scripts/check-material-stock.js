// scripts/check-material-stock.js
// 檢查特定物料的庫存狀態

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// 初始化 Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkMaterialStock() {
  try {
    console.log('🔍 查詢物料代碼: OEM-JY-003');

    // 查詢物料
    const materialQuery = await db.collection('materials')
      .where('code', '==', 'OEM-JY-003')
      .get();

    if (materialQuery.empty) {
      console.log('❌ 找不到物料 OEM-JY-003');

      // 嘗試查詢香精
      const fragranceQuery = await db.collection('fragrances')
        .where('code', '==', 'OEM-JY-003')
        .get();

      if (fragranceQuery.empty) {
        console.log('❌ 香精庫存中也找不到 OEM-JY-003');
        return;
      }

      fragranceQuery.forEach(doc => {
        const data = doc.data();
        console.log('\n📦 香精資料:');
        console.log('  ID:', doc.id);
        console.log('  代碼:', data.code);
        console.log('  名稱:', data.name);
        console.log('  當前庫存:', data.currentStock);
        console.log('  單位:', data.unit);
        console.log('  成本/單位:', data.costPerUnit);
        console.log('  安全庫存:', data.safetyStockLevel);

        if (data.currentStock < 0) {
          console.log('  ⚠️  警告: 庫存為負數！');
        }
      });

      return;
    }

    materialQuery.forEach(doc => {
      const data = doc.data();
      console.log('\n📦 物料資料:');
      console.log('  ID:', doc.id);
      console.log('  代碼:', data.code);
      console.log('  名稱:', data.name);
      console.log('  當前庫存:', data.currentStock);
      console.log('  單位:', data.unit);
      console.log('  成本/單位:', data.costPerUnit);
      console.log('  安全庫存:', data.safetyStockLevel);

      if (data.currentStock < 0) {
        console.log('  ⚠️  警告: 庫存為負數！');
      }
    });

    // 查詢最近的庫存異動記錄
    console.log('\n\n📋 查詢最近的庫存異動記錄...');
    const movementsQuery = await db.collection('inventoryMovements')
      .where('itemRef', '==', db.doc(`materials/${materialQuery.docs[0]?.id || ''}`))
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (!movementsQuery.empty) {
      console.log(`找到 ${movementsQuery.size} 筆異動記錄:\n`);
      movementsQuery.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ${data.type}`);
        console.log(`   數量變更: ${data.changeQuantity}`);
        console.log(`   時間: ${data.createdAt?.toDate?.() || '未知'}`);
        console.log(`   原因: ${data.reason || data.changeReason || '無'}`);
        console.log('');
      });
    }

    console.log('✅ 檢查完成');

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    process.exit(0);
  }
}

checkMaterialStock();
