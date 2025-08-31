// src/utils/logger.ts
/**
 * 條件化日誌系統
 * 在開發環境中輸出日誌，在生產環境中禁用
 */

const isDevelopment = process.env.NODE_ENV === 'development';

interface LoggerOptions {
  prefix?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan';
}

class Logger {
  private getColorCode(color: string): string {
    const colors = {
      blue: '\x1b[34m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      red: '\x1b[31m',
      purple: '\x1b[35m',
      cyan: '\x1b[36m',
    };
    return colors[color as keyof typeof colors] || '';
  }

  private formatMessage(message: string, options: LoggerOptions = {}): string {
    const { prefix, color } = options;
    const colorCode = color ? this.getColorCode(color) : '';
    const reset = color ? '\x1b[0m' : '';
    const prefixText = prefix ? `[${prefix}] ` : '';
    
    return `${colorCode}${prefixText}${message}${reset}`;
  }

  /**
   * 一般日誌輸出
   */
  log(message: any, ...args: any[]): void {
    if (isDevelopment) {
      console.log(message, ...args);
    }
  }

  /**
   * 資訊日誌 (藍色)
   */
  info(message: string, options: LoggerOptions = {}): void {
    if (isDevelopment) {
      console.info(this.formatMessage(`ℹ️ ${message}`, { ...options, color: 'blue' }));
    }
  }

  /**
   * 成功日誌 (綠色)
   */
  success(message: string, options: LoggerOptions = {}): void {
    if (isDevelopment) {
      console.log(this.formatMessage(`✅ ${message}`, { ...options, color: 'green' }));
    }
  }

  /**
   * 警告日誌 (黃色)
   */
  warn(message: string, options: LoggerOptions = {}): void {
    if (isDevelopment) {
      console.warn(this.formatMessage(`⚠️ ${message}`, { ...options, color: 'yellow' }));
    }
  }

  /**
   * 錯誤日誌 (紅色) - 生產環境也會輸出錯誤
   */
  error(message: string, error?: Error, options: LoggerOptions = {}): void {
    const formattedMessage = this.formatMessage(`❌ ${message}`, { ...options, color: 'red' });
    
    if (isDevelopment) {
      console.error(formattedMessage, error || '');
    } else {
      // 生產環境只記錄錯誤到控制台，但不包含詳細訊息
      console.error('系統錯誤', error?.message || message);
    }
  }

  /**
   * 調試日誌 (紫色) - 僅開發環境
   */
  debug(message: string, data?: any, options: LoggerOptions = {}): void {
    if (isDevelopment) {
      console.debug(this.formatMessage(`🔍 ${message}`, { ...options, color: 'purple' }), data || '');
    }
  }

  /**
   * Firebase 相關日誌 (青色)
   */
  firebase(message: string, options: LoggerOptions = {}): void {
    if (isDevelopment) {
      const formatted = this.formatMessage(`🔥 ${message}`, { ...options, color: 'cyan', prefix: 'Firebase' });
      console.log(formatted);
    }
  }

  /**
   * API 請求日誌
   */
  api(method: string, endpoint: string, status?: number): void {
    if (isDevelopment) {
      const statusEmoji = status ? (status < 400 ? '✅' : '❌') : '🔄';
      const statusText = status ? ` [${status}]` : '';
      console.log(this.formatMessage(`${statusEmoji} ${method.toUpperCase()} ${endpoint}${statusText}`, { 
        color: status && status >= 400 ? 'red' : 'green',
        prefix: 'API'
      }));
    }
  }

  /**
   * 效能監控日誌
   */
  performance(label: string, duration: number): void {
    if (isDevelopment) {
      const emoji = duration > 1000 ? '🐌' : duration > 500 ? '⏰' : '⚡';
      console.log(this.formatMessage(`${emoji} ${label}: ${duration.toFixed(2)}ms`, {
        color: duration > 1000 ? 'red' : duration > 500 ? 'yellow' : 'green',
        prefix: 'PERF'
      }));
    }
  }
}

// 創建全域 logger 實例
export const logger = new Logger();

// 導出常用方法的簡寫，使用 bind 確保 this 上下文正確
export const log = logger.log.bind(logger);
export const info = logger.info.bind(logger);
export const success = logger.success.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const debug = logger.debug.bind(logger);
export const firebase = logger.firebase.bind(logger);
export const api = logger.api.bind(logger);
export const performance = logger.performance.bind(logger);

// 效能監控工具
export const performanceTimer = {
  start: (label: string): void => {
    if (isDevelopment && typeof window !== 'undefined') {
      window.performance.mark(`${label}-start`);
    }
  },
  
  end: (label: string): void => {
    if (isDevelopment && typeof window !== 'undefined') {
      window.performance.mark(`${label}-end`);
      window.performance.measure(label, `${label}-start`, `${label}-end`);
      const measure = window.performance.getEntriesByName(label)[0];
      if (measure) {
        logger.performance(label, measure.duration);
      }
    }
  }
};

export default logger;