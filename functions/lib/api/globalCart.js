"use strict";
// functions/src/api/globalCart.ts
/**
 * 🛒 全域購物車 API
 *
 * 建立時間：2025-09-13
 * 目的：管理全域購物車功能，支援多使用者共同編輯
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncGlobalCart = exports.batchAddToGlobalCart = exports.clearGlobalCart = exports.removeFromGlobalCart = exports.updateGlobalCartItem = exports.addToGlobalCart = void 0;
const firestore_1 = require("firebase-admin/firestore");
const apiWrapper_1 = require("../utils/apiWrapper");
const errorHandler_1 = require("../utils/errorHandler");
const db = (0, firestore_1.getFirestore)();
// ============================================================================
// 輔助函數
// ============================================================================
/**
 * 獲取或建立購物車文檔
 */
async function getOrCreateCart() {
    const cartRef = db.collection('globalCart').doc('main');
    const cartDoc = await cartRef.get();
    if (!cartDoc.exists) {
        const initialData = {
            items: [],
            lastUpdated: new Date(),
            lastUpdatedBy: 'system'
        };
        await cartRef.set(initialData);
        return initialData;
    }
    return cartDoc.data();
}
/**
 * 驗證商品代碼是否存在（輕量驗證，不返回詳細資料）
 */
async function validateItemCode(type, code) {
    const collection = type === 'material' ? 'materials' : 'fragrances';
    // 只檢查是否存在，不返回資料
    const querySnapshot = await db.collection(collection)
        .where('code', '==', code)
        .limit(1)
        .get();
    return !querySnapshot.empty;
}
// ============================================================================
// API 函數
// ============================================================================
/**
 * 添加項目到購物車 - 極簡引用模式
 */
exports.addToGlobalCart = (0, apiWrapper_1.createApiHandler)({
    functionName: 'addToGlobalCart',
    requireAuth: false,
    enableDetailedLogging: false
}, async (data, context, requestId) => {
    var _a;
    const { type, code, quantity = 1 } = data;
    const userId = ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'anonymous';
    // 驗證參數
    if (!type || !code) {
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.INVALID_INPUT, '缺少必要參數: type 或 code');
    }
    if (quantity <= 0) {
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.INVALID_INPUT, '數量必須大於 0');
    }
    if (!['material', 'fragrance'].includes(type)) {
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.INVALID_INPUT, '項目類型只能是 material 或 fragrance');
    }
    // 🚀 輕量驗證：只檢查商品代碼是否存在
    const isValidItem = await validateItemCode(type, code);
    if (!isValidItem) {
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.NOT_FOUND, `找不到${type === 'material' ? '原料' : '香精'}代碼: ${code}`);
    }
    // 🎯 極簡購物車項目：只存引用
    const cartItem = {
        id: `${type}_${code}_${Date.now()}`,
        type: type,
        code,
        quantity,
        addedBy: userId,
        addedAt: new Date()
    };
    // 更新購物車
    const cartRef = db.collection('globalCart').doc('main');
    const cartDoc = await cartRef.get();
    if (!cartDoc.exists) {
        // 建立新購物車
        await cartRef.set({
            items: [cartItem],
            lastUpdated: new Date(),
            lastUpdatedBy: userId
        });
    }
    else {
        // 更新現有購物車
        const cartData = cartDoc.data();
        const existingItemIndex = cartData.items.findIndex(item => item.type === type && item.code === code);
        if (existingItemIndex >= 0) {
            // 更新現有項目的數量
            cartData.items[existingItemIndex].quantity += quantity;
        }
        else {
            // 添加新項目
            cartData.items.push(cartItem);
        }
        await cartRef.update({
            items: cartData.items,
            lastUpdated: new Date(),
            lastUpdatedBy: userId
        });
    }
    return {
        message: '已加入購物車',
        itemId: cartItem.id
    };
});
/**
 * 更新購物車項目
 */
exports.updateGlobalCartItem = (0, apiWrapper_1.createApiHandler)({
    functionName: 'updateGlobalCartItem',
    requireAuth: false,
    enableDetailedLogging: false
}, async (data, context, requestId) => {
    var _a;
    const { itemId, quantity } = data;
    const userId = ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'anonymous';
    if (!itemId) {
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.INVALID_INPUT, '缺少必要參數: itemId');
    }
    const cartRef = db.collection('globalCart').doc('main');
    const cartDoc = await cartRef.get();
    if (!cartDoc.exists) {
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.NOT_FOUND, '購物車不存在');
    }
    const cartData = cartDoc.data();
    const itemIndex = cartData.items.findIndex(item => item.id === itemId);
    if (itemIndex < 0) {
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.NOT_FOUND, '找不到指定的購物車項目');
    }
    // 更新項目
    if (quantity !== undefined) {
        if (quantity <= 0) {
            throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.INVALID_INPUT, '數量必須大於 0');
        }
        cartData.items[itemIndex].quantity = quantity;
    }
    // 極簡引用模式：不需要 notes 和 updatedAt 屬性
    // 只保留基本的數量更新
    await cartRef.update({
        items: cartData.items,
        lastUpdated: new Date(),
        lastUpdatedBy: userId
    });
    return { message: '購物車項目已更新' };
});
/**
 * 從購物車移除項目
 */
exports.removeFromGlobalCart = (0, apiWrapper_1.createApiHandler)({
    functionName: 'removeFromGlobalCart',
    requireAuth: false,
    enableDetailedLogging: false
}, async (data, context, requestId) => {
    var _a;
    const { itemId } = data;
    const userId = ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'anonymous';
    if (!itemId) {
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.INVALID_INPUT, '缺少必要參數: itemId');
    }
    const cartRef = db.collection('globalCart').doc('main');
    const cartDoc = await cartRef.get();
    if (!cartDoc.exists) {
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.NOT_FOUND, '購物車不存在');
    }
    const cartData = cartDoc.data();
    const filteredItems = cartData.items.filter(item => item.id !== itemId);
    if (filteredItems.length === cartData.items.length) {
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.NOT_FOUND, '找不到指定的購物車項目');
    }
    await cartRef.update({
        items: filteredItems,
        lastUpdated: new Date(),
        lastUpdatedBy: userId
    });
    return { message: '已從購物車移除' };
});
/**
 * 清空購物車
 */
exports.clearGlobalCart = (0, apiWrapper_1.createApiHandler)({
    functionName: 'clearGlobalCart',
    requireAuth: false,
    enableDetailedLogging: false
}, async (data, context, requestId) => {
    var _a;
    const userId = ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'anonymous';
    const cartRef = db.collection('globalCart').doc('main');
    await cartRef.set({
        items: [],
        lastUpdated: new Date(),
        lastUpdatedBy: userId
    });
    return { message: '購物車已清空' };
});
/**
 * 批量加入購物車 - 極簡引用模式
 */
exports.batchAddToGlobalCart = (0, apiWrapper_1.createApiHandler)({
    functionName: 'batchAddToGlobalCart',
    requireAuth: false,
    enableDetailedLogging: false
}, async (data, context, requestId) => {
    var _a;
    const { items } = data;
    const userId = ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'anonymous';
    if (!Array.isArray(items) || items.length === 0) {
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.INVALID_INPUT, '批量項目不能為空');
    }
    // 🚀 批量處理：使用相同的購物車邏輯
    let successCount = 0;
    const cartRef = db.collection('globalCart').doc('main');
    for (const item of items) {
        try {
            const { type, code, quantity } = item;
            // 驗證項目是否存在
            await validateItemCode(type, code);
            // 讀取當前購物車
            const cartDoc = await cartRef.get();
            let cartData;
            if (cartDoc.exists) {
                cartData = cartDoc.data();
            }
            else {
                cartData = { items: [], lastUpdated: new Date(), lastUpdatedBy: userId };
            }
            // 檢查是否已存在相同項目
            const existingIndex = cartData.items.findIndex(existingItem => existingItem.type === type && existingItem.code === code);
            if (existingIndex >= 0) {
                // 更新現有項目的數量
                cartData.items[existingIndex].quantity += quantity;
            }
            else {
                // 建立新項目
                const newCartItem = {
                    id: `${type}_${code}_${Date.now()}`,
                    type,
                    code,
                    quantity,
                    addedBy: userId,
                    addedAt: new Date()
                };
                cartData.items.push(newCartItem);
            }
            // 更新購物車
            await cartRef.set(Object.assign(Object.assign({}, cartData), { lastUpdated: new Date(), lastUpdatedBy: userId }));
            successCount++;
        }
        catch (error) {
            console.warn(`批量加入失敗 - ${item.type}:${item.code}`, error);
            // 繼續處理其他項目，不中斷整個批次
        }
    }
    if (successCount === 0) {
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.INVALID_INPUT, '所有項目都加入失敗');
    }
    return {
        message: `成功加入 ${successCount} 個項目`,
        addedCount: successCount,
        totalItems: items.length
    };
});
/**
 * 同步購物車（用於從 localStorage 遷移）
 */
exports.syncGlobalCart = (0, apiWrapper_1.createApiHandler)({
    functionName: 'syncGlobalCart',
    requireAuth: false,
    enableDetailedLogging: false
}, async (data, context, requestId) => {
    var _a;
    const { items } = data;
    const userId = ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'anonymous';
    if (!items || !Array.isArray(items)) {
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.INVALID_INPUT, '缺少必要參數: items');
    }
    const cartRef = db.collection('globalCart').doc('main');
    const cartDoc = await cartRef.get();
    let currentItems = [];
    if (cartDoc.exists) {
        const cartData = cartDoc.data();
        currentItems = cartData.items || [];
    }
    // 合併項目
    for (const item of items) {
        const existingIndex = currentItems.findIndex(existing => existing.type === item.type &&
            existing.code === item.code);
        if (existingIndex >= 0) {
            // 更新現有項目數量（極簡引用模式：不保存 updatedAt）
            currentItems[existingIndex].quantity += item.quantity || 1;
        }
        else {
            // 添加新項目（極簡引用模式：不包含 updatedAt）
            currentItems.push(Object.assign(Object.assign({}, item), { id: item.id || `${item.type}_${item.code}_${Date.now()}`, addedBy: item.addedBy || userId, addedAt: item.addedAt || new Date() }));
        }
    }
    await cartRef.set({
        items: currentItems,
        lastUpdated: new Date(),
        lastUpdatedBy: userId
    });
    return {
        message: '購物車已同步',
        itemCount: currentItems.length
    };
});
//# sourceMappingURL=globalCart.js.map