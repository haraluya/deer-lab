// functions/src/api/timeRecords.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const db = getFirestore();

/**
 * 獲取個人有效工時記錄（僅包含已完工和已入庫工單的工時）
 * 暫時修改為查詢所有工時記錄以進行除錯
 */
export const getPersonalValidTimeRecords = onCall(async (request) => {
  try {
    // 身份驗證
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "請先登入才能使用此功能");
    }

    const { userId } = request.data;

    if (!userId) {
      throw new HttpsError("invalid-argument", "缺少必要參數: userId");
    }

    // 檢查權限 - 先跳過權限檢查以進行除錯
    // TODO: 之後需要根據實際的用戶-人員映射關係進行權限檢查
    logger.info(`權限檢查: request.auth.uid=${request.auth.uid}, userId=${userId}`);

    logger.info(`用戶 ${request.auth.uid} 請求個人工時記錄，參數:`, { userId });

    // 🔍 關鍵修復：從日誌發現前端傳入的 userId 實際上已經是人員ID
    // 直接使用 userId 作為 personnelId 查詢工時記錄
    const personnelId = userId;
    logger.info(`直接使用人員ID進行查詢: ${personnelId}`);

    // 2. 檢查工時記錄集合總數（除錯用）
    const allTimeEntriesCount = await db.collection('timeEntries').count().get();
    logger.info(`工時記錄集合總數: ${allTimeEntriesCount.data().count}`);

    // 3. 使用人員ID查詢工時記錄
    let userTimeEntriesQuery;
    try {
      userTimeEntriesQuery = await db.collection('timeEntries')
        .where('personnelId', '==', personnelId)
        .limit(50)
        .orderBy('createdAt', 'desc')
        .get();
    } catch (error) {
      logger.warn('無法使用 orderBy 查詢，嘗試簡單查詢:', error);
      // 如果 orderBy 失敗（可能缺少索引），使用簡單查詢
      userTimeEntriesQuery = await db.collection('timeEntries')
        .where('personnelId', '==', personnelId)
        .limit(50)
        .get();
    }

    logger.info(`使用 personnelId=${personnelId} 找到 ${userTimeEntriesQuery.size} 筆記錄`);

    // 4. 檢查是否找到工時記錄
    if (userTimeEntriesQuery.size === 0) {
      logger.info('沒有找到該人員的工時記錄');

      // 除錯：列出前幾筆工時記錄看看資料結構
      const sampleTimeEntries = await db.collection('timeEntries').limit(3).get();
      sampleTimeEntries.docs.forEach((doc, index) => {
        const data = doc.data();
        logger.info(`範例工時記錄 ${index + 1}:`, {
          id: doc.id,
          personnelId: data.personnelId,
          personnelName: data.personnelName,
          workOrderId: data.workOrderId,
          duration: data.duration,
          status: data.status
        });
      });

      return {
        records: [],
        summary: {
          totalRecords: 0,
          totalHours: 0,
          uniqueWorkOrders: 0
        }
      };
    }

    // 5. 處理工時記錄資料
    const records = userTimeEntriesQuery.docs.map(doc => {
      const data = doc.data();

      // 計算工時 - 優先使用 duration 欄位
      let duration = 0;
      if (data.duration && typeof data.duration === 'number') {
        duration = data.duration;
      } else if (data.startTime && data.endTime && data.startDate) {
        try {
          const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
          const endDateTime = new Date(`${data.endDate || data.startDate}T${data.endTime}`);
          duration = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
        } catch (error) {
          logger.warn('無法計算工時:', { docId: doc.id, error });
          duration = 0;
        }
      }

      return {
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
    });

    logger.info(`處理完成，記錄詳情:`, records.map(r => ({
      id: r.id.slice(-6),
      workOrderNumber: r.workOrderNumber,
      duration: r.duration,
      date: r.startDate
    })));

    const totalHours = records.reduce((sum, record) => sum + (record.duration || 0), 0);
    const uniqueWorkOrders = new Set(records.map(record => record.workOrderId)).size;

    const response = {
      records: records,
      summary: {
        totalRecords: records.length,
        totalHours: totalHours,
        uniqueWorkOrders: uniqueWorkOrders
      }
    };

    logger.info(`返回 ${records.length} 筆工時記錄，總工時 ${totalHours.toFixed(2)} 小時`);
    return response;

    // 下面是原本的邏輯，暫時註解掉以測試簡化版本
    /*

    const validWorkOrderIds = validWorkOrdersQuery.docs.map(doc => doc.id);
    logger.info(`找到 ${validWorkOrderIds.length} 個已完工/已入庫的工單:`, validWorkOrderIds.slice(0, 5));

    if (validWorkOrderIds.length === 0) {
      logger.info('沒有找到已完工或已入庫的工單，改為查詢所有工單');

      // 備選方案：查詢所有工單
      const allWorkOrdersQuery = await db.collection('work_orders').get();
      const allWorkOrderIds = allWorkOrdersQuery.docs.map(doc => doc.id);

      logger.info(`總共工單數量: ${allWorkOrderIds.length}`);

      if (allWorkOrderIds.length === 0) {
        logger.info('資料庫中沒有任何工單');
        return {
          records: [],
          summary: {
            totalRecords: 0,
            totalHours: 0,
            uniqueWorkOrders: 0
          }
        };
      }

      // 使用所有工單ID進行後續查詢
      validWorkOrderIds.splice(0, 0, ...allWorkOrderIds);
    }

    // 2. 查詢與這些工單相關的工時記錄
    logger.info(`開始查詢用戶 ${userId} 的工時記錄，針對前10個工單`);

    // 先嘗試 personnelId，如果沒有結果再嘗試 userId 和其他可能字段
    let timeEntriesQuery = await db.collection('timeEntries')
      .where('personnelId', '==', userId)
      .where('workOrderId', 'in', validWorkOrderIds.slice(0, 10)) // Firestore 限制 in 查詢最多10個
      .orderBy('createdAt', 'desc')
      .get();

    logger.info(`使用 personnelId 查詢到 ${timeEntriesQuery.size} 筆工時記錄`);

    // 如果沒有結果，嘗試其他可能的用戶ID字段
    if (timeEntriesQuery.size === 0) {
      logger.info('使用 personnelId 沒有找到記錄，嘗試 userId');

      try {
        timeEntriesQuery = await db.collection('timeEntries')
          .where('userId', '==', userId)
          .where('workOrderId', 'in', validWorkOrderIds.slice(0, 10))
          .orderBy('createdAt', 'desc')
          .get();

        logger.info(`使用 userId 查詢到 ${timeEntriesQuery.size} 筆工時記錄`);
      } catch (error) {
        logger.info('userId 字段不存在或查詢失敗:', error);
      }

      // 如果還是沒有，嘗試只根據用戶ID查詢（不限制工單）
      if (timeEntriesQuery.size === 0) {
        logger.info('嘗試查詢該用戶的所有工時記錄（不限工單）');

        try {
          timeEntriesQuery = await db.collection('timeEntries')
            .where('personnelId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

          logger.info(`查詢該用戶所有工時記錄: ${timeEntriesQuery.size} 筆`);
        } catch (error) {
          logger.info('查詢所有工時記錄失敗:', error);
        }
      }
    }

    // 如果有超過10個有效工單，需要分批查詢
    let allTimeEntries = timeEntriesQuery.docs;

    if (validWorkOrderIds.length > 10) {
      for (let i = 10; i < validWorkOrderIds.length; i += 10) {
        const batch = validWorkOrderIds.slice(i, i + 10);
        const batchQuery = await db.collection('timeEntries')
          .where('personnelId', '==', userId)
          .where('workOrderId', 'in', batch)
          .orderBy('createdAt', 'desc')
          .get();

        allTimeEntries = allTimeEntries.concat(batchQuery.docs);
      }
    }

    // 3. 獲取相關工單資訊以取得工單號碼
    const workOrdersMap = new Map();
    for (const doc of validWorkOrdersQuery.docs) {
      const data = doc.data();
      workOrdersMap.set(doc.id, {
        workOrderNumber: data.workOrderNumber || data.code || doc.id.slice(-6),
        status: data.status
      });
    }

    // 4. 處理工時記錄資料
    const records = allTimeEntries.map(doc => {
      const data = doc.data();
      const workOrderInfo = workOrdersMap.get(data.workOrderId) || {
        workOrderNumber: `WO-${data.workOrderId?.slice(-6) || 'Unknown'}`,
        status: 'unknown'
      };

      // 計算工時
      let duration = 0;
      if (data.duration) {
        duration = data.duration;
      } else if (data.startTime && data.endTime && data.startDate) {
        // 嘗試計算工時
        try {
          const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
          const endDateTime = new Date(`${data.endDate || data.startDate}T${data.endTime}`);
          duration = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
        } catch (error) {
          logger.warn('無法計算工時:', { docId: doc.id, error });
          duration = 0;
        }
      }

      return {
        id: doc.id,
        workOrderId: data.workOrderId,
        workOrderNumber: workOrderInfo.workOrderNumber,
        personnelId: data.personnelId,
        personnelName: data.personnelName || '未知',
        startDate: data.startDate || '',
        startTime: data.startTime || '',
        endDate: data.endDate || data.startDate || '',
        endTime: data.endTime || '',
        duration: duration,
        overtimeHours: data.overtimeHours || 0,
        notes: data.notes || '',
        status: data.status || 'confirmed',
        createdAt: data.createdAt
      };
    });

    // 5. 計算統計資料
    const totalHours = records.reduce((sum, record) => sum + (record.duration || 0), 0);
    const uniqueWorkOrders = new Set(records.map(record => record.workOrderId)).size;

    const response = {
      records: records,
      summary: {
        totalRecords: records.length,
        totalHours: totalHours,
        uniqueWorkOrders: uniqueWorkOrders
      }
    };

    logger.info(`成功返回 ${records.length} 筆有效工時記錄，總工時 ${totalHours.toFixed(2)} 小時`);

    return response;
    */

  } catch (error) {
    logger.error('獲取個人工時記錄失敗:', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", "獲取個人工時記錄時發生未知錯誤");
  }
});

/**
 * 清理無效工時記錄
 */
export const cleanupInvalidTimeRecords = onCall(async (request) => {
  try {
    // 身份驗證
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "請先登入才能使用此功能");
    }

    logger.info(`用戶 ${request.auth.uid} 請求清理無效工時記錄`);

    // 1. 獲取所有工時記錄
    const timeEntriesQuery = await db.collection('timeEntries').get();

    // 2. 獲取所有存在的工單ID
    const workOrdersQuery = await db.collection('work_orders').get();
    const validWorkOrderIds = new Set(workOrdersQuery.docs.map(doc => doc.id));

    // 3. 找出無效的工時記錄
    const invalidRecords = [];

    for (const doc of timeEntriesQuery.docs) {
      const data = doc.data();
      const workOrderId = data.workOrderId;

      // 檢查是否缺少工單ID或工單不存在
      if (!workOrderId || !validWorkOrderIds.has(workOrderId)) {
        invalidRecords.push(doc);
      }
    }

    // 4. 刪除無效記錄
    let deletedCount = 0;
    const batch = db.batch();

    for (const doc of invalidRecords) {
      batch.delete(doc.ref);
      deletedCount++;
    }

    if (deletedCount > 0) {
      await batch.commit();
    }

    logger.info(`清理完成：檢查了 ${timeEntriesQuery.docs.length} 筆記錄，刪除了 ${deletedCount} 筆無效記錄`);

    return {
      deletedCount: deletedCount,
      affectedWorkOrders: [],
      summary: {
        totalRecordsChecked: timeEntriesQuery.docs.length,
        invalidRecordsFound: invalidRecords.length,
        recordsDeleted: deletedCount
      }
    };

  } catch (error) {
    logger.error('清理無效工時記錄失敗:', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", "清理無效工時記錄時發生未知錯誤");
  }
});