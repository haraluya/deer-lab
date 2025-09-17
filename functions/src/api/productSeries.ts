// functions/src/api/productSeries.ts
/**
 * 🎯 德科斯特的實驗室 - 產品系列管理 API
 *
 * 建立時間：2025-09-17
 * 功能：管理產品系列的 CRUD 操作
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { CrudApiHandlers } from "../utils/apiWrapper";
import { BusinessError, ApiErrorCode, ErrorHandler } from "../utils/errorHandler";
import { StandardResponses } from "../types/api";

const db = getFirestore();

/**
 * 建立產品系列介面
 */
interface CreateProductSeriesRequest {
  name: string;
  typeCode: string;
  description?: string;
}

/**
 * 更新產品系列介面
 */
interface UpdateProductSeriesRequest {
  id: string;
  name?: string;
  typeCode?: string;
  description?: string;
}

/**
 * 建立新產品系列
 */
export const createProductSeries = CrudApiHandlers.createCreateHandler<CreateProductSeriesRequest, StandardResponses.CrudResponse>(
  'ProductSeries',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['name', 'typeCode']);

    const { name, typeCode, description } = data;

    try {
      // 2. 檢查系列代碼是否已存在
      const existingCode = await db.collection('productSeries')
        .where('typeCode', '==', typeCode)
        .limit(1)
        .get();

      if (!existingCode.empty) {
        throw new BusinessError(
          ApiErrorCode.DUPLICATE_DATA,
          `系列代碼 ${typeCode} 已存在`
        );
      }

      // 3. 建立新系列
      const newSeriesRef = db.collection('productSeries').doc();
      const newSeriesData = {
        id: newSeriesRef.id,
        name,
        typeCode,
        description: description || '',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: context.auth?.uid || 'system',
        updatedBy: context.auth?.uid || 'system'
      };

      await newSeriesRef.set(newSeriesData);

      return {
        id: newSeriesRef.id,
        message: '產品系列建立成功',
        operation: 'created' as const,
        resource: {
          type: 'productSeries',
          name,
          code: typeCode
        }
      };

    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      throw new BusinessError(
        ApiErrorCode.DATABASE_ERROR,
        '建立產品系列時發生錯誤',
        error
      );
    }
  }
);

/**
 * 更新產品系列
 */
export const updateProductSeries = CrudApiHandlers.createUpdateHandler<UpdateProductSeriesRequest, StandardResponses.CrudResponse>(
  'ProductSeries',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['id']);

    const { id, name, typeCode, description } = data;

    try {
      // 2. 檢查系列是否存在
      const seriesRef = db.collection('productSeries').doc(id);
      const seriesDoc = await seriesRef.get();

      if (!seriesDoc.exists) {
        throw new BusinessError(
          ApiErrorCode.NOT_FOUND,
          `找不到ID為 ${id} 的產品系列`
        );
      }

      // 3. 如果修改代碼，檢查是否重複
      if (typeCode && typeCode !== seriesDoc.data()?.typeCode) {
        const existingCode = await db.collection('productSeries')
          .where('typeCode', '==', typeCode)
          .where('id', '!=', id)
          .limit(1)
          .get();

        if (!existingCode.empty) {
          throw new BusinessError(
            ApiErrorCode.DUPLICATE_DATA,
            `系列代碼 ${typeCode} 已存在`
          );
        }
      }

      // 4. 準備更新資料
      const updateData: any = {
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: context.auth?.uid || 'system'
      };

      if (name !== undefined) updateData.name = name;
      if (typeCode !== undefined) updateData.typeCode = typeCode;
      if (description !== undefined) updateData.description = description;

      // 5. 更新系列
      await seriesRef.update(updateData);

      return {
        id,
        message: '產品系列更新成功',
        operation: 'updated' as const,
        resource: {
          type: 'productSeries',
          name: name || seriesDoc.data()?.name,
          code: typeCode || seriesDoc.data()?.typeCode
        }
      };

    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      throw new BusinessError(
        ApiErrorCode.DATABASE_ERROR,
        '更新產品系列時發生錯誤',
        error
      );
    }
  }
);

/**
 * 刪除產品系列
 */
export const deleteProductSeries = CrudApiHandlers.createDeleteHandler<StandardResponses.CrudResponse>(
  'ProductSeries',
  async ({ id }, context, requestId) => {
    try {
      // 1. 檢查系列是否存在
      const seriesRef = db.collection('productSeries').doc(id);
      const seriesDoc = await seriesRef.get();

      if (!seriesDoc.exists) {
        throw new BusinessError(
          ApiErrorCode.NOT_FOUND,
          `找不到ID為 ${id} 的產品系列`
        );
      }

      // 2. 檢查是否有產品使用此系列
      const productsUsing = await db.collection('products')
        .where('productSeriesId', '==', id)
        .limit(1)
        .get();

      if (!productsUsing.empty) {
        throw new BusinessError(
          ApiErrorCode.INVALID_OPERATION,
          '無法刪除：此系列下還有產品'
        );
      }

      // 3. 刪除系列
      await seriesRef.delete();

      return {
        id,
        message: '產品系列刪除成功',
        operation: 'deleted' as const,
        resource: {
          type: 'productSeries',
          name: seriesDoc.data()?.name,
          code: seriesDoc.data()?.typeCode
        }
      };

    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      throw new BusinessError(
        ApiErrorCode.DATABASE_ERROR,
        '刪除產品系列時發生錯誤',
        error
      );
    }
  }
);