// functions/src/api/productSeries.ts
/**
 * 🎯 德科斯特的實驗室 - 產品系列管理 API
 *
 * 建立時間：2025-09-17
 * 功能：管理產品系列的 CRUD 操作
 */

import { logger } from "firebase-functions";
import { getFirestore, FieldValue, DocumentReference } from "firebase-admin/firestore";
import { createApiHandler, CrudApiHandlers } from "../utils/apiWrapper";
import { BusinessError, ApiErrorCode, ErrorHandler } from "../utils/errorHandler";
import { Permission } from "../middleware/auth";
import { StandardResponses } from "../types/api";

const db = getFirestore();

/**
 * 產品系列資料介面
 */
interface ProductSeriesData {
  name: string;
  typeCode: string;
  description?: string;
  productType?: string;
  defaultMaterials?: {
    materialId: string;
    quantity: number;
  }[];
  commonMaterials?: DocumentReference[];
  isActive: boolean;
  createdAt?: FieldValue;
  updatedAt?: FieldValue;
}

/**
 * 建立產品系列請求
 */
interface CreateProductSeriesRequest {
  name: string;
  typeCode: string;
  description?: string;
  productType?: string;
  defaultMaterials?: {
    materialId: string;
    quantity: number;
  }[];
  isActive?: boolean;
}

/**
 * 更新產品系列請求
 */
interface UpdateProductSeriesRequest {
  id: string;
  name?: string;
  typeCode?: string;
  description?: string;
  productType?: string;
  defaultMaterials?: {
    materialId: string;
    quantity: number;
  }[];
  isActive?: boolean;
}

/**
 * 刪除產品系列請求
 */
interface DeleteProductSeriesRequest {
  id: string;
}

/**
 * 建立產品系列
 */
export const createProductSeries = CrudApiHandlers.createCreateHandler<
  CreateProductSeriesRequest,
  StandardResponses.CrudResponse
>(
  'ProductSeries',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['name', 'typeCode']);

    const { name, typeCode, description, productType, defaultMaterials, isActive = true } = data;

    try {
      // 2. 檢查系列代號是否已存在
      const existingSeries = await db.collection('productSeries')
        .where('typeCode', '==', typeCode.trim())
        .limit(1)
        .get();

      if (!existingSeries.empty) {
        throw new BusinessError(
          ApiErrorCode.ALREADY_EXISTS,
          `產品系列代號「${typeCode}」已經存在`,
          { typeCode }
        );
      }

      // 3. 準備系列資料
      const seriesData: ProductSeriesData = {
        name: name.trim(),
        typeCode: typeCode.trim(),
        description: description?.trim() || `${name} 系列`,
        productType: productType || '其他(ETC)',
        isActive,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      // 4. 處理預設物料
      if (defaultMaterials && defaultMaterials.length > 0) {
        // 將物料ID轉換為DocumentReference
        const materialRefs = await Promise.all(
          defaultMaterials.map(async (material) => {
            const materialDoc = await db.collection('materials').doc(material.materialId).get();
            if (!materialDoc.exists) {
              logger.warn(`物料 ${material.materialId} 不存在，跳過`);
              return null;
            }
            return db.collection('materials').doc(material.materialId);
          })
        );

        // 過濾掉不存在的物料
        seriesData.commonMaterials = materialRefs.filter((ref): ref is DocumentReference => ref !== null);
        seriesData.defaultMaterials = defaultMaterials.filter(m =>
          materialRefs.some(ref => ref?.id === m.materialId)
        );
      }

      // 5. 儲存到資料庫
      const docRef = await db.collection('productSeries').add(seriesData);

      // 6. 返回標準化回應
      return {
        id: docRef.id,
        message: `產品系列「${name}」已成功建立`,
        operation: 'created' as const,
        resource: {
          type: 'productSeries',
          name,
          code: typeCode,
        }
      };

    } catch (error) {
      throw ErrorHandler.handle(error, `建立產品系列: ${name} (${typeCode})`);
    }
  },
  {
    requiredPermission: Permission.MANAGE_PRODUCTS,
    enableLogging: true,
  }
);

/**
 * 更新產品系列
 */
export const updateProductSeries = CrudApiHandlers.createUpdateHandler<
  UpdateProductSeriesRequest,
  StandardResponses.CrudResponse
>(
  'ProductSeries',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['id']);

    const { id, name, typeCode, description, productType, defaultMaterials, isActive } = data;

    try {
      // 2. 檢查系列是否存在
      const seriesRef = db.collection('productSeries').doc(id);
      const seriesDoc = await seriesRef.get();

      ErrorHandler.assertExists(seriesDoc.exists, '產品系列', id);

      const currentSeries = seriesDoc.data() as ProductSeriesData;

      // 3. 檢查代號是否與其他系列重複（除了自己）
      if (typeCode && typeCode.trim() !== currentSeries.typeCode) {
        const duplicateCheck = await db.collection('productSeries')
          .where('typeCode', '==', typeCode.trim())
          .limit(1)
          .get();

        if (!duplicateCheck.empty && duplicateCheck.docs[0].id !== id) {
          throw new BusinessError(
            ApiErrorCode.ALREADY_EXISTS,
            `產品系列代號「${typeCode}」已經存在`,
            { typeCode, conflictId: duplicateCheck.docs[0].id }
          );
        }
      }

      // 4. 準備更新資料
      const updateData: Partial<ProductSeriesData> = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (name !== undefined) updateData.name = name.trim();
      if (typeCode !== undefined) updateData.typeCode = typeCode.trim();
      if (description !== undefined) updateData.description = description.trim();
      if (productType !== undefined) updateData.productType = productType;
      if (isActive !== undefined) updateData.isActive = isActive;

      // 5. 處理預設物料
      if (defaultMaterials !== undefined) {
        if (defaultMaterials.length > 0) {
          // 將物料ID轉換為DocumentReference
          const materialRefs = await Promise.all(
            defaultMaterials.map(async (material) => {
              const materialDoc = await db.collection('materials').doc(material.materialId).get();
              if (!materialDoc.exists) {
                logger.warn(`物料 ${material.materialId} 不存在，跳過`);
                return null;
              }
              return db.collection('materials').doc(material.materialId);
            })
          );

          // 過濾掉不存在的物料
          updateData.commonMaterials = materialRefs.filter((ref): ref is DocumentReference => ref !== null);
          updateData.defaultMaterials = defaultMaterials.filter(m =>
            materialRefs.some(ref => ref?.id === m.materialId)
          );
        } else {
          // 清空預設物料
          updateData.commonMaterials = [];
          updateData.defaultMaterials = [];
        }
      }

      // 6. 更新資料庫
      await seriesRef.update(updateData);

      // 7. 返回標準化回應
      return {
        id,
        message: `產品系列「${updateData.name || currentSeries.name}」已更新`,
        operation: 'updated' as const,
        resource: {
          type: 'productSeries',
          name: updateData.name || currentSeries.name,
          code: updateData.typeCode || currentSeries.typeCode,
        }
      };

    } catch (error) {
      throw ErrorHandler.handle(error, `更新產品系列: ${id}`);
    }
  },
  {
    requiredPermission: Permission.MANAGE_PRODUCTS,
    enableLogging: true,
  }
);

/**
 * 刪除產品系列
 */
export const deleteProductSeries = CrudApiHandlers.createDeleteHandler<
  DeleteProductSeriesRequest,
  StandardResponses.CrudResponse
>(
  'ProductSeries',
  async (data, context, requestId) => {
    // 1. 驗證必填欄位
    ErrorHandler.validateRequired(data, ['id']);

    const { id } = data;

    try {
      // 2. 檢查系列是否存在
      const seriesRef = db.collection('productSeries').doc(id);
      const seriesDoc = await seriesRef.get();

      ErrorHandler.assertExists(seriesDoc.exists, '產品系列', id);

      const seriesData = seriesDoc.data() as ProductSeriesData;

      // 3. 檢查是否有產品使用此系列
      const productsUsingSeriesQuery = await db.collection('products')
        .where('seriesRef', '==', seriesRef)
        .limit(1)
        .get();

      if (!productsUsingSeriesQuery.empty) {
        throw new BusinessError(
          ApiErrorCode.CANNOT_DELETE,
          `產品系列「${seriesData.name}」仍有產品使用中，無法刪除`,
          { seriesId: id, productsCount: productsUsingSeriesQuery.size }
        );
      }

      // 4. 刪除系列
      await seriesRef.delete();

      // 5. 返回標準化回應
      return {
        id,
        message: `產品系列「${seriesData.name}」已成功刪除`,
        operation: 'deleted' as const,
        resource: {
          type: 'productSeries',
          name: seriesData.name,
          code: seriesData.typeCode,
        }
      };

    } catch (error) {
      throw ErrorHandler.handle(error, `刪除產品系列: ${id}`);
    }
  },
  {
    requiredPermission: Permission.MANAGE_PRODUCTS,
    enableLogging: true,
  }
);