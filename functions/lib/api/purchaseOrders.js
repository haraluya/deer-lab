"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receivePurchaseOrderItems = exports.updatePurchaseOrderStatus = exports.createPurchaseOrders = void 0;
// functions/src/api/purchaseOrders.ts
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
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
            const itemsForPO = supplier.items.map((item) => ({
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
    var _a, _b;
    // 🔍 調試：記錄函數開始執行
    firebase_functions_1.logger.info("=== receivePurchaseOrderItems 函數開始執行 ===");
    const { auth: contextAuth, data } = request;
    // 🔍 調試：記錄接收到的參數
    firebase_functions_1.logger.info("接收到的參數:", {
        hasAuth: !!contextAuth,
        authUid: contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid,
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        data: JSON.stringify(data)
    });
    // await ensureIsAdmin(contextAuth?.uid);
    // --- ** 修正點：加入明確的類型檢查 ** ---
    if (!contextAuth) {
        throw new https_1.HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
    }
    const { purchaseOrderId, items } = data;
    // 🔍 調試：記錄解構後的參數
    firebase_functions_1.logger.info("解構後的參數:", {
        purchaseOrderId,
        itemsType: Array.isArray(items),
        itemsLength: items === null || items === void 0 ? void 0 : items.length,
        items: JSON.stringify(items)
    });
    if (!purchaseOrderId || !Array.isArray(items)) {
        firebase_functions_1.logger.error("參數驗證失敗:", { purchaseOrderId, itemsIsArray: Array.isArray(items) });
        throw new https_1.HttpsError("invalid-argument", "缺少或無效的參數。");
    }
    const receivedByRef = db.doc(`users/${contextAuth.uid}`);
    const poRef = db.doc(`purchaseOrders/${purchaseOrderId}`);
    // 🔧 修復：將 itemDetails 移到 transaction 外部以便在回應中使用
    const itemDetails = [];
    try {
        // 🎯 準備統一API的庫存更新請求
        const unifiedUpdates = items
            .filter(item => item.itemRefPath && Number(item.receivedQuantity) > 0)
            .map(item => ({
            itemId: db.doc(item.itemRefPath).id,
            itemType: item.itemRefPath.includes('materials') ? 'material' : 'fragrance',
            operation: 'add',
            quantity: Number(item.receivedQuantity),
            reason: `採購單 ${purchaseOrderId} 收貨入庫`
        }));
        if (unifiedUpdates.length === 0) {
            throw new https_1.HttpsError("invalid-argument", "沒有有效的入庫項目。");
        }
        const unifiedRequest = {
            source: {
                type: 'purchase_receive',
                operatorId: contextAuth.uid,
                operatorName: ((_a = contextAuth.token) === null || _a === void 0 ? void 0 : _a.name) || '未知用戶',
                remarks: `採購單 ${purchaseOrderId} 入庫`,
                relatedDocumentId: purchaseOrderId,
                relatedDocumentType: 'purchase_order',
            },
            updates: unifiedUpdates,
            options: {
                allowNegativeStock: false,
                skipStockValidation: false,
                batchMode: true
            }
        };
        firebase_functions_1.logger.info("開始執行統一庫存更新");
        // 🎯 使用統一API進行庫存更新，並更新採購單狀態
        await db.runTransaction(async (transaction) => {
            var _a, _b, _c, _d, _e, _f, _g;
            // 1. 檢查採購單狀態
            const poDoc = await transaction.get(poRef);
            if (!poDoc.exists) {
                throw new https_1.HttpsError("not-found", "找不到指定的採購單。");
            }
            if (((_a = poDoc.data()) === null || _a === void 0 ? void 0 : _a.status) !== '已訂購') {
                throw new https_1.HttpsError("failed-precondition", `採購單狀態為 "${(_b = poDoc.data()) === null || _b === void 0 ? void 0 : _b.status}"，無法執行入庫。`);
            }
            // 2. 更新採購單狀態
            transaction.update(poRef, {
                status: "已收貨",
                receivedAt: firestore_1.FieldValue.serverTimestamp(),
                receivedByRef,
            });
            // 3. 執行統一庫存更新（在同一事務內）
            const inventoryRecordDetails = [];
            const failedUpdates = [];
            for (const update of unifiedUpdates) {
                try {
                    const itemRef = db.doc(`${update.itemType === 'material' ? 'materials' : 'fragrances'}/${update.itemId}`);
                    const itemDoc = await transaction.get(itemRef);
                    if (!itemDoc.exists) {
                        failedUpdates.push({
                            itemId: update.itemId,
                            error: 'Item not found',
                            details: { reason: '找不到指定項目' }
                        });
                        continue;
                    }
                    const currentStock = ((_c = itemDoc.data()) === null || _c === void 0 ? void 0 : _c.currentStock) || 0;
                    const newStock = currentStock + update.quantity;
                    // 更新庫存
                    transaction.update(itemRef, {
                        currentStock: newStock,
                        lastStockUpdate: firestore_1.FieldValue.serverTimestamp(),
                    });
                    // 收集庫存記錄明細
                    inventoryRecordDetails.push({
                        itemId: update.itemId,
                        itemType: update.itemType,
                        itemCode: ((_d = items.find(item => db.doc(item.itemRefPath).id === update.itemId)) === null || _d === void 0 ? void 0 : _d.code) || '',
                        itemName: ((_e = items.find(item => db.doc(item.itemRefPath).id === update.itemId)) === null || _e === void 0 ? void 0 : _e.name) || '',
                        quantityBefore: currentStock,
                        quantityChange: update.quantity,
                        quantityAfter: newStock,
                        changeReason: update.reason || `採購單 ${purchaseOrderId} 收貨入庫`
                    });
                    // 收集項目明細供回應使用
                    itemDetails.push({
                        itemId: update.itemId,
                        itemType: update.itemType,
                        itemCode: ((_f = items.find(item => db.doc(item.itemRefPath).id === update.itemId)) === null || _f === void 0 ? void 0 : _f.code) || '',
                        itemName: ((_g = items.find(item => db.doc(item.itemRefPath).id === update.itemId)) === null || _g === void 0 ? void 0 : _g.name) || '',
                        quantityChange: update.quantity,
                        quantityAfter: newStock
                    });
                    // 建立庫存異動記錄
                    const movementRef = db.collection("inventoryMovements").doc();
                    transaction.set(movementRef, {
                        itemRef: itemRef,
                        itemType: update.itemType,
                        changeQuantity: update.quantity,
                        type: "purchase_inbound",
                        relatedDocRef: poRef,
                        createdAt: firestore_1.FieldValue.serverTimestamp(),
                        createdByRef: receivedByRef,
                    });
                }
                catch (error) {
                    firebase_functions_1.logger.error(`處理項目 ${update.itemId} 時發生錯誤:`, error);
                    failedUpdates.push({
                        itemId: update.itemId,
                        error: error instanceof Error ? error.message : String(error),
                        details: { originalUpdate: update }
                    });
                }
            }
            // 4. 建立統一的庫存紀錄
            if (inventoryRecordDetails.length > 0) {
                const inventoryRecordRef = db.collection("inventory_records").doc();
                transaction.set(inventoryRecordRef, {
                    changeDate: firestore_1.FieldValue.serverTimestamp(),
                    changeReason: 'purchase',
                    operatorId: unifiedRequest.source.operatorId,
                    operatorName: unifiedRequest.source.operatorName,
                    remarks: unifiedRequest.source.remarks,
                    relatedDocumentId: unifiedRequest.source.relatedDocumentId,
                    relatedDocumentType: unifiedRequest.source.relatedDocumentType,
                    details: inventoryRecordDetails,
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                });
            }
            // 如果有失敗項目，拋出錯誤
            if (failedUpdates.length > 0) {
                throw new https_1.HttpsError("internal", `部分項目處理失敗：${failedUpdates.map(f => f.itemId).join(', ')}`);
            }
        });
        firebase_functions_1.logger.info("事務處理完成");
        firebase_functions_1.logger.info(`管理員 ${contextAuth.uid} 成功完成採購單 ${purchaseOrderId} 的入庫操作。`);
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
        firebase_functions_1.logger.error("=== receivePurchaseOrderItems 函數執行失敗 ===");
        firebase_functions_1.logger.error(`採購單 ${purchaseOrderId} 入庫操作失敗:`, error);
        firebase_functions_1.logger.error("錯誤詳細信息:", {
            errorType: (_b = error === null || error === void 0 ? void 0 : error.constructor) === null || _b === void 0 ? void 0 : _b.name,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined
        });
        throw new https_1.HttpsError("internal", "入庫操作失敗");
    }
});
//# sourceMappingURL=purchaseOrders.js.map