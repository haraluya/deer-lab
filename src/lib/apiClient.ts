// src/lib/apiClient.ts
/**
 * 🎯 德科斯特的實驗室 統一 API 客戶端
 * 
 * 建立時間：2025-09-12
 * 目的：統一前端 Firebase Functions API 調用，提供類型安全和錯誤處理
 */

import { httpsCallable, Functions } from 'firebase/functions';
import { getFunctionsInstance, getAuthInstance } from '@/lib/firebase';
import { toast } from 'sonner';

// =============================================================================
// 類型定義
// =============================================================================

/**
 * 標準化 API 回應介面 (與後端保持一致)
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: number;
    requestId: string;
    version: string;
  };
}

/**
 * API 調用選項
 */
export interface ApiCallOptions {
  /** 是否顯示載入中的 toast */
  showLoadingToast?: boolean;
  /** 載入中的訊息 */
  loadingMessage?: string;
  /** 是否自動顯示成功 toast */
  showSuccessToast?: boolean;
  /** 成功訊息 */
  successMessage?: string;
  /** 是否自動顯示錯誤 toast */
  showErrorToast?: boolean;
  /** 自訂錯誤處理 */
  customErrorHandler?: (error: any) => void;
  /** 請求超時時間 (毫秒) */
  timeout?: number;
}

/**
 * API 調用結果
 */
export interface ApiCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  rawResponse?: any;
}

// =============================================================================
// 核心 API 客戶端類別
// =============================================================================

export class ApiClient {
  private functions: Functions | null;
  private defaultOptions: ApiCallOptions;

  constructor(options: ApiCallOptions = {}) {
    this.functions = getFunctionsInstance();
    this.defaultOptions = {
      showLoadingToast: true,
      showSuccessToast: true,
      showErrorToast: true,
      timeout: 30000, // 30 秒超時
      ...options
    };
  }

  /**
   * 核心 API 調用方法
   */
  async call<TRequest = any, TResponse = any>(
    functionName: string,
    data?: TRequest,
    options: ApiCallOptions = {}
  ): Promise<ApiCallResult<TResponse>> {
    if (!this.functions) {
      throw new Error('Firebase Functions 尚未初始化');
    }

    // 🚨 重要：檢查身份驗證狀態
    const auth = getAuthInstance();
    if (!auth) {
      throw new Error('Firebase Auth 尚未初始化');
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('❌ 用戶未登入，無法調用 Firebase Functions');
      throw new Error('用戶未登入，請先登入再執行此操作');
    }

    const mergedOptions = { ...this.defaultOptions, ...options };
    let toastId: string | number | undefined;

    // 🔍 調試：記錄API調用開始（包含身份驗證資訊）
    console.log('🚀 統一API客戶端調用開始:', {
      functionName,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      options: mergedOptions,
      authUser: {
        uid: currentUser.uid,
        email: currentUser.email,
        isAuthenticated: true
      }
    });

    try {
      // 顯示載入中 toast
      if (mergedOptions.showLoadingToast) {
        toastId = toast.loading(mergedOptions.loadingMessage || '處理中...');
      }

      // 建立 Firebase callable function
      const callable = httpsCallable(this.functions, functionName, {
        timeout: mergedOptions.timeout
      });

      // 🔍 調試：記錄即將發送的資料和函數資訊
      console.log('📤 發送資料到 Firebase Function:', {
        functionName,
        payload: data,
        functionsInstance: !!this.functions,
        functionsApp: this.functions?.app?.name,
        functionsRegion: 'us-central1', // Firebase Functions 區域
        authContext: {
          userUid: currentUser.uid,
          userEmail: currentUser.email,
          hasIdToken: !!await currentUser.getIdToken(false).catch(() => null)
        }
      });

      // 設置超時處理
      const callPromise = callable(data || {}).catch(networkError => {
        console.error('🚨 Firebase Function 網路錯誤:', {
          functionName,
          errorCode: networkError.code,
          errorMessage: networkError.message,
          errorDetails: networkError.details,
          errorStack: networkError.stack
        });
        throw networkError;
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.error('⏰ Firebase Function 請求超時:', { functionName, timeout: mergedOptions.timeout });
          reject(new Error('請求超時'));
        }, mergedOptions.timeout);
      });

      // 執行調用 (帶超時)
      console.log('🔄 開始 Firebase Function 調用:', functionName);
      const result = await Promise.race([callPromise, timeoutPromise]) as any;
      console.log('✅ Firebase Function 調用完成:', functionName);

      // 🔍 調試：記錄原始回應
      console.log('📥 Firebase Function 原始回應:', {
        functionName,
        result: result,
        resultData: result?.data,
        hasData: !!result?.data
      });

      // 處理回應 - 修復：直接使用 result.data 而非嵌套
      const apiResponse: ApiResponse<TResponse> = result.data;
      
      // 🔍 調試：檢查回應格式
      console.log('🔍 回應格式檢查:', {
        functionName,
        isValidApiResponse: this.isValidApiResponse(apiResponse),
        apiResponseStructure: {
          hasSuccess: typeof apiResponse?.success === 'boolean',
          hasMeta: !!apiResponse?.meta,
          hasTimestamp: typeof apiResponse?.meta?.timestamp === 'number',
          hasRequestId: typeof apiResponse?.meta?.requestId === 'string'
        },
        apiResponse
      });

      // 統一回應格式檢查
      if (!this.isValidApiResponse(apiResponse)) {
        const adaptedResponse = this.adaptLegacyResponse(result.data);
        if (adaptedResponse) {
          // 🔍 調試：只有在適配成功時才顯示調試信息（降低噪音）
          console.log('🔧 API格式適配:', {
            functionName,
            adaptedVersion: adaptedResponse.meta?.version,
            success: true
          });
          return this.handleSuccessResponse(adaptedResponse, mergedOptions, toastId);
        }

        // 只有在適配失敗時才顯示警告
        console.log('⚠️ API回應格式不符，嘗試適配舊版格式:', {
          functionName,
          rawData: result.data
        });

        console.error('❌ API 回應格式不正確，無法處理:', {
          functionName,
          rawResponse: result,
          extractedData: result.data
        });
        throw new Error(`API 回應格式不正確: ${functionName}`);
      }

      // 🔍 調試：記錄成功/失敗狀態
      console.log('📊 API調用結果:', {
        functionName,
        success: apiResponse.success,
        hasData: !!apiResponse.data,
        hasError: !!apiResponse.error
      });

      if (apiResponse.success) {
        return this.handleSuccessResponse(apiResponse, mergedOptions, toastId);
      } else {
        return this.handleErrorResponse(apiResponse, mergedOptions, toastId);
      }

    } catch (error: any) {
      // 🔍 調試：記錄異常錯誤
      console.error('💥 統一API客戶端異常:', {
        functionName,
        error: error,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details
      });

      return this.handleExceptionError(error, mergedOptions, toastId, functionName);
    }
  }

  /**
   * 批次 API 調用 (並行執行)
   */
  async batchCall<T = any>(
    calls: Array<{ functionName: string; data?: any; options?: ApiCallOptions }>,
    globalOptions: ApiCallOptions = {}
  ): Promise<Array<ApiCallResult<T>>> {
    const promises = calls.map(call => 
      this.call<any, T>(call.functionName, call.data, { ...globalOptions, ...call.options })
    );

    try {
      return await Promise.all(promises);
    } catch (error) {
      console.error('批次 API 調用失敗:', error);
      throw error;
    }
  }

  /**
   * 重試機制的 API 調用
   */
  async callWithRetry<TRequest = any, TResponse = any>(
    functionName: string,
    data?: TRequest,
    options: ApiCallOptions & { maxRetries?: number; retryDelay?: number } = {}
  ): Promise<ApiCallResult<TResponse>> {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.call<TRequest, TResponse>(functionName, data, {
          ...options,
          showLoadingToast: attempt === 1 && options.showLoadingToast,
        });
        
        if (result.success) {
          return result;
        }
        
        // 如果是最後一次嘗試，返回錯誤結果
        if (attempt === maxRetries) {
          return result;
        }
        
        // 等待重試
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }

    throw new Error('重試次數已達上限');
  }

  // =============================================================================
  // 私有輔助方法
  // =============================================================================

  /**
   * 檢查是否為有效的 API 回應格式
   */
  private isValidApiResponse(response: any): response is ApiResponse {
    return response &&
           typeof response.success === 'boolean' &&
           response.meta &&
           typeof response.meta.timestamp === 'number' &&
           typeof response.meta.requestId === 'string';
  }

  /**
   * 適配舊版回應格式
   */
  private adaptLegacyResponse(response: any): ApiResponse | null {
    // 🔍 調試：記錄所有進入適配的回應
    console.log('🔧 適配舊版回應格式檢查:', {
      response,
      hasSuccess: typeof response.success === 'boolean',
      objectKeys: Object.keys(response || {}),
      objectKeysCount: Object.keys(response || {}).length,
      hasPurchaseOrderId: !!response.purchaseOrderId,
      hasReceivedItemsCount: !!response.receivedItemsCount,
      hasDataPurchaseOrderId: !!response.data?.purchaseOrderId,
      hasDataReceivedItemsCount: !!response.data?.receivedItemsCount
    });

    // 🎯 適配採購管理API簡化格式: { success: true } (僅限 updatePurchaseOrderStatus)
    // 排除 receivePurchaseOrderItems，因為它返回完整的標準格式
    if (typeof response.success === 'boolean' &&
        Object.keys(response).length <= 3 &&
        !response.purchaseOrderId && // receivePurchaseOrderItems 會有這個欄位
        !response.receivedItemsCount) { // receivePurchaseOrderItems 會有這個欄位
      return {
        success: response.success,
        data: response.success ? (response.message ? { message: response.message } : { message: '操作成功' }) : undefined,
        error: !response.success ? {
          code: 'PURCHASE_ORDER_ERROR',
          message: response.message || '採購操作失敗'
        } : undefined,
        meta: {
          timestamp: Date.now(),
          requestId: `purchase_adapted_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          version: 'purchase-order-legacy'
        }
      };
    }

    // 適配 materials.ts 舊格式: { status: "success", message: "...", materialId: "..." }
    if (response.status === 'success' || response.status === 'error') {
      return {
        success: response.status === 'success',
        data: response.materialId ? { id: response.materialId, message: response.message } : undefined,
        error: response.status === 'error' ? { 
          code: 'LEGACY_ERROR', 
          message: response.message || '操作失敗' 
        } : undefined,
        meta: {
          timestamp: Date.now(),
          requestId: `legacy_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          version: 'legacy'
        }
      };
    }

    // 適配 fragrances.ts 舊格式: { success: true, fragranceId: "..." }
    if (typeof response.success === 'boolean') {
      return {
        success: response.success,
        data: response.fragranceId ? { id: response.fragranceId } : response,
        error: !response.success ? {
          code: 'LEGACY_ERROR',
          message: response.message || '操作失敗'
        } : undefined,
        meta: {
          timestamp: Date.now(),
          requestId: `legacy_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          version: 'legacy'
        }
      };
    }

    // 🎯 適配 timeRecords 原始格式: { records: [...], summary: {...} }
    if (response.records && Array.isArray(response.records) && response.summary) {
      return {
        success: true,
        data: response,
        error: undefined,
        meta: {
          timestamp: Date.now(),
          requestId: `timeRecords_adapted_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          version: 'timeRecords-legacy'
        }
      };
    }

    // 🎯 適配香精歷史API舊格式: { success: true, data: [...], pagination: {...} }
    if (response.success && response.pagination && typeof response.success === 'boolean') {
      return {
        success: true,
        data: {
          data: response.data,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
          page: response.pagination.page,
          pageSize: response.pagination.pageSize
        },
        error: undefined,
        meta: {
          timestamp: Date.now(),
          requestId: `fragranceHistory_adapted_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          version: 'fragrance-history-legacy'
        }
      };
    }

    // 🎯 適配產品香精歷史API格式: { success: true, data: [...], count: number, message?: string }
    if (response.success && Array.isArray(response.data) && typeof response.count === 'number') {
      return {
        success: true,
        data: response.data,        // ✅ 直接使用，移除多餘包裝
        error: undefined,
        meta: {
          timestamp: Date.now(),
          requestId: `productFragranceHistory_adapted_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          version: 'product-fragrance-history-fixed'
        }
      };
    }

    // 🎯 適配 BatchOperationResult 格式（quickUpdateInventory 等批量操作）
    if (response.summary && typeof response.summary === 'object' &&
        Array.isArray(response.successful) && Array.isArray(response.failed)) {

      console.log('🔧 BatchOperationResult 適配邏輯:', {
        summary: response.summary,
        successfulCount: response.summary.successful,
        failedCount: response.summary.failed,
        shouldBeSuccess: response.summary.total > 0 // 只要有總數就算操作了
      });

      return {
        success: true, // BatchOperationResult 本身能回傳就代表API調用成功
        data: response,
        error: undefined, // 讓前端自己處理部分失敗的情況
        meta: {
          timestamp: Date.now(),
          requestId: `batch_adapted_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          version: 'batch-operation-result-fixed'
        }
      };
    }


    // 🎯 適配任何包含 records 陣列的格式
    if (response.records && Array.isArray(response.records)) {
      return {
        success: true,
        data: response,
        error: undefined,
        meta: {
          timestamp: Date.now(),
          requestId: `records_adapted_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          version: 'records-legacy'
        }
      };
    }

    return null;
  }

  /**
   * 處理成功回應
   */
  private handleSuccessResponse<T>(
    response: ApiResponse<T>,
    options: ApiCallOptions,
    toastId?: string | number
  ): ApiCallResult<T> {
    // 🔍 調試：記錄成功處理
    console.log('✅ API調用成功處理:', {
      hasData: !!response.data,
      meta: response.meta,
      showSuccessToast: options.showSuccessToast,
      dataPreview: response.data
    });

    if (toastId !== undefined) {
      toast.dismiss(toastId);
    }

    if (options.showSuccessToast) {
      const message = options.successMessage ||
                     (response.data as any)?.message ||
                     '操作成功';
      toast.success(message);
    }

    return {
      success: true,
      data: response.data,
      rawResponse: response
    };
  }

  /**
   * 處理錯誤回應
   */
  private handleErrorResponse<T>(
    response: ApiResponse<T>,
    options: ApiCallOptions,
    toastId?: string | number
  ): ApiCallResult<T> {
    const error = response.error || { code: 'UNKNOWN_ERROR', message: '未知錯誤' };

    // 🔍 調試：記錄錯誤處理
    console.error('❌ API調用錯誤處理:', {
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      showErrorToast: options.showErrorToast,
      hasCustomHandler: !!options.customErrorHandler
    });

    if (toastId !== undefined) {
      toast.dismiss(toastId);
    }

    if (options.customErrorHandler) {
      options.customErrorHandler(error);
    } else if (options.showErrorToast) {
      toast.error(error.message);
    }

    return {
      success: false,
      error,
      rawResponse: response
    };
  }

  /**
   * 處理例外錯誤
   */
  private handleExceptionError(
    error: any,
    options: ApiCallOptions,
    toastId?: string | number,
    functionName?: string
  ): ApiCallResult {
    if (toastId !== undefined) {
      toast.dismiss(toastId);
    }

    // 特殊處理 Firebase Functions 錯誤
    let errorCode = error.code || 'EXCEPTION_ERROR';
    let errorMessage = error.message || '系統發生錯誤';

    // 檢查是否為 Firebase Functions 錯誤
    if (error.code === 'functions/not-found') {
      errorCode = 'API_NOT_FOUND';
      errorMessage = '請求的API功能暫時不可用，請稍後再試';
    } else if (error.code === 'functions/permission-denied') {
      errorCode = 'PERMISSION_DENIED';
      errorMessage = '您沒有權限執行此操作';
    } else if (error.code === 'functions/unauthenticated') {
      errorCode = 'UNAUTHENTICATED';
      errorMessage = '請先登入後再試';
    } else if (error.code === 'functions/deadline-exceeded' || error.message?.includes('timeout')) {
      errorCode = 'TIMEOUT';
      errorMessage = '請求超時，請稍後再試';
    } else if (error.code === 'functions/unavailable') {
      errorCode = 'SERVICE_UNAVAILABLE';
      errorMessage = '服務暫時不可用，請稍後再試';
    } else if (error.code === 'functions/internal') {
      errorCode = 'INTERNAL_ERROR';
      // 保留原始錯誤訊息以便診斷
      if (error.message && error.message.includes('contextAuth')) {
        errorMessage = '身份驗證失效，請重新登入後再試';
      } else {
        errorMessage = error.message || '伺服器發生內部錯誤，請稍後再試';
      }
    }

    const errorInfo = {
      code: errorCode,
      message: errorMessage,
      details: error
    };

    console.error('API 調用異常:', {
      originalError: error,
      processedError: errorInfo,
      functionName: functionName || error.functionName || 'unknown'
    });

    if (options.customErrorHandler) {
      options.customErrorHandler(errorInfo);
    } else if (options.showErrorToast) {
      toast.error(errorInfo.message);
    }

    return {
      success: false,
      error: errorInfo
    };
  }
}

// =============================================================================
// 全域 API 客戶端實例
// =============================================================================

/**
 * 預設 API 客戶端實例
 */
export const apiClient = new ApiClient();

/**
 * 無 toast 的 API 客戶端實例 (適用於背景操作)
 */
export const silentApiClient = new ApiClient({
  showLoadingToast: false,
  showSuccessToast: false,
  showErrorToast: false
});

// =============================================================================
// 便利的 API 調用函數
// =============================================================================

/**
 * 快速 API 調用
 */
export async function callApi<TRequest = any, TResponse = any>(
  functionName: string,
  data?: TRequest,
  options?: ApiCallOptions
): Promise<ApiCallResult<TResponse>> {
  return apiClient.call<TRequest, TResponse>(functionName, data, options);
}

/**
 * 靜默 API 調用 (無 toast 提示)
 */
export async function callApiSilent<TRequest = any, TResponse = any>(
  functionName: string,
  data?: TRequest,
  options?: Omit<ApiCallOptions, 'showLoadingToast' | 'showSuccessToast' | 'showErrorToast'>
): Promise<ApiCallResult<TResponse>> {
  return silentApiClient.call<TRequest, TResponse>(functionName, data, options);
}

/**
 * CRUD 操作的快捷方法
 */
export const crud = {
  /**
   * 建立資源
   */
  create: <T = any>(functionName: string, data: any, options?: ApiCallOptions) =>
    callApi<any, T>(functionName, data, {
      loadingMessage: '正在建立...',
      successMessage: '建立成功',
      ...options
    }),

  /**
   * 更新資源
   */
  update: <T = any>(functionName: string, data: any, options?: ApiCallOptions) =>
    callApi<any, T>(functionName, data, {
      loadingMessage: '正在更新...',
      successMessage: '更新成功',
      ...options
    }),

  /**
   * 刪除資源
   */
  delete: <T = any>(functionName: string, data: any, options?: ApiCallOptions) =>
    callApi<any, T>(functionName, data, {
      loadingMessage: '正在刪除...',
      successMessage: '刪除成功',
      ...options
    }),

  /**
   * 查詢資源
   */
  read: <T = any>(functionName: string, data?: any, options?: ApiCallOptions) =>
    callApiSilent<any, T>(functionName, data, options)
};

