// 快取管理系統
import { BUSINESS_CONFIG } from '@/config/business';

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class CacheManager {
  private cache = new Map<string, CacheItem<any>>()
  private readonly defaultTTL = BUSINESS_CONFIG.cache.ttl.short // 5 minutes

  // 設定快取
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  // 取得快取
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    // 檢查是否過期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  // 檢查快取是否存在且未過期
  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  // 刪除快取
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  // 清除所有快取
  clear(): void {
    this.cache.clear()
  }

  // 清除過期的快取
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // 取得快取統計
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// 全域快取實例
export const cacheManager = new CacheManager()

// 定期清理過期快取
setInterval(() => {
  cacheManager.cleanup()
}, BUSINESS_CONFIG.cache.strategy.autoCleanupIntervalMs) // 每分鐘清理一次

// 快取鍵生成器
export const cacheKeys = {
  // 人員相關
  personnel: (id?: string) => id ? `personnel:${id}` : 'personnel:all',
  roles: () => 'roles:all',
  
  // 物料相關
  materials: (id?: string) => id ? `materials:${id}` : 'materials:all',
  suppliers: () => 'suppliers:all',
  
  // 香精相關
  fragrances: (id?: string) => id ? `fragrances:${id}` : 'fragrances:all',
  
  // 產品相關
  products: (id?: string) => id ? `products:${id}` : 'products:all',
  productSeries: (id?: string) => id ? `productSeries:${id}` : 'productSeries:all',
  
  // 工單相關
  workOrders: (id?: string) => id ? `workOrders:${id}` : 'workOrders:all',
  
  // 採購單相關
  purchaseOrders: (id?: string) => id ? `purchaseOrders:${id}` : 'purchaseOrders:all',
  
  // 報表相關
  reports: (type: string, dateRange?: string) => `reports:${type}:${dateRange || 'default'}`,
}

// 快取裝飾器 (用於函數)
export function withCache<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator(...args)
    const cached = cacheManager.get<ReturnType<T>>(key)
    
    if (cached !== null) {
      return cached
    }

    const result = fn(...args)
    
    // 如果是 Promise，需要特殊處理
    if (result instanceof Promise) {
      return result.then(data => {
        cacheManager.set(key, data, ttl)
        return data
      }) as ReturnType<T>
    }

    cacheManager.set(key, result, ttl)
    return result
  }) as T
}

import { useState, useEffect, useCallback } from 'react'

// 快取 Hook (用於 React 組件)
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): { data: T | null; loading: boolean; error: Error | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(cacheManager.get<T>(key))
  const [loading, setLoading] = useState(!cacheManager.has(key))
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (cacheManager.has(key)) {
      setData(cacheManager.get<T>(key))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const result = await fetcher()
      cacheManager.set(key, result, ttl)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [key, fetcher, ttl])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refetch = useCallback(() => {
    cacheManager.delete(key)
    fetchData()
  }, [key, fetchData])

  return { data, loading, error, refetch }
}

// 清除相關快取
export function clearRelatedCache(pattern: string): void {
  const stats = cacheManager.getStats()
  for (const key of stats.keys) {
    if (key.includes(pattern)) {
      cacheManager.delete(key)
    }
  }
}

// 預載入常用資料
export async function preloadCommonData(): Promise<void> {
  // 這裡可以預載入常用的資料到快取中
  console.log('Preloading common data...')
}

export default cacheManager
