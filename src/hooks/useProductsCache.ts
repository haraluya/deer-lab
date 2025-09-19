// src/hooks/useProductsCache.ts
/**
 * 🎯 產品列表智能快取 Hook
 *
 * 建立時間：2025-09-19
 * 目的：為產品列表頁面提供智能快取機制，提升載入效能
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useMobileCacheStrategy } from '@/hooks/useMobileCacheStrategy';

// =============================================================================
// 類型定義
// =============================================================================

interface Product {
  id: string;
  name: string;
  category?: string;
  description?: string;
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any; // 允許其他產品相關欄位
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  requestId: string;
}

interface UseProductsCacheReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  loadProducts: () => Promise<void>;
  invalidateCache: () => void;
  isFromCache: boolean;
  cacheAge: number;
}

// =============================================================================
// 快取配置
// =============================================================================

// 基礎快取時間 (將由行動裝置策略動態調整)
const BASE_CACHE_DURATION = 12 * 60 * 1000; // 12 分鐘快取 (產品變動頻率較低)
const PRODUCTS_CACHE_KEY = 'products_list';

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

export function useProductsCache(): UseProductsCacheReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);
  const lastRequestRef = useRef<string | null>(null);

  // 行動裝置快取策略整合
  const { getCacheTime, logCachePerformance, deviceInfo } = useMobileCacheStrategy();
  const cacheDuration = getCacheTime('products');

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
  const getFromCache = useCallback((): Product[] | null => {
    const cacheEntry = globalCache.get(PRODUCTS_CACHE_KEY);
    if (cacheEntry && isCacheValid(cacheEntry)) {
      return cacheEntry.data;
    }
    return null;
  }, [isCacheValid]);

  /**
   * 存入快取
   */
  const setToCache = useCallback((data: Product[], requestId: string) => {
    const cacheEntry: CacheEntry<Product[]> = {
      data,
      timestamp: Date.now(),
      requestId
    };
    globalCache.set(PRODUCTS_CACHE_KEY, cacheEntry);

    // 通知其他組件快取已更新
    cacheEmitter.emit(PRODUCTS_CACHE_KEY);
  }, []);

  /**
   * 清除快取
   */
  const invalidateCache = useCallback(() => {
    globalCache.delete(PRODUCTS_CACHE_KEY);
    setIsFromCache(false);
    setCacheAge(0);

    // 通知其他組件快取已失效
    cacheEmitter.emit(PRODUCTS_CACHE_KEY);

    console.log('🗑️ 產品列表快取已清除');
  }, []);

  // =============================================================================
  // 資料載入函數
  // =============================================================================

  /**
   * 載入產品列表 (智能快取)
   */
  const loadProducts = useCallback(async () => {
    const startTime = Date.now();

    // 檢查快取
    const cachedData = getFromCache();
    if (cachedData) {
      const duration = Date.now() - startTime;
      logCachePerformance('products-load', duration, true);

      console.log('⚡ 從快取載入產品列表', {
        loadTime: duration + 'ms',
        deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop',
        itemCount: cachedData.length
      });

      setProducts(cachedData);
      setIsFromCache(true);

      const cacheEntry = globalCache.get(PRODUCTS_CACHE_KEY);
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
        throw new Error('Firebase 未初始化');
      }

      console.log('🌐 從 Firestore 載入產品列表', {
        deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop',
        cacheTime: cacheDuration + 'ms'
      });
      const productsSnapshot = await getDocs(collection(db, 'products'));

      const productsList: Product[] = productsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          category: data.category || '',
          description: data.description || '',
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          ...data // 保留其他產品特定欄位
        };
      });

      // 確保資料格式正確並排序
      const processedProducts: Product[] = productsList.sort((a, b) => {
        // 按照活躍狀態排序，然後按創建時間降序
        if (a.isActive !== b.isActive) {
          return a.isActive ? -1 : 1;
        }
        const timeA = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0;
        return timeB - timeA;
      });

      // 更新狀態
      setProducts(processedProducts);

      // 存入快取
      const requestId = `cache_${Date.now()}`;
      setToCache(processedProducts, requestId);
      lastRequestRef.current = requestId;

      // 記錄 API 調用效能
      const duration = Date.now() - startTime;
      logCachePerformance('products-api', duration, false);

      setCacheAge(0);
      console.log('💾 產品列表已存入快取', {
        requestId,
        productCount: processedProducts.length,
        loadTime: duration + 'ms',
        deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop'
      });
    } catch (err: any) {
      const duration = Date.now() - startTime;
      logCachePerformance('products-error', duration, false);

      const errorMessage = err.message || '載入產品列表時發生錯誤';
      setError(errorMessage);
      console.error('❌ 載入產品列表失敗:', err, {
        loadTime: duration + 'ms',
        deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop'
      });
    } finally {
      setLoading(false);
    }
  }, [getFromCache, setToCache, logCachePerformance, deviceInfo, cacheDuration]);

  // =============================================================================
  // 跨組件快取同步
  // =============================================================================

  /**
   * 監聽快取變更事件
   */
  useEffect(() => {
    const unsubscribe = cacheEmitter.subscribe(PRODUCTS_CACHE_KEY, () => {
      // 快取變更時重新檢查
      const cachedData = getFromCache();
      if (cachedData) {
        setProducts(cachedData);
        setIsFromCache(true);
        const cacheEntry = globalCache.get(PRODUCTS_CACHE_KEY);
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
      setProducts(cachedData);
      setIsFromCache(true);
      const cacheEntry = globalCache.get(PRODUCTS_CACHE_KEY);
      setCacheAge(Date.now() - (cacheEntry?.timestamp || 0));
    }
  }, [getFromCache]);

  // =============================================================================
  // 返回 Hook 介面
  // =============================================================================

  return {
    products,
    loading,
    error,
    loadProducts,
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
export function invalidateProductsCache() {
  globalCache.delete(PRODUCTS_CACHE_KEY);
  cacheEmitter.emit(PRODUCTS_CACHE_KEY);
  console.log('🗑️ 全域產品列表快取已清除');
}

/**
 * 檢查快取狀態
 */
export function getProductsCacheStatus() {
  const cacheEntry = globalCache.get(PRODUCTS_CACHE_KEY);
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
    requestId: cacheEntry.requestId
  };
}