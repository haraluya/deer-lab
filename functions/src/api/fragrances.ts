// functions/src/api/fragrances.ts
/**
 * 🎯 鹿鹿小作坊 - 香精管理 API (已標準化)
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
 * 根據編號更新香精請求介面
 */
interface UpdateFragranceByCodeRequest {
  code: string;
  name: string;
  status?: string;
  fragranceType?: string;
  fragranceStatus?: string;
  supplierId?: string;
  safetyStockLevel?: number;
  costPerUnit?: number;
  percentage?: number;
  pgRatio?: number;
  vgRatio?: number;
  unit?: string;
  currentStock?: number;
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
 * 根據香精編號更新資料（智能更新模式）
 */
export const updateFragranceByCode = CrudApiHandlers.createUpdateHandler<UpdateFragranceByCodeRequest, StandardResponses.CrudResponse>(
  'FragranceByCode',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['code', 'name']);
    
    const { code, name, status, fragranceType, fragranceStatus, supplierId, safetyStockLevel, costPerUnit, percentage, pgRatio, vgRatio, unit, currentStock } = data;
    
    try {
      // 2. 根據香精編號查找現有的香精
      const fragranceQuery = await db.collection('fragrances')
        .where('code', '==', code.trim())
        .limit(1)
        .get();
      
      if (fragranceQuery.empty) {
        throw new BusinessError(
          ApiErrorCode.NOT_FOUND,
          `找不到香精編號為「${code}」的香精`,
          { code }
        );
      }
      
      const fragranceDoc = fragranceQuery.docs[0];
      const fragranceId = fragranceDoc.id;
      
      // 3. 處理向後相容性
      const finalFragranceType = (fragranceType !== undefined && fragranceType !== null && fragranceType !== '') ? fragranceType : (status || '棉芯');
      const finalStatus = (status !== undefined && status !== null && status !== '') ? status : (fragranceType || 'standby');
      const finalFragranceStatus = (fragranceStatus !== undefined && fragranceStatus !== null && fragranceStatus !== '') ? fragranceStatus : (status || '備用');
      
      // 4. 準備更新資料（智能更新模式 - 只更新有提供的欄位）
      const updateData: any = {
        code: code.trim(),
        name: name.trim(),
        status: finalStatus,
        updatedAt: FieldValue.serverTimestamp(),
      };
      
      // 5. 處理香精種類 - 只有提供時才更新
      if (fragranceType !== undefined && fragranceType !== null && fragranceType !== '') {
        updateData.fragranceType = fragranceType;
      }
      
      // 6. 處理啟用狀態 - 只有提供時才更新
      if (fragranceStatus !== undefined && fragranceStatus !== null && fragranceStatus !== '') {
        updateData.fragranceStatus = fragranceStatus;
      }
      
      // 7. 處理數值欄位 - 只有提供時才更新
      if (currentStock !== undefined && currentStock !== null && String(currentStock) !== '') {
        updateData.currentStock = Number(currentStock) || 0;
        updateData.lastStockUpdate = FieldValue.serverTimestamp();
      }
      
      if (safetyStockLevel !== undefined && safetyStockLevel !== null && String(safetyStockLevel) !== '') {
        updateData.safetyStockLevel = Number(safetyStockLevel) || 0;
      }
      
      if (costPerUnit !== undefined && costPerUnit !== null && String(costPerUnit) !== '') {
        updateData.costPerUnit = Number(costPerUnit) || 0;
      }
      
      if (percentage !== undefined && percentage !== null && String(percentage) !== '') {
        updateData.percentage = Number(percentage) || 0;
      }
      
      if (pgRatio !== undefined && pgRatio !== null && String(pgRatio) !== '') {
        updateData.pgRatio = Number(pgRatio) || 0;
      }
      
      if (vgRatio !== undefined && vgRatio !== null && String(vgRatio) !== '') {
        updateData.vgRatio = Number(vgRatio) || 0;
      }
      
      if (unit !== undefined && unit !== null && unit !== '') {
        updateData.unit = unit;
      }
      
      // 8. 處理供應商 - 只有明確提供時才更新
      if (supplierId !== undefined && supplierId !== null && supplierId !== '') {
        updateData.supplierRef = db.collection('suppliers').doc(supplierId);
      }
      
      // 9. 更新資料庫
      await fragranceDoc.ref.update(updateData);
      
      // 10. 返回標準化回應
      return {
        id: fragranceId,
        message: `香精「${name}」(編號: ${code}) 的資料已成功更新`,
        operation: 'updated' as const,
        resource: {
          type: 'fragrance',
          name,
          code,
        }
      };
      
    } catch (error) {
      throw ErrorHandler.handle(error, `根據編號更新香精: ${code}`);
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
 * 診斷香精狀態介面
 */
interface DiagnoseFragranceStatusResponse {
  totalFragrances: number;
  statusStats: {
    active: number;
    standby: number;
    deprecated: number;
    undefined: number;
    other: number;
  };
  problematicFragrances: Array<{
    id: string;
    name: string;
    code: string;
    status?: string;
    issue: 'missing_status' | 'invalid_status';
  }>;
  message: string;
}

/**
 * 診斷香精狀態
 */
export const diagnoseFragranceStatus = createApiHandler<void, DiagnoseFragranceStatusResponse>(
  {
    functionName: 'diagnoseFragranceStatus',
    requireAuth: true,
    requiredRole: UserRole.ADMIN,
    enableDetailedLogging: true,
    version: '1.0.0'
  },
  async (data, context, requestId) => {
    try {
      // 1. 獲取所有香精
      const fragrancesQuery = await db.collection('fragrances').get();
      const allFragrances = fragrancesQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      logger.info(`[${requestId}] 總共找到 ${allFragrances.length} 個香精`);
      
      // 2. 統計狀態分佈
      const statusStats = {
        active: 0,
        standby: 0,
        deprecated: 0,
        undefined: 0,
        other: 0
      };
      
      const problematicFragrances: DiagnoseFragranceStatusResponse['problematicFragrances'] = [];
      
      allFragrances.forEach((fragrance: any) => {
        const status = fragrance.status;
        if (status === 'active') {
          statusStats.active++;
        } else if (status === 'standby') {
          statusStats.standby++;
        } else if (status === 'deprecated') {
          statusStats.deprecated++;
        } else if (!status) {
          statusStats.undefined++;
          problematicFragrances.push({
            id: fragrance.id,
            name: fragrance.name || '未知',
            code: fragrance.code || '未知',
            issue: 'missing_status'
          });
        } else {
          statusStats.other++;
          problematicFragrances.push({
            id: fragrance.id,
            name: fragrance.name || '未知',
            code: fragrance.code || '未知',
            status: status,
            issue: 'invalid_status'
          });
        }
      });
      
      // 3. 返回診斷結果
      return {
        totalFragrances: allFragrances.length,
        statusStats,
        problematicFragrances,
        message: `診斷完成：總共 ${allFragrances.length} 個香精，發現 ${problematicFragrances.length} 個狀態異常`
      };
      
    } catch (error) {
      throw ErrorHandler.handle(error, '診斷香精狀態');
    }
  }
);

/**
 * 修復香精狀態介面
 */
interface FixFragranceStatusResponse {
  fixedCount: number;
  message: string;
}

/**
 * 修復香精狀態
 */
export const fixFragranceStatus = createApiHandler<void, FixFragranceStatusResponse>(
  {
    functionName: 'fixFragranceStatus',
    requireAuth: true,
    requiredRole: UserRole.ADMIN,
    enableDetailedLogging: true,
    version: '1.0.0'
  },
  async (data, context, requestId) => {
    try {
      // 1. 獲取所有香精
      const fragrancesQuery = await db.collection('fragrances').get();
      let fixedCount = 0;
      const batch = db.batch();
      
      // 2. 檢查并修復狀態
      fragrancesQuery.docs.forEach(doc => {
        const data = doc.data();
        const currentStatus = data.status;
        
        // 修復邏輯：如果狀態不正確，設為 standby
        if (!currentStatus || !['active', 'standby', 'deprecated'].includes(currentStatus)) {
          batch.update(doc.ref, {
            status: 'standby',
            updatedAt: FieldValue.serverTimestamp()
          });
          fixedCount++;
          logger.info(`[${requestId}] 修復香精 ${data.name} (${data.code}) 狀態從 "${currentStatus}" 改為 "standby"`);
        }
      });
      
      // 3. 提交批量修復
      if (fixedCount > 0) {
        await batch.commit();
        logger.info(`[${requestId}] 批量修復完成，共修復 ${fixedCount} 個香精`);
      } else {
        logger.info(`[${requestId}] 所有香精狀態正常，無需修復`);
      }
      
      // 4. 返回結果
      return {
        fixedCount,
        message: `修復完成，共修復 ${fixedCount} 個香精的狀態`
      };
      
    } catch (error) {
      throw ErrorHandler.handle(error, '修復香精狀態');
    }
  }
);

/**
 * 修正香精比例細節介面
 */
interface FragranceRatioFixDetail {
  code: string;
  name: string;
  percentage: number;
  oldPgRatio: number;
  newPgRatio: number;
  oldVgRatio: number;
  newVgRatio: number;
}

/**
 * 修正香精比例回應介面
 */
interface FixAllFragranceRatiosResponse {
  fixedCount: number;
  fixDetails: FragranceRatioFixDetail[];
  message: string;
}

/**
 * 批量修正所有香精的 PG/VG 比例
 * 注意：此函數使用 utils/fragranceCalculations.ts 中的計算邏輯
 */
export const fixAllFragranceRatios = createApiHandler<void, FixAllFragranceRatiosResponse>(
  {
    functionName: 'fixAllFragranceRatios',
    requireAuth: true,
    requiredRole: UserRole.ADMIN,
    enableDetailedLogging: true,
    version: '1.0.0'
  },
  async (data, context, requestId) => {
    try {
      // 1. 獲取所有香精
      const fragrancesQuery = await db.collection('fragrances').get();
      let fixedCount = 0;
      const batch = db.batch();
      const fixDetails: FragranceRatioFixDetail[] = [];
      
      // 2. 檢查并修正比例
      fragrancesQuery.docs.forEach(doc => {
        const data = doc.data();
        const fragrancePercentage = data.percentage || 0;
        
        if (fragrancePercentage > 0) {
          const { pgRatio, vgRatio } = calculateCorrectRatios(fragrancePercentage);
          const currentPgRatio = data.pgRatio || 0;
          const currentVgRatio = data.vgRatio || 0;
          
          // 檢查是否需要修正（允許小數點誤差）
          if (Math.abs(currentPgRatio - pgRatio) > 0.1 || Math.abs(currentVgRatio - vgRatio) > 0.1) {
            batch.update(doc.ref, {
              pgRatio,
              vgRatio,
              updatedAt: FieldValue.serverTimestamp()
            });
            
            fixDetails.push({
              code: data.code,
              name: data.name,
              percentage: fragrancePercentage,
              oldPgRatio: currentPgRatio,
              newPgRatio: pgRatio,
              oldVgRatio: currentVgRatio,
              newVgRatio: vgRatio
            });
            
            fixedCount++;
            logger.info(`[${requestId}] 修正香精 ${data.name} (${data.code}) 比例: 香精=${fragrancePercentage}%, PG=${currentPgRatio}->${pgRatio}%, VG=${currentVgRatio}->${vgRatio}%`);
          }
        }
      });
      
      // 3. 提交批量修正
      if (fixedCount > 0) {
        await batch.commit();
        logger.info(`[${requestId}] 批量修正完成，共修正 ${fixedCount} 個香精的比例`);
      } else {
        logger.info(`[${requestId}] 所有香精比例都正確，無需修正`);
      }
      
      // 4. 返回結果
      return {
        fixedCount,
        fixDetails,
        message: `修正完成，共修正 ${fixedCount} 個香精的 PG/VG 比例`
      };
      
    } catch (error) {
      throw ErrorHandler.handle(error, '批量修正香精比例');
    }
  }
);

/**
 * 有問題的香精比例介面
 */
interface ProblematicFragranceRatio {
  code: string;
  name: string;
  percentage: number;
  currentPgRatio: number;
  correctPgRatio: number;
  pgDiff: number;
  currentVgRatio: number;
  correctVgRatio: number;
  vgDiff: number;
  total: number;
  correctTotal: number;
}

/**
 * 正確的香精比例介面
 */
interface CorrectFragranceRatio {
  code: string;
  name: string;
  percentage: number;
  pgRatio: number;
  vgRatio: number;
}

/**
 * 診斷香精比例回應介面
 */
interface DiagnoseFragranceRatiosResponse {
  totalFragrances: number;
  problematicCount: number;
  correctCount: number;
  problematicFragrances: ProblematicFragranceRatio[];
  correctFragrances: CorrectFragranceRatio[];
  message: string;
}

/**
 * 診斷香精 PG/VG 比例問題
 */
export const diagnoseFragranceRatios = createApiHandler<void, DiagnoseFragranceRatiosResponse>(
  {
    functionName: 'diagnoseFragranceRatios',
    requireAuth: true,
    requiredRole: UserRole.ADMIN,
    enableDetailedLogging: true,
    version: '1.0.0'
  },
  async (data, context, requestId) => {
    try {
      // 1. 獲取所有香精
      const fragrancesQuery = await db.collection('fragrances').get();
      const problematicFragrances: ProblematicFragranceRatio[] = [];
      const correctFragrances: CorrectFragranceRatio[] = [];
      
      // 2. 檢查每個香精的比例
      fragrancesQuery.docs.forEach(doc => {
        const data = doc.data();
        const fragrancePercentage = data.percentage || 0;
        const currentPgRatio = data.pgRatio || 0;
        const currentVgRatio = data.vgRatio || 0;
        
        if (fragrancePercentage > 0) {
          const { pgRatio: correctPgRatio, vgRatio: correctVgRatio } = calculateCorrectRatios(fragrancePercentage);
          
          const pgDiff = Math.abs(currentPgRatio - correctPgRatio);
          const vgDiff = Math.abs(currentVgRatio - correctVgRatio);
          
          if (pgDiff > 0.1 || vgDiff > 0.1) {
            // 比例有問題
            problematicFragrances.push({
              code: data.code,
              name: data.name,
              percentage: fragrancePercentage,
              currentPgRatio,
              correctPgRatio,
              pgDiff,
              currentVgRatio,
              correctVgRatio,
              vgDiff,
              total: fragrancePercentage + currentPgRatio + currentVgRatio,
              correctTotal: fragrancePercentage + correctPgRatio + correctVgRatio
            });
          } else {
            // 比例正確
            correctFragrances.push({
              code: data.code,
              name: data.name,
              percentage: fragrancePercentage,
              pgRatio: currentPgRatio,
              vgRatio: currentVgRatio
            });
          }
        }
      });
      
      // 3. 返回診斷結果
      logger.info(`[${requestId}] 診斷完成：總共 ${fragrancesQuery.docs.length} 個香精，${problematicFragrances.length} 個比例錯誤，${correctFragrances.length} 個比例正確`);
      
      return {
        totalFragrances: fragrancesQuery.docs.length,
        problematicCount: problematicFragrances.length,
        correctCount: correctFragrances.length,
        problematicFragrances,
        correctFragrances,
        message: `診斷完成：找到 ${problematicFragrances.length} 個比例錯誤的香精`
      };
      
    } catch (error) {
      throw ErrorHandler.handle(error, '診斷香精比例');
    }
  }
);
