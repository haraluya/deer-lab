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
import { StandardResponses, BatchOperationResult } from "../types/api";
import FragranceCalculations, { calculateCorrectRatios } from '../utils/fragranceCalculations';

const db = getFirestore();

/**
 * 庫存記錄管理器
 */
class InventoryRecordManager {
  static async createInventoryRecord(
    itemId: string,
    itemType: string,
    quantityChange: number,
    operatorId: string,
    remarks: string = '庫存異動'
  ): Promise<void> {
    try {
      const inventoryRecordRef = db.collection('inventory_records').doc();
      await inventoryRecordRef.set({
        changeDate: FieldValue.serverTimestamp(),
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
    } catch (error) {
      logger.warn(`建立庫存記錄失敗`, { itemId, itemType, error });
    }
  }
}

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

/**
 * 香精匯入請求介面
 */
interface ImportFragrancesRequest {
  fragrances: Array<{
    code: string;
    name: string;
    fragranceType?: string;
    fragranceStatus?: string;
    supplierName?: string;
    currentStock?: number;
    safetyStockLevel?: number;
    costPerUnit?: number;
    percentage?: number;
    pgRatio?: number;
    vgRatio?: number;
    unit?: string;
  }>;
}

/**
 * 批量匯入香精
 */
export const importFragrances = CrudApiHandlers.createCreateHandler<ImportFragrancesRequest, BatchOperationResult>(
  'ImportFragrances',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['fragrances']);

    const { fragrances } = data;

    if (!Array.isArray(fragrances) || fragrances.length === 0) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        '香精列表不能為空'
      );
    }

    if (fragrances.length > 500) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        `批量匯入限制為500筆資料，目前有${fragrances.length}筆`
      );
    }

    const results: BatchOperationResult = {
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
      const suppliersMap = new Map<string, string>();
      suppliersSnapshot.forEach(doc => {
        const supplierData = doc.data();
        suppliersMap.set(supplierData.name, doc.id);
      });

      // 3. 預先載入現有香精（用於檢查重複）
      const existingFragrancesSnapshot = await db.collection('fragrances').get();
      const existingFragrancesMap = new Map<string, { id: string; data: FragranceData }>();
      existingFragrancesSnapshot.forEach(doc => {
        const data = doc.data() as FragranceData;
        existingFragrancesMap.set(data.code, { id: doc.id, data });
      });

      // 4. 處理每個香精
      for (let i = 0; i < fragrances.length; i++) {
        const fragranceItem = fragrances[i];

        try {
          // 基本驗證
          if (!fragranceItem.code?.trim()) {
            throw new Error('香精代號為必填欄位');
          }
          if (!fragranceItem.name?.trim()) {
            throw new Error('香精名稱為必填欄位');
          }

          const code = fragranceItem.code.trim();
          const name = fragranceItem.name.trim();
          const fragranceType = (fragranceItem as any).fragranceCategory?.trim() || (fragranceItem as any).fragranceType?.trim() || '';
          const fragranceStatus = fragranceItem.fragranceStatus?.trim() || '啟用';
          const unit = fragranceItem.unit?.trim() || 'KG';
          const currentStock = Number(fragranceItem.currentStock) || 0;
          const safetyStockLevel = Number(fragranceItem.safetyStockLevel) || 0;
          const costPerUnit = Number(fragranceItem.costPerUnit) || 0;
          const percentage = Number(fragranceItem.percentage) || 0;
          let pgRatio = Number(fragranceItem.pgRatio) || 50;
          let vgRatio = Number(fragranceItem.vgRatio) || 50;

          // 數值驗證
          if (currentStock < 0) throw new Error('庫存數量不能為負數');
          if (safetyStockLevel < 0) throw new Error('安全庫存不能為負數');
          if (costPerUnit < 0) throw new Error('單位成本不能為負數');
          if (percentage < 0 || percentage > 100) throw new Error('香精比例必須在0-100之間');
          if (pgRatio < 0 || pgRatio > 100) throw new Error('PG比例必須在0-100之間');
          if (vgRatio < 0 || vgRatio > 100) throw new Error('VG比例必須在0-100之間');

          // 自動修正 PG/VG 比例，確保總和為100%
          const correctedRatios = calculateCorrectRatios(percentage);
          pgRatio = correctedRatios.pgRatio;
          vgRatio = correctedRatios.vgRatio;

          // 處理供應商
          let supplierRef: DocumentReference | undefined;
          if (fragranceItem.supplierName?.trim()) {
            const supplierName = fragranceItem.supplierName.trim();
            const supplierId = suppliersMap.get(supplierName);
            if (!supplierId) {
              throw new Error(`找不到供應商「${supplierName}」`);
            }
            supplierRef = db.collection('suppliers').doc(supplierId);
          }

          // 檢查是否已存在相同代號的香精
          let fragranceId: string;

          if (existingFragrancesMap.has(code)) {
            // 更新現有香精 - 智能差異比對
            const existing = existingFragrancesMap.get(code)!;
            fragranceId = existing.id;
            const existingData = existing.data;

            const updateData: Partial<FragranceData> = {};
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
              const existingSupplierRefId = existingData.supplierRef?.id || existingData.supplierId || null;
              if (supplierRef.id !== existingSupplierRefId) {
                updateData.supplierRef = supplierRef;
                updateData.supplierId = supplierRef.id;
                hasChanges = true;
              }
            }

            // 只有有變更時才執行更新
            if (hasChanges) {
              updateData.updatedAt = FieldValue.serverTimestamp();
              await db.collection('fragrances').doc(fragranceId).update(updateData);

              logger.info(`香精 ${code} 有變更，更新欄位:`, Object.keys(updateData));
            } else {
              logger.info(`香精 ${code} 無變更，跳過更新`);
            }

            // 如果庫存有變更，建立庫存紀錄
            const oldStock = existing.data.currentStock || 0;
            if (oldStock !== currentStock && context.auth?.uid) {
              await InventoryRecordManager.createInventoryRecord(
                fragranceId,
                'fragrances',
                currentStock - oldStock,
                context.auth.uid,
                `批量匯入更新 - 從 ${oldStock} 更新為 ${currentStock}`
              );
            }

            if (hasChanges) {
              results.successful.push({
                code: code,
                name: updateData.name || existing.data.name,
                operation: 'updated',
                message: `香精「${updateData.name || existing.data.name}」已更新 (${Object.keys(updateData).filter(k => k !== 'updatedAt').join(', ')})`
              });
            } else {
              results.successful.push({
                code: code,
                name: existing.data.name,
                operation: 'skipped',
                message: `香精「${existing.data.name}」無變更，跳過更新`
              });
            }

          } else {
            // 建立新香精
            const fragranceData: FragranceData = {
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
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            };

            if (supplierRef) {
              fragranceData.supplierRef = supplierRef;
              fragranceData.supplierId = supplierRef.id;
            }

            const docRef = await db.collection('fragrances').add(fragranceData);
            fragranceId = docRef.id;

            // 建立初始庫存記錄
            if (currentStock > 0 && context.auth?.uid) {
              await InventoryRecordManager.createInventoryRecord(
                fragranceId,
                'fragrances',
                currentStock,
                context.auth.uid,
                `批量匯入初始庫存`
              );
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

        } catch (itemError) {
          const errorMessage = itemError instanceof Error ? itemError.message : String(itemError);
          results.summary.failed++;
          results.failed.push({
            item: fragranceItem,
            error: errorMessage
          });

          logger.warn(`香精匯入項目失敗`, {
            index: i + 1,
            item: fragranceItem,
            error: errorMessage,
            requestId
          });
        }
      }

      // 5. 記錄操作結果
      logger.info(`香精批量匯入完成`, {
        total: results.summary.total,
        successful: results.summary.successful,
        failed: results.summary.failed,
        requestId
      });

      return results;

    } catch (error) {
      throw ErrorHandler.handle(error, `批量匯入香精`);
    }
  }
);




