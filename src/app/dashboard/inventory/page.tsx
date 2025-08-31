"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, getDocs, query, orderBy, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getFunctions, httpsCallable } from "firebase/functions"
import { toast } from "sonner"
import { 
  Search, Package, FlaskConical, DollarSign, AlertTriangle, 
  TrendingUp, RefreshCw, Settings, Calculator, Eye
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InventoryOverviewCards } from "./components/InventoryOverviewCards"
import { InventoryTable } from "./components/InventoryTable"
import { LowStockDialog } from "./components/LowStockDialog"
import { ProductionCapacityDialog } from "./components/ProductionCapacityDialog"
import { QuickUpdateDialog } from "./components/QuickUpdateDialog"
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
  const [materials, setMaterials] = useState<InventoryItem[]>([])
  const [fragrances, setFragrances] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'materials' | 'fragrances'>('materials')
  const [searchTerm, setSearchTerm] = useState('')
  
  // 對話框狀態
  const [isLowStockDialogOpen, setIsLowStockDialogOpen] = useState(false)
  const [isProductionCapacityDialogOpen, setIsProductionCapacityDialogOpen] = useState(false)
  const [isQuickUpdateDialogOpen, setIsQuickUpdateDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  // 載入庫存總覽
  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    try {
      const functions = getFunctions()
      const getInventoryOverview = httpsCallable(functions, 'getInventoryOverview')
      
      const result = await getInventoryOverview({})
      const data = result.data as any
      
      if (data.success) {
        setOverview(data.overview)
      }
    } catch (error) {
      console.error('載入庫存總覽失敗:', error)
      toast.error('載入庫存總覽失敗')
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  // 載入庫存數據
  const loadInventoryData = useCallback(async () => {
    setLoading(true)
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      
      // 並行載入物料和香精
      const [materialsSnapshot, fragrancesSnapshot] = await Promise.all([
        getDocs(query(collection(db, "materials"), orderBy("name"))),
        getDocs(query(collection(db, "fragrances"), orderBy("name")))
      ])
      
      const materialsList = materialsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'material' as const,
        ...doc.data()
      })) as InventoryItem[]
      
      const fragrancesList = fragrancesSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'fragrance' as const,
        ...doc.data()
      })) as InventoryItem[]
      
      setMaterials(materialsList)
      setFragrances(fragrancesList)
    } catch (error) {
      console.error("讀取庫存資料失敗:", error)
      toast.error("讀取庫存資料失敗")
    } finally {
      setLoading(false)
    }
  }, [])

  // 重新整理所有數據
  const refreshAll = useCallback(async () => {
    await Promise.all([loadOverview(), loadInventoryData()])
  }, [loadOverview, loadInventoryData])

  // 開啟快速更新對話框
  const openQuickUpdateDialog = useCallback((item: InventoryItem) => {
    setSelectedItem(item)
    setIsQuickUpdateDialogOpen(true)
  }, [])

  // 篩選項目
  const filteredItems = useCallback(() => {
    const items = activeTab === 'materials' ? materials : fragrances
    if (!searchTerm.trim()) return items
    
    const term = searchTerm.toLowerCase()
    return items.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.code.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term) ||
      item.series?.toLowerCase().includes(term)
    )
  }, [activeTab, materials, fragrances, searchTerm])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const filteredItemsList = filteredItems()

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* 頁面標題與重新整理按鈕 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            庫存管理中心
          </h1>
          <p className="text-gray-600 mt-2">全方位庫存監控與管理系統</p>
        </div>
        <Button onClick={refreshAll} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          重新整理
        </Button>
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
                物料 ({materials.length})
              </TabsTrigger>
              <TabsTrigger value="fragrances" className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4" />
                香精 ({fragrances.length})
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
          onSuccess={refreshAll}
        />
      )}
    </div>
  )
}