import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { InventoryStoreState } from './types'
import { Material, Fragrance } from '../types'
import { persistConfig } from './persistConfig'
import { arrayUtils, createAsyncHandler } from './utils'
import { businessCache } from '../lib/firebase-cache'
import { logger } from '../utils/logger'

// 初始狀態
const initialState: Omit<InventoryStoreState, keyof InventoryStoreActions> = {
  materials: [],
  fragrances: [],
  loading: {
    materials: false,
    fragrances: false,
    updating: false,
  },
  selectedItems: {
    materials: [],
    fragrances: [],
  },
  filters: {
    searchTerm: '',
    category: '',
    lowStockOnly: false,
    sortBy: 'name',
    sortOrder: 'asc',
  },
  batchOperations: {
    isEnabled: false,
    pendingUpdates: {},
  },
}

// Actions 介面
interface InventoryStoreActions {
  // 基本資料操作
  setMaterials: (materials: Material[]) => void
  setFragrances: (fragrances: Fragrance[]) => void
  updateMaterial: (id: string, updates: Partial<Material>) => void
  updateFragrance: (id: string, updates: Partial<Fragrance>) => void
  
  // 載入狀態
  setLoading: (key: keyof InventoryStoreState['loading'], value: boolean) => void
  
  // 選擇管理
  toggleSelection: (type: 'materials' | 'fragrances', id: string) => void
  clearSelections: () => void
  selectAll: (type: 'materials' | 'fragrances') => void
  selectNone: (type: 'materials' | 'fragrances') => void
  
  // 篩選和搜尋
  updateFilters: (filters: Partial<InventoryStoreState['filters']>) => void
  setSearchTerm: (term: string) => void
  setCategory: (category: string) => void
  toggleLowStockFilter: () => void
  setSortBy: (sortBy: InventoryStoreState['filters']['sortBy']) => void
  toggleSortOrder: () => void
  
  // 批量操作
  enableBatchMode: () => void
  disableBatchMode: () => void
  addBatchUpdate: (id: string, quantity: number, reason: string) => void
  removeBatchUpdate: (id: string) => void
  clearBatchUpdates: () => void
  applyBatchUpdates: () => Promise<void>
  
  // 資料載入
  loadMaterials: () => Promise<void>
  loadFragrances: () => Promise<void>
  refreshAll: () => Promise<void>
  
  // 實用方法
  getFilteredMaterials: () => Material[]
  getFilteredFragrances: () => Fragrance[]
  getLowStockItems: () => (Material | Fragrance)[]
  getSelectedItems: () => { materials: Material[]; fragrances: Fragrance[] }
  getTotalValue: () => { materials: number; fragrances: number }
}

// 完整的 Store 狀態類型
type InventoryStore = InventoryStoreState & InventoryStoreActions

// 篩選和排序邏輯
const filterAndSortItems = <T extends Material | Fragrance>(
  items: T[],
  filters: InventoryStoreState['filters']
): T[] => {
  let filtered = items

  // 搜尋篩選
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase()
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.code.toLowerCase().includes(term) ||
      ('category' in item && item.category?.toLowerCase().includes(term)) ||
      ('series' in item && item.series?.toLowerCase().includes(term))
    )
  }

  // 類別篩選
  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter(item =>
      ('category' in item && item.category === filters.category)
    )
  }

  // 低庫存篩選
  if (filters.lowStockOnly) {
    filtered = filtered.filter(item =>
      item.minStock > 0 && item.currentStock < item.minStock
    )
  }

  // 排序
  filtered.sort((a, b) => {
    let valueA: any
    let valueB: any

    switch (filters.sortBy) {
      case 'name':
        valueA = a.name.toLowerCase()
        valueB = b.name.toLowerCase()
        break
      case 'code':
        valueA = a.code.toLowerCase()
        valueB = b.code.toLowerCase()
        break
      case 'stock':
        valueA = a.currentStock
        valueB = b.currentStock
        break
      case 'cost':
        valueA = a.costPerUnit
        valueB = b.costPerUnit
        break
      default:
        return 0
    }

    if (valueA < valueB) {
      return filters.sortOrder === 'asc' ? -1 : 1
    }
    if (valueA > valueB) {
      return filters.sortOrder === 'asc' ? 1 : -1
    }
    return 0
  })

  return filtered
}

// 創建 Store
export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 基本資料操作
      setMaterials: (materials: Material[]) => set({ materials }),
      
      setFragrances: (fragrances: Fragrance[]) => set({ fragrances }),
      
      updateMaterial: (id: string, updates: Partial<Material>) => set((state: InventoryStore) => ({
        materials: arrayUtils.update(state.materials, id, updates),
      })),
      
      updateFragrance: (id: string, updates: Partial<Fragrance>) => set((state: InventoryStore) => ({
        fragrances: arrayUtils.update(state.fragrances, id, updates),
      })),
      
      // 載入狀態
      setLoading: (key: keyof InventoryStoreState['loading'], value: boolean) => set((state: InventoryStore) => ({
        loading: { ...state.loading, [key]: value },
      })),
      
      // 選擇管理
      toggleSelection: (type: 'materials' | 'fragrances', id: string) => set((state: InventoryStore) => ({
        selectedItems: {
          ...state.selectedItems,
          [type]: arrayUtils.toggle(state.selectedItems[type], id),
        },
      })),
      
      clearSelections: () => set((state: InventoryStore) => ({
        selectedItems: {
          materials: [],
          fragrances: [],
        },
      })),
      
      selectAll: (type: 'materials' | 'fragrances') => set((state: InventoryStore) => {
        const items = type === 'materials' ? state.materials : state.fragrances
        return {
          selectedItems: {
            ...state.selectedItems,
            [type]: items.map(item => item.id),
          },
        }
      }),
      
      selectNone: (type: 'materials' | 'fragrances') => set((state: InventoryStore) => ({
        selectedItems: {
          ...state.selectedItems,
          [type]: [],
        },
      })),
      
      // 篩選和搜尋
      updateFilters: (newFilters: Partial<InventoryStoreState['filters']>) => set((state: InventoryStore) => ({
        filters: { ...state.filters, ...newFilters },
      })),
      
      setSearchTerm: (searchTerm: string) => set((state: InventoryStore) => ({
        filters: { ...state.filters, searchTerm },
      })),
      
      setCategory: (category: string) => set((state: InventoryStore) => ({
        filters: { ...state.filters, category },
      })),
      
      toggleLowStockFilter: () => set((state: InventoryStore) => ({
        filters: {
          ...state.filters,
          lowStockOnly: !state.filters.lowStockOnly,
        },
      })),
      
      setSortBy: (sortBy: InventoryStoreState['filters']['sortBy']) => set((state: InventoryStore) => ({
        filters: { ...state.filters, sortBy },
      })),
      
      toggleSortOrder: () => set((state: InventoryStore) => ({
        filters: {
          ...state.filters,
          sortOrder: state.filters.sortOrder === 'asc' ? 'desc' : 'asc',
        },
      })),
      
      // 批量操作
      enableBatchMode: () => set((state: InventoryStore) => ({
        batchOperations: { ...state.batchOperations, isEnabled: true },
      })),
      
      disableBatchMode: () => set((state: InventoryStore) => ({
        batchOperations: {
          isEnabled: false,
          pendingUpdates: {},
        },
        selectedItems: {
          materials: [],
          fragrances: [],
        },
      })),
      
      addBatchUpdate: (id: string, quantity: number, reason: string) => set((state: InventoryStore) => ({
        batchOperations: {
          ...state.batchOperations,
          pendingUpdates: {
            ...state.batchOperations.pendingUpdates,
            [id]: { quantity, reason },
          },
        },
      })),
      
      removeBatchUpdate: (id: string) => set((state: InventoryStore) => {
        const newUpdates = { ...state.batchOperations.pendingUpdates }
        delete newUpdates[id]
        return {
          batchOperations: {
            ...state.batchOperations,
            pendingUpdates: newUpdates,
          },
        }
      }),
      
      clearBatchUpdates: () => set((state: InventoryStore) => ({
        batchOperations: {
          ...state.batchOperations,
          pendingUpdates: {},
        },
      })),
      
      // 資料載入
      loadMaterials: createAsyncHandler(
        async () => {
          const materials = await businessCache.getMaterials()
          get().setMaterials(materials || [])
          return materials
        },
        (loading) => get().setLoading('materials', loading),
        (error) => logger.error('載入物料失敗:', new Error(error || '未知錯誤'))
      ),
      
      loadFragrances: createAsyncHandler(
        async () => {
          const fragrances = await businessCache.getFragrances()
          get().setFragrances(fragrances || [])
          return fragrances
        },
        (loading) => get().setLoading('fragrances', loading),
        (error) => logger.error('載入香精失敗:', new Error(error || '未知錯誤'))
      ),
      
      refreshAll: async () => {
        await Promise.all([
          get().loadMaterials(),
          get().loadFragrances(),
        ])
      },
      
      // 批量更新應用
      applyBatchUpdates: createAsyncHandler(
        async () => {
          const { batchOperations } = get()
          const updates = Object.entries(batchOperations.pendingUpdates)
          
          // 這裡需要實作實際的批量更新邏輯
          // 暫時模擬批量更新
          for (const [id, update] of updates) {
            const { quantity, reason } = update as { quantity: number; reason: string }
            // 找出是物料還是香精
            const material = get().materials.find((m: Material) => m.id === id)
            const fragrance = get().fragrances.find((f: Fragrance) => f.id === id)
            
            if (material) {
              get().updateMaterial(id, { currentStock: quantity })
            } else if (fragrance) {
              get().updateFragrance(id, { currentStock: quantity })
            }
          }
          
          get().clearBatchUpdates()
          logger.info(`批量更新完成，共更新 ${updates.length} 個項目`)
        },
        (loading) => get().setLoading('updating', loading),
        (error) => logger.error('批量更新失敗:', new Error(error || '未知錯誤'))
      ),
      
      // 實用方法
      getFilteredMaterials: () => {
        const { materials, filters } = get()
        return filterAndSortItems(materials, filters)
      },
      
      getFilteredFragrances: () => {
        const { fragrances, filters } = get()
        return filterAndSortItems(fragrances, filters)
      },
      
      getLowStockItems: () => {
        const { materials, fragrances } = get()
        const allItems = [...materials, ...fragrances]
        return allItems.filter(item =>
          item.minStock > 0 && item.currentStock < item.minStock
        )
      },
      
      getSelectedItems: () => {
        const { materials, fragrances, selectedItems } = get()
        return {
          materials: materials.filter((m: Material) => selectedItems.materials.includes(m.id)),
          fragrances: fragrances.filter((f: Fragrance) => selectedItems.fragrances.includes(f.id)),
        }
      },
      
      getTotalValue: () => {
        const { materials, fragrances } = get()
        return {
          materials: materials.reduce((sum: number, m: Material) => sum + (m.currentStock * m.costPerUnit), 0),
          fragrances: fragrances.reduce((sum: number, f: Fragrance) => sum + (f.currentStock * f.costPerUnit), 0),
        }
      },
    }),
    {
      name: persistConfig.inventory.name,
      storage: persistConfig.inventory.storage,
      partialize: persistConfig.inventory.partialize,
    }
  )
)

// 選擇器 Hooks
export const useMaterials = () => useInventoryStore(state => state.materials)
export const useFragrances = () => useInventoryStore(state => state.fragrances)
export const useInventoryLoading = () => useInventoryStore(state => state.loading)
export const useSelectedItems = () => useInventoryStore(state => state.selectedItems)
export const useInventoryFilters = () => useInventoryStore(state => state.filters)
export const useBatchOperations = () => useInventoryStore(state => state.batchOperations)

// 計算屬性選擇器
export const useFilteredMaterials = () => useInventoryStore(state => state.getFilteredMaterials())
export const useFilteredFragrances = () => useInventoryStore(state => state.getFilteredFragrances())
export const useLowStockItems = () => useInventoryStore(state => state.getLowStockItems())
export const useTotalInventoryValue = () => useInventoryStore(state => state.getTotalValue())

// 動作選擇器
export const useInventoryActions = () => useInventoryStore(state => ({
  setMaterials: state.setMaterials,
  setFragrances: state.setFragrances,
  updateMaterial: state.updateMaterial,
  updateFragrance: state.updateFragrance,
  toggleSelection: state.toggleSelection,
  clearSelections: state.clearSelections,
  selectAll: state.selectAll,
  selectNone: state.selectNone,
  updateFilters: state.updateFilters,
  setSearchTerm: state.setSearchTerm,
  enableBatchMode: state.enableBatchMode,
  disableBatchMode: state.disableBatchMode,
  addBatchUpdate: state.addBatchUpdate,
  applyBatchUpdates: state.applyBatchUpdates,
  loadMaterials: state.loadMaterials,
  loadFragrances: state.loadFragrances,
  refreshAll: state.refreshAll,
}))

export default useInventoryStore