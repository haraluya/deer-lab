import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AppStoreState } from './types'
import { persistConfig } from './persistConfig'
import { deepMerge } from './utils'

// 初始狀態
const initialState: Omit<AppStoreState, keyof AppStoreActions> = {
  settings: {
    theme: 'system',
    language: 'zh-TW',
    enableNotifications: true,
    autoSave: true,
    compactMode: false,
  },
  userPreferences: {
    defaultPageSize: 20,
    showLowStockOnly: false,
    preferredCurrency: 'TWD',
    timezone: 'Asia/Taipei',
  },
  shortcuts: {
    enabled: true,
    customShortcuts: {
      'ctrl+shift+i': '/dashboard/inventory',
      'ctrl+shift+w': '/dashboard/work-orders',
      'ctrl+shift+p': '/dashboard/purchase-orders',
      'ctrl+shift+m': '/dashboard/materials',
      'ctrl+shift+f': '/dashboard/fragrances',
    },
  },
}

// Actions 介面
interface AppStoreActions {
  updateSettings: (settings: Partial<AppStoreState['settings']>) => void
  updateUserPreferences: (preferences: Partial<AppStoreState['userPreferences']>) => void
  updateShortcuts: (shortcuts: Partial<AppStoreState['shortcuts']>) => void
  resetToDefaults: () => void
  
  // 新增的實用方法
  toggleTheme: () => void
  setLanguage: (language: 'zh-TW' | 'en') => void
  setPageSize: (size: number) => void
  toggleCompactMode: () => void
  toggleNotifications: () => void
  addCustomShortcut: (key: string, path: string) => void
  removeCustomShortcut: (key: string) => void
}

// 完整的 Store 狀態類型
type AppStore = AppStoreState & AppStoreActions

// 創建 Store
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // 基本更新方法
      updateSettings: (settings: Partial<AppStoreState['settings']>) => set((state: AppStore) => ({
        settings: deepMerge(state.settings, settings),
      })),
      
      updateUserPreferences: (preferences: Partial<AppStoreState['userPreferences']>) => set((state: AppStore) => ({
        userPreferences: deepMerge(state.userPreferences, preferences),
      })),
      
      updateShortcuts: (shortcuts: Partial<AppStoreState['shortcuts']>) => set((state: AppStore) => ({
        shortcuts: deepMerge(state.shortcuts, shortcuts),
      })),
      
      resetToDefaults: () => set(initialState),
      
      // 實用方法
      toggleTheme: () => set((state: AppStore) => {
        const currentTheme = state.settings.theme
        const nextTheme = 
          currentTheme === 'light' ? 'dark' : 
          currentTheme === 'dark' ? 'system' : 'light'
        
        return {
          settings: { ...state.settings, theme: nextTheme }
        }
      }),
      
      setLanguage: (language: 'zh-TW' | 'en') => set((state: AppStore) => ({
        settings: { ...state.settings, language }
      })),
      
      setPageSize: (defaultPageSize: number) => set((state: AppStore) => ({
        userPreferences: { ...state.userPreferences, defaultPageSize }
      })),
      
      toggleCompactMode: () => set((state: AppStore) => ({
        settings: { 
          ...state.settings, 
          compactMode: !state.settings.compactMode 
        }
      })),
      
      toggleNotifications: () => set((state: AppStore) => ({
        settings: { 
          ...state.settings, 
          enableNotifications: !state.settings.enableNotifications 
        }
      })),
      
      addCustomShortcut: (key: string, path: string) => set((state: AppStore) => ({
        shortcuts: {
          ...state.shortcuts,
          customShortcuts: {
            ...state.shortcuts.customShortcuts,
            [key]: path
          }
        }
      })),
      
      removeCustomShortcut: (key: string) => set((state: AppStore) => {
        const newShortcuts = { ...state.shortcuts.customShortcuts }
        delete newShortcuts[key]
        return {
          shortcuts: {
            ...state.shortcuts,
            customShortcuts: newShortcuts
          }
        }
      }),
    }),
    {
      name: persistConfig.app.name,
      storage: persistConfig.app.storage,
      partialize: persistConfig.app.partialize,
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // 處理版本遷移
        if (version === 0) {
          // 從版本 0 升級到版本 1
          return {
            ...persistedState,
            settings: {
              ...persistedState.settings,
              compactMode: false, // 新增欄位
            },
          }
        }
        return persistedState as AppStore
      },
    }
  )
)

// 選擇器 Hooks（用於性能優化）
export const useAppSettings = () => useAppStore(state => state.settings)
export const useUserPreferences = () => useAppStore(state => state.userPreferences)
export const useShortcuts = () => useAppStore(state => state.shortcuts)
export const useTheme = () => useAppStore(state => state.settings.theme)
export const useLanguage = () => useAppStore(state => state.settings.language)
export const useCompactMode = () => useAppStore(state => state.settings.compactMode)

// 動作選擇器
export const useAppActions = () => useAppStore(state => ({
  updateSettings: state.updateSettings,
  updateUserPreferences: state.updateUserPreferences,
  updateShortcuts: state.updateShortcuts,
  resetToDefaults: state.resetToDefaults,
  toggleTheme: state.toggleTheme,
  setLanguage: state.setLanguage,
  setPageSize: state.setPageSize,
  toggleCompactMode: state.toggleCompactMode,
  toggleNotifications: state.toggleNotifications,
  addCustomShortcut: state.addCustomShortcut,
  removeCustomShortcut: state.removeCustomShortcut,
}))

// 計算屬性選擇器
export const useIsDarkMode = () => useAppStore(state => {
  if (state.settings.theme === 'dark') return true
  if (state.settings.theme === 'light') return false
  
  // system 模式下檢查系統偏好
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  
  return false
})

// 組合選擇器
export const useDisplaySettings = () => useAppStore(state => ({
  theme: state.settings.theme,
  compactMode: state.settings.compactMode,
  language: state.settings.language,
}))

export default useAppStore