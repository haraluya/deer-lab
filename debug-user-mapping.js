// 臨時除錯腳本：檢查用戶映射問題
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function debugUserMapping() {
  console.log('=== 用戶映射除錯分析 ===');

  try {
    // 1. 檢查 users 集合
    console.log('\n1. 檢查 users 集合:');
    const usersSnapshot = await db.collection('users').limit(5).get();

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`用戶文檔 ${doc.id}:`);
      console.log(`  - uid: ${data.uid}`);
      console.log(`  - name: ${data.name}`);
      console.log(`  - employeeId: ${data.employeeId}`);
      console.log(`  - status: ${data.status}`);
    });

    // 2. 檢查工時記錄中的 personnelId
    console.log('\n2. 檢查工時記錄中的 personnelId:');
    const timeEntriesSnapshot = await db.collection('timeEntries').limit(5).get();
    const personnelIds = new Set();

    timeEntriesSnapshot.forEach(doc => {
      const data = doc.data();
      personnelIds.add(data.personnelId);
      console.log(`工時記錄 ${doc.id.slice(-6)}:`);
      console.log(`  - personnelId: ${data.personnelId}`);
      console.log(`  - personnelName: ${data.personnelName}`);
      console.log(`  - createdBy: ${data.createdBy}`);
    });

    console.log(`\n工時記錄中使用的 personnelId: [${Array.from(personnelIds).join(', ')}]`);

    // 3. 檢查是否存在 "052" 這個 UID 的用戶
    console.log('\n3. 檢查特定用戶:');

    // 檢查是否有 uid = "052" 的用戶
    const userQuery = await db.collection('users').where('uid', '==', '052').get();
    if (!userQuery.empty) {
      console.log('找到 uid="052" 的用戶:');
      userQuery.forEach(doc => {
        console.log(`  文檔ID: ${doc.id}`);
        console.log(`  資料:`, doc.data());
      });
    } else {
      console.log('沒有找到 uid="052" 的用戶');
    }

    // 檢查是否有 employeeId = "052" 的用戶
    const empQuery = await db.collection('users').where('employeeId', '==', '052').get();
    if (!empQuery.empty) {
      console.log('找到 employeeId="052" 的用戶:');
      empQuery.forEach(doc => {
        console.log(`  文檔ID: ${doc.id}`);
        console.log(`  資料:`, doc.data());
      });
    } else {
      console.log('沒有找到 employeeId="052" 的用戶');
    }

  } catch (error) {
    console.error('除錯失敗:', error);
  }

  process.exit(0);
}

debugUserMapping();