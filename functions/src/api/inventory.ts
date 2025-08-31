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

  const stocktakerRef = db.doc(`users/${contextAuth.uid}`);

  try {
    await db.runTransaction(async (transaction) => {
      // 收集所有盤點項目的明細
      const itemDetails = [];
      
      // 處理每個盤點項目
      for (const item of items) {
        // Basic validation for each item in the array
        if (!item.itemRefPath || typeof item.newStock !== 'number' || item.newStock < 0) {
          // We throw an error here which will cause the transaction to fail.
          throw new HttpsError("invalid-argument", `項目 ${item.itemRefPath || '未知'} 的資料無效。`);
        }

        const itemRef = db.doc(item.itemRefPath);
        const changeQuantity = item.newStock - item.currentStock;

        // Only process if there is an actual change in stock
        if (changeQuantity !== 0) {
          // Get item details for the inventory record
          const itemDoc = await transaction.get(itemRef);
          const itemData = itemDoc.data();
          
          // Update the item's stock level
          transaction.update(itemRef, {
            currentStock: item.newStock,
            lastStockUpdate: FieldValue.serverTimestamp(),
          });

          // 收集項目明細
          itemDetails.push({
            itemId: itemRef.id,
            itemType: item.itemRefPath.includes('materials') ? 'material' : 'fragrance',
            itemCode: itemData?.code || '',
            itemName: itemData?.name || '',
            quantityChange: changeQuantity,
            quantityAfter: item.newStock
          });
        }
      }
      
      // 建立統一的庫存紀錄（以動作為單位）
      if (itemDetails.length > 0) {
        const inventoryRecordRef = db.collection("inventory_records").doc();
        transaction.set(inventoryRecordRef, {
          changeDate: FieldValue.serverTimestamp(),
          changeReason: 'inventory_check',
          operatorId: contextAuth.uid,
          operatorName: contextAuth.token?.name || '未知用戶',
          remarks: `盤點調整，共 ${itemDetails.length} 個項目`,
          relatedDocumentId: null,
          relatedDocumentType: 'stocktake',
          details: itemDetails,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    });

    logger.info(`管理員 ${contextAuth.uid} 成功完成了 ${items.length} 個品項的盤點更新。`);
    return { success: true, count: items.length };

  } catch (error) {
    logger.error(`處理盤點更新時發生嚴重錯誤:`, error);
    if (error instanceof HttpsError) { throw error; }
    throw new HttpsError("internal", "處理盤點更新時發生未知錯誤。");
  }
});
