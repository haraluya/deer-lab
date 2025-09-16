// functions/src/api/inventory.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * 手動調整單項庫存
 */
export const adjustInventory = onCall(async (request) => {
  const { auth: contextAuth, data } = request;

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
    await db.runTransaction(async (transaction) => {
      const collection = itemType === 'material' ? 'materials' : 'fragrances';
      const itemRef = db.collection(collection).doc(itemId);
      const itemDoc = await transaction.get(itemRef);

      if (!itemDoc.exists) {
        throw new HttpsError("not-found", `${itemType === 'material' ? '物料' : '香精'}不存在`);
      }

      const itemData = itemDoc.data()!;
      const currentStock = itemData.currentStock || 0;
      const newStock = Math.max(0, currentStock + quantityChange);

      // 更新庫存
      transaction.update(itemRef, {
        currentStock: newStock,
        lastStockUpdate: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      // 創建庫存異動記錄
      const movementRef = db.collection("inventoryMovements").doc();
      transaction.set(movementRef, {
        itemRef: itemRef,
        itemType: itemType,
        changeQuantity: quantityChange,
        type: "manual_adjust",
        previousStock: currentStock,
        newStock: newStock,
        operatedBy: contextAuth.uid,
        operatorName: contextAuth.token?.name || '未知用戶',
        reason: remarks || '手動調整庫存',
        createdAt: FieldValue.serverTimestamp()
      });
    });

    logger.info(`管理員 ${contextAuth.uid} 成功調整了 ${itemType} ${itemId} 的庫存，變更量: ${quantityChange}`);
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
      const safetyStockLevel = data.safetyStockLevel || 0;

      totalMaterials++;
      totalMaterialCost += currentStock * costPerUnit;

      if (safetyStockLevel > 0 && currentStock <= safetyStockLevel) {
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
      const safetyStockLevel = data.safetyStockLevel || 0;

      totalFragrances++;
      totalFragranceCost += currentStock * costPerUnit;

      if (safetyStockLevel > 0 && currentStock <= safetyStockLevel) {
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
 * 快速更新庫存 - 支援批量操作
 */
export const quickUpdateInventory = onCall(async (request) => {
  const { auth: contextAuth, data } = request;

  if (!contextAuth) {
    throw new HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
  }

  const { updates } = data;

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    throw new HttpsError("invalid-argument", "缺少更新項目陣列。");
  }

  const successful: any[] = [];
  const failed: any[] = [];

  try {
    await db.runTransaction(async (transaction) => {
      for (const update of updates) {
        try {
          const { itemId, type: itemType, newStock } = update;

          const collection = itemType === 'material' ? 'materials' : 'fragrances';
          const itemRef = db.collection(collection).doc(itemId);
          const itemDoc = await transaction.get(itemRef);

          if (!itemDoc.exists) {
            failed.push({
              itemId,
              itemType,
              error: `${itemType === 'material' ? '物料' : '香精'}不存在`
            });
            continue;
          }

          const itemData = itemDoc.data()!;
          const previousStock = itemData.currentStock || 0;
          const finalStock = Number(newStock) || 0;

          // 更新庫存
          transaction.update(itemRef, {
            currentStock: finalStock,
            lastStockUpdate: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });

          // 創建庫存異動記錄
          const movementRef = db.collection("inventoryMovements").doc();
          transaction.set(movementRef, {
            itemRef: itemRef,
            itemType: itemType,
            changeQuantity: finalStock - previousStock,
            type: "quick_update",
            previousStock,
            newStock: finalStock,
            operatedBy: contextAuth.uid,
            operatorName: contextAuth.token?.name || '未知用戶',
            reason: update.reason || '快速更新庫存',
            createdAt: FieldValue.serverTimestamp()
          });

          successful.push({
            itemId,
            itemType,
            itemName: itemData.name || '未知',
            previousStock,
            newStock: finalStock,
            quantityChanged: finalStock - previousStock
          });

        } catch (error) {
          failed.push({
            itemId: update.itemId,
            itemType: update.type,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    });

    logger.info(`使用者 ${contextAuth.uid} 批量更新庫存：成功 ${successful.length}，失敗 ${failed.length}`);

    return {
      successful,
      failed,
      summary: {
        total: updates.length,
        successful: successful.length,
        failed: failed.length
      }
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
      const safetyStockLevel = data.safetyStockLevel || 0;

      if (safetyStockLevel > 0 && currentStock <= safetyStockLevel) {
        lowStockItems.push({
          id: doc.id,
          type: 'material',
          code: data.code || '',
          name: data.name || '',
          currentStock,
          safetyStockLevel,
          unit: data.unit || '',
          shortage: safetyStockLevel - currentStock,
          costPerUnit: data.costPerUnit || 0
        });
      }
    });

    // 檢查低庫存香精
    fragrancesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const currentStock = data.currentStock || 0;
      const safetyStockLevel = data.safetyStockLevel || 0;

      if (safetyStockLevel > 0 && currentStock <= safetyStockLevel) {
        lowStockItems.push({
          id: doc.id,
          type: 'fragrance',
          code: data.code || '',
          name: data.name || '',
          currentStock,
          safetyStockLevel,
          unit: data.unit || '',
          shortage: safetyStockLevel - currentStock,
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