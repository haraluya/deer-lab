// scripts/find-po-by-code.js
// 根據採購單編號查找 Document ID

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// 初始化 Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findPOByCode() {
  try {
    const poCode = 'PO-20251117-003';
    console.log(`🔍 查詢採購單: ${poCode}\n`);

    // 查詢採購單
    const poQuery = await db.collection('purchaseOrders')
      .where('code', '==', poCode)
      .get();

    if (poQuery.empty) {
      console.log(`❌ 找不到採購單 ${poCode}`);
      console.log('\n讓我列出所有採購單：\n');

      // 列出所有採購單
      const allPOs = await db.collection('purchaseOrders')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      console.log(`找到 ${allPOs.size} 個採購單：\n`);
      allPOs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ${data.code}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   狀態: ${data.status}`);
        console.log(`   項目數: ${data.items?.length || 0}`);
        console.log('');
      });

      process.exit(0);
    }

    const poDoc = poQuery.docs[0];
    const poData = poDoc.data();

    console.log('✅ 找到採購單！');
    console.log(`Document ID: ${poDoc.id}`);
    console.log(`編號: ${poData.code}`);
    console.log(`狀態: ${poData.status}`);
    console.log(`建立時間: ${poData.createdAt?.toDate?.() || '未知'}`);
    console.log(`項目數量: ${poData.items?.length || 0}\n`);

    // 分析每個項目
    if (poData.items && poData.items.length > 0) {
      console.log('📦 項目分析：\n');

      for (let i = 0; i < poData.items.length; i++) {
        const item = poData.items[i];

        console.log(`項目 ${i + 1}:`);
        console.log(`  代碼: ${item.code}`);
        console.log(`  名稱: ${item.name}`);
        console.log(`  單位: ${item.unit || '無'}`);
        console.log(`  type 欄位: ${item.type || '❌ 無 (需要修復)'}`);

        // 判斷應該的類型
        const shouldBeFragrance = !item.unit || (item.unit && item.unit.toUpperCase() === 'KG');
        const expectedType = shouldBeFragrance ? 'fragrance' : 'material';
        const expectedCollection = shouldBeFragrance ? 'fragrances' : 'materials';

        console.log(`  應該是: ${expectedType}`);

        // 提取 itemRef 路徑
        let actualCollection = 'unknown';
        if (item.itemRef) {
          if (item.itemRef._key && item.itemRef._key.path && item.itemRef._key.path.segments) {
            const segments = item.itemRef._key.path.segments;
            const documentsIndex = segments.indexOf('documents');
            if (documentsIndex !== -1 && documentsIndex + 2 < segments.length) {
              actualCollection = segments[documentsIndex + 1];
            }
          }
        }

        console.log(`  實際 collection: ${actualCollection}`);

        if (actualCollection !== expectedCollection || !item.type) {
          console.log(`  ⚠️  需要修復！`);
        } else {
          console.log(`  ✅ 正確`);
        }

        console.log('');
      }

      console.log('\n📋 修復指令：');
      console.log(`Document ID: ${poDoc.id}`);
      console.log(`\n請在維護工具頁面的「採購單 ID」欄位中輸入此 ID，然後點擊「分析」或「執行修復」`);
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ 錯誤:', error);
    process.exit(1);
  }
}

findPOByCode();
