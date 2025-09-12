// src/hooks/useApiClient.ts
/**
 * 🎯 鹿鹿小作坊 API 客戶端 React Hook
 * 
 * 建立時間：2025-09-12
 * 目的：提供統一的 API 調用體驗，整合載入狀態、錯誤處理和類型安全
 */

import { useState, useCallback, useRef } from 'react';
import { apiClient, ApiCallOptions, ApiCallResult } from '@/lib/apiClient';
import { ApiEndpoints, ApiEndpointName, GetApiRequest, GetApiResponse } from '@/types/api-interfaces';

// =============================================================================
// 類型定義
// =============================================================================

export interface UseApiClientState {
  /** 是否正在載入中 */
  loading: boolean;
  /** 最後一次 API 調用的錯誤 */
  error: string | null;
  /** 最後一次成功調用的資料 */
  data: any | null;
  /** API 調用統計 */
  stats: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    lastCallTime: number | null;
  };
}

export interface UseApiClientOptions extends Omit<ApiCallOptions, 'showLoadingToast' | 'loadingMessage'> {
  /** 是否自動重置錯誤狀態 */
  autoResetError?: boolean;
  /** 錯誤重置延遲時間 (毫秒) */
  errorResetDelay?: number;
  /** 是否保留上一次成功的資料 */
  keepPreviousData?: boolean;
  /** 最大並行請求數 */
  maxConcurrentRequests?: number;
}

export interface UseApiClientReturn extends UseApiClientState {
  /**
   * 類型安全的 API 調用
   */
  call: <T extends ApiEndpointName>(
    endpoint: T,
    data?: GetApiRequest<T>,
    options?: ApiCallOptions
  ) => Promise<ApiCallResult<GetApiResponse<T>>>;

  /**
   * 通用 API 調用 (不限制端點名稱)
   */
  callGeneric: <TRequest = any, TResponse = any>(
    functionName: string,
    data?: TRequest,
    options?: ApiCallOptions
  ) => Promise<ApiCallResult<TResponse>>;

  /**
   * 批次 API 調用
   */
  batchCall: <T extends ApiEndpointName>(
    calls: Array<{
      endpoint: T;
      data?: GetApiRequest<T>;
      options?: ApiCallOptions;
    }>,
    globalOptions?: ApiCallOptions
  ) => Promise<Array<ApiCallResult<GetApiResponse<T>>>>;

  /**
   * 重試 API 調用
   */
  callWithRetry: <T extends ApiEndpointName>(
    endpoint: T,
    data?: GetApiRequest<T>,
    options?: ApiCallOptions & { maxRetries?: number; retryDelay?: number }
  ) => Promise<ApiCallResult<GetApiResponse<T>>>;

  /**
   * 手動重置狀態
   */
  reset: () => void;

  /**
   * 清除錯誤
   */
  clearError: () => void;

  /**
   * 取消所有進行中的請求
   */
  cancelAll: () => void;
}

// =============================================================================
// Hook 實現
// =============================================================================

export function useApiClient(options: UseApiClientOptions = {}): UseApiClientReturn {
  const {
    autoResetError = true,
    errorResetDelay = 5000,
    keepPreviousData = true,
    maxConcurrentRequests = 5,
    ...defaultApiOptions
  } = options;

  // 狀態管理
  const [state, setState] = useState<UseApiClientState>({
    loading: false,
    error: null,
    data: null,
    stats: {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      lastCallTime: null
    }
  });

  // 請求管理
  const activeRequestsRef = useRef<Set<string>>(new Set());
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // =============================================================================
  // 內部輔助函數
  // =============================================================================

  /**
   * 更新狀態
   */
  const updateState = useCallback((updates: Partial<UseApiClientState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * 更新統計
   */
  const updateStats = useCallback((success: boolean) => {
    updateState({
      stats: {
        ...state.stats,
        totalCalls: state.stats.totalCalls + 1,
        successfulCalls: state.stats.successfulCalls + (success ? 1 : 0),
        failedCalls: state.stats.failedCalls + (success ? 0 : 1),
        lastCallTime: Date.now()
      }
    });
  }, [state.stats, updateState]);

  /**
   * 處理載入狀態
   */
  const handleLoadingState = useCallback((requestId: string, isLoading: boolean) => {
    if (isLoading) {
      activeRequestsRef.current.add(requestId);
    } else {
      activeRequestsRef.current.delete(requestId);
    }
    
    const hasActiveRequests = activeRequestsRef.current.size > 0;
    updateState({ loading: hasActiveRequests });
  }, [updateState]);

  /**
   * 處理錯誤
   */
  const handleError = useCallback((error: string) => {
    updateState({ error });

    if (autoResetError && errorResetDelay > 0) {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        updateState({ error: null });
      }, errorResetDelay);
    }
  }, [autoResetError, errorResetDelay, updateState]);

  /**
   * 處理成功結果
   */
  const handleSuccess = useCallback((data: any) => {
    updateState({ 
      data,
      error: null
    });
  }, [updateState]);

  /**
   * 生成請求 ID
   */
  const generateRequestId = useCallback(() => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }, []);

  // =============================================================================
  // 主要 API 調用方法
  // =============================================================================

  /**
   * 類型安全的 API 調用
   */
  const call = useCallback(async <T extends ApiEndpointName>(
    endpoint: T,
    data?: GetApiRequest<T>,
    callOptions?: ApiCallOptions
  ): Promise<ApiCallResult<GetApiResponse<T>>> => {
    const requestId = generateRequestId();
    
    try {
      // 檢查並行請求限制
      if (activeRequestsRef.current.size >= maxConcurrentRequests) {
        throw new Error(`超過最大並行請求數限制 (${maxConcurrentRequests})`);
      }

      handleLoadingState(requestId, true);

      const mergedOptions: ApiCallOptions = {
        ...defaultApiOptions,
        ...callOptions,
        showLoadingToast: false, // 由 Hook 管理載入狀態
      };

      const result = await apiClient.call<GetApiRequest<T>, GetApiResponse<T>>(
        endpoint,
        data,
        mergedOptions
      );

      if (result.success) {
        handleSuccess(result.data);
        updateStats(true);
      } else {
        const errorMessage = result.error?.message || '未知錯誤';
        handleError(errorMessage);
        updateStats(false);
      }

      return result;

    } catch (error: any) {
      const errorMessage = error.message || '系統發生錯誤';
      handleError(errorMessage);
      updateStats(false);

      return {
        success: false,
        error: {
          code: 'HOOK_ERROR',
          message: errorMessage,
          details: error
        }
      };
    } finally {
      handleLoadingState(requestId, false);
    }
  }, [
    generateRequestId,
    maxConcurrentRequests,
    handleLoadingState,
    defaultApiOptions,
    handleSuccess,
    updateStats,
    handleError
  ]);

  /**
   * 通用 API 調用
   */
  const callGeneric = useCallback(async <TRequest = any, TResponse = any>(
    functionName: string,
    data?: TRequest,
    callOptions?: ApiCallOptions
  ): Promise<ApiCallResult<TResponse>> => {
    const requestId = generateRequestId();
    
    try {
      if (activeRequestsRef.current.size >= maxConcurrentRequests) {
        throw new Error(`超過最大並行請求數限制 (${maxConcurrentRequests})`);
      }

      handleLoadingState(requestId, true);

      const mergedOptions: ApiCallOptions = {
        ...defaultApiOptions,
        ...callOptions,
        showLoadingToast: false,
      };

      const result = await apiClient.call<TRequest, TResponse>(
        functionName,
        data,
        mergedOptions
      );

      if (result.success) {
        handleSuccess(result.data);
        updateStats(true);
      } else {
        const errorMessage = result.error?.message || '未知錯誤';
        handleError(errorMessage);
        updateStats(false);
      }

      return result;

    } catch (error: any) {
      const errorMessage = error.message || '系統發生錯誤';
      handleError(errorMessage);
      updateStats(false);

      return {
        success: false,
        error: {
          code: 'HOOK_ERROR',
          message: errorMessage,
          details: error
        }
      };
    } finally {
      handleLoadingState(requestId, false);
    }
  }, [
    generateRequestId,
    maxConcurrentRequests,
    handleLoadingState,
    defaultApiOptions,
    handleSuccess,
    updateStats,
    handleError
  ]);

  /**
   * 批次 API 調用
   */
  const batchCall = useCallback(async <T extends ApiEndpointName>(
    calls: Array<{
      endpoint: T;
      data?: GetApiRequest<T>;
      options?: ApiCallOptions;
    }>,
    globalOptions: ApiCallOptions = {}
  ): Promise<Array<ApiCallResult<GetApiResponse<T>>>> => {
    const requestId = generateRequestId();
    
    try {
      handleLoadingState(requestId, true);

      const promises = calls.map(callConfig => 
        call(callConfig.endpoint, callConfig.data, {
          ...globalOptions,
          ...callConfig.options,
          showLoadingToast: false,
          showSuccessToast: false,
          showErrorToast: false,
        })
      );

      const results = await Promise.all(promises);
      
      // 統計結果
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      // 更新統計 (批量)
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          totalCalls: prev.stats.totalCalls + results.length,
          successfulCalls: prev.stats.successfulCalls + successCount,
          failedCalls: prev.stats.failedCalls + failCount,
          lastCallTime: Date.now()
        }
      }));

      return results;

    } catch (error: any) {
      const errorMessage = error.message || '批次 API 調用失敗';
      handleError(errorMessage);
      throw error;
    } finally {
      handleLoadingState(requestId, false);
    }
  }, [call, generateRequestId, handleLoadingState, handleError]);

  /**
   * 重試 API 調用
   */
  const callWithRetry = useCallback(async <T extends ApiEndpointName>(
    endpoint: T,
    data?: GetApiRequest<T>,
    callOptions: ApiCallOptions & { maxRetries?: number; retryDelay?: number } = {}
  ): Promise<ApiCallResult<GetApiResponse<T>>> => {
    const { maxRetries = 3, retryDelay = 1000, ...apiOptions } = callOptions;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await call(endpoint, data, {
          ...apiOptions,
          showErrorToast: attempt === maxRetries, // 只在最後一次顯示錯誤
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
  }, [call]);

  // =============================================================================
  // 狀態管理方法
  // =============================================================================

  /**
   * 重置狀態
   */
  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      data: keepPreviousData ? state.data : null,
      stats: {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        lastCallTime: null
      }
    });
    
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  }, [keepPreviousData, state.data]);

  /**
   * 清除錯誤
   */
  const clearError = useCallback(() => {
    updateState({ error: null });
    
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  }, [updateState]);

  /**
   * 取消所有進行中的請求
   */
  const cancelAll = useCallback(() => {
    activeRequestsRef.current.clear();
    updateState({ loading: false });
  }, [updateState]);

  // =============================================================================
  // 返回 Hook 介面
  // =============================================================================

  return {
    ...state,
    call,
    callGeneric,
    batchCall,
    callWithRetry,
    reset,
    clearError,
    cancelAll
  };
}

// =============================================================================
// 便利的 Hook 變體
// =============================================================================

/**
 * 專用於 CRUD 操作的 Hook
 */
export function useApiCrud(options: UseApiClientOptions = {}) {
  const client = useApiClient(options);

  return {
    ...client,
    
    /**
     * 建立資源
     */
    create: <T extends ApiEndpointName>(
      endpoint: T,
      data: GetApiRequest<T>,
      options?: ApiCallOptions
    ) => client.call(endpoint, data, {
      successMessage: '建立成功',
      ...options
    }),

    /**
     * 更新資源
     */
    update: <T extends ApiEndpointName>(
      endpoint: T,
      data: GetApiRequest<T>,
      options?: ApiCallOptions
    ) => client.call(endpoint, data, {
      successMessage: '更新成功',
      ...options
    }),

    /**
     * 刪除資源
     */
    delete: <T extends ApiEndpointName>(
      endpoint: T,
      data: GetApiRequest<T>,
      options?: ApiCallOptions
    ) => client.call(endpoint, data, {
      successMessage: '刪除成功',
      ...options
    }),

    /**
     * 查詢資源 (靜默)
     */
    read: <T extends ApiEndpointName>(
      endpoint: T,
      data?: GetApiRequest<T>,
      options?: ApiCallOptions
    ) => client.call(endpoint, data, {
      showSuccessToast: false,
      showErrorToast: false,
      ...options
    })
  };
}

/**
 * 專用於表單提交的 Hook
 */
export function useApiForm(options: UseApiClientOptions = {}) {
  return useApiClient({
    showSuccessToast: true,
    showErrorToast: true,
    autoResetError: true,
    errorResetDelay: 3000,
    ...options
  });
}

/**
 * 專用於背景操作的靜默 Hook
 */
export function useApiSilent(options: UseApiClientOptions = {}) {
  return useApiClient({
    showSuccessToast: false,
    showErrorToast: false,
    ...options
  });
}