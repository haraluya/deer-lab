// 📋 驗證 employeeId 符合 Firebase UID 規範
// 檢查所有 employeeId 是否符合 Firebase Auth UID 的格式要求

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Firebase Auth UID 規範檢查函數
function validateFirebaseUID(uid) {
  const issues = [];

  // 1. 長度檢查 (Firebase UID 限制 128 字符)
  if (!uid || uid.length === 0) {
    issues.push('UID 為空');
    return { isValid: false, issues };
  }

  if (uid.length > 128) {
    issues.push(`UID 長度 ${uid.length} 超過限制 (128)`);
  }

  // 2. 禁用字符檢查
  const forbiddenChars = ['.', '@', '#', '$', '[', ']'];
  const foundForbiddenChars = forbiddenChars.filter(char => uid.includes(char));
  if (foundForbiddenChars.length > 0) {
    issues.push(`包含禁用字符: ${foundForbiddenChars.join(', ')}`);
  }

  // 3. 控制字符檢查 (0x00-0x1F, 0x7F)
  const controlCharRegex = /[\x00-\x1F\x7F]/;
  if (controlCharRegex.test(uid)) {
    issues.push('包含控制字符');
  }

  // 4. Unicode 範圍檢查 (Firebase 支援大部分 Unicode 字符)
  // 主要檢查是否包含可能造成問題的字符
  const problematicRegex = /[\uFEFF\u200B-\u200F\u2028\u2029\uFFFE\uFFFF]/;
  if (problematicRegex.test(uid)) {
    issues.push('包含潛在問題的 Unicode 字符');
  }

  // 5. 數字開頭檢查 (Firebase 允許數字開頭)
  // 這不是問題，只是記錄
  const startsWithNumber = /^[0-9]/.test(uid);

  return {
    isValid: issues.length === 0,
    issues: issues,
    startsWithNumber: startsWithNumber,
    length: uid.length,
    charset: getCharacterSetInfo(uid)
  };
}

// 字符集分析
function getCharacterSetInfo(uid) {
  const info = {
    hasNumbers: /[0-9]/.test(uid),
    hasLowercase: /[a-z]/.test(uid),
    hasUppercase: /[A-Z]/.test(uid),
    hasSpecialChars: /[^a-zA-Z0-9]/.test(uid),
    hasChinese: /[\u4e00-\u9fff]/.test(uid),
    specialChars: []
  };

  // 找出所有特殊字符
  const specialCharMatches = uid.match(/[^a-zA-Z0-9]/g);
  if (specialCharMatches) {
    info.specialChars = [...new Set(specialCharMatches)];
  }

  return info;
}

async function validateEmployeeIdFormat() {
  console.log('📋 === 驗證 employeeId 符合 Firebase UID 規範 ===\n');

  try {
    // 1. 獲取所有用戶記錄
    console.log('📊 1. 獲取用戶數據:');
    const usersSnapshot = await db.collection('users').get();
    console.log(`   總用戶數: ${usersSnapshot.size} 筆\n`);

    // 2. 驗證每個 employeeId
    console.log('🔍 2. 驗證 employeeId 格式:');
    const validationResults = {
      total: usersSnapshot.size,
      valid: 0,
      invalid: 0,
      issues: []
    };

    const allEmployeeIds = [];
    const charsetStats = {
      numbers: 0,
      lowercase: 0,
      uppercase: 0,
      specialChars: 0,
      chinese: 0,
      mixed: 0
    };

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      const employeeId = data.employeeId;
      const name = data.name || '未知';

      if (employeeId) {
        allEmployeeIds.push(employeeId);
        const validation = validateFirebaseUID(employeeId);

        // 統計字符集使用情況
        const charset = validation.charset;
        if (charset.hasNumbers && !charset.hasLowercase && !charset.hasUppercase && !charset.hasSpecialChars && !charset.hasChinese) {
          charsetStats.numbers++;
        } else if (charset.hasLowercase && !charset.hasNumbers && !charset.hasUppercase && !charset.hasSpecialChars && !charset.hasChinese) {
          charsetStats.lowercase++;
        } else if (charset.hasUppercase && !charset.hasNumbers && !charset.hasLowercase && !charset.hasSpecialChars && !charset.hasChinese) {
          charsetStats.uppercase++;
        } else if (charset.hasSpecialChars && !charset.hasNumbers && !charset.hasLowercase && !charset.hasUppercase && !charset.hasChinese) {
          charsetStats.specialChars++;
        } else if (charset.hasChinese && !charset.hasNumbers && !charset.hasLowercase && !charset.hasUppercase && !charset.hasSpecialChars) {
          charsetStats.chinese++;
        } else {
          charsetStats.mixed++;
        }

        if (validation.isValid) {
          validationResults.valid++;
          console.log(`   ✅ ${employeeId} (${name}): 格式有效`);
          if (validation.startsWithNumber) {
            console.log(`      ℹ️  以數字開頭 (Firebase 允許)`);
          }
        } else {
          validationResults.invalid++;
          console.log(`   ❌ ${employeeId} (${name}): 格式無效`);
          validation.issues.forEach(issue => {
            console.log(`      - ${issue}`);
          });

          validationResults.issues.push({
            docId: doc.id,
            name: name,
            employeeId: employeeId,
            issues: validation.issues
          });
        }

        // 顯示詳細資訊
        if (validation.charset.specialChars.length > 0) {
          console.log(`      📝 包含特殊字符: ${validation.charset.specialChars.join(', ')}`);
        }
        console.log(`      📏 長度: ${validation.length} 字符`);
      } else {
        validationResults.invalid++;
        console.log(`   ❌ 文檔 ${doc.id} (${name}): employeeId 未定義`);
        validationResults.issues.push({
          docId: doc.id,
          name: name,
          employeeId: null,
          issues: ['employeeId 未定義']
        });
      }
    });

    // 3. 統計摘要
    console.log('\n📊 3. 驗證統計:');
    console.log(`   ✅ 格式有效: ${validationResults.valid}/${validationResults.total} 筆`);
    console.log(`   ❌ 格式無效: ${validationResults.invalid}/${validationResults.total} 筆`);

    // 4. 字符集使用統計
    console.log('\n📝 4. employeeId 字符集分析:');
    console.log(`   🔢 純數字: ${charsetStats.numbers} 筆`);
    console.log(`   🔤 純小寫字母: ${charsetStats.lowercase} 筆`);
    console.log(`   🔠 純大寫字母: ${charsetStats.uppercase} 筆`);
    console.log(`   🔣 純特殊字符: ${charsetStats.specialChars} 筆`);
    console.log(`   🀄 純中文: ${charsetStats.chinese} 筆`);
    console.log(`   🎭 混合字符: ${charsetStats.mixed} 筆`);

    // 5. employeeId 列表
    console.log(`\n📋 5. 所有 employeeId: [${allEmployeeIds.join(', ')}]`);

    // 6. 重複檢查
    const duplicates = allEmployeeIds.filter((id, index) => allEmployeeIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      console.log(`\n⚠️  發現重複的 employeeId: [${[...new Set(duplicates)].join(', ')}]`);
    } else {
      console.log('\n✅ 沒有發現重複的 employeeId');
    }

    // 7. 問題詳情
    if (validationResults.issues.length > 0) {
      console.log('\n🚨 需要修復的問題記錄:');
      validationResults.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. 文檔ID: ${issue.docId}`);
        console.log(`      姓名: ${issue.name}`);
        console.log(`      employeeId: ${issue.employeeId}`);
        console.log(`      問題: ${issue.issues.join(', ')}\n`);
      });
    }

    // 8. Firebase UID 規範總結
    console.log('📖 Firebase UID 規範總結:');
    console.log('   ✅ 允許: 數字、字母、大部分 Unicode 字符');
    console.log('   ✅ 最大長度: 128 字符');
    console.log('   ❌ 禁止字符: . @ # $ [ ]');
    console.log('   ❌ 禁止: 控制字符 (0x00-0x1F, 0x7F)');

    // 9. 建議
    console.log('\n💡 建議:');
    if (validationResults.invalid === 0) {
      console.log('   ✅ 所有 employeeId 都符合 Firebase UID 規範');
      console.log('   ✅ 可以安全地統一 employeeId 與 Firebase Auth UID');
    } else {
      console.log(`   🔧 需要修復 ${validationResults.invalid} 個不符合規範的 employeeId`);
      console.log('   ⚠️  建議在統一前先修復這些問題');
    }

    console.log('\n🎯 === 驗證完成 ===');

  } catch (error) {
    console.error('❌ 驗證過程出現錯誤:', error);
  }

  process.exit(0);
}

validateEmployeeIdFormat();