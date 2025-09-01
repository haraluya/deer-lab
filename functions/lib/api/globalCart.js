"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncGlobalCart = exports.clearGlobalCart = exports.removeFromGlobalCart = exports.updateGlobalCartItem = exports.addToGlobalCart = exports.getGlobalCart = void 0;
// functions/src/api/globalCart.ts
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// 獲取全域購物車
exports.getGlobalCart = (0, https_1.onCall)(async (request) => {
    var _a;
    try {
        // 獲取全域購物車文檔
        const cartDoc = await db.collection("globalCart").doc("main").get();
        if (!cartDoc.exists) {
            // 如果不存在，建立一個空的購物車
            await db.collection("globalCart").doc("main").set({
                items: [],
                lastUpdated: firestore_1.FieldValue.serverTimestamp(),
                updatedBy: ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'system'
            });
            return { items: [] };
        }
        const cartData = cartDoc.data();
        return { items: (cartData === null || cartData === void 0 ? void 0 : cartData.items) || [] };
    }
    catch (error) {
        console.error("獲取全域購物車失敗:", error);
        throw new https_1.HttpsError("internal", "獲取購物車失敗");
    }
});
// 添加項目到購物車
exports.addToGlobalCart = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d;
    const { item } = request.data;
    if (!item) {
        throw new https_1.HttpsError("invalid-argument", "缺少購物車項目資料");
    }
    try {
        const cartRef = db.collection("globalCart").doc("main");
        const cartDoc = await cartRef.get();
        // 準備新項目
        const newItem = Object.assign(Object.assign({}, item), { id: item.id || `${item.type}_${item.code}_${Date.now()}`, addedBy: ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'anonymous', addedAt: firestore_1.Timestamp.now(), updatedAt: firestore_1.Timestamp.now() });
        if (!cartDoc.exists) {
            // 建立新購物車
            await cartRef.set({
                items: [newItem],
                lastUpdated: firestore_1.FieldValue.serverTimestamp(),
                updatedBy: ((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid) || 'system'
            });
        }
        else {
            // 更新現有購物車
            const currentItems = ((_c = cartDoc.data()) === null || _c === void 0 ? void 0 : _c.items) || [];
            // 檢查是否已存在相同項目
            const existingIndex = currentItems.findIndex((i) => i.type === newItem.type && i.code === newItem.code && i.supplierId === newItem.supplierId);
            if (existingIndex >= 0) {
                // 更新數量
                currentItems[existingIndex].quantity += newItem.quantity;
                currentItems[existingIndex].updatedAt = firestore_1.Timestamp.now();
            }
            else {
                // 添加新項目
                currentItems.push(newItem);
            }
            await cartRef.update({
                items: currentItems,
                lastUpdated: firestore_1.FieldValue.serverTimestamp(),
                updatedBy: ((_d = request.auth) === null || _d === void 0 ? void 0 : _d.uid) || 'system'
            });
        }
        return { success: true, message: "已加入購物車" };
    }
    catch (error) {
        console.error("添加到購物車失敗:", error);
        throw new https_1.HttpsError("internal", "添加到購物車失敗");
    }
});
// 更新購物車項目
exports.updateGlobalCartItem = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const { itemId, updates } = request.data;
    if (!itemId || !updates) {
        throw new https_1.HttpsError("invalid-argument", "缺少項目 ID 或更新資料");
    }
    try {
        const cartRef = db.collection("globalCart").doc("main");
        const cartDoc = await cartRef.get();
        if (!cartDoc.exists) {
            throw new https_1.HttpsError("not-found", "購物車不存在");
        }
        const currentItems = ((_a = cartDoc.data()) === null || _a === void 0 ? void 0 : _a.items) || [];
        const itemIndex = currentItems.findIndex((i) => i.id === itemId);
        if (itemIndex === -1) {
            throw new https_1.HttpsError("not-found", "找不到指定的購物車項目");
        }
        // 更新項目
        currentItems[itemIndex] = Object.assign(Object.assign(Object.assign({}, currentItems[itemIndex]), updates), { updatedAt: firestore_1.Timestamp.now() });
        await cartRef.update({
            items: currentItems,
            lastUpdated: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: ((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid) || 'system'
        });
        return { success: true, message: "購物車項目已更新" };
    }
    catch (error) {
        console.error("更新購物車項目失敗:", error);
        throw new https_1.HttpsError("internal", "更新購物車項目失敗");
    }
});
// 從購物車移除項目
exports.removeFromGlobalCart = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const { itemId } = request.data;
    if (!itemId) {
        throw new https_1.HttpsError("invalid-argument", "缺少項目 ID");
    }
    try {
        const cartRef = db.collection("globalCart").doc("main");
        const cartDoc = await cartRef.get();
        if (!cartDoc.exists) {
            throw new https_1.HttpsError("not-found", "購物車不存在");
        }
        const currentItems = ((_a = cartDoc.data()) === null || _a === void 0 ? void 0 : _a.items) || [];
        const filteredItems = currentItems.filter((i) => i.id !== itemId);
        if (filteredItems.length === currentItems.length) {
            throw new https_1.HttpsError("not-found", "找不到指定的購物車項目");
        }
        await cartRef.update({
            items: filteredItems,
            lastUpdated: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: ((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid) || 'system'
        });
        return { success: true, message: "已從購物車移除" };
    }
    catch (error) {
        console.error("從購物車移除失敗:", error);
        throw new https_1.HttpsError("internal", "從購物車移除失敗");
    }
});
// 清空購物車
exports.clearGlobalCart = (0, https_1.onCall)(async (request) => {
    var _a;
    try {
        const cartRef = db.collection("globalCart").doc("main");
        await cartRef.set({
            items: [],
            lastUpdated: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'system'
        });
        return { success: true, message: "購物車已清空" };
    }
    catch (error) {
        console.error("清空購物車失敗:", error);
        throw new https_1.HttpsError("internal", "清空購物車失敗");
    }
});
// 批量更新購物車（用於從 localStorage 遷移）
exports.syncGlobalCart = (0, https_1.onCall)(async (request) => {
    var _a;
    const { items } = request.data;
    if (!Array.isArray(items)) {
        throw new https_1.HttpsError("invalid-argument", "項目必須是陣列");
    }
    try {
        const cartRef = db.collection("globalCart").doc("main");
        // 處理所有項目，添加必要的元數據
        const processedItems = items.map(item => {
            var _a;
            return (Object.assign(Object.assign({}, item), { id: item.id || `${item.type}_${item.code}_${Date.now()}`, addedBy: item.addedBy || ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'anonymous', addedAt: item.addedAt || firestore_1.Timestamp.now(), updatedAt: firestore_1.Timestamp.now() }));
        });
        await cartRef.set({
            items: processedItems,
            lastUpdated: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'system'
        });
        return { success: true, message: "購物車已同步", itemCount: processedItems.length };
    }
    catch (error) {
        console.error("同步購物車失敗:", error);
        throw new https_1.HttpsError("internal", "同步購物車失敗");
    }
});
//# sourceMappingURL=globalCart.js.map