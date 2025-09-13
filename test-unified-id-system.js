// 🧪 統一ID系統完整測試
// 測試修復後的統一映射機制是否正常工作

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function testUnifiedIdSystem() {
  console.log('🧪 === 統一ID系統完整測試 ===\n');

  try {
    // 1. 測試基本數據一致性
    console.log('📊 1. 基本數據一致性測試:');
    const usersSnapshot = await db.collection('users').get();

    let perfectConsistency = 0;
    let partialConsistency = 0;
    let inconsistentRecords = 0;

    const testResults = [];

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      const docId = doc.id;
      const uid = data.uid;
      const employeeId = data.employeeId;
      const name = data.name || '未知';

      const test = {
        docId,
        name,
        uid,
        employeeId,
        issues: [],
        status: 'unknown'
      };

      // 一致性檢查
      if (uid === employeeId && uid === docId) {
        test.status = 'perfect';
        perfectConsistency++;
      } else if (employeeId === docId) {
        test.status = 'partial';
        partialConsistency++;
        if (uid !== docId) {
          test.issues.push('uid 與 docId 不匹配');
        }
        if (uid !== employeeId) {
          test.issues.push('uid 與 employeeId 不匹配');
        }
      } else {
        test.status = 'inconsistent';
        inconsistentRecords++;
        test.issues.push('employeeId 與 docId 不匹配');
      }

      testResults.push(test);
    });

    console.log(`   ✅ 完全一致: ${perfectConsistency}/${usersSnapshot.size} 筆`);
    console.log(`   ⚠️  部分一致: ${partialConsistency}/${usersSnapshot.size} 筆`);
    console.log(`   ❌ 不一致: ${inconsistentRecords}/${usersSnapshot.size} 筆\n`);

    // 2. 測試工時記錄系統映射
    console.log('⏱️  2. 工時記錄系統映射測試:');

    // 選擇一個有工時記錄的用戶進行測試
    const timeEntriesSnapshot = await db.collection('timeEntries').limit(5).get();

    if (timeEntriesSnapshot.empty) {
      console.log('   ℹ️  沒有工時記錄可供測試\n');
    } else {
      const testPersonnelIds = new Set();
      timeEntriesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.personnelId) {
          testPersonnelIds.add(data.personnelId);
        }
      });

      console.log(`   測試 personnelId: [${Array.from(testPersonnelIds).join(', ')}]`);

      for (const personnelId of testPersonnelIds) {
        // 檢查該 personnelId 是否在 users 集合中存在
        const userDoc = await db.collection('users').doc(personnelId).get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          console.log(`   ✅ ${personnelId}: 映射成功`);
          console.log(`      姓名: ${userData.name}`);
          console.log(`      employeeId: ${userData.employeeId}`);
          console.log(`      uid: ${userData.uid}`);

          // 檢查 ID 一致性
          if (userData.uid === personnelId && userData.employeeId === personnelId) {
            console.log('      ✅ ID 完全一致');
          } else {
            console.log('      ⚠️  ID 不一致');
          }
        } else {
          console.log(`   ❌ ${personnelId}: 找不到對應用戶`);
        }
      }
      console.log('');
    }

    // 3. 模擬 API 調用測試
    console.log('🔌 3. 模擬 API 調用測試:');

    // 選擇一個測試用戶
    const testUser = testResults.find(user => user.status === 'perfect');

    if (testUser) {
      console.log(`   選擇測試用戶: ${testUser.name} (${testUser.employeeId})`);

      // 測試不同的 API 調用參數組合
      const testCases = [
        {
          name: '使用 employeeId',
          params: { employeeId: testUser.employeeId }
        },
        {
          name: '使用 userId',
          params: { userId: testUser.uid }
        },
        {
          name: '同時使用 employeeId 和 userId',
          params: { employeeId: testUser.employeeId, userId: testUser.uid }
        },
        {
          name: '不提供參數 (依賴 Firebase Auth)',
          params: {}
        }
      ];

      testCases.forEach(testCase => {
        console.log(`   📋 測試: ${testCase.name}`);

        // 模擬 V2 API 的參數解析邏輯
        const { employeeId, userId } = testCase.params;
        const mockFirebaseUid = testUser.uid;

        const resolvedPersonnelId = employeeId || userId || mockFirebaseUid;

        if (resolvedPersonnelId === testUser.employeeId) {
          console.log(`      ✅ 成功解析為: ${resolvedPersonnelId}`);
        } else {
          console.log(`      ❌ 解析失敗: ${resolvedPersonnelId} (期望: ${testUser.employeeId})`);
        }
      });
      console.log('');
    } else {
      console.log('   ⚠️  沒有找到完全一致的測試用戶\n');
    }

    // 4. Firebase Auth 與 Firestore 映射測試
    console.log('🔐 4. Firebase Auth 映射測試:');

    try {
      // 檢查前 3 個用戶的 Firebase Auth 記錄
      const testUsersList = testResults.slice(0, 3);

      for (const user of testUsersList) {
        try {
          const authUser = await admin.auth().getUser(user.uid);

          console.log(`   ✅ ${user.name} (${user.employeeId}):`);
          console.log(`      Firebase Auth UID: ${authUser.uid}`);
          console.log(`      Email: ${authUser.email}`);
          console.log(`      Display Name: ${authUser.displayName}`);

          // 檢查 email 格式
          const expectedEmail = `${user.employeeId}@deer-lab.local`;
          if (authUser.email === expectedEmail) {
            console.log('      ✅ Email 格式正確');
          } else {
            console.log(`      ⚠️  Email 格式不匹配: ${authUser.email} (期望: ${expectedEmail})`);
          }

        } catch (error) {
          console.log(`   ❌ ${user.name} (${user.employeeId}): Firebase Auth 查詢失敗`);
          console.log(`      錯誤: ${error.message}`);
        }
      }
      console.log('');

    } catch (error) {
      console.error('   ❌ Firebase Auth 測試失敗:', error.message);
    }

    // 5. 完整性評分
    console.log('📊 5. 系統完整性評分:');

    const totalTests = usersSnapshot.size;
    const consistencyScore = (perfectConsistency / totalTests) * 100;
    const partialScore = (partialConsistency / totalTests) * 100;

    console.log(`   完全一致性得分: ${consistencyScore.toFixed(1)}%`);
    console.log(`   部分一致性得分: ${partialScore.toFixed(1)}%`);

    let overallGrade;
    if (consistencyScore >= 95) {
      overallGrade = 'A+ 優秀';
    } else if (consistencyScore >= 90) {
      overallGrade = 'A 良好';
    } else if (consistencyScore >= 80) {
      overallGrade = 'B 合格';
    } else if (consistencyScore >= 70) {
      overallGrade = 'C 需改進';
    } else {
      overallGrade = 'D 不及格';
    }

    console.log(`   綜合評分: ${overallGrade}\n`);

    // 6. 建議和總結
    console.log('💡 6. 建議和總結:');

    if (perfectConsistency === totalTests) {
      console.log('   🎉 恭喜！統一ID系統已完美實施');
      console.log('   ✅ employeeId = Firebase Auth UID = Firestore 文檔ID');
      console.log('   ✅ 工時記錄系統可以安全地使用任一 ID');
      console.log('   ✅ API 調用無需複雜的映射邏輯');
      console.log('   ✅ 系統性能最佳化，查詢直接命中');
    } else if (partialConsistency > 0) {
      console.log('   ⚠️  系統部分一致，建議進一步修復:');
      console.log('   🔧 修復所有 uid 欄位不一致的記錄');
      console.log('   🔧 確保所有新用戶創建時遵循統一標準');
    } else {
      console.log('   🚨 系統存在嚴重的一致性問題');
      console.log('   🔧 需要立即執行數據修復');
    }

    console.log('\n🎯 === 測試完成 ===');

  } catch (error) {
    console.error('❌ 測試過程出現錯誤:', error);
  }

  process.exit(0);
}

testUnifiedIdSystem();