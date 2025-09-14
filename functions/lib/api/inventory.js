"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performStocktake = exports.getLowStockItems = exports.quickUpdateInventory = exports.getInventoryOverview = exports.adjustInventory = void 0;
// functions/src/api/inventory.ts
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
/**
 * Updates the stock for multiple items based on a stocktake and creates inventory movement logs.
 * This function uses a Firestore transaction to ensure atomicity.
 */
/**
 * 手動調整單項庫存
 */
exports.adjustInventory = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    if (!contextAuth) {
        throw new https_1.HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
    }
    const { itemId, itemType, quantityChange, remarks } = data;
    if (!itemId || !itemType || typeof quantityChange !== 'number') {
        throw new https_1.HttpsError("invalid-argument", "缺少必要的調整參數。");
    }
    if (!['material', 'fragrance'].includes(itemType)) {
        throw new https_1.HttpsError("invalid-argument", "不支援的項目類型。");
    }
    try {
        await db.runTransaction(async (transaction) => {
            var _a;
            // 獲取項目資料
            const collectionName = itemType === 'material' ? 'materials' : 'fragrances';
            const itemRef = db.doc(`${collectionName}/${itemId}`);
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists) {
                throw new https_1.HttpsError("not-found", "項目不存在。");
            }
            const itemData = itemDoc.data();
            const currentStock = itemData.currentStock || 0;
            const newStock = currentStock + quantityChange;
            if (newStock < 0) {
                throw new https_1.HttpsError("invalid-argument", "調整後庫存不能為負數。");
            }
            // 更新庫存
            transaction.update(itemRef, {
                currentStock: newStock,
                lastStockUpdate: firestore_1.FieldValue.serverTimestamp(),
            });
            // 建立庫存紀錄
            const inventoryRecordRef = db.collection("inventory_records").doc();
            transaction.set(inventoryRecordRef, {
                changeDate: firestore_1.FieldValue.serverTimestamp(),
                changeReason: 'manual_adjustment',
                operatorId: contextAuth.uid,
                operatorName: ((_a = contextAuth.token) === null || _a === void 0 ? void 0 : _a.name) || '未知用戶',
                remarks: remarks || '直接修改庫存',
                relatedDocumentId: itemId,
                relatedDocumentType: 'manual_adjustment',
                details: [{
                        itemId: itemId,
                        itemType: itemType,
                        itemCode: itemData.code || '',
                        itemName: itemData.name || '',
                        quantityChange: quantityChange,
                        quantityAfter: newStock
                    }],
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
        });
        firebase_functions_1.logger.info(`管理員 ${contextAuth.uid} 成功調整了 ${itemType} ${itemId} 的庫存，變更量: ${quantityChange}`);
        return { success: true };
    }
    catch (error) {
        firebase_functions_1.logger.error(`調整庫存時發生錯誤:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "調整庫存時發生未知錯誤。");
    }
});
/**
 * 獲取庫存總覽數據
 */
exports.getInventoryOverview = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth } = request;
    if (!contextAuth) {
        throw new https_1.HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
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
    }
    catch (error) {
        firebase_functions_1.logger.error("獲取庫存總覽失敗:", error);
        throw new https_1.HttpsError("internal", "獲取庫存總覽失敗");
    }
});
/**
 * 快速更新庫存 - 支援批量操作
 */
exports.quickUpdateInventory = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    if (!contextAuth) {
        throw new https_1.HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
    }
    // 詳細除錯資訊
    firebase_functions_1.logger.info("🔧 quickUpdateInventory 收到的請求資料:", {
        data: data,
        dataType: typeof data,
        hasUpdates: !!(data === null || data === void 0 ? void 0 : data.updates),
        updatesType: typeof (data === null || data === void 0 ? void 0 : data.updates),
        updatesLength: Array.isArray(data === null || data === void 0 ? void 0 : data.updates) ? data.updates.length : 'not array'
    });
    const { updates } = data;
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
        firebase_functions_1.logger.error("❌ 更新項目陣列驗證失敗:", {
            updates: updates,
            updatesType: typeof updates,
            isArray: Array.isArray(updates),
            length: updates === null || updates === void 0 ? void 0 : updates.length
        });
        throw new https_1.HttpsError("invalid-argument", "缺少更新項目陣列。");
    }
    const successful = [];
    const failed = [];
    const inventoryRecordDetails = [];
    try {
        await db.runTransaction(async (transaction) => {
            var _a, _b;
            // 處理每個更新項目
            for (const update of updates) {
                try {
                    const { type, itemId, newStock, reason } = update;
                    // 詳細除錯每個更新項目
                    firebase_functions_1.logger.info("🔧 正在處理單個更新項目:", {
                        update: update,
                        type: type,
                        itemId: itemId,
                        newStock: newStock,
                        newStockType: typeof newStock,
                        reason: reason
                    });
                    // 驗證單一更新項目參數
                    if (!itemId || !type || typeof newStock !== 'number' || newStock < 0) {
                        const error = "缺少必要的更新參數或參數格式錯誤";
                        firebase_functions_1.logger.error("❌ 單個更新項目驗證失敗:", {
                            update: update,
                            itemId: itemId,
                            type: type,
                            newStock: newStock,
                            newStockType: typeof newStock,
                            itemIdCheck: !!itemId,
                            typeCheck: !!type,
                            newStockTypeCheck: typeof newStock === 'number',
                            newStockValueCheck: newStock >= 0,
                            error: error
                        });
                        failed.push({
                            item: update,
                            error: error
                        });
                        continue;
                    }
                    if (!['material', 'fragrance'].includes(type)) {
                        failed.push({
                            item: update,
                            error: "不支援的項目類型"
                        });
                        continue;
                    }
                    // 獲取項目資料
                    const collectionName = type === 'material' ? 'materials' : 'fragrances';
                    const itemRef = db.doc(`${collectionName}/${itemId}`);
                    const itemDoc = await transaction.get(itemRef);
                    if (!itemDoc.exists) {
                        failed.push({
                            item: update,
                            error: "項目不存在"
                        });
                        continue;
                    }
                    const itemData = itemDoc.data();
                    const oldStock = itemData.currentStock || 0;
                    const quantityChange = newStock - oldStock;
                    // 如果庫存沒有變化，跳過更新
                    if (quantityChange === 0) {
                        successful.push(Object.assign(Object.assign({}, update), { result: 'skipped', message: '庫存數量無變化' }));
                        continue;
                    }
                    // 更新庫存
                    transaction.update(itemRef, {
                        currentStock: newStock,
                        lastStockUpdate: firestore_1.FieldValue.serverTimestamp(),
                    });
                    // 收集庫存記錄明細
                    inventoryRecordDetails.push({
                        itemId: itemId,
                        itemType: type,
                        itemCode: itemData.code || '',
                        itemName: itemData.name || '',
                        quantityChange: quantityChange,
                        quantityAfter: newStock
                    });
                    successful.push(Object.assign(Object.assign({}, update), { result: 'updated', message: `成功更新庫存：${oldStock} → ${newStock}`, oldStock,
                        newStock,
                        quantityChange }));
                }
                catch (error) {
                    firebase_functions_1.logger.error(`處理單一更新項目時發生錯誤:`, error);
                    failed.push({
                        item: update,
                        error: error instanceof Error ? error.message : "未知錯誤"
                    });
                }
            }
            // 建立統一的庫存紀錄（僅當有實際更新時）
            if (inventoryRecordDetails.length > 0) {
                const inventoryRecordRef = db.collection("inventory_records").doc();
                const isStocktake = updates.some(u => u.reason && u.reason.includes('盤點'));
                transaction.set(inventoryRecordRef, {
                    changeDate: firestore_1.FieldValue.serverTimestamp(),
                    changeReason: isStocktake ? 'inventory_check' : 'manual_adjustment',
                    operatorId: contextAuth.uid,
                    operatorName: ((_a = contextAuth.token) === null || _a === void 0 ? void 0 : _a.name) || '未知用戶',
                    remarks: ((_b = updates[0]) === null || _b === void 0 ? void 0 : _b.reason) || (isStocktake ? '庫存盤點調整' : '快速更新庫存'),
                    relatedDocumentId: null,
                    relatedDocumentType: isStocktake ? 'stocktake' : 'quick_update',
                    details: inventoryRecordDetails,
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                });
            }
        });
        const summary = {
            total: updates.length,
            successful: successful.length,
            failed: failed.length,
            skipped: successful.filter(s => s.result === 'skipped').length
        };
        firebase_functions_1.logger.info(`使用者 ${contextAuth.uid} 批量更新庫存：成功 ${summary.successful}，失敗 ${summary.failed}，跳過 ${summary.skipped}`);
        // 回傳符合 BatchOperationResult 格式的回應
        return {
            successful,
            failed,
            summary
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`批量更新庫存時發生錯誤:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "批量更新庫存時發生未知錯誤。");
    }
});
/**
 * 獲取低庫存項目
 */
exports.getLowStockItems = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth } = request;
    if (!contextAuth) {
        throw new https_1.HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
    }
    try {
        // 並行獲取物料和香精數據
        const [materialsSnapshot, fragrancesSnapshot] = await Promise.all([
            db.collection("materials").get(),
            db.collection("fragrances").get()
        ]);
        const lowStockItems = [];
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
    }
    catch (error) {
        firebase_functions_1.logger.error("獲取低庫存項目失敗:", error);
        throw new https_1.HttpsError("internal", "獲取低庫存項目失敗");
    }
});
exports.performStocktake = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    if (!contextAuth) {
        throw new https_1.HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
    }
    const { items } = data;
    if (!Array.isArray(items) || items.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "缺少有效的盤點項目資料。");
    }
    const stocktakerRef = db.doc(`users/${contextAuth.uid}`);
    try {
        await db.runTransaction(async (transaction) => {
            var _a;
            // 收集所有盤點項目的明細
            const itemDetails = [];
            // 處理每個盤點項目
            for (const item of items) {
                // Basic validation for each item in the array
                if (!item.itemRefPath || typeof item.newStock !== 'number' || item.newStock < 0) {
                    // We throw an error here which will cause the transaction to fail.
                    throw new https_1.HttpsError("invalid-argument", `項目 ${item.itemRefPath || '未知'} 的資料無效。`);
                }
                const itemRef = db.doc(item.itemRefPath);
                const changeQuantity = item.newStock - item.currentStock;
                // Only process if there is an actual change in stock
                if (changeQuantity !== 0) {
                    // Get item details for the inventory record
                    const itemDoc = await transaction.get(itemRef);
                    if (!itemDoc.exists) {
                        firebase_functions_1.logger.error(`盤點項目不存在: ${item.itemRefPath}`);
                        throw new https_1.HttpsError("not-found", `項目 ${item.itemRefPath} 不存在`);
                    }
                    const itemData = itemDoc.data();
                    // Update the item's stock level
                    transaction.update(itemRef, {
                        currentStock: item.newStock,
                        lastStockUpdate: firestore_1.FieldValue.serverTimestamp(),
                    });
                    // 收集項目明細
                    itemDetails.push({
                        itemId: itemRef.id,
                        itemType: item.itemRefPath.includes('materials') ? 'material' : 'fragrance',
                        itemCode: (itemData === null || itemData === void 0 ? void 0 : itemData.code) || '',
                        itemName: (itemData === null || itemData === void 0 ? void 0 : itemData.name) || '',
                        quantityChange: changeQuantity,
                        quantityAfter: item.newStock
                    });
                }
            }
            // 建立統一的庫存紀錄（以動作為單位）
            if (itemDetails.length > 0) {
                const inventoryRecordRef = db.collection("inventory_records").doc();
                transaction.set(inventoryRecordRef, {
                    changeDate: firestore_1.FieldValue.serverTimestamp(),
                    changeReason: 'inventory_check',
                    operatorId: contextAuth.uid,
                    operatorName: ((_a = contextAuth.token) === null || _a === void 0 ? void 0 : _a.name) || '未知用戶',
                    remarks: `盤點調整，共 ${itemDetails.length} 個項目`,
                    relatedDocumentId: null,
                    relatedDocumentType: 'stocktake',
                    details: itemDetails,
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                });
            }
        });
        firebase_functions_1.logger.info(`管理員 ${contextAuth.uid} 成功完成了 ${items.length} 個品項的盤點更新。`);
        return { success: true, count: items.length };
    }
    catch (error) {
        firebase_functions_1.logger.error(`處理盤點更新時發生嚴重錯誤:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "處理盤點更新時發生未知錯誤。");
    }
});
//# sourceMappingURL=inventory.js.map