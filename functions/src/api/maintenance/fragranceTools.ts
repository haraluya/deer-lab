// functions/src/api/maintenance/fragranceTools.ts
/**
 * 🛠️ 德科斯特的實驗室 - 香精維護工具 API
 *
 * 用途：香精系統的診斷、修復和維護工具
 * 注意：這些API主要用於系統維護，平時不被前端直接調用
 * 權限：需要管理員權限
 */

import { logger } from "firebase-functions";
import { getFirestore, FieldValue, DocumentReference } from "firebase-admin/firestore";
import { createApiHandler, CrudApiHandlers } from "../../utils/apiWrapper";
import { BusinessError, ApiErrorCode, ErrorHandler } from "../../utils/errorHandler";
import { Permission, UserRole } from "../../middleware/auth";
import { StandardResponses } from "../../types/api";
import FragranceCalculations, { calculateCorrectRatios } from '../../utils/fragranceCalculations';

const db = getFirestore();

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
 * 香精狀態診斷回應介面
 */
interface DiagnoseFragranceStatusResponse {
  total: number;
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
    issue: string;
  }>;
}

/**
 * 修復香精狀態回應介面
 */
interface FixFragranceStatusResponse {
  fixedCount: number;
  message: string;
}

/**
 * 香精比例修復詳情
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
 * 修復香精比例回應介面
 */
interface FixAllFragranceRatiosResponse {
  fixedCount: number;
  fixDetails: FragranceRatioFixDetail[];
  message: string;
}

/**
 * 有問題的香精比例
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
}

/**
 * 正確的香精比例
 */
interface CorrectFragranceRatio {
  code: string;
  name: string;
  percentage: number;
  pgRatio: number;
  vgRatio: number;
}

/**
 * 香精比例診斷回應介面
 */
interface DiagnoseFragranceRatiosResponse {
  total: number;
  problematicCount: number;
  correctCount: number;
  problematicFragrances: ProblematicFragranceRatio[];
  correctFragrances: CorrectFragranceRatio[];
}

/**
 * 🔧 根據代號更新香精 - 維護工具
 * 支援智能更新模式，只更新有提供的欄位
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

      // 8. 處理供應商引用
      if (supplierId !== undefined && supplierId !== null && supplierId !== '') {
        updateData.supplierRef = db.doc(`suppliers/${supplierId}`);
      }

      // 9. 更新資料庫
      const fragranceRef = db.doc(`fragrances/${fragranceId}`);
      await fragranceRef.update(updateData);

      // 10. 返回標準化回應
      return {
        id: fragranceId,
        message: `香精「${name}」(編號: ${code}) 已成功更新`,
        operation: 'updated' as const,
        resource: {
          type: 'fragrance',
          name,
          code,
        }
      };

    } catch (error) {
      throw ErrorHandler.handle(error, `根據代號更新香精: ${code}`);
    }
  }
);

/**
 * 🔍 診斷香精狀態 - 系統診斷工具
 * 檢查所有香精的狀態分佈，找出有問題的香精
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
            issue: `invalid_status: ${status}`
          });
        }
      });

      // 3. 返回診斷結果
      return {
        total: allFragrances.length,
        statusStats,
        problematicFragrances
      };

    } catch (error) {
      throw ErrorHandler.handle(error, '診斷香精狀態');
    }
  }
);

/**
 * 🔧 修復香精狀態 - 系統修復工具
 * 批量修復所有無效或空的香精狀態
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
 * 🔧 批量修正香精比例 - 系統修復工具
 * 自動重新計算並修正所有香精的PG/VG比例
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
        logger.info(`[${requestId}] 所有香精比例正常，無需修正`);
      }

      // 4. 返回結果
      return {
        fixedCount,
        fixDetails,
        message: `修正完成，共修正 ${fixedCount} 個香精的比例`
      };

    } catch (error) {
      throw ErrorHandler.handle(error, '修正香精比例');
    }
  }
);

/**
 * 🔍 診斷香精比例 - 系統診斷工具
 * 檢查所有香精的PG/VG比例是否計算正確
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
              vgDiff
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
      return {
        total: fragrancesQuery.docs.length,
        problematicCount: problematicFragrances.length,
        correctCount: correctFragrances.length,
        problematicFragrances,
        correctFragrances
      };

    } catch (error) {
      throw ErrorHandler.handle(error, '診斷香精比例');
    }
  }
);