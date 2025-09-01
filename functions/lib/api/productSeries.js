"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProductSeries = exports.updateProductSeries = exports.createProductSeries = void 0;
// functions/src/api/productSeries.ts
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
exports.createProductSeries = (0, https_1.onCall)(async (request) => {
    const { data, auth: contextAuth } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    const { name, code, productType, commonMaterialIds } = data;
    if (!name || !code || !productType) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少系列名稱、系列代號或產品類型。");
    }
    try {
        const materialRefs = (commonMaterialIds || []).map((id) => db.collection("materials").doc(id));
        const newSeries = {
            name,
            code,
            productType,
            commonMaterials: materialRefs,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        const docRef = await db.collection("productSeries").add(newSeries);
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功建立新產品系列: ${docRef.id}`);
        return { status: "success", message: `產品系列 ${name} 已成功建立。` };
    }
    catch (error) {
        firebase_functions_1.logger.error("建立產品系列時發生錯誤:", error);
        throw new https_1.HttpsError("internal", "建立產品系列時發生未知錯誤。");
    }
});
exports.updateProductSeries = (0, https_1.onCall)(async (request) => {
    const { data, auth: contextAuth } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    const { seriesId, name, code, productType, commonMaterialIds } = data;
    if (!seriesId || !name || !code || !productType) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少系列 ID、名稱、代號或產品類型。");
    }
    try {
        const materialRefs = (commonMaterialIds || []).map((id) => db.collection("materials").doc(id));
        const seriesRef = db.collection("productSeries").doc(seriesId);
        // 先獲取舊的系列資料，用於比較產品類型是否改變
        const oldSeriesDoc = await seriesRef.get();
        const oldSeriesData = oldSeriesDoc.data();
        const oldProductType = oldSeriesData === null || oldSeriesData === void 0 ? void 0 : oldSeriesData.productType;
        // 更新系列資料
        await seriesRef.update({
            name,
            code,
            productType,
            commonMaterials: materialRefs,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // 如果產品類型改變了，需要更新該系列下所有產品的產品代號
        if (oldProductType !== productType) {
            // 將產品類型名稱轉換為代碼
            const productTypeCodeMap = {
                '罐裝油(BOT)': 'BOT',
                '一代棉芯煙彈(OMP)': 'OMP',
                '一代陶瓷芯煙彈(OTP)': 'OTP',
                '五代陶瓷芯煙彈(FTP)': 'FTP',
                '其他(ETC)': 'ETC',
            };
            const newProductTypeCode = productTypeCodeMap[productType] || 'ETC';
            // 查找該系列下的所有產品
            const productsQuery = await db.collection("products")
                .where("seriesRef", "==", seriesRef)
                .get();
            // 批量更新產品代號
            const batch = db.batch();
            productsQuery.docs.forEach(productDoc => {
                const productData = productDoc.data();
                const productNumber = productData.productNumber;
                if (productNumber) {
                    const newProductCode = `${newProductTypeCode}-${code}-${productNumber}`;
                    batch.update(productDoc.ref, {
                        code: newProductCode,
                        updatedAt: firestore_1.FieldValue.serverTimestamp()
                    });
                }
            });
            // 執行批量更新
            if (!productsQuery.empty) {
                await batch.commit();
                firebase_functions_1.logger.info(`已更新 ${productsQuery.size} 個產品的產品代號`);
            }
        }
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功更新產品系列: ${seriesId}`);
        return { status: "success", message: `產品系列 ${name} 已成功更新。` };
    }
    catch (error) {
        firebase_functions_1.logger.error(`更新產品系列 ${seriesId} 時發生錯誤:`, error);
        throw new https_1.HttpsError("internal", "更新產品系列時發生未知錯誤。");
    }
});
exports.deleteProductSeries = (0, https_1.onCall)(async (request) => {
    const { data, auth: contextAuth } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    const { seriesId } = data;
    if (!seriesId) {
        throw new https_1.HttpsError("invalid-argument", "請求缺少 seriesId。");
    }
    try {
        await db.collection("productSeries").doc(seriesId).delete();
        firebase_functions_1.logger.info(`管理員 ${contextAuth === null || contextAuth === void 0 ? void 0 : contextAuth.uid} 成功刪除產品系列: ${seriesId}`);
        return { status: "success", message: "產品系列已成功刪除。" };
    }
    catch (error) {
        firebase_functions_1.logger.error(`刪除產品系列 ${seriesId} 時發生錯誤:`, error);
        throw new https_1.HttpsError("internal", "刪除產品系列時發生未知錯誤。");
    }
});
//# sourceMappingURL=productSeries.js.map