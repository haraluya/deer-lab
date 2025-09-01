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
                changeReason: 'direct_modification',
                operatorId: contextAuth.uid,
                operatorName: ((_a = contextAuth.token) === null || _a === void 0 ? void 0 : _a.name) || '未知用戶',
                remarks: remarks || '直接修改庫存',
                relatedDocumentId: itemId,
                relatedDocumentType: 'direct_modification',
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
            overview: {
                totalMaterials,
                totalFragrances,
                totalMaterialCost: Math.round(totalMaterialCost),
                totalFragranceCost: Math.round(totalFragranceCost),
                lowStockMaterials,
                lowStockFragrances,
                totalLowStock: lowStockMaterials + lowStockFragrances
            }
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`獲取庫存總覽時發生錯誤:`, error);
        throw new https_1.HttpsError("internal", "獲取庫存總覽時發生未知錯誤。");
    }
});
/**
 * 快速更新庫存
 */
exports.quickUpdateInventory = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    if (!contextAuth) {
        throw new https_1.HttpsError("internal", "驗證檢查後 contextAuth 不應為空。");
    }
    const { itemId, itemType, newStock, remarks } = data;
    if (!itemId || !itemType || typeof newStock !== 'number' || newStock < 0) {
        throw new https_1.HttpsError("invalid-argument", "缺少必要的更新參數。");
    }
    if (!['material', 'fragrance'].includes(itemType)) {
        throw new https_1.HttpsError("invalid-argument", "不支援的項目類型。");
    }
    try {
        await db.runTransaction(async (transaction) => {
            var _a;
            const collectionName = itemType === 'material' ? 'materials' : 'fragrances';
            const itemRef = db.doc(`${collectionName}/${itemId}`);
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists) {
                throw new https_1.HttpsError("not-found", "項目不存在。");
            }
            const itemData = itemDoc.data();
            const oldStock = itemData.currentStock || 0;
            const quantityChange = newStock - oldStock;
            // 更新庫存
            transaction.update(itemRef, {
                currentStock: newStock,
                lastStockUpdate: firestore_1.FieldValue.serverTimestamp(),
            });
            // 建立庫存紀錄
            const inventoryRecordRef = db.collection("inventory_records").doc();
            transaction.set(inventoryRecordRef, {
                changeDate: firestore_1.FieldValue.serverTimestamp(),
                changeReason: 'direct_modification',
                operatorId: contextAuth.uid,
                operatorName: ((_a = contextAuth.token) === null || _a === void 0 ? void 0 : _a.name) || '未知用戶',
                remarks: remarks || '直接修改庫存',
                relatedDocumentId: itemId,
                relatedDocumentType: 'direct_modification',
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
        firebase_functions_1.logger.info(`使用者 ${contextAuth.uid} 快速更新了 ${itemType} ${itemId} 的庫存到 ${newStock}`);
        return { success: true };
    }
    catch (error) {
        firebase_functions_1.logger.error(`快速更新庫存時發生錯誤:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "快速更新庫存時發生未知錯誤。");
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
            success: true,
            items: lowStockItems
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`獲取低庫存項目時發生錯誤:`, error);
        throw new https_1.HttpsError("internal", "獲取低庫存項目時發生未知錯誤。");
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