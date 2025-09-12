// functions/src/api/productSeries.ts
import { logger } from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { apiWrapper } from "../utils/apiWrapper";
import { BusinessError, ERROR_CODES, ErrorHandler } from "../utils/errorHandler";
import { requireAuth } from "../middleware/auth";
import { ensureIsAdmin } from "../utils/auth";

const db = getFirestore();

export const createProductSeries = onCall(apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { data, auth: contextAuth } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    const { name, code, productType, commonMaterialIds } = data;
    
    if (!name || !code || !productType) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        missingFields: ['name', 'code', 'productType'],
        message: "系列名稱、系列代號和產品類型為必要欄位"
      });
    }
    
    try {
      const materialRefs = (commonMaterialIds || []).map((id: string) => db.collection("materials").doc(id));
      const newSeries = {
        name,
        code,
        productType,
        commonMaterials: materialRefs,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      
      const docRef = await db.collection("productSeries").add(newSeries);
      
      logger.info(`管理員 ${contextAuth?.uid} 成功建立新產品系列: ${docRef.id}`);
      
      return {
        seriesId: docRef.id,
        name: name,
        code: code,
        productType: productType,
        message: `產品系列 ${name} 已成功建立`
      };
    } catch (error: any) {
      ErrorHandler.handle(error, `建立產品系列 ${name}`, contextAuth?.uid);
    }
  }
}));

export const updateProductSeries = onCall(apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { data, auth: contextAuth } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    const { seriesId, name, code, productType, commonMaterialIds } = data;
    
    if (!seriesId || !name || !code || !productType) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        missingFields: ['seriesId', 'name', 'code', 'productType'],
        message: "系列 ID、名稱、代號和產品類型為必要欄位"
      });
    }
    
    try {
      const materialRefs = (commonMaterialIds || []).map((id: string) => db.collection("materials").doc(id));
      const seriesRef = db.collection("productSeries").doc(seriesId);
      
      // 先獲取舊的系列資料，用於比較產品類型是否改變
      const oldSeriesDoc = await seriesRef.get();
      if (!oldSeriesDoc.exists) {
        throw new BusinessError(ERROR_CODES.RESOURCE_NOT_FOUND, {
          message: "找不到指定的產品系列",
          resourceType: "產品系列",
          resourceId: seriesId
        });
      }
      
      const oldSeriesData = oldSeriesDoc.data();
      const oldProductType = oldSeriesData?.productType;
      
      // 更新系列資料
      await seriesRef.update({
        name,
        code,
        productType,
        commonMaterials: materialRefs,
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      let updatedProductsCount = 0;
      
      // 如果產品類型改變了，需要更新該系列下所有產品的產品代號
      if (oldProductType !== productType) {
        // 將產品類型名稱轉換為代碼
        const productTypeCodeMap: { [key: string]: string } = {
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
              updatedAt: FieldValue.serverTimestamp()
            });
          }
        });
        
        // 執行批量更新
        if (!productsQuery.empty) {
          await batch.commit();
          updatedProductsCount = productsQuery.size;
          logger.info(`已更新 ${updatedProductsCount} 個產品的產品代號`);
        }
      }
      
      logger.info(`管理員 ${contextAuth?.uid} 成功更新產品系列: ${seriesId}`);
      
      return {
        seriesId: seriesId,
        name: name,
        code: code,
        productType: productType,
        productTypeChanged: oldProductType !== productType,
        updatedProductsCount: updatedProductsCount,
        message: `產品系列 ${name} 已成功更新${updatedProductsCount > 0 ? `，並更新了 ${updatedProductsCount} 個產品代號` : ''}`
      };
    } catch (error: any) {
      ErrorHandler.handle(error, `更新產品系列 ${seriesId}`, contextAuth?.uid);
    }
  }
}));

export const deleteProductSeries = onCall(apiWrapper({
  requireAuth: true,
  handler: async (request) => {
    const { data, auth: contextAuth } = request;
    // await ensureIsAdmin(contextAuth?.uid);
    const { seriesId } = data;
    
    if (!seriesId) {
      throw new BusinessError(ERROR_CODES.MISSING_REQUIRED_FIELD, {
        missingFields: ['seriesId']
      });
    }
    
    try {
      // 獲取系列資料以便記錄
      const seriesDoc = await db.collection("productSeries").doc(seriesId).get();
      const seriesName = seriesDoc.exists ? seriesDoc.data()?.name : seriesId;
      
      await db.collection("productSeries").doc(seriesId).delete();
      
      logger.info(`管理員 ${contextAuth?.uid} 成功刪除產品系列: ${seriesId}`);
      
      return {
        seriesId: seriesId,
        seriesName: seriesName,
        message: "產品系列已成功刪除"
      };
    } catch (error: any) {
      ErrorHandler.handle(error, `刪除產品系列 ${seriesId}`, contextAuth?.uid);
    }
  }
}));
