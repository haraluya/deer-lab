// functions/src/types/api.ts
/**
 * 🎯 德科斯特的實驗室 API 標準化 - 統一回應格式
 * 
 * 建立時間：2025-09-12
 * 目的：統一所有 Firebase Functions 的回應格式，提升 API 一致性和可維護性
 */

/**
 * 標準化 API 回應介面
 * 所有 Firebase Functions 都應使用此格式回應
 */
export interface ApiResponse<T = any> {
  /** 操作是否成功 */
  success: boolean;
  
  /** 成功時返回的資料 */
  data?: T;
  
  /** 失敗時的錯誤資訊 */
  error?: {
    /** 錯誤代碼 (用於程式化處理) */
    code: string;
    /** 錯誤訊息 (用於顯示給用戶) */
    message: string;
    /** 詳細錯誤資訊 (調試用) */
    details?: any;
  };
  
  /** 回應元資訊 */
  meta: {
    /** 回應時間戳記 */
    timestamp: number;
    /** 請求唯一識別碼 (用於追蹤和調試) */
    requestId: string;
    /** API 版本 */
    version: string;
  };
}

/**
 * 成功回應的資料介面
 */
export interface ApiSuccessData<T = any> {
  /** 回傳的主要資料 */
  result: T;
  /** 操作訊息 */
  message?: string;
  /** 額外的元資訊 */
  metadata?: {
    /** 影響的記錄數量 */
    affectedRows?: number;
    /** 新建立的資源 ID */
    resourceId?: string;
    /** 操作類型 */
    operation?: 'create' | 'update' | 'delete' | 'read';
  };
}

/**
 * 分頁資料介面
 */
export interface PaginatedData<T> {
  /** 資料項目 */
  items: T[];
  /** 分頁資訊 */
  pagination: {
    /** 目前頁數 (從 1 開始) */
    currentPage: number;
    /** 每頁項目數 */
    pageSize: number;
    /** 總項目數 */
    totalItems: number;
    /** 總頁數 */
    totalPages: number;
    /** 是否有下一頁 */
    hasNext: boolean;
    /** 是否有上一頁 */
    hasPrevious: boolean;
  };
}

/**
 * 批次操作結果介面
 */
export interface BatchOperationResult<T = any> {
  /** 成功處理的項目 */
  successful: T[];
  /** 失敗的項目及其錯誤 */
  failed: {
    item: T;
    error: string;
  }[];
  /** 統計資訊 */
  summary: {
    /** 總處理項目數 */
    total: number;
    /** 成功數量 */
    successful: number;
    /** 失敗數量 */
    failed: number;
    /** 跳過數量 */
    skipped: number;
  };
}

/**
 * 常用的標準化回應資料型別
 */
export namespace StandardResponses {
  /** CRUD 操作的標準回應 */
  export interface CrudResponse {
    /** 資源 ID */
    id: string;
    /** 操作訊息 */
    message: string;
    /** 操作類型 */
    operation: 'created' | 'updated' | 'deleted';
    /** 影響的資源資訊 */
    resource?: {
      type: string;
      name?: string;
      code?: string;
    };
  }
  
  /** 匯入操作的標準回應 */
  export interface ImportResponse extends BatchOperationResult {
    /** 匯入的檔案資訊 */
    fileInfo?: {
      name: string;
      size: number;
      type: string;
    };
  }
  
  /** 驗證操作的標準回應 */
  export interface ValidationResponse {
    /** 是否通過驗證 */
    isValid: boolean;
    /** 驗證錯誤 */
    errors: {
      field: string;
      message: string;
      code: string;
    }[];
    /** 驗證警告 */
    warnings?: {
      field: string;
      message: string;
    }[];
  }
}

/**
 * 創建成功回應的輔助函數
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  requestId?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: Date.now(),
      requestId: requestId || generateRequestId(),
      version: '1.0.0'
    }
  };
}

/**
 * 創建失敗回應的輔助函數
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: any,
  requestId?: string
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    meta: {
      timestamp: Date.now(),
      requestId: requestId || generateRequestId(),
      version: '1.0.0'
    }
  };
}

/**
 * 生成請求 ID 的輔助函數
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${randomStr}`;
}

/**
 * 向後相容性：舊版 API 回應格式適配器
 */
export namespace LegacyCompat {
  /**
   * 將舊版 materials API 回應轉換為新格式
   */
  export function adaptMaterialsResponse(oldResponse: {
    status: string;
    message: string;
    materialId?: string;
    [key: string]: any;
  }): ApiResponse<StandardResponses.CrudResponse> {
    const success = oldResponse.status === 'success';
    
    if (success) {
      return createSuccessResponse({
        id: oldResponse.materialId || '',
        message: oldResponse.message,
        operation: 'created' as const,
        resource: {
          type: 'material'
        }
      });
    } else {
      return createErrorResponse(
        'OPERATION_FAILED',
        oldResponse.message || '操作失敗'
      );
    }
  }
  
  /**
   * 將舊版 fragrances API 回應轉換為新格式
   */
  export function adaptFragrancesResponse(oldResponse: {
    success: boolean;
    fragranceId?: string;
    message?: string;
    [key: string]: any;
  }): ApiResponse<StandardResponses.CrudResponse> {
    if (oldResponse.success) {
      return createSuccessResponse({
        id: oldResponse.fragranceId || '',
        message: oldResponse.message || '香精操作成功',
        operation: 'created' as const,
        resource: {
          type: 'fragrance'
        }
      });
    } else {
      return createErrorResponse(
        'OPERATION_FAILED',
        oldResponse.message || '香精操作失敗'
      );
    }
  }
}