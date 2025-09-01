"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSupplier = exports.updateSupplier = exports.createSupplier = void 0;
// functions/src/api/suppliers.ts
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
exports.createSupplier = (0, https_1.onCall)(async (request) => {
    const { data, auth: contextAuth } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    const { name, products, contactWindow, contactMethod, liaisonPersonId, notes } = data;
    if (!name) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少必要的欄位 (供應商名稱)。");
    }
    try {
        const newSupplier = {
            name,
            products: products || "",
            contactWindow: contactWindow || "",
            contactMethod: contactMethod || "",
            liaisonPersonId: liaisonPersonId || "",
            notes: notes || "",
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        const docRef = await db.collection("suppliers").add(newSupplier);
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功建立新供應商: ${docRef.id}`);
        return {
            status: "success",
            message: `供應商 ${name} 已成功建立。`,
            supplierId: docRef.id,
        };
    }
    catch (error) {
        firebase_functions_1.logger.error("建立供應商時發生錯誤:", error);
        throw new https_1.HttpsError("internal", "建立供應商時發生未知錯誤。");
    }
});
exports.updateSupplier = (0, https_1.onCall)(async (request) => {
    const { data, auth: contextAuth } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    const { supplierId, name, products, contactWindow, contactMethod, liaisonPersonId, notes } = data;
    if (!supplierId || !name) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少必要的欄位 (supplierId, name)。");
    }
    try {
        const supplierRef = db.collection("suppliers").doc(supplierId);
        const updateData = {
            name,
            products: products || "",
            contactWindow: contactWindow || "",
            contactMethod: contactMethod || "",
            liaisonPersonId: liaisonPersonId || "",
            notes: notes || "",
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        await supplierRef.update(updateData);
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功更新供應商資料: ${supplierId}`);
        return {
            status: "success",
            message: `供應商 ${name} 的資料已成功更新。`,
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`更新供應商 ${supplierId} 時發生錯誤:`, error);
        throw new https_1.HttpsError("internal", "更新供應商資料時發生未知錯誤。");
    }
});
exports.deleteSupplier = (0, https_1.onCall)(async (request) => {
    const { data, auth: contextAuth } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    const { supplierId } = data;
    if (!supplierId) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少 supplierId。");
    }
    try {
        await db.collection("suppliers").doc(supplierId).delete();
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功刪除供應商: ${supplierId}`);
        return {
            status: "success",
            message: "供應商已成功刪除。",
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`刪除供應商 ${supplierId} 時發生錯誤:`, error);
        throw new https_1.HttpsError("internal", "刪除供應商時發生未知錯誤。");
    }
});
//# sourceMappingURL=suppliers.js.map