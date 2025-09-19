// src/hooks/useMobileCacheStrategy.ts
/**
 * 🚀 行動裝置快取策略 Hook
 *
 * 建立時間：2025-09-19
 * 目的：為行動裝置提供優化的快取策略，包括更長的快取時間、預載機制、資料壓縮
 */

import { useCallback, useMemo } from 'react';
import { useDeviceDetection } from './useDeviceDetection';

// =============================================================================
// 類型定義
// =============================================================================

export interface MobileCacheConfig {
  // 快取時間配置 (毫秒)
  inventoryCache: number;
  lowStockCache: number;
  materialsCache: number;
  fragrancesCache: number;
  productsCache: number;
  timeRecordsCache: number;

  // 預載配置
  preloadCriticalData: boolean;
  preloadDelay: number; // 預載延遲時間 (毫秒)

  // 壓縮配置
  enableDataCompression: boolean;
  compressionLevel: 'low' | 'medium' | 'high';

  // 分頁配置
  pageSize: number;
  infiniteScrollEnabled: boolean;
}

export interface CachePreloadStrategy {
  // 預載的資料類型
  criticalDataTypes: string[];
  // 預載觸發條件
  triggers: {
    onAppStart: boolean;
    onIdleDetection: boolean;
    onWifiConnection: boolean;
  };
  // 預載優先順序
  priority: {
    inventory: number;
    materials: number;
    fragrances: number;
    products: number;
  };
}

// =============================================================================
// 基礎快取時間 (桌面版)
// =============================================================================

const BASE_CACHE_TIMES = {
  inventory: 5 * 60 * 1000,    // 5分鐘
  lowStock: 10 * 60 * 1000,    // 10分鐘
  materials: 8 * 60 * 1000,    // 8分鐘
  fragrances: 8 * 60 * 1000,   // 8分鐘
  products: 12 * 60 * 1000,    // 12分鐘
  timeRecords: 15 * 60 * 1000, // 15分鐘
};

// =============================================================================
// Hook 實現
// =============================================================================

export function useMobileCacheStrategy() {
  const {
    isMobile,
    isSlowConnection,
    hardwareConcurrency,
    performanceConfig
  } = useDeviceDetection();

  // 根據裝置性能計算快取配置
  const cacheConfig: MobileCacheConfig = useMemo(() => {
    const { cacheMultiplier, dataPageSize, preloadEnabled } = performanceConfig;

    return {
      // 快取時間：行動裝置使用較長時間
      inventoryCache: Math.round(BASE_CACHE_TIMES.inventory * cacheMultiplier),
      lowStockCache: Math.round(BASE_CACHE_TIMES.lowStock * cacheMultiplier),
      materialsCache: Math.round(BASE_CACHE_TIMES.materials * cacheMultiplier),
      fragrancesCache: Math.round(BASE_CACHE_TIMES.fragrances * cacheMultiplier),
      productsCache: Math.round(BASE_CACHE_TIMES.products * cacheMultiplier),
      timeRecordsCache: Math.round(BASE_CACHE_TIMES.timeRecords * cacheMultiplier),

      // 預載配置
      preloadCriticalData: preloadEnabled,
      preloadDelay: isMobile ? 2000 : 500, // 行動裝置延遲預載

      // 壓縮配置
      enableDataCompression: isMobile || isSlowConnection,
      compressionLevel: isSlowConnection ? 'high' : (isMobile ? 'medium' : 'low'),

      // 分頁配置
      pageSize: dataPageSize,
      infiniteScrollEnabled: isMobile,
    };
  }, [isMobile, isSlowConnection, performanceConfig]);

  // 預載策略
  const preloadStrategy: CachePreloadStrategy = useMemo(() => ({
    criticalDataTypes: isMobile
      ? ['inventory', 'lowStock'] // 行動裝置只預載關鍵資料
      : ['inventory', 'lowStock', 'materials', 'fragrances'],

    triggers: {
      onAppStart: true,
      onIdleDetection: !isSlowConnection, // 慢速連線時不在閒置時預載
      onWifiConnection: isMobile, // 行動裝置在WiFi時預載
    },

    priority: {
      inventory: 1, // 最高優先級
      materials: 2,
      fragrances: 3,
      products: 4,
    },
  }), [isMobile, isSlowConnection]);

  // =============================================================================
  // 工具函數
  // =============================================================================

  /**
   * 取得指定類型的最佳快取時間
   */
  const getCacheTime = useCallback((type: keyof typeof BASE_CACHE_TIMES): number => {
    return cacheConfig[`${type}Cache` as keyof MobileCacheConfig] as number;
  }, [cacheConfig]);

  /**
   * 檢查是否應該預載指定資料類型
   */
  const shouldPreload = useCallback((dataType: string): boolean => {
    return cacheConfig.preloadCriticalData &&
           preloadStrategy.criticalDataTypes.includes(dataType);
  }, [cacheConfig.preloadCriticalData, preloadStrategy.criticalDataTypes]);

  /**
   * 取得資料壓縮設定
   */
  const getCompressionConfig = useCallback(() => ({
    enabled: cacheConfig.enableDataCompression,
    level: cacheConfig.compressionLevel,

    // 壓縮選項
    compressImages: isMobile,
    minifyJSON: cacheConfig.enableDataCompression,
    removeUnusedFields: true,
  }), [cacheConfig.enableDataCompression, cacheConfig.compressionLevel, isMobile]);

  /**
   * 取得分頁載入配置
   */
  const getPaginationConfig = useCallback(() => ({
    pageSize: cacheConfig.pageSize,
    infiniteScrollEnabled: cacheConfig.infiniteScrollEnabled,
    prefetchNextPage: !isSlowConnection, // 慢速連線時不預取下一頁

    // 載入策略
    loadingStrategy: isMobile ? 'progressive' : 'batch',
    showSkeletons: true,
  }), [cacheConfig.pageSize, cacheConfig.infiniteScrollEnabled, isSlowConnection, isMobile]);

  /**
   * 檢查網路狀況並建議操作
   */
  const getNetworkStrategy = useCallback(() => ({
    allowBackgroundSync: !isSlowConnection,
    enableOfflineMode: isMobile,

    // 網路策略
    retryAttempts: isSlowConnection ? 2 : 3,
    retryDelay: isSlowConnection ? 5000 : 2000,

    // 資料策略
    priorityDataOnly: isSlowConnection,
    enableLazyLoading: isMobile || isSlowConnection,
  }), [isSlowConnection, isMobile]);

  // =============================================================================
  // 性能監控
  // =============================================================================

  /**
   * 記錄快取性能
   */
  const logCachePerformance = useCallback((operation: string, duration: number, fromCache: boolean) => {
    const deviceType = isMobile ? 'mobile' : 'desktop';
    const connectionType = isSlowConnection ? 'slow' : 'fast';

    console.log(`📊 快取性能 [${deviceType}/${connectionType}]:`, {
      operation,
      duration: `${duration}ms`,
      fromCache,
      cacheHit: fromCache,
      deviceInfo: {
        isMobile,
        isSlowConnection,
        hardwareConcurrency,
      }
    });
  }, [isMobile, isSlowConnection, hardwareConcurrency]);

  // =============================================================================
  // 返回介面
  // =============================================================================

  return {
    // 配置
    cacheConfig,
    preloadStrategy,

    // 工具函數
    getCacheTime,
    shouldPreload,
    getCompressionConfig,
    getPaginationConfig,
    getNetworkStrategy,

    // 性能監控
    logCachePerformance,

    // 裝置資訊
    deviceInfo: {
      isMobile,
      isSlowConnection,
      hardwareConcurrency,
      performanceConfig,
    },
  };
}

// =============================================================================
// 工具常數
// =============================================================================

/**
 * 行動裝置優化常數
 */
export const MOBILE_OPTIMIZATION = {
  // 最小觸控區域 (44px Apple HIG 建議)
  MIN_TOUCH_TARGET: 44,

  // 載入策略
  LAZY_LOADING_THRESHOLD: 100, // 距離底部100px時載入

  // 快取策略
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  CACHE_CLEANUP_THRESHOLD: 0.8, // 80%時清理

  // 網路策略
  SLOW_CONNECTION_THRESHOLD: 1000, // 1秒視為慢速
  OFFLINE_TIMEOUT: 5000, // 5秒無回應視為離線
} as const;