"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, getDocs, doc, updateDoc, addDoc, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { Search, Plus, Minus, Package, TrendingUp, TrendingDown, AlertTriangle, Warehouse, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Material {
  id: string
  code: string
  name: string
  currentStock: number
  unit: string
  minStock: number
  maxStock: number
  status: string
}

interface StockAdjustment {
  materialId: string
  adjustmentType: "in" | "out"
  quantity: number
  reason: string
  notes?: string
}

function InventoryPageContent() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [adjustmentData, setAdjustmentData] = useState<StockAdjustment>({
    materialId: "",
    adjustmentType: "in",
    quantity: 0,
    reason: "",
    notes: ""
  })

  const loadMaterials = useCallback(async () => {
    setLoading(true)
    try {
      const querySnapshot = await getDocs(collection(db, "materials"))
      const materialsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Material[]
      
      setMaterials(materialsList)
      setFilteredMaterials(materialsList)
    } catch (error) {
      console.error("讀取物料資料失敗:", error)
      toast.error("讀取物料資料失敗")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMaterials()
  }, [loadMaterials])

  useEffect(() => {
    let filtered = materials

    // 搜尋過濾
    if (searchTerm) {
      filtered = filtered.filter(material =>
        material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 狀態過濾
    if (statusFilter !== "all") {
      filtered = filtered.filter(material => material.status === statusFilter)
    }

    setFilteredMaterials(filtered)
  }, [materials, searchTerm, statusFilter])

  const handleStockAdjustment = async () => {
    if (!selectedMaterial || adjustmentData.quantity <= 0) {
      toast.error("請輸入有效的調整數量")
      return
    }

    try {
      const newStock = adjustmentData.adjustmentType === "in" 
        ? selectedMaterial.currentStock + adjustmentData.quantity
        : selectedMaterial.currentStock - adjustmentData.quantity

      if (newStock < 0) {
        toast.error("庫存不足，無法進行出庫調整")
        return
      }

      // 更新物料庫存
      const materialRef = doc(db, "materials", selectedMaterial.id)
      await updateDoc(materialRef, {
        currentStock: newStock,
        lastUpdated: new Date()
      })

      // 記錄調整歷史
      await addDoc(collection(db, "stockAdjustments"), {
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.name,
        adjustmentType: adjustmentData.adjustmentType,
        quantity: adjustmentData.quantity,
        reason: adjustmentData.reason,
        notes: adjustmentData.notes,
        timestamp: new Date(),
        previousStock: selectedMaterial.currentStock,
        newStock: newStock
      })

      toast.success("庫存調整成功")
      setIsAdjustmentDialogOpen(false)
      setAdjustmentData({
        materialId: "",
        adjustmentType: "in",
        quantity: 0,
        reason: "",
        notes: ""
      })
      loadMaterials()
    } catch (error) {
      console.error("庫存調整失敗:", error)
      toast.error("庫存調整失敗")
    }
  }

  const openAdjustmentDialog = (material: Material, type: "in" | "out") => {
    setSelectedMaterial(material)
    setAdjustmentData({
      materialId: material.id,
      adjustmentType: type,
      quantity: 0,
      reason: "",
      notes: ""
    })
    setIsAdjustmentDialogOpen(true)
  }

  const getStockStatus = (material: Material) => {
    if (material.currentStock <= material.minStock) {
      return { status: "low", text: "低庫存", color: "text-red-600 bg-red-50" }
    } else if (material.currentStock >= material.maxStock) {
      return { status: "high", text: "高庫存", color: "text-yellow-600 bg-yellow-50" }
    } else {
      return { status: "normal", text: "正常", color: "text-green-600 bg-green-50" }
    }
  }

  // 計算統計數據
  const totalMaterials = materials.length
  const lowStockMaterials = materials.filter(m => m.currentStock <= m.minStock).length
  const totalStockValue = materials.reduce((sum, m) => sum + m.currentStock, 0)

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
            庫存管理
          </h1>
          <p className="text-gray-600 mt-2">監控物料庫存與調整</p>
        </div>
      </div>

      {/* 統計摘要卡片 - 桌面版 */}
      <div className="hidden lg:grid grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">總物料數</CardTitle>
            <Package className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">
              {totalMaterials}
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              管理的物料總數
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">低庫存警告</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {lowStockMaterials}
            </div>
            <p className="text-xs text-red-600 mt-1">
              需要補貨的物料
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">總庫存量</CardTitle>
            <Warehouse className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {totalStockValue.toLocaleString()}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              所有物料庫存總和
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 統計摘要卡片 - 手機版 */}
      <div className="lg:hidden mb-6">
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">總物料數</CardTitle>
              <Package className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-emerald-900">
                {totalMaterials}
              </div>
              <p className="text-xs text-emerald-600 mt-1">
                管理的物料總數
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">低庫存警告</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-900">
                {lowStockMaterials}
              </div>
              <p className="text-xs text-red-600 mt-1">
                需要補貨的物料
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">總庫存量</CardTitle>
              <Warehouse className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-blue-900">
                {totalStockValue.toLocaleString()}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                所有物料庫存總和
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 搜尋和過濾 - 桌面版 */}
      <div className="hidden lg:block">
        <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-gray-50 to-emerald-50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-emerald-600" />
                <Input
                  placeholder="搜尋物料名稱或代號..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 border-emerald-200">
                  <SelectValue placeholder="篩選狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="low">低庫存</SelectItem>
                  <SelectItem value="normal">正常</SelectItem>
                  <SelectItem value="high">高庫存</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜尋和過濾 - 手機版 */}
      <div className="lg:hidden mb-6">
        <Card className="border-0 shadow-lg bg-gradient-to-r from-gray-50 to-emerald-50">
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-emerald-600" />
                <Input
                  placeholder="搜尋物料名稱或代號..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-emerald-200">
                  <SelectValue placeholder="篩選狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="low">低庫存</SelectItem>
                  <SelectItem value="normal">正常</SelectItem>
                  <SelectItem value="high">高庫存</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 庫存表格 - 桌面版 */}
      <div className="hidden lg:block bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-emerald-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-800">庫存清單</h2>
            </div>
            <div className="text-sm text-gray-600">
              共 {filteredMaterials.length} 項物料
            </div>
          </div>
        </div>
        
        <div className="table-responsive">
          <Table className="table-enhanced">
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">物料資訊</TableHead>
                <TableHead className="text-right">目前庫存</TableHead>
                <TableHead className="text-right">最低庫存</TableHead>
                <TableHead className="text-right">最高庫存</TableHead>
                <TableHead className="text-left">狀態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-emerald-600 rounded-full animate-spin"></div>
                      </div>
                      <span className="mt-4 text-gray-600 font-medium">載入庫存資料中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredMaterials.length > 0 ? (
                filteredMaterials.map((material) => {
                  const stockStatus = getStockStatus(material)
                  return (
                    <TableRow key={material.id} className="hover:bg-emerald-50/50 transition-colors duration-200">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{material.name}</div>
                            <div className="text-xs text-gray-500">代號: {material.code}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`number-display ${
                          stockStatus.status === 'low' ? 'number-negative' : 
                          stockStatus.status === 'high' ? 'number-warning' : 
                          'number-positive'
                        }`}>
                          {material.currentStock} {material.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="number-display number-neutral">
                          {material.minStock} {material.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="number-display number-neutral">
                          {material.maxStock} {material.unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`status-badge ${
                          stockStatus.status === 'low' ? 'status-inactive' : 
                          stockStatus.status === 'high' ? 'status-warning' : 
                          'status-active'
                        }`}>
                          {stockStatus.text}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAdjustmentDialog(material, "in")}
                            className="border-green-200 text-green-600 hover:bg-green-50"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            入庫
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAdjustmentDialog(material, "out")}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Minus className="h-3 w-3 mr-1" />
                            出庫
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Warehouse className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">沒有庫存資料</h3>
                      <p className="text-gray-500">請先建立物料來管理庫存</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 庫存表格 - 手機版 */}
      <div className="lg:hidden">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-emerald-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-emerald-600" />
                <h2 className="text-base font-semibold text-gray-800">庫存清單</h2>
              </div>
              <div className="text-xs text-gray-600">
                共 {filteredMaterials.length} 項物料
              </div>
            </div>
          </div>
          
          <div className="p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="w-10 h-10 border-4 border-emerald-200 rounded-full animate-spin"></div>
                  <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-emerald-600 rounded-full animate-spin"></div>
                </div>
                <span className="mt-3 text-sm text-gray-600 font-medium">載入庫存資料中...</span>
              </div>
            ) : filteredMaterials.length > 0 ? (
              <div className="space-y-3">
                {filteredMaterials.map((material) => {
                  const stockStatus = getStockStatus(material)
                  return (
                    <div key={material.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-emerald-50/50 transition-colors duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                            <Package className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{material.name}</div>
                            <div className="text-xs text-gray-500">代號: {material.code}</div>
                          </div>
                        </div>
                        <Badge className={`status-badge ${
                          stockStatus.status === 'low' ? 'status-inactive' : 
                          stockStatus.status === 'high' ? 'status-warning' : 
                          'status-active'
                        }`}>
                          {stockStatus.text}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-gray-500">目前庫存</span>
                          </div>
                          <span className={`number-display text-sm ${
                            stockStatus.status === 'low' ? 'number-negative' : 
                            stockStatus.status === 'high' ? 'number-warning' : 
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
                            {material.minStock} {material.unit}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-gray-500">最高庫存</span>
                          </div>
                          <span className="number-display number-neutral text-sm">
                            {material.maxStock} {material.unit}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAdjustmentDialog(material, "in")}
                          className="border-green-200 text-green-600 hover:bg-green-50 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          入庫
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAdjustmentDialog(material, "out")}
                          className="border-red-200 text-red-600 hover:bg-red-50 text-xs"
                        >
                          <Minus className="h-3 w-3 mr-1" />
                          出庫
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Warehouse className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">沒有庫存資料</h3>
                <p className="text-sm text-gray-500 text-center">請先建立物料來管理庫存</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 庫存調整對話框 */}
      <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
        <DialogContent aria-describedby="inventory-adjustment-dialog-description">
          <DialogHeader>
            <DialogTitle>
              {adjustmentData.adjustmentType === "in" ? "入庫調整" : "出庫調整"}
            </DialogTitle>
            <DialogDescription>
              {selectedMaterial?.name} - 目前庫存: {selectedMaterial?.currentStock} {selectedMaterial?.unit}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">調整數量</Label>
              <Input
                id="quantity"
                type="number"
                value={adjustmentData.quantity}
                onChange={(e) => setAdjustmentData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                placeholder="輸入調整數量"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">調整原因</Label>
              <Select value={adjustmentData.reason} onValueChange={(value) => setAdjustmentData(prev => ({ ...prev, reason: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇調整原因" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">採購入庫</SelectItem>
                  <SelectItem value="production">生產出庫</SelectItem>
                  <SelectItem value="adjustment">庫存調整</SelectItem>
                  <SelectItem value="damage">損壞報廢</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">備註</Label>
              <Input
                id="notes"
                value={adjustmentData.notes}
                onChange={(e) => setAdjustmentData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="可選的備註說明"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAdjustmentDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleStockAdjustment}>
                確認調整
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


export default function InventoryPage() {
  return (
    <InventoryPageContent />
  );
}
