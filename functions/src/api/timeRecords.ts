// functions/src/api/timeRecords.ts
import { logger } from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { apiWrapper } from "../utils/apiWrapper";
import { BusinessError, ERROR_CODES, ErrorHandler } from "../utils/errorHandler";
import { requireAuth } from "../middleware/auth";
import { ensureIsAdminOrForeman } from "../utils/auth";

const db = getFirestore();

/**
 * 清理無效的工時記錄（沒有對應工單或工單不存在的記錄）
 */
export const cleanupInvalidTimeRecords = onCall(apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { auth: contextAuth } = request;
    await ensureIsAdminOrForeman(contextAuth?.uid);

    try {
      logger.info(`開始清理無效工時記錄，操作者: ${contextAuth?.uid}`);
      
      // 獲取所有工時記錄
      const timeEntriesSnapshot = await db.collection('timeEntries').get();
      logger.info(`找到 ${timeEntriesSnapshot.size} 筆工時記錄待檢查`);
      
      let invalidCount = 0;
      let deletedCount = 0;
      const batch = db.batch();
      
      for (const timeEntryDoc of timeEntriesSnapshot.docs) {
        const timeEntry = timeEntryDoc.data() as any;
        
        if (!timeEntry.workOrderId) {
          // 沒有工單ID的記錄
          logger.info(`發現無工單ID的工時記錄: ${timeEntryDoc.id}`);
          batch.delete(timeEntryDoc.ref);
          invalidCount++;
          continue;
        }
        
        // 檢查對應的工單是否存在
        const workOrderDoc = await db.doc(`workOrders/${timeEntry.workOrderId}`).get();
        
        if (!workOrderDoc.exists) {
          // 工單不存在的記錄
          logger.info(`發現無對應工單的工時記錄: ${timeEntryDoc.id}, 工單ID: ${timeEntry.workOrderId}`);
          batch.delete(timeEntryDoc.ref);
          invalidCount++;
        }
      }
      
      if (invalidCount > 0) {
        await batch.commit();
        deletedCount = invalidCount;
        logger.info(`已清理 ${deletedCount} 筆無效工時記錄`);
      } else {
        logger.info('沒有發現無效工時記錄');
      }

      return {
        deletedCount: deletedCount,
        checkedCount: timeEntriesSnapshot.size,
        message: `清理完成，共清理 ${deletedCount} 筆無效工時記錄`,
      };

    } catch (error: any) {
      ErrorHandler.handle(error, "清理無效工時記錄", contextAuth?.uid);
    }
  }
}));

/**
 * 獲取個人有效工時記錄（只包含已完工和已入庫工單的工時）
 */
export const getPersonalValidTimeRecords = onCall(apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { auth: contextAuth, data } = request;
    
    const { personnelId } = data;
    if (!personnelId) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        missingFields: ['personnelId']
      });
    }

    try {
      logger.info(`載入人員 ${personnelId} 的有效工時記錄`);

      // 1. 獲取該人員的所有工時記錄
      const timeEntriesSnapshot = await db.collection('timeEntries')
        .where('personnelId', '==', personnelId)
        .get();

      logger.info(`找到 ${timeEntriesSnapshot.size} 筆工時記錄`);

      const validTimeEntries = [];
      let invalidCount = 0;

      // 2. 檢查每個工時記錄對應的工單狀態
      for (const timeEntryDoc of timeEntriesSnapshot.docs) {
        const timeEntry = { id: timeEntryDoc.id, ...timeEntryDoc.data() } as any;
        
        if (!timeEntry.workOrderId) {
          invalidCount++;
          continue;
        }

        // 獲取對應的工單
        const workOrderDoc = await db.doc(`workOrders/${timeEntry.workOrderId}`).get();
        
        if (!workOrderDoc.exists) {
          logger.warn(`工時記錄 ${timeEntry.id} 對應的工單 ${timeEntry.workOrderId} 不存在`);
          invalidCount++;
          continue;
        }

        const workOrder = workOrderDoc.data()!;
        
        // 只包含已完工和已入庫的工單工時
        if (workOrder.status === '完工' || workOrder.status === '入庫') {
          validTimeEntries.push({
            ...timeEntry,
            workOrderStatus: workOrder.status,
            workOrderCode: workOrder.code
          });
        } else {
          logger.info(`跳過非完工/入庫狀態的工單工時: ${timeEntry.id}, 工單狀態: ${workOrder.status}`);
        }
      }

      logger.info(`返回 ${validTimeEntries.length} 筆有效工時記錄，跳過 ${invalidCount} 筆無效記錄`);

      return {
        timeEntries: validTimeEntries,
        totalFound: timeEntriesSnapshot.size,
        validCount: validTimeEntries.length,
        invalidCount: invalidCount,
        personnelId: personnelId,
        message: `獲取 ${validTimeEntries.length} 筆有效工時記錄`
      };

    } catch (error: any) {
      ErrorHandler.handle(error, `獲取人員 ${personnelId} 的有效工時記錄`, contextAuth?.uid);
    }
  }
}));