// functions/src/utils/errorHandler.ts
/**
 * 🎯 德科斯特的實驗室 API 標準化 - 統一錯誤處理系統
 * 
 * 建立時間：2025-09-12
 * 目的：建立統一的錯誤代碼系統和錯誤處理邏輯，提升錯誤管理一致性
 */

import { logger } from "firebase-functions";
import { HttpsError } from "firebase-functions/v2/https";

/**
 * 標準化 API 錯誤代碼系統
 * 使用分類前綴來組織錯誤代碼，便於管理和理解
 */
export enum ApiErrorCode {
  // 🔐 認證相關錯誤 (AUTH_*)
  /** 未認證 - 用戶未登入 */
  UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  /** 權限不足 - 用戶無權執行此操作 */
  PERMISSION_DENIED = 'AUTH_PERMISSION_DENIED',
  /** 帳號被停用 */
  ACCOUNT_DISABLED = 'AUTH_ACCOUNT_DISABLED',
  /** 無效的憑證 */
  INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  /** 會話已過期 */
  SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  
  // 📝 資料驗證錯誤 (DATA_*)
  /** 無效的輸入資料 */
  INVALID_INPUT = 'DATA_INVALID_INPUT',
  /** 必填欄位遺失 */
  MISSING_REQUIRED_FIELD = 'DATA_MISSING_REQUIRED_FIELD',
  /** 資料格式錯誤 */
  INVALID_FORMAT = 'DATA_INVALID_FORMAT',
  /** 資料範圍超出限制 */
  VALUE_OUT_OF_RANGE = 'DATA_VALUE_OUT_OF_RANGE',
  /** 重複的資料 */
  DUPLICATE_DATA = 'DATA_DUPLICATE',
  /** 資料不存在 */
  NOT_FOUND = 'DATA_NOT_FOUND',
  /** 資料已存在 */
  ALREADY_EXISTS = 'DATA_ALREADY_EXISTS',
  /** 資料完整性約束違反 */
  INTEGRITY_CONSTRAINT_VIOLATION = 'DATA_INTEGRITY_VIOLATION',
  
  // 🏪 業務邏輯錯誤 (BIZ_*)
  /** 庫存不足 */
  INSUFFICIENT_STOCK = 'BIZ_INSUFFICIENT_STOCK',
  /** 無效的操作 */
  INVALID_OPERATION = 'BIZ_INVALID_OPERATION',
  /** 業務規則違反 */
  BUSINESS_RULE_VIOLATION = 'BIZ_RULE_VIOLATION',
  /** 工單狀態不允許此操作 */
  INVALID_WORK_ORDER_STATUS = 'BIZ_INVALID_WORK_ORDER_STATUS',
  /** 供應商不可用 */
  SUPPLIER_UNAVAILABLE = 'BIZ_SUPPLIER_UNAVAILABLE',
  /** 超過配額限制 */
  QUOTA_EXCEEDED = 'BIZ_QUOTA_EXCEEDED',
  /** 操作衝突 */
  OPERATION_CONFLICT = 'BIZ_OPERATION_CONFLICT',
  
  // 🔧 系統錯誤 (SYS_*)
  /** 內部系統錯誤 */
  INTERNAL_ERROR = 'SYS_INTERNAL_ERROR',
  /** 服務不可用 */
  SERVICE_UNAVAILABLE = 'SYS_SERVICE_UNAVAILABLE',
  /** 操作超時 */
  TIMEOUT = 'SYS_TIMEOUT',
  /** 資料庫錯誤 */
  DATABASE_ERROR = 'SYS_DATABASE_ERROR',
  /** 外部服務錯誤 */
  EXTERNAL_SERVICE_ERROR = 'SYS_EXTERNAL_SERVICE_ERROR',
  /** 配置錯誤 */
  CONFIGURATION_ERROR = 'SYS_CONFIGURATION_ERROR',
  /** 網路錯誤 */
  NETWORK_ERROR = 'SYS_NETWORK_ERROR',
  
  // 📂 檔案處理錯誤 (FILE_*)
  /** 檔案過大 */
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  /** 不支援的檔案類型 */
  UNSUPPORTED_FILE_TYPE = 'FILE_UNSUPPORTED_TYPE',
  /** 檔案損壞 */
  CORRUPTED_FILE = 'FILE_CORRUPTED',
  /** 檔案處理失敗 */
  FILE_PROCESSING_FAILED = 'FILE_PROCESSING_FAILED',
}

/**
 * 業務錯誤類別
 * 用於拋出可控制的業務邏輯錯誤
 */
export class BusinessError extends Error {
  constructor(
    /** 錯誤代碼 */
    public readonly code: ApiErrorCode,
    /** 錯誤訊息 */
    message: string,
    /** 額外的錯誤詳情 */
    public readonly details?: any,
    /** 原始錯誤（如果有的話） */
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'BusinessError';
    
    // 確保 stack trace 正確
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BusinessError);
    }
  }
  
  /**
   * 轉換為 Firebase HttpsError
   */
  toHttpsError(): HttpsError {
    const firebaseCode = this.mapToFirebaseErrorCode(this.code);
    return new HttpsError(firebaseCode, this.message, {
      code: this.code,
      details: this.details
    });
  }
  
  /**
   * 將自定義錯誤代碼映射到 Firebase 錯誤代碼
   */
  private mapToFirebaseErrorCode(code: ApiErrorCode): any {
    const mapping: Record<string, string> = {
      // 認證錯誤
      [ApiErrorCode.UNAUTHORIZED]: 'unauthenticated',
      [ApiErrorCode.PERMISSION_DENIED]: 'permission-denied',
      [ApiErrorCode.ACCOUNT_DISABLED]: 'permission-denied',
      [ApiErrorCode.INVALID_CREDENTIALS]: 'unauthenticated',
      [ApiErrorCode.SESSION_EXPIRED]: 'unauthenticated',
      
      // 資料錯誤
      [ApiErrorCode.INVALID_INPUT]: 'invalid-argument',
      [ApiErrorCode.MISSING_REQUIRED_FIELD]: 'invalid-argument',
      [ApiErrorCode.INVALID_FORMAT]: 'invalid-argument',
      [ApiErrorCode.VALUE_OUT_OF_RANGE]: 'out-of-range',
      [ApiErrorCode.NOT_FOUND]: 'not-found',
      [ApiErrorCode.ALREADY_EXISTS]: 'already-exists',
      [ApiErrorCode.DUPLICATE_DATA]: 'already-exists',
      
      // 業務錯誤
      [ApiErrorCode.INSUFFICIENT_STOCK]: 'failed-precondition',
      [ApiErrorCode.INVALID_OPERATION]: 'failed-precondition',
      [ApiErrorCode.BUSINESS_RULE_VIOLATION]: 'failed-precondition',
      [ApiErrorCode.QUOTA_EXCEEDED]: 'resource-exhausted',
      [ApiErrorCode.OPERATION_CONFLICT]: 'aborted',
      
      // 系統錯誤
      [ApiErrorCode.INTERNAL_ERROR]: 'internal',
      [ApiErrorCode.SERVICE_UNAVAILABLE]: 'unavailable',
      [ApiErrorCode.TIMEOUT]: 'deadline-exceeded',
      [ApiErrorCode.DATABASE_ERROR]: 'internal',
      [ApiErrorCode.NETWORK_ERROR]: 'unavailable',
    };
    
    return mapping[code] || 'internal';
  }
}

/**
 * 錯誤處理輔助函數集合
 */
export class ErrorHandler {
  /**
   * 處理和標準化任何類型的錯誤
   */
  static handle(error: any, context?: string): BusinessError {
    // 如果已經是 BusinessError，直接返回
    if (error instanceof BusinessError) {
      return error;
    }
    
    // 處理 Firebase HttpsError
    if (error instanceof HttpsError) {
      return new BusinessError(
        this.mapFirebaseErrorToApiError(error.code),
        error.message,
        error.details,
        error
      );
    }
    
    // 處理標準 JavaScript 錯誤
    if (error instanceof Error) {
      // 嘗試根據錯誤訊息猜測錯誤類型
      const errorCode = this.inferErrorCodeFromMessage(error.message);
      
      return new BusinessError(
        errorCode,
        error.message,
        { context },
        error
      );
    }
    
    // 處理字符串錯誤
    if (typeof error === 'string') {
      return new BusinessError(
        ApiErrorCode.INTERNAL_ERROR,
        error,
        { context }
      );
    }
    
    // 處理未知錯誤
    return new BusinessError(
      ApiErrorCode.INTERNAL_ERROR,
      '發生未知錯誤',
      { originalError: error, context }
    );
  }
  
  /**
   * 驗證必填欄位
   */
  static validateRequired(data: any, requiredFields: string[]): void {
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      throw new BusinessError(
        ApiErrorCode.MISSING_REQUIRED_FIELD,
        `缺少必填欄位: ${missingFields.join(', ')}`,
        { missingFields }
      );
    }
  }
  
  /**
   * 驗證資料格式
   */
  static validateFormat(value: any, pattern: RegExp, fieldName: string): void {
    if (value && !pattern.test(String(value))) {
      throw new BusinessError(
        ApiErrorCode.INVALID_FORMAT,
        `${fieldName} 格式不正確`,
        { value, pattern: pattern.toString() }
      );
    }
  }
  
  /**
   * 驗證數值範圍
   */
  static validateRange(value: number, min?: number, max?: number, fieldName?: string): void {
    if (min !== undefined && value < min) {
      throw new BusinessError(
        ApiErrorCode.VALUE_OUT_OF_RANGE,
        `${fieldName || '數值'} 不能小於 ${min}`,
        { value, min, max }
      );
    }
    
    if (max !== undefined && value > max) {
      throw new BusinessError(
        ApiErrorCode.VALUE_OUT_OF_RANGE,
        `${fieldName || '數值'} 不能大於 ${max}`,
        { value, min, max }
      );
    }
  }
  
  /**
   * 檢查資源是否存在
   */
  static assertExists(resource: any, resourceType: string, identifier?: string): void {
    if (!resource) {
      throw new BusinessError(
        ApiErrorCode.NOT_FOUND,
        `找不到指定的${resourceType}${identifier ? ` (${identifier})` : ''}`,
        { resourceType, identifier }
      );
    }
  }
  
  /**
   * 檢查資源是否已存在（用於防止重複創建）
   */
  static assertNotExists(resource: any, resourceType: string, identifier?: string): void {
    if (resource) {
      throw new BusinessError(
        ApiErrorCode.ALREADY_EXISTS,
        `${resourceType}${identifier ? ` (${identifier})` : ''} 已經存在`,
        { resourceType, identifier }
      );
    }
  }
  
  /**
   * 檢查庫存是否足夠
   */
  static validateStockSufficiency(currentStock: number, requiredQuantity: number, itemName?: string): void {
    if (currentStock < requiredQuantity) {
      throw new BusinessError(
        ApiErrorCode.INSUFFICIENT_STOCK,
        `${itemName || '項目'} 庫存不足，目前庫存: ${currentStock}，需要: ${requiredQuantity}`,
        { currentStock, requiredQuantity, itemName }
      );
    }
  }
  
  /**
   * 將 Firebase 錯誤代碼映射到 API 錯誤代碼
   */
  private static mapFirebaseErrorToApiError(firebaseCode: string): ApiErrorCode {
    const mapping: Record<string, ApiErrorCode> = {
      'unauthenticated': ApiErrorCode.UNAUTHORIZED,
      'permission-denied': ApiErrorCode.PERMISSION_DENIED,
      'invalid-argument': ApiErrorCode.INVALID_INPUT,
      'not-found': ApiErrorCode.NOT_FOUND,
      'already-exists': ApiErrorCode.ALREADY_EXISTS,
      'failed-precondition': ApiErrorCode.INVALID_OPERATION,
      'resource-exhausted': ApiErrorCode.QUOTA_EXCEEDED,
      'aborted': ApiErrorCode.OPERATION_CONFLICT,
      'internal': ApiErrorCode.INTERNAL_ERROR,
      'unavailable': ApiErrorCode.SERVICE_UNAVAILABLE,
      'deadline-exceeded': ApiErrorCode.TIMEOUT,
    };
    
    return mapping[firebaseCode] || ApiErrorCode.INTERNAL_ERROR;
  }
  
  /**
   * 根據錯誤訊息推斷錯誤代碼
   */
  private static inferErrorCodeFromMessage(message: string): ApiErrorCode {
    const lowercaseMessage = message.toLowerCase();
    
    // 資料庫相關錯誤
    if (lowercaseMessage.includes('firestore') || lowercaseMessage.includes('database')) {
      return ApiErrorCode.DATABASE_ERROR;
    }
    
    // 網路相關錯誤
    if (lowercaseMessage.includes('network') || lowercaseMessage.includes('timeout')) {
      return ApiErrorCode.NETWORK_ERROR;
    }
    
    // 權限相關錯誤
    if (lowercaseMessage.includes('permission') || lowercaseMessage.includes('unauthorized')) {
      return ApiErrorCode.PERMISSION_DENIED;
    }
    
    // 驗證相關錯誤
    if (lowercaseMessage.includes('invalid') || lowercaseMessage.includes('validation')) {
      return ApiErrorCode.INVALID_INPUT;
    }
    
    // 預設為內部錯誤
    return ApiErrorCode.INTERNAL_ERROR;
  }
}

/**
 * 錯誤記錄工具
 */
export class ErrorLogger {
  /**
   * 記錄業務錯誤
   */
  static logBusinessError(error: BusinessError, context?: any): void {
    logger.warn('Business Error Occurred', {
      code: error.code,
      message: error.message,
      details: error.details,
      context,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * 記錄系統錯誤
   */
  static logSystemError(error: Error, context?: any): void {
    logger.error('System Error Occurred', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * 記錄未處理的錯誤
   */
  static logUnhandledError(error: any, context?: any): void {
    logger.error('Unhandled Error Occurred', {
      error: typeof error === 'object' ? JSON.stringify(error) : String(error),
      context,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * 向後相容性：舊版錯誤處理函數
 */
export function handleApiError(error: any): never {
  const businessError = ErrorHandler.handle(error);
  throw businessError.toHttpsError();
}