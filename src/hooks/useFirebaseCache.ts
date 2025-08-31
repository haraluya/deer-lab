import { useState, useEffect, useCallback, useRef } from 'react'
import { businessCache, getCachedDoc, getCachedCollection, FirebaseCacheOptions } from '@/lib/firebase-cache'
import { logger } from '@/utils/logger'

interface UseFirebaseCacheResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  clearCache: () => void
}

// 通用的 Firebase 快取 Hook
export function useFirebaseCache<T>(
  fetcher: () => Promise<T>,
  cacheKey: string,
  options: FirebaseCacheOptions & { enabled?: boolean } = {}
): UseFirebaseCacheResult<T> {
  const { enabled = true, ...cacheOptions } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<Error | null>(null)
  const fetcherRef = useRef(fetcher)
  const mountedRef = useRef(true)

  // 更新 fetcher 引用
  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  // 組件卸載時設置標記
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    try {
      const result = await fetcherRef.current()
      
      if (mountedRef.current) {
        setData(result)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error(`Firebase cache error for key ${cacheKey}:`, error)
      
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [cacheKey, enabled])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  const clearCache = useCallback(() => {
    // 這裡需要從 firebase-cache 導入 cacheManager
    // 暫時使用空實現
    logger.info(`清除快取: ${cacheKey}`)
  }, [cacheKey])

  useEffect(() => {
    if (enabled) {
      fetchData()
    }
  }, [fetchData, enabled])

  return { data, loading, error, refetch, clearCache }
}

// 專門的業務資料 Hooks
export function useMaterials(options?: FirebaseCacheOptions & { enabled?: boolean }) {
  return useFirebaseCache(
    () => businessCache.getMaterials(options),
    'materials-all',
    options
  )
}

export function useMaterial(id: string, options?: FirebaseCacheOptions & { enabled?: boolean }) {
  const enabled = Boolean(id) && (options?.enabled !== false)
  
  return useFirebaseCache(
    () => businessCache.getMaterial(id, options),
    `material-${id}`,
    { ...options, enabled }
  )
}

export function useFragrances(options?: FirebaseCacheOptions & { enabled?: boolean }) {
  return useFirebaseCache(
    () => businessCache.getFragrances(options),
    'fragrances-all',
    options
  )
}

export function useFragrance(id: string, options?: FirebaseCacheOptions & { enabled?: boolean }) {
  const enabled = Boolean(id) && (options?.enabled !== false)
  
  return useFirebaseCache(
    () => businessCache.getFragrance(id, options),
    `fragrance-${id}`,
    { ...options, enabled }
  )
}

export function useProducts(options?: FirebaseCacheOptions & { enabled?: boolean }) {
  return useFirebaseCache(
    () => businessCache.getProducts(options),
    'products-all',
    options
  )
}

export function useProduct(id: string, options?: FirebaseCacheOptions & { enabled?: boolean }) {
  const enabled = Boolean(id) && (options?.enabled !== false)
  
  return useFirebaseCache(
    () => businessCache.getProduct(id, options),
    `product-${id}`,
    { ...options, enabled }
  )
}

export function useSuppliers(options?: FirebaseCacheOptions & { enabled?: boolean }) {
  return useFirebaseCache(
    () => businessCache.getSuppliers(options),
    'suppliers-all',
    options
  )
}

export function useSupplier(id: string, options?: FirebaseCacheOptions & { enabled?: boolean }) {
  const enabled = Boolean(id) && (options?.enabled !== false)
  
  return useFirebaseCache(
    () => businessCache.getSupplier(id, options),
    `supplier-${id}`,
    { ...options, enabled }
  )
}

export function usePersonnel(options?: FirebaseCacheOptions & { enabled?: boolean }) {
  return useFirebaseCache(
    () => businessCache.getPersonnel(options),
    'personnel-all',
    options
  )
}

export function usePersonnelMember(id: string, options?: FirebaseCacheOptions & { enabled?: boolean }) {
  const enabled = Boolean(id) && (options?.enabled !== false)
  
  return useFirebaseCache(
    () => businessCache.getPersonnelMember(id, options),
    `personnel-${id}`,
    { ...options, enabled }
  )
}

export function useWorkOrders(options?: FirebaseCacheOptions & { enabled?: boolean }) {
  return useFirebaseCache(
    () => businessCache.getWorkOrders(options),
    'work-orders-all',
    options
  )
}

export function useWorkOrder(id: string, options?: FirebaseCacheOptions & { enabled?: boolean }) {
  const enabled = Boolean(id) && (options?.enabled !== false)
  
  return useFirebaseCache(
    () => businessCache.getWorkOrder(id, options),
    `work-order-${id}`,
    { ...options, enabled }
  )
}

export function usePurchaseOrders(options?: FirebaseCacheOptions & { enabled?: boolean }) {
  return useFirebaseCache(
    () => businessCache.getPurchaseOrders(options),
    'purchase-orders-all',
    options
  )
}

export function usePurchaseOrder(id: string, options?: FirebaseCacheOptions & { enabled?: boolean }) {
  const enabled = Boolean(id) && (options?.enabled !== false)
  
  return useFirebaseCache(
    () => businessCache.getPurchaseOrder(id, options),
    `purchase-order-${id}`,
    { ...options, enabled }
  )
}

// 批量資料載入 Hook
export function useBulkFirebaseCache<T extends Record<string, any>>(
  fetchers: T,
  options: FirebaseCacheOptions & { enabled?: boolean } = {}
) {
  const { enabled = true } = options
  const [data, setData] = useState<{ [K in keyof T]: any }>({} as any)
  const [loading, setLoading] = useState(enabled)
  const [errors, setErrors] = useState<{ [K in keyof T]?: Error }>({})

  const fetchAll = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setErrors({})

    const results: any = {}
    const newErrors: any = {}

    // 並行執行所有 fetcher
    await Promise.all(
      Object.entries(fetchers).map(async ([key, fetcher]) => {
        try {
          results[key] = await (fetcher as Function)()
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))
          logger.error(`Bulk fetch error for key ${key}:`, error)
          newErrors[key] = error
        }
      })
    )

    setData(results)
    setErrors(newErrors)
    setLoading(false)
  }, [fetchers, enabled])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const refetch = useCallback(() => {
    return fetchAll()
  }, [fetchAll])

  return {
    data,
    loading,
    errors,
    refetch,
    hasErrors: Object.keys(errors).length > 0
  }
}