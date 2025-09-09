const admin = require('firebase-admin');
const serviceAccount = require('./functions/lib/deer-lab-firebase-adminsdk-1dxb9-fc39ba6ae9.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkProductData() {
  try {
    console.log('=== 檢查產品資料 ===');
    
    const snapshot = await db.collection('products').limit(10).get();
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`產品 ${index + 1}:`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  name: ${data.name}`);
      console.log(`  seriesId: ${data.seriesId || '未設定'}`);
      console.log(`  seriesName: ${data.seriesName || '未設定'}`);
      console.log(`  currentFragranceRef: ${data.currentFragranceRef ? `id: ${data.currentFragranceRef.id}` : '未設定'}`);
      console.log('  ---');
    });
    
    console.log('\n=== 檢查產品系列資料 ===');
    const seriesSnapshot = await db.collection('productSeries').limit(5).get();
    
    seriesSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`系列 ${index + 1}:`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  name: ${data.name}`);
      console.log(`  code: ${data.code}`);
      console.log('  ---');
    });
    
  } catch (error) {
    console.error('查詢失敗:', error);
  } finally {
    process.exit();
  }
}

checkProductData();