// src/hooks/useFragrancesCache.ts
/**
 * 🎯 香精列表智能快取 Hook
 *
 * 建立時間：2025-09-19
 * 目的：為香精列表查詢提供智能快取機制，優化載入效能
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FragranceData } from '@/app/dashboard/fragrances/FragranceDialog';
import { useMobileCacheStrategy } from '@/hooks/useMobileCacheStrategy';

// =============================================================================
// 類型定義
// =============================================================================

interface FragranceWithSupplier extends FragranceData {
  supplierName: string;
  type: 'fragrance';
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  requestId: string;
}

interface UseFragrancesCacheReturn {
  fragrances: FragranceWithSupplier[];
  loading: boolean;
  error: string | null;
  loadFragrances: () => Promise<void>;
  invalidateCache: () => void;
  isFromCache: boolean;
  cacheAge: number;
}

// =============================================================================
// 快取配置
// =============================================================================

// 基礎快取時間 (將由行動裝置策略動態調整)
const BASE_CACHE_DURATION = 8 * 60 * 1000; // 8 分鐘快取（香精變動頻率中等）
const FRAGRANCES_CACHE_KEY = 'fragrances_list';

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

export function useFragrancesCache(): UseFragrancesCacheReturn {
  const [fragrances, setFragrances] = useState<FragranceWithSupplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);
  const lastRequestRef = useRef<string | null>(null);

  // 行動裝置快取策略整合
  const { getCacheTime, logCachePerformance, deviceInfo } = useMobileCacheStrategy();
  const cacheDuration = getCacheTime('fragrances');

  // =============================================================================
  // 快取管理函數
  // =============================================================================

  /**
   * 檢查快取是否有效
   */
  const isCacheValid = useCallback((entry: CacheEntry<any>): boolean => {
    return Date.now() - entry.timestamp < cacheDuration;
  }, [cacheDuration]);

  /**
   * 從快取取得資料
   */
  const getFromCache = useCallback((): FragranceWithSupplier[] | null => {
    const cacheEntry = globalCache.get(FRAGRANCES_CACHE_KEY);
    if (cacheEntry && isCacheValid(cacheEntry)) {
      return cacheEntry.data;
    }
    return null;
  }, [isCacheValid]);

  /**
   * 存入快取
   */
  const setToCache = useCallback((data: FragranceWithSupplier[], requestId: string) => {
    const cacheEntry: CacheEntry<FragranceWithSupplier[]> = {
      data,
      timestamp: Date.now(),
      requestId
    };
    globalCache.set(FRAGRANCES_CACHE_KEY, cacheEntry);

    // 通知其他組件快取已更新
    cacheEmitter.emit(FRAGRANCES_CACHE_KEY);
  }, []);

  /**
   * 清除快取
   */
  const invalidateCache = useCallback(() => {
    globalCache.delete(FRAGRANCES_CACHE_KEY);
    setIsFromCache(false);
    setCacheAge(0);

    // 通知其他組件快取已失效
    cacheEmitter.emit(FRAGRANCES_CACHE_KEY);

    console.log('🗑️ 香精列表快取已清除');
  }, []);

  // =============================================================================
  // 資料載入函數
  // =============================================================================

  /**
   * 獲取供應商資料
   */
  const fetchSuppliers = useCallback(async () => {
    const suppliersMap = new Map<string, string>();
    try {
      if (!db) {
        console.error("Firebase db 未初始化");
        return suppliersMap;
      }
      const querySnapshot = await getDocs(collection(db, "suppliers"));
      querySnapshot.forEach((doc) => {
        suppliersMap.set(doc.id, doc.data().name);
      });
    } catch (error) {
      console.error("獲取供應商資料失敗:", error);
    }
    return suppliersMap;
  }, []);

  /**
   * 載入香精列表 (智能快取)
   */
  const loadFragrances = useCallback(async () => {
    const startTime = Date.now();

    // 檢查快取
    const cachedData = getFromCache();
    if (cachedData) {
      const duration = Date.now() - startTime;
      logCachePerformance('fragrances-load', duration, true);

      console.log('⚡ 從快取載入香精列表', {
        loadTime: duration + 'ms',
        deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop',
        itemCount: cachedData.length
      });

      setFragrances(cachedData);
      setIsFromCache(true);

      const cacheEntry = globalCache.get(FRAGRANCES_CACHE_KEY);
      setCacheAge(Date.now() - (cacheEntry?.timestamp || 0));
      setError(null);
      return;
    }

    // 快取無效，從 Firestore 載入
    try {
      setLoading(true);
      setError(null);
      setIsFromCache(false);

      if (!db) {
        throw new Error("Firebase db 未初始化");
      }

      const suppliersMap = await fetchSuppliers();
      const querySnapshot = await getDocs(collection(db, "fragrances"));

      console.log('🌐 從 Firestore 載入香精列表', {
        deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop',
        cacheTime: cacheDuration + 'ms'
      });

      const fragrancesData: FragranceWithSupplier[] = querySnapshot.docs.map((doc) => {
        const data = { id: doc.id, ...doc.data() } as FragranceData;
        return {
          ...data,
          supplierName: data.supplierRef ? suppliersMap.get(data.supplierRef.id) || '未知供應商' : '未指定',
          type: 'fragrance' as const,
          unit: data.unit || 'ml' // 預設單位
        };
      });

      // 按名稱排序
      const sortedFragrances = fragrancesData.sort((a, b) => a.name.localeCompare(b.name));

      // 更新狀態
      setFragrances(sortedFragrances);

      // 存入快取
      const requestId = `fragrances_${Date.now()}`;
      setToCache(sortedFragrances, requestId);
      lastRequestRef.current = requestId;

      // 記錄 API 調用效能
      const duration = Date.now() - startTime;
      logCachePerformance('fragrances-api', duration, false);

      setCacheAge(0);
      console.log('💾 香精列表已存入快取', {
        requestId,
        fragranceCount: sortedFragrances.length,
        loadTime: duration + 'ms',
        deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop'
      });

    } catch (err: any) {
      const duration = Date.now() - startTime;
      logCachePerformance('fragrances-error', duration, false);

      const errorMessage = err.message || '載入香精列表時發生錯誤';
      setError(errorMessage);
      console.error('❌ 載入香精列表失敗:', err, {
        loadTime: duration + 'ms',
        deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop'
      });
    } finally {
      setLoading(false);
    }
  }, [getFromCache, setToCache, fetchSuppliers, logCachePerformance, deviceInfo, cacheDuration]);

  // =============================================================================
  // 跨組件快取同步
  // =============================================================================

  /**
   * 監聽快取變更事件
   */
  useEffect(() => {
    const unsubscribe = cacheEmitter.subscribe(FRAGRANCES_CACHE_KEY, () => {
      // 快取變更時重新檢查
      const cachedData = getFromCache();
      if (cachedData) {
        setFragrances(cachedData);
        setIsFromCache(true);
        const cacheEntry = globalCache.get(FRAGRANCES_CACHE_KEY);
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
      setFragrances(cachedData);
      setIsFromCache(true);
      const cacheEntry = globalCache.get(FRAGRANCES_CACHE_KEY);
      setCacheAge(Date.now() - (cacheEntry?.timestamp || 0));
    }
  }, [getFromCache]);

  // =============================================================================
  // 返回 Hook 介面
  // =============================================================================

  return {
    fragrances,
    loading,
    error,
    loadFragrances,
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
export function invalidateFragrancesCache() {
  globalCache.delete(FRAGRANCES_CACHE_KEY);
  cacheEmitter.emit(FRAGRANCES_CACHE_KEY);
  console.log('🗑️ 全域香精列表快取已清除');
}

/**
 * 檢查快取狀態
 */
export function getFragrancesCacheStatus() {
  const cacheEntry = globalCache.get(FRAGRANCES_CACHE_KEY);
  if (!cacheEntry) {
    return { status: 'empty', age: 0 };
  }

  const age = Date.now() - cacheEntry.timestamp;
  // 使用基礎快取時間進行狀態檢查
  const isValid = age < BASE_CACHE_DURATION;

  return {
    status: isValid ? 'valid' : 'expired',
    age,
    fragranceCount: cacheEntry.data?.length || 0,
    requestId: cacheEntry.requestId
  };
}