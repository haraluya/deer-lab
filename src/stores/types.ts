import type { Material, Fragrance, WorkOrder, PurchaseOrder, Personnel } from '../types'

// 應用程式全域狀態
export interface AppStoreState {
  // 應用程式設定
  settings: {
    theme: 'light' | 'dark' | 'system'
    language: 'zh-TW' | 'en'
    enableNotifications: boolean
    autoSave: boolean
    compactMode: boolean
  }
  
  // 用戶偏好設定
  userPreferences: {
    defaultPageSize: number
    showLowStockOnly: boolean
    preferredCurrency: 'TWD' | 'USD'
    timezone: string
  }
  
  // 快捷操作設定
  shortcuts: {
    enabled: boolean
    customShortcuts: Record<string, string>
  }
  
  // Actions
  updateSettings: (settings: Partial<AppStoreState['settings']>) => void
  updateUserPreferences: (preferences: Partial<AppStoreState['userPreferences']>) => void
  updateShortcuts: (shortcuts: Partial<AppStoreState['shortcuts']>) => void
  resetToDefaults: () => void
}

// 庫存管理狀態
export interface InventoryStoreState {
  // 快取資料
  materials: Material[]
  fragrances: Fragrance[]
  
  // 載入狀態
  loading: {
    materials: boolean
    fragrances: boolean
    updating: boolean
  }
  
  // 選擇狀態
  selectedItems: {
    materials: string[]
    fragrances: string[]
  }
  
  // 篩選和搜尋
  filters: {
    searchTerm: string
    category: string
    lowStockOnly: boolean
    sortBy: 'name' | 'code' | 'stock' | 'cost'
    sortOrder: 'asc' | 'desc'
  }
  
  // 批量操作
  batchOperations: {
    isEnabled: boolean
    pendingUpdates: Record<string, { quantity: number; reason: string }>
  }
  
  // Actions
  setMaterials: (materials: Material[]) => void
  setFragrances: (fragrances: Fragrance[]) => void
  updateMaterial: (id: string, updates: Partial<Material>) => void
  updateFragrance: (id: string, updates: Partial<Fragrance>) => void
  setLoading: (key: keyof InventoryStoreState['loading'], value: boolean) => void
  toggleSelection: (type: 'materials' | 'fragrances', id: string) => void
  clearSelections: () => void
  updateFilters: (filters: Partial<InventoryStoreState['filters']>) => void
  enableBatchMode: () => void
  disableBatchMode: () => void
  addBatchUpdate: (id: string, quantity: number, reason: string) => void
  clearBatchUpdates: () => void
  applyBatchUpdates: () => Promise<void>
}

// 工單管理狀態
export interface WorkOrderStoreState {
  // 快取資料
  workOrders: WorkOrder[]
  personnel: Personnel[]
  
  // 載入狀態
  loading: {
    workOrders: boolean
    personnel: boolean
    creating: boolean
    updating: boolean
  }
  
  // 選擇狀態
  selectedWorkOrders: string[]
  
  // 篩選和搜尋
  filters: {
    searchTerm: string
    status: 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled'
    assignee: string
    dateRange: {
      start: Date | null
      end: Date | null
    }
    sortBy: 'created' | 'deadline' | 'priority' | 'status'
    sortOrder: 'asc' | 'desc'
  }
  
  // 批量操作
  batchOperations: {
    isEnabled: boolean
    pendingActions: Array<{
      workOrderId: string
      action: 'assign' | 'start' | 'complete' | 'cancel'
      params: Record<string, any>
    }>
  }
  
  // Actions
  setWorkOrders: (workOrders: WorkOrder[]) => void
  setPersonnel: (personnel: Personnel[]) => void
  updateWorkOrder: (id: string, updates: Partial<WorkOrder>) => void
  setLoading: (key: keyof WorkOrderStoreState['loading'], value: boolean) => void
  toggleWorkOrderSelection: (id: string) => void
  clearSelections: () => void
  updateFilters: (filters: Partial<WorkOrderStoreState['filters']>) => void
  enableBatchMode: () => void
  disableBatchMode: () => void
  addBatchAction: (workOrderId: string, action: string, params: Record<string, any>) => void
  clearBatchActions: () => void
  applyBatchActions: () => Promise<void>
}

// 採購管理狀態
export interface PurchaseStoreState {
  // 快取資料
  purchaseOrders: PurchaseOrder[]
  suppliers: Array<{ id: string; name: string; email: string; phone: string }>
  
  // 載入狀態
  loading: {
    purchaseOrders: boolean
    suppliers: boolean
    creating: boolean
    updating: boolean
  }
  
  // 選擇狀態
  selectedPurchaseOrders: string[]
  
  // 篩選和搜尋
  filters: {
    searchTerm: string
    status: 'all' | 'draft' | 'sent' | 'confirmed' | 'delivered'
    supplier: string
    dateRange: {
      start: Date | null
      end: Date | null
    }
    sortBy: 'created' | 'total' | 'status' | 'supplier'
    sortOrder: 'asc' | 'desc'
  }
  
  // 批量操作
  batchOperations: {
    isEnabled: boolean
    pendingActions: Array<{
      purchaseOrderId: string
      action: 'send' | 'confirm' | 'receive' | 'cancel'
      params: Record<string, any>
    }>
  }
  
  // Actions
  setPurchaseOrders: (orders: PurchaseOrder[]) => void
  setSuppliers: (suppliers: any[]) => void
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void
  setLoading: (key: keyof PurchaseStoreState['loading'], value: boolean) => void
  togglePurchaseOrderSelection: (id: string) => void
  clearSelections: () => void
  updateFilters: (filters: Partial<PurchaseStoreState['filters']>) => void
  enableBatchMode: () => void
  disableBatchMode: () => void
  addBatchAction: (orderId: string, action: string, params: Record<string, any>) => void
  clearBatchActions: () => void
  applyBatchActions: () => Promise<void>
}

// UI 狀態管理
export interface UIStoreState {
  // 全域載入狀態
  globalLoading: {
    isLoading: boolean
    message: string
    progress?: number
  }
  
  // 通知系統
  notifications: Array<{
    id: string
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    timestamp: Date
    read: boolean
    actions?: Array<{
      label: string
      action: () => void
    }>
  }>
  
  // 側邊欄狀態
  sidebar: {
    isOpen: boolean
    isCollapsed: boolean
    activeSection: string
  }
  
  // 模態框狀態
  modals: {
    [key: string]: {
      isOpen: boolean
      data?: any
    }
  }
  
  // 快捷操作面板
  quickActions: {
    isOpen: boolean
    recentActions: Array<{
      id: string
      label: string
      action: () => void
      timestamp: Date
    }>
  }
  
  // 進度指示器
  progressIndicators: {
    [key: string]: {
      isVisible: boolean
      progress: number
      message: string
      type: 'determinate' | 'indeterminate'
    }
  }
  
  // Actions
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
  hideProgressIndicator: (key: string) => void
}