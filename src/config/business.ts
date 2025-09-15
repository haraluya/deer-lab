/**
 * 德科斯特的實驗室業務配置參數
 * 集中管理系統中所有硬編碼的業務配置，提升維護效率和配置靈活性
 * 
 * @created 2025-09-09
 * @description 統一配置參數管理系統
 */

/**
 * 庫存管理相關配置
 */
export const INVENTORY_CONFIG = {
  // 庫存警戒配置
  alerts: {
    lowStockThresholdRatio: 0.2,        // 20% 低庫存警戒線
    zeroStockWarning: true,             // 零庫存警告
    negativStockAlert: true,            // 負庫存警報
  },
  
  // 補貨建議配置
  replenishment: {
    defaultReorderQuantity: 100,        // 預設補貨量
    maxStockMultiplier: 5,              // 最大庫存倍數（基於最低庫存）
    autoSuggestReplenishment: true,     // 自動建議補貨
  },
  
  // 庫存調整配置
  adjustment: {
    requireReason: true,                // 庫存調整需要填寫原因
    allowNegativeStock: false,          // 是否允許負庫存
    autoCreateInventoryRecord: true,    // 自動建立庫存記錄
  },
  
  // 分頁配置
  pagination: {
    defaultPageSize: 10,                // 預設每頁顯示筆數
    pageSizeOptions: [10, 20, 50, 100], // 可選每頁筆數
  }
} as const;

/**
 * 香精配方相關配置
 */
export const FRAGRANCE_CONFIG = {
  // 香精比例配置
  ratios: {
    maxFragrancePercentage: 100,        // 最大香精濃度
    minFragrancePercentage: 0,           // 最小香精濃度
    pgThreshold: 60,                    // PG比例門檻（60%）
    defaultPGRatio: 60,                 // 預設PG比例
    defaultVGRatio: 40,                 // 預設VG比例
    decimalPlaces: 2,                   // 計算結果小數位數
  },
  
  // 計算規則
  calculation: {
    pgVgCalculationRule: 'threshold',   // 'threshold' | 'proportional'
    autoRoundResults: true,             // 自動四捨五入結果
    validateRatioSum: true,             // 驗證比例總和是否為100%
  },
  
  // 香精類別配置
  categories: {
    requireCategory: false,             // 是否必須指定香精類別
    defaultCategory: '通用',            // 預設香精類別
    allowMultipleCategories: false,     // 是否允許多重類別
  }
} as const;

/**
 * 生產工時相關配置
 */
export const PRODUCTION_CONFIG = {
  // 工時計算配置
  workTime: {
    standardWorkingHours: 8,            // 標準工作時數（小時）
    overtimeThreshold: 8,               // 加班門檻（小時）
    maxDailyWorkingHours: 12,           // 每日最大工時（小時）
    minWorkSessionMinutes: 15,          // 最小工作時段（分鐘）
    timeRoundingMinutes: 15,            // 時間四捨五入間隔（分鐘）
  },
  
  // 工時驗證規則
  validation: {
    allowFutureTimeEntry: false,        // 是否允許填寫未來時間
    maxHistoryDays: 30,                 // 最多可追溯天數
    requireEndTimeAfterStart: true,     // 結束時間必須晚於開始時間
    preventOverlapTimeEntries: true,    // 防止時間重疊
  },
  
  // 工單狀態配置
  workOrder: {
    allowedDeleteStatus: ['pending', 'cancelled'], // 可刪除的工單狀態
    autoCompleteThreshold: 100,         // 自動完工進度門檻（%）
    requireCompletionConfirm: true,     // 完工需要確認
  }
} as const;

/**
 * UI 介面相關配置
 */
export const UI_CONFIG = {
  // 分頁配置
  pagination: {
    itemsPerPage: 10,                   // 預設每頁顯示筆數
    maxItemsPerPage: 100,               // 最大每頁顯示筆數
    showSizeChanger: true,              // 顯示頁面大小選擇器
    showQuickJumper: true,              // 顯示頁面快速跳轉
  },
  
  // 搜尋配置
  search: {
    debounceMs: 300,                    // 搜尋防抖延遲（毫秒）
    minSearchLength: 1,                 // 最小搜尋長度
    highlightSearchResults: true,       // 高亮搜尋結果
    caseSensitive: false,               // 大小寫敏感搜尋
  },
  
  // Toast 通知配置
  toast: {
    duration: 3000,                     // 預設顯示時間（毫秒）
    successDuration: 2000,              // 成功通知時間（毫秒）
    errorDuration: 5000,                // 錯誤通知時間（毫秒）
    warningDuration: 4000,              // 警告通知時間（毫秒）
    position: 'top-right' as const,     // 通知位置
  },
  
  // 表格配置
  table: {
    defaultSortDirection: 'desc' as const, // 預設排序方向
    showRowSelection: true,             // 顯示行選擇
    showPagination: true,               // 顯示分頁
    stickyHeader: true,                 // 固定表頭
  },
  
  // 載入狀態配置
  loading: {
    spinnerDelay: 200,                  // 載入指示器延遲（毫秒）
    skeletonRows: 10,                   // Skeleton 載入行數
    showProgressBar: true,              // 顯示進度條
  }
} as const;

/**
 * 快取配置
 */
export const CACHE_CONFIG = {
  // 快取時間配置（毫秒）
  ttl: {
    short: 5 * 60 * 1000,              // 短期快取：5分鐘
    medium: 15 * 60 * 1000,            // 中期快取：15分鐘
    long: 30 * 60 * 1000,              // 長期快取：30分鐘
    extraLong: 60 * 60 * 1000,         // 超長期快取：1小時
  },
  
  // 快取策略
  strategy: {
    enableCache: true,                  // 啟用快取
    autoCleanupIntervalMs: 60000,       // 自動清理間隔（1分鐘）
    maxCacheSize: 1000,                // 最大快取項目數
  }
} as const;

/**
 * 效能監控配置
 */
export const PERFORMANCE_CONFIG = {
  // 效能警告門檻
  thresholds: {
    slowQueryMs: 1000,                  // 慢查詢門檻（毫秒）
    mediumQueryMs: 500,                 // 中等查詢門檻（毫秒）
    fastQueryMs: 200,                   // 快速查詢門檻（毫秒）
  },
  
  // 監控配置
  monitoring: {
    enablePerformanceLogging: true,     // 啟用效能日誌
    logSlowQueries: true,               // 記錄慢查詢
    enableMemoryMonitoring: false,      // 啟用記憶體監控
  }
} as const;

/**
 * 權限與安全配置
 */
export const SECURITY_CONFIG = {
  // 管理員帳號識別
  admin: {
    employeeIds: ['admin', 'administrator', '052'], // 管理員員工編號
    emailPatterns: ['admin'],           // 管理員郵箱模式
    autoGrantPermissions: true,         // 自動授予權限
  },
  
  // 操作限制
  limits: {
    maxBulkOperations: 100,             // 最大批量操作數
    maxFileUploadMB: 10,                // 最大檔案上傳大小（MB）
    sessionTimeoutHours: 24,            // 會話超時時間（小時）
  }
} as const;

/**
 * 功能開關配置
 */
export const FEATURE_FLAGS = {
  // 進階功能
  advanced: {
    enableAdvancedAnalytics: false,     // 進階分析功能
    enableSmartInventory: false,        // 智能庫存功能
    enableCostOptimization: false,      // 成本優化功能
    enableSupplierPerformance: false,   // 供應商績效分析
  },
  
  // 實驗性功能
  experimental: {
    enableDarkMode: true,               // 暗黑模式
    enableOfflineMode: false,           // 離線模式
    enableRealTimeSync: true,           // 即時同步
    enablePushNotifications: false,     // 推播通知
  },
  
  // 系統功能
  system: {
    enableErrorReporting: true,         // 錯誤回報
    enableUsageAnalytics: true,         // 使用分析
    enableAutoBackup: false,            // 自動備份
    enableDebugMode: process.env.NODE_ENV === 'development' // 除錯模式
  }
} as const;

/**
 * 業務規則配置
 * 可根據實際業務需求調整的規則參數
 */
export const BUSINESS_RULES = {
  // 庫存業務規則
  inventory: {
    allowZeroStockSale: false,          // 允許零庫存銷售
    autoCreateLowStockAlert: true,      // 自動建立低庫存警告
    requireApprovalForAdjustment: false, // 庫存調整需要審核
  },
  
  // 生產業務規則
  production: {
    allowConcurrentWorkOrders: true,    // 允許同時執行多個工單
    requireBOMValidation: true,         // 需要BOM驗證
    autoCalculateMaterialUsage: true,   // 自動計算物料用量
  },
  
  // 採購業務規則
  procurement: {
    requireMultipleQuotes: false,       // 需要多重報價
    autoSuggestSuppliers: true,         // 自動建議供應商
    enablePriceHistory: true,           // 啟用價格歷史
  }
} as const;

// 統一匯出所有配置
export const BUSINESS_CONFIG = {
  inventory: INVENTORY_CONFIG,
  fragrance: FRAGRANCE_CONFIG,
  production: PRODUCTION_CONFIG,
  ui: UI_CONFIG,
  cache: CACHE_CONFIG,
  performance: PERFORMANCE_CONFIG,
  security: SECURITY_CONFIG,
  features: FEATURE_FLAGS,
  rules: BUSINESS_RULES
} as const;

// 預設匯出
export default BUSINESS_CONFIG;

/**
 * 配置驗證函數
 * 確保配置值的有效性
 */
export const validateConfig = () => {
  const errors: string[] = [];
  
  // 驗證香精比例配置
  if (FRAGRANCE_CONFIG.ratios.defaultPGRatio + FRAGRANCE_CONFIG.ratios.defaultVGRatio !== 100) {
    errors.push('PG + VG 預設比例總和必須等於 100%');
  }
  
  // 驗證工時配置
  if (PRODUCTION_CONFIG.workTime.overtimeThreshold > PRODUCTION_CONFIG.workTime.maxDailyWorkingHours) {
    errors.push('加班門檻不能超過每日最大工時');
  }
  
  // 驗證UI配置
  if (UI_CONFIG.pagination.itemsPerPage > UI_CONFIG.pagination.maxItemsPerPage) {
    errors.push('預設每頁筆數不能超過最大每頁筆數');
  }
  
  if (errors.length > 0) {
    throw new Error(`配置驗證失敗：\n${errors.join('\n')}`);
  }
  
  return true;
};

// 開發環境下自動執行配置驗證
if (process.env.NODE_ENV === 'development') {
  try {
    validateConfig();
    console.log('✅ 業務配置驗證通過');
  } catch (error) {
    console.error('❌ 業務配置驗證失敗:', error);
  }
}