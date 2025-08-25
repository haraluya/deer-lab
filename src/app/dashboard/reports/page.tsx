"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"

import { toast } from "sonner"
import { BarChart3, TrendingUp, TrendingDown, Calendar, Package, ShoppingCart, ClipboardList, Factory, DollarSign } from "lucide-react"
import ErrorBoundary from "@/components/ErrorBoundary"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface WorkOrder {
  id: string
  code: string
  productSnapshot: {
    name: string
    code: string
  }
  targetQuantity: number
  actualQuantity: number
  status: string
  createdAt: any
}

interface Material {
  id: string
  code: string
  name: string
  currentStock: number
  minStock: number
  maxStock: number
  unit: string
}

interface PurchaseOrder {
  id: string
  code: string
  supplierName: string
  totalAmount: number
  status: string
  createdAt: any
}

function ReportsPageContent() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState("30") // 30天

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        if (!db) {
          throw new Error("Firebase 未初始化")
        }
        
        // 載入工單資料
        const workOrdersQuery = query(
          collection(db, "workOrders"),
          orderBy("createdAt", "desc"),
          limit(50)
        )
        const workOrdersSnapshot = await getDocs(workOrdersQuery)
        const workOrdersList = workOrdersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as WorkOrder[]
        setWorkOrders(workOrdersList)

        // 載入物料資料
        const materialsSnapshot = await getDocs(collection(db, "materials"))
        const materialsList = materialsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Material[]
        setMaterials(materialsList)

        // 載入採購單資料
        const purchaseOrdersQuery = query(
          collection(db, "purchaseOrders"),
          orderBy("createdAt", "desc"),
          limit(50)
        )
        const purchaseOrdersSnapshot = await getDocs(purchaseOrdersQuery)
        const purchaseOrdersList = purchaseOrdersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PurchaseOrder[]
        setPurchaseOrders(purchaseOrdersList)

      } catch (error) {
        console.error("載入報表資料失敗:", error)
        toast.error("載入報表資料失敗")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // 計算統計數據
  const totalWorkOrders = workOrders.length
  const completedWorkOrders = workOrders.filter(wo => wo.status === 'completed').length
  const totalProduction = workOrders.reduce((sum, wo) => sum + (wo.actualQuantity || 0), 0)
  const totalTargetProduction = workOrders.reduce((sum, wo) => sum + (wo.targetQuantity || 0), 0)
  const completionRate = totalTargetProduction > 0 ? (totalProduction / totalTargetProduction * 100).toFixed(1) : '0'

  const lowStockMaterials = materials.filter(m => m.currentStock < (m.minStock || 0))
  const totalInventoryValue = materials.reduce((sum, m) => sum + (m.currentStock * 10), 0) // 假設每單位10元

  const totalPurchaseOrders = purchaseOrders.length
  const totalPurchaseAmount = purchaseOrders.reduce((sum, po) => sum + ((po.totalAmount || 0)), 0)
  const completedPurchaseOrders = purchaseOrders.filter(po => po.status === '已收貨').length

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('zh-TW')
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto py-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-600 to-gray-600 bg-clip-text text-transparent">
              報表分析
            </h1>
            <p className="text-gray-600 mt-2">生產數據統計與分析報告</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32 border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">最近7天</SelectItem>
                <SelectItem value="30">最近30天</SelectItem>
                <SelectItem value="90">最近90天</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 統計摘要卡片 - 桌面版 */}
        <div className="hidden lg:grid grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">工單完成率</CardTitle>
              <Factory className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {completionRate}%
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {completedWorkOrders}/{totalWorkOrders} 工單
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">總生產量</CardTitle>
              <Package className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {totalProduction.toLocaleString()} ml
              </div>
              <p className="text-xs text-green-600 mt-1">
                目標: {totalTargetProduction.toLocaleString()} ml
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">採購總額</CardTitle>
              <ShoppingCart className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">
                {formatCurrency(totalPurchaseAmount)}
              </div>
              <p className="text-xs text-orange-600 mt-1">
                {completedPurchaseOrders}/{totalPurchaseOrders} 採購單
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">低庫存警告</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">
                {lowStockMaterials.length}
              </div>
              <p className="text-xs text-red-600 mt-1">
                需要補貨的物料
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 統計摘要卡片 - 手機版 */}
        <div className="lg:hidden mb-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">工單完成率</CardTitle>
                <Factory className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-blue-900">
                  {completionRate}%
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {completedWorkOrders}/{totalWorkOrders} 工單
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700">總生產量</CardTitle>
                <Package className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-green-900">
                  {totalProduction.toLocaleString()} ml
                </div>
                <p className="text-xs text-green-600 mt-1">
                  目標: {totalTargetProduction.toLocaleString()} ml
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700">採購總額</CardTitle>
                <ShoppingCart className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-orange-900">
                  {formatCurrency(totalPurchaseAmount)}
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  {completedPurchaseOrders}/{totalPurchaseOrders} 採購單
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-700">低庫存警告</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-red-900">
                  {lowStockMaterials.length}
                </div>
                <p className="text-xs text-red-600 mt-1">
                  需要補貨的物料
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 詳細報表 */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-gray-800">詳細報表</h2>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="workorders" className="w-full">
            {/* 桌面版標籤列表 */}
            <TabsList className="hidden lg:grid w-full grid-cols-3 mx-6 mt-4">
              <TabsTrigger value="workorders">工單報表</TabsTrigger>
              <TabsTrigger value="materials">庫存報表</TabsTrigger>
              <TabsTrigger value="purchases">採購報表</TabsTrigger>
            </TabsList>
            
            {/* 手機版標籤列表 */}
            <TabsList className="lg:hidden grid w-full grid-cols-3 mx-4 mt-4">
              <TabsTrigger value="workorders" className="text-xs">工單</TabsTrigger>
              <TabsTrigger value="materials" className="text-xs">庫存</TabsTrigger>
              <TabsTrigger value="purchases" className="text-xs">採購</TabsTrigger>
            </TabsList>
            
            <TabsContent value="workorders" className="p-6">
              {/* 桌面版表格 */}
              <div className="hidden lg:block table-responsive">
                <Table className="table-enhanced">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">工單資訊</TableHead>
                      <TableHead className="text-left">產品</TableHead>
                      <TableHead className="text-right">目標數量</TableHead>
                      <TableHead className="text-right">實際數量</TableHead>
                      <TableHead className="text-left">狀態</TableHead>
                      <TableHead className="text-left">建立日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center">
                            <div className="relative">
                              <div className="w-12 h-12 border-4 border-slate-200 rounded-full animate-spin"></div>
                              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-slate-600 rounded-full animate-spin"></div>
                            </div>
                            <span className="mt-4 text-gray-600 font-medium">載入工單資料中...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : workOrders.length > 0 ? (
                      workOrders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors duration-200">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <Factory className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{order.code}</div>
                                <div className="text-xs text-gray-500">工單 ID: {order.id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-gray-700">
                                {order.productSnapshot?.name || '未知產品'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="number-display number-neutral">
                              {order.targetQuantity?.toLocaleString()} ml
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="number-display number-positive">
                              {order.actualQuantity?.toLocaleString()} ml
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`status-badge ${
                              order.status === 'completed' ? 'status-active' : 
                              order.status === 'in_progress' ? 'status-warning' : 
                              'status-neutral'
                            }`}>
                              {order.status === 'completed' ? '已完成' : 
                               order.status === 'in_progress' ? '進行中' : 
                               order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {formatDate(order.createdAt)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <Factory className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">沒有工單資料</h3>
                            <p className="text-gray-500">請先建立工單來查看報表</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 手機版卡片佈局 */}
              <div className="lg:hidden">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative">
                      <div className="w-10 h-10 border-4 border-slate-200 rounded-full animate-spin"></div>
                      <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-slate-600 rounded-full animate-spin"></div>
                    </div>
                    <span className="mt-3 text-sm text-gray-600 font-medium">載入工單資料中...</span>
                  </div>
                ) : workOrders.length > 0 ? (
                  <div className="space-y-4">
                    {workOrders.map((order) => (
                      <Card key={order.id} className="hover:bg-slate-50/50 transition-colors duration-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <Factory className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 text-sm">{order.code}</div>
                                <div className="text-xs text-gray-500">工單 ID: {order.id}</div>
                              </div>
                            </div>
                            <Badge className={`status-badge ${
                              order.status === 'completed' ? 'status-active' : 
                              order.status === 'in_progress' ? 'status-warning' : 
                              'status-neutral'
                            }`}>
                              {order.status === 'completed' ? '已完成' : 
                               order.status === 'in_progress' ? '進行中' : 
                               order.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <Package className="h-3 w-3 text-blue-600" />
                                <span className="text-gray-500">產品</span>
                              </div>
                              <span className="font-medium text-gray-700">
                                {order.productSnapshot?.name || '未知產品'}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-gray-500">建立日期</span>
                              </div>
                              <span className="text-xs text-gray-600">
                                {formatDate(order.createdAt)}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-gray-500">目標數量</span>
                              </div>
                              <span className="number-display number-neutral text-sm">
                                {order.targetQuantity?.toLocaleString()} ml
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-gray-500">實際數量</span>
                              </div>
                              <span className="number-display number-positive text-sm">
                                {order.actualQuantity?.toLocaleString()} ml
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <Factory className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-base font-medium text-gray-900 mb-1">沒有工單資料</h3>
                    <p className="text-sm text-gray-500 text-center">請先建立工單來查看報表</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="materials" className="p-6">
              {/* 桌面版表格 */}
              <div className="hidden lg:block table-responsive">
                <Table className="table-enhanced">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">物料資訊</TableHead>
                      <TableHead className="text-right">目前庫存</TableHead>
                      <TableHead className="text-right">最低庫存</TableHead>
                      <TableHead className="text-right">最高庫存</TableHead>
                      <TableHead className="text-left">狀態</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center">
                            <div className="relative">
                              <div className="w-12 h-12 border-4 border-slate-200 rounded-full animate-spin"></div>
                              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-slate-600 rounded-full animate-spin"></div>
                            </div>
                            <span className="mt-4 text-gray-600 font-medium">載入物料資料中...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : materials.length > 0 ? (
                      materials.map((material) => {
                        const isLowStock = material.currentStock < (material.minStock || 0)
                        const isOverStock = material.currentStock > (material.maxStock || 0)
                        return (
                          <TableRow key={material.id} className={`hover:bg-slate-50/50 transition-colors duration-200 ${
                            isLowStock ? 'bg-red-50/50' : isOverStock ? 'bg-yellow-50/50' : ''
                          }`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                  <Package className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{material.name}</div>
                                  <div className="text-xs text-gray-500">代號: {material.code}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`number-display ${
                                isLowStock ? 'number-negative' : 
                                isOverStock ? 'number-warning' : 
                                'number-positive'
                              }`}>
                                {material.currentStock} {material.unit}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="number-display number-neutral">
                                {material.minStock || 0} {material.unit}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="number-display number-neutral">
                                {material.maxStock || 0} {material.unit}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={`status-badge ${
                                isLowStock ? 'status-inactive' : 
                                isOverStock ? 'status-warning' : 
                                'status-active'
                              }`}>
                                {isLowStock ? '低庫存' : 
                                 isOverStock ? '過量庫存' : 
                                 '正常'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">沒有物料資料</h3>
                            <p className="text-gray-500">請先建立物料來查看庫存報表</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 手機版卡片佈局 */}
              <div className="lg:hidden">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative">
                      <div className="w-10 h-10 border-4 border-slate-200 rounded-full animate-spin"></div>
                      <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-slate-600 rounded-full animate-spin"></div>
                    </div>
                    <span className="mt-3 text-sm text-gray-600 font-medium">載入物料資料中...</span>
                  </div>
                ) : materials.length > 0 ? (
                  <div className="space-y-4">
                    {materials.map((material) => {
                      const isLowStock = material.currentStock < (material.minStock || 0)
                      const isOverStock = material.currentStock > (material.maxStock || 0)
                      return (
                        <Card key={material.id} className={`hover:bg-slate-50/50 transition-colors duration-200 ${
                          isLowStock ? 'bg-red-50/50' : isOverStock ? 'bg-yellow-50/50' : ''
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                  <Package className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">{material.name}</div>
                                  <div className="text-xs text-gray-500">代號: {material.code}</div>
                                </div>
                              </div>
                              <Badge className={`status-badge ${
                                isLowStock ? 'status-inactive' : 
                                isOverStock ? 'status-warning' : 
                                'status-active'
                              }`}>
                                {isLowStock ? '低庫存' : 
                                 isOverStock ? '過量庫存' : 
                                 '正常'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-gray-500">目前庫存</span>
                                </div>
                                <span className={`number-display text-sm ${
                                  isLowStock ? 'number-negative' : 
                                  isOverStock ? 'number-warning' : 
                                  'number-positive'
                                }`}>
                                  {material.currentStock} {material.unit}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-gray-500">最低庫存</span>
                                </div>
                                <span className="number-display number-neutral text-sm">
                                  {material.minStock || 0} {material.unit}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-gray-500">最高庫存</span>
                                </div>
                                <span className="number-display number-neutral text-sm">
                                  {material.maxStock || 0} {material.unit}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-base font-medium text-gray-900 mb-1">沒有物料資料</h3>
                    <p className="text-sm text-gray-500 text-center">請先建立物料來查看庫存報表</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="purchases" className="p-6">
              {/* 桌面版表格 */}
              <div className="hidden lg:block table-responsive">
                <Table className="table-enhanced">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">採購單資訊</TableHead>
                      <TableHead className="text-left">供應商</TableHead>
                      <TableHead className="text-right">總金額</TableHead>
                      <TableHead className="text-left">狀態</TableHead>
                      <TableHead className="text-left">建立日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center">
                            <div className="relative">
                              <div className="w-12 h-12 border-4 border-slate-200 rounded-full animate-spin"></div>
                              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-slate-600 rounded-full animate-spin"></div>
                            </div>
                            <span className="mt-4 text-gray-600 font-medium">載入採購單資料中...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : purchaseOrders.length > 0 ? (
                      purchaseOrders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors duration-200">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                                <ShoppingCart className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{order.code}</div>
                                <div className="text-xs text-gray-500">採購單 ID: {order.id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-gray-700">
                              {order.supplierName || '未知供應商'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="number-display number-positive font-semibold">
                              {formatCurrency(order.totalAmount || 0)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`status-badge ${
                              order.status === '已收貨' ? 'status-active' : 
                              order.status === '已訂購' ? 'status-warning' : 
                              order.status === '已取消' ? 'status-inactive' : 
                              'status-neutral'
                            }`}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {formatDate(order.createdAt)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <ShoppingCart className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">沒有採購單資料</h3>
                            <p className="text-gray-500">請先建立採購單來查看採購報表</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 手機版卡片佈局 */}
              <div className="lg:hidden">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative">
                      <div className="w-10 h-10 border-4 border-slate-200 rounded-full animate-spin"></div>
                      <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-slate-600 rounded-full animate-spin"></div>
                    </div>
                    <span className="mt-3 text-sm text-gray-600 font-medium">載入採購單資料中...</span>
                  </div>
                ) : purchaseOrders.length > 0 ? (
                  <div className="space-y-4">
                    {purchaseOrders.map((order) => (
                      <Card key={order.id} className="hover:bg-slate-50/50 transition-colors duration-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                                <ShoppingCart className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 text-sm">{order.code}</div>
                                <div className="text-xs text-gray-500">採購單 ID: {order.id}</div>
                              </div>
                            </div>
                            <Badge className={`status-badge ${
                              order.status === '已收貨' ? 'status-active' : 
                              order.status === '已訂購' ? 'status-warning' : 
                              order.status === '已取消' ? 'status-inactive' : 
                              'status-neutral'
                            }`}>
                              {order.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-gray-500">供應商</span>
                              </div>
                              <span className="font-medium text-gray-700">
                                {order.supplierName || '未知供應商'}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-gray-500">建立日期</span>
                              </div>
                              <span className="text-xs text-gray-600">
                                {formatDate(order.createdAt)}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-gray-500">總金額</span>
                              </div>
                              <span className="number-display number-positive font-semibold text-sm">
                                {formatCurrency(order.totalAmount || 0)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <ShoppingCart className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-base font-medium text-gray-900 mb-1">沒有採購單資料</h3>
                    <p className="text-sm text-gray-500 text-center">請先建立採購單來查看採購報表</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ErrorBoundary>
  )
}


export default function ReportsPage() {
  return (
    <ReportsPageContent />
  );
}
