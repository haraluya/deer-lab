// functions/src/api/purchaseOrders.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ensureIsAdmin } from "../utils/auth";

const db = getFirestore();

// 🎯 統一API回應格式輔助函數
function createStandardResponse<T = any>(success: boolean, data?: T, error?: { code: string; message: string; details?: any }) {
  return {
    success,
    data,
    error,
    meta: {
      timestamp: Date.now(),
      requestId: `po_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      version: 'v1'
    }
  };
}

interface PurchaseItemPayload {
  id: string;
  name: string;
  code: string;
  quantity: number;
  unit?: string;
  price?: number; // 單價
  itemRefPath?: string; // 用於收貨
  receivedQuantity?: number; // 用於收貨
}

export const createPurchaseOrders = onCall(async (request) => {
  const { auth: contextAuth, data } = request;
  if (!contextAuth?.uid) {
    throw new HttpsError("unauthenticated", "需要身分驗證才能建立採購單。");
  }

  const { suppliers } = data;

  if (!suppliers || !Array.isArray(suppliers) || suppliers.length === 0) {
    throw new HttpsError("invalid-argument", "缺少有效的供應商與項目資料。");
  }

  const createdByRef = db.doc(`users/${contextAuth.uid}`);
  const writeBatch = db.batch();

  try {
    const today = new Date().toISOString().split('T')[0];
    const counterRef = db.doc(`counters/purchaseOrders_${today}`);
    const newCount = await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentCount = counterDoc.exists ? counterDoc.data()?.count || 0 : 0;
      transaction.set(counterRef, { count: currentCount + suppliers.length }, { merge: true });
      return currentCount;
    });

    const dateStr = today.replace(/-/g, "");

    for (let i = 0; i < suppliers.length; i++) {
      const supplier = suppliers[i];
      const sequence = String(newCount + i + 1).padStart(3, '0');
      const poCode = `PO-${dateStr}-${sequence}`;
      const poRef = db.collection("purchaseOrders").doc();
      const itemsForPO = supplier.items.map((item: PurchaseItemPayload) => ({
        itemRef: db.doc(`${item.unit ? 'materials' : 'fragrances'}/${item.id}`),
        name: item.name,
        code: item.code,
        quantity: Number(item.quantity),
        unit: item.unit || '',
        costPerUnit: Number(item.price) || 0,
      }));
      writeBatch.set(poRef, {
        code: poCode,
        supplierRef: db.doc(`suppliers/${supplier.supplierId}`),
        status: "預報單",
        items: itemsForPO,
        createdAt: FieldValue.serverTimestamp(),
        createdByRef,
      });
    }
    await writeBatch.commit();
    logger.info(`使用者 ${contextAuth.uid} 成功建立了 ${suppliers.length} 張採購單。`);
    return { success: true, count: suppliers.length };
  } catch (error) {
    logger.error("建立採購單時發生嚴重錯誤:", error);
    throw new HttpsError("internal", "建立採購單時發生未知錯誤。");
  }
});

export const updatePurchaseOrderStatus = onCall(async (request) => {
  const { auth: contextAuth, data } = request;
  // await ensureIsAdmin(contextAuth?.uid);

  // --- ** 修正點：加入明確的類型檢查 ** ---
  if (!contextAuth) {
    throw new HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
  }

  const { purchaseOrderId, newStatus } = data;
  const validStatuses = ['已訂購', '已收貨', '已取消'];

  if (!purchaseOrderId || !newStatus || !validStatuses.includes(newStatus)) {
    throw new HttpsError("invalid-argument", "缺少或無效的參數。");
  }

  try {
    const poRef = db.doc(`purchaseOrders/${purchaseOrderId}`);
    await poRef.update({
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });
    logger.info(`管理員 ${contextAuth.uid} 將採購單 ${purchaseOrderId} 狀態更新為 ${newStatus}`);

    // 🎯 回傳標準化格式
    return createStandardResponse(true, {
      purchaseOrderId,
      newStatus,
      message: `採購單狀態已更新為 ${newStatus}`
    });
  } catch (error) {
    logger.error(`更新採購單 ${purchaseOrderId} 狀態時失敗:`, error);
    throw new HttpsError("internal", "更新狀態時發生錯誤。");
  }
});

export const receivePurchaseOrderItems = onCall(async (request) => {
  const { auth: contextAuth, data } = request;
  // await ensureIsAdmin(contextAuth?.uid);

  // --- ** 修正點：加入明確的類型檢查 ** ---
  if (!contextAuth) {
    throw new HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
  }

  const { purchaseOrderId, items } = data;
  if (!purchaseOrderId || !Array.isArray(items)) {
    throw new HttpsError("invalid-argument", "缺少或無效的參數。");
  }

  const receivedByRef = db.doc(`users/${contextAuth.uid}`);
  const poRef = db.doc(`purchaseOrders/${purchaseOrderId}`);

  // 🔧 修復：將 itemDetails 移到 transaction 外部以便在回應中使用
  const itemDetails: any[] = [];

  try {
    await db.runTransaction(async (transaction) => {
      const poDoc = await transaction.get(poRef);
      if (!poDoc.exists) {
        throw new HttpsError("not-found", "找不到指定的採購單。");
      }
      if (poDoc.data()?.status !== '已訂購') {
        throw new HttpsError("failed-precondition", `採購單狀態為 "${poDoc.data()?.status}"，無法執行入庫。`);
      }

      transaction.update(poRef, {
        status: "已收貨",
        receivedAt: FieldValue.serverTimestamp(),
        receivedByRef,
      });
      
      for (const item of items) {
        if (!item.itemRefPath) continue;
        
        const itemRef = db.doc(item.itemRefPath);
        const receivedQuantity = Number(item.receivedQuantity);

        if (receivedQuantity > 0) {
          // 先獲取當前庫存，然後計算新庫存
          const itemDoc = await transaction.get(itemRef);
          const currentStock = itemDoc.data()?.currentStock || 0;
          const newStock = currentStock + receivedQuantity;

          transaction.update(itemRef, {
            currentStock: newStock,
            lastStockUpdate: FieldValue.serverTimestamp(),
          });

          // 收集項目明細
          itemDetails.push({
            itemId: itemRef.id,
            itemType: item.itemRefPath.includes('materials') ? 'material' : 'fragrance',
            itemCode: item.code || '',
            itemName: item.name || '',
            quantityChange: receivedQuantity,
            quantityAfter: newStock
          });

          const movementRef = db.collection("inventoryMovements").doc();
          transaction.set(movementRef, {
            itemRef: itemRef,
            itemType: item.itemRefPath.includes('materials') ? 'material' : 'fragrance',
            changeQuantity: receivedQuantity,
            type: "purchase_inbound",
            relatedDocRef: poRef,
            createdAt: FieldValue.serverTimestamp(),
            createdByRef: receivedByRef,
          });
        }
      }

      // 建立統一的庫存紀錄（以動作為單位）
      if (itemDetails.length > 0) {
        const inventoryRecordRef = db.collection("inventory_records").doc();
        transaction.set(inventoryRecordRef, {
          changeDate: FieldValue.serverTimestamp(),
          changeReason: 'purchase',
          operatorId: contextAuth.uid,
          operatorName: contextAuth.token?.name || '未知用戶',
          remarks: `採購單 ${purchaseOrderId} 入庫`,
          relatedDocumentId: purchaseOrderId,
          relatedDocumentType: 'purchase_order',
          details: itemDetails,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    });

    logger.info(`管理員 ${contextAuth.uid} 成功完成採購單 ${purchaseOrderId} 的入庫操作。`);

    // 🎯 回傳標準化格式，包含詳細的入庫資訊
    return createStandardResponse(true, {
      purchaseOrderId,
      message: `採購單 ${purchaseOrderId} 收貨入庫成功`,
      receivedItemsCount: itemDetails.length,
      itemDetails: itemDetails.map(item => ({
        itemId: item.itemId,
        itemType: item.itemType,
        itemName: item.itemName,
        quantityReceived: item.quantityChange,
        newStock: item.quantityAfter
      }))
    });
  } catch (error) {
    logger.error(`採購單 ${purchaseOrderId} 入庫操作失敗:`, error);
    throw new HttpsError("internal", "入庫操作失敗");
  }
});
