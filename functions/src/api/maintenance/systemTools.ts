// functions/src/api/maintenance/systemTools.ts
/**
 * 🛠️ 德科斯特的實驗室 - 系統維護工具 API
 *
 * 用途：系統級的維護工具，包括批量匯入、工單管理、角色管理等
 * 注意：這些API主要用於系統維護和管理，平時不被前端直接調用
 * 權限：需要管理員權限
 */

import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, DocumentReference } from "firebase-admin/firestore";
import { createApiHandler } from "../../utils/apiWrapper";
import { BusinessError, ApiErrorCode, ErrorHandler } from "../../utils/errorHandler";
import { Permission, UserRole } from "../../middleware/auth";

const db = getFirestore();

/**
 * 批量匯入物料請求介面
 */
interface ImportMaterialsRequest {
  materials: Array<{
    code: string;
    name: string;
    category: string;
    subCategory?: string;
    supplierName?: string;
    unit?: string;
    currentStock?: number;
    costPerUnit?: number;
    safetyStockLevel?: number;
    description?: string;
    notes?: string;
  }>;
  createMissingSuppliers?: boolean;
  overwriteExisting?: boolean;
}

/**
 * 批量匯入回應介面
 */
interface ImportMaterialsResponse {
  totalProcessed: number;
  successCount: number;
  skippedCount: number;
  errorCount: number;
  createdSuppliers: number;
  details: Array<{
    code: string;
    name: string;
    status: 'success' | 'skipped' | 'error';
    message: string;
  }>;
  message: string;
}

/**
 * 更新工單請求介面
 */
interface UpdateWorkOrderRequest {
  workOrderId: string;
  updates: {
    status?: string;
    qcStatus?: string;
    actualQuantity?: number;
    targetQuantity?: number;
    notes?: string;
  };
}

/**
 * 工時記錄介面
 */
interface TimeRecordRequest {
  workOrderId: string;
  timeRecord: {
    personnelId: string;
    workDate: string;
    startTime: string;
    endTime: string;
    notes?: string;
  };
}

/**
 * 刪除工單請求介面
 */
interface DeleteWorkOrderRequest {
  workOrderId: string;
}

/**
 * 刪除供應商請求介面
 */
interface DeleteSupplierRequest {
  supplierId: string;
}

/**
 * 角色分配請求介面
 */
interface AssignUserRoleRequest {
  userId: string;
  roleId: string;
}

/**
 * 🔧 批量匯入物料 - 資料匯入工具
 * 支援Excel/CSV匯入物料資料，可自動創建供應商
 */
export const importMaterials = createApiHandler<ImportMaterialsRequest, ImportMaterialsResponse>(
  {
    functionName: 'importMaterials',
    requireAuth: true,
    requiredRole: UserRole.ADMIN,
    enableDetailedLogging: true,
    version: '1.0.0'
  },
  async (data, context, requestId) => {
    const { materials, createMissingSuppliers = true, overwriteExisting = false } = data;

    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      throw new BusinessError(
        ApiErrorCode.INVALID_INPUT,
        '匯入物料列表不能為空'
      );
    }

    try {
      let successCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      let createdSuppliers = 0;
      const details = [];
      const supplierCache = new Map();

      // 批量處理
      const batch = db.batch();
      const materialCollection = db.collection('materials');
      const supplierCollection = db.collection('suppliers');

      for (const material of materials) {
        try {
          // 驗證必填欄位
          if (!material.code || !material.name) {
            throw new Error('物料代號和名稱為必填欄位');
          }

          // 檢查是否已存在
          const existingQuery = await materialCollection
            .where('code', '==', material.code)
            .limit(1)
            .get();

          if (!existingQuery.empty && !overwriteExisting) {
            details.push({
              code: material.code,
              name: material.name,
              status: 'skipped',
              message: '物料已存在，跳過'
            });
            skippedCount++;
            continue;
          }

          // 處理供應商
          let supplierRef: DocumentReference | undefined;
          if (material.supplierName) {
            if (supplierCache.has(material.supplierName)) {
              supplierRef = supplierCache.get(material.supplierName);
            } else {
              // 查找現有供應商
              const supplierQuery = await supplierCollection
                .where('name', '==', material.supplierName)
                .limit(1)
                .get();

              if (!supplierQuery.empty) {
                supplierRef = supplierQuery.docs[0].ref;
                supplierCache.set(material.supplierName, supplierRef);
              } else if (createMissingSuppliers) {
                // 創建新供應商
                const newSupplierRef = supplierCollection.doc();
                batch.set(newSupplierRef, {
                  name: material.supplierName,
                  products: '',
                  contactWindow: '',
                  contactMethod: '',
                  liaisonPersonId: '',
                  notes: '批量匯入時自動創建',
                  createdAt: FieldValue.serverTimestamp(),
                  updatedAt: FieldValue.serverTimestamp()
                });

                supplierRef = newSupplierRef;
                supplierCache.set(material.supplierName, supplierRef);
                createdSuppliers++;
                logger.info(`[${requestId}] 自動創建供應商: ${material.supplierName}`);
              }
            }
          }

          // 準備物料資料
          const materialData = {
            code: material.code.trim(),
            name: material.name.trim(),
            category: material.category || 'common',
            subCategory: material.subCategory || '',
            supplierRef,
            unit: material.unit || 'kg',
            currentStock: Number(material.currentStock) || 0,
            costPerUnit: Number(material.costPerUnit) || 0,
            safetyStockLevel: Number(material.safetyStockLevel) || 0,
            description: material.description || '',
            notes: material.notes || '',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            lastStockUpdate: FieldValue.serverTimestamp()
          };

          // 添加到批次操作
          if (!existingQuery.empty && overwriteExisting) {
            batch.update(existingQuery.docs[0].ref, {
              ...materialData,
              updatedAt: FieldValue.serverTimestamp()
            });
          } else {
            const materialRef = materialCollection.doc();
            batch.set(materialRef, materialData);
          }

          details.push({
            code: material.code,
            name: material.name,
            status: 'success',
            message: existingQuery.empty ? '新建成功' : '更新成功'
          });
          successCount++;

        } catch (error) {
          details.push({
            code: material.code || '未知',
            name: material.name || '未知',
            status: 'error',
            message: error instanceof Error ? error.message : '未知錯誤'
          });
          errorCount++;
          logger.error(`[${requestId}] 處理物料失敗 ${material.code}:`, error);
        }
      }

      // 提交批次操作
      await batch.commit();

      const totalProcessed = materials.length;
      logger.info(`[${requestId}] 批量匯入完成：總數${totalProcessed}，成功${successCount}，跳過${skippedCount}，錯誤${errorCount}，創建供應商${createdSuppliers}`);

      return {
        totalProcessed,
        successCount,
        skippedCount,
        errorCount,
        createdSuppliers,
        details,
        message: `批量匯入完成：成功${successCount}項，跳過${skippedCount}項，錯誤${errorCount}項，創建${createdSuppliers}個供應商`
      };

    } catch (error) {
      logger.error(`[${requestId}] 批量匯入物料失敗:`, error);
      throw ErrorHandler.handle(error, '批量匯入物料');
    }
  }
);



