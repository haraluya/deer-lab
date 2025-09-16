// functions/src/api/timeRecords-v2.ts
// 🎯 一勞永逸的工時記錄API重新設計

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const db = getFirestore();

/**
 * 🔍 核心問題解決：重新設計用戶-人員映射機制
 *
 * 問題分析：
 * 1. 前端傳入的 userId 實際上是人員ID ("052")，不是 Firebase Auth UID
 * 2. 工時記錄中的 personnelId 也是 "052"
 * 3. 但權限檢查期望 Firebase Auth UID
 *
 * 解決方案：
 * 1. 直接使用傳入的 userId 作為 personnelId 查詢
 * 2. 簡化權限檢查邏輯
 * 3. 提供詳盡的除錯資訊
 */

export const getPersonalTimeRecordsV2 = onCall(async (request) => {
  try {
    logger.info('=== 工時記錄查詢 V2 開始 ===');

    // 1. 身份驗證
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "請先登入才能使用此功能");
    }

    const { userId, employeeId } = request.data;

    // 🎯 統一ID系統：employeeId = Firebase Auth UID = personnelId
    // 優先使用 employeeId，fallback 到 userId，最終 fallback 到 Firebase Auth UID
    const personnelId = employeeId || userId || request.auth.uid;

    if (!personnelId) {
      throw new HttpsError("invalid-argument", "無法確定用戶身份");
    }

    logger.info(`統一ID系統查詢:`, {
      firebaseUid: request.auth.uid,
      requestEmployeeId: employeeId,
      requestUserId: userId,
      finalPersonnelId: personnelId,
      idSource: employeeId ? 'employeeId' : (userId ? 'userId' : 'firebaseUid'),
      userAgent: request.rawRequest?.headers?.['user-agent'] || 'unknown'
    });

    logger.info(`使用人員ID查詢: ${personnelId}`);

    // 3. 檢查工時記錄集合基本資訊
    const timeEntriesCollectionRef = db.collection('timeEntries');
    const totalCountSnapshot = await timeEntriesCollectionRef.count().get();
    const totalCount = totalCountSnapshot.data().count;

    logger.info(`timeEntries 集合總數: ${totalCount}`);

    // 4. 查詢該人員的所有工時記錄（不使用 orderBy 避免索引問題）
    const userTimeEntriesSnapshot = await timeEntriesCollectionRef
      .where('personnelId', '==', personnelId)
      .limit(100)  // 增加限制以獲取更多記錄
      .get();

    logger.info(`找到人員 ${personnelId} 的工時記錄: ${userTimeEntriesSnapshot.size} 筆`);

    // 5. 如果沒有找到記錄，進行詳細除錯
    if (userTimeEntriesSnapshot.empty) {
      logger.warn('沒有找到工時記錄，開始除錯分析...');

      // 獲取前5筆記錄查看資料結構
      const sampleSnapshot = await timeEntriesCollectionRef.limit(5).get();
      const sampleData = sampleSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          docId: doc.id.substring(0, 8) + '...',
          personnelId: data.personnelId,
          personnelName: data.personnelName,
          createdBy: data.createdBy,
          workOrderId: data.workOrderId?.substring(0, 8) + '...',
          duration: data.duration,
          status: data.status
        };
      });

      logger.info('範例工時記錄:', sampleData);

      // 檢查是否有相似的人員ID
      const personnelIds = new Set();
      sampleSnapshot.docs.forEach(doc => {
        const personnelId = doc.data().personnelId;
        if (personnelId) personnelIds.add(personnelId);
      });

      logger.info(`系統中的人員ID: [${Array.from(personnelIds).join(', ')}]`);

      // 🎯 沒有記錄時也使用統一格式
      return {
        success: true,
        data: {
          records: [],
          summary: {
            totalRecords: 0,
            totalHours: 0,
            uniqueWorkOrders: 0
          },
          debug: {
            searchedPersonnelId: personnelId,
            totalTimeEntries: totalCount,
            availablePersonnelIds: Array.from(personnelIds),
            sampleRecords: sampleData
          }
        },
        meta: {
          timestamp: Date.now(),
          requestId: `timeRecords_empty_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          version: 'v2.0'
        }
      };
    }

    // 6. 處理找到的工時記錄
    const records = [];
    let totalHours = 0;
    const uniqueWorkOrders = new Set();

    for (const doc of userTimeEntriesSnapshot.docs) {
      const data = doc.data();

      // 計算工時 - 支援多種格式
      let duration = 0;
      if (typeof data.duration === 'number' && data.duration > 0) {
        duration = data.duration;
      } else if (data.startTime && data.endTime && data.startDate) {
        try {
          const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
          const endDateTime = new Date(`${data.endDate || data.startDate}T${data.endTime}`);
          if (!isNaN(startDateTime.getTime()) && !isNaN(endDateTime.getTime())) {
            duration = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
          }
        } catch (error) {
          logger.warn(`計算工時失敗 ${doc.id}:`, error);
        }
      }

      const record = {
        id: doc.id,
        workOrderId: data.workOrderId || '',
        workOrderNumber: data.workOrderNumber || `WO-${data.workOrderId?.slice(-6) || 'Unknown'}`,
        personnelId: data.personnelId || '',
        personnelName: data.personnelName || '未知',
        startDate: data.startDate || '',
        startTime: data.startTime || '',
        endDate: data.endDate || data.startDate || '',
        endTime: data.endTime || '',
        duration: duration,
        overtimeHours: data.overtimeHours || 0,
        notes: data.notes || '',
        status: data.status || 'draft',
        createdAt: data.createdAt
      };

      records.push(record);
      totalHours += duration;
      if (record.workOrderId) {
        uniqueWorkOrders.add(record.workOrderId);
      }
    }

    // 7. 手動排序（按創建時間降序）
    records.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

    const responseData = {
      records: records,
      summary: {
        totalRecords: records.length,
        totalHours: totalHours,
        uniqueWorkOrders: uniqueWorkOrders.size
      }
    };

    // 🎯 符合統一API客戶端標準的回應格式
    const standardResponse = {
      success: true,
      data: responseData,
      meta: {
        timestamp: Date.now(),
        requestId: `timeRecords_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        version: 'v2.0'
      }
    };

    logger.info(`成功返回工時記錄:`, {
      recordCount: records.length,
      totalHours: totalHours.toFixed(2),
      uniqueWorkOrders: uniqueWorkOrders.size,
      sampleRecords: records.slice(0, 3).map(r => ({
        id: r.id.substring(0, 8) + '...',
        duration: r.duration,
        date: r.startDate,
        workOrder: r.workOrderNumber
      })),
      responseFormat: 'unified-api-standard'
    });

    logger.info('=== 工時記錄查詢 V2 完成 ===');

    return standardResponse;

  } catch (error) {
    logger.error('工時記錄查詢失敗:', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", `獲取個人工時記錄時發生錯誤: ${error.message}`);
  }
});