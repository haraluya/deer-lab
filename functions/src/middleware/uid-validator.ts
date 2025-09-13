// functions/src/middleware/uid-validator.ts
// 🔧 Firebase Functions UID 驗證中間件
// 提供統一的用戶身份驗證和 ID 映射服務

import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const db = getFirestore();

/**
 * 🎯 統一用戶身份驗證結果
 */
export interface UnifiedUserIdentity {
  firebaseUid: string;        // Firebase Auth UID
  employeeId: string;         // 員工編號
  personnelId: string;        // 工時記錄使用的 ID (等於 employeeId)
  docId: string;              // Firestore 文檔 ID
  userData?: any;             // 完整的用戶數據
  isConsistent: boolean;      // ID 是否一致
  source: 'request' | 'auth' | 'firestore';
}

/**
 * 🔍 解析並驗證統一用戶身份
 * 根據請求參數和 Firebase Auth 資訊，解析出統一的用戶身份
 */
export async function resolveUnifiedUserIdentity(
  firebaseUid: string,
  requestData: {
    userId?: string;
    employeeId?: string;
    personnelId?: string;
  }
): Promise<UnifiedUserIdentity> {
  logger.info('解析統一用戶身份:', {
    firebaseUid,
    requestData
  });

  // 1. 優先順序：employeeId > userId > personnelId > firebaseUid
  const candidateId = requestData.employeeId ||
                      requestData.userId ||
                      requestData.personnelId ||
                      firebaseUid;

  if (!candidateId) {
    throw new HttpsError("invalid-argument", "無法確定用戶身份");
  }

  // 2. 從 Firestore 查詢用戶數據進行驗證
  let userData: any = null;
  let docId: string;
  let source: UnifiedUserIdentity['source'] = 'request';

  try {
    // 嘗試直接使用候選 ID 作為文檔 ID 查詢
    const userDoc = await db.collection('users').doc(candidateId).get();

    if (userDoc.exists) {
      userData = userDoc.data();
      docId = userDoc.id;

      logger.info('直接文檔查詢成功:', {
        docId,
        employeeId: userData.employeeId,
        uid: userData.uid
      });
    } else {
      // 如果直接查詢失敗，嘗試通過 employeeId 查詢
      const employeeQuery = await db.collection('users')
        .where('employeeId', '==', candidateId)
        .limit(1)
        .get();

      if (!employeeQuery.empty) {
        const doc = employeeQuery.docs[0];
        userData = doc.data();
        docId = doc.id;
        source = 'firestore';

        logger.info('employeeId 查詢成功:', {
          docId,
          employeeId: userData.employeeId,
          uid: userData.uid
        });
      } else {
        throw new HttpsError("not-found", `找不到用戶記錄: ${candidateId}`);
      }
    }
  } catch (error) {
    logger.error('用戶查詢失敗:', error);
    throw new HttpsError("internal", "用戶驗證過程發生錯誤");
  }

  // 3. 驗證 ID 一致性
  const employeeId = userData.employeeId || docId;
  const userUid = userData.uid || docId;

  // 檢查一致性
  const isConsistent = (
    firebaseUid === userUid &&
    firebaseUid === employeeId &&
    firebaseUid === docId
  );

  if (!isConsistent) {
    logger.warn('ID 不一致警告:', {
      firebaseUid,
      userUid,
      employeeId,
      docId,
      isConsistent: false
    });
  }

  // 4. 構建統一身份結果
  const unifiedIdentity: UnifiedUserIdentity = {
    firebaseUid: firebaseUid,
    employeeId: employeeId,
    personnelId: employeeId,  // 在工時系統中，personnelId 等於 employeeId
    docId: docId,
    userData: userData,
    isConsistent: isConsistent,
    source: source
  };

  logger.info('統一身份解析完成:', {
    firebaseUid: unifiedIdentity.firebaseUid,
    employeeId: unifiedIdentity.employeeId,
    personnelId: unifiedIdentity.personnelId,
    docId: unifiedIdentity.docId,
    isConsistent: unifiedIdentity.isConsistent,
    source: unifiedIdentity.source
  });

  return unifiedIdentity;
}

/**
 * 🔒 權限檢查：確保用戶只能訪問自己的數據
 */
export function validateUserPermission(
  requestedIdentity: UnifiedUserIdentity,
  currentFirebaseUid: string
): void {
  // 檢查當前用戶是否有權限訪問請求的身份數據
  if (requestedIdentity.firebaseUid !== currentFirebaseUid) {
    logger.warn('權限檢查失敗:', {
      requestedFirebaseUid: requestedIdentity.firebaseUid,
      currentFirebaseUid: currentFirebaseUid
    });

    throw new HttpsError("permission-denied", "沒有權限訪問其他用戶的數據");
  }
}

/**
 * 🎯 統一的工時記錄查詢身份驗證
 * 專門為工時相關 API 提供的便捷驗證函數
 */
export async function validateTimeRecordAccess(
  firebaseUid: string,
  requestData: {
    userId?: string;
    employeeId?: string;
    personnelId?: string;
  }
): Promise<UnifiedUserIdentity> {

  // 1. 解析統一身份
  const identity = await resolveUnifiedUserIdentity(firebaseUid, requestData);

  // 2. 權限檢查
  validateUserPermission(identity, firebaseUid);

  // 3. 記錄訪問日誌
  logger.info('工時記錄訪問驗證通過:', {
    firebaseUid: identity.firebaseUid,
    employeeId: identity.employeeId,
    personnelId: identity.personnelId,
    userName: identity.userData?.name || '未知',
    isConsistent: identity.isConsistent
  });

  return identity;
}

/**
 * 📊 ID 映射診斷工具
 * 用於診斷和報告 ID 映射狀況
 */
export interface IdMappingDiagnostic {
  userId: string;
  mappings: {
    firebaseUid: string;
    employeeId: string;
    docId: string;
    firestoreUid: string;
  };
  isConsistent: boolean;
  inconsistencies: string[];
  recommendations: string[];
}

export async function diagnoseIdMapping(firebaseUid: string): Promise<IdMappingDiagnostic> {
  const userDoc = await db.collection('users').doc(firebaseUid).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "用戶不存在");
  }

  const userData = userDoc.data()!;
  const mappings = {
    firebaseUid: firebaseUid,
    employeeId: userData.employeeId || '未定義',
    docId: userDoc.id,
    firestoreUid: userData.uid || '未定義'
  };

  const inconsistencies: string[] = [];
  const recommendations: string[] = [];

  // 檢查一致性
  if (mappings.firebaseUid !== mappings.employeeId) {
    inconsistencies.push('Firebase UID 與 employeeId 不一致');
  }

  if (mappings.firebaseUid !== mappings.docId) {
    inconsistencies.push('Firebase UID 與文檔 ID 不一致');
  }

  if (mappings.firestoreUid !== mappings.firebaseUid) {
    inconsistencies.push('Firestore uid 欄位與 Firebase UID 不一致');
    recommendations.push('更新 Firestore uid 欄位');
  }

  if (userData.employeeId === undefined) {
    inconsistencies.push('employeeId 未定義');
    recommendations.push('設定 employeeId 欄位');
  }

  return {
    userId: userData.name || firebaseUid,
    mappings,
    isConsistent: inconsistencies.length === 0,
    inconsistencies,
    recommendations
  };
}