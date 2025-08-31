import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  DocumentSnapshot,
  QuerySnapshot,
  FirestoreError
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { cacheManager } from './cache'
import { logger } from '@/utils/logger'

// Firebase 請求去重機制
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>()

  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // 如果有正在進行的相同請求，直接返回該請求
    if (this.pendingRequests.has(key)) {
      logger.info(`Request deduplication hit for key: ${key}`)
      return this.pendingRequests.get(key) as Promise<T>
    }

    // 創建新請求
    const request = fn()
    this.pendingRequests.set(key, request)

    try {
      const result = await request
      return result
    } finally {
      // 請求完成後清除
      this.pendingRequests.delete(key)
    }
  }

  // 取消特定請求
  cancel(key: string) {
    this.pendingRequests.delete(key)
  }

  // 清除所有請求
  clear() {
    this.pendingRequests.clear()
  }

  // 取得統計資訊
  getStats() {
    return {
      pendingCount: this.pendingRequests.size,
      pendingKeys: Array.from(this.pendingRequests.keys())
    }
  }
}

const requestDeduplicator = new RequestDeduplicator()

// Firebase 快取系統
export interface FirebaseCacheOptions {
  ttl?: number
  skipCache?: boolean
  forceRefresh?: boolean
}

// 快取單個文檔
export async function getCachedDoc<T>(
  collectionName: string,
  docId: string,
  options: FirebaseCacheOptions = {}
): Promise<T | null> {
  const { ttl = 5 * 60 * 1000, skipCache = false, forceRefresh = false } = options
  const cacheKey = `firestore:${collectionName}:${docId}`

  // 強制刷新時先刪除快取
  if (forceRefresh) {
    cacheManager.delete(cacheKey)
  }

  // 檢查快取
  if (!skipCache && !forceRefresh && cacheManager.has(cacheKey)) {
    const cachedData = cacheManager.get<T>(cacheKey)
    if (cachedData !== null) {
      logger.info(`Cache hit for document: ${collectionName}/${docId}`)
      return cachedData
    }
  }

  try {
    // 使用請求去重機制
    const result = await requestDeduplicator.execute(
      cacheKey,
      async () => {
        if (!db) {
          throw new Error('Firebase 未初始化')
        }
        logger.info(`Fetching document: ${collectionName}/${docId}`)
        const docRef = doc(db, collectionName, docId)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() } as T
        }
        return null
      }
    )

    // 儲存到快取
    if (result !== null) {
      cacheManager.set(cacheKey, result, ttl)
    }

    return result
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error(`Error fetching document ${collectionName}/${docId}:`, error)
    throw error
  }
}

// 快取集合查詢
export async function getCachedCollection<T>(
  collectionName: string,
  constraints: any[] = [],
  options: FirebaseCacheOptions = {}
): Promise<T[]> {
  const { ttl = 5 * 60 * 1000, skipCache = false, forceRefresh = false } = options
  
  // 生成快取鍵（基於集合名和查詢約束）
  const constraintKey = JSON.stringify(constraints)
  const cacheKey = `firestore:${collectionName}:query:${btoa(constraintKey)}`

  // 強制刷新時先刪除快取
  if (forceRefresh) {
    cacheManager.delete(cacheKey)
  }

  // 檢查快取
  if (!skipCache && !forceRefresh && cacheManager.has(cacheKey)) {
    const cachedData = cacheManager.get<T[]>(cacheKey)
    if (cachedData !== null) {
      logger.info(`Cache hit for collection: ${collectionName}`)
      return cachedData
    }
  }

  try {
    // 使用請求去重機制
    const result = await requestDeduplicator.execute(
      cacheKey,
      async () => {
        if (!db) {
          throw new Error('Firebase 未初始化')
        }
        logger.info(`Fetching collection: ${collectionName}`)
        const collectionRef = collection(db, collectionName)
        let q = query(collectionRef, ...constraints)
        
        const querySnap = await getDocs(q)
        return querySnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[]
      }
    )

    // 儲存到快取
    cacheManager.set(cacheKey, result, ttl)
    return result
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error(`Error fetching collection ${collectionName}:`, error)
    throw error
  }
}

// 預設的集合快取配置
export const cacheConfigs = {
  // 短時間快取（5分鐘）
  short: { ttl: 5 * 60 * 1000 },
  // 中等時間快取（15分鐘）
  medium: { ttl: 15 * 60 * 1000 },
  // 長時間快取（30分鐘）
  long: { ttl: 30 * 60 * 1000 },
  // 超長時間快取（1小時）
  extraLong: { ttl: 60 * 60 * 1000 }
}

// 清除特定集合的所有快取
export function clearCollectionCache(collectionName: string) {
  const stats = cacheManager.getStats()
  const pattern = `firestore:${collectionName}`
  
  for (const key of stats.keys) {
    if (key.startsWith(pattern)) {
      cacheManager.delete(key)
    }
  }
  
  logger.info(`Cleared cache for collection: ${collectionName}`)
}

// 清除所有 Firebase 快取
export function clearAllFirebaseCache() {
  const stats = cacheManager.getStats()
  
  for (const key of stats.keys) {
    if (key.startsWith('firestore:')) {
      cacheManager.delete(key)
    }
  }
  
  logger.info('Cleared all Firebase cache')
}

// Firebase 查詢約束類型定義
type QueryConstraint = any

// 專門的業務資料快取函數
export const businessCache = {
  // 物料快取
  async getMaterials(options?: FirebaseCacheOptions) {
    const materials = await getCachedCollection('materials', [], { ...cacheConfigs.medium, ...options })
    return materials.map((material: any) => ({
      ...material,
      type: 'material' as const
    }))
  },

  async getMaterial(id: string, options?: FirebaseCacheOptions) {
    return getCachedDoc('materials', id, { ...cacheConfigs.medium, ...options })
  },

  // 香精快取
  async getFragrances(options?: FirebaseCacheOptions) {
    const fragrances = await getCachedCollection('fragrances', [], { ...cacheConfigs.medium, ...options })
    return fragrances.map((fragrance: any) => ({
      ...fragrance,
      type: 'fragrance' as const
    }))
  },

  async getFragrance(id: string, options?: FirebaseCacheOptions) {
    return getCachedDoc('fragrances', id, { ...cacheConfigs.medium, ...options })
  },

  // 產品快取
  async getProducts(options?: FirebaseCacheOptions) {
    return getCachedCollection('products', [], { ...cacheConfigs.medium, ...options })
  },

  async getProduct(id: string, options?: FirebaseCacheOptions) {
    return getCachedDoc('products', id, { ...cacheConfigs.medium, ...options })
  },

  // 供應商快取（較少變動，使用長時間快取）
  async getSuppliers(options?: FirebaseCacheOptions) {
    return getCachedCollection('suppliers', [], { ...cacheConfigs.long, ...options })
  },

  async getSupplier(id: string, options?: FirebaseCacheOptions) {
    return getCachedDoc('suppliers', id, { ...cacheConfigs.long, ...options })
  },

  // 人員快取（較少變動，使用長時間快取）
  async getPersonnel(options?: FirebaseCacheOptions) {
    return getCachedCollection('personnel', [], { ...cacheConfigs.long, ...options })
  },

  async getPersonnelMember(id: string, options?: FirebaseCacheOptions) {
    return getCachedDoc('personnel', id, { ...cacheConfigs.long, ...options })
  },

  // 工單快取（頻繁變動，使用短時間快取）
  async getWorkOrders(options?: FirebaseCacheOptions) {
    return getCachedCollection('work_orders', [], { ...cacheConfigs.short, ...options })
  },

  async getWorkOrder(id: string, options?: FirebaseCacheOptions) {
    return getCachedDoc('work_orders', id, { ...cacheConfigs.short, ...options })
  },

  // 採購單快取（頻繁變動，使用短時間快取）
  async getPurchaseOrders(options?: FirebaseCacheOptions) {
    return getCachedCollection('purchase_orders', [], { ...cacheConfigs.short, ...options })
  },

  async getPurchaseOrder(id: string, options?: FirebaseCacheOptions) {
    return getCachedDoc('purchase_orders', id, { ...cacheConfigs.short, ...options })
  }
}

// React Hook for Firebase 快取
export function useFirebaseCache<T>(
  fetcher: () => Promise<T>,
  dependencies: string[],
  options: FirebaseCacheOptions = {}
) {
  const { ttl = 5 * 60 * 1000 } = options
  const cacheKey = `firebase-hook:${dependencies.join(':')}`
  
  return {
    data: null,
    loading: true,
    error: null,
    refetch: () => {
      cacheManager.delete(cacheKey)
      // 重新執行 fetcher
    }
  }
}

// 統計和診斷函數
export function getCacheStats() {
  const cacheStats = cacheManager.getStats()
  const requestStats = requestDeduplicator.getStats()
  
  const firebaseCacheKeys = cacheStats.keys.filter(key => key.startsWith('firestore:'))
  
  return {
    cache: {
      total: cacheStats.size,
      firebaseEntries: firebaseCacheKeys.length,
      firebaseKeys: firebaseCacheKeys
    },
    requests: requestStats
  }
}

// 預載入常用資料
export async function preloadCommonData() {
  logger.info('預載入常用資料...')
  
  try {
    // 並行載入常用的資料
    await Promise.all([
      businessCache.getSuppliers(),
      businessCache.getPersonnel(),
      // 只載入前20個產品、物料、香精（避免過度載入）
      getCachedCollection('products', [limit(20)], cacheConfigs.medium),
      getCachedCollection('materials', [limit(20)], cacheConfigs.medium),
      getCachedCollection('fragrances', [limit(20)], cacheConfigs.medium)
    ])
    
    logger.info('常用資料預載入完成')
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error('預載入資料時發生錯誤:', error)
  }
}

const firebaseCache = {
  getCachedDoc,
  getCachedCollection,
  businessCache,
  clearCollectionCache,
  clearAllFirebaseCache,
  getCacheStats,
  preloadCommonData
}

export default firebaseCache