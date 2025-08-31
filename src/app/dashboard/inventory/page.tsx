"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { Search, Plus, Minus, Package, TrendingUp, TrendingDown, AlertTriangle, Warehouse, Calendar, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InventoryAdjustmentForm } from "@/components/InventoryAdjustmentForm"
import { createInventoryRecordByReason } from "@/lib/inventoryRecords"
import { useAuth } from "@/context/AuthContext"

interface Material {
  id: string
  code: string
  name: string
  currentStock: number
  unit: string
  minStock: number
  maxStock: number
  status: string
  lastUpdated?: Date
}

interface Fragrance {
  id: string
  code: string
  name: string
  currentStock: number
  unit: string
  minStock: number
  maxStock: number
  status: string
  lastUpdated?: Date
}

function InventoryPageContent() {
  const { appUser } = useAuth()
  const [materials, setMaterials] = useState<Material[]>([])
  const [fragrances, setFragrances] = useState<Fragrance[]>([])
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([])
  const [filteredFragrances, setFilteredFragrances] = useState<Fragrance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [itemTypeFilter, setItemTypeFilter] = useState<"all" | "materials" | "fragrances">("all")
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false)
  const [isInventoryCheckDialogOpen, setIsInventoryCheckDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Material | Fragrance | null>(null)
  const [selectedItemType, setSelectedItemType] = useState<"material" | "fragrance">("material")
  const [inventoryCheckData, setInventoryCheckData] = useState<{
    itemId: string;
    itemType: "material" | "fragrance";
    itemCode: string;
    itemName: string;
    oldStock: number;
    newStock: number;
    remarks: string;
  } | null>(null)

  const loadInventory = useCallback(async () => {
    setLoading(true)
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      
      // 載入物料
      const materialsQuery = query(collection(db, "materials"), orderBy("name"))
      const materialsSnapshot = await getDocs(materialsQuery)
      const materialsList = materialsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Material[]
      
      // 載入香精
      const fragrancesQuery = query(collection(db, "fragrances"), orderBy("name"))
      const fragrancesSnapshot = await getDocs(fragrancesQuery)
      const fragrancesList = fragrancesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Fragrance[]
      
      setMaterials(materialsList)
      setFragrances(fragrancesList)
      setFilteredMaterials(materialsList)
      setFilteredFragrances(fragrancesList)
    } catch (error) {
      console.error("讀取庫存資料失敗:", error)
      toast.error("讀取庫存資料失敗")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  useEffect(() => {
    let filteredM = materials
    let filteredF = fragrances

    // 搜尋過濾
    if (searchTerm) {
      filteredM = filteredM.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
      filteredF = filteredF.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 狀態過濾
    if (statusFilter !== "all") {
      filteredM = filteredM.filter(item => item.status === statusFilter)
      filteredF = filteredF.filter(item => item.status === statusFilter)
    }

    setFilteredMaterials(filteredM)
    setFilteredFragrances(filteredF)
  }, [materials, fragrances, searchTerm, statusFilter])

  const handleStockAdjustment = async (itemId: string, itemType: "material" | "fragrance", newStock: number, remarks?: string) => {
    try {
      if (!appUser) {
        toast.error("用戶未認證")
        return
      }

      const item = itemType === "material" 
        ? materials.find(m => m.id === itemId)
        : fragrances.find(f => f.id === itemId)

      if (!item) {
        toast.error("找不到指定項目")
        return
      }

      const quantityChange = newStock - item.currentStock

      // 建立庫存紀錄
      await createInventoryRecordByReason('manual_adjustment', {
        itemType,
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        quantityChange,
        quantityAfter: newStock,
        operatorId: appUser.uid,
        operatorName: appUser.name || '未知用戶',
        remarks: remarks || undefined
      })

      // 更新庫存
      const itemRef = doc(db!, itemType === "material" ? "materials" : "fragrances", itemId)
      await updateDoc(itemRef, {
        currentStock: newStock,
        lastUpdated: new Date()
      })

      toast.success("庫存調整成功")
      setIsAdjustmentDialogOpen(false)
      setSelectedItem(null)
      loadInventory()
    } catch (error) {
      console.error("庫存調整失敗:", error)
      toast.error("庫存調整失敗")
    }
  }

  const handleInventoryCheck = async () => {
    if (!inventoryCheckData || !appUser) {
      toast.error("用戶未認證或資料不完整")
      return
    }

    try {
      const { itemId, itemType, itemCode, itemName, oldStock, newStock, remarks } = inventoryCheckData
      const quantityChange = newStock - oldStock

      console.log('開始盤點，資料:', {
        itemId,
        itemType,
        itemCode,
        itemName,
        oldStock,
        newStock,
        quantityChange,
        remarks
      })

      // 建立庫存紀錄
      const recordId = await createInventoryRecordByReason('inventory_check', {
        itemType,
        itemId,
        itemCode,
        itemName,
        quantityChange,
        quantityAfter: newStock,
        operatorId: appUser.uid,
        operatorName: appUser.name || '未知用戶',
        remarks: remarks || '庫存盤點調整'
      })

      console.log('庫存紀錄建立成功，ID:', recordId)

      // 更新庫存
      const itemRef = doc(db!, itemType === "material" ? "materials" : "fragrances", itemId)
      await updateDoc(itemRef, {
        currentStock: newStock,
        lastUpdated: new Date()
      })

      console.log('庫存更新成功')

      toast.success("庫存盤點完成")
      setIsInventoryCheckDialogOpen(false)
      setInventoryCheckData(null)
      loadInventory()
    } catch (error) {
      console.error("庫存盤點失敗:", error)
      toast.error("庫存盤點失敗")
    }
  }

  const openAdjustmentDialog = (item: Material | Fragrance, type: "material" | "fragrance") => {
    setSelectedItem(item)
    setSelectedItemType(type)
    setIsAdjustmentDialogOpen(true)
  }

  const openInventoryCheckDialog = (item: Material | Fragrance, type: "material" | "fragrance") => {
    setInventoryCheckData({
      itemId: item.id,
      itemType: type,
      itemCode: item.code,
      itemName: item.name,
      oldStock: item.currentStock,
      newStock: item.currentStock,
      remarks: ''
    })
    setIsInventoryCheckDialogOpen(true)
  }

  const getStockStatus = (item: Material | Fragrance) => {
    if (item.currentStock <= item.minStock) {
      return { status: "low", text: "低庫存", color: "text-red-600 bg-red-50" }
    } else if (item.currentStock >= item.maxStock) {
      return { status: "high", text: "高庫存", color: "text-yellow-600 bg-yellow-50" }
    } else {
      return { status: "normal", text: "正常", color: "text-green-600 bg-green-50" }
    }
  }

  // 計算統計數據
  const totalItems = materials.length + fragrances.length
  const lowStockItems = materials.filter(m => m.currentStock <= m.minStock).length + 
                       fragrances.filter(f => f.currentStock <= f.minStock).length
  const totalStockValue = materials.reduce((sum, m) => sum + m.currentStock, 0) + 
                         fragrances.reduce((sum, f) => sum + f.currentStock, 0)

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
            庫存管理
          </h1>
          <p className="text-gray-600 mt-2">監控物料和香精庫存與調整</p>
        </div>
        <Button onClick={loadInventory} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          重新整理
        </Button>
      </div>

      {/* 統計摘要卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">總項目數</CardTitle>
            <Package className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">
              {totalItems}
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              物料: {materials.length} | 香精: {fragrances.length}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">低庫存項目</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {lowStockItems}
            </div>
            <p className="text-xs text-red-600 mt-1">
              需要補貨
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">總庫存數量</CardTitle>
            <Warehouse className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {totalStockValue.toLocaleString()}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              當前庫存總量
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 篩選和搜尋 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">篩選與搜尋</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">搜尋項目</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="搜尋編號或名稱..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">狀態篩選</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="選擇狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="active">啟用</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type">類型篩選</Label>
              <Select value={itemTypeFilter} onValueChange={(value) => setItemTypeFilter(value as any)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="選擇類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部類型</SelectItem>
                  <SelectItem value="materials">物料</SelectItem>
                  <SelectItem value="fragrances">香精</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 物料庫存表格 */}
      {(itemTypeFilter === "all" || itemTypeFilter === "materials") && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              物料庫存
            </CardTitle>
            <CardDescription>管理物料庫存和調整</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">載入中...</p>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                沒有找到符合條件的物料
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>編號</TableHead>
                      <TableHead>名稱</TableHead>
                      <TableHead>當前庫存</TableHead>
                      <TableHead>單位</TableHead>
                      <TableHead>最低庫存</TableHead>
                      <TableHead>最高庫存</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.map((material) => {
                      const stockStatus = getStockStatus(material)
                      return (
                        <TableRow key={material.id}>
                          <TableCell className="font-mono text-sm">{material.code}</TableCell>
                          <TableCell className="font-medium">{material.name}</TableCell>
                          <TableCell>
                            <span className={`font-semibold ${stockStatus.color} px-2 py-1 rounded-full text-xs`}>
                              {material.currentStock.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>{material.unit}</TableCell>
                          <TableCell>{material.minStock.toLocaleString()}</TableCell>
                          <TableCell>{material.maxStock.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={material.status === 'active' ? 'default' : 'secondary'}>
                              {material.status === 'active' ? '啟用' : '停用'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAdjustmentDialog(material, "material")}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                調整
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openInventoryCheckDialog(material, "material")}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Calendar className="h-4 w-4 mr-1" />
                                盤點
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 香精庫存表格 */}
      {(itemTypeFilter === "all" || itemTypeFilter === "fragrances") && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              香精庫存
            </CardTitle>
            <CardDescription>管理香精庫存和調整</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">載入中...</p>
              </div>
            ) : filteredFragrances.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                沒有找到符合條件的香精
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>編號</TableHead>
                      <TableHead>名稱</TableHead>
                      <TableHead>當前庫存</TableHead>
                      <TableHead>單位</TableHead>
                      <TableHead>最低庫存</TableHead>
                      <TableHead>最高庫存</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFragrances.map((fragrance) => {
                      const stockStatus = getStockStatus(fragrance)
                      return (
                        <TableRow key={fragrance.id}>
                          <TableCell className="font-mono text-sm">{fragrance.code}</TableCell>
                          <TableCell className="font-medium">{fragrance.name}</TableCell>
                          <TableCell>
                            <span className={`font-semibold ${stockStatus.color} px-2 py-1 rounded-full text-xs`}>
                              {fragrance.currentStock.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>{fragrance.unit}</TableCell>
                          <TableCell>{fragrance.minStock.toLocaleString()}</TableCell>
                          <TableCell>{fragrance.maxStock.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={fragrance.status === 'active' ? 'default' : 'secondary'}>
                              {fragrance.status === 'active' ? '啟用' : '停用'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAdjustmentDialog(fragrance, "fragrance")}
                                className="text-purple-600 hover:text-purple-700"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                調整
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openInventoryCheckDialog(fragrance, "fragrance")}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Calendar className="h-4 w-4 mr-1" />
                                盤點
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 庫存調整對話框 */}
      <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>調整庫存</DialogTitle>
            <DialogDescription>
              調整 {selectedItem?.name} 的庫存數量
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <InventoryAdjustmentForm
              itemId={selectedItem.id}
              itemType={selectedItemType}
              itemCode={selectedItem.code}
              itemName={selectedItem.name}
              currentStock={selectedItem.currentStock}
              onAdjustmentComplete={(newStock, remarks) => {
                handleStockAdjustment(selectedItem.id, selectedItemType, newStock, remarks)
              }}
              onCancel={() => {
                setIsAdjustmentDialogOpen(false)
                setSelectedItem(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 庫存盤點對話框 */}
      <Dialog open={isInventoryCheckDialogOpen} onOpenChange={setIsInventoryCheckDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>庫存盤點</DialogTitle>
            <DialogDescription>
              盤點 {inventoryCheckData?.itemName} 的實際庫存數量
            </DialogDescription>
          </DialogHeader>
          {inventoryCheckData && (
            <div className="space-y-6">
              {/* 當前庫存顯示 */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">物料編號</Label>
                    <div className="mt-1 font-mono text-sm bg-white px-3 py-2 rounded-md border">
                      {inventoryCheckData.itemCode}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">物料名稱</Label>
                    <div className="mt-1 text-sm bg-white px-3 py-2 rounded-md border">
                      {inventoryCheckData.itemName}
                    </div>
                  </div>
                </div>
              </div>

              {/* 盤點數量輸入 */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="newStock" className="text-sm font-medium text-gray-700">
                    盤點後數量
                  </Label>
                  <Input
                    id="newStock"
                    type="number"
                    step="0.01"
                    min="0"
                    value={inventoryCheckData.newStock}
                    onChange={(e) => setInventoryCheckData(prev => prev ? {
                      ...prev,
                      newStock: parseFloat(e.target.value) || 0
                    } : null)}
                    placeholder="輸入盤點後的實際數量"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="remarks" className="text-sm font-medium text-gray-700">
                    盤點備註（可選）
                  </Label>
                  <textarea
                    id="remarks"
                    value={inventoryCheckData.remarks}
                    onChange={(e) => setInventoryCheckData(prev => prev ? {
                      ...prev,
                      remarks: e.target.value
                    } : null)}
                    placeholder="請說明盤點情況..."
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
              </div>

              {/* 庫存變化預覽 */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-green-700">系統庫存</Label>
                    <div className="mt-1 text-2xl font-bold text-green-900">{inventoryCheckData.oldStock}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-green-700">盤點變化</Label>
                    <div className="mt-1 flex items-center gap-2">
                      {inventoryCheckData.newStock > inventoryCheckData.oldStock ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : inventoryCheckData.newStock < inventoryCheckData.oldStock ? (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      ) : (
                        <Minus className="h-5 w-5 text-gray-600" />
                      )}
                      <span className={`text-lg font-bold ${
                        inventoryCheckData.newStock > inventoryCheckData.oldStock ? 'text-green-600' : 
                        inventoryCheckData.newStock < inventoryCheckData.oldStock ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {inventoryCheckData.newStock > inventoryCheckData.oldStock ? '+' : ''}
                        {inventoryCheckData.newStock - inventoryCheckData.oldStock}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-green-700">盤點後庫存</Label>
                    <div className="mt-1 text-2xl font-bold text-green-900">{inventoryCheckData.newStock}</div>
                  </div>
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsInventoryCheckDialogOpen(false)
                    setInventoryCheckData(null)
                  }}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  onClick={handleInventoryCheck}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  確認盤點
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function InventoryPage() {
  return <InventoryPageContent />
}
