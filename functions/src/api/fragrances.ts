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

import { logger } from "firebase-functions";
import { getFirestore, FieldValue, DocumentReference } from "firebase-admin/firestore";
import { createApiHandler, CrudApiHandlers } from "../utils/apiWrapper";
import { BusinessError, ApiErrorCode, ErrorHandler } from "../utils/errorHandler";
import { Permission, UserRole } from "../middleware/auth";
import { StandardResponses } from "../types/api";
import FragranceCalculations, { calculateCorrectRatios } from '../utils/fragranceCalculations';

const db = getFirestore();

/**
 * 香精資料介面
 */
interface FragranceData {
  code: string;
  name: string;
  fragranceType?: string;
  fragranceStatus?: string;
  supplierRef?: DocumentReference;
  supplierId?: string;
  safetyStockLevel?: number;
  costPerUnit?: number;
  percentage?: number;
  pgRatio?: number;
  vgRatio?: number;
  description?: string;
  notes?: string;
  remarks?: string;
  status?: string;
  unit?: string;
  currentStock?: number;
  updatedAt?: FieldValue;
  createdAt?: FieldValue;
  lastStockUpdate?: FieldValue;
}

/**
 * 建立香精請求介面
 */
interface CreateFragranceRequest {
  code: string;
  name: string;
  fragranceType?: string;
  fragranceStatus?: string;
  supplierRef?: DocumentReference;
  supplierId?: string;
  safetyStockLevel?: number;
  costPerUnit?: number;
  percentage?: number;
  pgRatio?: number;
  vgRatio?: number;
  description?: string;
  notes?: string;
  remarks?: string;
  status?: string;
  unit?: string;
  currentStock?: number;
}

/**
 * 更新香精請求介面
 */
interface UpdateFragranceRequest {
  fragranceId: string;
  code: string;
  name: string;
  status?: string;
  fragranceType?: string;
  fragranceStatus?: string;
  supplierId?: string;
  currentStock?: number;
  safetyStockLevel?: number;
  costPerUnit?: number;
  percentage?: number;
  pgRatio?: number;
  vgRatio?: number;
  unit?: string;
}


/**
 * 刪除香精請求介面
 */
interface DeleteFragranceRequest {
  fragranceId: string;
}

/**
 * 建立新香精
 */
export const createFragrance = CrudApiHandlers.createCreateHandler<CreateFragranceRequest, StandardResponses.CrudResponse>(
  'Fragrance',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['code', 'name']);
    
    const { code, name, fragranceType, fragranceStatus, supplierRef, supplierId, safetyStockLevel, costPerUnit, percentage, pgRatio, vgRatio, description, notes, remarks, status, unit, currentStock } = data;
    
    try {
      // 2. 檢查香精編號是否已存在
      const existingFragrance = await db.collection('fragrances')
        .where('code', '==', code.trim())
        .limit(1)
        .get();
      
      if (!existingFragrance.empty) {
        throw new BusinessError(
          ApiErrorCode.ALREADY_EXISTS,
          `香精編號「${code}」已經存在`,
          { code }
        );
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
        lastStockUpdate: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      
      // 5. 儲存到資料庫
      const docRef = await db.collection('fragrances').add(fragranceData);
      
      // 6. 返回標準化回應
      return {
        id: docRef.id,
        message: `香精「${name}」(編號: ${code}) 已成功建立`,
        operation: 'created' as const,
        resource: {
          type: 'fragrance',
          name,
          code,
        }
      };
      
    } catch (error) {
      throw ErrorHandler.handle(error, `建立香精: ${name} (${code})`);
    }
  }
);

/**
 * 更新香精資料
 */
export const updateFragrance = CrudApiHandlers.createUpdateHandler<UpdateFragranceRequest, StandardResponses.CrudResponse>(
  'Fragrance',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['fragranceId', 'code', 'name']);
    
    const { fragranceId, code, name, status, fragranceType, fragranceStatus, supplierId, currentStock, safetyStockLevel, costPerUnit, percentage, pgRatio, vgRatio, unit } = data;
    
    try {
      // 2. 檢查香精是否存在
      const fragranceRef = db.collection('fragrances').doc(fragranceId);
      const fragranceDoc = await fragranceRef.get();
      
      ErrorHandler.assertExists(fragranceDoc.exists, '香精', fragranceId);
      
      const currentFragrance = fragranceDoc.data()!;
      
      // 3. 檢查編號是否與其他香精重複（除了自己）
      if (code.trim() !== currentFragrance.code) {
        const duplicateCheck = await db.collection('fragrances')
          .where('code', '==', code.trim())
          .limit(1)
          .get();
        
        if (!duplicateCheck.empty && duplicateCheck.docs[0].id !== fragranceId) {
          throw new BusinessError(
            ApiErrorCode.ALREADY_EXISTS,
            `香精編號「${code}」已經存在`,
            { code, conflictId: duplicateCheck.docs[0].id }
          );
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
      const updateData: any = {
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
        updatedAt: FieldValue.serverTimestamp(),
      };
      
      // 7. 處理供應商參照
      if (supplierId) {
        updateData.supplierRef = db.collection('suppliers').doc(supplierId);
      } else {
        updateData.supplierRef = FieldValue.delete();
      }
      
      // 8. 更新資料庫
      await fragranceRef.update(updateData);
      
      // 9. 如果庫存有變更，建立庫存紀錄
      if (stockChanged) {
        try {
          const inventoryRecordRef = db.collection('inventory_records').doc();
          await inventoryRecordRef.set({
            changeDate: FieldValue.serverTimestamp(),
            changeReason: 'manual_adjustment',
            operatorId: context.auth?.uid || 'unknown',
            operatorName: context.auth?.token?.name || '未知用戶',
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
            createdAt: FieldValue.serverTimestamp(),
          });
          
          logger.info(`[${requestId}] 已建立庫存紀錄，庫存從 ${oldStock} 變更為 ${newStock}`);
        } catch (error) {
          logger.warn(`[${requestId}] 建立庫存紀錄失敗:`, error);
          // 不阻擋主要更新流程
        }
      }
      
      // 10. 返回標準化回應
      return {
        id: fragranceId,
        message: `香精「${name}」(編號: ${code}) 的資料已成功更新${stockChanged ? '，並更新庫存' : ''}`,
        operation: 'updated' as const,
        resource: {
          type: 'fragrance',
          name,
          code,
        }
      };
      
    } catch (error) {
      throw ErrorHandler.handle(error, `更新香精: ${fragranceId}`);
    }
  }
);


/**
 * 刪除香精
 */
export const deleteFragrance = CrudApiHandlers.createDeleteHandler<DeleteFragranceRequest, StandardResponses.CrudResponse>(
  'Fragrance',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['fragranceId']);
    
    const { fragranceId } = data;
    
    try {
      // 2. 檢查香精是否存在
      const fragranceRef = db.collection('fragrances').doc(fragranceId);
      const fragranceDoc = await fragranceRef.get();
      
      ErrorHandler.assertExists(fragranceDoc.exists, '香精', fragranceId);
      
      const fragranceData = fragranceDoc.data()!;
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
        throw new BusinessError(
          ApiErrorCode.OPERATION_CONFLICT,
          `無法刪除香精「${fragranceName}」，因為仍有产品或工單與此香精相關聯`,
          {
            relatedProductsCount: relatedProducts.size,
            relatedWorkOrdersCount: relatedWorkOrders.size
          }
        );
      }
      
      // 4. 刪除香精
      await fragranceRef.delete();
      
      // 5. 返回標準化回應
      return {
        id: fragranceId,
        message: `香精「${fragranceName}」(編號: ${fragranceCode}) 已成功刪除`,
        operation: 'deleted' as const,
        resource: {
          type: 'fragrance',
          name: fragranceName,
          code: fragranceCode,
        }
      };
      
    } catch (error) {
      throw ErrorHandler.handle(error, `刪除香精: ${fragranceId}`);
    }
  }
);




