"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductFragranceHistory = exports.getFragranceChangeHistory = exports.changeProductFragrance = exports.batchUpdateFragranceStatuses = exports.updateFragranceStatusesRealtime = exports.deleteProduct = exports.updateProduct = exports.createProduct = void 0;
// functions/src/api/products.ts
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// 內部輔助函數 - 更新香精狀態
async function updateFragranceStatuses(params) {
    const { newFragranceId, oldFragranceId, action, productId } = params;
    if (!newFragranceId && !oldFragranceId) {
        throw new https_1.HttpsError("invalid-argument", "必須提供 newFragranceId 或 oldFragranceId");
    }
    return await db.runTransaction(async (transaction) => {
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
                let oldFragranceProductsQuery = db.collection('products')
                    .where('currentFragranceRef', '==', oldFragranceRef);
                const oldFragranceProducts = await oldFragranceProductsQuery.get();
                // 檢查剩餘的產品數量（排除當前產品）
                const remainingProducts = oldFragranceProducts.docs.filter(doc => doc.id !== productId);
                // 如果沒有其他產品使用此香精，且非棄用狀態，則設為備用
                if (remainingProducts.length === 0 && (oldFragranceData === null || oldFragranceData === void 0 ? void 0 : oldFragranceData.status) !== 'deprecated') {
                    transaction.update(oldFragranceRef, {
                        status: 'standby',
                        usageCount: 0,
                        updatedAt: firestore_1.FieldValue.serverTimestamp()
                    });
                    firebase_functions_1.logger.info(`香精 ${oldFragranceId} 自動設為備用狀態（無產品使用）`);
                }
                else {
                    // 更新使用數量
                    transaction.update(oldFragranceRef, {
                        usageCount: remainingProducts.length,
                        updatedAt: firestore_1.FieldValue.serverTimestamp()
                    });
                    firebase_functions_1.logger.info(`香精 ${oldFragranceId} 使用數量更新為: ${remainingProducts.length}`);
                }
            }
        }
    });
}
exports.createProduct = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    // await ensureCanManageProducts(contextAuth?.uid);
    const { name, seriesId, fragranceId, nicotineMg, targetProduction, specificMaterialIds, status } = data;
    if (!name || !seriesId || !fragranceId) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少產品名稱、系列或香精。");
    }
    const seriesRef = db.doc(`productSeries/${seriesId}`);
    const seriesDoc = await seriesRef.get();
    if (!seriesDoc.exists) {
        throw new https_1.HttpsError("not-found", "指定的產品系列不存在");
    }
    const seriesData = seriesDoc.data();
    const seriesCode = seriesData === null || seriesData === void 0 ? void 0 : seriesData.code;
    const productType = seriesData === null || seriesData === void 0 ? void 0 : seriesData.productType;
    // 生成產品編號（4位數字，確保不重複）
    const generateProductNumber = async (seriesId) => {
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
        throw new https_1.HttpsError("internal", "無法生成唯一的產品編號，請重試。");
    };
    const productNumber = await generateProductNumber(seriesId);
    // 將產品類型名稱轉換為代碼
    const productTypeCodeMap = {
        '罐裝油(BOT)': 'BOT',
        '一代棉芯煙彈(OMP)': 'OMP',
        '一代陶瓷芯煙彈(OTP)': 'OTP',
        '五代陶瓷芯煙彈(FTP)': 'FTP',
        '其他(ETC)': 'ETC',
    };
    const productTypeCode = productTypeCodeMap[productType] || 'ETC';
    const productCode = `${productTypeCode}-${seriesCode}-${productNumber}`;
    const fragranceRef = db.doc(`fragrances/${fragranceId}`);
    const materialRefs = (specificMaterialIds || []).map((id) => db.doc(`materials/${id}`));
    // 建立產品
    const productDocRef = await db.collection("products").add({
        name,
        code: productCode,
        productNumber,
        seriesRef,
        currentFragranceRef: fragranceRef,
        nicotineMg: Number(nicotineMg) || 0,
        targetProduction: Number(targetProduction) || 1,
        specificMaterials: materialRefs,
        status: status || '啟用',
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // 觸發香精狀態實時更新 - 新產品使用香精，設為啟用
    try {
        await updateFragranceStatuses({
            newFragranceId: fragranceId,
            action: 'add',
            productId: productDocRef.id
        });
        firebase_functions_1.logger.info(`建立產品 ${productCode} 後，已觸發香精 ${fragranceId} 狀態更新`);
    }
    catch (statusUpdateError) {
        firebase_functions_1.logger.warn("香精狀態更新警告 (產品建立已完成):", statusUpdateError);
        // 不拋出錯誤，因為主要操作已經成功
    }
    return { success: true, code: productCode, productId: productDocRef.id };
});
exports.updateProduct = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    // await ensureCanManageProducts(contextAuth?.uid);
    const { productId, name, seriesId, fragranceId, nicotineMg, specificMaterialIds, status } = data;
    if (!productId) {
        throw new https_1.HttpsError("invalid-argument", "缺少 productId");
    }
    const productRef = db.doc(`products/${productId}`);
    // 準備更新數據
    const updateData = {
        name,
        nicotineMg: Number(nicotineMg) || 0,
        status: status || '啟用',
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    // 如果提供了系列ID，更新系列引用
    if (seriesId) {
        const seriesRef = db.doc(`productSeries/${seriesId}`);
        const seriesDoc = await seriesRef.get();
        if (!seriesDoc.exists) {
            throw new https_1.HttpsError("not-found", "指定的產品系列不存在");
        }
        updateData.seriesRef = seriesRef;
    }
    // 如果提供了香精ID，更新香精引用
    if (fragranceId) {
        const fragranceRef = db.doc(`fragrances/${fragranceId}`);
        updateData.currentFragranceRef = fragranceRef;
    }
    // 如果提供了專屬材料ID，更新材料引用
    if (specificMaterialIds) {
        const materialRefs = specificMaterialIds.map((id) => db.doc(`materials/${id}`));
        updateData.specificMaterials = materialRefs;
    }
    await productRef.update(updateData);
    return { success: true };
});
exports.deleteProduct = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    // await ensureCanManageProducts(contextAuth?.uid);
    const { productId } = data;
    if (!productId) {
        throw new https_1.HttpsError("invalid-argument", "缺少 productId");
    }
    let fragranceId = null;
    let productData = null;
    try {
        // 先獲取產品資料以便後續香精狀態更新
        const productRef = db.doc(`products/${productId}`);
        const productDoc = await productRef.get();
        if (productDoc.exists) {
            productData = productDoc.data();
            const fragranceRef = productData === null || productData === void 0 ? void 0 : productData.currentFragranceRef;
            if (fragranceRef) {
                fragranceId = fragranceRef.id;
            }
        }
        // 刪除產品
        await productRef.delete();
        // 觸發香精狀態實時更新 - 檢查是否需要將香精設為備用
        if (fragranceId) {
            try {
                await updateFragranceStatuses({
                    oldFragranceId: fragranceId,
                    action: 'remove',
                    productId: productId
                });
                firebase_functions_1.logger.info(`刪除產品 ${productId} 後，已觸發香精 ${fragranceId} 狀態檢查`);
            }
            catch (statusUpdateError) {
                firebase_functions_1.logger.warn("香精狀態更新警告 (產品刪除已完成):", statusUpdateError);
                // 不拋出錯誤，因為主要操作已經成功
            }
        }
        return {
            success: true,
            deletedProduct: {
                id: productId,
                name: productData === null || productData === void 0 ? void 0 : productData.name,
                fragranceId
            }
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`刪除產品 ${productId} 時發生錯誤:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "刪除產品時發生未知錯誤");
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
/**
 * 批次檢查並更新所有香精狀態 - 系統維護用
 */
exports.batchUpdateFragranceStatuses = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth } = request;
    // await ensureCanManageProducts(contextAuth?.uid); // 需要管理權限
    try {
        const fragrancesSnapshot = await db.collection('fragrances').get();
        const updatePromises = [];
        for (const fragranceDoc of fragrancesSnapshot.docs) {
            const fragranceData = fragranceDoc.data();
            // 跳過已棄用的香精
            if (fragranceData.status === 'deprecated')
                continue;
            // 查詢使用此香精的產品
            const fragranceRef = db.doc(`fragrances/${fragranceDoc.id}`);
            const productsQuery = db.collection('products')
                .where('currentFragranceRef', '==', fragranceRef);
            const updatePromise = productsQuery.get().then(async (productsSnapshot) => {
                const usageCount = productsSnapshot.size;
                const newStatus = usageCount > 0 ? 'active' : 'standby';
                if (fragranceData.status !== newStatus) {
                    await fragranceRef.update({
                        status: newStatus,
                        usageCount,
                        updatedAt: firestore_1.FieldValue.serverTimestamp()
                    });
                    firebase_functions_1.logger.info(`批次更新香精 ${fragranceDoc.id} 狀態: ${fragranceData.status} → ${newStatus}`);
                }
                else {
                    // 只更新統計數據
                    await fragranceRef.update({
                        usageCount,
                        updatedAt: firestore_1.FieldValue.serverTimestamp()
                    });
                }
            });
            updatePromises.push(updatePromise);
        }
        await Promise.all(updatePromises);
        return {
            success: true,
            message: `已檢查並更新 ${fragrancesSnapshot.size} 個香精的狀態`,
            processedCount: fragrancesSnapshot.size
        };
    }
    catch (error) {
        firebase_functions_1.logger.error("批次更新香精狀態時發生錯誤:", error);
        throw new https_1.HttpsError("internal", "批次更新香精狀態失敗");
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
 * 查詢香精更換歷史記錄 - 支援分頁和搜尋
 */
exports.getFragranceChangeHistory = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    // 權限檢查可以在這裡加入
    const { page = 1, pageSize = 10, searchTerm = '', productId = '', fragranceId = '', dateFrom = '', dateTo = '' } = data || {};
    try {
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
        let records = pagedDocs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
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
        return {
            success: true,
            data: records,
            pagination: {
                page,
                pageSize,
                total: searchTerm ? records.length : total,
                totalPages: searchTerm ? Math.ceil(records.length / pageSize) : totalPages
            }
        };
    }
    catch (error) {
        firebase_functions_1.logger.error("查詢香精更換歷史時發生錯誤:", error);
        throw new https_1.HttpsError("internal", "查詢香精更換歷史失敗");
    }
});
/**
 * 獲取特定產品的香精更換歷史 - 用於產品詳情頁面
 */
exports.getProductFragranceHistory = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    const { productId } = data;
    if (!productId) {
        throw new https_1.HttpsError("invalid-argument", "缺少 productId");
    }
    try {
        const query = db.collection('fragranceChangeHistory')
            .where('productId', '==', productId)
            .orderBy('changeDate', 'desc');
        const snapshot = await query.get();
        const records = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return {
            success: true,
            data: records,
            count: records.length
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`獲取產品 ${productId} 香精歷史時發生錯誤:`, error);
        throw new https_1.HttpsError("internal", "獲取產品香精歷史失敗");
    }
});
//# sourceMappingURL=products.js.map