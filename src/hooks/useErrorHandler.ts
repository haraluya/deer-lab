import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { BUSINESS_CONFIG } from '@/config/business'

// 錯誤類型定義
export interface AppError {
  code: string
  message: string
  context?: Record<string, any>
  severity: 'low' | 'medium' | 'high'
}

// 錯誤處理選項
interface ErrorHandlerOptions {
  showToast?: boolean
  logError?: boolean
  fallbackMessage?: string
  onError?: (error: AppError) => void
}

// 預定義的錯誤類型
export const ErrorTypes = {
  // 網絡錯誤
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: '網路連接失敗，請檢查網路狀態',
    severity: 'medium' as const
  },
  
  // Firebase 錯誤
  FIREBASE_ERROR: {
    code: 'FIREBASE_ERROR', 
    message: '資料庫操作失敗',
    severity: 'high' as const
  },
  
  // 權限錯誤
  PERMISSION_ERROR: {
    code: 'PERMISSION_ERROR',
    message: '您沒有執行此操作的權限',
    severity: 'medium' as const
  },
  
  // 驗證錯誤
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: '輸入資料格式不正確',
    severity: 'low' as const
  },
  
  // 未知錯誤
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    message: '發生未知錯誤，請稍後再試',
    severity: 'medium' as const
  }
} as const

// 錯誤分類函數
export function categorizeError(error: unknown): AppError {
  if (error instanceof Error) {
    // Firebase 錯誤
    if (error.message.includes('Firebase') || error.message.includes('firestore')) {
      return {
        ...ErrorTypes.FIREBASE_ERROR,
        message: `資料庫錯誤: ${error.message}`,
        context: { originalError: error.message }
      }
    }
    
    // 網絡錯誤
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
      return {
        ...ErrorTypes.NETWORK_ERROR,
        context: { originalError: error.message }
      }
    }
    
    // 權限錯誤
    if (error.message.includes('permission') || error.message.includes('unauthorized') || error.message.includes('403')) {
      return {
        ...ErrorTypes.PERMISSION_ERROR,
        context: { originalError: error.message }
      }
    }
    
    // 其他錯誤
    return {
      ...ErrorTypes.UNKNOWN_ERROR,
      message: error.message || ErrorTypes.UNKNOWN_ERROR.message,
      context: { originalError: error.message }
    }
  }
  
  // 如果已經是 AppError 格式
  if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
    return error as AppError
  }
  
  // 字符串錯誤
  if (typeof error === 'string') {
    return {
      ...ErrorTypes.UNKNOWN_ERROR,
      message: error,
      context: { originalError: error }
    }
  }
  
  // 完全未知的錯誤
  return {
    ...ErrorTypes.UNKNOWN_ERROR,
    context: { originalError: String(error) }
  }
}

// 主要的錯誤處理 Hook
export function useErrorHandler() {
  const [currentError, setCurrentError] = useState<AppError | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  // 清除錯誤
  const clearError = useCallback(() => {
    setCurrentError(null)
  }, [])

  // 處理錯誤的主要函數
  const handleError = useCallback((
    error: unknown, 
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logError = true,
      fallbackMessage,
      onError
    } = options

    const appError = categorizeError(error)
    
    // 設置當前錯誤狀態
    setCurrentError(appError)

    // 記錄錯誤
    if (logError) {
      logger.error(`[${appError.code}] ${appError.message}`, new Error(appError.message), {
        prefix: '錯誤處理'
      })
    }

    // 顯示 Toast 通知
    if (showToast) {
      const message = fallbackMessage || appError.message
      
      switch (appError.severity) {
        case 'high':
          toast.error(message, {
            duration: BUSINESS_CONFIG.ui.toast.errorDuration,
            action: {
              label: '確定',
              onClick: clearError
            }
          })
          break
        case 'medium':
          toast.error(message, {
            duration: BUSINESS_CONFIG.ui.toast.warningDuration
          })
          break
        case 'low':
          toast.warning(message, {
            duration: BUSINESS_CONFIG.ui.toast.duration
          })
          break
      }
    }

    // 執行自定義錯誤處理函數
    if (onError) {
      onError(appError)
    }

    return appError
  }, [clearError])

  // 重試機制
  const retry = useCallback(async (retryFunction: () => Promise<any>) => {
    if (isRetrying) return
    
    setIsRetrying(true)
    clearError()
    
    try {
      const result = await retryFunction()
      toast.success('重試成功')
      return result
    } catch (error) {
      handleError(error, { fallbackMessage: '重試失敗' })
      throw error
    } finally {
      setIsRetrying(false)
    }
  }, [isRetrying, clearError, handleError])

  // 包裝異步函數的錯誤處理
  const wrapAsync = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options?: ErrorHandlerOptions
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await fn(...args)
      } catch (error) {
        handleError(error, options)
        return undefined
      }
    }
  }, [handleError])

  // 包裝同步函數的錯誤處理
  const wrapSync = useCallback(<T extends any[], R>(
    fn: (...args: T) => R,
    options?: ErrorHandlerOptions
  ) => {
    return (...args: T): R | undefined => {
      try {
        return fn(...args)
      } catch (error) {
        handleError(error, options)
        return undefined
      }
    }
  }, [handleError])

  return {
    currentError,
    isRetrying,
    handleError,
    clearError,
    retry,
    wrapAsync,
    wrapSync
  }
}

// 全域錯誤處理器（用於未捕獲的錯誤）
export function setupGlobalErrorHandler() {
  // 處理 JavaScript 錯誤
  window.addEventListener('error', (event) => {
    const error = categorizeError(event.error || event.message)
    logger.error(`[全域錯誤] ${error.message}`, event.error)
    
    toast.error('系統發生未預期的錯誤', {
      duration: BUSINESS_CONFIG.ui.toast.errorDuration
    })
  })

  // 處理 Promise 拒絕錯誤
  window.addEventListener('unhandledrejection', (event) => {
    const error = categorizeError(event.reason)
    logger.error(`[未處理的Promise拒絕] ${error.message}`, event.reason)
    
    toast.error('系統處理請求時發生錯誤', {
      duration: BUSINESS_CONFIG.ui.toast.errorDuration
    })
    
    // 阻止錯誤在控制台中顯示
    event.preventDefault()
  })
}

// 專門的業務錯誤處理函數
export const businessErrorHandlers = {
  // 處理庫存相關錯誤
  handleInventoryError: (error: unknown) => {
    const appError = categorizeError(error)
    
    if (appError.message.includes('庫存不足')) {
      toast.warning('庫存數量不足，請檢查庫存狀態', {
        duration: BUSINESS_CONFIG.ui.toast.warningDuration
      })
    } else if (appError.message.includes('產品不存在')) {
      toast.error('找不到指定的產品，請重新選擇', {
        duration: BUSINESS_CONFIG.ui.toast.warningDuration
      })
    } else {
      toast.error('庫存操作失敗：' + appError.message, {
        duration: BUSINESS_CONFIG.ui.toast.errorDuration
      })
    }
    
    return appError
  },

  // 處理工單相關錯誤
  handleWorkOrderError: (error: unknown) => {
    const appError = categorizeError(error)
    
    if (appError.message.includes('材料不足')) {
      toast.warning('生產材料不足，請先補充庫存', {
        duration: BUSINESS_CONFIG.ui.toast.errorDuration,
        action: {
          label: '查看庫存',
          onClick: () => {
            // 導航到庫存頁面的邏輯
          }
        }
      })
    } else if (appError.message.includes('人員未指派')) {
      toast.error('請先指派工作人員', {
        duration: BUSINESS_CONFIG.ui.toast.warningDuration
      })
    } else {
      toast.error('工單操作失敗：' + appError.message, {
        duration: BUSINESS_CONFIG.ui.toast.errorDuration
      })
    }
    
    return appError
  },

  // 處理採購相關錯誤
  handlePurchaseError: (error: unknown) => {
    const appError = categorizeError(error)
    
    if (appError.message.includes('供應商')) {
      toast.error('供應商資訊有誤，請檢查供應商設定', {
        duration: BUSINESS_CONFIG.ui.toast.warningDuration
      })
    } else if (appError.message.includes('價格')) {
      toast.warning('價格資訊不完整，請確認所有項目的價格', {
        duration: BUSINESS_CONFIG.ui.toast.warningDuration
      })
    } else {
      toast.error('採購操作失敗：' + appError.message, {
        duration: BUSINESS_CONFIG.ui.toast.errorDuration
      })
    }
    
    return appError
  }
}

export default useErrorHandler