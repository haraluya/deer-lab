// src/hooks/useTimeRecordsCache.ts
/**
 * 🎯 工時記錄智能快取 Hook
 *
 * 建立時間：2025-09-19
 * 目的：為工時記錄頁面提供智能快取機制，解決載入超時問題
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useApiSilent } from '@/hooks/useApiClient';
import { useMobileCacheStrategy } from '@/hooks/useMobileCacheStrategy';

// =============================================================================
// 類型定義
// =============================================================================

interface CachedTimeEntry {
  id: string;
  workOrderId: string;
  workOrderNumber?: string;
  personnelId: string;
  personnelName?: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  duration: number;
  overtimeHours?: number;
  notes?: string;
  status?: 'draft' | 'confirmed' | 'locked';
  workOrderStatus?: string;
  workOrderName?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  requestId: string;
  personnelId?: string; // 標記是哪個員工的快取
}

interface UseTimeRecordsCacheReturn {
  timeRecords: CachedTimeEntry[];
  loading: boolean;
  error: string | null;
  loadTimeRecords: (personnelId: string) => Promise<void>;
  invalidateCache: (personnelId?: string) => void;
  isFromCache: boolean;
  cacheAge: number;
}

// =============================================================================
// 快取配置
// =============================================================================

// 基礎快取時間 (將由行動裝置策略動態調整)
const BASE_CACHE_DURATION = 15 * 60 * 1000; // 15 分鐘快取 (工時變動較少)

// 全域快取存儲 (跨組件共享，按 personnelId 分別快取)
const globalCache = new Map<string, CacheEntry<CachedTimeEntry[]>>();

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

export function useTimeRecordsCache(defaultPersonnelId?: string): UseTimeRecordsCacheReturn {
  const apiClient = useApiSilent();
  const [timeRecords, setTimeRecords] = useState<CachedTimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);
  const [currentPersonnelId, setCurrentPersonnelId] = useState<string | null>(defaultPersonnelId || null);
  const lastRequestRef = useRef<string | null>(null);

  // 行動裝置快取策略整合
  const { getCacheTime, logCachePerformance, deviceInfo } = useMobileCacheStrategy();
  const cacheDuration = getCacheTime('timeRecords');

  // =============================================================================
  // 快取管理函數
  // =============================================================================

  /**
   * 產生快取鍵值
   */
  const getCacheKey = useCallback((personnelId: string): string => {
    return `time_records_${personnelId}`;
  }, []);

  /**
   * 檢查快取是否有效
   */
  const isCacheValid = useCallback((entry: CacheEntry<any>): boolean => {
    return Date.now() - entry.timestamp < cacheDuration;
  }, [cacheDuration]);

  /**
   * 從快取取得資料
   */
  const getFromCache = useCallback((personnelId: string): CachedTimeEntry[] | null => {
    const cacheKey = getCacheKey(personnelId);
    const cacheEntry = globalCache.get(cacheKey);
    if (cacheEntry && isCacheValid(cacheEntry)) {
      return cacheEntry.data;
    }
    return null;
  }, [getCacheKey, isCacheValid]);

  /**
   * 存入快取
   */
  const setToCache = useCallback((data: CachedTimeEntry[], personnelId: string, requestId: string) => {
    const cacheKey = getCacheKey(personnelId);
    const cacheEntry: CacheEntry<CachedTimeEntry[]> = {
      data,
      timestamp: Date.now(),
      requestId,
      personnelId
    };
    globalCache.set(cacheKey, cacheEntry);

    // 通知其他組件快取已更新
    cacheEmitter.emit(cacheKey);
  }, [getCacheKey]);

  /**
   * 清除快取
   */
  const invalidateCache = useCallback((personnelId?: string) => {
    if (personnelId) {
      // 清除特定員工的快取
      const cacheKey = getCacheKey(personnelId);
      globalCache.delete(cacheKey);
      cacheEmitter.emit(cacheKey);
      console.log('🗑️ 工時記錄快取已清除 (員工ID:', personnelId, ')');
    } else {
      // 清除所有工時記錄快取
      const keysToDelete: string[] = [];
      globalCache.forEach((_, key) => {
        if (key.startsWith('time_records_')) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach(key => {
        globalCache.delete(key);
        cacheEmitter.emit(key);
      });
      console.log('🗑️ 所有工時記錄快取已清除');
    }

    // 如果清除的是當前員工的快取，更新狀態
    if (!personnelId || personnelId === currentPersonnelId) {
      setIsFromCache(false);
      setCacheAge(0);
    }
  }, [getCacheKey, currentPersonnelId]);

  // =============================================================================
  // 資料載入函數
  // =============================================================================

  /**
   * 載入工時記錄 (智能快取)
   */
  const loadTimeRecords = useCallback(async (personnelId: string) => {
    const startTime = Date.now();
    setCurrentPersonnelId(personnelId);

    // 檢查快取
    const cachedData = getFromCache(personnelId);
    if (cachedData) {
      const duration = Date.now() - startTime;
      logCachePerformance('timeRecords-load', duration, true);

      console.log('⚡ 從快取載入工時記錄', {
        personnelId,
        loadTime: duration + 'ms',
        deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop',
        itemCount: cachedData.length
      });

      setTimeRecords(cachedData);
      setIsFromCache(true);

      const cacheKey = getCacheKey(personnelId);
      const cacheEntry = globalCache.get(cacheKey);
      setCacheAge(Date.now() - (cacheEntry?.timestamp || 0));
      setError(null);
      return;
    }

    // 快取無效，從 API 載入
    try {
      setLoading(true);
      setError(null);
      setIsFromCache(false);

      const result = await apiClient.call('getPersonalTimeRecordsV2', {
        employeeId: personnelId,
        userId: personnelId
      });

      if (result.success && result.data) {
        const apiData = result.data as any;
        console.log('🌐 從 API 載入工時記錄', {
          personnelId,
          deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop',
          cacheTime: cacheDuration + 'ms',
          data: apiData
        });

        // 處理API回應格式
        let records: any[] = [];
        if (Array.isArray(apiData)) {
          records = apiData;
        } else if (apiData.records && Array.isArray(apiData.records)) {
          records = apiData.records;
        } else if (apiData.data && Array.isArray(apiData.data)) {
          records = apiData.data;
        }

        // 確保資料格式正確
        const processedRecords: CachedTimeEntry[] = records.map(record => ({
          id: record.id || '',
          workOrderId: record.workOrderId || '',
          workOrderNumber: record.workOrderNumber || '',
          personnelId: record.personnelId || personnelId,
          personnelName: record.personnelName || '',
          startDate: record.startDate || '',
          startTime: record.startTime || '',
          endDate: record.endDate || '',
          endTime: record.endTime || '',
          duration: Number(record.duration) || 0,
          overtimeHours: Number(record.overtimeHours) || 0,
          notes: record.notes || '',
          status: record.status || 'draft',
          workOrderStatus: record.workOrderStatus || '',
          workOrderName: record.workOrderName || record.workOrderId || '',
          createdAt: record.createdAt,
          updatedAt: record.updatedAt
        }));

        // 更新狀態
        setTimeRecords(processedRecords);

        // 存入快取
        const requestId = (result.rawResponse as any)?.meta?.requestId || `cache_${Date.now()}`;
        setToCache(processedRecords, personnelId, requestId);
        lastRequestRef.current = requestId;

        // 記錄 API 調用效能
        const duration = Date.now() - startTime;
        logCachePerformance('timeRecords-api', duration, false);

        setCacheAge(0);
        console.log('💾 工時記錄已存入快取', {
          personnelId,
          requestId,
          recordCount: processedRecords.length,
          loadTime: duration + 'ms',
          deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop'
        });
      } else {
        throw new Error(result.error?.message || '載入工時記錄失敗');
      }
    } catch (err: any) {
      const duration = Date.now() - startTime;
      logCachePerformance('timeRecords-error', duration, false);

      const errorMessage = err.message || '載入工時記錄時發生錯誤';
      setError(errorMessage);
      console.error('❌ 載入工時記錄失敗', {
        personnelId,
        loadTime: duration + 'ms',
        deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop',
        error: err
      });
    } finally {
      setLoading(false);
    }
  }, [apiClient, getFromCache, setToCache, getCacheKey, logCachePerformance, deviceInfo, cacheDuration]);

  // =============================================================================
  // 跨組件快取同步
  // =============================================================================

  /**
   * 監聽快取變更事件
   */
  useEffect(() => {
    if (!currentPersonnelId) return;

    const cacheKey = getCacheKey(currentPersonnelId);
    const unsubscribe = cacheEmitter.subscribe(cacheKey, () => {
      // 快取變更時重新檢查
      const cachedData = getFromCache(currentPersonnelId);
      if (cachedData) {
        setTimeRecords(cachedData);
        setIsFromCache(true);
        const cacheEntry = globalCache.get(cacheKey);
        setCacheAge(Date.now() - (cacheEntry?.timestamp || 0));
      } else {
        setIsFromCache(false);
        setCacheAge(0);
      }
    });

    return unsubscribe;
  }, [currentPersonnelId, getCacheKey, getFromCache]);

  /**
   * 組件掛載時檢查快取
   */
  useEffect(() => {
    if (!currentPersonnelId) return;

    const cachedData = getFromCache(currentPersonnelId);
    if (cachedData) {
      setTimeRecords(cachedData);
      setIsFromCache(true);
      const cacheKey = getCacheKey(currentPersonnelId);
      const cacheEntry = globalCache.get(cacheKey);
      setCacheAge(Date.now() - (cacheEntry?.timestamp || 0));
    }
  }, [currentPersonnelId, getFromCache, getCacheKey]);

  // =============================================================================
  // 返回 Hook 介面
  // =============================================================================

  return {
    timeRecords,
    loading,
    error,
    loadTimeRecords,
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
export function invalidateTimeRecordsCache(personnelId?: string) {
  if (personnelId) {
    const cacheKey = `time_records_${personnelId}`;
    globalCache.delete(cacheKey);
    cacheEmitter.emit(cacheKey);
    console.log('🗑️ 全域工時記錄快取已清除 (員工ID:', personnelId, ')');
  } else {
    // 清除所有工時記錄快取
    const keysToDelete: string[] = [];
    globalCache.forEach((_, key) => {
      if (key.startsWith('time_records_')) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      globalCache.delete(key);
      cacheEmitter.emit(key);
    });
    console.log('🗑️ 全域所有工時記錄快取已清除');
  }
}

/**
 * 檢查快取狀態
 */
export function getTimeRecordsCacheStatus(personnelId: string) {
  const cacheKey = `time_records_${personnelId}`;
  const cacheEntry = globalCache.get(cacheKey);
  if (!cacheEntry) {
    return { status: 'empty', age: 0 };
  }

  const age = Date.now() - cacheEntry.timestamp;
  // 使用基礎快取時間進行狀態檢查
  const isValid = age < BASE_CACHE_DURATION;

  return {
    status: isValid ? 'valid' : 'expired',
    age,
    data: cacheEntry.data,
    requestId: cacheEntry.requestId,
    personnelId: cacheEntry.personnelId
  };
}