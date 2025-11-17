// scripts/check-purchase-order.js
// 檢查特定採購單的資料結構

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// 初始化 Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkPurchaseOrder() {
  try {
    console.log('🔍 查詢採購單: PO-20251117-003\n');

    // 查詢採購單
    const poQuery = await db.collection('purchaseOrders')
      .where('code', '==', 'PO-20251117-003')
      .get();

    if (poQuery.empty) {
      console.log('❌ 找不到採購單 PO-20251117-003');
      process.exit(0);
    }

    const poDoc = poQuery.docs[0];
    const poData = poDoc.data();

    console.log('📋 採購單:', poData.code);
    console.log('📦 項目數量:', poData.items?.length || 0);
    console.log('');

    if (poData.items) {
      for (let i = 0; i < poData.items.length; i++) {
        const item = poData.items[i];
        console.log(`項目 ${i + 1}:`);
        console.log('  代碼:', item.code);
        console.log('  名稱:', item.name);
        console.log('  單位:', item.unit);
        console.log('  數量:', item.quantity);
        console.log('  type 欄位:', item.type || '❌ 無 (舊採購單)');

        // 提取 itemRef 路徑
        let itemRefPath = '';
        if (item.itemRef) {
          if (item.itemRef._path && item.itemRef._path.segments) {
            itemRefPath = item.itemRef._path.segments.join('/');
          } else if (item.itemRef.path) {
            itemRefPath = item.itemRef.path;
          } else if (item.itemRef._key && item.itemRef._key.path) {
            itemRefPath = item.itemRef._key.path.segments ?
              item.itemRef._key.path.segments.join('/') :
              'unknown';
          }
        }

        console.log('  itemRef 路徑:', itemRefPath || '無法取得');

        // 判斷應該是什麼類型
        const shouldBeFragrance = !item.unit || item.unit.toUpperCase() === 'KG';
        const actualCollection = itemRefPath.includes('fragrances/') ? 'fragrances' :
                                 itemRefPath.includes('materials/') ? 'materials' :
                                 'unknown';
        const expectedCollection = shouldBeFragrance ? 'fragrances' : 'materials';

        console.log('  應該是:', expectedCollection);
        console.log('  實際指向:', actualCollection);

        if (actualCollection !== expectedCollection) {
          console.log('  ⚠️  警告: itemRef 指向錯誤的 collection!');
        }

        console.log('');
      }
    }

    console.log('✅ 檢查完成');
    process.exit(0);

  } catch (error) {
    console.error('❌ 錯誤:', error);
    process.exit(1);
  }
}

checkPurchaseOrder();
