"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useApiSilent } from "@/hooks/useApiClient"
import { toast } from "sonner"
import { useMaterials, useFragrances } from "@/hooks/useFirebaseCache"
import { 
  Search, Package, FlaskConical, DollarSign, AlertTriangle, 
  TrendingUp, RefreshCw, Settings, Calculator, Eye, Loader2, Shield, Edit
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePermission } from '@/hooks/usePermission'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StandardDataListPage, StandardColumn, StandardAction, QuickFilter } from '@/components/StandardDataListPage'
import { StandardStats } from '@/components/StandardStatsCard'
import { useDataSearch } from '@/hooks/useDataSearch'
import { InventoryOverviewCards } from "./components/InventoryOverviewCards"
import { ProductionCapacityDialog } from "./components/ProductionCapacityDialog"
import { QuickUpdateDialog } from "./components/QuickUpdateDialog"
import { useAuth } from "@/context/AuthContext"
import { useInventoryCache } from "@/hooks/useInventoryCache"

interface InventoryOverview {
  totalMaterials: number
  totalFragrances: number
  totalMaterialCost: number
  totalFragranceCost: number
  lowStockMaterials: number
  lowStockFragrances: number
  totalLowStock: number
}

interface InventoryItem {
  id: string
  code: string
  name: string
  currentStock: number
  unit: string
  minStock: number
  maxStock: number
  costPerUnit: number
  category?: string
  series?: string
  seriesName?: string
  type: 'material' | 'fragrance'
  isLowStock?: boolean
}

export default function InventoryPage() {
  const { appUser } = useAuth()

  // 🚀 使用智能快取 Hook 替代原有的庫存總覽載入邏輯
  const {
    overview,
    loading: overviewLoading,
    error: overviewError,
    loadOverview,
    invalidateCache,
    isFromCache,
    cacheAge
  } = useInventoryCache()
  
  // 權限檢查
  const { hasPermission, isAdmin, canAccess } = usePermission();
  const canViewInventory = canAccess('/dashboard/inventory') || hasPermission('inventory.view') || hasPermission('inventory.manage') || isAdmin();
  const canManageInventory = hasPermission('inventory.manage') || isAdmin();
  
  // 臨時直接從 Firebase 載入測試
  const [directMaterials, setDirectMaterials] = useState<any[]>([])
  const [directFragrances, setDirectFragrances] = useState<any[]>([])
  const [directLoading, setDirectLoading] = useState(true)

  useEffect(() => {
    const testDirectLoad = async () => {
      try {
        console.log('開始直接從 Firebase 載入資料...')
        const { db } = await import('@/lib/firebase')
        const { collection, getDocs, getDoc } = await import('firebase/firestore')

        if (!db) {
          console.error('Firebase db 未初始化')
          return
        }

        console.log('Firebase db 已初始化，開始查詢...')

        // 直接查詢 materials
        const materialsSnapshot = await getDocs(collection(db, 'materials'))
        const materialsList = materialsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        console.log('直接載入的物料數量:', materialsList.length)
        setDirectMaterials(materialsList)

        // 直接查詢 fragrances 並獲取 series 資訊
        const fragrancesSnapshot = await getDocs(collection(db, 'fragrances'))
        const fragrancesList = await Promise.all(fragrancesSnapshot.docs.map(async doc => {
          const data = doc.data()
          let seriesName = ''

          // 如果有 seriesRef，獲取 series 名稱
          if (data.seriesRef) {
            try {
              const seriesDoc = await getDoc(data.seriesRef)
              if (seriesDoc.exists()) {
                const seriesData = seriesDoc.data() as any
                seriesName = seriesData.name || ''
                console.log(`重載香精 ${data.name} 的系列: ${seriesName}`)
              } else {
                console.log(`重載香精 ${data.name} 的 seriesRef 不存在`)
              }
            } catch (error) {
              console.error(`重載獲取香精 ${data.name} 系列失敗:`, error)
            }
          } else {
            console.log(`重載香精 ${data.name} 沒有 seriesRef`)
          }

          return {
            id: doc.id,
            ...data,
            seriesName: seriesName
          }
        }))
        console.log('直接載入的香精數量:', fragrancesList.length)
        setDirectFragrances(fragrancesList)

      } catch (error) {
        console.error('直接載入資料失敗:', error)
      } finally {
        setDirectLoading(false)
      }
    }

    testDirectLoad()
  }, [])

  // 直接載入資料的函數
  const loadInventoryData = useCallback(async () => {
    try {
      console.log('📦 重新載入庫存資料...')
      setDirectLoading(true)
      const { db } = await import('@/lib/firebase')
      const { collection, getDocs, getDoc } = await import('firebase/firestore')

      if (!db) {
        console.error('Firebase db 未初始化')
        return
      }

      // 直接查詢 materials
      const materialsSnapshot = await getDocs(collection(db, 'materials'))
      const materialsList = materialsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      console.log('重新載入的物料數量:', materialsList.length)
      setDirectMaterials(materialsList)

      // 直接查詢 fragrances 並獲取 series 資訊
      const fragrancesSnapshot = await getDocs(collection(db, 'fragrances'))
      const fragrancesList = await Promise.all(fragrancesSnapshot.docs.map(async doc => {
        const data = doc.data()
        let seriesName = ''

        // 如果有 seriesRef，獲取 series 名稱
        if (data.seriesRef) {
          try {
            const seriesDoc = await getDoc(data.seriesRef)
            if (seriesDoc.exists()) {
              const seriesData = seriesDoc.data() as any
              seriesName = seriesData.name || ''
              console.log(`香精 ${data.name} 的系列: ${seriesName}`)
            } else {
              console.log(`香精 ${data.name} 的 seriesRef 不存在`)
            }
          } catch (error) {
            console.error(`獲取香精 ${data.name} 系列失敗:`, error)
          }
        } else {
          console.log(`香精 ${data.name} 沒有 seriesRef`)
        }

        return {
          id: doc.id,
          ...data,
          seriesName: seriesName
        }
      }))
      console.log('重新載入的香精數量:', fragrancesList.length)
      setDirectFragrances(fragrancesList)

    } catch (error) {
      console.error('重新載入資料失敗:', error)
    } finally {
      setDirectLoading(false)
    }
  }, [])

  // 使用直接載入的資料替代快取 hooks
  const materials = directMaterials
  const fragrances = directFragrances
  const materialsLoading = directLoading
  const fragrancesLoading = directLoading
  const refetchMaterials = loadInventoryData
  const refetchFragrances = loadInventoryData
  
  // 計算整體載入狀態
  const loading = materialsLoading || fragrancesLoading
  
  // 合併所有庫存項目
  const allInventoryItems = useMemo(() => {
    const materialItems = materials.map(item => ({
      ...item,
      type: 'material' as const,
      isLowStock: (item.currentStock || 0) <= (item.minStock || item.safetyStockLevel || 0)
    }))

    const fragranceItems = fragrances.map(item => ({
      ...item,
      type: 'fragrance' as const,
      isLowStock: (item.currentStock || 0) <= (item.minStock || item.safetyStockLevel || 0)
    }))

    // 排序邏輯: 依照類型、分類、項目名稱升序排列
    return [...materialItems, ...fragranceItems].sort((a, b) => {
      // 1. 先按類型排序 (material 在前, fragrance 在後)
      if (a.type !== b.type) {
        return a.type === 'material' ? -1 : 1;
      }

      // 2. 再按分類排序 (香精用seriesName，物料用category)
      const aCategory = a.type === 'fragrance' ? (a.seriesName || a.series || '') : (a.category || '');
      const bCategory = b.type === 'fragrance' ? (b.seriesName || b.series || '') : (b.category || '');
      if (aCategory !== bCategory) {
        return aCategory.localeCompare(bCategory, 'zh-TW');
      }

      // 3. 最後按名稱排序
      return (a.name || '').localeCompare(b.name || '', 'zh-TW');
    })
  }, [materials, fragrances])
  
  // 搜尋配置
  const searchConfig = {
    searchFields: [
      { key: 'name' as keyof InventoryItem },
      { key: 'code' as keyof InventoryItem },
      { key: 'category' as keyof InventoryItem },
      { key: 'series' as keyof InventoryItem }
    ],
    filterConfigs: [
      {
        key: 'type' as keyof InventoryItem,
        type: 'set' as const
      },
      {
        key: 'category' as keyof InventoryItem,
        type: 'set' as const
      },
      {
        key: 'series' as keyof InventoryItem,
        type: 'set' as const
      },
      {
        key: 'isLowStock' as keyof InventoryItem,
        type: 'boolean' as const
      }
    ]
  }
  
  const {
    searchTerm,
    setSearchTerm,
    activeFilters,
    setFilter,
    clearFilter,
    filteredData: filteredInventoryItems,
    totalCount,
    filteredCount
  } = useDataSearch(allInventoryItems, searchConfig)
  
  // 對話框狀態
  const [isProductionCapacityDialogOpen, setIsProductionCapacityDialogOpen] = useState(false)
  const [isQuickUpdateDialogOpen, setIsQuickUpdateDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // 統計數據
  const stats: StandardStats[] = useMemo(() => [
    {
      title: '物料總數',
      value: materials.length,
      subtitle: '種物料',
      icon: <Package className="h-4 w-4" />,
      color: 'blue'
    },
    {
      title: '香精總數',
      value: fragrances.length,
      subtitle: '種香精',
      icon: <FlaskConical className="h-4 w-4" />,
      color: 'purple'
    },
    {
      title: '低庫存警告',
      value: allInventoryItems.filter(item => item.isLowStock).length,
      subtitle: '項目需補貨',
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'red'
    },
    {
      title: '總庫存價值',
      value: Math.round(allInventoryItems.reduce((total, item) => total + ((item.currentStock || 0) * (item.costPerUnit || 0)), 0)),
      subtitle: '元',
      icon: <DollarSign className="h-4 w-4" />,
      color: 'green',
      format: 'currency'
    }
  ], [materials, fragrances, allInventoryItems])
  
  // 欄位配置
  const columns: StandardColumn<InventoryItem>[] = [
    {
      key: 'name',
      title: '項目資訊',
      sortable: true,
      searchable: true,
      priority: 5,
      render: (value, record) => (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
            record.type === 'material' 
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
              : 'bg-gradient-to-br from-purple-500 to-pink-600'
          }`}>
            {record.type === 'material' ? <Package className="h-4 w-4" /> : <FlaskConical className="h-4 w-4" />}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{record.name}</div>
            <div className="text-sm text-gray-500">{record.code || '無代碼'}</div>
          </div>
        </div>
      ),
      mobileRender: (value, record) => (
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
            record.type === 'material' 
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
              : 'bg-gradient-to-br from-purple-500 to-pink-600'
          }`}>
            {record.type === 'material' ? <Package className="h-3 w-3 sm:h-4 sm:w-4" /> : <FlaskConical className="h-3 w-3 sm:h-4 sm:w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{record.name}</h3>
            <p className="text-xs sm:text-sm text-gray-500 truncate">{record.code || '無代碼'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'currentStock',
      title: '庫存數量',
      sortable: true,
      priority: 4,
      align: 'center',
      render: (value, record) => (
        <div className="text-center">
          <div className={`text-lg font-bold ${
            record.isLowStock ? 'text-red-600' : 'text-green-600'
          }`}>
            {value || 0}
          </div>
          <div className="text-xs text-gray-500">{record.unit}</div>
          {record.isLowStock && (
            <Badge variant="destructive" className="mt-1 text-xs">
              低庫存
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'type',
      title: '類型',
      sortable: true,
      filterable: true,
      priority: 3,
      hideOnMobile: true,
      render: (value) => (
        <Badge variant="outline" className={
          value === 'material'
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-purple-50 text-purple-700 border-purple-200'
        }>
          {value === 'material' ? '物料' : '香精'}
        </Badge>
      )
    },
    {
      key: 'category',
      title: '分類',
      sortable: true,
      filterable: true,
      priority: 2,
      hideOnMobile: true,
      render: (value, record) => (
        <div className="text-sm text-gray-600">
          {record.type === 'fragrance' ? (record.seriesName || record.series || '未分類') : (value || '未分類')}
        </div>
      )
    },
    {
      key: 'costPerUnit',
      title: '單價',
      sortable: true,
      priority: 2,
      hideOnMobile: true,
      align: 'right',
      render: (value) => (
        <div className="text-sm font-mono">
          ${(value || 0).toLocaleString()}
        </div>
      )
    }
  ]
  
  // 操作配置
  const actions: StandardAction<InventoryItem>[] = [
    {
      key: 'quickUpdate',
      title: '快速修改',
      icon: <Edit className="h-4 w-4" />,
      onClick: (record) => openQuickUpdateDialog(record)
    },
    {
      key: 'view',
      title: '查看詳情',
      icon: <Eye className="h-4 w-4" />,
      onClick: (record) => {
        // 這裡可以添加查看詳情的邏輯
        toast.info('查看詳情功能開發中')
      }
    }
  ]
  
  // 快速篩選配置
  const quickFilters: QuickFilter[] = [
    {
      key: 'type',
      label: '物料',
      value: 'material',
      color: 'blue',
      count: allInventoryItems.filter(item => item.type === 'material').length
    },
    {
      key: 'type',
      label: '香精',
      value: 'fragrance',
      color: 'purple',
      count: allInventoryItems.filter(item => item.type === 'fragrance').length
    },
    {
      key: 'isLowStock',
      label: '低庫存',
      value: true,
      color: 'red',
      count: allInventoryItems.filter(item => item.isLowStock).length
    },
    // 動態生成分類篩選
    ...Array.from(new Set(allInventoryItems.map(item => item.category).filter(Boolean)))
      .sort()
      .slice(0, 5) // 只顯示前5個分類
      .map(category => ({
        key: 'category' as keyof InventoryItem,
        label: category as string,
        value: category,
        color: 'gray' as const,
        count: allInventoryItems.filter(item => item.category === category).length
      }))
  ]

  // 🚀 統一 API 客戶端（靜默模式，避免不必要的 toast）
  const apiClient = useApiSilent()

  // 重新載入庫存數據
  const reloadInventoryData = useCallback(async () => {
    try {
      await loadInventoryData()
      console.log('✅ 庫存資料重新載入完成')
    } catch (error) {
      console.error('❌ 庫存重新載入失敗:', error)
      toast.error('重新載入失敗')
    }
  }, [loadInventoryData])

  // 重新整理所有數據  
  const refreshAll = useCallback(async () => {
    try {
      await Promise.all([
        loadOverview(),
        reloadInventoryData()
      ])
      toast.success('所有資料刷新完成')
    } catch (error) {
      toast.error('資料刷新失敗')
    }
  }, [loadOverview, reloadInventoryData])

  // 開啟快速更新對話框
  const openQuickUpdateDialog = useCallback((item: InventoryItem) => {
    setSelectedItem(item)
    setIsQuickUpdateDialogOpen(true)
  }, [])


  useEffect(() => {
    // 初始化載入，只執行一次
    if (!isInitialized && apiClient) {
      setIsInitialized(true)
      loadOverview()
    }
  }, [isInitialized, apiClient, loadOverview])


  // 權限保護：如果沒有查看權限，顯示無權限頁面
  if (!canViewInventory) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="max-w-2xl mx-auto">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            您沒有權限查看庫存監控頁面。請聯繫系統管理員獲取相關權限。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      {/* 頁面標題與快速操作 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            庫存管理
          </h1>
          <p className="text-gray-600 mt-2">全方位庫存監控與管理系統</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setIsProductionCapacityDialogOpen(true)}
            variant="outline"
            className="border-green-200 text-green-600 hover:bg-green-50"
          >
            <Calculator className="mr-2 h-4 w-4" />
            生產評估
          </Button>
          <Button
            onClick={refreshAll}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            重新載入
          </Button>
        </div>
      </div>

      <StandardDataListPage
        data={filteredInventoryItems}
        loading={loading}
        columns={columns}
        actions={actions}
        onRowClick={(record) => openQuickUpdateDialog(record)}
        
        // 搜尋與過濾
        searchable={true}
        searchPlaceholder="搜尋庫存項目名稱、代碼、分類..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        quickFilters={quickFilters}
        activeFilters={activeFilters}
        onFilterChange={(key, value) => {
          if (value === null) {
            clearFilter(key);
          } else {
            setFilter(key, value);
          }
        }}
        onClearFilters={() => {
          Object.keys(activeFilters).forEach(key => clearFilter(key));
        }}
        
        // 統計資訊
        stats={stats}
        showStats={true}
        
        // 工具列功能
        showToolbar={true}
        
        className="space-y-6"
      />

      {/* 對話框 */}
      
      <ProductionCapacityDialog
        isOpen={isProductionCapacityDialogOpen}
        onClose={() => setIsProductionCapacityDialogOpen(false)}
      />
      
      {selectedItem && (
        <QuickUpdateDialog
          isOpen={isQuickUpdateDialogOpen}
          onClose={() => {
            setIsQuickUpdateDialogOpen(false)
            setSelectedItem(null)
          }}
          item={selectedItem}
          onSuccess={async () => {
            await Promise.all([
              reloadInventoryData(),
              loadOverview()
            ])
          }}
        />
      )}
      
      
    </div>
  )
}