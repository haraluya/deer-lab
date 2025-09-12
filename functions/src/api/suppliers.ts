// functions/src/api/suppliers.ts
/**
 * 🎯 鹿鹿小作坊 - 供應商管理 API (已標準化)
 * 
 * 升級時間：2025-09-12
 * 升級內容：套用統一 API 標準化架構
 * - 統一回應格式
 * - 統一錯誤處理
 * - 統一權限驗證
 * - 結構化日誌
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createApiHandler, CrudApiHandlers } from "../utils/apiWrapper";
import { BusinessError, ApiErrorCode, ErrorHandler } from "../utils/errorHandler";
import { Permission, UserRole } from "../middleware/auth";
import { StandardResponses } from "../types/api";

const db = getFirestore();

/**
 * 建立供應商介面
 */
interface CreateSupplierRequest {
  name: string;
  products?: string;
  contactWindow?: string;
  contactMethod?: string;
  liaisonPersonId?: string;
  notes?: string;
}

/**
 * 建立新供應商
 */
export const createSupplier = CrudApiHandlers.createCreateHandler<CreateSupplierRequest, StandardResponses.CrudResponse>(
  'Supplier',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['name']);
    
    const { name, products, contactWindow, contactMethod, liaisonPersonId, notes } = data;
    
    try {
      // 2. 檢查供應商名稱是否已存在
      const existingSupplier = await db.collection('suppliers')
        .where('name', '==', name)
        .limit(1)
        .get();
      
      if (!existingSupplier.empty) {
        throw new BusinessError(
          ApiErrorCode.ALREADY_EXISTS,
          `供應商名稱「${name}」已經存在`,
          { name }
        );
      }
      
      // 3. 建立供應商資料
      const newSupplier = {
        name: name.trim(),
        products: products?.trim() || '',
        contactWindow: contactWindow?.trim() || '',
        contactMethod: contactMethod?.trim() || '',
        liaisonPersonId: liaisonPersonId?.trim() || '',
        notes: notes?.trim() || '',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      
      // 4. 儲存到資料庫
      const docRef = await db.collection('suppliers').add(newSupplier);
      
      // 5. 返回標準化回應
      return {
        id: docRef.id,
        message: `供應商「${name}」已成功建立`,
        operation: 'created' as const,
        resource: {
          type: 'supplier',
          name,
        }
      };
      
    } catch (error) {
      // 統一錯誤處理（由 apiWrapper 自動處理）
      throw ErrorHandler.handle(error, `建立供應商: ${name}`);
    }
  }
);

/**
 * 更新供應商介面
 */
interface UpdateSupplierRequest {
  supplierId: string;
  name: string;
  products?: string;
  contactWindow?: string;
  contactMethod?: string;
  liaisonPersonId?: string;
  notes?: string;
}

/**
 * 更新供應商資料
 */
export const updateSupplier = CrudApiHandlers.createUpdateHandler<UpdateSupplierRequest, StandardResponses.CrudResponse>(
  'Supplier',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['supplierId', 'name']);
    
    const { supplierId, name, products, contactWindow, contactMethod, liaisonPersonId, notes } = data;
    
    try {
      // 2. 檢查供應商是否存在
      const supplierRef = db.collection('suppliers').doc(supplierId);
      const supplierDoc = await supplierRef.get();
      
      ErrorHandler.assertExists(supplierDoc.exists, '供應商', supplierId);
      
      const currentSupplier = supplierDoc.data()!;
      
      // 3. 檢查名稱是否與其他供應商重複（除了自己）
      if (name.trim() !== currentSupplier.name) {
        const duplicateCheck = await db.collection('suppliers')
          .where('name', '==', name.trim())
          .limit(1)
          .get();
        
        if (!duplicateCheck.empty && duplicateCheck.docs[0].id !== supplierId) {
          throw new BusinessError(
            ApiErrorCode.ALREADY_EXISTS,
            `供應商名稱「${name}」已經存在`,
            { name, conflictId: duplicateCheck.docs[0].id }
          );
        }
      }
      
      // 4. 準備更新資料
      const updateData = {
        name: name.trim(),
        products: products?.trim() || '',
        contactWindow: contactWindow?.trim() || '',
        contactMethod: contactMethod?.trim() || '',
        liaisonPersonId: liaisonPersonId?.trim() || '',
        notes: notes?.trim() || '',
        updatedAt: FieldValue.serverTimestamp(),
      };
      
      // 5. 更新資料庫
      await supplierRef.update(updateData);
      
      // 6. 返回標準化回應
      return {
        id: supplierId,
        message: `供應商「${name}」的資料已成功更新`,
        operation: 'updated' as const,
        resource: {
          type: 'supplier',
          name,
        }
      };
      
    } catch (error) {
      throw ErrorHandler.handle(error, `更新供應商: ${supplierId}`);
    }
  }
);

/**
 * 刪除供應商介面
 */
interface DeleteSupplierRequest {
  supplierId: string;
}

/**
 * 刪除供應商
 */
export const deleteSupplier = CrudApiHandlers.createDeleteHandler<DeleteSupplierRequest, StandardResponses.CrudResponse>(
  'Supplier',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['supplierId']);
    
    const { supplierId } = data;
    
    try {
      // 2. 檢查供應商是否存在
      const supplierRef = db.collection('suppliers').doc(supplierId);
      const supplierDoc = await supplierRef.get();
      
      ErrorHandler.assertExists(supplierDoc.exists, '供應商', supplierId);
      
      const supplierData = supplierDoc.data()!;
      const supplierName = supplierData.name;
      
      // 3. 檢查是否有相關聯的資料（可選：防止誤刪）
      // 檢查是否有物料使用此供應商
      const relatedMaterials = await db.collection('materials')
        .where('supplierRef', '==', supplierRef)
        .limit(1)
        .get();
      
      // 檢查是否有香精使用此供應商  
      const relatedFragrances = await db.collection('fragrances')
        .where('supplierRef', '==', supplierRef)
        .limit(1)
        .get();
      
      if (!relatedMaterials.empty || !relatedFragrances.empty) {
        throw new BusinessError(
          ApiErrorCode.OPERATION_CONFLICT,
          `無法刪除供應商「${supplierName}」，因為仍有物料或香精與此供應商相關聯`,
          {
            relatedMaterialsCount: relatedMaterials.size,
            relatedFragrancesCount: relatedFragrances.size
          }
        );
      }
      
      // 4. 刪除供應商
      await supplierRef.delete();
      
      // 5. 返回標準化回應
      return {
        id: supplierId,
        message: `供應商「${supplierName}」已成功刪除`,
        operation: 'deleted' as const,
        resource: {
          type: 'supplier',
          name: supplierName,
        }
      };
      
    } catch (error) {
      throw ErrorHandler.handle(error, `刪除供應商: ${supplierId}`);
    }
  }
);
