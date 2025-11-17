"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receivePurchaseOrderItems = exports.updatePurchaseOrderStatus = exports.createPurchaseOrders = void 0;
// functions/src/api/purchaseOrders.ts
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const numberValidation_1 = require("../utils/numberValidation");
const db = (0, firestore_1.getFirestore)();
// 🎯 統一API回應格式輔助函數
function createStandardResponse(success, data, error) {
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
exports.createPurchaseOrders = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    if (!(contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid)) {
        throw new https_1.HttpsError("unauthenticated", "需要身分驗證才能建立採購單。");
    }
    const { suppliers } = data;
    if (!suppliers || !Array.isArray(suppliers) || suppliers.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "缺少有效的供應商與項目資料。");
    }
    const createdByRef = db.doc(`users/${contextAuth.uid}`);
    const writeBatch = db.batch();
    try {
        const today = new Date().toISOString().split('T')[0];
        const counterRef = db.doc(`counters/purchaseOrders_${today}`);
        const newCount = await db.runTransaction(async (transaction) => {
            var _a;
            const counterDoc = await transaction.get(counterRef);
            const currentCount = counterDoc.exists ? ((_a = counterDoc.data()) === null || _a === void 0 ? void 0 : _a.count) || 0 : 0;
            transaction.set(counterRef, { count: currentCount + suppliers.length }, { merge: true });
            return currentCount;
        });
        const dateStr = today.replace(/-/g, "");
        for (let i = 0; i < suppliers.length; i++) {
            const supplier = suppliers[i];
            const sequence = String(newCount + i + 1).padStart(3, '0');
            const poCode = `PO-${dateStr}-${sequence}`;
            const poRef = db.collection("purchaseOrders").doc();
            const itemsForPO = supplier.items.map((item) => {
                // 🔧 修復：正確判斷香精/原料
                // 香精：無 unit 或 unit 為 KG/kg
                // 原料：有特定單位（L、ML、G、PC 等）
                const isFragrance = !item.unit || (item.unit && item.unit.toUpperCase() === 'KG');
                const collection = isFragrance ? 'fragrances' : 'materials';
                const baseItem = {
                    itemRef: db.doc(`${collection}/${item.id}`),
                    type: isFragrance ? 'fragrance' : 'material',
                    name: item.name,
                    code: item.code,
                    quantity: Number(item.quantity),
                    unit: item.unit || '',
                    costPerUnit: Number(item.price) || 0,
                };
                // 如果有可做產品公斤數資料（香精），一併儲存
                if (item.productCapacityKg !== undefined) {
                    return Object.assign(Object.assign({}, baseItem), { productCapacityKg: Number(item.productCapacityKg), fragrancePercentage: Number(item.fragrancePercentage) || 0 });
                }
                return baseItem;
            });
            writeBatch.set(poRef, {
                code: poCode,
                supplierRef: db.doc(`suppliers/${supplier.supplierId}`),
                status: "預報單",
                items: itemsForPO,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                createdByRef,
            });
        }
        await writeBatch.commit();
        firebase_functions_1.logger.info(`使用者 ${contextAuth.uid} 成功建立了 ${suppliers.length} 張採購單。`);
        return { success: true, count: suppliers.length };
    }
    catch (error) {
        firebase_functions_1.logger.error("建立採購單時發生嚴重錯誤:", error);
        throw new https_1.HttpsError("internal", "建立採購單時發生未知錯誤。");
    }
});
exports.updatePurchaseOrderStatus = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    // --- ** 修正點：加入明確的類型檢查 ** ---
    if (!contextAuth) {
        throw new https_1.HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
    }
    const { purchaseOrderId, newStatus } = data;
    const validStatuses = ['已訂購', '已收貨', '已取消'];
    if (!purchaseOrderId || !newStatus || !validStatuses.includes(newStatus)) {
        throw new https_1.HttpsError("invalid-argument", "缺少或無效的參數。");
    }
    try {
        const poRef = db.doc(`purchaseOrders/${purchaseOrderId}`);
        await poRef.update({
            status: newStatus,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        firebase_functions_1.logger.info(`管理員 ${contextAuth.uid} 將採購單 ${purchaseOrderId} 狀態更新為 ${newStatus}`);
        // 🎯 回傳標準化格式
        return createStandardResponse(true, {
            purchaseOrderId,
            newStatus,
            message: `採購單狀態已更新為 ${newStatus}`
        });
    }
    catch (error) {
        firebase_functions_1.logger.error(`更新採購單 ${purchaseOrderId} 狀態時失敗:`, error);
        throw new https_1.HttpsError("internal", "更新狀態時發生錯誤。");
    }
});
exports.receivePurchaseOrderItems = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    if (!contextAuth) {
        throw new https_1.HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
    }
    const { purchaseOrderId, items } = data;
    // 🔍 調試：記錄收到的資料
    firebase_functions_1.logger.info(`收到收貨請求:`, {
        purchaseOrderId,
        itemsCount: Array.isArray(items) ? items.length : 'not-array',
        items: items ? items.map(item => ({
            itemRefPath: item.itemRefPath,
            code: item.code,
            name: item.name,
            receivedQuantity: item.receivedQuantity
        })) : 'no-items'
    });
    if (!purchaseOrderId || !Array.isArray(items)) {
        throw new https_1.HttpsError("invalid-argument", "缺少或無效的參數。");
    }
    const receivedByRef = db.doc(`users/${contextAuth.uid}`);
    const poRef = db.doc(`purchaseOrders/${purchaseOrderId}`);
    // 🔧 修復：將 itemDetails 移到 transaction 外部以便在回應中使用
    const itemDetails = [];
    try {
        // 🎯 準備庫存更新項目
        const validItems = items.filter(item => item.itemRefPath && Number(item.receivedQuantity) > 0);
        // 🔍 調試：記錄有效項目
        firebase_functions_1.logger.info(`有效項目篩選結果:`, {
            totalItems: items.length,
            validItems: validItems.length,
            invalidItems: items.filter(item => !item.itemRefPath || Number(item.receivedQuantity) <= 0).map(item => ({
                itemRefPath: item.itemRefPath,
                receivedQuantity: item.receivedQuantity,
                reason: !item.itemRefPath ? 'missing-itemRefPath' : 'invalid-quantity'
            }))
        });
        if (validItems.length === 0) {
            throw new https_1.HttpsError("invalid-argument", "沒有有效的入庫項目。");
        }
        // 在事務外先查找所有物料的ID
        const itemRefsMap = new Map();
        for (const item of validItems) {
            firebase_functions_1.logger.info(`預處理項目：${item.code} - itemRefPath: ${item.itemRefPath}`);
            // 🔧 修復：強制要求有效的 itemRefPath
            if (!item.itemRefPath || !item.itemRefPath.includes('/')) {
                throw new https_1.HttpsError("invalid-argument", `項目 "${item.name || item.code}" 缺少有效的物料參考路徑。請確認採購單項目包含正確的 itemRef。`);
            }
            // 根據 itemRefPath 確定物料類型
            const itemType = item.itemRefPath.includes('materials') ? 'material' : 'fragrance';
            const collection = itemType === 'material' ? 'materials' : 'fragrances';
            // 從 itemRefPath 中提取 ID
            const pathParts = item.itemRefPath.split('/');
            const itemId = pathParts[pathParts.length - 1];
            if (!itemId) {
                throw new https_1.HttpsError("invalid-argument", `無法從路徑 "${item.itemRefPath}" 提取有效的項目 ID`);
            }
            // 驗證這個 ID 是否存在
            const testDoc = await db.doc(`${collection}/${itemId}`).get();
            if (!testDoc.exists) {
                // 🔧 優先使用代號查找作為備用方案
                firebase_functions_1.logger.warn(`路徑 ID ${itemId} 不存在，嘗試使用代號 ${item.code} 查找...`);
                const querySnapshot = await db.collection(collection)
                    .where('code', '==', item.code)
                    .limit(1)
                    .get();
                if (!querySnapshot.empty) {
                    const foundId = querySnapshot.docs[0].id;
                    firebase_functions_1.logger.info(`✅ 使用代號找到: ${collection}/${foundId}`);
                    itemRefsMap.set(item.code, {
                        itemId: foundId,
                        collection,
                        itemType,
                        receivedQuantity: Number(item.receivedQuantity)
                    });
                }
                else {
                    throw new https_1.HttpsError("not-found", `找不到項目：代號 "${item.code}"，路徑 "${item.itemRefPath}"`);
                }
            }
            else {
                firebase_functions_1.logger.info(`✅ 使用路徑 ID: ${collection}/${itemId}`);
                itemRefsMap.set(item.code, {
                    itemId,
                    collection,
                    itemType,
                    receivedQuantity: Number(item.receivedQuantity)
                });
            }
        }
        // 🔧 修復：使用單一事務處理所有操作，嚴格遵循 Firestore 事務規則（先讀後寫）
        await db.runTransaction(async (transaction) => {
            // ===== 第一階段：所有讀取操作 =====
            var _a, _b, _c, _d;
            // 1. 檢查採購單狀態
            const poDoc = await transaction.get(poRef);
            if (!poDoc.exists) {
                throw new https_1.HttpsError("not-found", "找不到指定的採購單。");
            }
            if (((_a = poDoc.data()) === null || _a === void 0 ? void 0 : _a.status) !== '已訂購') {
                throw new https_1.HttpsError("failed-precondition", `採購單狀態為 "${(_b = poDoc.data()) === null || _b === void 0 ? void 0 : _b.status}"，無法執行入庫。`);
            }
            // 2. 讀取所有項目資料（必須在任何寫入操作之前完成）
            const itemDataMap = new Map();
            const failedUpdates = [];
            for (const item of validItems) {
                const refInfo = itemRefsMap.get(item.code);
                if (!refInfo || !refInfo.itemId) {
                    failedUpdates.push({
                        itemRefPath: item.itemRefPath,
                        code: item.code,
                        error: 'Item not found',
                        details: { reason: `找不到代號為 ${item.code} 的物料或香精` }
                    });
                    continue;
                }
                const { itemId, collection, itemType, receivedQuantity } = refInfo;
                const itemRef = db.doc(`${collection}/${itemId}`);
                const itemDoc = await transaction.get(itemRef);
                if (!itemDoc.exists) {
                    failedUpdates.push({
                        itemRefPath: item.itemRefPath,
                        code: item.code,
                        error: 'Item not found in transaction',
                        details: { reason: `事務中找不到 ${collection}/${itemId}` }
                    });
                    continue;
                }
                itemDataMap.set(`${collection}/${itemId}`, {
                    itemRef,
                    itemDoc,
                    itemId,
                    itemType,
                    item,
                    currentStock: ((_c = itemDoc.data()) === null || _c === void 0 ? void 0 : _c.currentStock) || 0,
                    receivedQuantity
                });
            }
            // 如果有失敗項目，直接拋出錯誤（在寫入之前）
            if (failedUpdates.length > 0) {
                throw new https_1.HttpsError("internal", `部分項目處理失敗：${failedUpdates.map(f => f.itemRefPath).join(', ')}`);
            }
            // ===== 第二階段：所有寫入操作 =====
            // 3. 更新採購單狀態
            transaction.update(poRef, {
                status: "已收貨",
                receivedAt: firestore_1.FieldValue.serverTimestamp(),
                receivedByRef,
            });
            // 4. 處理每個項目的庫存更新
            const inventoryRecordDetails = [];
            for (const [itemRefPath, itemData] of itemDataMap) {
                const { itemRef, itemDoc, itemId, itemType, item, currentStock, receivedQuantity } = itemData;
                // 🔧 修復：使用 limitToThreeDecimals 確保數字精度
                const validatedReceivedQuantity = (0, numberValidation_1.limitToThreeDecimals)(receivedQuantity);
                const validatedCurrentStock = (0, numberValidation_1.limitToThreeDecimals)(currentStock);
                const newStock = (0, numberValidation_1.limitToThreeDecimals)(validatedCurrentStock + validatedReceivedQuantity);
                // 更新庫存
                transaction.update(itemRef, {
                    currentStock: newStock,
                    lastStockUpdate: firestore_1.FieldValue.serverTimestamp(),
                });
                // 收集庫存記錄明細
                inventoryRecordDetails.push({
                    itemId: itemId,
                    itemType: itemType,
                    itemCode: item.code || '',
                    itemName: item.name || '',
                    quantityBefore: validatedCurrentStock,
                    quantityChange: validatedReceivedQuantity,
                    quantityAfter: newStock,
                    changeReason: `採購單 ${purchaseOrderId} 收貨入庫`
                });
                // 收集項目明細供回應使用
                itemDetails.push({
                    itemId: itemId,
                    itemType: itemType,
                    itemCode: item.code || '',
                    itemName: item.name || '',
                    quantityChange: validatedReceivedQuantity,
                    quantityAfter: newStock
                });
                // 建立庫存異動記錄
                const movementRef = db.collection("inventoryMovements").doc();
                transaction.set(movementRef, {
                    itemRef: itemRef,
                    itemType: itemType,
                    changeQuantity: validatedReceivedQuantity,
                    type: "purchase_inbound",
                    relatedDocRef: poRef,
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                    createdByRef: receivedByRef,
                });
            }
            // 5. 建立統一的庫存紀錄
            if (inventoryRecordDetails.length > 0) {
                const inventoryRecordRef = db.collection("inventory_records").doc();
                transaction.set(inventoryRecordRef, {
                    changeDate: firestore_1.FieldValue.serverTimestamp(),
                    changeReason: 'purchase',
                    operatorId: contextAuth.uid,
                    operatorName: ((_d = contextAuth.token) === null || _d === void 0 ? void 0 : _d.name) || '未知用戶',
                    remarks: `採購單 ${purchaseOrderId} 入庫`,
                    relatedDocumentId: purchaseOrderId,
                    relatedDocumentType: 'purchase_order',
                    details: inventoryRecordDetails,
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                });
            }
        });
        firebase_functions_1.logger.info(`採購單 ${purchaseOrderId} 收貨入庫完成，處理項目數: ${itemDetails.length}`);
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
    }
    catch (error) {
        firebase_functions_1.logger.error(`採購單 ${purchaseOrderId} 入庫操作失敗:`, {
            error: error,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : 'no-stack',
            purchaseOrderId,
            itemsCount: items.length
        });
        // 提供更詳細的錯誤訊息
        const errorMessage = error instanceof Error ?
            `入庫操作失敗: ${error.message}` :
            "入庫操作失敗，請檢查日誌";
        throw new https_1.HttpsError("internal", errorMessage);
    }
});
//# sourceMappingURL=purchaseOrders.js.map