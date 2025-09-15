// functions/src/api/inventory.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ensureIsAdmin } from "../utils/auth";

const db = getFirestore();

interface StocktakeItemPayload {
  itemRefPath: string; // e.g., "materials/xxxxx" or "fragrances/yyyyy"
  currentStock: number; // The stock count before the update
  newStock: number; // The new stock count from the stocktake
}

/**
 * Updates the stock for multiple items based on a stocktake and creates inventory movement logs.
 * This function uses a Firestore transaction to ensure atomicity.
 */
/**
 * 手動調整單項庫存 (重構為調用統一API)
 */
export const adjustInventory = onCall(async (request) => {
  const { auth: contextAuth, data } = request;
  // await ensureIsAdmin(contextAuth?.uid);

  if (!contextAuth) {
    throw new HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
  }

  const { itemId, itemType, quantityChange, remarks } = data;

  if (!itemId || !itemType || typeof quantityChange !== 'number') {
    throw new HttpsError("invalid-argument", "缺少必要的調整參數。");
  }

  if (!['material', 'fragrance'].includes(itemType)) {
    throw new HttpsError("invalid-argument", "不支援的項目類型。");
  }

  try {
    // 🎯 調用統一庫存更新API
    const unifiedRequest = {
      source: {
        type: 'manual_adjust' as const,
        operatorId: contextAuth.uid,
        operatorName: contextAuth.token?.name || '未知用戶',
        remarks: remarks || '直接修改庫存',
        relatedDocumentId: itemId,
        relatedDocumentType: 'manual' as const
      },
      updates: [{
        itemId: itemId,
        itemType: itemType as 'material' | 'fragrance',
        operation: quantityChange >= 0 ? 'add' as const : 'subtract' as const,
        quantity: Math.abs(quantityChange),
        reason: remarks || '手動調整庫存'
      }],
      options: {
        allowNegativeStock: false,
        skipStockValidation: false,
        batchMode: false
      }
    };

    // 調用統一API邏輯 (內部調用)
    const unifiedResponse = await executeUnifiedInventoryUpdate(contextAuth, unifiedRequest);

    logger.info(`管理員 ${contextAuth.uid} 成功調整了 ${itemType} ${itemId} 的庫存，變更量: ${quantityChange}`);

    // 保持向後相容的回應格式
    return { success: true };

  } catch (error) {
    logger.error(`調整庫存時發生錯誤:`, error);
    if (error instanceof HttpsError) { throw error; }
    throw new HttpsError("internal", "調整庫存時發生未知錯誤。");
  }
});

/**
 * 獲取庫存總覽數據
 */
export const getInventoryOverview = onCall(async (request) => {
  const { auth: contextAuth } = request;
  
  if (!contextAuth) {
    throw new HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
  }

  try {
    // 並行獲取物料和香精數據
    const [materialsSnapshot, fragrancesSnapshot] = await Promise.all([
      db.collection("materials").get(),
      db.collection("fragrances").get()
    ]);

    // 計算物料統計
    let totalMaterials = 0;
    let totalMaterialCost = 0;
    let lowStockMaterials = 0;
    
    materialsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const currentStock = data.currentStock || 0;
      const costPerUnit = data.costPerUnit || 0;
      const minStock = data.minStock || 0;
      
      totalMaterials++;
      totalMaterialCost += currentStock * costPerUnit;
      
      // 只有設定了低庫存閾值（minStock > 0）且當前庫存低於閾值時才算低庫存
      if (minStock > 0 && currentStock <= minStock) {
        lowStockMaterials++;
      }
    });

    // 計算香精統計  
    let totalFragrances = 0;
    let totalFragranceCost = 0;
    let lowStockFragrances = 0;
    
    fragrancesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const currentStock = data.currentStock || 0;
      const costPerUnit = data.costPerUnit || 0;
      const minStock = data.minStock || 0;
      
      totalFragrances++;
      totalFragranceCost += currentStock * costPerUnit;
      
      // 只有設定了低庫存閾值（minStock > 0）且當前庫存低於閾值時才算低庫存
      if (minStock > 0 && currentStock <= minStock) {
        lowStockFragrances++;
      }
    });

    return {
      success: true,
      data: {
        overview: {
          totalMaterials,
          totalFragrances,
          totalMaterialCost: Math.round(totalMaterialCost),
          totalFragranceCost: Math.round(totalFragranceCost),
          lowStockMaterials,
          lowStockFragrances,
          totalLowStock: lowStockMaterials + lowStockFragrances
        }
      },
      meta: {
        timestamp: Date.now(),
        requestId: `inventory_overview_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        version: '1.0'
      }
    };
  } catch (error) {
    logger.error("獲取庫存總覽失敗:", error);
    throw new HttpsError("internal", "獲取庫存總覽失敗");
  }
});

/**
 * 快速更新庫存 - 支援批量操作 (重構為調用統一API)
 */
export const quickUpdateInventory = onCall(async (request) => {
  const { auth: contextAuth, data } = request;

  if (!contextAuth) {
    throw new HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
  }

  // 詳細除錯資訊
  logger.info("🔧 quickUpdateInventory 收到的請求資料:", {
    data: data,
    dataType: typeof data,
    hasUpdates: !!data?.updates,
    updatesType: typeof data?.updates,
    updatesLength: Array.isArray(data?.updates) ? data.updates.length : 'not array'
  });

  const { updates } = data;

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    logger.error("❌ 更新項目陣列驗證失敗:", {
      updates: updates,
      updatesType: typeof updates,
      isArray: Array.isArray(updates),
      length: updates?.length
    });
    throw new HttpsError("invalid-argument", "缺少更新項目陣列。");
  }

  try {
    // 🎯 轉換為統一API格式
    const isStocktake = updates.some((u: any) => u.reason && u.reason.includes('盤點'));

    const unifiedUpdates = updates.map((update: any) => ({
      itemId: update.itemId,
      itemType: update.type as 'material' | 'fragrance',
      operation: 'set' as const, // quickUpdate 是直接設定值
      quantity: update.newStock,
      reason: update.reason || '快速更新庫存'
    }));

    const unifiedRequest = {
      source: {
        type: isStocktake ? 'stocktake' as const : 'direct_edit' as const,
        operatorId: contextAuth.uid,
        operatorName: contextAuth.token?.name || '未知用戶',
        remarks: updates[0]?.reason || (isStocktake ? '庫存盤點調整' : '快速更新庫存'),
        relatedDocumentId: null,
        relatedDocumentType: isStocktake ? 'stocktake' as const : 'manual' as const
      },
      updates: unifiedUpdates,
      options: {
        allowNegativeStock: false,
        skipStockValidation: false,
        batchMode: true
      }
    };

    // 調用統一API邏輯 (內部調用)
    const unifiedResponse = await executeUnifiedInventoryUpdate(contextAuth, unifiedRequest);

    logger.info(`使用者 ${contextAuth.uid} 批量更新庫存：成功 ${unifiedResponse.summary.successful}，失敗 ${unifiedResponse.summary.failed}，跳過 ${unifiedResponse.summary.skipped}`);

    // 保持向後相容的回應格式
    return {
      successful: unifiedResponse.successful,
      failed: unifiedResponse.failed,
      summary: unifiedResponse.summary
    };

  } catch (error) {
    logger.error(`批量更新庫存時發生錯誤:`, error);
    if (error instanceof HttpsError) { throw error; }
    throw new HttpsError("internal", "批量更新庫存時發生未知錯誤。");
  }
});

/**
 * 獲取低庫存項目
 */
export const getLowStockItems = onCall(async (request) => {
  const { auth: contextAuth } = request;
  
  if (!contextAuth) {
    throw new HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
  }

  try {
    // 並行獲取物料和香精數據
    const [materialsSnapshot, fragrancesSnapshot] = await Promise.all([
      db.collection("materials").get(),
      db.collection("fragrances").get()
    ]);

    const lowStockItems: any[] = [];

    // 檢查低庫存物料
    materialsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const currentStock = data.currentStock || 0;
      const minStock = data.minStock || 0;
      
      // 只有設定了低庫存閾值（minStock > 0）且當前庫存低於閾值時才算低庫存
      if (minStock > 0 && currentStock <= minStock) {
        lowStockItems.push({
          id: doc.id,
          type: 'material',
          code: data.code || '',
          name: data.name || '',
          currentStock,
          minStock,
          unit: data.unit || '',
          shortage: minStock - currentStock,
          costPerUnit: data.costPerUnit || 0
        });
      }
    });

    // 檢查低庫存香精
    fragrancesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const currentStock = data.currentStock || 0;
      const minStock = data.minStock || 0;
      
      // 只有設定了低庫存閾值（minStock > 0）且當前庫存低於閾值時才算低庫存
      if (minStock > 0 && currentStock <= minStock) {
        lowStockItems.push({
          id: doc.id,
          type: 'fragrance',
          code: data.code || '',
          name: data.name || '',
          currentStock,
          minStock,
          unit: data.unit || '',
          shortage: minStock - currentStock,
          costPerUnit: data.costPerUnit || 0
        });
      }
    });

    // 按短缺程度排序
    lowStockItems.sort((a, b) => b.shortage - a.shortage);

    return {
      items: lowStockItems
    };
  } catch (error) {
    logger.error("獲取低庫存項目失敗:", error);
    throw new HttpsError("internal", "獲取低庫存項目失敗");
  }
});

export const performStocktake = onCall(async (request) => {
  const { auth: contextAuth, data } = request;
  // await ensureIsAdmin(contextAuth?.uid);

  if (!contextAuth) {
    throw new HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
  }

  const { items } = data;
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpsError("invalid-argument", "缺少有效的盤點項目資料。");
  }

  try {
    // 🎯 轉換為統一API格式
    const unifiedUpdates = items.map((item: any) => {
      // 基本驗證
      if (!item.itemRefPath || typeof item.newStock !== 'number' || item.newStock < 0) {
        throw new HttpsError("invalid-argument", `項目 ${item.itemRefPath || '未知'} 的資料無效。`);
      }

      // 從 itemRefPath 解析項目ID和類型
      const itemId = item.itemRefPath.split('/').pop();
      const itemType = item.itemRefPath.includes('materials') ? 'material' : 'fragrance';

      return {
        itemId: itemId,
        itemType: itemType as 'material' | 'fragrance',
        operation: 'set' as const, // 盤點是直接設定值
        quantity: item.newStock,
        currentStock: item.currentStock, // 用於驗證
        reason: '庫存盤點調整'
      };
    });

    const unifiedRequest = {
      source: {
        type: 'stocktake' as const,
        operatorId: contextAuth.uid,
        operatorName: contextAuth.token?.name || '未知用戶',
        remarks: `盤點調整，共 ${items.length} 個項目`,
        relatedDocumentId: null,
        relatedDocumentType: 'stocktake' as const
      },
      updates: unifiedUpdates,
      options: {
        allowNegativeStock: false,
        skipStockValidation: true, // 盤點可以跳過庫存驗證
        batchMode: true
      }
    };

    // 調用統一API邏輯
    const unifiedResponse = await executeUnifiedInventoryUpdate(contextAuth, unifiedRequest);

    logger.info(`管理員 ${contextAuth.uid} 成功完成了 ${items.length} 個品項的盤點更新。`);

    // 保持向後相容的回應格式
    return { success: true, count: items.length };

  } catch (error) {
    logger.error(`處理盤點更新時發生嚴重錯誤:`, error);
    if (error instanceof HttpsError) { throw error; }
    throw new HttpsError("internal", "處理盤點更新時發生未知錯誤。");
  }
});

/**
 * 🎯 統一庫存更新核心邏輯 (內部共用函數)
 */
async function executeUnifiedInventoryUpdate(contextAuth: any, data: any) {
  const { source, updates, options = {} } = data;

  // 參數驗證
  if (!source || !source.type || !Array.isArray(updates) || updates.length === 0) {
    throw new HttpsError("invalid-argument", "缺少必要的參數：source 或 updates。");
  }

  logger.info(`🎯 統一庫存更新開始：${source.type}`, {
    operatorId: source.operatorId,
    updateCount: updates.length,
    relatedDocumentId: source.relatedDocumentId
  });

  const successful: any[] = [];
  const failed: any[] = [];
  const inventoryRecordDetails: any[] = [];
  let totalQuantityChanged = 0;
  let recordId = '';

  await db.runTransaction(async (transaction) => {
    // 處理每個庫存更新項目
    for (const update of updates) {
      try {
        const { itemId, itemType, operation, quantity, currentStock } = update;

        // 驗證參數
        if (!itemId || !itemType || !operation || typeof quantity !== 'number') {
          failed.push({
            item: update,
            error: "缺少必要參數或參數格式錯誤"
          });
          continue;
        }

        if (!['material', 'fragrance'].includes(itemType)) {
          failed.push({
            item: update,
            error: "不支援的項目類型"
          });
          continue;
        }

        if (!['add', 'subtract', 'set'].includes(operation)) {
          failed.push({
            item: update,
            error: "不支援的操作類型"
          });
          continue;
        }

        // 獲取項目資料
        const collectionName = itemType === 'material' ? 'materials' : 'fragrances';
        const itemRef = db.doc(`${collectionName}/${itemId}`);
        const itemDoc = await transaction.get(itemRef);

        if (!itemDoc.exists) {
          failed.push({
            item: update,
            error: "項目不存在"
          });
          continue;
        }

        const itemData = itemDoc.data()!;
        const oldStock = itemData.currentStock || 0;

        // 根據操作類型計算新庫存
        let newStock: number;
        let quantityChange: number;

        switch (operation) {
          case 'add':
            newStock = oldStock + quantity;
            quantityChange = quantity;
            break;
          case 'subtract':
            newStock = Math.max(0, oldStock - quantity);
            quantityChange = -(quantity - Math.max(0, quantity - oldStock)); // 實際扣除量
            break;
          case 'set':
            newStock = quantity;
            quantityChange = quantity - oldStock;
            break;
          default:
            throw new Error("未知的操作類型");
        }

        // 庫存驗證
        if (!options.allowNegativeStock && newStock < 0) {
          failed.push({
            item: update,
            error: "操作會導致庫存為負數"
          });
          continue;
        }

        // 如果提供了當前庫存用於驗證，檢查是否一致
        if (currentStock !== undefined && !options.skipStockValidation && currentStock !== oldStock) {
          failed.push({
            item: update,
            error: `庫存驗證失敗：期望 ${currentStock}，實際 ${oldStock}`
          });
          continue;
        }

        // 如果庫存沒有變化，跳過更新
        if (quantityChange === 0) {
          successful.push({
            ...update,
            result: 'skipped',
            message: '庫存數量無變化',
            oldStock,
            newStock
          });
          continue;
        }

        // 更新庫存
        transaction.update(itemRef, {
          currentStock: newStock,
          lastStockUpdate: FieldValue.serverTimestamp(),
        });

        // 收集庫存記錄明細
        inventoryRecordDetails.push({
          itemId: itemId,
          itemType: itemType,
          itemCode: itemData.code || '',
          itemName: itemData.name || '',
          quantityChange: quantityChange,
          quantityAfter: newStock
        });

        totalQuantityChanged += Math.abs(quantityChange);

        successful.push({
          ...update,
          result: 'updated',
          message: `成功更新庫存：${oldStock} → ${newStock}`,
          oldStock,
          newStock,
          quantityChange
        });

      } catch (error) {
        logger.error(`處理單一更新項目時發生錯誤:`, error);
        failed.push({
          item: update,
          error: error instanceof Error ? error.message : "未知錯誤"
        });
      }
    }

    // 建立統一的庫存紀錄（僅當有實際更新時）
    if (inventoryRecordDetails.length > 0) {
      const inventoryRecordRef = db.collection("inventory_records").doc();
      recordId = inventoryRecordRef.id;

      // 根據來源類型確定變更原因
      const changeReasonMap: Record<string, string> = {
        'direct_edit': 'manual_adjustment',
        'stocktake': 'inventory_check',
        'purchase_receive': 'purchase',
        'work_order_complete': 'workorder',
        'manual_adjust': 'manual_adjustment'
      };

      const changeReason = changeReasonMap[source.type] || 'manual_adjustment';

      transaction.set(inventoryRecordRef, {
        changeDate: FieldValue.serverTimestamp(),
        changeReason: changeReason,
        operatorId: source.operatorId,
        operatorName: source.operatorName,
        remarks: source.remarks || `統一API - ${source.type}`,
        relatedDocumentId: source.relatedDocumentId || null,
        relatedDocumentType: source.relatedDocumentType || 'unified_api',
        details: inventoryRecordDetails,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  });

  const skipped = successful.filter(s => s.result === 'skipped').length;
  const summary = {
    total: updates.length,
    successful: successful.length,
    failed: failed.length,
    skipped: skipped
  };

  logger.info(`🎯 統一庫存更新完成：${source.type}`, {
    operatorId: source.operatorId,
    summary: summary
  });

  // 回傳統一格式的回應 (符合 BatchOperationResult 介面)
  return {
    successful,
    failed,
    summary,
    recordId: inventoryRecordDetails.length > 0 ? recordId : '',
    inventoryRecord: inventoryRecordDetails.length > 0 ? {
      id: recordId,
      changeReason: source.type,
      operatorName: source.operatorName,
      itemCount: inventoryRecordDetails.length
    } : null,
    additionalSummary: {
      totalQuantityChanged,
      affectedItems: successful.length
    }
  };
}

/**
 * 🎯 統一庫存更新API (2025-09-15 新增)
 * 整合所有庫存修改操作的統一入口
 */
export const unifiedInventoryUpdate = onCall(async (request) => {
  const { auth: contextAuth, data } = request;

  if (!contextAuth) {
    throw new HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
  }

  try {
    // 調用共用的核心邏輯
    return await executeUnifiedInventoryUpdate(contextAuth, data);
  } catch (error) {
    logger.error(`統一庫存更新時發生錯誤:`, error);
    if (error instanceof HttpsError) { throw error; }
    throw new HttpsError("internal", "統一庫存更新時發生未知錯誤。");
  }
});
