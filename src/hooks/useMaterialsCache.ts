// src/hooks/useMaterialsCache.ts
/**
 * 🎯 物料列表智能快取 Hook
 *
 * 建立時間：2025-09-19
 * 目的：為物料列表查詢提供智能快取機制，優化載入效能
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MaterialData } from '@/types/entities';
import { useMobileCacheStrategy } from '@/hooks/useMobileCacheStrategy';

// =============================================================================
// 類型定義
// =============================================================================

interface MaterialWithSupplier extends MaterialData {
  supplierName: string;
  categoryName: string;
  subCategoryName: string;
  type: 'material';
  isLowStock: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  requestId: string;
}

interface UseMaterialsCacheReturn {
  materials: MaterialWithSupplier[];
  loading: boolean;
  error: string | null;
  loadMaterials: () => Promise<void>;
  invalidateCache: () => void;
  isFromCache: boolean;
  cacheAge: number;
}

// =============================================================================
// 快取配置
// =============================================================================

// 基礎快取時間 (將由行動裝置策略動態調整)
const BASE_CACHE_DURATION = 8 * 60 * 1000; // 8 分鐘快取（物料變動頻率中等）
const MATERIALS_CACHE_KEY = 'materials_list';

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

export function useMaterialsCache(): UseMaterialsCacheReturn {
  const [materials, setMaterials] = useState<MaterialWithSupplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);
  const lastRequestRef = useRef<string | null>(null);

  // 行動裝置快取策略整合
  const { getCacheTime, logCachePerformance, deviceInfo } = useMobileCacheStrategy();
  const cacheDuration = getCacheTime('materials');

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
  const getFromCache = useCallback((): MaterialWithSupplier[] | null => {
    const cacheEntry = globalCache.get(MATERIALS_CACHE_KEY);
    if (cacheEntry && isCacheValid(cacheEntry)) {
      return cacheEntry.data;
    }
    return null;
  }, [isCacheValid]);

  /**
   * 存入快取
   */
  const setToCache = useCallback((data: MaterialWithSupplier[], requestId: string) => {
    const cacheEntry: CacheEntry<MaterialWithSupplier[]> = {
      data,
      timestamp: Date.now(),
      requestId
    };
    globalCache.set(MATERIALS_CACHE_KEY, cacheEntry);

    // 通知其他組件快取已更新
    cacheEmitter.emit(MATERIALS_CACHE_KEY);
  }, []);

  /**
   * 清除快取
   */
  const invalidateCache = useCallback(() => {
    globalCache.delete(MATERIALS_CACHE_KEY);
    setIsFromCache(false);
    setCacheAge(0);

    // 通知其他組件快取已失效
    cacheEmitter.emit(MATERIALS_CACHE_KEY);

    console.log('🗑️ 物料列表快取已清除');
  }, []);

  // =============================================================================
  // 資料載入函數
  // =============================================================================

  /**
   * 獲取供應商資料
   */
  const fetchRelatedData = useCallback(async () => {
    const suppliersMap = new Map<string, string>();

    try {
      if (!db) {
        console.error("Firebase db 未初始化");
        return { suppliersMap };
      }

      // 獲取供應商
      try {
        const suppliersSnapshot = await getDocs(collection(db, "suppliers"));
        suppliersSnapshot.forEach((doc) => {
          const supplierData = doc.data();
          if (supplierData.name) {
            suppliersMap.set(doc.id, supplierData.name);
          }
        });
      } catch (error) {
        // 供應商集合載入失敗，繼續執行
      }

    } catch (error) {
      console.error("獲取關聯資料失敗:", error);
    }

    return { suppliersMap };
  }, []);

  /**
   * 載入物料列表 (智能快取)
   */
  const loadMaterials = useCallback(async () => {
    const startTime = Date.now();

    // 檢查快取
    const cachedData = getFromCache();
    if (cachedData) {
      const duration = Date.now() - startTime;
      logCachePerformance('materials-load', duration, true);

      console.log('⚡ 從快取載入物料列表', {
        loadTime: duration + 'ms',
        deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop',
        itemCount: cachedData.length
      });

      setMaterials(cachedData);
      setIsFromCache(true);

      const cacheEntry = globalCache.get(MATERIALS_CACHE_KEY);
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

      const { suppliersMap } = await fetchRelatedData();
      const querySnapshot = await getDocs(collection(db, "materials"));

      console.log('🌐 從 Firestore 載入物料列表', {
        deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop',
        cacheTime: cacheDuration + 'ms'
      });

      const materialsData: MaterialWithSupplier[] = querySnapshot.docs.map((doc) => {
        const data = { id: doc.id, ...doc.data() } as MaterialData;

        // 獲取供應商名稱 - 處理 supplierRef（Firebase 引用）
        let supplierName = '未指定';

        // 優先順序：直接欄位 > ID 查找 > Firebase 引用 > 其他格式
        if (data.supplierName && data.supplierName.trim() !== '') {
          supplierName = data.supplierName.trim();
        } else if (data.supplierId && suppliersMap.has(data.supplierId)) {
          supplierName = suppliersMap.get(data.supplierId)!;
        } else if (data.supplierRef && data.supplierRef.id) {
          // 處理 Firebase DocumentReference
          const refId = data.supplierRef.id;
          supplierName = suppliersMap.get(refId) || '未知供應商';
        } else if (data.supplier && typeof data.supplier === 'string') {
          supplierName = data.supplier;
        } else if (data.supplier && data.supplier.name) {
          supplierName = data.supplier.name;
        }

        // 簡化分類處理 - 直接使用標準欄位
        const categoryName = data.category || '未分類';
        const subCategoryName = data.subCategory || '';

        return {
          ...data,
          supplierName: supplierName,
          categoryName: categoryName,
          subCategoryName: subCategoryName,
          type: 'material' as const,
          isLowStock: data.currentStock < data.minStock
        };
      });

      // 按分類和名稱排序
      const sortedMaterials = materialsData.sort((a, b) => {
        const categoryComparison = a.categoryName.localeCompare(b.categoryName);
        if (categoryComparison !== 0) return categoryComparison;
        return a.name.localeCompare(b.name);
      });

      // 更新狀態
      setMaterials(sortedMaterials);

      // 存入快取
      const requestId = `materials_${Date.now()}`;
      setToCache(sortedMaterials, requestId);
      lastRequestRef.current = requestId;

      // 記錄 API 調用效能
      const duration = Date.now() - startTime;
      logCachePerformance('materials-api', duration, false);

      setCacheAge(0);
      console.log('💾 物料列表已存入快取', {
        requestId,
        materialCount: sortedMaterials.length,
        loadTime: duration + 'ms',
        deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop'
      });

    } catch (err: any) {
      const duration = Date.now() - startTime;
      logCachePerformance('materials-error', duration, false);

      const errorMessage = err.message || '載入物料列表時發生錯誤';
      setError(errorMessage);
      console.error('❌ 載入物料列表失敗:', err, {
        loadTime: duration + 'ms',
        deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop'
      });
    } finally {
      setLoading(false);
    }
  }, [getFromCache, setToCache, fetchRelatedData, logCachePerformance, deviceInfo, cacheDuration]);

  // =============================================================================
  // 跨組件快取同步
  // =============================================================================

  /**
   * 監聽快取變更事件
   */
  useEffect(() => {
    const unsubscribe = cacheEmitter.subscribe(MATERIALS_CACHE_KEY, () => {
      // 快取變更時重新檢查
      const cachedData = getFromCache();
      if (cachedData) {
        setMaterials(cachedData);
        setIsFromCache(true);
        const cacheEntry = globalCache.get(MATERIALS_CACHE_KEY);
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
      setMaterials(cachedData);
      setIsFromCache(true);
      const cacheEntry = globalCache.get(MATERIALS_CACHE_KEY);
      setCacheAge(Date.now() - (cacheEntry?.timestamp || 0));
    }
  }, [getFromCache]);

  // =============================================================================
  // 返回 Hook 介面
  // =============================================================================

  return {
    materials,
    loading,
    error,
    loadMaterials,
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
export function invalidateMaterialsCache() {
  globalCache.delete(MATERIALS_CACHE_KEY);
  cacheEmitter.emit(MATERIALS_CACHE_KEY);
  console.log('🗑️ 全域物料列表快取已清除');
}

/**
 * 檢查快取狀態
 */
export function getMaterialsCacheStatus() {
  const cacheEntry = globalCache.get(MATERIALS_CACHE_KEY);
  if (!cacheEntry) {
    return { status: 'empty', age: 0 };
  }

  const age = Date.now() - cacheEntry.timestamp;
  // 使用基礎快取時間進行狀態檢查
  const isValid = age < BASE_CACHE_DURATION;

  return {
    status: isValid ? 'valid' : 'expired',
    age,
    materialCount: cacheEntry.data?.length || 0,
    requestId: cacheEntry.requestId
  };
}