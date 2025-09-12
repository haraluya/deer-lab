"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncGlobalCart = exports.addToGlobalCartByCode = exports.clearGlobalCart = exports.removeFromGlobalCart = exports.updateGlobalCartItem = exports.addToGlobalCart = exports.getGlobalCart = void 0;
// functions/src/api/globalCart.ts
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const apiWrapper_1 = require("../utils/apiWrapper");
const errorHandler_1 = require("../utils/errorHandler");
const firebase_functions_1 = require("firebase-functions");
const db = (0, firestore_1.getFirestore)();
// 獲取全域購物車
exports.getGlobalCart = (0, https_1.onCall)((0, apiWrapper_1.apiWrapper)({
    requireAuth: true,
    handler: async (request) => {
        const { auth: contextAuth } = request;
        try {
            // 獲取全域購物車文檔
            const cartDoc = await db.collection("globalCart").doc("main").get();
            if (!cartDoc.exists) {
                // 如果不存在，建立一個空的購物車
                await db.collection("globalCart").doc("main").set({
                    items: [],
                    lastUpdated: firestore_1.FieldValue.serverTimestamp(),
                    updatedBy: (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid) || 'system'
                });
                firebase_functions_1.logger.info(`為用戶 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 初始化空的全域購物車`);
                return {
                    items: [],
                    totalItems: 0,
                    message: "初始化空的購物車"
                };
            }
            const cartData = cartDoc.data();
            const items = (cartData === null || cartData === void 0 ? void 0 : cartData.items) || [];
            firebase_functions_1.logger.info(`獲取全域購物車成功，共 ${items.length} 個項目`);
            return {
                items: items,
                totalItems: items.length,
                lastUpdated: cartData === null || cartData === void 0 ? void 0 : cartData.lastUpdated,
                message: `獲取 ${items.length} 個購物車項目`
            };
        }
        catch (error) {
            errorHandler_1.ErrorHandler.handle(error, "獲取全域購物車", contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid);
        }
    }
}));
// 添加項目到購物車
exports.addToGlobalCart = (0, https_1.onCall)((0, apiWrapper_1.apiWrapper)({
    requireAuth: true,
    handler: async (request) => {
        var _a;
        const { auth: contextAuth, data } = request;
        const { item } = data;
        if (!item) {
            throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.MISSING_REQUIRED_FIELD, {
                missingFields: ['item'],
                message: "缺少購物車項目資料"
            });
        }
        try {
            const cartRef = db.collection("globalCart").doc("main");
            const cartDoc = await cartRef.get();
            // 準備新項目
            const newItem = Object.assign(Object.assign({}, item), { id: item.id || `${item.type}_${item.code}_${Date.now()}`, addedBy: (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid) || 'anonymous', addedAt: firestore_1.Timestamp.now(), updatedAt: firestore_1.Timestamp.now() });
            if (!cartDoc.exists) {
                // 建立新購物車
                await cartRef.set({
                    items: [newItem],
                    lastUpdated: firestore_1.FieldValue.serverTimestamp(),
                    updatedBy: (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid) || 'system'
                });
                firebase_functions_1.logger.info(`用戶 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 初始化購物車並添加項目: ${newItem.code}`);
            }
            else {
                // 更新現有購物車
                const currentItems = ((_a = cartDoc.data()) === null || _a === void 0 ? void 0 : _a.items) || [];
                // 檢查是否已存在相同項目
                const existingIndex = currentItems.findIndex((i) => i.type === newItem.type && i.code === newItem.code && i.supplierId === newItem.supplierId);
                if (existingIndex >= 0) {
                    // 更新數量
                    currentItems[existingIndex].quantity += newItem.quantity;
                    currentItems[existingIndex].updatedAt = firestore_1.Timestamp.now();
                    firebase_functions_1.logger.info(`更新購物車項目數量: ${newItem.code}, 新數量: ${currentItems[existingIndex].quantity}`);
                }
                else {
                    // 添加新項目
                    currentItems.push(newItem);
                    firebase_functions_1.logger.info(`添加新購物車項目: ${newItem.code}`);
                }
                await cartRef.update({
                    items: currentItems,
                    lastUpdated: firestore_1.FieldValue.serverTimestamp(),
                    updatedBy: (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid) || 'system'
                });
            }
            return {
                itemId: newItem.id,
                itemCode: newItem.code,
                message: "已加入購物車"
            };
        }
        catch (error) {
            errorHandler_1.ErrorHandler.handle(error, `添加項目到購物車 ${item === null || item === void 0 ? void 0 : item.code}`, contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid);
        }
    }
}));
// 更新購物車項目
exports.updateGlobalCartItem = (0, https_1.onCall)((0, apiWrapper_1.apiWrapper)({
    requireAuth: true,
    handler: async (request) => {
        var _a;
        const { auth: contextAuth, data } = request;
        const { itemId, updates } = data;
        if (!itemId || !updates) {
            throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.MISSING_REQUIRED_FIELD, {
                missingFields: ['itemId', 'updates'],
                message: "缺少項目 ID 或更新資料"
            });
        }
        try {
            const cartRef = db.collection("globalCart").doc("main");
            const cartDoc = await cartRef.get();
            if (!cartDoc.exists) {
                throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.RESOURCE_NOT_FOUND, {
                    message: "購物車不存在",
                    resourceType: "購物車",
                    resourceId: "main"
                });
            }
            const currentItems = ((_a = cartDoc.data()) === null || _a === void 0 ? void 0 : _a.items) || [];
            const itemIndex = currentItems.findIndex((i) => i.id === itemId);
            if (itemIndex === -1) {
                throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.RESOURCE_NOT_FOUND, {
                    message: "找不到指定的購物車項目",
                    resourceType: "購物車項目",
                    resourceId: itemId
                });
            }
            const originalItem = currentItems[itemIndex];
            // 更新項目
            currentItems[itemIndex] = Object.assign(Object.assign(Object.assign({}, originalItem), updates), { updatedAt: firestore_1.Timestamp.now() });
            await cartRef.update({
                items: currentItems,
                lastUpdated: firestore_1.FieldValue.serverTimestamp(),
                updatedBy: (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid) || 'system'
            });
            firebase_functions_1.logger.info(`用戶 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 更新購物車項目: ${itemId}`);
            return {
                itemId: itemId,
                updatedItem: currentItems[itemIndex],
                message: "購物車項目已更新"
            };
        }
        catch (error) {
            errorHandler_1.ErrorHandler.handle(error, `更新購物車項目 ${itemId}`, contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid);
        }
    }
}));
// 從購物車移除項目
exports.removeFromGlobalCart = (0, https_1.onCall)((0, apiWrapper_1.apiWrapper)({
    requireAuth: true,
    handler: async (request) => {
        var _a;
        const { auth: contextAuth, data } = request;
        const { itemId } = data;
        if (!itemId) {
            throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.MISSING_REQUIRED_FIELD, {
                missingFields: ['itemId']
            });
        }
        try {
            const cartRef = db.collection("globalCart").doc("main");
            const cartDoc = await cartRef.get();
            if (!cartDoc.exists) {
                throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.RESOURCE_NOT_FOUND, {
                    message: "購物車不存在",
                    resourceType: "購物車",
                    resourceId: "main"
                });
            }
            const currentItems = ((_a = cartDoc.data()) === null || _a === void 0 ? void 0 : _a.items) || [];
            const filteredItems = currentItems.filter((i) => i.id !== itemId);
            if (filteredItems.length === currentItems.length) {
                throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.RESOURCE_NOT_FOUND, {
                    message: "找不到指定的購物車項目",
                    resourceType: "購物車項目",
                    resourceId: itemId
                });
            }
            await cartRef.update({
                items: filteredItems,
                lastUpdated: firestore_1.FieldValue.serverTimestamp(),
                updatedBy: (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid) || 'system'
            });
            firebase_functions_1.logger.info(`用戶 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 從購物車移除項目: ${itemId}`);
            return {
                itemId: itemId,
                remainingItems: filteredItems.length,
                message: "已從購物車移除"
            };
        }
        catch (error) {
            errorHandler_1.ErrorHandler.handle(error, `從購物車移除項目 ${itemId}`, contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid);
        }
    }
}));
// 清空購物車
exports.clearGlobalCart = (0, https_1.onCall)((0, apiWrapper_1.apiWrapper)({
    requireAuth: true,
    handler: async (request) => {
        const { auth: contextAuth } = request;
        try {
            const cartRef = db.collection("globalCart").doc("main");
            await cartRef.set({
                items: [],
                lastUpdated: firestore_1.FieldValue.serverTimestamp(),
                updatedBy: (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid) || 'system'
            });
            firebase_functions_1.logger.info(`用戶 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 清空全域購物車`);
            return {
                message: "購物車已清空",
                clearedBy: contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid
            };
        }
        catch (error) {
            errorHandler_1.ErrorHandler.handle(error, "清空購物車", contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid);
        }
    }
}));
// 僅以代碼新增項目到購物車（會自動查詢完整資料）
exports.addToGlobalCartByCode = (0, https_1.onCall)((0, apiWrapper_1.apiWrapper)({
    requireAuth: true,
    handler: async (request) => {
        var _a, _b, _c, _d;
        const { auth: contextAuth, data } = request;
        const { code, type, quantity } = data;
        if (!code || !type || !quantity) {
            throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.MISSING_REQUIRED_FIELD, {
                missingFields: ['code', 'type', 'quantity']
            });
        }
        if (!['material', 'fragrance'].includes(type)) {
            throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.INVALID_INPUT, {
                message: "type 必須是 'material' 或 'fragrance'",
                details: { allowedTypes: ['material', 'fragrance'], providedType: type }
            });
        }
        try {
            // 根據類型和代碼查詢完整資料
            let itemDoc;
            let collection;
            if (type === 'material') {
                collection = 'materials';
                const materialsQuery = await db.collection('materials').where('code', '==', code).limit(1).get();
                if (materialsQuery.empty) {
                    throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.RESOURCE_NOT_FOUND, {
                        message: `找不到代碼為 ${code} 的原料`,
                        resourceType: "原料",
                        resourceId: code
                    });
                }
                itemDoc = materialsQuery.docs[0];
            }
            else {
                collection = 'fragrances';
                const fragrancesQuery = await db.collection('fragrances').where('code', '==', code).limit(1).get();
                if (fragrancesQuery.empty) {
                    throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.RESOURCE_NOT_FOUND, {
                        message: `找不到代碼為 ${code} 的香精`,
                        resourceType: "香精",
                        resourceId: code
                    });
                }
                itemDoc = fragrancesQuery.docs[0];
            }
            const itemData = itemDoc.data();
            // 取得供應商資訊
            let supplierName = '未指定供應商';
            if ((_a = itemData.supplierRef) === null || _a === void 0 ? void 0 : _a.id) {
                const supplierDoc = await db.collection('suppliers').doc(itemData.supplierRef.id).get();
                if (supplierDoc.exists) {
                    supplierName = ((_b = supplierDoc.data()) === null || _b === void 0 ? void 0 : _b.name) || '未指定供應商';
                }
            }
            // 建構完整的購物車項目
            const fullItem = {
                id: `${type}_${code}_${Date.now()}`,
                type: type,
                code: itemData.code,
                name: itemData.name,
                supplierId: ((_c = itemData.supplierRef) === null || _c === void 0 ? void 0 : _c.id) || '',
                supplierName: supplierName,
                quantity: quantity,
                unit: itemData.unit || 'KG',
                currentStock: itemData.currentStock || 0,
                price: itemData.costPerUnit || 0,
                addedBy: (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid) || 'anonymous',
                addedAt: firestore_1.Timestamp.now(),
                updatedAt: firestore_1.Timestamp.now()
            };
            // 使用現有的 addToGlobalCart 邏輯
            const cartRef = db.collection("globalCart").doc("main");
            const cartDoc = await cartRef.get();
            if (!cartDoc.exists) {
                // 建立新購物車
                await cartRef.set({
                    items: [fullItem],
                    lastUpdated: firestore_1.FieldValue.serverTimestamp(),
                    updatedBy: (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid) || 'system'
                });
                firebase_functions_1.logger.info(`用戶 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 初始化購物車並依代碼添加項目: ${code}`);
            }
            else {
                // 更新現有購物車
                const currentItems = ((_d = cartDoc.data()) === null || _d === void 0 ? void 0 : _d.items) || [];
                // 檢查是否已存在相同項目
                const existingIndex = currentItems.findIndex((i) => i.type === fullItem.type && i.code === fullItem.code && i.supplierId === fullItem.supplierId);
                if (existingIndex >= 0) {
                    // 更新數量
                    currentItems[existingIndex].quantity += fullItem.quantity;
                    currentItems[existingIndex].updatedAt = firestore_1.Timestamp.now();
                    firebase_functions_1.logger.info(`依代碼更新購物車項目: ${code}, 新數量: ${currentItems[existingIndex].quantity}`);
                }
                else {
                    // 添加新項目
                    currentItems.push(fullItem);
                    firebase_functions_1.logger.info(`依代碼添加新購物車項目: ${code}`);
                }
                await cartRef.update({
                    items: currentItems,
                    lastUpdated: firestore_1.FieldValue.serverTimestamp(),
                    updatedBy: (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid) || 'system'
                });
            }
            return {
                item: fullItem,
                itemCode: code,
                itemType: type,
                message: "已加入購物車"
            };
        }
        catch (error) {
            errorHandler_1.ErrorHandler.handle(error, `依代碼添加到購物車 ${code}`, contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid);
        }
    }
}));
// 批量更新購物車（用於從 localStorage 遷移）
exports.syncGlobalCart = (0, https_1.onCall)((0, apiWrapper_1.apiWrapper)({
    requireAuth: true,
    handler: async (request) => {
        const { auth: contextAuth, data } = request;
        const { items } = data;
        if (!Array.isArray(items)) {
            throw new errorHandler_1.BusinessError(errorHandler_1.ERROR_CODES.INVALID_INPUT, {
                message: "項目必須是陣列",
                details: { providedType: typeof items, expectedType: "array" }
            });
        }
        try {
            const cartRef = db.collection("globalCart").doc("main");
            // 處理所有項目，添加必要的元數據
            const processedItems = items.map(item => (Object.assign(Object.assign({}, item), { id: item.id || `${item.type}_${item.code}_${Date.now()}`, addedBy: item.addedBy || (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid) || 'anonymous', addedAt: item.addedAt || firestore_1.Timestamp.now(), updatedAt: firestore_1.Timestamp.now() })));
            await cartRef.set({
                items: processedItems,
                lastUpdated: firestore_1.FieldValue.serverTimestamp(),
                updatedBy: (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid) || 'system'
            });
            firebase_functions_1.logger.info(`用戶 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 同步購物車，共 ${processedItems.length} 個項目`);
            return {
                itemCount: processedItems.length,
                syncedBy: contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid,
                message: `購物車已同步，共 ${processedItems.length} 個項目`
            };
        }
        catch (error) {
            errorHandler_1.ErrorHandler.handle(error, `同步購物車 (${(items === null || items === void 0 ? void 0 : items.length) || 0} 個項目)`, contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid);
        }
    }
}));
//# sourceMappingURL=globalCart.js.map