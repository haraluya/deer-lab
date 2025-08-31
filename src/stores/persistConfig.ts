import { createJSONStorage } from 'zustand/middleware'

// 自定義存儲適配器，適配瀏覽器的 localStorage
const customStorage = {
  getItem: (name: string): string | null => {
    if (typeof window !== 'undefined') {
      try {
        return window.localStorage.getItem(name)
      } catch (error) {
        console.warn(`Failed to get item "${name}" from localStorage:`, error)
        return null
      }
    }
    return null
  },
  setItem: (name: string, value: string): void => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(name, value)
      } catch (error) {
        console.warn(`Failed to set item "${name}" to localStorage:`, error)
      }
    }
  },
  removeItem: (name: string): void => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(name)
      } catch (error) {
        console.warn(`Failed to remove item "${name}" from localStorage:`, error)
      }
    }
  },
}

const storage = createJSONStorage(() => customStorage)

// 持久化配置選項
export const persistConfig = {
  // 應用程式設定持久化配置
  app: {
    name: 'deer-lab-app-store',
    storage,
    // 只持久化設定和偏好，不持久化快取資料
    partialize: (state: any) => ({
      settings: state.settings,
      userPreferences: state.userPreferences,
      shortcuts: state.shortcuts,
    }),
  },

  // 庫存管理持久化配置
  inventory: {
    name: 'deer-lab-inventory-store', 
    storage,
    // 只持久化篩選條件和選擇狀態
    partialize: (state: any) => ({
      filters: state.filters,
      selectedItems: state.selectedItems,
    }),
  },

  // 工單管理持久化配置
  workOrder: {
    name: 'deer-lab-workorder-store',
    storage,
    // 只持久化篩選條件和選擇狀態
    partialize: (state: any) => ({
      filters: state.filters,
      selectedWorkOrders: state.selectedWorkOrders,
    }),
  },

  // 採購管理持久化配置
  purchase: {
    name: 'deer-lab-purchase-store',
    storage,
    // 只持久化篩選條件和選擇狀態
    partialize: (state: any) => ({
      filters: state.filters,
      selectedPurchaseOrders: state.selectedPurchaseOrders,
    }),
  },

  // UI 狀態持久化配置
  ui: {
    name: 'deer-lab-ui-store',
    storage,
    // 只持久化部分 UI 狀態
    partialize: (state: any) => ({
      sidebar: state.sidebar,
      quickActions: {
        recentActions: state.quickActions.recentActions.slice(0, 10), // 只保留最近 10 個操作
      },
    }),
  },
}

// 資料遷移函數
export const migrations = {
  app: {
    1: (persistedState: any) => {
      // 第一個版本的遷移邏輯
      return {
        ...persistedState,
        settings: {
          ...persistedState.settings,
          compactMode: false, // 新增欄位的默認值
        },
      }
    },
  },
  
  inventory: {
    1: (persistedState: any) => {
      // 庫存狀態遷移邏輯
      return {
        ...persistedState,
        filters: {
          ...persistedState.filters,
          sortBy: 'name', // 設定默認排序
          sortOrder: 'asc',
        },
      }
    },
  },
}

// 版本控制
export const storeVersions = {
  app: 1,
  inventory: 1,
  workOrder: 1,
  purchase: 1,
  ui: 1,
}