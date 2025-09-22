"use strict";
// functions/src/api/products.ts
/**
 * 🎯 德科斯特的實驗室 - 產品管理 API (已標準化)
 *
 * 升級時間：2025-09-12
 * 升級內容：套用統一 API 標準化架構
 * - 統一回應格式
 * - 統一錯誤處理
 * - 統一權限驗證
 * - 結構化日誌
 * - 保留複雜業務邏輯（香精狀態管理）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductFragranceHistory = exports.getFragranceChangeHistory = exports.changeProductFragrance = exports.updateFragranceStatusesRealtime = exports.deleteProduct = exports.updateProduct = exports.createProduct = void 0;
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const apiWrapper_1 = require("../utils/apiWrapper");
const errorHandler_1 = require("../utils/errorHandler");
const db = (0, firestore_1.getFirestore)();
// 內部輔助函數 - 更新香精狀態
async function updateFragranceStatuses(params) {
    const { newFragranceId, oldFragranceId, action, productId } = params;
    if (!newFragranceId && !oldFragranceId) {
        throw new https_1.HttpsError("invalid-argument", "必須提供 newFragranceId 或 oldFragranceId");
    }
    // 🔧 修復：在事務外部先查詢所有需要的數據
    let newFragranceProductCount = 0;
    let oldFragranceProductCount = 0;
    if (newFragranceId) {
        const newFragranceRef = db.doc(`fragrances/${newFragranceId}`);
        const newFragranceProducts = await db.collection('products')
            .where('currentFragranceRef', '==', newFragranceRef)
            .get();
        newFragranceProductCount = newFragranceProducts.size;
    }
    if (oldFragranceId) {
        const oldFragranceRef = db.doc(`fragrances/${oldFragranceId}`);
        const oldFragranceProducts = await db.collection('products')
            .where('currentFragranceRef', '==', oldFragranceRef)
            .get();
        oldFragranceProductCount = oldFragranceProducts.size;
    }
    return await db.runTransaction(async (transaction) => {
        // 處理新香精 - 如果原本是備用狀態，自動設為啟用
        if (newFragranceId) {
            const newFragranceRef = db.doc(`fragrances/${newFragranceId}`);
            const newFragranceDoc = await transaction.get(newFragranceRef);
            if (newFragranceDoc.exists) {
                const newFragranceData = newFragranceDoc.data();
                // 如果香精原本是備用狀態或沒有設定狀態，且非棄用狀態，則設為啟用
                if ((newFragranceData === null || newFragranceData === void 0 ? void 0 : newFragranceData.fragranceStatus) === '備用' ||
                    (!(newFragranceData === null || newFragranceData === void 0 ? void 0 : newFragranceData.fragranceStatus) && (newFragranceData === null || newFragranceData === void 0 ? void 0 : newFragranceData.fragranceStatus) !== '棄用')) {
                    transaction.update(newFragranceRef, {
                        fragranceStatus: '啟用',
                        usageCount: newFragranceProductCount,
                        lastUsedAt: firestore_1.FieldValue.serverTimestamp(),
                        updatedAt: firestore_1.FieldValue.serverTimestamp()
                    });
                    firebase_functions_1.logger.info(`香精 ${newFragranceId} 從備用狀態自動設為啟用狀態，使用產品數: ${newFragranceProductCount}`);
                }
                else if ((newFragranceData === null || newFragranceData === void 0 ? void 0 : newFragranceData.fragranceStatus) === '啟用') {
                    // 如果已經是啟用狀態，只更新使用數量
                    transaction.update(newFragranceRef, {
                        usageCount: newFragranceProductCount,
                        lastUsedAt: firestore_1.FieldValue.serverTimestamp(),
                        updatedAt: firestore_1.FieldValue.serverTimestamp()
                    });
                    firebase_functions_1.logger.info(`香精 ${newFragranceId} 保持啟用狀態，使用產品數更新為: ${newFragranceProductCount}`);
                }
                // 棄用狀態不做任何更新
            }
        }
        // 處理舊香精 - 檢查是否需要降級為備用
        if (oldFragranceId && oldFragranceId !== newFragranceId) {
            const oldFragranceRef = db.doc(`fragrances/${oldFragranceId}`);
            const oldFragranceDoc = await transaction.get(oldFragranceRef);
            if (oldFragranceDoc.exists) {
                const oldFragranceData = oldFragranceDoc.data();
                // 根據操作類型計算剩餘的產品數量
                let remainingProductCount = oldFragranceProductCount;
                if (action === 'update' || action === 'remove') {
                    // 更新或刪除操作，當前產品不再使用此香精
                    remainingProductCount = Math.max(0, oldFragranceProductCount - 1);
                }
                // 如果沒有其他產品使用此香精，且非棄用狀態，則設為備用
                if (remainingProductCount === 0 && (oldFragranceData === null || oldFragranceData === void 0 ? void 0 : oldFragranceData.fragranceStatus) !== '棄用') {
                    transaction.update(oldFragranceRef, {
                        fragranceStatus: '備用',
                        usageCount: 0,
                        updatedAt: firestore_1.FieldValue.serverTimestamp()
                    });
                    firebase_functions_1.logger.info(`香精 ${oldFragranceId} 因無產品使用，自動設為備用狀態`);
                }
                else if ((oldFragranceData === null || oldFragranceData === void 0 ? void 0 : oldFragranceData.fragranceStatus) !== '棄用') {
                    // 更新使用數量，保持原有狀態
                    transaction.update(oldFragranceRef, {
                        usageCount: remainingProductCount,
                        updatedAt: firestore_1.FieldValue.serverTimestamp()
                    });
                    firebase_functions_1.logger.info(`香精 ${oldFragranceId} 使用數量更新為: ${remainingProductCount}`);
                }
            }
        }
    });
}
/**
 * 建立新產品
 */
exports.createProduct = apiWrapper_1.CrudApiHandlers.createCreateHandler('Product', async (data, context, requestId) => {
    // 1. 驗證必填欄位
    errorHandler_1.ErrorHandler.validateRequired(data, ['name', 'seriesId', 'fragranceId']);
    const { name, seriesId, fragranceId, nicotineMg, targetProduction, specificMaterialIds, status } = data;
    try {
        // 2. 檢查產品系列是否存在
        const seriesRef = db.doc(`productSeries/${seriesId}`);
        const seriesDoc = await seriesRef.get();
        errorHandler_1.ErrorHandler.assertExists(seriesDoc.exists, '產品系列', seriesId);
        const seriesData = seriesDoc.data();
        const seriesCode = seriesData.code;
        const productType = seriesData.productType;
        // 3. 生成唯一產品編號（4位數字）
        const generateProductNumber = async () => {
            const maxAttempts = 100;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                const randomNumber = Math.floor(1000 + Math.random() * 9000); // 1000-9999
                const productNumber = String(randomNumber);
                // 檢查該系列中是否已存在此編號
                const existingProduct = await db.collection('products')
                    .where('seriesRef', '==', seriesRef)
                    .where('productNumber', '==', productNumber)
                    .limit(1)
                    .get();
                if (existingProduct.empty) {
                    return productNumber;
                }
            }
            throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.INTERNAL_ERROR, '無法生成唯一的產品編號，請重試');
        };
        const productNumber = await generateProductNumber();
        // 4. 將產品類型名稱轉換為代碼
        const productTypeCodeMap = {
            '罐裝油(BOT)': 'BOT',
            '一代棉芯煙彈(OMP)': 'OMP',
            '一代陶瓷芯煙彈(OTP)': 'OTP',
            '五代陶瓷芯煙彈(FTP)': 'FTP',
            '其他(ETC)': 'ETC',
        };
        const productTypeCode = productTypeCodeMap[productType] || 'ETC';
        const productCode = `${productTypeCode}-${seriesCode}-${productNumber}`;
        // 5. 準備引用
        const fragranceRef = db.doc(`fragrances/${fragranceId}`);
        const materialRefs = (specificMaterialIds || []).map((id) => db.doc(`materials/${id}`));
        // 6. 建立產品
        const productDocRef = await db.collection('products').add({
            name: name.trim(),
            code: productCode,
            productNumber,
            seriesRef,
            currentFragranceRef: fragranceRef,
            nicotineMg: Number(nicotineMg) || 0,
            targetProduction: Number(targetProduction) || 1,
            specificMaterials: materialRefs,
            status: status || '啟用',
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // 7. 觸發香精狀態實時更新
        try {
            await updateFragranceStatuses({
                newFragranceId: fragranceId,
                action: 'add',
                productId: productDocRef.id
            });
            firebase_functions_1.logger.info(`[${requestId}] 建立產品 ${productCode} 後，已觸發香精 ${fragranceId} 狀態更新`);
        }
        catch (statusUpdateError) {
            firebase_functions_1.logger.warn(`[${requestId}] 香精狀態更新警告:`, statusUpdateError);
            // 不拋出錯誤，因為主要操作已經成功
        }
        // 8. 返回標準化回應
        return {
            id: productDocRef.id,
            code: productCode,
            productNumber,
            message: `產品「${name}」(編號: ${productCode}) 已成功建立`,
            operation: 'created',
            resource: {
                type: 'product',
                name,
                code: productCode,
            }
        };
    }
    catch (error) {
        throw errorHandler_1.ErrorHandler.handle(error, `建立產品: ${name}`);
    }
});
/**
 * 更新產品資料
 */
exports.updateProduct = apiWrapper_1.CrudApiHandlers.createUpdateHandler('Product', async (data, context, requestId) => {
    var _a, _b, _c;
    // 1. 驗證必填欄位
    errorHandler_1.ErrorHandler.validateRequired(data, ['productId']);
    const { productId, name, seriesId, fragranceId, nicotineMg, specificMaterialIds, status, fragranceChangeInfo } = data;
    // 調試：檢查接收到的數據
    firebase_functions_1.logger.info(`[${requestId}] updateProduct 接收到的數據:`, {
        productId,
        hasFragranceChangeInfo: !!fragranceChangeInfo,
        fragranceChangeInfo
    });
    try {
        // 2. 檢查產品是否存在
        const productRef = db.doc(`products/${productId}`);
        const productDoc = await productRef.get();
        errorHandler_1.ErrorHandler.assertExists(productDoc.exists, '產品', productId);
        const currentProduct = productDoc.data();
        // 3. 準備更新資料
        const updateData = {
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        if (name !== undefined) {
            updateData.name = name.trim();
        }
        if (nicotineMg !== undefined) {
            updateData.nicotineMg = Number(nicotineMg) || 0;
        }
        if (status !== undefined) {
            updateData.status = status || '啟用';
        }
        // 4. 如果提供了系列ID，更新系列引用
        if (seriesId) {
            const seriesRef = db.doc(`productSeries/${seriesId}`);
            const seriesDoc = await seriesRef.get();
            errorHandler_1.ErrorHandler.assertExists(seriesDoc.exists, '產品系列', seriesId);
            updateData.seriesRef = seriesRef;
        }
        // 5. 如果提供了香精 ID，更新香精引用
        if (fragranceId) {
            const fragranceRef = db.doc(`fragrances/${fragranceId}`);
            updateData.currentFragranceRef = fragranceRef;
        }
        // 6. 如果提供了專屬材料ID，更新材料引用
        if (specificMaterialIds) {
            const materialRefs = specificMaterialIds.map((id) => db.doc(`materials/${id}`));
            updateData.specificMaterials = materialRefs;
        }
        // 7. 檢查是否需要更新香精狀態
        let oldFragranceId;
        if (fragranceId && currentProduct.currentFragranceRef) {
            oldFragranceId = currentProduct.currentFragranceRef.id;
        }
        // 8. 更新資料庫
        await productRef.update(updateData);
        // 9. 如果有香精更換，創建歷史記錄
        firebase_functions_1.logger.info(`[${requestId}] 香精更換檢查:`, {
            hasFragranceChangeInfo: !!fragranceChangeInfo,
            fragranceChangeInfo,
            isDifferent: fragranceChangeInfo ?
                fragranceChangeInfo.oldFragranceId !== fragranceChangeInfo.newFragranceId : false
        });
        if (fragranceChangeInfo && fragranceChangeInfo.oldFragranceId !== fragranceChangeInfo.newFragranceId) {
            firebase_functions_1.logger.info(`[${requestId}] 檢測到香精更換，準備創建歷史記錄:`, {
                oldFragranceId: fragranceChangeInfo.oldFragranceId,
                newFragranceId: fragranceChangeInfo.newFragranceId,
                reason: fragranceChangeInfo.changeReason
            });
            try {
                // 獲取當前用戶資訊
                const userId = ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'system';
                // 獲取舊香精和新香精的參考
                const oldFragranceRef = db.doc(`fragrances/${fragranceChangeInfo.oldFragranceId}`);
                const newFragranceRef = db.doc(`fragrances/${fragranceChangeInfo.newFragranceId}`);
                // 獲取香精詳細資訊
                const [oldFragranceDoc, newFragranceDoc] = await Promise.all([
                    oldFragranceRef.get(),
                    newFragranceRef.get()
                ]);
                const oldFragranceData = oldFragranceDoc.exists ? oldFragranceDoc.data() : null;
                const newFragranceData = newFragranceDoc.exists ? newFragranceDoc.data() : null;
                // 創建香精更換歷史記錄
                const historyRef = db.collection('fragranceChangeHistory').doc();
                await historyRef.set({
                    productId: productId,
                    productName: updateData.name || currentProduct.name,
                    productCode: currentProduct.code,
                    oldFragranceId: fragranceChangeInfo.oldFragranceId,
                    oldFragranceName: (oldFragranceData === null || oldFragranceData === void 0 ? void 0 : oldFragranceData.name) || '未知香精',
                    oldFragranceCode: (oldFragranceData === null || oldFragranceData === void 0 ? void 0 : oldFragranceData.code) || 'N/A',
                    newFragranceId: fragranceChangeInfo.newFragranceId,
                    newFragranceName: (newFragranceData === null || newFragranceData === void 0 ? void 0 : newFragranceData.name) || '未知香精',
                    newFragranceCode: (newFragranceData === null || newFragranceData === void 0 ? void 0 : newFragranceData.code) || 'N/A',
                    changeReason: fragranceChangeInfo.changeReason,
                    changeDate: firestore_1.FieldValue.serverTimestamp(),
                    changedBy: userId,
                    changedByEmail: ((_c = (_b = context.auth) === null || _b === void 0 ? void 0 : _b.token) === null || _c === void 0 ? void 0 : _c.email) || 'system',
                    createdAt: firestore_1.FieldValue.serverTimestamp()
                });
                firebase_functions_1.logger.info(`[${requestId}] 已創建香精更換歷史記錄:`, {
                    historyId: historyRef.id,
                    productId: productId,
                    collectionPath: 'fragranceChangeHistory'
                });
            }
            catch (historyError) {
                firebase_functions_1.logger.error(`[${requestId}] 創建香精更換歷史記錄失敗:`, historyError);
                // 不拋出錯誤，因為主要操作已經成功
            }
        }
        // 10. 觸發香精狀態更新（如果香精有變更）
        if (fragranceId) {
            try {
                await updateFragranceStatuses({
                    newFragranceId: fragranceId,
                    oldFragranceId: oldFragranceId !== fragranceId ? oldFragranceId : undefined,
                    action: 'update',
                    productId
                });
                firebase_functions_1.logger.info(`[${requestId}] 更新產品 ${productId} 後，已觸發香精狀態更新`);
            }
            catch (statusUpdateError) {
                firebase_functions_1.logger.warn(`[${requestId}] 香精狀態更新警告:`, statusUpdateError);
                // 不拋出錯誤，因為主要操作已經成功
            }
        }
        // 11. 返回標準化回應
        return {
            id: productId,
            message: `產品「${updateData.name || currentProduct.name}」的資料已成功更新`,
            operation: 'updated',
            resource: {
                type: 'product',
                name: updateData.name || currentProduct.name,
                code: currentProduct.code,
            }
        };
    }
    catch (error) {
        throw errorHandler_1.ErrorHandler.handle(error, `更新產品: ${productId}`);
    }
});
/**
 * 刪除產品
 */
exports.deleteProduct = apiWrapper_1.CrudApiHandlers.createDeleteHandler('Product', async (data, context, requestId) => {
    // 1. 驗證必填欄位
    errorHandler_1.ErrorHandler.validateRequired(data, ['id']);
    const { id: productId } = data;
    let fragranceId = null;
    let productData = null;
    try {
        // 2. 獲取產品資料以便後續香精狀態更新
        const productRef = db.doc(`products/${productId}`);
        const productDoc = await productRef.get();
        errorHandler_1.ErrorHandler.assertExists(productDoc.exists, '產品', productId);
        productData = productDoc.data();
        const productName = productData.name;
        const productCode = productData.code;
        // 3. 獲取香精參考
        const fragranceRef = productData.currentFragranceRef;
        if (fragranceRef) {
            fragranceId = fragranceRef.id;
        }
        // 4. 刪除產品
        await productRef.delete();
        // 5. 觸發香精狀態實時更新 - 檢查是否需要將香精設為備用
        if (fragranceId) {
            try {
                await updateFragranceStatuses({
                    oldFragranceId: fragranceId,
                    action: 'remove',
                    productId: productId
                });
                firebase_functions_1.logger.info(`[${requestId}] 刪除產品 ${productId} 後，已觸發香精 ${fragranceId} 狀態檢查`);
            }
            catch (statusUpdateError) {
                firebase_functions_1.logger.warn(`[${requestId}] 香精狀態更新警告:`, statusUpdateError);
                // 不拋出錯誤，因為主要操作已經成功
            }
        }
        // 6. 返回標準化回應
        return {
            id: productId,
            message: `產品「${productName}」(編號: ${productCode}) 已成功刪除`,
            operation: 'deleted',
            resource: {
                type: 'product',
                name: productName,
                code: productCode,
            }
        };
    }
    catch (error) {
        throw errorHandler_1.ErrorHandler.handle(error, `刪除產品: ${productId}`);
    }
});
/**
 * 實時更新香精狀態 - 核心功能
 * 根據產品使用情況自動更新香精的啟用/備用/棄用狀態
 */
exports.updateFragranceStatusesRealtime = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    const { newFragranceId, oldFragranceId, action, productId } = data;
    if (!newFragranceId && !oldFragranceId) {
        throw new https_1.HttpsError("invalid-argument", "必須提供 newFragranceId 或 oldFragranceId");
    }
    try {
        await db.runTransaction(async (transaction) => {
            const updates = {};
            // 處理新香精 - 自動設為啟用
            if (newFragranceId) {
                const newFragranceRef = db.doc(`fragrances/${newFragranceId}`);
                const newFragranceDoc = await transaction.get(newFragranceRef);
                if (newFragranceDoc.exists) {
                    const newFragranceData = newFragranceDoc.data();
                    // 查詢使用此香精的所有產品
                    const newFragranceProducts = await db.collection('products')
                        .where('currentFragranceRef', '==', newFragranceRef)
                        .get();
                    // 更新為啟用狀態，除非手動設為棄用
                    if ((newFragranceData === null || newFragranceData === void 0 ? void 0 : newFragranceData.status) !== 'deprecated') {
                        transaction.update(newFragranceRef, {
                            status: 'active',
                            usageCount: newFragranceProducts.size,
                            lastUsedAt: firestore_1.FieldValue.serverTimestamp(),
                            updatedAt: firestore_1.FieldValue.serverTimestamp()
                        });
                        firebase_functions_1.logger.info(`香精 ${newFragranceId} 自動設為啟用狀態，使用產品數: ${newFragranceProducts.size}`);
                    }
                }
            }
            // 處理舊香精 - 檢查是否需要降級為備用
            if (oldFragranceId) {
                const oldFragranceRef = db.doc(`fragrances/${oldFragranceId}`);
                const oldFragranceDoc = await transaction.get(oldFragranceRef);
                if (oldFragranceDoc.exists) {
                    const oldFragranceData = oldFragranceDoc.data();
                    // 查詢仍在使用此香精的產品（排除當前正在更換的產品）
                    const oldFragranceProductsQuery = db.collection('products')
                        .where('currentFragranceRef', '==', oldFragranceRef);
                    const oldFragranceProducts = await oldFragranceProductsQuery.get();
                    // 過濾掉正在更換的產品
                    const remainingProducts = oldFragranceProducts.docs.filter(doc => doc.id !== productId);
                    // 如果沒有其他產品使用，且不是手動設為棄用，則設為備用
                    if (remainingProducts.length === 0 && (oldFragranceData === null || oldFragranceData === void 0 ? void 0 : oldFragranceData.status) !== 'deprecated') {
                        transaction.update(oldFragranceRef, {
                            status: 'standby',
                            usageCount: 0,
                            updatedAt: firestore_1.FieldValue.serverTimestamp()
                        });
                        firebase_functions_1.logger.info(`香精 ${oldFragranceId} 自動設為備用狀態，無產品使用`);
                    }
                    else {
                        // 更新使用統計
                        transaction.update(oldFragranceRef, {
                            usageCount: remainingProducts.length,
                            updatedAt: firestore_1.FieldValue.serverTimestamp()
                        });
                        firebase_functions_1.logger.info(`香精 ${oldFragranceId} 仍有 ${remainingProducts.length} 個產品使用，保持當前狀態`);
                    }
                }
            }
        });
        return {
            success: true,
            message: "香精狀態已實時更新",
            updatedFragrances: {
                newFragrance: newFragranceId || null,
                oldFragrance: oldFragranceId || null
            }
        };
    }
    catch (error) {
        firebase_functions_1.logger.error("更新香精狀態時發生錯誤:", error);
        throw new https_1.HttpsError("internal", "更新香精狀態失敗");
    }
});
exports.changeProductFragrance = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    // await ensureCanManageProducts(contextAuth?.uid);
    const { productId, newFragranceId, reason } = data;
    if (!productId || !newFragranceId || !reason) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少 productId, newFragranceId, 或 reason。");
    }
    if (reason.length < 5) {
        throw new https_1.HttpsError("invalid-argument", "更換原因至少需要 5 個字元");
    }
    const productRef = db.doc(`products/${productId}`);
    const newFragranceRef = db.doc(`fragrances/${newFragranceId}`);
    const userRef = db.doc(`users/${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid}`);
    try {
        let oldFragranceId = null;
        let productData = null;
        let oldFragranceData = null;
        let newFragranceData = null;
        let userData = null;
        // 執行主要的更換操作
        await db.runTransaction(async (transaction) => {
            // 獲取所有相關資料
            const productDoc = await transaction.get(productRef);
            const newFragranceDoc = await transaction.get(newFragranceRef);
            const userDoc = await transaction.get(userRef);
            if (!productDoc.exists) {
                throw new https_1.HttpsError("not-found", "找不到指定的產品。");
            }
            if (!newFragranceDoc.exists) {
                throw new https_1.HttpsError("not-found", "找不到指定的新香精。");
            }
            productData = productDoc.data();
            newFragranceData = newFragranceDoc.data();
            userData = userDoc.data();
            const oldFragranceRef = productData === null || productData === void 0 ? void 0 : productData.currentFragranceRef;
            // 獲取舊香精資料
            if (oldFragranceRef) {
                const oldFragranceDoc = await transaction.get(oldFragranceRef);
                if (oldFragranceDoc.exists) {
                    oldFragranceData = oldFragranceDoc.data();
                    oldFragranceId = oldFragranceRef.id;
                }
            }
            // 更新產品的香精引用
            transaction.update(productRef, {
                currentFragranceRef: newFragranceRef,
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
            // 建立詳細的香精更換歷史記錄到獨立集合
            const historyRef = db.collection("fragranceChangeHistory").doc();
            transaction.set(historyRef, {
                productId: productId,
                productName: productData.name || '未知產品',
                productCode: productData.code || '未知代號',
                oldFragranceId: oldFragranceId || '',
                oldFragranceName: (oldFragranceData === null || oldFragranceData === void 0 ? void 0 : oldFragranceData.name) || '未知香精',
                oldFragranceCode: (oldFragranceData === null || oldFragranceData === void 0 ? void 0 : oldFragranceData.code) || '未知代號',
                newFragranceId: newFragranceId,
                newFragranceName: newFragranceData.name || '未知香精',
                newFragranceCode: newFragranceData.code || '未知代號',
                changeReason: reason,
                changeDate: firestore_1.FieldValue.serverTimestamp(),
                changedBy: (contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid) || '',
                changedByName: (userData === null || userData === void 0 ? void 0 : userData.name) || '未知用戶',
                createdAt: firestore_1.FieldValue.serverTimestamp()
            });
            // 保留舊版相容性 - 也寫入產品子集合
            const legacyHistoryRef = productRef.collection("fragranceHistory").doc();
            transaction.set(legacyHistoryRef, {
                oldFragranceRef: oldFragranceRef || null,
                newFragranceRef: newFragranceRef,
                reason: reason,
                changedAt: firestore_1.FieldValue.serverTimestamp(),
                changedByRef: userRef
            });
        });
        // 觸發實時香精狀態更新
        try {
            await updateFragranceStatuses({
                newFragranceId: newFragranceId,
                oldFragranceId: oldFragranceId,
                action: 'change',
                productId: productId
            });
            firebase_functions_1.logger.info(`已觸發香精狀態實時更新: 新香精 ${newFragranceId}, 舊香精 ${oldFragranceId}`);
        }
        catch (statusUpdateError) {
            firebase_functions_1.logger.warn("香精狀態更新警告 (主要操作已完成):", statusUpdateError);
            // 不拋出錯誤，因為主要操作已經成功
        }
        firebase_functions_1.logger.info(`用戶 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功更換產品 ${productId} 的香精: ${(oldFragranceData === null || oldFragranceData === void 0 ? void 0 : oldFragranceData.code) || '未知'} → ${(newFragranceData === null || newFragranceData === void 0 ? void 0 : newFragranceData.code) || '未知'}`);
        return {
            success: true,
            message: "香精更換成功並已記錄",
            data: {
                productId,
                productName: productData === null || productData === void 0 ? void 0 : productData.name,
                oldFragrance: oldFragranceData ? {
                    id: oldFragranceId,
                    name: oldFragranceData.name,
                    code: oldFragranceData.code
                } : null,
                newFragrance: {
                    id: newFragranceId,
                    name: newFragranceData.name,
                    code: newFragranceData.code
                },
                reason
            }
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`更換產品 ${productId} 香精時發生錯誤:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "更換香精時發生未知錯誤。");
    }
});
/**
 * 查詢香精更換歷史記錄 - 支援分頁和搜尋 (已標準化)
 */
exports.getFragranceChangeHistory = (0, apiWrapper_1.createApiHandler)({
    functionName: 'getFragranceChangeHistory',
    requireAuth: true,
    enableDetailedLogging: true,
    version: '1.0.0'
}, async (data, context, requestId) => {
    const { page = 1, pageSize = 10, searchTerm = '', productId = '', fragranceId = '', dateFrom = '', dateTo = '' } = data || {};
    let allDocs = [];
    if (fragranceId) {
        // 分別查詢作為舊香精和新香精的記錄
        const oldFragranceQuery = db.collection('fragranceChangeHistory')
            .where('oldFragranceId', '==', fragranceId);
        const newFragranceQuery = db.collection('fragranceChangeHistory')
            .where('newFragranceId', '==', fragranceId);
        const [oldResults, newResults] = await Promise.all([
            oldFragranceQuery.get(),
            newFragranceQuery.get()
        ]);
        // 合併結果，避免重複
        const docIds = new Set();
        [...oldResults.docs, ...newResults.docs].forEach(doc => {
            if (!docIds.has(doc.id)) {
                docIds.add(doc.id);
                allDocs.push(doc);
            }
        });
    }
    else {
        // 正常查詢流程
        let query = db.collection('fragranceChangeHistory');
        // 應用篩選條件
        if (productId) {
            query = query.where('productId', '==', productId);
        }
        // 日期範圍篩選（這需要複合索引）
        if (dateFrom && dateTo) {
            const fromDate = new Date(dateFrom);
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999); // 包含整天
            query = query.where('changeDate', '>=', fromDate)
                .where('changeDate', '<=', toDate);
        }
        // 按時間降序排列
        query = query.orderBy('changeDate', 'desc');
        const snapshot = await query.get();
        allDocs = snapshot.docs;
    }
    // 對文檔按時間排序（如果是香精ID查詢）
    if (fragranceId) {
        allDocs.sort((a, b) => {
            var _a, _b;
            const aDate = ((_a = a.data().changeDate) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date(0);
            const bDate = ((_b = b.data().changeDate) === null || _b === void 0 ? void 0 : _b.toDate()) || new Date(0);
            return bDate.getTime() - aDate.getTime();
        });
    }
    // 計算總數
    const total = allDocs.length;
    const totalPages = Math.ceil(total / pageSize);
    // 手動分頁
    const offset = (page - 1) * pageSize;
    const pagedDocs = allDocs.slice(offset, offset + pageSize);
    let records = pagedDocs.map(doc => {
        const data = doc.data();
        // 轉換 Timestamp 為可序列化的格式
        const processedData = Object.assign({ id: doc.id }, data);
        // 處理 changeDate 欄位
        if (data.changeDate) {
            if (data.changeDate.toDate && typeof data.changeDate.toDate === 'function') {
                processedData.changeDate = data.changeDate.toDate().toISOString();
            }
            else if (data.changeDate._seconds) {
                processedData.changeDate = new Date(data.changeDate._seconds * 1000).toISOString();
            }
        }
        // 處理 createdAt 欄位
        if (data.createdAt) {
            if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
                processedData.createdAt = data.createdAt.toDate().toISOString();
            }
            else if (data.createdAt._seconds) {
                processedData.createdAt = new Date(data.createdAt._seconds * 1000).toISOString();
            }
        }
        return processedData;
    });
    // 客戶端搜尋過濾（因為 Firestore 全文搜尋限制）
    if (searchTerm && searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase();
        records = records.filter((record) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return ((_a = record.productName) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchLower)) ||
                ((_b = record.productCode) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(searchLower)) ||
                ((_c = record.oldFragranceName) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(searchLower)) ||
                ((_d = record.oldFragranceCode) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes(searchLower)) ||
                ((_e = record.newFragranceName) === null || _e === void 0 ? void 0 : _e.toLowerCase().includes(searchLower)) ||
                ((_f = record.newFragranceCode) === null || _f === void 0 ? void 0 : _f.toLowerCase().includes(searchLower)) ||
                ((_g = record.changeReason) === null || _g === void 0 ? void 0 : _g.toLowerCase().includes(searchLower)) ||
                ((_h = record.changedByName) === null || _h === void 0 ? void 0 : _h.toLowerCase().includes(searchLower));
        });
    }
    // 返回標準化格式
    return {
        data: records,
        total: searchTerm ? records.length : total,
        totalPages: searchTerm ? Math.ceil(records.length / pageSize) : totalPages,
        page,
        pageSize
    };
});
/**
 * 獲取特定產品的香精更換歷史 - 用於產品詳情頁面
 */
exports.getProductFragranceHistory = (0, apiWrapper_1.createApiHandler)({
    functionName: 'getProductFragranceHistory',
    requireAuth: true,
    enableDetailedLogging: true,
    version: '1.0.0'
}, async (data, context, requestId) => {
    var _a;
    const { productId } = data;
    if (!productId) {
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.MISSING_REQUIRED_FIELD, '缺少 productId');
    }
    firebase_functions_1.logger.info(`[${requestId}] 查詢產品香精歷史`, { productId });
    try {
        // 首先檢查集合是否有任何資料
        const collectionSnapshot = await db.collection('fragranceChangeHistory').limit(1).get();
        firebase_functions_1.logger.info(`[${requestId}] fragranceChangeHistory 集合檢查：${collectionSnapshot.empty ? '空集合' : '有資料'}`);
        const query = db.collection('fragranceChangeHistory')
            .where('productId', '==', productId)
            .orderBy('changeDate', 'desc');
        const snapshot = await query.get();
        const records = snapshot.docs.map(doc => {
            const data = doc.data();
            // 🔧 修復：明確轉換 Firestore Timestamp 為 ISO 字串
            const processedData = Object.assign({ id: doc.id }, data);
            // 處理 changeDate 欄位
            if (data.changeDate) {
                if (data.changeDate.toDate && typeof data.changeDate.toDate === 'function') {
                    processedData.changeDate = data.changeDate.toDate().toISOString();
                }
                else if (data.changeDate._seconds) {
                    processedData.changeDate = new Date(data.changeDate._seconds * 1000).toISOString();
                }
            }
            // 處理 createdAt 欄位
            if (data.createdAt) {
                if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
                    processedData.createdAt = data.createdAt.toDate().toISOString();
                }
                else if (data.createdAt._seconds) {
                    processedData.createdAt = new Date(data.createdAt._seconds * 1000).toISOString();
                }
            }
            return processedData;
        });
        firebase_functions_1.logger.info(`[${requestId}] 產品 ${productId} 香精歷史查詢成功，找到 ${records.length} 筆記錄`);
        return {
            records,
            count: records.length,
            productId
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`[${requestId}] 獲取產品 ${productId} 香精歷史時發生錯誤:`, error);
        // 如果是索引錯誤，提供更友善的回應
        if (error.code === 9 && ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('index'))) {
            firebase_functions_1.logger.warn(`[${requestId}] Firestore 索引尚未完成建構，返回空結果`);
            return {
                records: [],
                count: 0,
                productId,
                message: '索引建構中，請稍後再試'
            };
        }
        throw new errorHandler_1.BusinessError(errorHandler_1.ApiErrorCode.DATABASE_ERROR, error.message || '查詢香精歷史失敗');
    }
});
//# sourceMappingURL=products.js.map