// functions/src/utils/apiWrapper.ts
/**
 * 🎯 鹿鹿小作坊 API 標準化 - API 包裝器工具
 * 
 * 建立時間：2025-09-12
 * 目的：提供統一的 API 函數包裝器，自動處理日誌、權限、錯誤、回應格式
 */

import { logger } from "firebase-functions";
import { onCall, CallableContext, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { 
  ApiResponse, 
  createSuccessResponse, 
  createErrorResponse, 
  generateRequestId 
} from "../types/api";
import { BusinessError, ApiErrorCode } from "./errorHandler";

/**
 * API 函數配置介面
 */
export interface ApiHandlerConfig {
  /** 函數名稱 (用於日誌) */
  functionName: string;
  /** 是否需要身份驗證 */
  requireAuth?: boolean;
  /** 需要的權限 */
  requiredPermission?: string;
  /** 需要的角色 */
  requiredRole?: 'admin' | 'foreman' | 'worker';
  /** 是否記錄詳細日誌 */
  enableDetailedLogging?: boolean;
  /** 自定義權限檢查函數 */
  customAuthCheck?: (uid: string, context: CallableContext) => Promise<void>;
  /** API 版本 */
  version?: string;
}

/**
 * API 處理器類型定義
 */
export type ApiHandler<TInput = any, TOutput = any> = (
  data: TInput,
  context: CallableContext,
  requestId: string
) => Promise<TOutput>;

/**
 * 創建標準化的 API 處理器
 * 
 * 自動處理：
 * - 請求 ID 生成
 * - 身份驗證和權限檢查
 * - 結構化日誌記錄
 * - 統一錯誤處理
 * - 統一回應格式
 * - 執行時間監控
 */
export function createApiHandler<TInput = any, TOutput = any>(
  config: ApiHandlerConfig,
  handler: ApiHandler<TInput, TOutput>
) {
  return onCall(async (request: CallableRequest<TInput>): Promise<ApiResponse<TOutput>> => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    // 提取請求資訊
    const { data, auth } = request;
    const uid = auth?.uid;
    const userEmail = auth?.token?.email;
    
    try {
      // 1. 記錄請求開始
      if (config.enableDetailedLogging) {
        logger.info(`[${requestId}] API Request Started`, {
          functionName: config.functionName,
          uid,
          userEmail,
          dataKeys: data ? Object.keys(data) : [],
          timestamp: new Date().toISOString()
        });
      }
      
      // 2. 身份驗證檢查
      if (config.requireAuth && !uid) {
        throw new BusinessError(
          ApiErrorCode.UNAUTHORIZED,
          '請先登入才能使用此功能'
        );
      }
      
      // 3. 權限檢查
      if (config.requiredPermission && uid) {
        // TODO: 實現權限檢查邏輯
        // await checkUserPermission(uid, config.requiredPermission);
      }
      
      if (config.requiredRole && uid) {
        // TODO: 實現角色檢查邏輯
        // await checkUserRole(uid, config.requiredRole);
      }
      
      // 4. 自定義權限檢查
      if (config.customAuthCheck && uid) {
        await config.customAuthCheck(uid, request);
      }
      
      // 5. 執行主要業務邏輯
      const result = await handler(data, request, requestId);
      
      // 6. 記錄成功結果
      const executionTime = Date.now() - startTime;
      logger.info(`[${requestId}] API Request Completed Successfully`, {
        functionName: config.functionName,
        uid,
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString()
      });
      
      // 7. 返回標準化成功回應
      return createSuccessResponse(result, undefined, requestId);
      
    } catch (error: any) {
      // 8. 統一錯誤處理
      const executionTime = Date.now() - startTime;
      
      // 記錄錯誤
      logger.error(`[${requestId}] API Request Failed`, {
        functionName: config.functionName,
        uid,
        userEmail,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString()
      });
      
      // 處理已知的業務錯誤
      if (error instanceof BusinessError) {
        return createErrorResponse(
          error.code,
          error.message,
          process.env.NODE_ENV === 'development' ? error.details : undefined,
          requestId
        );
      }
      
      // 處理 Firebase HttpsError
      if (error instanceof HttpsError) {
        return createErrorResponse(
          error.code.toUpperCase(),
          error.message,
          process.env.NODE_ENV === 'development' ? { details: error.details } : undefined,
          requestId
        );
      }
      
      // 處理未知錯誤
      return createErrorResponse(
        ApiErrorCode.INTERNAL_ERROR,
        '系統發生內部錯誤，請稍後再試',
        process.env.NODE_ENV === 'development' ? {
          originalError: error.message,
          stack: error.stack
        } : undefined,
        requestId
      );
    }
  });
}

/**
 * 創建簡化版 API 處理器（用於快速遷移現有 API）
 */
export function createSimpleApiHandler<TInput = any, TOutput = any>(
  functionName: string,
  handler: (data: TInput, context: CallableContext) => Promise<TOutput>
) {
  return createApiHandler(
    {
      functionName,
      requireAuth: false,
      enableDetailedLogging: false,
      version: '1.0.0'
    },
    async (data, context, requestId) => {
      return await handler(data, context);
    }
  );
}

/**
 * 創建需要管理員權限的 API 處理器
 */
export function createAdminApiHandler<TInput = any, TOutput = any>(
  functionName: string,
  handler: ApiHandler<TInput, TOutput>
) {
  return createApiHandler(
    {
      functionName,
      requireAuth: true,
      requiredRole: 'admin',
      enableDetailedLogging: true,
      version: '1.0.0'
    },
    handler
  );
}

/**
 * 創建需要領班權限的 API 處理器
 */
export function createForemanApiHandler<TInput = any, TOutput = any>(
  functionName: string,
  handler: ApiHandler<TInput, TOutput>
) {
  return createApiHandler(
    {
      functionName,
      requireAuth: true,
      requiredRole: 'foreman',
      enableDetailedLogging: true,
      version: '1.0.0'
    },
    handler
  );
}

/**
 * 創建 CRUD 操作的標準 API 處理器
 */
export namespace CrudApiHandlers {
  /**
   * 創建 Create 操作的 API 處理器
   */
  export function createCreateHandler<TInput = any, TOutput = any>(
    resourceName: string,
    handler: ApiHandler<TInput, TOutput>
  ) {
    return createAdminApiHandler(
      `create${resourceName}`,
      async (data, context, requestId) => {
        logger.info(`[${requestId}] Creating ${resourceName.toLowerCase()}`, {
          data: process.env.NODE_ENV === 'development' ? data : 'HIDDEN'
        });
        
        const result = await handler(data, context, requestId);
        
        logger.info(`[${requestId}] ${resourceName} created successfully`);
        return result;
      }
    );
  }
  
  /**
   * 創建 Update 操作的 API 處理器
   */
  export function createUpdateHandler<TInput = any, TOutput = any>(
    resourceName: string,
    handler: ApiHandler<TInput, TOutput>
  ) {
    return createAdminApiHandler(
      `update${resourceName}`,
      async (data, context, requestId) => {
        logger.info(`[${requestId}] Updating ${resourceName.toLowerCase()}`, {
          resourceId: (data as any)?.id || (data as any)?.materialId || (data as any)?.fragranceId || 'UNKNOWN'
        });
        
        const result = await handler(data, context, requestId);
        
        logger.info(`[${requestId}] ${resourceName} updated successfully`);
        return result;
      }
    );
  }
  
  /**
   * 創建 Delete 操作的 API 處理器
   */
  export function createDeleteHandler<TInput = any, TOutput = any>(
    resourceName: string,
    handler: ApiHandler<TInput, TOutput>
  ) {
    return createAdminApiHandler(
      `delete${resourceName}`,
      async (data, context, requestId) => {
        logger.info(`[${requestId}] Deleting ${resourceName.toLowerCase()}`, {
          resourceId: (data as any)?.id || (data as any)?.materialId || (data as any)?.fragranceId || 'UNKNOWN'
        });
        
        const result = await handler(data, context, requestId);
        
        logger.info(`[${requestId}] ${resourceName} deleted successfully`);
        return result;
      }
    );
  }
}

/**
 * API 效能監控工具
 */
export class ApiPerformanceMonitor {
  private static metrics: Map<string, {
    callCount: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    lastCalled: number;
  }> = new Map();
  
  static recordCall(functionName: string, executionTime: number) {
    const existing = this.metrics.get(functionName) || {
      callCount: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      lastCalled: 0
    };
    
    existing.callCount++;
    existing.totalExecutionTime += executionTime;
    existing.averageExecutionTime = existing.totalExecutionTime / existing.callCount;
    existing.lastCalled = Date.now();
    
    this.metrics.set(functionName, existing);
    
    // 記錄效能警告
    if (executionTime > 5000) { // 超過 5 秒
      logger.warn(`Slow API performance detected: ${functionName}`, {
        executionTime,
        averageExecutionTime: existing.averageExecutionTime,
        callCount: existing.callCount
      });
    }
  }
  
  static getMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics);
  }
}