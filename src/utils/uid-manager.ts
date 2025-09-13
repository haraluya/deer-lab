// src/utils/uid-manager.ts
// 🎯 統一 UID 管理工具
// 提供 employeeId 與 Firebase Auth UID 的統一標準和驗證機制

/**
 * 🔍 Firebase Auth UID 規範檢查
 * 檢查給定的字串是否符合 Firebase Auth UID 的格式要求
 */
export interface UidValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  metadata: {
    length: number;
    startsWithNumber: boolean;
    charset: {
      hasNumbers: boolean;
      hasLowercase: boolean;
      hasUppercase: boolean;
      hasSpecialChars: boolean;
      hasChinese: boolean;
      specialChars: string[];
    };
  };
}

/**
 * 驗證字串是否符合 Firebase UID 規範
 */
export function validateFirebaseUID(uid: string): UidValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // 基本檢查
  if (!uid || uid.length === 0) {
    issues.push('UID 不能為空');
    return {
      isValid: false,
      issues,
      warnings,
      metadata: {
        length: 0,
        startsWithNumber: false,
        charset: {
          hasNumbers: false,
          hasLowercase: false,
          hasUppercase: false,
          hasSpecialChars: false,
          hasChinese: false,
          specialChars: []
        }
      }
    };
  }

  // 長度檢查
  if (uid.length > 128) {
    issues.push(`UID 長度 ${uid.length} 超過 Firebase 限制 (128 字符)`);
  }

  // 禁用字符檢查
  const forbiddenChars = ['.', '@', '#', '$', '[', ']'];
  const foundForbiddenChars = forbiddenChars.filter(char => uid.includes(char));
  if (foundForbiddenChars.length > 0) {
    issues.push(`包含禁用字符: ${foundForbiddenChars.join(', ')}`);
  }

  // 控制字符檢查
  const controlCharRegex = /[\x00-\x1F\x7F]/;
  if (controlCharRegex.test(uid)) {
    issues.push('包含控制字符');
  }

  // Unicode 問題字符檢查
  const problematicRegex = /[\uFEFF\u200B-\u200F\u2028\u2029\uFFFE\uFFFF]/;
  if (problematicRegex.test(uid)) {
    issues.push('包含潛在問題的 Unicode 字符');
  }

  // 字符集分析
  const charset = {
    hasNumbers: /[0-9]/.test(uid),
    hasLowercase: /[a-z]/.test(uid),
    hasUppercase: /[A-Z]/.test(uid),
    hasSpecialChars: /[^a-zA-Z0-9]/.test(uid),
    hasChinese: /[\u4e00-\u9fff]/.test(uid),
    specialChars: [] as string[]
  };

  // 特殊字符列表
  const specialCharMatches = uid.match(/[^a-zA-Z0-9]/g);
  if (specialCharMatches) {
    charset.specialChars = [...new Set(specialCharMatches)];
  }

  // 警告檢查
  const startsWithNumber = /^[0-9]/.test(uid);
  if (startsWithNumber) {
    warnings.push('以數字開頭 (Firebase 允許，但某些系統可能有問題)');
  }

  if (charset.hasChinese) {
    warnings.push('包含中文字符 (Firebase 支援，但建議使用英數字)');
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    metadata: {
      length: uid.length,
      startsWithNumber,
      charset
    }
  };
}

/**
 * 🎯 統一 ID 標準化函數
 * 確保所有 ID 都遵循統一標準：employeeId = Firebase Auth UID = 文檔ID
 */
export interface UnifiedIdResult {
  id: string;
  source: 'employeeId' | 'firebaseUid' | 'docId' | 'userId';
  isValid: boolean;
  issues: string[];
}

/**
 * 統一 ID 解析和標準化
 * 接受多種可能的 ID 輸入，返回標準化的統一 ID
 */
export function unifyId(options: {
  employeeId?: string;
  firebaseUid?: string;
  docId?: string;
  userId?: string;
}): UnifiedIdResult {
  const { employeeId, firebaseUid, docId, userId } = options;

  // 優先順序：employeeId > firebaseUid > docId > userId
  let id: string;
  let source: UnifiedIdResult['source'];

  if (employeeId) {
    id = employeeId;
    source = 'employeeId';
  } else if (firebaseUid) {
    id = firebaseUid;
    source = 'firebaseUid';
  } else if (docId) {
    id = docId;
    source = 'docId';
  } else if (userId) {
    id = userId;
    source = 'userId';
  } else {
    return {
      id: '',
      source: 'employeeId',
      isValid: false,
      issues: ['沒有提供任何有效的 ID']
    };
  }

  // 驗證 ID 格式
  const validation = validateFirebaseUID(id);

  return {
    id,
    source,
    isValid: validation.isValid,
    issues: validation.issues
  };
}

/**
 * 🔍 ID 一致性檢查
 * 檢查多個 ID 是否一致，用於驗證數據完整性
 */
export interface IdConsistencyResult {
  isConsistent: boolean;
  canonicalId: string;
  inconsistencies: Array<{
    field: string;
    value: string;
    expected: string;
  }>;
}

export function checkIdConsistency(data: {
  employeeId?: string;
  firebaseUid?: string;
  docId?: string;
  userId?: string;
}): IdConsistencyResult {
  const { employeeId, firebaseUid, docId, userId } = data;

  // 收集所有非空的 ID
  const ids = [
    { field: 'employeeId', value: employeeId },
    { field: 'firebaseUid', value: firebaseUid },
    { field: 'docId', value: docId },
    { field: 'userId', value: userId }
  ].filter(item => item.value);

  if (ids.length === 0) {
    return {
      isConsistent: false,
      canonicalId: '',
      inconsistencies: [{ field: 'all', value: '', expected: '至少提供一個 ID' }]
    };
  }

  // 使用第一個 ID 作為標準
  const canonicalId = ids[0].value!;
  const inconsistencies: IdConsistencyResult['inconsistencies'] = [];

  // 檢查所有 ID 是否與標準一致
  ids.forEach(({ field, value }) => {
    if (value !== canonicalId) {
      inconsistencies.push({
        field,
        value: value!,
        expected: canonicalId
      });
    }
  });

  return {
    isConsistent: inconsistencies.length === 0,
    canonicalId,
    inconsistencies
  };
}

/**
 * 🛠️ 用戶創建時的 UID 生成工具
 * 根據 employeeId 生成符合規範的 Firebase Auth UID
 */
export function generateFirebaseUid(employeeId: string): {
  uid: string;
  email: string;
  isValid: boolean;
  issues: string[];
} {
  const validation = validateFirebaseUID(employeeId);

  return {
    uid: employeeId,
    email: `${employeeId}@deer-lab.local`,
    isValid: validation.isValid,
    issues: validation.issues
  };
}

/**
 * 📊 UID 統計和分析工具
 */
export interface UidStats {
  total: number;
  valid: number;
  invalid: number;
  charsetDistribution: {
    numbersOnly: number;
    lettersOnly: number;
    mixed: number;
    withSpecialChars: number;
    withChinese: number;
  };
  lengthStats: {
    min: number;
    max: number;
    avg: number;
  };
}

export function analyzeUidCollection(uids: string[]): UidStats {
  const stats: UidStats = {
    total: uids.length,
    valid: 0,
    invalid: 0,
    charsetDistribution: {
      numbersOnly: 0,
      lettersOnly: 0,
      mixed: 0,
      withSpecialChars: 0,
      withChinese: 0
    },
    lengthStats: {
      min: Number.MAX_SAFE_INTEGER,
      max: 0,
      avg: 0
    }
  };

  let totalLength = 0;

  uids.forEach(uid => {
    const validation = validateFirebaseUID(uid);

    if (validation.isValid) {
      stats.valid++;
    } else {
      stats.invalid++;
    }

    // 長度統計
    const length = uid.length;
    totalLength += length;
    stats.lengthStats.min = Math.min(stats.lengthStats.min, length);
    stats.lengthStats.max = Math.max(stats.lengthStats.max, length);

    // 字符集統計
    const { charset } = validation.metadata;
    if (charset.hasNumbers && !charset.hasLowercase && !charset.hasUppercase && !charset.hasSpecialChars && !charset.hasChinese) {
      stats.charsetDistribution.numbersOnly++;
    } else if ((charset.hasLowercase || charset.hasUppercase) && !charset.hasNumbers && !charset.hasSpecialChars && !charset.hasChinese) {
      stats.charsetDistribution.lettersOnly++;
    } else if (charset.hasSpecialChars) {
      stats.charsetDistribution.withSpecialChars++;
    } else if (charset.hasChinese) {
      stats.charsetDistribution.withChinese++;
    } else {
      stats.charsetDistribution.mixed++;
    }
  });

  stats.lengthStats.avg = totalLength / uids.length;
  if (stats.lengthStats.min === Number.MAX_SAFE_INTEGER) {
    stats.lengthStats.min = 0;
  }

  return stats;
}

// 預設匯出工具函數集合
export const uidManager = {
  validate: validateFirebaseUID,
  unify: unifyId,
  checkConsistency: checkIdConsistency,
  generate: generateFirebaseUid,
  analyze: analyzeUidCollection
} as const;