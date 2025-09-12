"use strict";
// functions/src/api/suppliers.ts
/**
 * 🎯 鹿鹿小作坊 - 供應商管理 API (已標準化)
 *
 * 升級時間：2025-09-12
 * 升級內容：套用統一 API 標準化架構
 * - 統一回應格式
 * - 統一錯誤處理
 * - 統一權限驗證
 * - 結構化日誌
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSupplier = exports.updateSupplier = exports.createSupplier = void 0;
const firestore_1 = require("firebase-admin/firestore");
const apiWrapper_1 = require("../utils/apiWrapper");
const errorHandler_1 = require("../utils/errorHandler");
const db = (0, firestore_1.getFirestore)();
/**
 * 建立新供應商
 */
exports.createSupplier = apiWrapper_1.CrudApiHandlers.createCreateHandler('Supplier', async (data, context, requestId) => {
    // 1. 驗證必填欄位
    errorHandler_1.ErrorHandler.validateRequired(data, ['name']);
    const { name, products, contactWindow, contactMethod, liaisonPersonId, notes } = data;
    try {
        // 2. 檢查供應商名稱是否已存在
        const existingSupplier = await db.collection('suppliers')
            .where('name', '==', name)
            .limit(1)
            .get();
        if (!existingSupplier.empty) {
            throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.ALREADY_EXISTS, `供應商名稱「${name}」已經存在`, { name });
        }
        // 3. 建立供應商資料
        const newSupplier = {
            name: name.trim(),
            products: (products === null || products === void 0 ? void 0 : products.trim()) || '',
            contactWindow: (contactWindow === null || contactWindow === void 0 ? void 0 : contactWindow.trim()) || '',
            contactMethod: (contactMethod === null || contactMethod === void 0 ? void 0 : contactMethod.trim()) || '',
            liaisonPersonId: (liaisonPersonId === null || liaisonPersonId === void 0 ? void 0 : liaisonPersonId.trim()) || '',
            notes: (notes === null || notes === void 0 ? void 0 : notes.trim()) || '',
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        // 4. 儲存到資料庫
        const docRef = await db.collection('suppliers').add(newSupplier);
        // 5. 返回標準化回應
        return {
            id: docRef.id,
            message: `供應商「${name}」已成功建立`,
            operation: 'created',
            resource: {
                type: 'supplier',
                name,
            }
        };
    }
    catch (error) {
        // 統一錯誤處理（由 apiWrapper 自動處理）
        throw errorHandler_1.ErrorHandler.handle(error, `建立供應商: ${name}`);
    }
});
/**
 * 更新供應商資料
 */
exports.updateSupplier = apiWrapper_1.CrudApiHandlers.createUpdateHandler('Supplier', async (data, context, requestId) => {
    // 1. 驗證必填欄位
    errorHandler_1.ErrorHandler.validateRequired(data, ['supplierId', 'name']);
    const { supplierId, name, products, contactWindow, contactMethod, liaisonPersonId, notes } = data;
    try {
        // 2. 檢查供應商是否存在
        const supplierRef = db.collection('suppliers').doc(supplierId);
        const supplierDoc = await supplierRef.get();
        errorHandler_1.ErrorHandler.assertExists(supplierDoc.exists, '供應商', supplierId);
        const currentSupplier = supplierDoc.data();
        // 3. 檢查名稱是否與其他供應商重複（除了自己）
        if (name.trim() !== currentSupplier.name) {
            const duplicateCheck = await db.collection('suppliers')
                .where('name', '==', name.trim())
                .limit(1)
                .get();
            if (!duplicateCheck.empty && duplicateCheck.docs[0].id !== supplierId) {
                throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.ALREADY_EXISTS, `供應商名稱「${name}」已經存在`, { name, conflictId: duplicateCheck.docs[0].id });
            }
        }
        // 4. 準備更新資料
        const updateData = {
            name: name.trim(),
            products: (products === null || products === void 0 ? void 0 : products.trim()) || '',
            contactWindow: (contactWindow === null || contactWindow === void 0 ? void 0 : contactWindow.trim()) || '',
            contactMethod: (contactMethod === null || contactMethod === void 0 ? void 0 : contactMethod.trim()) || '',
            liaisonPersonId: (liaisonPersonId === null || liaisonPersonId === void 0 ? void 0 : liaisonPersonId.trim()) || '',
            notes: (notes === null || notes === void 0 ? void 0 : notes.trim()) || '',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        // 5. 更新資料庫
        await supplierRef.update(updateData);
        // 6. 返回標準化回應
        return {
            id: supplierId,
            message: `供應商「${name}」的資料已成功更新`,
            operation: 'updated',
            resource: {
                type: 'supplier',
                name,
            }
        };
    }
    catch (error) {
        throw errorHandler_1.ErrorHandler.handle(error, `更新供應商: ${supplierId}`);
    }
});
/**
 * 刪除供應商
 */
exports.deleteSupplier = apiWrapper_1.CrudApiHandlers.createDeleteHandler('Supplier', async (data, context, requestId) => {
    // 1. 驗證必填欄位
    errorHandler_1.ErrorHandler.validateRequired(data, ['supplierId']);
    const { supplierId } = data;
    try {
        // 2. 檢查供應商是否存在
        const supplierRef = db.collection('suppliers').doc(supplierId);
        const supplierDoc = await supplierRef.get();
        errorHandler_1.ErrorHandler.assertExists(supplierDoc.exists, '供應商', supplierId);
        const supplierData = supplierDoc.data();
        const supplierName = supplierData.name;
        // 3. 檢查是否有相關聯的資料（可選：防止誤刪）
        // 檢查是否有物料使用此供應商
        const relatedMaterials = await db.collection('materials')
            .where('supplierRef', '==', supplierRef)
            .limit(1)
            .get();
        // 檢查是否有香精使用此供應商  
        const relatedFragrances = await db.collection('fragrances')
            .where('supplierRef', '==', supplierRef)
            .limit(1)
            .get();
        if (!relatedMaterials.empty || !relatedFragrances.empty) {
            throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.OPERATION_CONFLICT, `無法刪除供應商「${supplierName}」，因為仍有物料或香精與此供應商相關聯`, {
                relatedMaterialsCount: relatedMaterials.size,
                relatedFragrancesCount: relatedFragrances.size
            });
        }
        // 4. 刪除供應商
        await supplierRef.delete();
        // 5. 返回標準化回應
        return {
            id: supplierId,
            message: `供應商「${supplierName}」已成功刪除`,
            operation: 'deleted',
            resource: {
                type: 'supplier',
                name: supplierName,
            }
        };
    }
    catch (error) {
        throw errorHandler_1.ErrorHandler.handle(error, `刪除供應商: ${supplierId}`);
    }
});
//# sourceMappingURL=suppliers.js.map