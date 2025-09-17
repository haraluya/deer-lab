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
exports.importFragrances = exports.deleteFragrance = exports.updateFragrance = exports.createFragrance = void 0;
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-admin/firestore");
const apiWrapper_1 = require("../utils/apiWrapper");
const errorHandler_1 = require("../utils/errorHandler");
const fragranceCalculations_1 = require("../utils/fragranceCalculations");
const db = (0, firestore_1.getFirestore)();
/**
 * 庫存記錄管理器
 */
class InventoryRecordManager {
    static async createInventoryRecord(itemId, itemType, quantityChange, operatorId, remarks = '庫存異動') {
        try {
            const inventoryRecordRef = db.collection('inventory_records').doc();
            await inventoryRecordRef.set({
                changeDate: firestore_1.FieldValue.serverTimestamp(),
                changeReason: 'import_operation',
                operatorId,
                operatorName: '系統匯入',
                remarks,
                relatedDocumentId: itemId,
                relatedDocumentType: itemType,
                details: [{
                        itemId,
                        itemType,
                        quantityChange,
                    }]
            });
        }
        catch (error) {
            firebase_functions_1.logger.warn(`建立庫存記錄失敗`, { itemId, itemType, error });
        }
    }
}
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
/**
 * 批量匯入香精
 */
exports.importFragrances = apiWrapper_1.CrudApiHandlers.createCreateHandler('ImportFragrances', async (data, context, requestId) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    // 1. 驗證必填欄位
    errorHandler_1.ErrorHandler.validateRequired(data, ['fragrances']);
    const { fragrances } = data;
    if (!Array.isArray(fragrances) || fragrances.length === 0) {
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.INVALID_INPUT, '香精列表不能為空');
    }
    if (fragrances.length > 500) {
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.INVALID_INPUT, `批量匯入限制為500筆資料，目前有${fragrances.length}筆`);
    }
    const results = {
        successful: [],
        failed: [],
        summary: {
            total: fragrances.length,
            successful: 0,
            failed: 0,
            skipped: 0
        }
    };
    try {
        // 2. 預先載入所有供應商資料
        const suppliersSnapshot = await db.collection('suppliers').get();
        const suppliersMap = new Map();
        suppliersSnapshot.forEach(doc => {
            const supplierData = doc.data();
            suppliersMap.set(supplierData.name, doc.id);
        });
        // 3. 預先載入現有香精（用於檢查重複）
        const existingFragrancesSnapshot = await db.collection('fragrances').get();
        const existingFragrancesMap = new Map();
        existingFragrancesSnapshot.forEach(doc => {
            const data = doc.data();
            existingFragrancesMap.set(data.code, { id: doc.id, data });
        });
        // 4. 處理每個香精
        for (let i = 0; i < fragrances.length; i++) {
            const fragranceItem = fragrances[i];
            try {
                // 基本驗證
                if (!((_a = fragranceItem.code) === null || _a === void 0 ? void 0 : _a.trim())) {
                    throw new Error('香精代號為必填欄位');
                }
                if (!((_b = fragranceItem.name) === null || _b === void 0 ? void 0 : _b.trim())) {
                    throw new Error('香精名稱為必填欄位');
                }
                let code = fragranceItem.code.trim();
                // 移除CSV匯出時為保護前置0而添加的引號
                if (code.startsWith("'")) {
                    code = code.substring(1);
                }
                const name = fragranceItem.name.trim();
                const fragranceType = ((_c = fragranceItem.fragranceCategory) === null || _c === void 0 ? void 0 : _c.trim()) || ((_d = fragranceItem.fragranceType) === null || _d === void 0 ? void 0 : _d.trim()) || '';
                const fragranceStatus = ((_e = fragranceItem.fragranceStatus) === null || _e === void 0 ? void 0 : _e.trim()) || '啟用';
                const unit = ((_f = fragranceItem.unit) === null || _f === void 0 ? void 0 : _f.trim()) || 'KG';
                // 安全的數值轉換，處理字串和數字
                const parseNumber = (value, defaultValue = 0) => {
                    if (value === null || value === undefined || value === '')
                        return defaultValue;
                    const num = Number(String(value).replace(/['"]/g, '').trim());
                    return isNaN(num) ? defaultValue : num;
                };
                const currentStock = parseNumber(fragranceItem.currentStock, 0);
                const safetyStockLevel = parseNumber(fragranceItem.safetyStockLevel, 0);
                const costPerUnit = parseNumber(fragranceItem.costPerUnit, 0);
                const percentage = parseNumber(fragranceItem.percentage, 0);
                let pgRatio = parseNumber(fragranceItem.pgRatio, 50);
                let vgRatio = parseNumber(fragranceItem.vgRatio, 50);
                // 數值驗證
                if (currentStock < 0)
                    throw new Error('庫存數量不能為負數');
                if (safetyStockLevel < 0)
                    throw new Error('安全庫存不能為負數');
                if (costPerUnit < 0)
                    throw new Error('單位成本不能為負數');
                if (percentage < 0 || percentage > 100)
                    throw new Error('香精比例必須在0-100之間');
                if (pgRatio < 0 || pgRatio > 100)
                    throw new Error('PG比例必須在0-100之間');
                if (vgRatio < 0 || vgRatio > 100)
                    throw new Error('VG比例必須在0-100之間');
                // 自動修正 PG/VG 比例，確保總和為100%
                const correctedRatios = (0, fragranceCalculations_1.calculateCorrectRatios)(percentage);
                pgRatio = correctedRatios.pgRatio;
                vgRatio = correctedRatios.vgRatio;
                // 處理供應商
                let supplierRef;
                if ((_g = fragranceItem.supplierName) === null || _g === void 0 ? void 0 : _g.trim()) {
                    const supplierName = fragranceItem.supplierName.trim();
                    const supplierId = suppliersMap.get(supplierName);
                    if (!supplierId) {
                        throw new Error(`找不到供應商「${supplierName}」`);
                    }
                    supplierRef = db.collection('suppliers').doc(supplierId);
                }
                // 檢查是否已存在相同代號的香精 - 支援模糊查詢
                let fragranceId;
                let matchedCode = code;
                let existing = existingFragrancesMap.get(code);
                // 如果精確匹配失敗，嘗試模糊查詢（處理前置0問題）
                if (!existing) {
                    // 嘗試移除前置0
                    const codeWithoutLeadingZeros = code.replace(/^0+/, '');
                    if (codeWithoutLeadingZeros !== code && existingFragrancesMap.has(codeWithoutLeadingZeros)) {
                        existing = existingFragrancesMap.get(codeWithoutLeadingZeros);
                        matchedCode = codeWithoutLeadingZeros;
                        firebase_functions_1.logger.info(`香精代號模糊匹配：${code} → ${codeWithoutLeadingZeros}`);
                    }
                    // 嘗試添加前置0（一位到三位）
                    else {
                        for (let zeros = 1; zeros <= 3; zeros++) {
                            const codeWithLeadingZeros = '0'.repeat(zeros) + code;
                            if (existingFragrancesMap.has(codeWithLeadingZeros)) {
                                existing = existingFragrancesMap.get(codeWithLeadingZeros);
                                matchedCode = codeWithLeadingZeros;
                                firebase_functions_1.logger.info(`香精代號模糊匹配：${code} → ${codeWithLeadingZeros}`);
                                break;
                            }
                        }
                    }
                }
                if (existing) {
                    // 更新現有香精 - 智能差異比對
                    fragranceId = existing.id;
                    const existingData = existing.data;
                    const updateData = {};
                    let hasChanges = false;
                    // 比對所有欄位，只更新有差異的部分
                    // 文字欄位比對
                    if (name && name.trim() !== existingData.name) {
                        updateData.name = name.trim();
                        hasChanges = true;
                    }
                    if (fragranceType && fragranceType.trim() !== (existingData.fragranceType || '')) {
                        updateData.fragranceType = fragranceType.trim();
                        hasChanges = true;
                    }
                    if (fragranceStatus && fragranceStatus.trim() !== (existingData.fragranceStatus || '')) {
                        updateData.fragranceStatus = fragranceStatus.trim();
                        hasChanges = true;
                    }
                    if (unit && unit.trim() !== (existingData.unit || 'KG')) {
                        updateData.unit = unit.trim();
                        hasChanges = true;
                    }
                    // 數值欄位比對
                    if (currentStock !== (existingData.currentStock || 0)) {
                        updateData.currentStock = currentStock;
                        hasChanges = true;
                    }
                    if (safetyStockLevel !== (existingData.safetyStockLevel || 0)) {
                        updateData.safetyStockLevel = safetyStockLevel;
                        hasChanges = true;
                    }
                    if (costPerUnit !== (existingData.costPerUnit || 0)) {
                        updateData.costPerUnit = costPerUnit;
                        hasChanges = true;
                    }
                    if (percentage !== (existingData.percentage || 0)) {
                        updateData.percentage = percentage;
                        hasChanges = true;
                    }
                    if (pgRatio !== (existingData.pgRatio || 50)) {
                        updateData.pgRatio = pgRatio;
                        hasChanges = true;
                    }
                    if (vgRatio !== (existingData.vgRatio || 50)) {
                        updateData.vgRatio = vgRatio;
                        hasChanges = true;
                    }
                    // 供應商比對
                    if (supplierRef) {
                        const existingSupplierRefId = ((_h = existingData.supplierRef) === null || _h === void 0 ? void 0 : _h.id) || existingData.supplierId || null;
                        if (supplierRef.id !== existingSupplierRefId) {
                            updateData.supplierRef = supplierRef;
                            updateData.supplierId = supplierRef.id;
                            hasChanges = true;
                        }
                    }
                    // 只有有變更時才執行更新
                    if (hasChanges) {
                        updateData.updatedAt = firestore_1.FieldValue.serverTimestamp();
                        await db.collection('fragrances').doc(fragranceId).update(updateData);
                        firebase_functions_1.logger.info(`香精 ${code} 有變更，更新欄位:`, Object.keys(updateData));
                    }
                    else {
                        firebase_functions_1.logger.info(`香精 ${code} 無變更，跳過更新`);
                    }
                    // 如果庫存有變更，建立庫存紀錄
                    const oldStock = existing.data.currentStock || 0;
                    if (oldStock !== currentStock && ((_j = context.auth) === null || _j === void 0 ? void 0 : _j.uid)) {
                        await InventoryRecordManager.createInventoryRecord(fragranceId, 'fragrances', currentStock - oldStock, context.auth.uid, `批量匯入更新 - 從 ${oldStock} 更新為 ${currentStock}`);
                    }
                    if (hasChanges) {
                        results.successful.push({
                            code: matchedCode,
                            name: updateData.name || existing.data.name,
                            operation: 'updated',
                            message: `香精「${updateData.name || existing.data.name}」已更新 (${Object.keys(updateData).filter(k => k !== 'updatedAt').join(', ')})${matchedCode !== code ? ` [代號匹配: ${code} → ${matchedCode}]` : ''}`
                        });
                    }
                    else {
                        results.successful.push({
                            code: matchedCode,
                            name: existing.data.name,
                            operation: 'skipped',
                            message: `香精「${existing.data.name}」無變更，跳過更新${matchedCode !== code ? ` [代號匹配: ${code} → ${matchedCode}]` : ''}`
                        });
                    }
                }
                else {
                    // 建立新香精
                    const fragranceData = {
                        code,
                        name,
                        fragranceType,
                        fragranceStatus,
                        currentStock,
                        safetyStockLevel,
                        costPerUnit,
                        percentage,
                        pgRatio,
                        vgRatio,
                        unit,
                        createdAt: firestore_1.FieldValue.serverTimestamp(),
                        updatedAt: firestore_1.FieldValue.serverTimestamp(),
                    };
                    if (supplierRef) {
                        fragranceData.supplierRef = supplierRef;
                        fragranceData.supplierId = supplierRef.id;
                    }
                    const docRef = await db.collection('fragrances').add(fragranceData);
                    fragranceId = docRef.id;
                    // 建立初始庫存記錄
                    if (currentStock > 0 && ((_k = context.auth) === null || _k === void 0 ? void 0 : _k.uid)) {
                        await InventoryRecordManager.createInventoryRecord(fragranceId, 'fragrances', currentStock, context.auth.uid, `批量匯入初始庫存`);
                    }
                    // 更新本地快取
                    existingFragrancesMap.set(code, { id: fragranceId, data: fragranceData });
                    results.successful.push({
                        code: code,
                        name,
                        operation: 'created',
                        message: `香精「${name}」已建立，代號：${code}`
                    });
                }
                results.summary.successful++;
            }
            catch (itemError) {
                const errorMessage = itemError instanceof Error ? itemError.message : String(itemError);
                results.summary.failed++;
                results.failed.push({
                    item: fragranceItem,
                    error: errorMessage
                });
                firebase_functions_1.logger.warn(`香精匯入項目失敗`, {
                    index: i + 1,
                    item: fragranceItem,
                    error: errorMessage,
                    requestId
                });
            }
        }
        // 5. 記錄操作結果
        firebase_functions_1.logger.info(`香精批量匯入完成`, {
            total: results.summary.total,
            successful: results.summary.successful,
            failed: results.summary.failed,
            requestId
        });
        return results;
    }
    catch (error) {
        throw errorHandler_1.ErrorHandler.handle(error, `批量匯入香精`);
    }
});
//# sourceMappingURL=fragrances.js.map