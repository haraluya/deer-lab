// functions/src/api/maintenance/inventoryTools.ts
/**
 * 🛠️ 德科斯特的實驗室 - 庫存維護工具 API
 *
 * 用途：庫存系統的維護、盤點和批量更新工具
 * 注意：這些API主要用於系統維護，平時不被前端直接調用
 * 權限：需要管理員或領班權限
 */

import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createApiHandler } from "../../utils/apiWrapper";
import { BusinessError, ApiErrorCode, ErrorHandler } from "../../utils/errorHandler";
import { Permission, UserRole } from "../../middleware/auth";

const db = getFirestore();

/**
 * 盤點項目介面
 */
interface StocktakeItem {
  itemId: string;
  itemType: 'material' | 'fragrance';
  actualStock: number;
  notes?: string;
}

/**
 * 執行庫存盤點請求介面
 */
interface PerformStocktakeRequest {
  items: StocktakeItem[];
  operatorName?: string;
  notes?: string;
}

/**
 * 庫存盤點回應介面
 */
interface PerformStocktakeResponse {
  processedCount: number;
  adjustmentCount: number;
  totalVariance: number;
  details: Array<{
    itemId: string;
    itemType: string;
    itemName: string;
    previousStock: number;
    actualStock: number;
    variance: number;
    adjusted: boolean;
  }>;
  inventoryRecordId?: string;
  message: string;
}

/**
 * 統一庫存更新請求介面
 */
interface UnifiedInventoryUpdateRequest {
  changes: Array<{
    itemId: string;
    itemType: 'material' | 'fragrance';
    changeType: 'adjustment' | 'correction' | 'transfer' | 'loss' | 'found';
    quantity: number;
    reason: string;
    notes?: string;
  }>;
  operatorId?: string;
  operatorName?: string;
  batchNotes?: string;
}

/**
 * 統一庫存更新回應介面
 */
interface UnifiedInventoryUpdateResponse {
  processedCount: number;
  successCount: number;
  failedCount: number;
  totalQuantityChanged: number;
  details: Array<{
    itemId: string;
    itemType: string;
    itemName: string;
    previousStock: number;
    newStock: number;
    quantityChanged: number;
    success: boolean;
    error?: string;
  }>;
  inventoryRecordId?: string;
  message: string;
}

/**
 * 🔧 執行庫存盤點 - 大量庫存調整工具
 * 用於定期盤點時批量調整庫存數據
 */
export const performStocktake = createApiHandler<PerformStocktakeRequest, PerformStocktakeResponse>(
  {
    functionName: 'performStocktake',
    requireAuth: true,
    requiredRole: UserRole.ADMIN,
    enableDetailedLogging: true,
    version: '1.0.0'
  },
  async (data, context, requestId) => {
    const { items, operatorName, notes } = data;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        '盤點項目不能為空'
      );
    }

    try {
      const results = [];
      let processedCount = 0;
      let adjustmentCount = 0;
      let totalVariance = 0;

      // 在事務中處理所有庫存調整
      await db.runTransaction(async (transaction) => {
        // 第一階段：讀取所有項目的當前庫存
        const itemReads = [];
        for (const item of items) {
          const collection = item.itemType === 'fragrance' ? 'fragrances' : 'materials';
          const itemRef = db.doc(`${collection}/${item.itemId}`);
          itemReads.push({ ref: itemRef, item });
        }

        const itemDocs = await Promise.all(
          itemReads.map(({ ref }) => transaction.get(ref))
        ) as import('firebase-admin/firestore').DocumentSnapshot[];

        // 第二階段：計算差異並執行調整
        const inventoryDetails = [];

        for (let i = 0; i < itemDocs.length; i++) {
          const doc = itemDocs[i];
          const { ref, item } = itemReads[i];

          if (!doc.exists) {
            logger.warn(`[${requestId}] 項目不存在: ${item.itemType}/${item.itemId}`);
            continue;
          }

          const currentData = doc.data()!;
          const previousStock = currentData.currentStock || 0;
          const actualStock = Number(item.actualStock) || 0;
          const variance = actualStock - previousStock;

          const detail = {
            itemId: item.itemId,
            itemType: item.itemType,
            itemName: currentData.name || '未知',
            previousStock,
            actualStock,
            variance,
            adjusted: false
          };

          // 如果有差異，進行調整
          if (Math.abs(variance) > 0.01) {
            transaction.update(ref, {
              currentStock: actualStock,
              lastStockUpdate: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp()
            });

            // 創建庫存異動記錄
            const movementRef = db.collection("inventoryMovements").doc();
            transaction.set(movementRef, {
              itemRef: ref,
              itemType: item.itemType,
              changeQuantity: variance,
              type: "stocktake_adjustment",
              previousStock,
              newStock: actualStock,
              createdAt: FieldValue.serverTimestamp(),
              createdBy: context.auth?.uid || 'system',
              notes: item.notes || `盤點調整：${variance > 0 ? '增加' : '減少'} ${Math.abs(variance)}`
            });

            detail.adjusted = true;
            adjustmentCount++;
            totalVariance += Math.abs(variance);

            logger.info(`[${requestId}] 調整 ${item.itemType} ${currentData.name}: ${previousStock} → ${actualStock} (${variance})`);
          }

          inventoryDetails.push({
            itemId: item.itemId,
            itemType: item.itemType,
            itemCode: currentData.code || '',
            itemName: currentData.name || '',
            quantityBefore: previousStock,
            quantityChange: variance,
            quantityAfter: actualStock,
            changeReason: `盤點${variance === 0 ? '無差異' : '調整'}`,
            notes: item.notes
          });

          results.push(detail);
          processedCount++;
        }

        // 創建統一的盤點記錄
        if (inventoryDetails.length > 0) {
          const inventoryRecordRef = db.collection("inventory_records").doc();
          transaction.set(inventoryRecordRef, {
            changeDate: FieldValue.serverTimestamp(),
            changeReason: 'stocktake',
            operatorId: context.auth?.uid || 'system',
            operatorName: operatorName || '系統管理員',
            remarks: notes || `庫存盤點：處理${processedCount}項，調整${adjustmentCount}項`,
            relatedDocumentType: 'stocktake_batch',
            details: inventoryDetails,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      });

      logger.info(`[${requestId}] 盤點完成：處理${processedCount}項，調整${adjustmentCount}項，總差異${totalVariance.toFixed(2)}`);

      return {
        processedCount,
        adjustmentCount,
        totalVariance,
        details: results,
        message: `盤點完成：處理${processedCount}項目，其中${adjustmentCount}項需要調整`
      };

    } catch (error) {
      logger.error(`[${requestId}] 執行盤點失敗:`, error);
      throw ErrorHandler.handle(error, '執行庫存盤點');
    }
  }
);

/**
 * 🔧 統一庫存更新API - 整合所有庫存修改操作的統一入口
 * 支援多種類型的庫存變更：調整、修正、轉移、損失、發現等
 */
export const unifiedInventoryUpdate = createApiHandler<UnifiedInventoryUpdateRequest, UnifiedInventoryUpdateResponse>(
  {
    functionName: 'unifiedInventoryUpdate',
    requireAuth: true,
    requiredRole: UserRole.FOREMAN, // 領班以上權限
    enableDetailedLogging: true,
    version: '2.0.0'
  },
  async (data, context, requestId) => {
    const { changes, operatorId, operatorName, batchNotes } = data;

    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        '庫存變更項目不能為空'
      );
    }

    const validChangeTypes = ['adjustment', 'correction', 'transfer', 'loss', 'found'];
    for (const change of changes) {
      if (!validChangeTypes.includes(change.changeType)) {
        throw new BusinessError(
          ApiErrorCode.INVALID_INPUT,
          `無效的變更類型: ${change.changeType}`
        );
      }
    }

    try {
      let processedCount = 0;
      let successCount = 0;
      let failedCount = 0;
      let totalQuantityChanged = 0;
      const details = [];

      // 在事務中處理所有庫存變更
      const inventoryRecordId = await db.runTransaction(async (transaction) => {
        // 第一階段：讀取所有項目
        const itemReads = [];
        for (const change of changes) {
          const collection = change.itemType === 'fragrance' ? 'fragrances' : 'materials';
          const itemRef = db.doc(`${collection}/${change.itemId}`);
          itemReads.push({ ref: itemRef, change });
        }

        const itemDocs = await Promise.all(
          itemReads.map(({ ref }) => transaction.get(ref))
        ) as import('firebase-admin/firestore').DocumentSnapshot[];

        // 第二階段：執行變更
        const inventoryDetails = [];

        for (let i = 0; i < itemDocs.length; i++) {
          const doc = itemDocs[i];
          const { ref, change } = itemReads[i];
          processedCount++;

          try {
            if (!doc.exists) {
              throw new Error(`項目不存在: ${change.itemType}/${change.itemId}`);
            }

            const currentData = doc.data()!;
            const previousStock = currentData.currentStock || 0;
            const quantityChange = Number(change.quantity) || 0;
            const newStock = Math.max(0, previousStock + quantityChange);

            // 更新庫存
            transaction.update(ref, {
              currentStock: newStock,
              lastStockUpdate: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp()
            });

            // 創建庫存異動記錄
            const movementRef = db.collection("inventoryMovements").doc();
            transaction.set(movementRef, {
              itemRef: ref,
              itemType: change.itemType,
              changeQuantity: quantityChange,
              type: `unified_${change.changeType}`,
              previousStock,
              newStock,
              reason: change.reason,
              createdAt: FieldValue.serverTimestamp(),
              createdBy: operatorId || context.auth?.uid || 'system',
              notes: change.notes
            });

            // 收集詳細資料
            inventoryDetails.push({
              itemId: change.itemId,
              itemType: change.itemType,
              itemCode: currentData.code || '',
              itemName: currentData.name || '',
              quantityBefore: previousStock,
              quantityChange,
              quantityAfter: newStock,
              changeReason: change.reason,
              changeType: change.changeType,
              notes: change.notes
            });

            details.push({
              itemId: change.itemId,
              itemType: change.itemType,
              itemName: currentData.name || '未知',
              previousStock,
              newStock,
              quantityChanged: quantityChange,
              success: true
            });

            successCount++;
            totalQuantityChanged += Math.abs(quantityChange);

            logger.info(`[${requestId}] 成功更新 ${change.itemType} ${currentData.name}: ${previousStock} → ${newStock}`);

          } catch (error) {
            details.push({
              itemId: change.itemId,
              itemType: change.itemType,
              itemName: '未知',
              previousStock: 0,
              newStock: 0,
              quantityChanged: 0,
              success: false,
              error: error instanceof Error ? error.message : String(error)
            });

            failedCount++;
            logger.error(`[${requestId}] 更新失敗 ${change.itemType}/${change.itemId}:`, error);
          }
        }

        // 創建統一的庫存記錄
        let recordId: string | undefined;
        if (inventoryDetails.length > 0) {
          const inventoryRecordRef = db.collection("inventory_records").doc();
          recordId = inventoryRecordRef.id;

          transaction.set(inventoryRecordRef, {
            changeDate: FieldValue.serverTimestamp(),
            changeReason: 'unified_update',
            operatorId: operatorId || context.auth?.uid || 'system',
            operatorName: operatorName || '系統管理員',
            remarks: batchNotes || `統一庫存更新：處理${processedCount}項，成功${successCount}項`,
            relatedDocumentType: 'unified_inventory_batch',
            details: inventoryDetails,
            createdAt: FieldValue.serverTimestamp(),
          });
        }

        return recordId;
      });

      logger.info(`[${requestId}] 統一庫存更新完成：處理${processedCount}項，成功${successCount}項，失敗${failedCount}項`);

      return {
        processedCount,
        successCount,
        failedCount,
        totalQuantityChanged,
        details,
        inventoryRecordId,
        message: `庫存更新完成：處理${processedCount}項目，成功${successCount}項，失敗${failedCount}項`
      };

    } catch (error) {
      logger.error(`[${requestId}] 統一庫存更新失敗:`, error);
      throw ErrorHandler.handle(error, '統一庫存更新');
    }
  }
);