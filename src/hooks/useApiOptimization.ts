// src/hooks/useApiOptimization.ts
/**
 * 🚀 API 負載優化 Hook
 *
 * 建立時間：2025-09-19
 * 目的：為行動裝置提供API負載優化，包括資料壓縮、欄位過濾、分頁載入
 */

import { useCallback, useMemo } from 'react';
import { useMobileCacheStrategy } from './useMobileCacheStrategy';

// =============================================================================
// 類型定義
// =============================================================================

export interface ApiOptimizationConfig {
  // 欄位過濾
  enableFieldFiltering: boolean;
  mobileFieldSets: Record<string, string[]>;

  // 分頁配置
  pageSize: number;
  enableInfiniteScroll: boolean;

  // 壓縮配置
  enableCompression: boolean;
  compressionThreshold: number; // 超過此大小才壓縮 (bytes)

  // 預載配置
  enablePreloading: boolean;
  preloadDelay: number;
}

export interface OptimizedApiCall {
  endpoint: string;
  params?: Record<string, any>;
  options?: {
    fields?: string[];
    pageSize?: number;
    compression?: boolean;
    priority?: 'high' | 'normal' | 'low';
  };
}

// =============================================================================
// 行動裝置專用 API 欄位集
// =============================================================================

const MOBILE_FIELD_SETS = {
  // 庫存總覽 - 只載入必要數據
  inventory_overview: [
    'totalMaterials',
    'totalFragrances',
    'totalMaterialCost',
    'totalFragranceCost',
    'lowStockMaterials',
    'lowStockFragrances',
    'totalLowStock'
  ],

  // 物料列表 - 行動裝置精簡版
  materials_mobile: [
    'id',
    'name',
    'code',
    'currentStock',
    'unit',
    'costPerUnit',
    'safetyStockLevel',
    'category',
    'supplierId' // 只取ID，不取完整供應商物件
  ],

  // 香精列表 - 行動裝置精簡版
  fragrances_mobile: [
    'id',
    'name',
    'code',
    'currentStock',
    'unit',
    'costPerUnit',
    'safetyStockLevel',
    'series',
    'supplierId'
  ],

  // 產品列表 - 行動裝置精簡版
  products_mobile: [
    'id',
    'name',
    'code',
    'isActive',
    'createdAt',
    'currentFragranceRef', // 只取引用，不展開完整物件
    'seriesId'
  ],

  // 工時記錄 - 行動裝置精簡版
  time_records_mobile: [
    'id',
    'personnelId',
    'workOrderId',
    'startDate',
    'duration',
    'notes',
    'status'
  ]
};

// =============================================================================
// Hook 實現
// =============================================================================

export function useApiOptimization() {
  const { deviceInfo, cacheConfig, getPaginationConfig } = useMobileCacheStrategy();

  // API 優化配置
  const optimizationConfig: ApiOptimizationConfig = useMemo(() => ({
    // 行動裝置啟用欄位過濾
    enableFieldFiltering: deviceInfo.isMobile,
    mobileFieldSets: MOBILE_FIELD_SETS,

    // 分頁配置
    pageSize: cacheConfig.pageSize,
    enableInfiniteScroll: cacheConfig.infiniteScrollEnabled,

    // 壓縮配置
    enableCompression: cacheConfig.enableDataCompression,
    compressionThreshold: 1024, // 1KB以上才壓縮

    // 預載配置
    enablePreloading: cacheConfig.preloadCriticalData,
    preloadDelay: cacheConfig.preloadDelay,
  }), [deviceInfo.isMobile, cacheConfig]);

  // =============================================================================
  // API 優化函數
  // =============================================================================

  /**
   * 優化 API 調用參數
   */
  const optimizeApiCall = useCallback((
    endpoint: string,
    baseParams: Record<string, any> = {},
    options: { priority?: 'high' | 'normal' | 'low' } = {}
  ): OptimizedApiCall => {
    const optimizedParams = { ...baseParams };

    // 🚀 行動裝置欄位過濾
    if (optimizationConfig.enableFieldFiltering) {
      const mobileFieldKey = `${endpoint.replace('get', '').toLowerCase()}_mobile`;
      const mobileFields = optimizationConfig.mobileFieldSets[mobileFieldKey];

      if (mobileFields) {
        optimizedParams.fields = mobileFields;
        console.log(`📱 行動裝置 API 欄位優化 [${endpoint}]:`, mobileFields);
      }
    }

    // 🚀 分頁優化
    if (optimizationConfig.enableInfiniteScroll && !optimizedParams.limit) {
      optimizedParams.limit = optimizationConfig.pageSize;
      console.log(`📄 行動裝置分頁大小 [${endpoint}]: ${optimizationConfig.pageSize}`);
    }

    // 🚀 壓縮配置
    const compressionEnabled = optimizationConfig.enableCompression &&
                              (options.priority !== 'high'); // 高優先級不壓縮

    return {
      endpoint,
      params: optimizedParams,
      options: {
        fields: optimizedParams.fields,
        pageSize: optimizedParams.limit,
        compression: compressionEnabled,
        priority: options.priority || 'normal'
      }
    };
  }, [optimizationConfig]);

  /**
   * 預載關鍵資料
   */
  const preloadCriticalData = useCallback(async (
    apiClient: any,
    dataTypes: string[] = ['inventory']
  ) => {
    if (!optimizationConfig.enablePreloading) {
      console.log('⏸️ 預載功能已停用');
      return;
    }

    console.log('🔄 開始預載關鍵資料:', dataTypes);

    // 延遲預載（避免阻塞主要載入）
    setTimeout(async () => {
      for (const dataType of dataTypes) {
        try {
          const optimizedCall = optimizeApiCall(`get${dataType}`, {}, { priority: 'low' });
          console.log(`📦 預載 ${dataType}...`);

          // 注意：這裡應該調用對應的 API，但不阻塞 UI
          // await apiClient.call(optimizedCall.endpoint, optimizedCall.params);

        } catch (error) {
          console.warn(`⚠️ 預載 ${dataType} 失敗:`, error);
        }
      }
    }, optimizationConfig.preloadDelay);
  }, [optimizationConfig, optimizeApiCall]);

  /**
   * 檢查 API 回應大小並建議優化
   */
  const analyzeApiResponse = useCallback((
    endpoint: string,
    responseSize: number,
    duration: number
  ) => {
    const recommendations: string[] = [];

    // 大小分析
    if (responseSize > 100 * 1024) { // 100KB
      recommendations.push(`響應過大 (${Math.round(responseSize / 1024)}KB)，建議啟用欄位過濾`);
    }

    // 時間分析
    if (duration > 3000 && deviceInfo.isMobile) { // 3秒
      recommendations.push(`行動裝置載入過慢 (${duration}ms)，建議分頁載入`);
    }

    // 網路分析
    if (deviceInfo.isSlowConnection && responseSize > 50 * 1024) { // 50KB
      recommendations.push(`慢速連線環境，建議啟用壓縮`);
    }

    if (recommendations.length > 0) {
      console.warn(`🔍 API 優化建議 [${endpoint}]:`, recommendations);
    }

    return recommendations;
  }, [deviceInfo]);

  /**
   * 取得行動裝置專用 API 參數
   */
  const getMobileApiParams = useCallback((dataType: string) => {
    const baseParams: Record<string, any> = {};

    // 欄位過濾
    const fieldKey = `${dataType}_mobile`;
    const fields = MOBILE_FIELD_SETS[fieldKey as keyof typeof MOBILE_FIELD_SETS];
    if (fields && optimizationConfig.enableFieldFiltering) {
      baseParams.fields = fields;
    }

    // 分頁大小
    baseParams.limit = optimizationConfig.pageSize;

    // 排序（行動裝置優先顯示重要項目）
    switch (dataType) {
      case 'materials':
      case 'fragrances':
        baseParams.orderBy = 'currentStock';
        baseParams.order = 'desc'; // 庫存高的優先
        break;
      case 'products':
        baseParams.orderBy = 'isActive';
        baseParams.order = 'desc'; // 活躍產品優先
        break;
      case 'time_records':
        baseParams.orderBy = 'startDate';
        baseParams.order = 'desc'; // 最新記錄優先
        break;
    }

    return baseParams;
  }, [optimizationConfig]);

  // =============================================================================
  // 返回介面
  // =============================================================================

  return {
    // 配置
    optimizationConfig,

    // 主要功能
    optimizeApiCall,
    preloadCriticalData,
    analyzeApiResponse,
    getMobileApiParams,

    // 工具函數
    isOptimizationEnabled: deviceInfo.isMobile || deviceInfo.isSlowConnection,
    getFieldSet: (dataType: string) => MOBILE_FIELD_SETS[`${dataType}_mobile` as keyof typeof MOBILE_FIELD_SETS],

    // 裝置資訊
    deviceInfo,
  };
}