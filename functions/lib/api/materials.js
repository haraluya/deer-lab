"use strict";
// functions/src/api/materials.ts
/**
 * 🎯 德科斯特的實驗室 - 物料管理 API (已標準化)
 *
 * 升級時間：2025-09-12
 * 升級內容：套用統一 API 標準化架構
 * - 統一回應格式
 * - 統一錯誤處理
 * - 統一權限驗證
 * - 結構化日誌
 * - 保留所有複雜業務邏輯
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMaterial = exports.updateMaterial = exports.createMaterial = void 0;
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-admin/firestore");
const apiWrapper_1 = require("../utils/apiWrapper");
const errorHandler_1 = require("../utils/errorHandler");
const db = (0, firestore_1.getFirestore)();
/**
 * ===============================
 * 物料代號生成與管理工具類
 * ===============================
 */
class MaterialCodeGenerator {
    /**
     * 生成 4 位隨機數字
     */
    static generateRandomCode() {
        let result = '';
        for (let i = 0; i < 4; i++) {
            result += Math.floor(Math.random() * 10);
        }
        return result;
    }
    /**
     * 生成 2 位大寫英文字母 ID (主分類)
     */
    static generateCategoryId() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < 2; i++) {
            result += letters.charAt(Math.floor(Math.random() * letters.length));
        }
        return result;
    }
    /**
     * 生成 3 位數字 ID (細分分類)
     */
    static generateSubCategoryId() {
        let result = '';
        for (let i = 0; i < 3; i++) {
            result += Math.floor(Math.random() * 10);
        }
        return result;
    }
    /**
     * 新的物料代號生成：主分類ID(2位字母) + 細分分類ID(3位數字) + 隨機生成碼(4位數字) = 9碼
     */
    static generateMaterialCode(mainCategoryId, subCategoryId, randomCode) {
        // 確保主分類ID是2位字母
        const categoryId = mainCategoryId ? mainCategoryId.substring(0, 2).toUpperCase() : 'XX';
        // 確保細分分類ID是3位數字
        const subCategoryIdStr = subCategoryId ? subCategoryId.padStart(3, '0').substring(0, 3) : '000';
        // 生成或使用現有的隨機生成碼
        const randomPart = randomCode || this.generateRandomCode();
        return `${categoryId}${subCategoryIdStr}${randomPart}`;
    }
    /**
     * 從物料代號中提取各部分
     */
    static parseMaterialCode(code) {
        if (!code || code.length !== 9) {
            throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.INVALID_FORMAT, '物料代號必須是9位字符', { code, length: code === null || code === void 0 ? void 0 : code.length });
        }
        return {
            mainCategoryId: code.substring(0, 2),
            subCategoryId: code.substring(2, 5),
            randomCode: code.substring(5, 9) // 後4位是隨機生成碼
        };
    }
    /**
     * 更新物料代號（當分類改變時，保持隨機生成碼不變）
     */
    static updateMaterialCode(oldCode, newMainCategoryId, newSubCategoryId) {
        try {
            const { randomCode } = this.parseMaterialCode(oldCode);
            return this.generateMaterialCode(newMainCategoryId, newSubCategoryId, randomCode);
        }
        catch (error) {
            // 如果解析失敗，生成新的完整代號
            firebase_functions_1.logger.warn(`無法解析舊代號 ${oldCode}，將生成新代號`);
            return this.generateMaterialCode(newMainCategoryId, newSubCategoryId);
        }
    }
    /**
     * 生成唯一物料代號
     */
    static async generateUniqueMaterialCode(mainCategoryId, subCategoryId, existingCodes) {
        let code = this.generateMaterialCode(mainCategoryId, subCategoryId);
        let attempts = 0;
        const maxAttempts = 10;
        // 如果提供了現有代號集合，先檢查
        if (existingCodes) {
            while (existingCodes.has(code) && attempts < maxAttempts) {
                code = this.generateMaterialCode(mainCategoryId, subCategoryId);
                attempts++;
            }
        }
        // 檢查資料庫中是否已存在
        attempts = 0;
        while (attempts < maxAttempts) {
            const existingMaterial = await db.collection('materials')
                .where('code', '==', code)
                .limit(1)
                .get();
            if (existingMaterial.empty) {
                return code; // 找到唯一代號
            }
            code = this.generateMaterialCode(mainCategoryId, subCategoryId);
            attempts++;
        }
        // 如果仍有碰撞，加上時間戳記後綴
        const timestamp = Date.now().toString().slice(-6);
        return `${code.substring(0, 5)}${timestamp.substring(0, 4)}`;
    }
    /**
     * 生成或取得分類ID
     */
    static async getOrCreateCategoryId(categoryName, type) {
        try {
            const collectionName = type === 'category' ? 'materialCategories' : 'materialSubCategories';
            const query = await db.collection(collectionName)
                .where('name', '==', categoryName)
                .limit(1)
                .get();
            if (!query.empty) {
                const doc = query.docs[0];
                const existingId = doc.data().id;
                if (existingId) {
                    return existingId;
                }
            }
            // 如果不存在，創建新的
            const newId = type === 'category' ? this.generateCategoryId() : this.generateSubCategoryId();
            await db.collection(collectionName).add({
                name: categoryName,
                id: newId,
                type: type,
                createdAt: firestore_1.FieldValue.serverTimestamp()
            });
            return newId;
        }
        catch (error) {
            firebase_functions_1.logger.error(`獲取或創建${type}ID時發生錯誤:`, error);
            return type === 'category' ? this.generateCategoryId() : this.generateSubCategoryId();
        }
    }
    /**
     * 自動生成分類和子分類（包含ID）
     */
    static async autoGenerateCategories(materialData) {
        // 如果沒有分類，自動生成
        if (!materialData.category) {
            const categoryName = '自動分類_' + Math.floor(Math.random() * 1000);
            const categoryId = this.generateCategoryId();
            await db.collection('materialCategories').add({
                name: categoryName,
                id: categoryId,
                type: 'category',
                createdAt: firestore_1.FieldValue.serverTimestamp()
            });
            materialData.category = categoryName;
            materialData.mainCategoryId = categoryId;
            firebase_functions_1.logger.info('自動生成主分類:', categoryName, 'ID:', categoryId);
        }
        // 如果沒有子分類，自動生成
        if (!materialData.subCategory) {
            const subCategoryName = '自動子分類_' + Math.floor(Math.random() * 1000);
            const subCategoryId = this.generateSubCategoryId();
            await db.collection('materialSubCategories').add({
                name: subCategoryName,
                id: subCategoryId,
                type: 'subCategory',
                parentCategory: materialData.category,
                createdAt: firestore_1.FieldValue.serverTimestamp()
            });
            materialData.subCategory = subCategoryName;
            materialData.subCategoryId = subCategoryId;
            firebase_functions_1.logger.info('自動生成子分類:', subCategoryName, 'ID:', subCategoryId);
        }
        return materialData;
    }
}
/**
 * ===============================
 * 庫存記錄管理工具類
 * ===============================
 */
class InventoryRecordManager {
    /**
     * 建立庫存變更記錄
     */
    static async createInventoryRecord(materialId, materialName, materialCode, oldStock, newStock, operatorId, operatorName, reason = 'manual_adjustment', remarks = '透過編輯對話框直接修改庫存') {
        try {
            const inventoryRecordRef = db.collection('inventory_records').doc();
            await inventoryRecordRef.set({
                changeDate: firestore_1.FieldValue.serverTimestamp(),
                changeReason: reason,
                operatorId,
                operatorName: operatorName || '未知用戶',
                remarks,
                relatedDocumentId: materialId,
                relatedDocumentType: 'material_edit',
                details: [{
                        itemId: materialId,
                        itemType: 'material',
                        itemCode: materialCode,
                        itemName: materialName,
                        quantityChange: newStock - oldStock,
                        quantityAfter: newStock
                    }],
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
            firebase_functions_1.logger.info(`已建立庫存紀錄，庫存從 ${oldStock} 變更為 ${newStock}`);
        }
        catch (error) {
            firebase_functions_1.logger.error(`建立庫存紀錄失敗:`, error);
            // 不拋出錯誤，避免阻擋主要更新流程
        }
    }
}
/**
 * ===============================
 * 物料管理 API 函數
 * ===============================
 */
/**
 * 建立新物料
 */
exports.createMaterial = apiWrapper_1.CrudApiHandlers.createCreateHandler('Material', async (data, context, requestId) => {
    // 1. 驗證必填欄位
    errorHandler_1.ErrorHandler.validateRequired(data, ['name']);
    const { code, name, category, subCategory, supplierId, safetyStockLevel, costPerUnit, unit, notes } = data;
    try {
        // 2. 自動生成分類和子分類（如果沒有提供）
        let processedData = Object.assign({}, data);
        if (!category || !subCategory) {
            processedData = await MaterialCodeGenerator.autoGenerateCategories(processedData);
        }
        // 3. 獲取分類ID
        const mainCategoryId = await MaterialCodeGenerator.getOrCreateCategoryId(processedData.category, 'category');
        const subCategoryId = await MaterialCodeGenerator.getOrCreateCategoryId(processedData.subCategory, 'subCategory');
        // 4. 檢查物料名稱是否重複
        const existingMaterial = await db.collection('materials')
            .where('name', '==', name.trim())
            .limit(1)
            .get();
        if (!existingMaterial.empty) {
            throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.ALREADY_EXISTS, `物料名稱「${name}」已經存在`, { name, existingId: existingMaterial.docs[0].id });
        }
        // 5. 處理物料代號
        let finalCode = code;
        if (!finalCode) {
            // 自動生成唯一代號
            finalCode = await MaterialCodeGenerator.generateUniqueMaterialCode(mainCategoryId, subCategoryId);
        }
        else {
            // 檢查提供的代號是否重複
            const existingCodeMaterial = await db.collection('materials')
                .where('code', '==', finalCode)
                .limit(1)
                .get();
            if (!existingCodeMaterial.empty) {
                throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.ALREADY_EXISTS, `物料代號「${finalCode}」已經存在`, { code: finalCode, existingId: existingCodeMaterial.docs[0].id });
            }
        }
        // 6. 驗證數值欄位
        errorHandler_1.ErrorHandler.validateRange(safetyStockLevel || 0, 0, undefined, '安全庫存');
        errorHandler_1.ErrorHandler.validateRange(costPerUnit || 0, 0, undefined, '單位成本');
        // 7. 建立物料資料
        const newMaterial = {
            code: finalCode,
            name: name.trim(),
            category: processedData.category || '',
            subCategory: processedData.subCategory || '',
            mainCategoryId,
            subCategoryId,
            safetyStockLevel: Number(safetyStockLevel) || 0,
            costPerUnit: Number(costPerUnit) || 0,
            unit: (unit === null || unit === void 0 ? void 0 : unit.trim()) || 'KG',
            currentStock: 0,
            notes: (notes === null || notes === void 0 ? void 0 : notes.trim()) || '',
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        // 8. 處理供應商關聯
        if (supplierId) {
            // 檢查供應商是否存在
            const supplierDoc = await db.collection('suppliers').doc(supplierId).get();
            errorHandler_1.ErrorHandler.assertExists(supplierDoc.exists, '供應商', supplierId);
            newMaterial.supplierRef = db.collection('suppliers').doc(supplierId);
        }
        // 9. 儲存到資料庫
        const docRef = await db.collection('materials').add(newMaterial);
        // 10. 返回標準化回應
        return {
            id: docRef.id,
            message: `物料「${name}」已成功建立`,
            operation: 'created',
            resource: {
                type: 'material',
                name,
                code: finalCode,
            },
            generatedCode: finalCode
        };
    }
    catch (error) {
        throw errorHandler_1.ErrorHandler.handle(error, `建立物料: ${name}`);
    }
});
/**
 * 更新物料資料
 */
exports.updateMaterial = apiWrapper_1.CrudApiHandlers.createUpdateHandler('Material', async (data, context, requestId) => {
    var _a, _b;
    // 1. 驗證必填欄位
    errorHandler_1.ErrorHandler.validateRequired(data, ['materialId', 'name', 'category', 'subCategory']);
    const { materialId, name, category, subCategory, supplierId, currentStock, safetyStockLevel, costPerUnit, unit, notes } = data;
    try {
        // 2. 檢查物料是否存在
        const materialRef = db.collection('materials').doc(materialId);
        const materialDoc = await materialRef.get();
        errorHandler_1.ErrorHandler.assertExists(materialDoc.exists, '物料', materialId);
        const currentMaterial = materialDoc.data();
        let updatedCode = currentMaterial.code;
        // 3. 檢查物料名稱是否與其他物料重複（除了自己）
        if (name.trim() !== currentMaterial.name) {
            const duplicateCheck = await db.collection('materials')
                .where('name', '==', name.trim())
                .limit(1)
                .get();
            if (!duplicateCheck.empty && duplicateCheck.docs[0].id !== materialId) {
                throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.ALREADY_EXISTS, `物料名稱「${name}」已經存在`, { name, conflictId: duplicateCheck.docs[0].id });
            }
        }
        // 4. 如果分類有改變，更新物料代號
        if (category !== currentMaterial.category || subCategory !== currentMaterial.subCategory) {
            const newMainCategoryId = await MaterialCodeGenerator.getOrCreateCategoryId(category, 'category');
            const newSubCategoryId = await MaterialCodeGenerator.getOrCreateCategoryId(subCategory, 'subCategory');
            // 保持隨機生成碼不變，只更新分類部分
            updatedCode = MaterialCodeGenerator.updateMaterialCode(currentMaterial.code, newMainCategoryId, newSubCategoryId);
            firebase_functions_1.logger.info(`物料 ${materialId} 分類改變，更新代號從 ${currentMaterial.code} 到 ${updatedCode}`);
        }
        // 5. 驗證數值欄位
        errorHandler_1.ErrorHandler.validateRange(safetyStockLevel || 0, 0, undefined, '安全庫存');
        errorHandler_1.ErrorHandler.validateRange(costPerUnit || 0, 0, undefined, '單位成本');
        errorHandler_1.ErrorHandler.validateRange(currentStock || 0, 0, undefined, '目前庫存');
        // 6. 檢查庫存是否有變更
        const oldStock = currentMaterial.currentStock || 0;
        const newStock = Number(currentStock) || 0;
        const stockChanged = oldStock !== newStock;
        // 7. 準備更新資料
        const updateData = {
            name: name.trim(),
            category: (category === null || category === void 0 ? void 0 : category.trim()) || '',
            subCategory: (subCategory === null || subCategory === void 0 ? void 0 : subCategory.trim()) || '',
            code: updatedCode,
            currentStock: newStock,
            safetyStockLevel: Number(safetyStockLevel) || 0,
            costPerUnit: Number(costPerUnit) || 0,
            unit: (unit === null || unit === void 0 ? void 0 : unit.trim()) || 'KG',
            notes: (notes === null || notes === void 0 ? void 0 : notes.trim()) || '',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        // 8. 處理供應商關聯
        if (supplierId) {
            // 檢查供應商是否存在
            const supplierDoc = await db.collection('suppliers').doc(supplierId).get();
            errorHandler_1.ErrorHandler.assertExists(supplierDoc.exists, '供應商', supplierId);
            updateData.supplierRef = db.collection('suppliers').doc(supplierId);
        }
        else {
            updateData.supplierRef = firestore_1.FieldValue.delete();
        }
        // 9. 更新資料庫
        await materialRef.update(updateData);
        // 10. 如果庫存有變更，建立庫存紀錄
        if (stockChanged && ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
            await InventoryRecordManager.createInventoryRecord(materialId, name, updatedCode, oldStock, newStock, context.auth.uid, (_b = context.auth.token) === null || _b === void 0 ? void 0 : _b.name);
        }
        // 11. 返回標準化回應
        return {
            id: materialId,
            message: `物料「${name}」已成功更新`,
            operation: 'updated',
            resource: {
                type: 'material',
                name,
                code: updatedCode,
            },
            updatedCode
        };
    }
    catch (error) {
        throw errorHandler_1.ErrorHandler.handle(error, `更新物料: ${materialId}`);
    }
});
/**
 * 刪除物料
 */
exports.deleteMaterial = apiWrapper_1.CrudApiHandlers.createDeleteHandler('Material', async (data, context, requestId) => {
    // 1. 驗證必填欄位
    errorHandler_1.ErrorHandler.validateRequired(data, ['materialId']);
    const { materialId } = data;
    try {
        // 2. 檢查物料是否存在
        const materialRef = db.collection('materials').doc(materialId);
        const materialDoc = await materialRef.get();
        errorHandler_1.ErrorHandler.assertExists(materialDoc.exists, '物料', materialId);
        const materialData = materialDoc.data();
        const materialName = materialData.name;
        const materialCode = materialData.code;
        // 3. 檢查是否有相關聯的資料（防止誤刪）
        const relatedWorkOrders = await db.collection('work_orders')
            .where('materials', 'array-contains', { materialId })
            .limit(1)
            .get();
        const relatedPurchaseOrders = await db.collection('purchase_orders')
            .where('items', 'array-contains', { materialId })
            .limit(1)
            .get();
        if (!relatedWorkOrders.empty || !relatedPurchaseOrders.empty) {
            throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.OPERATION_CONFLICT, `無法刪除物料「${materialName}」，因為仍有工單或採購訂單與此物料相關聯`, {
                relatedWorkOrdersCount: relatedWorkOrders.size,
                relatedPurchaseOrdersCount: relatedPurchaseOrders.size
            });
        }
        // 4. 刪除物料
        await materialRef.delete();
        // 5. 返回標準化回應
        return {
            id: materialId,
            message: `物料「${materialName}」已成功刪除`,
            operation: 'deleted',
            resource: {
                type: 'material',
                name: materialName,
                code: materialCode,
            }
        };
    }
    catch (error) {
        throw errorHandler_1.ErrorHandler.handle(error, `刪除物料: ${materialId}`);
    }
});
//# sourceMappingURL=materials.js.map