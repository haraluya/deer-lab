const admin = require('firebase-admin');

// 初始化 Firebase Admin
const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.FIREBASE_PROJECT_ID || "deer-lab-project",
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();

async function debugInventoryRecords() {
  try {
    console.log('正在檢查 inventory_records 集合...');
    
    // 獲取最新的 10 筆記錄
    const snapshot = await db.collection('inventory_records')
      .orderBy('changeDate', 'desc')
      .limit(10)
      .get();
    
    console.log(`找到 ${snapshot.size} 筆記錄`);
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n記錄 #${index + 1}:`);
      console.log(`ID: ${doc.id}`);
      console.log(`changeReason: ${data.changeReason}`);
      console.log(`operatorName: ${data.operatorName}`);
      console.log(`remarks: ${data.remarks}`);
      console.log(`details 陣列:`, data.details);
      console.log(`details 長度:`, data.details ? data.details.length : 'undefined');
      console.log(`details 內容:`, JSON.stringify(data.details, null, 2));
      console.log('---');
    });
    
  } catch (error) {
    console.error('檢查記錄時發生錯誤:', error);
  }
}

debugInventoryRecords().then(() => {
  console.log('\n檢查完成');
  process.exit(0);
}).catch(error => {
  console.error('執行失敗:', error);
  process.exit(1);
});
