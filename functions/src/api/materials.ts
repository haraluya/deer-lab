// functions/src/api/materials.ts
/**
 * 🎯 德科斯特的實驗室 - 物料管理 API (已標準化)
 * 
 * 升級時間：2025-09-12
 * 升級內容：套用統一 API 標準化架構
 * - 統一回應格式
 * - 統一錯誤處理
 * - 統一權限驗證
 * - 結構化日誌
 * - 保留所有複雜業務邏輯
 */

import { logger } from "firebase-functions";
import { getFirestore, FieldValue, DocumentReference } from "firebase-admin/firestore";
import { createApiHandler, CrudApiHandlers } from "../utils/apiWrapper";
import { BusinessError, ApiErrorCode, ErrorHandler } from "../utils/errorHandler";
import { Permission, UserRole } from "../middleware/auth";
import { StandardResponses, BatchOperationResult } from "../types/api";
import { formatMaterialNumbers } from '../utils/numberValidation';

const db = getFirestore();

/**
 * 物料資料介面
 */
interface MaterialData {
  code: string; 
  name: string; 
  category: string; 
  subCategory: string; 
  mainCategoryId?: string; // 主分類ID
  subCategoryId?: string;  // 細分分類ID
  safetyStockLevel: number; 
  costPerUnit: number; 
  unit: string; 
  currentStock?: number; 
  createdAt?: FieldValue; 
  updatedAt: FieldValue; 
  supplierRef?: DocumentReference | FieldValue;
  notes?: string;
}

/**
 * 建立物料請求介面
 */
interface CreateMaterialRequest {
  code?: string;
  name: string;
  category?: string;
  subCategory?: string;
  supplierId?: string;
  safetyStockLevel?: number;
  costPerUnit?: number;
  unit?: string;
  notes?: string;
}

/**
 * 更新物料請求介面
 */
interface UpdateMaterialRequest {
  materialId: string;
  name: string;
  category: string;
  subCategory: string;
  supplierId?: string;
  currentStock?: number;
  safetyStockLevel?: number;
  costPerUnit?: number;
  unit?: string;
  notes?: string;
}

/**
 * 匯入物料請求介面
 */
interface ImportMaterialsRequest {
  materials: (CreateMaterialRequest & {
    code?: string;
    supplierName?: string;
    currentStock?: number;
    categoryName?: string;
    subCategoryName?: string;
  })[];
}

/**
 * ===============================
 * 物料代號生成與管理工具類
 * ===============================
 */
class MaterialCodeGenerator {
  /**
   * 生成 4 位隨機數字
   */
  private static generateRandomCode(): string {
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  }

  /**
   * 生成 2 位大寫英文字母 ID (主分類)
   */
  private static generateCategoryId(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 2; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return result;
  }

  /**
   * 生成 3 位數字 ID (細分分類)
   */
  private static generateSubCategoryId(): string {
    let result = '';
    for (let i = 0; i < 3; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  }

  /**
   * 新的物料代號生成：主分類ID(2位字母) + 細分分類ID(3位數字) + 隨機生成碼(4位數字) = 9碼
   */
  static generateMaterialCode(mainCategoryId: string, subCategoryId: string, randomCode?: string): string {
    // 確保主分類ID是2位字母
    const categoryId = mainCategoryId ? mainCategoryId.substring(0, 2).toUpperCase() : 'XX';
    
    // 確保細分分類ID是3位數字
    const subCategoryIdStr = subCategoryId ? subCategoryId.padStart(3, '0').substring(0, 3) : '000';
    
    // 生成或使用現有的隨機生成碼
    const randomPart = randomCode || this.generateRandomCode();
    
    return `${categoryId}${subCategoryIdStr}${randomPart}`;
  }

  /**
   * 從物料代號中提取各部分
   */
  static parseMaterialCode(code: string): {
    mainCategoryId: string;
    subCategoryId: string;
    randomCode: string;
  } {
    if (!code || code.length !== 9) {
      throw new BusinessError(
        ApiErrorCode.INVALID_FORMAT,
        '物料代號必須是9位字符',
        { code, length: code?.length }
      );
    }
    
    return {
      mainCategoryId: code.substring(0, 2), // 前2位是主分類ID
      subCategoryId: code.substring(2, 5),  // 中間3位是細分分類ID
      randomCode: code.substring(5, 9)      // 後4位是隨機生成碼
    };
  }

  /**
   * 更新物料代號（當分類改變時，保持隨機生成碼不變）
   */
  static updateMaterialCode(oldCode: string, newMainCategoryId: string, newSubCategoryId: string): string {
    try {
      const { randomCode } = this.parseMaterialCode(oldCode);
      return this.generateMaterialCode(newMainCategoryId, newSubCategoryId, randomCode);
    } catch (error) {
      // 如果解析失敗，生成新的完整代號
      logger.warn(`無法解析舊代號 ${oldCode}，將生成新代號`);
      return this.generateMaterialCode(newMainCategoryId, newSubCategoryId);
    }
  }

  /**
   * 生成唯一物料代號
   */
  static async generateUniqueMaterialCode(
    mainCategoryId: string,
    subCategoryId: string,
    existingCodes?: Set<string>
  ): Promise<string> {
    let code = this.generateMaterialCode(mainCategoryId, subCategoryId);
    let attempts = 0;
    const maxAttempts = 10;

    // 如果提供了現有代號集合，先檢查
    if (existingCodes) {
      while (existingCodes.has(code) && attempts < maxAttempts) {
        code = this.generateMaterialCode(mainCategoryId, subCategoryId);
        attempts++;
      }
    }

    // 檢查資料庫中是否已存在
    attempts = 0;
    while (attempts < maxAttempts) {
      const existingMaterial = await db.collection('materials')
        .where('code', '==', code)
        .limit(1)
        .get();
      
      if (existingMaterial.empty) {
        return code; // 找到唯一代號
      }
      
      code = this.generateMaterialCode(mainCategoryId, subCategoryId);
      attempts++;
    }

    // 如果仍有碰撞，加上時間戳記後綴
    const timestamp = Date.now().toString().slice(-6);
    return `${code.substring(0, 5)}${timestamp.substring(0, 4)}`;
  }

  /**
   * 查詢分類ID（不自動創建）
   */
  static async getCategoryId(categoryName: string, type: 'category' | 'subCategory'): Promise<string | null> {
    try {
      const collectionName = type === 'category' ? 'materialCategories' : 'materialSubCategories';
      const query = await db.collection(collectionName)
        .where('name', '==', categoryName)
        .limit(1)
        .get();

      if (!query.empty) {
        const doc = query.docs[0];
        const existingId = doc.data().id;
        if (existingId) {
          return existingId;
        }
      }

      // 如果不存在，返回 null
      return null;
    } catch (error) {
      logger.error(`查詢${type}ID時發生錯誤:`, error);
      return null;
    }
  }

}

/**
 * ===============================
 * 庫存記錄管理工具類
 * ===============================
 */
class InventoryRecordManager {
  /**
   * 建立庫存變更記錄
   */
  static async createInventoryRecord(
    materialId: string,
    materialName: string,
    materialCode: string,
    oldStock: number,
    newStock: number,
    operatorId: string,
    operatorName?: string,
    reason: string = 'manual_adjustment',
    remarks: string = '透過編輯對話框直接修改庫存'
  ): Promise<void> {
    try {
      const inventoryRecordRef = db.collection('inventory_records').doc();
      await inventoryRecordRef.set({
        changeDate: FieldValue.serverTimestamp(),
        changeReason: reason,
        operatorId,
        operatorName: operatorName || '未知用戶',
        remarks,
        relatedDocumentId: materialId,
        relatedDocumentType: 'material_edit',
        details: [{
          itemId: materialId,
          itemType: 'material',
          itemCode: materialCode,
          itemName: materialName,
          quantityChange: newStock - oldStock,
          quantityAfter: newStock
        }],
        createdAt: FieldValue.serverTimestamp(),
      });
      
      logger.info(`已建立庫存紀錄，庫存從 ${oldStock} 變更為 ${newStock}`);
    } catch (error) {
      logger.error(`建立庫存紀錄失敗:`, error);
      // 不拋出錯誤，避免阻擋主要更新流程
    }
  }
}

/**
 * ===============================
 * 物料管理 API 函數
 * ===============================
 */

/**
 * 建立新物料
 */
export const createMaterial = CrudApiHandlers.createCreateHandler<CreateMaterialRequest, StandardResponses.CrudResponse & { generatedCode: string }>(
  'Material',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['name']);
    
    const { code, name, category, subCategory, supplierId, safetyStockLevel, costPerUnit, unit, notes } = data;
    
    try {
      // 2. 檢查分類是否提供
      if (!category || !subCategory) {
        throw new BusinessError(
          ApiErrorCode.INVALID_INPUT,
          '必須提供主分類和細分分類'
        );
      }

      // 3. 檢查分類是否存在
      const categoryQuery = await db.collection('materialCategories')
        .where('name', '==', category)
        .limit(1)
        .get();

      const subCategoryQuery = await db.collection('materialSubCategories')
        .where('name', '==', subCategory)
        .limit(1)
        .get();

      if (categoryQuery.empty) {
        throw new BusinessError(
          ApiErrorCode.NOT_FOUND,
          `主分類「${category}」不存在`
        );
      }

      if (subCategoryQuery.empty) {
        throw new BusinessError(
          ApiErrorCode.NOT_FOUND,
          `細分分類「${subCategory}」不存在`
        );
      }

      const mainCategoryId = categoryQuery.docs[0].data().id;
      const subCategoryId = subCategoryQuery.docs[0].data().id;

      // 4. 檢查物料名稱是否重複
      const existingMaterial = await db.collection('materials')
        .where('name', '==', name.trim())
        .limit(1)
        .get();
      
      if (!existingMaterial.empty) {
        throw new BusinessError(
          ApiErrorCode.ALREADY_EXISTS,
          `物料名稱「${name}」已經存在`,
          { name, existingId: existingMaterial.docs[0].id }
        );
      }

      // 5. 處理物料代號
      let finalCode = code;
      if (!finalCode) {
        // 自動生成唯一代號
        finalCode = await MaterialCodeGenerator.generateUniqueMaterialCode(mainCategoryId, subCategoryId);
      } else {
        // 檢查提供的代號是否重複
        const existingCodeMaterial = await db.collection('materials')
          .where('code', '==', finalCode)
          .limit(1)
          .get();
        
        if (!existingCodeMaterial.empty) {
          throw new BusinessError(
            ApiErrorCode.ALREADY_EXISTS,
            `物料代號「${finalCode}」已經存在`,
            { code: finalCode, existingId: existingCodeMaterial.docs[0].id }
          );
        }
      }

      // 6. 驗證數值欄位
      ErrorHandler.validateRange(safetyStockLevel || 0, 0, undefined, '安全庫存');
      ErrorHandler.validateRange(costPerUnit || 0, 0, undefined, '單位成本');

      // 7. 建立物料資料
      const rawMaterial: MaterialData = {
        code: finalCode,
        name: name.trim(),
        category: category || '',
        subCategory: subCategory || '',
        mainCategoryId,
        subCategoryId,
        safetyStockLevel: Number(safetyStockLevel) || 0,
        costPerUnit: Number(costPerUnit) || 0,
        unit: unit?.trim() || 'KG',
        currentStock: 0,
        notes: notes?.trim() || '',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      // 限制數值最多三位小數
      const newMaterial = formatMaterialNumbers(rawMaterial) as MaterialData;
      
      // 8. 處理供應商關聯
      if (supplierId) {
        // 檢查供應商是否存在
        const supplierDoc = await db.collection('suppliers').doc(supplierId).get();
        ErrorHandler.assertExists(supplierDoc.exists, '供應商', supplierId);
        
        newMaterial.supplierRef = db.collection('suppliers').doc(supplierId); 
      }
      
      // 9. 儲存到資料庫
      const docRef = await db.collection('materials').add(newMaterial);
      
      // 10. 返回標準化回應
      return {
        id: docRef.id,
        message: `物料「${name}」已成功建立`,
        operation: 'created' as const,
        resource: {
          type: 'material',
          name,
          code: finalCode,
        },
        generatedCode: finalCode
      };
      
    } catch (error) {
      throw ErrorHandler.handle(error, `建立物料: ${name}`);
    }
  }
);

/**
 * 更新物料資料
 */
export const updateMaterial = CrudApiHandlers.createUpdateHandler<UpdateMaterialRequest, StandardResponses.CrudResponse & { updatedCode: string }>(
  'Material',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['materialId', 'name', 'category', 'subCategory']);
    
    const { materialId, name, category, subCategory, supplierId, currentStock, safetyStockLevel, costPerUnit, unit, notes } = data;
    
    try {
      // 2. 檢查物料是否存在
      const materialRef = db.collection('materials').doc(materialId);
      const materialDoc = await materialRef.get();

      ErrorHandler.assertExists(materialDoc.exists, '物料', materialId);

      const currentMaterial = materialDoc.data() as MaterialData;
      let updatedCode = currentMaterial.code;

      // 3. 檢查物料名稱是否與其他物料重複（除了自己）
      if (name.trim() !== currentMaterial.name) {
        const duplicateCheck = await db.collection('materials')
          .where('name', '==', name.trim())
          .limit(1)
          .get();
        
        if (!duplicateCheck.empty && duplicateCheck.docs[0].id !== materialId) {
          throw new BusinessError(
            ApiErrorCode.ALREADY_EXISTS,
            `物料名稱「${name}」已經存在`,
            { name, conflictId: duplicateCheck.docs[0].id }
          );
        }
      }

      // 4. 如果分類有改變，更新物料代號
      if (category !== currentMaterial.category || subCategory !== currentMaterial.subCategory) {
        const newMainCategoryId = await MaterialCodeGenerator.getCategoryId(category, 'category');
        const newSubCategoryId = await MaterialCodeGenerator.getCategoryId(subCategory, 'subCategory');

        if (!newMainCategoryId || !newSubCategoryId) {
          throw new BusinessError(
            ApiErrorCode.NOT_FOUND,
            `分類「${category}/${subCategory}」不存在，請先建立分類`
          );
        }

        // 保持隨機生成碼不變，只更新分類部分
        updatedCode = MaterialCodeGenerator.updateMaterialCode(currentMaterial.code, newMainCategoryId, newSubCategoryId);

        logger.info(`物料 ${materialId} 分類改變，更新代號從 ${currentMaterial.code} 到 ${updatedCode}`);
      }

      // 5. 驗證數值欄位
      ErrorHandler.validateRange(safetyStockLevel || 0, 0, undefined, '安全庫存');
      ErrorHandler.validateRange(costPerUnit || 0, 0, undefined, '單位成本');
      ErrorHandler.validateRange(currentStock || 0, 0, undefined, '目前庫存');

      // 6. 檢查庫存是否有變更
      const oldStock = currentMaterial.currentStock || 0;
      const newStock = Number(currentStock) || 0;
      const stockChanged = oldStock !== newStock;

      // 7. 準備更新資料
      const rawUpdateData: Partial<MaterialData> = {
        name: name.trim(),
        category: category?.trim() || '',
        subCategory: subCategory?.trim() || '',
        code: updatedCode,
        currentStock: newStock,
        safetyStockLevel: Number(safetyStockLevel) || 0,
        costPerUnit: Number(costPerUnit) || 0,
        unit: unit?.trim() || 'KG',
        notes: notes?.trim() || '',
        updatedAt: FieldValue.serverTimestamp(),
      };

      // 限制數值最多三位小數
      const updateData = formatMaterialNumbers(rawUpdateData) as Partial<MaterialData>;

      // 8. 處理供應商關聯
      if (supplierId) {
        // 檢查供應商是否存在
        const supplierDoc = await db.collection('suppliers').doc(supplierId).get();
        ErrorHandler.assertExists(supplierDoc.exists, '供應商', supplierId);
        
        updateData.supplierRef = db.collection('suppliers').doc(supplierId);
      } else {
        updateData.supplierRef = FieldValue.delete();
      }

      // 9. 更新資料庫
      await materialRef.update(updateData);
      
      // 10. 如果庫存有變更，建立庫存紀錄
      if (stockChanged && context.auth?.uid) {
        await InventoryRecordManager.createInventoryRecord(
          materialId,
          name,
          updatedCode,
          oldStock,
          newStock,
          context.auth.uid,
          context.auth.token?.name
        );
      }
      
      // 11. 返回標準化回應
      return {
        id: materialId,
        message: `物料「${name}」已成功更新`,
        operation: 'updated' as const,
        resource: {
          type: 'material',
          name,
          code: updatedCode,
        },
        updatedCode
      };
      
    } catch (error) {
      throw ErrorHandler.handle(error, `更新物料: ${materialId}`);
    }
  }
);

/**
 * 刪除物料請求介面
 */
interface DeleteMaterialRequest {
  materialId: string;
}

/**
 * 刪除物料
 */
export const deleteMaterial = CrudApiHandlers.createDeleteHandler<DeleteMaterialRequest, StandardResponses.CrudResponse>(
  'Material',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['materialId']);
    
    const { materialId } = data;
    
    try {
      // 2. 檢查物料是否存在
      const materialRef = db.collection('materials').doc(materialId);
      const materialDoc = await materialRef.get();
      
      ErrorHandler.assertExists(materialDoc.exists, '物料', materialId);
      
      const materialData = materialDoc.data() as MaterialData;
      const materialName = materialData.name;
      const materialCode = materialData.code;
      
      // 3. 檢查是否有相關聯的資料（防止誤刪）
      const relatedWorkOrders = await db.collection('work_orders')
        .where('materials', 'array-contains', { materialId })
        .limit(1)
        .get();
      
      const relatedPurchaseOrders = await db.collection('purchase_orders')
        .where('items', 'array-contains', { materialId })
        .limit(1)
        .get();
      
      if (!relatedWorkOrders.empty || !relatedPurchaseOrders.empty) {
        throw new BusinessError(
          ApiErrorCode.OPERATION_CONFLICT,
          `無法刪除物料「${materialName}」，因為仍有工單或採購訂單與此物料相關聯`,
          {
            relatedWorkOrdersCount: relatedWorkOrders.size,
            relatedPurchaseOrdersCount: relatedPurchaseOrders.size
          }
        );
      }
      
      // 4. 刪除物料
      await materialRef.delete();
      
      // 5. 返回標準化回應
      return {
        id: materialId,
        message: `物料「${materialName}」已成功刪除`,
        operation: 'deleted' as const,
        resource: {
          type: 'material',
          name: materialName,
          code: materialCode,
        }
      };
      
    } catch (error) {
      throw ErrorHandler.handle(error, `刪除物料: ${materialId}`);
    }
  }
);


/**
 * 批量匯入原料
 */
export const importMaterials = CrudApiHandlers.createCreateHandler<ImportMaterialsRequest, BatchOperationResult>(
  'ImportMaterials',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['materials']);

    const { materials } = data;

    if (!Array.isArray(materials) || materials.length === 0) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        '原料列表不能為空'
      );
    }

    if (materials.length > 500) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        `批量匯入限制為500筆資料，目前有${materials.length}筆`
      );
    }

    const results: BatchOperationResult = {
      successful: [],
      failed: [],
      summary: {
        total: materials.length,
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

      // 3. 預先載入現有原料（用於檢查重複）
      const existingMaterialsSnapshot = await db.collection('materials').get();
      const existingMaterialsMap = new Map<string, { id: string; data: MaterialData }>();
      existingMaterialsSnapshot.forEach(doc => {
        const data = doc.data() as MaterialData;
        existingMaterialsMap.set(data.code, { id: doc.id, data });
      });

      // 4. 處理每個原料
      for (let i = 0; i < materials.length; i++) {
        const materialItem = materials[i];

        try {
          // 對於更新操作，原料名稱可以為空（保持原有）
          // 對於新增操作，原料名稱必填
          let materialCode = materialItem.code?.trim();
          // 移除CSV匯出時為保護前置0而添加的引號
          if (materialCode && materialCode.startsWith("'")) {
            materialCode = materialCode.substring(1);
          }
          const isUpdating = materialCode && existingMaterialsMap.has(materialCode);

          if (!isUpdating && !materialItem.name?.trim()) {
            throw new Error('新增原料時，原料名稱為必填欄位');
          }

          const name = materialItem.name?.trim() || (isUpdating ? existingMaterialsMap.get(materialCode!)?.data.name || '' : '');
          const category = materialItem.categoryName?.trim() || materialItem.category?.trim() || '';
          const subCategory = materialItem.subCategoryName?.trim() || materialItem.subCategory?.trim() || '';
          const unit = materialItem.unit?.trim() || 'KG';
          // 安全的數值轉換，處理字串和數字
          const parseNumber = (value: any, defaultValue: number = 0): number => {
            if (value === null || value === undefined || value === '') return defaultValue;
            const num = Number(String(value).replace(/['"]/g, '').trim());
            return isNaN(num) ? defaultValue : num;
          };

          const currentStock = parseNumber(materialItem.currentStock, 0);
          const safetyStockLevel = parseNumber(materialItem.safetyStockLevel, 0);
          const costPerUnit = parseNumber(materialItem.costPerUnit, 0);

          // 數值驗證
          if (currentStock < 0) throw new Error('庫存數量不能為負數');
          if (safetyStockLevel < 0) throw new Error('安全庫存不能為負數');
          if (costPerUnit < 0) throw new Error('單位成本不能為負數');

          // 處理供應商
          let supplierRef: DocumentReference | undefined;
          if (materialItem.supplierName?.trim()) {
            const supplierName = materialItem.supplierName.trim();
            const supplierId = suppliersMap.get(supplierName);
            if (!supplierId) {
              throw new Error(`找不到供應商「${supplierName}」`);
            }
            supplierRef = db.collection('suppliers').doc(supplierId);
          }

          // 檢查是否已存在相同代號的原料
          let isUpdate = false;
          let materialId: string;

          if (materialCode && existingMaterialsMap.has(materialCode)) {
            // 更新現有原料 - 智能差異比對
            isUpdate = true;
            const existing = existingMaterialsMap.get(materialCode)!;
            materialId = existing.id;
            const existingData = existing.data;

            const updateData: Partial<MaterialData> = {};
            let hasChanges = false;

            // 比對所有欄位，只更新有差異的部分

            // 文字欄位比對
            if (materialItem.name && materialItem.name.trim() !== existingData.name) {
              updateData.name = materialItem.name.trim();
              hasChanges = true;
            }

            // 分類處理邏輯：
            // 1. 如果匯入的分類名稱與現有相同 → 跳過（正確，不需更新）
            // 2. 如果匯入的分類名稱與現有不同 → 查詢新分類是否存在
            //    - 存在 → 更新為新分類
            //    - 不存在 → 跳過（保持原有）
            // 3. 如果沒有提供分類名稱 → 跳過（保持原有）

            if (materialItem.categoryName !== undefined && materialItem.categoryName !== null && materialItem.categoryName !== '') {
              const importCategoryName = materialItem.categoryName.trim();
              const currentCategoryName = existingData.category || '';

              // 只有當名稱真的不同時才處理
              if (importCategoryName !== currentCategoryName) {
                // 查詢新分類是否存在
                const categoryQuery = await db.collection('materialCategories')
                  .where('name', '==', importCategoryName)
                  .limit(1)
                  .get();

                if (!categoryQuery.empty) {
                  // 分類存在，更新名稱和ID
                  updateData.category = importCategoryName;
                  updateData.mainCategoryId = categoryQuery.docs[0].id;
                  hasChanges = true;
                  logger.info(`更新分類: ${currentCategoryName} → ${importCategoryName}`);
                } else {
                  logger.warn(`分類 "${importCategoryName}" 不存在，保持原有分類 "${currentCategoryName}"`);
                }
              }
            }

            if (materialItem.subCategoryName !== undefined && materialItem.subCategoryName !== null && materialItem.subCategoryName !== '') {
              const importSubCategoryName = materialItem.subCategoryName.trim();
              const currentSubCategoryName = existingData.subCategory || '';

              // 只有當名稱真的不同時才處理
              if (importSubCategoryName !== currentSubCategoryName) {
                // 查詢新子分類是否存在
                const subCategoryQuery = await db.collection('materialSubCategories')
                  .where('name', '==', importSubCategoryName)
                  .limit(1)
                  .get();

                if (!subCategoryQuery.empty) {
                  // 子分類存在，更新名稱和ID
                  updateData.subCategory = importSubCategoryName;
                  updateData.subCategoryId = subCategoryQuery.docs[0].id;
                  hasChanges = true;
                  logger.info(`更新子分類: ${currentSubCategoryName} → ${importSubCategoryName}`);
                } else {
                  logger.warn(`子分類 "${importSubCategoryName}" 不存在，保持原有子分類 "${currentSubCategoryName}"`);
                }
              }
            }

            if (materialItem.unit && materialItem.unit.trim() !== existingData.unit) {
              updateData.unit = materialItem.unit.trim();
              hasChanges = true;
            }

            // 數值欄位比對（包括0值）- 使用安全轉換
            const parseNumberSafe = (value: any, defaultValue: number = 0): number => {
              if (value === null || value === undefined || value === '') return defaultValue;
              const num = Number(String(value).replace(/['"]/g, '').trim());
              return isNaN(num) ? defaultValue : num;
            };

            if (materialItem.currentStock !== undefined && materialItem.currentStock !== null && String(materialItem.currentStock) !== '') {
              const newStock = parseNumberSafe(materialItem.currentStock);
              if (newStock !== (existingData.currentStock || 0)) {
                updateData.currentStock = newStock;
                hasChanges = true;
              }
            }

            if (materialItem.safetyStockLevel !== undefined && materialItem.safetyStockLevel !== null && String(materialItem.safetyStockLevel) !== '') {
              const newSafetyLevel = parseNumberSafe(materialItem.safetyStockLevel);
              if (newSafetyLevel !== (existingData.safetyStockLevel || 0)) {
                updateData.safetyStockLevel = newSafetyLevel;
                hasChanges = true;
              }
            }

            if (materialItem.costPerUnit !== undefined && materialItem.costPerUnit !== null && String(materialItem.costPerUnit) !== '') {
              const newCost = parseNumberSafe(materialItem.costPerUnit);
              if (newCost !== (existingData.costPerUnit || 0)) {
                updateData.costPerUnit = newCost;
                hasChanges = true;
              }
            }

            // 供應商比對
            if (supplierRef) {
              const existingSupplierRefId = (existingData.supplierRef as any)?.id || null;
              const newSupplierRefId = (supplierRef as any).id;
              if (newSupplierRefId !== existingSupplierRefId) {
                updateData.supplierRef = supplierRef;
                hasChanges = true;
              }
            }

            // 只有有變更時才執行更新
            if (hasChanges) {
              updateData.updatedAt = FieldValue.serverTimestamp();
              await db.collection('materials').doc(materialId).update(updateData);

              logger.info(`原料 ${materialCode} 有變更，更新欄位:`, Object.keys(updateData));
            } else {
              logger.info(`原料 ${materialCode} 無變更，跳過更新`);
            }

            // 如果庫存有變更，建立庫存紀錄
            const oldStock = existing.data.currentStock || 0;
            if (oldStock !== currentStock && context.auth?.uid) {
              await InventoryRecordManager.createInventoryRecord(
                materialId,
                existing.data.name,
                existing.data.code,
                oldStock,
                currentStock,
                context.auth.uid,
                context.auth.token?.name || '未知用戶',
                'import',
                `批量匯入更新 - 從 ${oldStock} 更新為 ${currentStock}`
              );
            }

            if (hasChanges) {
              results.successful.push({
                code: materialCode,
                name: updateData.name || existing.data.name,
                operation: 'updated',
                message: `原料「${updateData.name || existing.data.name}」已更新 (${Object.keys(updateData).filter(k => k !== 'updatedAt').join(', ')})`
              });
            } else {
              results.successful.push({
                code: materialCode,
                name: existing.data.name,
                operation: 'skipped',
                message: `原料「${existing.data.name}」無變更，跳過更新`
              });
            }

          } else {
            // 建立新原料
            if (!materialCode) {
              // 如果沒有提供代號且分類不存在，跳過此項
              if (!category || !subCategory) {
                throw new Error(`新增原料需要提供代號或完整的分類資訊`);
              }

              // 檢查分類是否存在
              const categoryQuery = await db.collection('materialCategories')
                .where('name', '==', category)
                .limit(1)
                .get();

              const subCategoryQuery = await db.collection('materialSubCategories')
                .where('name', '==', subCategory)
                .limit(1)
                .get();

              if (categoryQuery.empty || subCategoryQuery.empty) {
                throw new Error(`分類「${category}/${subCategory}」不存在，請先建立分類`);
              }

              const mainCategoryId = categoryQuery.docs[0].data().id;
              const subCategoryId = subCategoryQuery.docs[0].data().id;
              materialCode = await MaterialCodeGenerator.generateUniqueMaterialCode(mainCategoryId, subCategoryId);
            } else if (existingMaterialsMap.has(materialCode)) {
              throw new Error(`原料代號「${materialCode}」已存在`);
            }

            // 準備要儲存的資料（需要包含分類ID）
            const materialData: MaterialData = {
              code: materialCode,
              name,
              category,
              subCategory,
              currentStock,
              safetyStockLevel,
              costPerUnit,
              unit,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            };

            // 如果有提供分類名稱，查詢並加入分類ID
            if (category) {
              const categoryQuery = await db.collection('materialCategories')
                .where('name', '==', category)
                .limit(1)
                .get();

              if (!categoryQuery.empty) {
                materialData.mainCategoryId = categoryQuery.docs[0].id;
                console.log(`找到主分類「${category}」，ID: ${categoryQuery.docs[0].id}`);
              } else {
                // 如果分類不存在，清空分類欄位
                materialData.category = '';
                console.warn(`主分類「${category}」不存在，已清空`);
              }
            }

            if (subCategory) {
              const subCategoryQuery = await db.collection('materialSubCategories')
                .where('name', '==', subCategory)
                .limit(1)
                .get();

              if (!subCategoryQuery.empty) {
                materialData.subCategoryId = subCategoryQuery.docs[0].id;
                console.log(`找到子分類「${subCategory}」，ID: ${subCategoryQuery.docs[0].id}`);
              } else {
                // 如果子分類不存在，清空子分類欄位
                materialData.subCategory = '';
                console.warn(`子分類「${subCategory}」不存在，已清空`);
              }
            }

            if (supplierRef) {
              materialData.supplierRef = supplierRef;
            }

            const docRef = await db.collection('materials').add(materialData);
            materialId = docRef.id;

            // 建立初始庫存記錄
            if (currentStock > 0 && context.auth?.uid) {
              await InventoryRecordManager.createInventoryRecord(
                materialId,
                name,
                materialData.code,
                0,
                currentStock,
                context.auth.uid,
                context.auth.token?.name || '未知用戶',
                'import',
                `批量匯入初始庫存`
              );
            }

            // 更新本地快取
            existingMaterialsMap.set(materialCode, { id: materialId, data: materialData });

            results.successful.push({
              code: materialCode,
              name,
              operation: 'created',
              message: `原料「${name}」已建立，代號：${materialCode}`
            });
          }

          results.summary.successful++;

        } catch (itemError) {
          const errorMessage = itemError instanceof Error ? itemError.message : String(itemError);
          results.summary.failed++;
          results.failed.push({
            item: materialItem,
            error: errorMessage
          });

          logger.warn(`原料匯入項目失敗`, {
            index: i + 1,
            item: materialItem,
            error: errorMessage,
            requestId
          });
        }
      }

      // 5. 記錄操作結果
      logger.info(`原料批量匯入完成`, {
        total: results.summary.total,
        successful: results.summary.successful,
        failed: results.summary.failed,
        requestId
      });

      return results;

    } catch (error) {
      throw ErrorHandler.handle(error, `批量匯入原料`);
    }
  }
);

