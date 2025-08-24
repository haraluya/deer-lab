"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"

import { toast } from "sonner"
import { DollarSign, TrendingUp, TrendingDown, Package, Droplets, Factory, Calculator, Calendar, ChevronLeft, ChevronRight } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

interface CostSummary {
  totalInventoryCost: number
  totalMaterialCost: number
  totalFragranceCost: number
  totalWorkOrderCost: number
  averageWorkOrderCost: number
}

interface WorkOrderCost {
  id: string
  productName: string
  targetQuantity: number
  materialCost: number
  fragranceCost: number
  laborCost: number
  totalCost: number
  costPerUnit: number
  createdAt: any
}

interface InventoryCost {
  id: string
  name: string
  code: string
  currentStock: number
  costPerUnit: number
  totalCost: number
  type: "material" | "fragrance"
}

function CostManagementPageContent() {
  const [costSummary, setCostSummary] = useState<CostSummary>({
    totalInventoryCost: 0,
    totalMaterialCost: 0,
    totalFragranceCost: 0,
    totalWorkOrderCost: 0,
    averageWorkOrderCost: 0
  })
  const [workOrderCosts, setWorkOrderCosts] = useState<WorkOrderCost[]>([])
  const [inventoryCosts, setInventoryCosts] = useState<InventoryCost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // 分頁狀態
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const loadCostData = async () => {
    setIsLoading(true)
    try {
      // 載入庫存成本
      const materialsSnapshot = await getDocs(collection(db, "materials"))
      const fragrancesSnapshot = await getDocs(collection(db, "fragrances"))
      
      const materialCosts: InventoryCost[] = materialsSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          code: data.code,
          currentStock: data.currentStock || 0,
          costPerUnit: data.costPerUnit || 0,
          totalCost: (data.currentStock || 0) * (data.costPerUnit || 0),
          type: "material"
        }
      })

      const fragranceCosts: InventoryCost[] = fragrancesSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          code: data.code,
          currentStock: data.currentStock || 0,
          costPerUnit: data.costPerUnit || 0,
          totalCost: (data.currentStock || 0) * (data.costPerUnit || 0),
          type: "fragrance"
        }
      })

      setInventoryCosts([...materialCosts, ...fragranceCosts])

      // 載入工單成本
      const workOrdersSnapshot = await getDocs(collection(db, "workOrders"))
      const workOrderCostsList: WorkOrderCost[] = workOrdersSnapshot.docs.map(doc => {
        const data = doc.data()
        // 這裡需要根據實際的 BOM 計算成本，目前使用模擬數據
        const materialCost = (data.targetQuantity || 0) * 0.5 // 模擬物料成本
        const fragranceCost = (data.targetQuantity || 0) * 0.3 // 模擬香精成本
        const laborCost = (data.targetQuantity || 0) * 0.2 // 模擬人工成本
        const totalCost = materialCost + fragranceCost + laborCost
        
        return {
          id: doc.id,
          productName: data.productName || '未知產品',
          targetQuantity: data.targetQuantity || 0,
          materialCost,
          fragranceCost,
          laborCost,
          totalCost,
          costPerUnit: totalCost / (data.targetQuantity || 1),
          createdAt: data.createdAt
        }
      })

      setWorkOrderCosts(workOrderCostsList)

      // 計算成本摘要
      const totalMaterialCost = materialCosts.reduce((sum, item) => sum + item.totalCost, 0)
      const totalFragranceCost = fragranceCosts.reduce((sum, item) => sum + item.totalCost, 0)
      const totalInventoryCost = totalMaterialCost + totalFragranceCost
      const totalWorkOrderCost = workOrderCostsList.reduce((sum, item) => sum + item.totalCost, 0)
      const averageWorkOrderCost = workOrderCostsList.length > 0 ? totalWorkOrderCost / workOrderCostsList.length : 0

      setCostSummary({
        totalInventoryCost,
        totalMaterialCost,
        totalFragranceCost,
        totalWorkOrderCost,
        averageWorkOrderCost
      })

    } catch (error) {
      console.error("載入成本資料失敗:", error)
      toast.error("載入成本資料失敗")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCostData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // 分頁計算
  const getPaginatedData = (data: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.slice(startIndex, endIndex)
  }

  const totalPages = Math.ceil(Math.max(inventoryCosts.length, workOrderCosts.length) / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
            成本管理
          </h1>
          <p className="text-gray-600 mt-2">監控生產成本與庫存價值</p>
        </div>
      </div>

      {/* 成本摘要卡片 - 手機版面優化 */}
      <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">總庫存價值</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">
              {formatCurrency(costSummary.totalInventoryCost)}
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              物料 + 香精庫存
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">物料成本</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(costSummary.totalMaterialCost)}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              當前物料庫存價值
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-pink-700">香精成本</CardTitle>
            <Droplets className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-900">
              {formatCurrency(costSummary.totalFragranceCost)}
            </div>
            <p className="text-xs text-pink-600 mt-1">
              當前香精庫存價值
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">工單成本</CardTitle>
            <Factory className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {formatCurrency(costSummary.totalWorkOrderCost)}
            </div>
            <p className="text-xs text-orange-600 mt-1">
              平均 {formatCurrency(costSummary.averageWorkOrderCost)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 手機版面摘要卡片 */}
      <div className="lg:hidden grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-emerald-700 flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              總庫存價值
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-emerald-900">
              {formatCurrency(costSummary.totalInventoryCost)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-blue-700 flex items-center gap-1">
              <Package className="h-3 w-3" />
              物料成本
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-blue-900">
              {formatCurrency(costSummary.totalMaterialCost)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-pink-700 flex items-center gap-1">
              <Droplets className="h-3 w-3" />
              香精成本
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-pink-900">
              {formatCurrency(costSummary.totalFragranceCost)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-orange-700 flex items-center gap-1">
              <Factory className="h-3 w-3" />
              工單成本
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-orange-900">
              {formatCurrency(costSummary.totalWorkOrderCost)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 詳細成本分析 */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-emerald-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-800">成本分析</h2>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="inventory" className="w-full">
          {/* 桌面版面 Tabs */}
          <div className="hidden lg:block">
            <TabsList className="grid w-full grid-cols-2 mx-6 mt-4">
              <TabsTrigger value="inventory">庫存成本</TabsTrigger>
              <TabsTrigger value="workorders">工單成本</TabsTrigger>
            </TabsList>
          </div>

          {/* 手機版面 Tabs */}
          <div className="lg:hidden">
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
              <TabsTrigger value="inventory" className="text-sm">庫存</TabsTrigger>
              <TabsTrigger value="workorders" className="text-sm">工單</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="inventory" className="p-6">
            {/* 桌面版面表格 */}
            <div className="hidden lg:block">
              <div className="table-responsive">
                <Table className="table-enhanced">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">項目資訊</TableHead>
                      <TableHead className="text-left">類型</TableHead>
                      <TableHead className="text-right">庫存數量</TableHead>
                      <TableHead className="text-right">單位成本</TableHead>
                      <TableHead className="text-right">總成本</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center">
                            <div className="relative">
                              <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin"></div>
                              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-emerald-600 rounded-full animate-spin"></div>
                            </div>
                            <span className="mt-4 text-gray-600 font-medium">載入成本資料中...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : inventoryCosts.length > 0 ? (
                      getPaginatedData(inventoryCosts).map((item) => (
                        <TableRow key={item.id} className="hover:bg-emerald-50/50 transition-colors duration-200">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                item.type === 'material' 
                                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                                  : 'bg-gradient-to-br from-pink-500 to-rose-600'
                              }`}>
                                {item.type === 'material' ? (
                                  <Package className="h-4 w-4 text-white" />
                                ) : (
                                  <Droplets className="h-4 w-4 text-white" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{item.name}</div>
                                <div className="text-xs text-gray-500">代號: {item.code}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${
                              item.type === 'material' 
                                ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                : 'bg-pink-100 text-pink-800 border-pink-200'
                            }`}>
                              {item.type === 'material' ? '物料' : '香精'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="number-display number-neutral">
                              {item.currentStock}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="number-display number-positive">
                              {formatCurrency(item.costPerUnit)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="number-display number-positive font-semibold">
                              {formatCurrency(item.totalCost)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <Calculator className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">沒有庫存成本資料</h3>
                            <p className="text-gray-500">請先建立物料和香精資料</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 手機版面卡片 */}
            <div className="lg:hidden">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-emerald-600 rounded-full animate-spin"></div>
                  </div>
                  <span className="mt-4 text-gray-600 font-medium">載入成本資料中...</span>
                </div>
              ) : inventoryCosts.length > 0 ? (
                <div className="space-y-4">
                  {getPaginatedData(inventoryCosts).map((item) => (
                    <Card key={item.id} className="border border-gray-200 shadow-sm">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              item.type === 'material' 
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                                : 'bg-gradient-to-br from-pink-500 to-rose-600'
                            }`}>
                              {item.type === 'material' ? (
                                <Package className="h-4 w-4 text-white" />
                              ) : (
                                <Droplets className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                              <div className="text-xs text-gray-500">代號: {item.code}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={`${
                              item.type === 'material' 
                                ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                : 'bg-pink-100 text-pink-800 border-pink-200'
                            }`}>
                              {item.type === 'material' ? '物料' : '香精'}
                            </Badge>
                          </div>
                          <div className="text-sm">
                            <div className="text-gray-500">庫存數量</div>
                            <div className="font-medium">{item.currentStock}</div>
                          </div>
                          <div className="text-sm text-right">
                            <div className="text-gray-500">單位成本</div>
                            <div className="font-medium text-green-600">{formatCurrency(item.costPerUnit)}</div>
                          </div>
                          <div className="text-sm col-span-2 text-center">
                            <div className="text-gray-500">總成本</div>
                            <div className="font-bold text-lg text-green-700">{formatCurrency(item.totalCost)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Calculator className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">沒有庫存成本資料</h3>
                  <p className="text-gray-500">請先建立物料和香精資料</p>
                </div>
              )}
            </div>

            {/* 分頁控制 */}
            {inventoryCosts.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  顯示第 {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, inventoryCosts.length)} 項，共 {inventoryCosts.length} 項
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="workorders" className="p-6">
            {/* 桌面版面表格 */}
            <div className="hidden lg:block">
              <div className="table-responsive">
                <Table className="table-enhanced">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">工單資訊</TableHead>
                      <TableHead className="text-right">目標數量</TableHead>
                      <TableHead className="text-right">物料成本</TableHead>
                      <TableHead className="text-right">香精成本</TableHead>
                      <TableHead className="text-right">人工成本</TableHead>
                      <TableHead className="text-right">總成本</TableHead>
                      <TableHead className="text-right">單位成本</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center">
                            <div className="relative">
                              <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin"></div>
                              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-emerald-600 rounded-full animate-spin"></div>
                            </div>
                            <span className="mt-4 text-gray-600 font-medium">載入工單成本資料中...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : workOrderCosts.length > 0 ? (
                      getPaginatedData(workOrderCosts).map((order) => (
                        <TableRow key={order.id} className="hover:bg-emerald-50/50 transition-colors duration-200">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                                <Factory className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{order.productName}</div>
                                <div className="text-xs text-gray-500">工單 ID: {order.id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="number-display number-neutral">
                              {order.targetQuantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="number-display number-positive">
                              {formatCurrency(order.materialCost)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="number-display number-positive">
                              {formatCurrency(order.fragranceCost)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="number-display number-positive">
                              {formatCurrency(order.laborCost)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="number-display number-positive font-semibold">
                              {formatCurrency(order.totalCost)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="number-display number-positive font-semibold">
                              {formatCurrency(order.costPerUnit)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <Factory className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">沒有工單成本資料</h3>
                            <p className="text-gray-500">請先建立工單資料</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 手機版面卡片 */}
            <div className="lg:hidden">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-emerald-600 rounded-full animate-spin"></div>
                  </div>
                  <span className="mt-4 text-gray-600 font-medium">載入工單成本資料中...</span>
                </div>
              ) : workOrderCosts.length > 0 ? (
                <div className="space-y-4">
                  {getPaginatedData(workOrderCosts).map((order) => (
                    <Card key={order.id} className="border border-gray-200 shadow-sm">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 col-span-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                              <Factory className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{order.productName}</div>
                              <div className="text-xs text-gray-500">工單 ID: {order.id}</div>
                            </div>
                          </div>
                          <div className="text-sm">
                            <div className="text-gray-500">目標數量</div>
                            <div className="font-medium">{order.targetQuantity}</div>
                          </div>
                          <div className="text-sm text-right">
                            <div className="text-gray-500">物料成本</div>
                            <div className="font-medium text-green-600">{formatCurrency(order.materialCost)}</div>
                          </div>
                          <div className="text-sm">
                            <div className="text-gray-500">香精成本</div>
                            <div className="font-medium text-green-600">{formatCurrency(order.fragranceCost)}</div>
                          </div>
                          <div className="text-sm text-right">
                            <div className="text-gray-500">人工成本</div>
                            <div className="font-medium text-green-600">{formatCurrency(order.laborCost)}</div>
                          </div>
                          <div className="text-sm col-span-2 text-center">
                            <div className="text-gray-500">總成本</div>
                            <div className="font-bold text-lg text-green-700">{formatCurrency(order.totalCost)}</div>
                          </div>
                          <div className="text-sm col-span-2 text-center">
                            <div className="text-gray-500">單位成本</div>
                            <div className="font-bold text-blue-700">{formatCurrency(order.costPerUnit)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Factory className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">沒有工單成本資料</h3>
                  <p className="text-gray-500">請先建立工單資料</p>
                </div>
              )}
            </div>

            {/* 分頁控制 */}
            {workOrderCosts.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  顯示第 {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, workOrderCosts.length)} 項，共 {workOrderCosts.length} 項
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}


export default function CostManagementPage() {
  return (
    <CostManagementPageContent />
  );
}
