"use strict";
// functions/src/api/fragrances.ts
/**
 * 🎯 德科斯特的實驗室 - 香精管理 API (已標準化)
 *
 * 升級時間：2025-09-12
 * 升級內容：套用統一 API 標準化架構
 * - 統一回應格式
 * - 統一錯誤處理
 * - 統一權限驗證
 * - 結構化日誌
 * - 保留複雜業務邏輯
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFragrance = exports.updateFragrance = exports.createFragrance = void 0;
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-admin/firestore");
const apiWrapper_1 = require("../utils/apiWrapper");
const errorHandler_1 = require("../utils/errorHandler");
const db = (0, firestore_1.getFirestore)();
/**
 * 建立新香精
 */
exports.createFragrance = apiWrapper_1.CrudApiHandlers.createCreateHandler('Fragrance', async (data, context, requestId) => {
    // 1. 驗證必填欄位
    errorHandler_1.ErrorHandler.validateRequired(data, ['code', 'name']);
    const { code, name, fragranceType, fragranceStatus, supplierRef, supplierId, safetyStockLevel, costPerUnit, percentage, pgRatio, vgRatio, description, notes, remarks, status, unit, currentStock } = data;
    try {
        // 2. 檢查香精編號是否已存在
        const existingFragrance = await db.collection('fragrances')
            .where('code', '==', code.trim())
            .limit(1)
            .get();
        if (!existingFragrance.empty) {
            throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.ALREADY_EXISTS, `香精編號「${code}」已經存在`, { code });
        }
        // 3. 處理向後相容性
        const finalFragranceType = fragranceType || status || '棉芯';
        const finalStatus = status || fragranceType || 'standby';
        const finalFragranceStatus = fragranceStatus || '備用';
        // 4. 建立香精資料
        const fragranceData = {
            code: code.trim(),
            name: name.trim(),
            fragranceType: finalFragranceType,
            fragranceStatus: finalFragranceStatus,
            status: finalStatus,
            supplierRef: supplierRef || (supplierId ? db.collection("suppliers").doc(supplierId) : null),
            safetyStockLevel: Number(safetyStockLevel) || 0,
            costPerUnit: Number(costPerUnit) || 0,
            currentStock: Number(currentStock) || 0,
            percentage: Number(percentage) || 0,
            pgRatio: Number(pgRatio) || 0,
            vgRatio: Number(vgRatio) || 0,
            description: (description || '').trim(),
            notes: (notes || '').trim(),
            remarks: (remarks || '').trim(),
            unit: unit || 'KG',
            lastStockUpdate: firestore_1.FieldValue.serverTimestamp(),
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        // 5. 儲存到資料庫
        const docRef = await db.collection('fragrances').add(fragranceData);
        // 6. 返回標準化回應
        return {
            id: docRef.id,
            message: `香精「${name}」(編號: ${code}) 已成功建立`,
            operation: 'created',
            resource: {
                type: 'fragrance',
                name,
                code,
            }
        };
    }
    catch (error) {
        throw errorHandler_1.ErrorHandler.handle(error, `建立香精: ${name} (${code})`);
    }
});
/**
 * 更新香精資料
 */
exports.updateFragrance = apiWrapper_1.CrudApiHandlers.createUpdateHandler('Fragrance', async (data, context, requestId) => {
    var _a, _b, _c;
    // 1. 驗證必填欄位
    errorHandler_1.ErrorHandler.validateRequired(data, ['fragranceId', 'code', 'name']);
    const { fragranceId, code, name, status, fragranceType, fragranceStatus, supplierId, currentStock, safetyStockLevel, costPerUnit, percentage, pgRatio, vgRatio, unit } = data;
    try {
        // 2. 檢查香精是否存在
        const fragranceRef = db.collection('fragrances').doc(fragranceId);
        const fragranceDoc = await fragranceRef.get();
        errorHandler_1.ErrorHandler.assertExists(fragranceDoc.exists, '香精', fragranceId);
        const currentFragrance = fragranceDoc.data();
        // 3. 檢查編號是否與其他香精重複（除了自己）
        if (code.trim() !== currentFragrance.code) {
            const duplicateCheck = await db.collection('fragrances')
                .where('code', '==', code.trim())
                .limit(1)
                .get();
            if (!duplicateCheck.empty && duplicateCheck.docs[0].id !== fragranceId) {
                throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.ALREADY_EXISTS, `香精編號「${code}」已經存在`, { code, conflictId: duplicateCheck.docs[0].id });
            }
        }
        // 4. 處理向後相容性
        const finalFragranceType = (fragranceType !== undefined && fragranceType !== null && fragranceType !== '') ? fragranceType : (status || '棉芯');
        const finalStatus = (status !== undefined && status !== null && status !== '') ? status : (fragranceType || 'standby');
        const finalFragranceStatus = (fragranceStatus !== undefined && fragranceStatus !== null && fragranceStatus !== '') ? fragranceStatus : (status || '備用');
        // 5. 檢查庫存變更
        const oldStock = currentFragrance.currentStock || 0;
        const newStock = Number(currentStock) || 0;
        const stockChanged = oldStock !== newStock;
        // 6. 準備更新資料
        const updateData = {
            code: code.trim(),
            name: name.trim(),
            status: finalStatus,
            fragranceType: finalFragranceType,
            fragranceStatus: finalFragranceStatus,
            currentStock: newStock,
            safetyStockLevel: Number(safetyStockLevel) || 0,
            costPerUnit: Number(costPerUnit) || 0,
            percentage: Number(percentage) || 0,
            pgRatio: Number(pgRatio) || 0,
            vgRatio: Number(vgRatio) || 0,
            unit: unit || 'KG',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        // 7. 處理供應商參照
        if (supplierId) {
            updateData.supplierRef = db.collection('suppliers').doc(supplierId);
        }
        else {
            updateData.supplierRef = firestore_1.FieldValue.delete();
        }
        // 8. 更新資料庫
        await fragranceRef.update(updateData);
        // 9. 如果庫存有變更，建立庫存紀錄
        if (stockChanged) {
            try {
                const inventoryRecordRef = db.collection('inventory_records').doc();
                await inventoryRecordRef.set({
                    changeDate: firestore_1.FieldValue.serverTimestamp(),
                    changeReason: 'manual_adjustment',
                    operatorId: ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'unknown',
                    operatorName: ((_c = (_b = context.auth) === null || _b === void 0 ? void 0 : _b.token) === null || _c === void 0 ? void 0 : _c.name) || '未知用戶',
                    remarks: '透過編輯對話框直接修改庫存',
                    relatedDocumentId: fragranceId,
                    relatedDocumentType: 'fragrance_edit',
                    details: [{
                            itemId: fragranceId,
                            itemType: 'fragrance',
                            itemCode: code,
                            itemName: name,
                            quantityChange: newStock - oldStock,
                            quantityAfter: newStock
                        }],
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                });
                firebase_functions_1.logger.info(`[${requestId}] 已建立庫存紀錄，庫存從 ${oldStock} 變更為 ${newStock}`);
            }
            catch (error) {
                firebase_functions_1.logger.warn(`[${requestId}] 建立庫存紀錄失敗:`, error);
                // 不阻擋主要更新流程
            }
        }
        // 10. 返回標準化回應
        return {
            id: fragranceId,
            message: `香精「${name}」(編號: ${code}) 的資料已成功更新${stockChanged ? '，並更新庫存' : ''}`,
            operation: 'updated',
            resource: {
                type: 'fragrance',
                name,
                code,
            }
        };
    }
    catch (error) {
        throw errorHandler_1.ErrorHandler.handle(error, `更新香精: ${fragranceId}`);
    }
});
/**
 * 刪除香精
 */
exports.deleteFragrance = apiWrapper_1.CrudApiHandlers.createDeleteHandler('Fragrance', async (data, context, requestId) => {
    // 1. 驗證必填欄位
    errorHandler_1.ErrorHandler.validateRequired(data, ['fragranceId']);
    const { fragranceId } = data;
    try {
        // 2. 檢查香精是否存在
        const fragranceRef = db.collection('fragrances').doc(fragranceId);
        const fragranceDoc = await fragranceRef.get();
        errorHandler_1.ErrorHandler.assertExists(fragranceDoc.exists, '香精', fragranceId);
        const fragranceData = fragranceDoc.data();
        const fragranceName = fragranceData.name;
        const fragranceCode = fragranceData.code;
        // 3. 檢查是否有相關聯的資料（可選：防止誤刪）
        // 檢查是否有产品使用此香精
        const relatedProducts = await db.collection('products')
            .where('ingredients', 'array-contains', fragranceRef)
            .limit(1)
            .get();
        // 檢查是否有工單使用此香精
        const relatedWorkOrders = await db.collection('work_orders')
            .where('fragranceRef', '==', fragranceRef)
            .limit(1)
            .get();
        if (!relatedProducts.empty || !relatedWorkOrders.empty) {
            throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.OPERATION_CONFLICT, `無法刪除香精「${fragranceName}」，因為仍有产品或工單與此香精相關聯`, {
                relatedProductsCount: relatedProducts.size,
                relatedWorkOrdersCount: relatedWorkOrders.size
            });
        }
        // 4. 刪除香精
        await fragranceRef.delete();
        // 5. 返回標準化回應
        return {
            id: fragranceId,
            message: `香精「${fragranceName}」(編號: ${fragranceCode}) 已成功刪除`,
            operation: 'deleted',
            resource: {
                type: 'fragrance',
                name: fragranceName,
                code: fragranceCode,
            }
        };
    }
    catch (error) {
        throw errorHandler_1.ErrorHandler.handle(error, `刪除香精: ${fragranceId}`);
    }
});
//# sourceMappingURL=fragrances.js.map