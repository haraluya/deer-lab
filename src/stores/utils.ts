import { StoreApi, UseBoundStore } from 'zustand'

// 創建選擇器的工具函數，用於性能優化
export function createSelectors<S extends UseBoundStore<StoreApi<T>>, T = object>(
  store: S,
): S & {
  use: { [K in keyof T]: () => T[K] }
} {
  const storeWithSelectors = store as S & {
    use: { [K in keyof T]: () => T[K] }
  }
  
  // 初始化 use 屬性
  storeWithSelectors.use = {} as { [K in keyof T]: () => T[K] }
  
  // 為每個狀態屬性創建選擇器
  for (const key of Object.keys(store.getState() as Record<string, unknown>)) {
    const typedKey = key as keyof T
    storeWithSelectors.use[typedKey] = () => store((state: T) => state[typedKey])
  }

  return storeWithSelectors
}

// 防抖函數，用於優化頻繁的狀態更新
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout>
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }) as T
}

// 節流函數，用於限制狀態更新頻率
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }) as T
}

// 深度合併對象的工具函數
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target }
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        result[key] = deepMerge(target[key], source[key]!)
      } else {
        ;(result as any)[key] = source[key]!
      }
    }
  }
  
  return result
}

// 重置狀態到初始值的工具函數
export function createResetFunction<T>(initialState: T) {
  return (state: T): T => ({ ...initialState })
}

// 批量更新狀態的工具函數
export function createBatchUpdater<T extends Record<string, any>>(
  setState: (partial: Partial<T>) => void
) {
  let batchedUpdates: Partial<T> = {}
  let isScheduled = false

  return (updates: Partial<T>) => {
    batchedUpdates = deepMerge(batchedUpdates, updates)
    
    if (!isScheduled) {
      isScheduled = true
      Promise.resolve().then(() => {
        setState(batchedUpdates)
        batchedUpdates = {}
        isScheduled = false
      })
    }
  }
}

// 用於處理異步操作的狀態管理工具
export function createAsyncHandler<T, P extends any[] = []>(
  asyncFunction: (...args: P) => Promise<T>,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  onSuccess?: (result: T) => void,
  onError?: (error: Error) => void
) {
  return async (...args: P): Promise<T | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await asyncFunction(...args)
      if (onSuccess) {
        onSuccess(result)
      }
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage))
      }
      return null
    } finally {
      setLoading(false)
    }
  }
}

// 用於快取計算結果的備忘錄函數
export function createMemoSelector<TState, TResult>(
  selector: (state: TState) => TResult,
  equalityFn?: (a: TResult, b: TResult) => boolean
) {
  let lastState: TState
  let lastResult: TResult
  
  return (state: TState): TResult => {
    if (state !== lastState) {
      const newResult = selector(state)
      
      if (!equalityFn || !equalityFn(lastResult, newResult)) {
        lastResult = newResult
      }
      
      lastState = state
    }
    
    return lastResult
  }
}

// 陣列操作工具函數
export const arrayUtils = {
  // 切換陣列中的項目
  toggle: <T>(array: T[], item: T): T[] => {
    const index = array.indexOf(item)
    if (index === -1) {
      return [...array, item]
    } else {
      return array.filter((_, i) => i !== index)
    }
  },
  
  // 從陣列中移除項目
  remove: <T>(array: T[], item: T): T[] => {
    return array.filter(i => i !== item)
  },
  
  // 更新陣列中的項目
  update: <T extends { id: string }>(array: T[], id: string, updates: Partial<T>): T[] => {
    return array.map(item => 
      item.id === id ? { ...item, ...updates } : item
    )
  },
  
  // 插入項目到指定位置
  insert: <T>(array: T[], index: number, item: T): T[] => {
    const newArray = [...array]
    newArray.splice(index, 0, item)
    return newArray
  },
  
  // 移動陣列中的項目
  move: <T>(array: T[], fromIndex: number, toIndex: number): T[] => {
    const newArray = [...array]
    const [removed] = newArray.splice(fromIndex, 1)
    newArray.splice(toIndex, 0, removed)
    return newArray
  }
}