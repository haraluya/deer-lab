import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UIStoreState } from './types'
import { persistConfig } from './persistConfig'

// 初始狀態
const initialState: Omit<UIStoreState, keyof UIStoreActions> = {
  globalLoading: {
    isLoading: false,
    message: '',
    progress: undefined,
  },
  notifications: [],
  sidebar: {
    isOpen: true,
    isCollapsed: false,
    activeSection: 'dashboard',
  },
  modals: {},
  quickActions: {
    isOpen: false,
    recentActions: [],
  },
  progressIndicators: {},
}

// Actions 介面
interface UIStoreActions {
  setGlobalLoading: (loading: boolean, message?: string, progress?: number) => void
  addNotification: (notification: Omit<UIStoreState['notifications'][0], 'id' | 'timestamp'>) => void
  markNotificationAsRead: (id: string) => void
  clearNotifications: () => void
  setSidebarOpen: (isOpen: boolean) => void
  setSidebarCollapsed: (isCollapsed: boolean) => void
  setActiveSection: (section: string) => void
  openModal: (key: string, data?: any) => void
  closeModal: (key: string) => void
  toggleQuickActions: () => void
  addRecentAction: (action: Omit<UIStoreState['quickActions']['recentActions'][0], 'timestamp'>) => void
  setProgressIndicator: (key: string, progress: number, message: string, type?: 'determinate' | 'indeterminate') => void
  addProgressIndicator: (key: string, indicator: UIStoreState['progressIndicators'][string]) => void
  updateProgressIndicator: (key: string, updates: Partial<UIStoreState['progressIndicators'][string]>) => void
  removeProgressIndicator: (key: string) => void
  hideProgressIndicator: (key: string) => void
  
  // 便利方法
  showSuccessNotification: (title: string, message?: string) => void
  showErrorNotification: (title: string, message?: string) => void
  showWarningNotification: (title: string, message?: string) => void
  showInfoNotification: (title: string, message?: string) => void
  toggleSidebar: () => void
  closeSidebar: () => void
  openSidebar: () => void
  closeAllModals: () => void
  clearOldNotifications: (maxAge: number) => void
}

// 完整的 Store 狀態類型
type UIStore = UIStoreState & UIStoreActions

// 生成唯一 ID
const generateId = () => Math.random().toString(36).substr(2, 9)

// 創建 Store
export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // 全域載入狀態
      setGlobalLoading: (isLoading: boolean, message: string = '', progress?: number) => set((state: UIStore) => ({
        globalLoading: {
          isLoading,
          message,
          progress,
        },
      })),
      
      // 通知管理
      addNotification: (notification: Omit<UIStoreState['notifications'][0], 'id' | 'timestamp' | 'read'>) => set((state: UIStore) => ({
        notifications: [
          {
            ...notification,
            id: generateId(),
            timestamp: new Date(),
            read: false,
          },
          ...state.notifications,
        ].slice(0, 50), // 限制最多 50 個通知
      })),
      
      markNotificationAsRead: (id: string) => set((state: UIStore) => ({
        notifications: state.notifications.map((n: UIStoreState['notifications'][0]) => 
          n.id === id ? { ...n, read: true } : n
        ),
      })),
      
      clearNotifications: () => set({ notifications: [] }),
      
      // 側邊欄管理
      setSidebarOpen: (isOpen: boolean) => set((state: UIStore) => ({
        sidebar: { ...state.sidebar, isOpen },
      })),
      
      setSidebarCollapsed: (isCollapsed: boolean) => set((state: UIStore) => ({
        sidebar: { ...state.sidebar, isCollapsed },
      })),
      
      setActiveSection: (activeSection: string) => set((state: UIStore) => ({
        sidebar: { ...state.sidebar, activeSection },
      })),
      
      // 模態框管理
      openModal: (key: string, data?: any) => set((state: UIStore) => ({
        modals: {
          ...state.modals,
          [key]: {
            isOpen: true,
            data,
          },
        },
      })),
      
      closeModal: (key: string) => set((state: UIStore) => ({
        modals: {
          ...state.modals,
          [key]: {
            ...state.modals[key],
            isOpen: false,
          },
        },
      })),
      
      // 快捷操作面板
      toggleQuickActions: () => set((state: UIStore) => ({
        quickActions: {
          ...state.quickActions,
          isOpen: !state.quickActions.isOpen,
        },
      })),
      
      addRecentAction: (action: Omit<UIStoreState['quickActions']['recentActions'][0], 'timestamp'>) => set((state: UIStore) => ({
        quickActions: {
          ...state.quickActions,
          recentActions: [
            {
              ...action,
              timestamp: new Date(),
            },
            ...state.quickActions.recentActions,
          ].slice(0, 10), // 只保留最近 10 個操作
        },
      })),
      
      // 進度指示器管理
      setProgressIndicator: (key: string, progress: number, message: string, type: 'determinate' | 'indeterminate' = 'determinate') => set((state: UIStore) => ({
        progressIndicators: {
          ...state.progressIndicators,
          [key]: {
            isVisible: true,
            progress,
            message,
            type,
          },
        },
      })),
      
      addProgressIndicator: (key: string, indicator: UIStoreState['progressIndicators'][string]) => set((state: UIStore) => ({
        progressIndicators: {
          ...state.progressIndicators,
          [key]: indicator,
        },
      })),
      
      updateProgressIndicator: (key: string, updates: Partial<UIStoreState['progressIndicators'][string]>) => set((state: UIStore) => ({
        progressIndicators: {
          ...state.progressIndicators,
          [key]: {
            ...state.progressIndicators[key],
            ...updates,
          },
        },
      })),
      
      removeProgressIndicator: (key: string) => set((state: UIStore) => {
        const newIndicators = { ...state.progressIndicators }
        delete newIndicators[key]
        return { progressIndicators: newIndicators }
      }),
      
      hideProgressIndicator: (key: string) => set((state: UIStore) => ({
        progressIndicators: {
          ...state.progressIndicators,
          [key]: {
            ...state.progressIndicators[key],
            isVisible: false,
          },
        },
      })),
      
      // 便利方法
      showSuccessNotification: (title: string, message: string = '') => {
        get().addNotification({
          type: 'success',
          title,
          message,
        })
      },
      
      showErrorNotification: (title: string, message: string = '') => {
        get().addNotification({
          type: 'error',
          title,
          message,
        })
      },
      
      showWarningNotification: (title: string, message: string = '') => {
        get().addNotification({
          type: 'warning',
          title,
          message,
        })
      },
      
      showInfoNotification: (title: string, message: string = '') => {
        get().addNotification({
          type: 'info',
          title,
          message,
        })
      },
      
      toggleSidebar: () => set((state: UIStore) => ({
        sidebar: {
          ...state.sidebar,
          isOpen: !state.sidebar.isOpen,
        },
      })),
      
      closeSidebar: () => set((state: UIStore) => ({
        sidebar: { ...state.sidebar, isOpen: false },
      })),
      
      openSidebar: () => set((state: UIStore) => ({
        sidebar: { ...state.sidebar, isOpen: true },
      })),
      
      closeAllModals: () => set((state: UIStore) => {
        const newModals: Record<string, { isOpen: boolean; data?: any }> = {}
        Object.keys(state.modals).forEach(key => {
          newModals[key] = {
            ...state.modals[key],
            isOpen: false,
          }
        })
        return { modals: newModals }
      }),
      
      clearOldNotifications: (maxAge: number) => set((state: UIStore) => {
        const cutoff = new Date(Date.now() - maxAge)
        return {
          notifications: state.notifications.filter((n: UIStoreState['notifications'][0]) => 
            n.timestamp > cutoff
          ),
        }
      }),
    }),
    {
      name: persistConfig.ui.name,
      storage: persistConfig.ui.storage,
      partialize: persistConfig.ui.partialize,
    }
  )
)

// 選擇器 Hooks（用於性能優化）
export const useGlobalLoading = () => useUIStore(state => state.globalLoading)
export const useNotifications = () => useUIStore(state => state.notifications)
export const useUnreadNotifications = () => useUIStore(state => 
  state.notifications.filter(n => !n.read)
)
export const useSidebar = () => useUIStore(state => state.sidebar)
export const useModals = () => useUIStore(state => state.modals)
export const useModal = (key: string) => useUIStore(state => state.modals[key])
export const useQuickActions = () => useUIStore(state => state.quickActions)
export const useProgressIndicator = (key: string) => useUIStore(state => 
  state.progressIndicators[key]
)

// 動作選擇器
export const useUIActions = () => useUIStore(state => ({
  setGlobalLoading: state.setGlobalLoading,
  addNotification: state.addNotification,
  showSuccessNotification: state.showSuccessNotification,
  showErrorNotification: state.showErrorNotification,
  showWarningNotification: state.showWarningNotification,
  showInfoNotification: state.showInfoNotification,
  markNotificationAsRead: state.markNotificationAsRead,
  clearNotifications: state.clearNotifications,
  setSidebarOpen: state.setSidebarOpen,
  setSidebarCollapsed: state.setSidebarCollapsed,
  setActiveSection: state.setActiveSection,
  toggleSidebar: state.toggleSidebar,
  openModal: state.openModal,
  closeModal: state.closeModal,
  closeAllModals: state.closeAllModals,
  toggleQuickActions: state.toggleQuickActions,
  addRecentAction: state.addRecentAction,
  setProgressIndicator: state.setProgressIndicator,
  addProgressIndicator: state.addProgressIndicator,
  updateProgressIndicator: state.updateProgressIndicator,
  removeProgressIndicator: state.removeProgressIndicator,
  hideProgressIndicator: state.hideProgressIndicator,
}))

// 計算屬性選擇器
export const useUnreadNotificationCount = () => useUIStore(state => 
  state.notifications.filter(n => !n.read).length
)

export const useHasActiveModals = () => useUIStore(state => 
  Object.values(state.modals).some(modal => modal.isOpen)
)

export const useActiveProgressIndicators = () => useUIStore(state => 
  Object.entries(state.progressIndicators)
    .filter(([_, indicator]) => indicator.isVisible)
    .reduce((acc, [key, indicator]) => {
      acc[key] = indicator
      return acc
    }, {} as Record<string, UIStoreState['progressIndicators'][string]>)
)

export default useUIStore