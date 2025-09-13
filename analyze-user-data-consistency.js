// 📊 用戶數據一致性深度分析腳本
// 分析 employeeId 與 Firebase Auth UID 的對應關係

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

async function analyzeUserDataConsistency() {
  console.log('🔍 === 用戶數據一致性深度分析 ===\n');

  try {
    // 1. 檢查 users 集合所有記錄
    console.log('📋 1. 檢查 Firestore users 集合:');
    const usersSnapshot = await db.collection('users').get();
    console.log(`   總用戶數: ${usersSnapshot.size} 筆\n`);

    const userAnalysis = {
      total: usersSnapshot.size,
      uidDefined: 0,
      uidUndefined: 0,
      uidMatchesDocId: 0,
      uidMismatchesDocId: 0,
      employeeIdDefined: 0,
      employeeIdUndefined: 0,
      employeeIdMatchesDocId: 0,
      employeeIdMismatchesDocId: 0,
      uidEmployeeIdMatch: 0,
      uidEmployeeIdMismatch: 0,
      problems: []
    };

    const userData = [];

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      const docId = doc.id;
      const uid = data.uid;
      const employeeId = data.employeeId;
      const name = data.name || '未知';

      // 統計分析
      if (uid !== undefined) {
        userAnalysis.uidDefined++;
        if (uid === docId) {
          userAnalysis.uidMatchesDocId++;
        } else {
          userAnalysis.uidMismatchesDocId++;
        }
      } else {
        userAnalysis.uidUndefined++;
      }

      if (employeeId !== undefined) {
        userAnalysis.employeeIdDefined++;
        if (employeeId === docId) {
          userAnalysis.employeeIdMatchesDocId++;
        } else {
          userAnalysis.employeeIdMismatchesDocId++;
        }
      } else {
        userAnalysis.employeeIdUndefined++;
      }

      if (uid !== undefined && employeeId !== undefined) {
        if (uid === employeeId) {
          userAnalysis.uidEmployeeIdMatch++;
        } else {
          userAnalysis.uidEmployeeIdMismatch++;
        }
      }

      // 問題記錄
      const issues = [];
      if (uid === undefined) issues.push('uid未定義');
      if (employeeId === undefined) issues.push('employeeId未定義');
      if (uid !== undefined && uid !== docId) issues.push('uid與文檔ID不匹配');
      if (employeeId !== undefined && employeeId !== docId) issues.push('employeeId與文檔ID不匹配');
      if (uid !== undefined && employeeId !== undefined && uid !== employeeId) {
        issues.push('uid與employeeId不匹配');
      }

      if (issues.length > 0) {
        userAnalysis.problems.push({
          docId,
          name,
          uid,
          employeeId,
          issues
        });
      }

      userData.push({
        docId,
        name,
        uid,
        employeeId,
        status: data.status,
        issues
      });
    });

    // 2. 顯示詳細統計
    console.log('📊 2. Firestore 用戶數據統計:');
    console.log(`   ✅ uid 已定義: ${userAnalysis.uidDefined}/${userAnalysis.total} 筆`);
    console.log(`   ❌ uid 未定義: ${userAnalysis.uidUndefined}/${userAnalysis.total} 筆`);
    console.log(`   ✅ uid 與文檔ID匹配: ${userAnalysis.uidMatchesDocId}/${userAnalysis.uidDefined} 筆`);
    console.log(`   ❌ uid 與文檔ID不匹配: ${userAnalysis.uidMismatchesDocId}/${userAnalysis.uidDefined} 筆`);
    console.log('');
    console.log(`   ✅ employeeId 已定義: ${userAnalysis.employeeIdDefined}/${userAnalysis.total} 筆`);
    console.log(`   ❌ employeeId 未定義: ${userAnalysis.employeeIdUndefined}/${userAnalysis.total} 筆`);
    console.log(`   ✅ employeeId 與文檔ID匹配: ${userAnalysis.employeeIdMatchesDocId}/${userAnalysis.employeeIdDefined} 筆`);
    console.log(`   ❌ employeeId 與文檔ID不匹配: ${userAnalysis.employeeIdMismatchesDocId}/${userAnalysis.employeeIdDefined} 筆`);
    console.log('');
    console.log(`   ✅ uid 與 employeeId 匹配: ${userAnalysis.uidEmployeeIdMatch} 筆`);
    console.log(`   ❌ uid 與 employeeId 不匹配: ${userAnalysis.uidEmployeeIdMismatch} 筆\n`);

    // 3. 顯示問題記錄
    if (userAnalysis.problems.length > 0) {
      console.log('🚨 3. 發現的問題記錄:');
      userAnalysis.problems.forEach((problem, index) => {
        console.log(`   ${index + 1}. 文檔ID: ${problem.docId}`);
        console.log(`      姓名: ${problem.name}`);
        console.log(`      uid: ${problem.uid}`);
        console.log(`      employeeId: ${problem.employeeId}`);
        console.log(`      問題: ${problem.issues.join(', ')}\n`);
      });
    } else {
      console.log('✅ 3. 未發現數據一致性問題\n');
    }

    // 4. 檢查 Firebase Auth 用戶
    console.log('🔐 4. 檢查 Firebase Auth 用戶:');
    try {
      const listUsersResult = await auth.listUsers();
      const firebaseUsers = listUsersResult.users;
      console.log(`   Firebase Auth 用戶總數: ${firebaseUsers.length} 筆\n`);

      // 檢查 Firebase Auth 與 Firestore 的對應
      console.log('🔗 5. Firebase Auth 與 Firestore 對應檢查:');
      const authFirestoreMap = {
        authOnlyUsers: [],
        firestoreOnlyUsers: [],
        matchedUsers: [],
        mismatchedEmails: []
      };

      // 檢查 Firebase Auth 用戶是否在 Firestore 中
      firebaseUsers.forEach(authUser => {
        const firestoreUser = userData.find(u => u.docId === authUser.uid);
        if (firestoreUser) {
          authFirestoreMap.matchedUsers.push({
            uid: authUser.uid,
            email: authUser.email,
            name: firestoreUser.name,
            employeeId: firestoreUser.employeeId
          });

          // 檢查 email 格式
          const expectedEmail = `${firestoreUser.employeeId}@deer-lab.local`;
          if (authUser.email !== expectedEmail) {
            authFirestoreMap.mismatchedEmails.push({
              uid: authUser.uid,
              actualEmail: authUser.email,
              expectedEmail: expectedEmail,
              employeeId: firestoreUser.employeeId
            });
          }
        } else {
          authFirestoreMap.authOnlyUsers.push({
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName
          });
        }
      });

      // 檢查 Firestore 用戶是否在 Firebase Auth 中
      userData.forEach(firestoreUser => {
        const authUser = firebaseUsers.find(u => u.uid === firestoreUser.docId);
        if (!authUser) {
          authFirestoreMap.firestoreOnlyUsers.push(firestoreUser);
        }
      });

      console.log(`   ✅ 完全匹配的用戶: ${authFirestoreMap.matchedUsers.length} 筆`);
      console.log(`   ⚠️  僅存在於 Firebase Auth: ${authFirestoreMap.authOnlyUsers.length} 筆`);
      console.log(`   ⚠️  僅存在於 Firestore: ${authFirestoreMap.firestoreOnlyUsers.length} 筆`);
      console.log(`   ❌ Email 格式不匹配: ${authFirestoreMap.mismatchedEmails.length} 筆\n`);

      // 顯示不匹配的詳情
      if (authFirestoreMap.authOnlyUsers.length > 0) {
        console.log('📋 僅存在於 Firebase Auth 的用戶:');
        authFirestoreMap.authOnlyUsers.forEach(user => {
          console.log(`   - ${user.uid}: ${user.email} (${user.displayName || '無名稱'})`);
        });
        console.log('');
      }

      if (authFirestoreMap.firestoreOnlyUsers.length > 0) {
        console.log('📋 僅存在於 Firestore 的用戶:');
        authFirestoreMap.firestoreOnlyUsers.forEach(user => {
          console.log(`   - ${user.docId}: ${user.name} (employeeId: ${user.employeeId})`);
        });
        console.log('');
      }

      if (authFirestoreMap.mismatchedEmails.length > 0) {
        console.log('📧 Email 格式不匹配的用戶:');
        authFirestoreMap.mismatchedEmails.forEach(user => {
          console.log(`   - ${user.uid}: ${user.actualEmail} → 應為 ${user.expectedEmail}`);
        });
        console.log('');
      }

    } catch (error) {
      console.error('❌ Firebase Auth 檢查失敗:', error.message);
    }

    // 6. 檢查 timeEntries 中的 personnelId
    console.log('⏱️  6. 檢查工時記錄中的 personnelId:');
    try {
      const timeEntriesSnapshot = await db.collection('timeEntries').limit(50).get();
      console.log(`   工時記錄樣本: ${timeEntriesSnapshot.size} 筆\n`);

      const personnelIds = new Set();
      const timeEntriesAnalysis = {
        total: timeEntriesSnapshot.size,
        validPersonnelId: 0,
        invalidPersonnelId: 0,
        matchedWithUsers: 0,
        unmatchedWithUsers: 0
      };

      timeEntriesSnapshot.forEach(doc => {
        const data = doc.data();
        const personnelId = data.personnelId;

        if (personnelId) {
          personnelIds.add(personnelId);
          timeEntriesAnalysis.validPersonnelId++;

          // 檢查是否在 users 集合中存在
          const userExists = userData.some(u =>
            u.docId === personnelId || u.employeeId === personnelId
          );

          if (userExists) {
            timeEntriesAnalysis.matchedWithUsers++;
          } else {
            timeEntriesAnalysis.unmatchedWithUsers++;
          }
        } else {
          timeEntriesAnalysis.invalidPersonnelId++;
        }
      });

      console.log(`   ✅ 有效 personnelId: ${timeEntriesAnalysis.validPersonnelId}/${timeEntriesAnalysis.total} 筆`);
      console.log(`   ❌ 無效 personnelId: ${timeEntriesAnalysis.invalidPersonnelId}/${timeEntriesAnalysis.total} 筆`);
      console.log(`   ✅ 與用戶匹配: ${timeEntriesAnalysis.matchedWithUsers}/${timeEntriesAnalysis.validPersonnelId} 筆`);
      console.log(`   ❌ 與用戶不匹配: ${timeEntriesAnalysis.unmatchedWithUsers}/${timeEntriesAnalysis.validPersonnelId} 筆`);
      console.log(`   📋 使用的 personnelId: [${Array.from(personnelIds).join(', ')}]\n`);

    } catch (error) {
      console.error('❌ 工時記錄檢查失敗:', error.message);
    }

    // 7. 總結建議
    console.log('💡 7. 修復建議:');

    if (userAnalysis.uidUndefined > 0) {
      console.log(`   🔧 修復 ${userAnalysis.uidUndefined} 筆 uid 未定義的記錄`);
    }

    if (userAnalysis.uidMismatchesDocId > 0) {
      console.log(`   🔧 修復 ${userAnalysis.uidMismatchesDocId} 筆 uid 與文檔ID不匹配的記錄`);
    }

    if (userAnalysis.employeeIdMismatchesDocId > 0) {
      console.log(`   🔧 修復 ${userAnalysis.employeeIdMismatchesDocId} 筆 employeeId 與文檔ID不匹配的記錄`);
    }

    if (userAnalysis.uidEmployeeIdMismatch > 0) {
      console.log(`   🔧 修復 ${userAnalysis.uidEmployeeIdMismatch} 筆 uid 與 employeeId 不匹配的記錄`);
    }

    if (userAnalysis.problems.length === 0) {
      console.log('   ✅ 數據一致性良好，無需修復');
    }

    console.log('\n🎯 === 分析完成 ===');

  } catch (error) {
    console.error('❌ 分析過程出現錯誤:', error);
  }

  process.exit(0);
}

analyzeUserDataConsistency();