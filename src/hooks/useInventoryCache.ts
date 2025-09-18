// src/hooks/useInventoryCache.ts
/**
 * 🎯 庫存智能快取 Hook
 *
 * 建立時間：2025-09-19
 * 目的：為庫存總覽提供智能快取機制，確保效能與資料一致性
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useApiSilent } from '@/hooks/useApiClient';

// =============================================================================
// 類型定義
// =============================================================================

interface InventoryOverview {
  totalMaterials: number;
  totalFragrances: number;
  totalMaterialCost: number;
  totalFragranceCost: number;
  lowStockMaterials: number;
  lowStockFragrances: number;
  totalLowStock: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  requestId: string;
}

interface UseInventoryCacheReturn {
  overview: InventoryOverview | null;
  loading: boolean;
  error: string | null;
  loadOverview: () => Promise<void>;
  invalidateCache: () => void;
  isFromCache: boolean;
  cacheAge: number;
}

// =============================================================================
// 快取配置
// =============================================================================

const CACHE_DURATION = 5 * 60 * 1000; // 5 分鐘快取
const OVERVIEW_CACHE_KEY = 'inventory_overview';

// 全域快取存儲 (跨組件共享)
const globalCache = new Map<string, CacheEntry<any>>();

// 快取事件發送器 (用於跨組件同步)
class CacheEventEmitter {
  private listeners = new Map<string, Set<() => void>>();

  subscribe(key: string, callback: () => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    // 返回取消訂閱函數
    return () => {
      const keyListeners = this.listeners.get(key);
      if (keyListeners) {
        keyListeners.delete(callback);
        if (keyListeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  emit(key: string) {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(callback => callback());
    }
  }
}

const cacheEmitter = new CacheEventEmitter();

// =============================================================================
// Hook 實現
// =============================================================================

export function useInventoryCache(): UseInventoryCacheReturn {
  const apiClient = useApiSilent();
  const [overview, setOverview] = useState<InventoryOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);
  const lastRequestRef = useRef<string | null>(null);

  // =============================================================================
  // 快取管理函數
  // =============================================================================

  /**
   * 檢查快取是否有效
   */
  const isCacheValid = useCallback((entry: CacheEntry<any>): boolean => {
    return Date.now() - entry.timestamp < CACHE_DURATION;
  }, []);

  /**
   * 從快取取得資料
   */
  const getFromCache = useCallback((): InventoryOverview | null => {
    const cacheEntry = globalCache.get(OVERVIEW_CACHE_KEY);
    if (cacheEntry && isCacheValid(cacheEntry)) {
      return cacheEntry.data;
    }
    return null;
  }, [isCacheValid]);

  /**
   * 存入快取
   */
  const setToCache = useCallback((data: InventoryOverview, requestId: string) => {
    const cacheEntry: CacheEntry<InventoryOverview> = {
      data,
      timestamp: Date.now(),
      requestId
    };
    globalCache.set(OVERVIEW_CACHE_KEY, cacheEntry);

    // 通知其他組件快取已更新
    cacheEmitter.emit(OVERVIEW_CACHE_KEY);
  }, []);

  /**
   * 清除快取
   */
  const invalidateCache = useCallback(() => {
    globalCache.delete(OVERVIEW_CACHE_KEY);
    setIsFromCache(false);
    setCacheAge(0);

    // 通知其他組件快取已失效
    cacheEmitter.emit(OVERVIEW_CACHE_KEY);

    console.log('🗑️ 庫存總覽快取已清除');
  }, []);

  // =============================================================================
  // 資料載入函數
  // =============================================================================

  /**
   * 載入庫存總覽 (智能快取)
   */
  const loadOverview = useCallback(async () => {
    // 檢查快取
    const cachedData = getFromCache();
    if (cachedData) {
      console.log('⚡ 從快取載入庫存總覽');
      setOverview(cachedData);
      setIsFromCache(true);

      const cacheEntry = globalCache.get(OVERVIEW_CACHE_KEY);
      setCacheAge(Date.now() - (cacheEntry?.timestamp || 0));
      setError(null);
      return;
    }

    // 快取無效，從 API 載入
    try {
      setLoading(true);
      setError(null);
      setIsFromCache(false);

      const result = await apiClient.call('getInventoryOverview');

      if (result.success && result.data) {
        const apiData = result.data;
        console.log('🌐 從 API 載入庫存總覽:', apiData);

        // 轉換API回應格式為本地介面格式
        const rawOverview = (apiData as any).data?.overview || (apiData as any).overview || apiData;
        const processedOverview: InventoryOverview = {
          totalMaterials: rawOverview.totalMaterials || 0,
          totalFragrances: rawOverview.totalFragrances || 0,
          totalMaterialCost: rawOverview.totalMaterialCost || 0,
          totalFragranceCost: rawOverview.totalFragranceCost || 0,
          lowStockMaterials: rawOverview.lowStockMaterials || 0,
          lowStockFragrances: rawOverview.lowStockFragrances || 0,
          totalLowStock: rawOverview.totalLowStock || 0
        };

        // 更新狀態
        setOverview(processedOverview);

        // 存入快取
        const requestId = (result.rawResponse as any)?.meta?.requestId || `cache_${Date.now()}`;
        setToCache(processedOverview, requestId);
        lastRequestRef.current = requestId;

        setCacheAge(0);
        console.log('💾 庫存總覽已存入快取', { requestId, data: processedOverview });
      } else {
        throw new Error(result.error?.message || '載入庫存總覽失敗');
      }
    } catch (err: any) {
      const errorMessage = err.message || '載入庫存總覽時發生錯誤';
      setError(errorMessage);
      console.error('❌ 載入庫存總覽失敗:', err);
    } finally {
      setLoading(false);
    }
  }, [apiClient, getFromCache, setToCache]);

  // =============================================================================
  // 跨組件快取同步
  // =============================================================================

  /**
   * 監聽快取變更事件
   */
  useEffect(() => {
    const unsubscribe = cacheEmitter.subscribe(OVERVIEW_CACHE_KEY, () => {
      // 快取變更時重新檢查
      const cachedData = getFromCache();
      if (cachedData) {
        setOverview(cachedData);
        setIsFromCache(true);
        const cacheEntry = globalCache.get(OVERVIEW_CACHE_KEY);
        setCacheAge(Date.now() - (cacheEntry?.timestamp || 0));
      } else {
        setIsFromCache(false);
        setCacheAge(0);
      }
    });

    return unsubscribe;
  }, [getFromCache]);

  /**
   * 組件掛載時檢查快取
   */
  useEffect(() => {
    const cachedData = getFromCache();
    if (cachedData) {
      setOverview(cachedData);
      setIsFromCache(true);
      const cacheEntry = globalCache.get(OVERVIEW_CACHE_KEY);
      setCacheAge(Date.now() - (cacheEntry?.timestamp || 0));
    }
  }, [getFromCache]);

  // =============================================================================
  // 返回 Hook 介面
  // =============================================================================

  return {
    overview,
    loading,
    error,
    loadOverview,
    invalidateCache,
    isFromCache,
    cacheAge
  };
}

// =============================================================================
// 快取管理工具函數
// =============================================================================

/**
 * 全域快取失效函數 (供其他模組調用)
 */
export function invalidateInventoryCache() {
  globalCache.delete(OVERVIEW_CACHE_KEY);
  cacheEmitter.emit(OVERVIEW_CACHE_KEY);
  console.log('🗑️ 全域庫存快取已清除');
}

/**
 * 檢查快取狀態
 */
export function getInventoryCacheStatus() {
  const cacheEntry = globalCache.get(OVERVIEW_CACHE_KEY);
  if (!cacheEntry) {
    return { status: 'empty', age: 0 };
  }

  const age = Date.now() - cacheEntry.timestamp;
  const isValid = age < CACHE_DURATION;

  return {
    status: isValid ? 'valid' : 'expired',
    age,
    data: cacheEntry.data,
    requestId: cacheEntry.requestId
  };
}