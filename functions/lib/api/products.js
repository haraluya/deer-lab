"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeProductFragrance = exports.deleteProduct = exports.updateProduct = exports.createProduct = void 0;
// functions/src/api/products.ts
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
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
    await db.collection("products").add({
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
    return { success: true, code: productCode };
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
    await db.doc(`products/${productId}`).delete();
    return { success: true };
});
exports.changeProductFragrance = (0, https_1.onCall)(async (request) => {
    const { auth: contextAuth, data } = request;
    // await ensureCanManageProducts(contextAuth?.uid);
    const { productId, newFragranceId, reason } = data;
    if (!productId || !newFragranceId || !reason) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少 productId, newFragranceId, 或 reason。");
    }
    const productRef = db.doc(`products/${productId}`);
    const newFragranceRef = db.doc(`fragrances/${newFragranceId}`);
    const changedByRef = db.doc(`users/${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid}`);
    try {
        await db.runTransaction(async (transaction) => {
            var _a;
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists) {
                throw new https_1.HttpsError("not-found", "找不到指定的產品。");
            }
            const oldFragranceRef = (_a = productDoc.data()) === null || _a === void 0 ? void 0 : _a.currentFragranceRef;
            transaction.update(productRef, { currentFragranceRef: newFragranceRef, updatedAt: firestore_1.FieldValue.serverTimestamp(), });
            const historyRef = productRef.collection("fragranceHistory").doc();
            transaction.set(historyRef, { oldFragranceRef: oldFragranceRef || null, newFragranceRef: newFragranceRef, reason: reason, changedAt: firestore_1.FieldValue.serverTimestamp(), changedByRef: changedByRef, });
        });
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功更換產品 ${productId} 的香精。`);
        return { success: true, message: "香精更換成功並已記錄。" };
    }
    catch (error) {
        firebase_functions_1.logger.error(`更換產品 ${productId} 香精時發生錯誤:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "更換香精時發生未知錯誤。");
    }
});
//# sourceMappingURL=products.js.map