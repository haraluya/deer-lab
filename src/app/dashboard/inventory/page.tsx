"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { getFunctions, httpsCallable } from "firebase/functions"
import { toast } from "sonner"
import { useMaterials, useFragrances } from "@/hooks/useFirebaseCache"
import { 
  Search, Package, FlaskConical, DollarSign, AlertTriangle, 
  TrendingUp, RefreshCw, Settings, Calculator, Eye, Loader2, Shield
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePermission } from '@/hooks/usePermission'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InventoryOverviewCards } from "./components/InventoryOverviewCards"
import { InventoryTable } from "./components/InventoryTable"
import { LowStockDialog } from "./components/LowStockDialog"
import { ProductionCapacityDialog } from "./components/ProductionCapacityDialog"
import { QuickUpdateDialog } from "./components/QuickUpdateDialog"
import { BatchOperationsPanel } from "./components/BatchOperationsPanel"
import { useAuth } from "@/context/AuthContext"

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
  type: 'material' | 'fragrance'
}

export default function InventoryPage() {
  const { appUser } = useAuth()
  const [overview, setOverview] = useState<InventoryOverview | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'materials' | 'fragrances'>('materials')
  const [searchTerm, setSearchTerm] = useState('')
  
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
        const { collection, getDocs } = await import('firebase/firestore')
        
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

        // 直接查詢 fragrances  
        const fragrancesSnapshot = await getDocs(collection(db, 'fragrances'))
        const fragrancesList = fragrancesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
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

  // 使用直接載入的資料替代快取 hooks
  const materials = directMaterials
  const fragrances = directFragrances
  const materialsLoading = directLoading
  const fragrancesLoading = directLoading
  const refetchMaterials = async () => {}
  const refetchFragrances = async () => {}
  
  
  // 計算整體載入狀態
  const loading = materialsLoading || fragrancesLoading
  
  // 對話框狀態
  const [isLowStockDialogOpen, setIsLowStockDialogOpen] = useState(false)
  const [isProductionCapacityDialogOpen, setIsProductionCapacityDialogOpen] = useState(false)
  const [isQuickUpdateDialogOpen, setIsQuickUpdateDialogOpen] = useState(false)
  const [isBatchOperationsPanelOpen, setIsBatchOperationsPanelOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // 載入庫存總覽
  const loadOverview = useCallback(async () => {
    try {
      setOverviewLoading(true)
      
      const functions = getFunctions()
      const getInventoryOverview = httpsCallable(functions, 'getInventoryOverview')
      
      const result = await getInventoryOverview({})
      const data = result.data as any
      
      if (data.success) {
        setOverview(data.overview)
        toast.success('庫存統計載入完成')
      }
    } catch (error) {
      console.error('載入庫存總覽失敗:', error)
      toast.error('載入庫存總覽失敗')
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  // 重新載入庫存數據
  const reloadInventoryData = useCallback(async () => {
    try {
      await refetchMaterials()
      await refetchFragrances()
      toast.success('庫存資料重新載入完成')
    } catch (error) {
      toast.error('重新載入失敗')
    }
  }, [refetchMaterials, refetchFragrances])

  // 重新整理所有數據  
  const refreshAll = useCallback(async () => {
    try {
      // 避免循環依賴，直接調用而不依賴 loadOverview
      await Promise.all([
        (async () => {
          const functions = getFunctions()
          const getInventoryOverview = httpsCallable(functions, 'getInventoryOverview')
          const result = await getInventoryOverview({})
          const data = result.data as any
          if (data.success) {
            setOverview(data.overview)
          }
        })(),
        reloadInventoryData()
      ])
      toast.success('所有資料刷新完成')
    } catch (error) {
      toast.error('資料刷新失敗')
    }
  }, [reloadInventoryData])

  // 開啟快速更新對話框
  const openQuickUpdateDialog = useCallback((item: InventoryItem) => {
    setSelectedItem(item)
    setIsQuickUpdateDialogOpen(true)
  }, [])


  useEffect(() => {
    // 初始化載入，只執行一次
    if (!isInitialized) {
      setIsInitialized(true)
      // 直接調用載入函數，避免依賴循環
      const initializeOverview = async () => {
        try {
          setOverviewLoading(true)
          
          const functions = getFunctions()
          const getInventoryOverview = httpsCallable(functions, 'getInventoryOverview')
          
          const result = await getInventoryOverview({})
          const data = result.data as any
          
          if (data.success) {
            setOverview(data.overview)
            toast.success('庫存統計載入完成')
          }
        } catch (error) {
          console.error('載入庫存總覽失敗:', error)
          toast.error('載入庫存總覽失敗')
        } finally {
          setOverviewLoading(false)
        }
      }
      initializeOverview()
    }
  }, [isInitialized])

  const filteredItemsList = useMemo(() => {
    const rawItems = activeTab === 'materials' ? (materials || []) : (fragrances || [])
    
    // 調試資料載入狀態
    console.log('庫存監控頁面資料載入狀態:', {
      activeTab,
      materialsCount: materials?.length || 0,
      fragrancesCount: fragrances?.length || 0,
      rawItemsCount: rawItems.length,
      loading: loading,
      materialsLoading,
      fragrancesLoading
    })
    
    // 將資料轉換為 InventoryTable 期望的格式
    const convertedItems = rawItems.map(item => ({
      id: item.id,
      code: item.code || '',
      name: item.name || '',
      currentStock: item.currentStock || 0,
      unit: item.unit || '',
      minStock: item.minStock || item.safetyStockLevel || 0,
      maxStock: item.maxStock || 0,
      costPerUnit: item.costPerUnit || 0,
      category: item.category || '',
      series: item.series || '',
      type: activeTab === 'materials' ? 'material' as const : 'fragrance' as const
    }))
    
    console.log('轉換後的項目數量:', convertedItems.length)
    
    // 如果沒有搜尋條件，直接返回轉換後的資料
    if (!searchTerm.trim()) return convertedItems
    
    // 搜尋篩選
    const term = searchTerm.toLowerCase()
    const filteredItems = convertedItems.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.code.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term) ||
      item.series?.toLowerCase().includes(term)
    )
    
    console.log('篩選後的項目數量:', filteredItems.length, '搜尋詞:', term)
    return filteredItems
  }, [activeTab, materials, fragrances, searchTerm, loading, materialsLoading, fragrancesLoading])

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
    <div className="container mx-auto py-8 space-y-8">
      {/* 頁面標題與重新整理按鈕 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            庫存監控
          </h1>
          <p className="text-gray-600 mt-2">全方位庫存監控與管理系統</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={reloadInventoryData} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            重新載入資料
          </Button>
          <Button onClick={refreshAll} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <RefreshCw className="h-4 w-4" />
            完整刷新
          </Button>
        </div>
      </div>

      {/* 統計卡片區 */}
      <InventoryOverviewCards 
        overview={overview}
        loading={overviewLoading}
      />

      {/* 快速操作區 */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Settings className="h-5 w-5" />
            快速操作
          </CardTitle>
          <CardDescription>
            一鍵執行常用的庫存管理操作
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setIsLowStockDialogOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              查看低庫存項目
            </Button>
            <Button
              onClick={() => setIsProductionCapacityDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Calculator className="mr-2 h-4 w-4" />
              生產能力評估
            </Button>
            {canManageInventory && (
              <Button
                onClick={() => setIsBatchOperationsPanelOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Package className="mr-2 h-4 w-4" />
                批量操作
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 庫存清單 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              庫存清單
            </CardTitle>
            
            {/* 搜尋框 */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={`搜尋${activeTab === 'materials' ? '物料' : '香精'}名稱、代碼、分類...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <CardDescription>
            點擊庫存數量可快速修改，系統會自動記錄變更
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* 切換標籤 */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'materials' | 'fragrances')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="materials" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                物料 ({materials?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="fragrances" className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4" />
                香精 ({fragrances?.length || 0})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="materials">
              <InventoryTable
                items={filteredItemsList}
                loading={loading}
                onQuickUpdate={openQuickUpdateDialog}
                type="material"
              />
            </TabsContent>
            
            <TabsContent value="fragrances">
              <InventoryTable
                items={filteredItemsList}
                loading={loading}
                onQuickUpdate={openQuickUpdateDialog}
                type="fragrance"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 對話框 */}
      <LowStockDialog
        isOpen={isLowStockDialogOpen}
        onClose={() => setIsLowStockDialogOpen(false)}
      />
      
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
            // 避免循環依賴，使用簡化的刷新邏輯
            await reloadInventoryData()
            // 直接調用 overview 載入，而不使用 loadOverview 函數
            try {
              const functions = getFunctions()
              const getInventoryOverview = httpsCallable(functions, 'getInventoryOverview')
              const result = await getInventoryOverview({})
              const data = result.data as any
              if (data.success) {
                setOverview(data.overview)
              }
            } catch (error) {
              console.error('刷新庫存統計失敗:', error)
            }
          }}
        />
      )}
      
      {/* 批量操作面板 */}
      {isBatchOperationsPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <BatchOperationsPanel
            onClose={() => setIsBatchOperationsPanelOpen(false)}
          />
        </div>
      )}
      
    </div>
  )
}