// functions/src/api/productTypes.ts
/**
 * 🎯 德科斯特的實驗室 - 產品類型管理 API
 *
 * 建立時間：2025-01-22
 * 功能：管理產品類型的 CRUD 操作
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { CrudApiHandlers } from "../utils/apiWrapper";
import { BusinessError, ApiErrorCode, ErrorHandler } from "../utils/errorHandler";
import { StandardResponses } from "../types/api";

const db = getFirestore();

/**
 * 建立產品類型介面
 */
interface CreateProductTypeRequest {
  name: string;
  code: string;
  color: string;
  description?: string;
  isActive?: boolean;
}

/**
 * 更新產品類型介面
 */
interface UpdateProductTypeRequest {
  id: string;
  name?: string;
  code?: string;
  color?: string;
  description?: string;
  isActive?: boolean;
}

/**
 * 建立新產品類型
 */
export const createProductType = CrudApiHandlers.createCreateHandler<CreateProductTypeRequest, StandardResponses.CrudResponse>(
  'ProductType',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['name', 'code', 'color']);

    const { name, code, color, description, isActive } = data;

    try {
      // 2. 檢查代碼是否已存在
      const existingCode = await db.collection('productTypes')
        .where('code', '==', code)
        .limit(1)
        .get();

      if (!existingCode.empty) {
        throw new BusinessError(
          ApiErrorCode.DUPLICATE_DATA,
          `產品類型代碼 ${code} 已存在`
        );
      }

      // 3. 檢查名稱是否已存在
      const existingName = await db.collection('productTypes')
        .where('name', '==', name)
        .limit(1)
        .get();

      if (!existingName.empty) {
        throw new BusinessError(
          ApiErrorCode.DUPLICATE_DATA,
          `產品類型名稱 ${name} 已存在`
        );
      }

      // 4. 建立新類型
      const newTypeRef = db.collection('productTypes').doc();
      const newTypeData: any = {
        id: newTypeRef.id,
        name,
        code,
        color,
        description: description || '',
        isActive: isActive !== false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: context.auth?.uid || 'system',
        updatedBy: context.auth?.uid || 'system'
      };

      await newTypeRef.set(newTypeData);

      return {
        id: newTypeRef.id,
        message: '產品類型建立成功',
        operation: 'created' as const,
        resource: {
          type: 'productType',
          name,
          code
        }
      };

    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      throw new BusinessError(
        ApiErrorCode.DATABASE_ERROR,
        '建立產品類型時發生錯誤',
        error
      );
    }
  }
);

/**
 * 更新產品類型
 */
export const updateProductType = CrudApiHandlers.createUpdateHandler<UpdateProductTypeRequest, StandardResponses.CrudResponse>(
  'ProductType',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['id']);

    const { id, name, code, color, description, isActive } = data;

    try {
      // 2. 檢查類型是否存在
      const typeRef = db.collection('productTypes').doc(id);
      const typeDoc = await typeRef.get();

      if (!typeDoc.exists) {
        throw new BusinessError(
          ApiErrorCode.NOT_FOUND,
          `找不到ID為 ${id} 的產品類型`
        );
      }

      // 3. 如果修改代碼，檢查是否重複
      if (code && code !== typeDoc.data()?.code) {
        const existingCode = await db.collection('productTypes')
          .where('code', '==', code)
          .limit(1)
          .get();

        if (!existingCode.empty && existingCode.docs[0].id !== id) {
          throw new BusinessError(
            ApiErrorCode.DUPLICATE_DATA,
            `產品類型代碼 ${code} 已存在`
          );
        }
      }

      // 4. 如果修改名稱，檢查是否重複
      if (name && name !== typeDoc.data()?.name) {
        const existingName = await db.collection('productTypes')
          .where('name', '==', name)
          .limit(1)
          .get();

        if (!existingName.empty && existingName.docs[0].id !== id) {
          throw new BusinessError(
            ApiErrorCode.DUPLICATE_DATA,
            `產品類型名稱 ${name} 已存在`
          );
        }
      }

      // 5. 準備更新資料
      const updateData: any = {
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: context.auth?.uid || 'system'
      };

      if (name !== undefined) updateData.name = name;
      if (code !== undefined) updateData.code = code;
      if (color !== undefined) updateData.color = color;
      if (description !== undefined) updateData.description = description;
      if (isActive !== undefined) updateData.isActive = isActive;

      // 6. 更新類型
      await typeRef.update(updateData);

      return {
        id,
        message: '產品類型更新成功',
        operation: 'updated' as const,
        resource: {
          type: 'productType',
          name: name || typeDoc.data()?.name,
          code: code || typeDoc.data()?.code
        }
      };

    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      throw new BusinessError(
        ApiErrorCode.DATABASE_ERROR,
        '更新產品類型時發生錯誤',
        error
      );
    }
  }
);

/**
 * 刪除產品類型
 */
export const deleteProductType = CrudApiHandlers.createDeleteHandler<StandardResponses.CrudResponse>(
  'ProductType',
  async ({ id }, context, requestId) => {
    try {
      // 1. 檢查類型是否存在
      const typeRef = db.collection('productTypes').doc(id);
      const typeDoc = await typeRef.get();

      if (!typeDoc.exists) {
        throw new BusinessError(
          ApiErrorCode.NOT_FOUND,
          `找不到ID為 ${id} 的產品類型`
        );
      }

      // 2. 檢查是否有系列使用此類型
      const seriesUsing = await db.collection('productSeries')
        .where('productType', '==', `${typeDoc.data()?.name}(${typeDoc.data()?.code})`)
        .limit(1)
        .get();

      if (!seriesUsing.empty) {
        throw new BusinessError(
          ApiErrorCode.INVALID_OPERATION,
          '無法刪除：此產品類型下還有系列'
        );
      }

      // 3. 刪除類型
      await typeRef.delete();

      return {
        id,
        message: '產品類型刪除成功',
        operation: 'deleted' as const,
        resource: {
          type: 'productType',
          name: typeDoc.data()?.name,
          code: typeDoc.data()?.code
        }
      };

    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      throw new BusinessError(
        ApiErrorCode.DATABASE_ERROR,
        '刪除產品類型時發生錯誤',
        error
      );
    }
  }
);
