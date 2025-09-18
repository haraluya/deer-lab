// src/hooks/useLowStockCache.ts
/**
 * 🎯 低庫存項目智能快取 Hook
 *
 * 建立時間：2025-09-19
 * 目的：為低庫存項目查詢提供智能快取機制，優化載入效能
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useApiSilent } from '@/hooks/useApiClient';

// =============================================================================
// 類型定義
// =============================================================================

interface LowStockItem {
  id: string;
  type: 'material' | 'fragrance';
  code: string;
  name: string;
  currentStock: number;
  safetyStockLevel: number;
  unit: string;
  shortage: number;
  costPerUnit: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  requestId: string;
}

interface UseLowStockCacheReturn {
  items: LowStockItem[];
  loading: boolean;
  error: string | null;
  loadLowStockItems: () => Promise<void>;
  invalidateCache: () => void;
  isFromCache: boolean;
  cacheAge: number;
}

// =============================================================================
// 快取配置
// =============================================================================

const CACHE_DURATION = 10 * 60 * 1000; // 10 分鐘快取（低庫存變動較慢）
const LOW_STOCK_CACHE_KEY = 'low_stock_items';

// 全域快取存儲
const globalCache = new Map<string, CacheEntry<any>>();

// 快取事件發送器
class CacheEventEmitter {
  private listeners = new Map<string, Set<() => void>>();

  subscribe(key: string, callback: () => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

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

export function useLowStockCache(): UseLowStockCacheReturn {
  const apiClient = useApiSilent();
  const [items, setItems] = useState<LowStockItem[]>([]);
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
  const getFromCache = useCallback((): LowStockItem[] | null => {
    const cacheEntry = globalCache.get(LOW_STOCK_CACHE_KEY);
    if (cacheEntry && isCacheValid(cacheEntry)) {
      return cacheEntry.data;
    }
    return null;
  }, [isCacheValid]);

  /**
   * 存入快取
   */
  const setToCache = useCallback((data: LowStockItem[], requestId: string) => {
    const cacheEntry: CacheEntry<LowStockItem[]> = {
      data,
      timestamp: Date.now(),
      requestId
    };
    globalCache.set(LOW_STOCK_CACHE_KEY, cacheEntry);

    // 通知其他組件快取已更新
    cacheEmitter.emit(LOW_STOCK_CACHE_KEY);
  }, []);

  /**
   * 清除快取
   */
  const invalidateCache = useCallback(() => {
    globalCache.delete(LOW_STOCK_CACHE_KEY);
    setIsFromCache(false);
    setCacheAge(0);

    // 通知其他組件快取已失效
    cacheEmitter.emit(LOW_STOCK_CACHE_KEY);

    console.log('🗑️ 低庫存項目快取已清除');
  }, []);

  // =============================================================================
  // 資料載入函數
  // =============================================================================

  /**
   * 載入低庫存項目 (智能快取)
   */
  const loadLowStockItems = useCallback(async () => {
    // 檢查快取
    const cachedData = getFromCache();
    if (cachedData) {
      console.log('⚡ 從快取載入低庫存項目');
      setItems(cachedData);
      setIsFromCache(true);

      const cacheEntry = globalCache.get(LOW_STOCK_CACHE_KEY);
      setCacheAge(Date.now() - (cacheEntry?.timestamp || 0));
      setError(null);
      return;
    }

    // 快取無效，從 API 載入
    try {
      setLoading(true);
      setError(null);
      setIsFromCache(false);

      const result = await apiClient.call('getLowStockItems');

      if (result.success && result.data) {
        const apiData = result.data;
        console.log('🌐 從 API 載入低庫存項目:', apiData);

        // 處理API回應資料
        const lowStockItems: LowStockItem[] = apiData.items || [];

        // 更新狀態
        setItems(lowStockItems);

        // 存入快取
        const requestId = (result.rawResponse as any)?.meta?.requestId || `low_stock_${Date.now()}`;
        setToCache(lowStockItems, requestId);
        lastRequestRef.current = requestId;

        setCacheAge(0);
        console.log('💾 低庫存項目已存入快取', {
          requestId,
          itemCount: lowStockItems.length
        });
      } else {
        throw new Error(result.error?.message || '載入低庫存項目失敗');
      }
    } catch (err: any) {
      const errorMessage = err.message || '載入低庫存項目時發生錯誤';
      setError(errorMessage);
      console.error('❌ 載入低庫存項目失敗:', err);
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
    const unsubscribe = cacheEmitter.subscribe(LOW_STOCK_CACHE_KEY, () => {
      // 快取變更時重新檢查
      const cachedData = getFromCache();
      if (cachedData) {
        setItems(cachedData);
        setIsFromCache(true);
        const cacheEntry = globalCache.get(LOW_STOCK_CACHE_KEY);
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
      setItems(cachedData);
      setIsFromCache(true);
      const cacheEntry = globalCache.get(LOW_STOCK_CACHE_KEY);
      setCacheAge(Date.now() - (cacheEntry?.timestamp || 0));
    }
  }, [getFromCache]);

  // =============================================================================
  // 返回 Hook 介面
  // =============================================================================

  return {
    items,
    loading,
    error,
    loadLowStockItems,
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
export function invalidateLowStockCache() {
  globalCache.delete(LOW_STOCK_CACHE_KEY);
  cacheEmitter.emit(LOW_STOCK_CACHE_KEY);
  console.log('🗑️ 全域低庫存快取已清除');
}

/**
 * 檢查快取狀態
 */
export function getLowStockCacheStatus() {
  const cacheEntry = globalCache.get(LOW_STOCK_CACHE_KEY);
  if (!cacheEntry) {
    return { status: 'empty', age: 0 };
  }

  const age = Date.now() - cacheEntry.timestamp;
  const isValid = age < CACHE_DURATION;

  return {
    status: isValid ? 'valid' : 'expired',
    age,
    itemCount: cacheEntry.data?.length || 0,
    requestId: cacheEntry.requestId
  };
}