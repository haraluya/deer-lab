// functions/src/api/products.ts
/**
 * 🎯 鹿鹿小作坊 - 產品管理 API (已標準化)
 * 
 * 升級時間：2025-09-12
 * 升級內容：套用統一 API 標準化架構
 * - 統一回應格式
 * - 統一錯誤處理
 * - 統一權限驗證
 * - 結構化日誌
 * - 保留複雜業務邏輯（香精狀態管理）
 */

import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createApiHandler, CrudApiHandlers } from "../utils/apiWrapper";
import { BusinessError, ApiErrorCode, ErrorHandler } from "../utils/errorHandler";
import { Permission, UserRole } from "../middleware/auth";
import { StandardResponses } from "../types/api";

const db = getFirestore();

// 內部輔助函數 - 更新香精狀態
async function updateFragranceStatuses(params: {
  newFragranceId?: string;
  oldFragranceId?: string;
  action: string;
  productId: string;
}) {
  const { newFragranceId, oldFragranceId, action, productId } = params;

  if (!newFragranceId && !oldFragranceId) {
    throw new HttpsError("invalid-argument", "必須提供 newFragranceId 或 oldFragranceId");
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
        if (newFragranceData?.fragranceStatus !== '棄用') {
          transaction.update(newFragranceRef, {
            fragranceStatus: '啟用',
            usageCount: newFragranceProducts.size,
            lastUsedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });
          logger.info(`香精 ${newFragranceId} 自動設為啟用狀態，使用產品數: ${newFragranceProducts.size}`);
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
        if (remainingProducts.length === 0 && oldFragranceData?.fragranceStatus !== '棄用') {
          transaction.update(oldFragranceRef, {
            fragranceStatus: '備用',
            usageCount: 0,
            updatedAt: FieldValue.serverTimestamp()
          });
          logger.info(`香精 ${oldFragranceId} 自動設為備用狀態（無產品使用）`);
        } else {
          // 更新使用數量
          transaction.update(oldFragranceRef, {
            usageCount: remainingProducts.length,
            updatedAt: FieldValue.serverTimestamp()
          });
          logger.info(`香精 ${oldFragranceId} 使用數量更新為: ${remainingProducts.length}`);
        }
      }
    }
  });
}

/**
 * 建立產品請求介面
 */
interface CreateProductRequest {
  name: string;
  seriesId: string;
  fragranceId: string;
  nicotineMg?: number;
  targetProduction?: number;
  specificMaterialIds?: string[];
  status?: string;
}

/**
 * 產品建立回應介面
 */
interface CreateProductResponse extends StandardResponses.CrudResponse {
  code: string;
  productNumber: string;
}

/**
 * 建立新產品
 */
export const createProduct = CrudApiHandlers.createCreateHandler<CreateProductRequest, CreateProductResponse>(
  'Product',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['name', 'seriesId', 'fragranceId']);
    
    const { name, seriesId, fragranceId, nicotineMg, targetProduction, specificMaterialIds, status } = data;
    
    try {
      // 2. 檢查產品系列是否存在
      const seriesRef = db.doc(`productSeries/${seriesId}`);
      const seriesDoc = await seriesRef.get();
      
      ErrorHandler.assertExists(seriesDoc.exists, '產品系列', seriesId);
      
      const seriesData = seriesDoc.data()!;
      const seriesCode = seriesData.code;
      const productType = seriesData.productType;
      
      // 3. 生成唯一產品編號（4位數字）
      const generateProductNumber = async (): Promise<string> => {
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
        throw new BusinessError(
          ApiErrorCode.INTERNAL_ERROR,
          '無法生成唯一的產品編號，請重試'
        );
      };
      
      const productNumber = await generateProductNumber();
      
      // 4. 將產品類型名稱轉換為代碼
      const productTypeCodeMap: { [key: string]: string } = {
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
      const materialRefs = (specificMaterialIds || []).map((id: string) => db.doc(`materials/${id}`));
      
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
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      // 7. 觸發香精狀態實時更新
      try {
        await updateFragranceStatuses({
          newFragranceId: fragranceId,
          action: 'add',
          productId: productDocRef.id
        });
        logger.info(`[${requestId}] 建立產品 ${productCode} 後，已觸發香精 ${fragranceId} 狀態更新`);
      } catch (statusUpdateError) {
        logger.warn(`[${requestId}] 香精狀態更新警告:`, statusUpdateError);
        // 不拋出錯誤，因為主要操作已經成功
      }
      
      // 8. 返回標準化回應
      return {
        id: productDocRef.id,
        code: productCode,
        productNumber,
        message: `產品「${name}」(編號: ${productCode}) 已成功建立`,
        operation: 'created' as const,
        resource: {
          type: 'product',
          name,
          code: productCode,
        }
      };
      
    } catch (error) {
      throw ErrorHandler.handle(error, `建立產品: ${name}`);
    }
  }
);

/**
 * 更新產品請求介面
 */
interface UpdateProductRequest {
  productId: string;
  name?: string;
  seriesId?: string;
  fragranceId?: string;
  nicotineMg?: number;
  specificMaterialIds?: string[];
  status?: string;
  fragranceChangeInfo?: {
    oldFragranceId: string;
    newFragranceId: string;
    changeReason: string;
  };
}

/**
 * 更新產品資料
 */
export const updateProduct = CrudApiHandlers.createUpdateHandler<UpdateProductRequest, StandardResponses.CrudResponse>(
  'Product',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['productId']);

    const { productId, name, seriesId, fragranceId, nicotineMg, specificMaterialIds, status, fragranceChangeInfo } = data;
    
    try {
      // 2. 檢查產品是否存在
      const productRef = db.doc(`products/${productId}`);
      const productDoc = await productRef.get();
      
      ErrorHandler.assertExists(productDoc.exists, '產品', productId);
      
      const currentProduct = productDoc.data()!;
      
      // 3. 準備更新資料
      const updateData: any = {
        updatedAt: FieldValue.serverTimestamp(),
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
        
        ErrorHandler.assertExists(seriesDoc.exists, '產品系列', seriesId);
        
        updateData.seriesRef = seriesRef;
      }
      
      // 5. 如果提供了香精 ID，更新香精引用
      if (fragranceId) {
        const fragranceRef = db.doc(`fragrances/${fragranceId}`);
        updateData.currentFragranceRef = fragranceRef;
      }
      
      // 6. 如果提供了專屬材料ID，更新材料引用
      if (specificMaterialIds) {
        const materialRefs = specificMaterialIds.map((id: string) => db.doc(`materials/${id}`));
        updateData.specificMaterials = materialRefs;
      }
      
      // 7. 檢查是否需要更新香精狀態
      let oldFragranceId: string | undefined;
      if (fragranceId && currentProduct.currentFragranceRef) {
        oldFragranceId = currentProduct.currentFragranceRef.id;
      }
      
      // 8. 更新資料庫
      await productRef.update(updateData);

      // 9. 如果有香精更換，創建歷史記錄
      if (fragranceChangeInfo && fragranceChangeInfo.oldFragranceId !== fragranceChangeInfo.newFragranceId) {
        try {
          // 獲取當前用戶資訊
          const userId = context.auth?.uid || 'system';

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
            oldFragranceName: oldFragranceData?.name || '未知香精',
            oldFragranceCode: oldFragranceData?.code || 'N/A',
            newFragranceId: fragranceChangeInfo.newFragranceId,
            newFragranceName: newFragranceData?.name || '未知香精',
            newFragranceCode: newFragranceData?.code || 'N/A',
            changeReason: fragranceChangeInfo.changeReason,
            changeDate: FieldValue.serverTimestamp(),
            changedBy: userId,
            changedByEmail: context.auth?.token?.email || 'system',
            createdAt: FieldValue.serverTimestamp()
          });

          logger.info(`[${requestId}] 已創建香精更換歷史記錄 for product ${productId}`);
        } catch (historyError) {
          logger.error(`[${requestId}] 創建香精更換歷史記錄失敗:`, historyError);
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
          logger.info(`[${requestId}] 更新產品 ${productId} 後，已觸發香精狀態更新`);
        } catch (statusUpdateError) {
          logger.warn(`[${requestId}] 香精狀態更新警告:`, statusUpdateError);
          // 不拋出錯誤，因為主要操作已經成功
        }
      }
      
      // 11. 返回標準化回應
      return {
        id: productId,
        message: `產品「${updateData.name || currentProduct.name}」的資料已成功更新`,
        operation: 'updated' as const,
        resource: {
          type: 'product',
          name: updateData.name || currentProduct.name,
          code: currentProduct.code,
        }
      };
      
    } catch (error) {
      throw ErrorHandler.handle(error, `更新產品: ${productId}`);
    }
  }
);

/**
 * 刪除產品請求介面
 */
interface DeleteProductRequest {
  productId: string;
}

/**
 * 刪除產品
 */
export const deleteProduct = CrudApiHandlers.createDeleteHandler<DeleteProductRequest, StandardResponses.CrudResponse>(
  'Product',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['productId']);
    
    const { productId } = data;
    
    let fragranceId: string | null = null;
    let productData: any = null;
    
    try {
      // 2. 獲取產品資料以便後續香精狀態更新
      const productRef = db.doc(`products/${productId}`);
      const productDoc = await productRef.get();
      
      ErrorHandler.assertExists(productDoc.exists, '產品', productId);
      
      productData = productDoc.data()!;
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
          logger.info(`[${requestId}] 刪除產品 ${productId} 後，已觸發香精 ${fragranceId} 狀態檢查`);
        } catch (statusUpdateError) {
          logger.warn(`[${requestId}] 香精狀態更新警告:`, statusUpdateError);
          // 不拋出錯誤，因為主要操作已經成功
        }
      }
      
      // 6. 返回標準化回應
      return {
        id: productId,
        message: `產品「${productName}」(編號: ${productCode}) 已成功刪除`,
        operation: 'deleted' as const,
        resource: {
          type: 'product',
          name: productName,
          code: productCode,
        }
      };
      
    } catch (error) {
      throw ErrorHandler.handle(error, `刪除產品: ${productId}`);
    }
  }
);

/**
 * 實時更新香精狀態 - 核心功能
 * 根據產品使用情況自動更新香精的啟用/備用/棄用狀態
 */
export const updateFragranceStatusesRealtime = onCall(async (request) => {
  const { auth: contextAuth, data } = request;
  const { newFragranceId, oldFragranceId, action, productId } = data;

  if (!newFragranceId && !oldFragranceId) {
    throw new HttpsError("invalid-argument", "必須提供 newFragranceId 或 oldFragranceId");
  }

  try {
    await db.runTransaction(async (transaction) => {
      const updates: { [key: string]: any } = {};

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
          if (newFragranceData?.status !== 'deprecated') {
            transaction.update(newFragranceRef, {
              status: 'active',
              usageCount: newFragranceProducts.size,
              lastUsedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp()
            });
            logger.info(`香精 ${newFragranceId} 自動設為啟用狀態，使用產品數: ${newFragranceProducts.size}`);
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
          if (remainingProducts.length === 0 && oldFragranceData?.status !== 'deprecated') {
            transaction.update(oldFragranceRef, {
              status: 'standby',
              usageCount: 0,
              updatedAt: FieldValue.serverTimestamp()
            });
            logger.info(`香精 ${oldFragranceId} 自動設為備用狀態，無產品使用`);
          } else {
            // 更新使用統計
            transaction.update(oldFragranceRef, {
              usageCount: remainingProducts.length,
              updatedAt: FieldValue.serverTimestamp()
            });
            logger.info(`香精 ${oldFragranceId} 仍有 ${remainingProducts.length} 個產品使用，保持當前狀態`);
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
  } catch (error) {
    logger.error("更新香精狀態時發生錯誤:", error);
    throw new HttpsError("internal", "更新香精狀態失敗");
  }
});

/**
 * 批次檢查並更新所有香精狀態 - 系統維護用
 */
export const batchUpdateFragranceStatuses = onCall(async (request) => {
  const { auth: contextAuth } = request;
  // await ensureCanManageProducts(contextAuth?.uid); // 需要管理權限

  try {
    const fragrancesSnapshot = await db.collection('fragrances').get();
    const updatePromises: Promise<any>[] = [];

    for (const fragranceDoc of fragrancesSnapshot.docs) {
      const fragranceData = fragranceDoc.data();
      
      // 跳過已棄用的香精
      if (fragranceData.status === 'deprecated') continue;

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
            updatedAt: FieldValue.serverTimestamp()
          });
          logger.info(`批次更新香精 ${fragranceDoc.id} 狀態: ${fragranceData.status} → ${newStatus}`);
        } else {
          // 只更新統計數據
          await fragranceRef.update({
            usageCount,
            updatedAt: FieldValue.serverTimestamp()
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
  } catch (error) {
    logger.error("批次更新香精狀態時發生錯誤:", error);
    throw new HttpsError("internal", "批次更新香精狀態失敗");
  }
});

export const changeProductFragrance = onCall(async (request) => {
    const { auth: contextAuth, data } = request;
    // await ensureCanManageProducts(contextAuth?.uid);
    const { productId, newFragranceId, reason } = data;
    
    if (!productId || !newFragranceId || !reason) { 
        throw new HttpsError("invalid-argument", "請求缺少 productId, newFragranceId, 或 reason。"); 
    }
    
    if (reason.length < 5) {
        throw new HttpsError("invalid-argument", "更換原因至少需要 5 個字元");
    }

    const productRef = db.doc(`products/${productId}`);
    const newFragranceRef = db.doc(`fragrances/${newFragranceId}`);
    const userRef = db.doc(`users/${contextAuth?.uid}`);
    
    try {
        let oldFragranceId: string | null = null;
        let productData: any = null;
        let oldFragranceData: any = null;
        let newFragranceData: any = null;
        let userData: any = null;

        // 執行主要的更換操作
        await db.runTransaction(async (transaction) => {
            // 獲取所有相關資料
            const productDoc = await transaction.get(productRef);
            const newFragranceDoc = await transaction.get(newFragranceRef);
            const userDoc = await transaction.get(userRef);

            if (!productDoc.exists) { 
                throw new HttpsError("not-found", "找不到指定的產品。"); 
            }
            if (!newFragranceDoc.exists) { 
                throw new HttpsError("not-found", "找不到指定的新香精。"); 
            }

            productData = productDoc.data();
            newFragranceData = newFragranceDoc.data();
            userData = userDoc.data();
            const oldFragranceRef = productData?.currentFragranceRef;
            
            // 獲取舊香精資料
            if (oldFragranceRef) {
                const oldFragranceDoc = await transaction.get(oldFragranceRef);
                if ((oldFragranceDoc as any).exists) {
                    oldFragranceData = (oldFragranceDoc as any).data();
                    oldFragranceId = oldFragranceRef.id;
                }
            }

            // 更新產品的香精引用
            transaction.update(productRef, { 
                currentFragranceRef: newFragranceRef, 
                updatedAt: FieldValue.serverTimestamp()
            });

            // 建立詳細的香精更換歷史記錄到獨立集合
            const historyRef = db.collection("fragranceChangeHistory").doc();
            transaction.set(historyRef, {
                productId: productId,
                productName: productData.name || '未知產品',
                productCode: productData.code || '未知代號',
                oldFragranceId: oldFragranceId || '',
                oldFragranceName: oldFragranceData?.name || '未知香精',
                oldFragranceCode: oldFragranceData?.code || '未知代號',
                newFragranceId: newFragranceId,
                newFragranceName: newFragranceData.name || '未知香精',
                newFragranceCode: newFragranceData.code || '未知代號',
                changeReason: reason,
                changeDate: FieldValue.serverTimestamp(),
                changedBy: contextAuth?.uid || '',
                changedByName: userData?.name || '未知用戶',
                createdAt: FieldValue.serverTimestamp()
            });

            // 保留舊版相容性 - 也寫入產品子集合
            const legacyHistoryRef = productRef.collection("fragranceHistory").doc();
            transaction.set(legacyHistoryRef, { 
                oldFragranceRef: oldFragranceRef || null, 
                newFragranceRef: newFragranceRef, 
                reason: reason, 
                changedAt: FieldValue.serverTimestamp(), 
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
            logger.info(`已觸發香精狀態實時更新: 新香精 ${newFragranceId}, 舊香精 ${oldFragranceId}`);
        } catch (statusUpdateError) {
            logger.warn("香精狀態更新警告 (主要操作已完成):", statusUpdateError);
            // 不拋出錯誤，因為主要操作已經成功
        }

        logger.info(`用戶 ${contextAuth?.uid} 成功更換產品 ${productId} 的香精: ${oldFragranceData?.code || '未知'} → ${newFragranceData?.code || '未知'}`);
        
        return { 
            success: true, 
            message: "香精更換成功並已記錄", 
            data: {
                productId,
                productName: productData?.name,
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
    } catch (error) {
        logger.error(`更換產品 ${productId} 香精時發生錯誤:`, error);
        if (error instanceof HttpsError) { throw error; }
        throw new HttpsError("internal", "更換香精時發生未知錯誤。");
    }
});

/**
 * 查詢香精更換歷史記錄 - 支援分頁和搜尋 (已標準化)
 */
export const getFragranceChangeHistory = createApiHandler({
  functionName: 'getFragranceChangeHistory',
  requireAuth: true,
  enableDetailedLogging: true,
  version: '1.0.0'
}, async (data, context, requestId) => {
  const {
    page = 1,
    pageSize = 10,
    searchTerm = '',
    productId = '',
    fragranceId = '',
    dateFrom = '',
    dateTo = ''
  } = data || {};

  let allDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];

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
    const docIds = new Set<string>();
    [...oldResults.docs, ...newResults.docs].forEach(doc => {
      if (!docIds.has(doc.id)) {
        docIds.add(doc.id);
        allDocs.push(doc);
      }
    });
  } else {
    // 正常查詢流程
    let query: FirebaseFirestore.Query = db.collection('fragranceChangeHistory');

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
      const aDate = a.data().changeDate?.toDate() || new Date(0);
      const bDate = b.data().changeDate?.toDate() || new Date(0);
      return bDate.getTime() - aDate.getTime();
    });
  }

  // 計算總數
  const total = allDocs.length;
  const totalPages = Math.ceil(total / pageSize);

  // 手動分頁
  const offset = (page - 1) * pageSize;
  const pagedDocs = allDocs.slice(offset, offset + pageSize);

  let records = pagedDocs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // 客戶端搜尋過濾（因為 Firestore 全文搜尋限制）
  if (searchTerm && searchTerm.trim() !== '') {
    const searchLower = searchTerm.toLowerCase();
    records = records.filter((record: any) =>
      record.productName?.toLowerCase().includes(searchLower) ||
      record.productCode?.toLowerCase().includes(searchLower) ||
      record.oldFragranceName?.toLowerCase().includes(searchLower) ||
      record.oldFragranceCode?.toLowerCase().includes(searchLower) ||
      record.newFragranceName?.toLowerCase().includes(searchLower) ||
      record.newFragranceCode?.toLowerCase().includes(searchLower) ||
      record.changeReason?.toLowerCase().includes(searchLower) ||
      record.changedByName?.toLowerCase().includes(searchLower)
    );
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
export const getProductFragranceHistory = onCall(async (request) => {
  const { auth: contextAuth, data } = request;
  const { productId } = data;

  if (!productId) {
    throw new HttpsError("invalid-argument", "缺少 productId");
  }

  try {
    // 首先檢查集合是否有任何資料
    const collectionSnapshot = await db.collection('fragranceChangeHistory').limit(1).get();
    logger.info(`fragranceChangeHistory 集合檢查：${collectionSnapshot.empty ? '空集合' : '有資料'}`);

    const query = db.collection('fragranceChangeHistory')
      .where('productId', '==', productId)
      .orderBy('changeDate', 'desc');

    const snapshot = await query.get();
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info(`產品 ${productId} 香精歷史查詢成功，找到 ${records.length} 筆記錄`);

    return {
      success: true,
      data: records,
      count: records.length
    };
  } catch (error) {
    logger.error(`獲取產品 ${productId} 香精歷史時發生錯誤:`, error);

    // 如果是索引錯誤，提供更友善的回應
    if (error.code === 9 && error.message?.includes('index')) {
      logger.warn('Firestore 索引尚未完成建構，返回空結果');
      return {
        success: true,
        data: [],
        count: 0,
        message: '索引建構中，請稍後再試'
      };
    }

    throw new HttpsError("internal", "獲取產品香精歷史失敗");
  }
});
