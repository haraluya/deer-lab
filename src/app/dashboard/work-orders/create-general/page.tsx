"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, addDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { ArrowLeft, Plus, Loader2, Calculator, Target, Zap, CheckCircle, AlertTriangle, Package, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface Material {
  id: string
  code: string
  name: string
  currentStock: number
  unit: string
  type: 'material'
}

interface Fragrance {
  id: string
  code: string
  name: string
  currentStock: number
  unit: string
  type: 'fragrance'
}

type InventoryItem = Material | Fragrance

interface SelectedItem {
  id: string
  code: string
  name: string
  type: 'material' | 'fragrance'
  usedQuantity: number
  unit: string
  currentStock: number
}

export default function CreateGeneralWorkOrderPage() {
  const router = useRouter()
  const [materials, setMaterials] = useState<Material[]>([])
  const [fragrances, setFragrances] = useState<Fragrance[]>([])
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // 工單基本資訊
  const [workItem, setWorkItem] = useState("")
  const [workDescription, setWorkDescription] = useState("")

  // 物料選擇相關
  const [openMaterialSelect, setOpenMaterialSelect] = useState(false)
  const [openFragranceSelect, setOpenFragranceSelect] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        if (!db) {
          throw new Error("Firebase 未初始化")
        }

        // 載入物料資料
        const materialsSnapshot = await getDocs(collection(db, "materials"))
        const materialsList = materialsSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'material' as const,
          ...doc.data()
        })) as Material[]
        setMaterials(materialsList)

        // 載入香精資料
        const fragrancesSnapshot = await getDocs(collection(db, "fragrances"))
        const fragrancesList = fragrancesSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'fragrance' as const,
          ...doc.data()
        })) as Fragrance[]
        setFragrances(fragrancesList)

        console.log('載入的物料列表:', materialsList.length, '個')
        console.log('載入的香精列表:', fragrancesList.length, '個')

      } catch (error) {
        console.error("載入資料失敗:", error)
        toast.error("載入資料失敗")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleAddItem = (item: InventoryItem) => {
    // 檢查是否已經添加
    const exists = selectedItems.find(i => i.id === item.id)
    if (exists) {
      toast.warning(`${item.name} 已在清單中`)
      return
    }

    const newItem: SelectedItem = {
      id: item.id,
      code: item.code,
      name: item.name,
      type: item.type,
      usedQuantity: 0,
      unit: item.unit,
      currentStock: item.currentStock
    }

    setSelectedItems(prev => [...prev, newItem])
    toast.success(`已添加 ${item.name}`)
    setOpenMaterialSelect(false)
    setOpenFragranceSelect(false)
  }

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(i => i.id !== itemId))
    toast.info("已移除物料")
  }

  const handleQuantityChange = (itemId: string, value: string) => {
    const numValue = Math.max(0, parseFloat(value || '0'))
    setSelectedItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, usedQuantity: numValue }
          : item
      )
    )
  }

  const generateWorkOrderCode = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `WO-G-${year}${month}${day}-${random}` // G 代表 General
  }

  const handleCreateWorkOrder = async () => {
    // 驗證必填欄位
    if (!workItem.trim()) {
      toast.error("請輸入工作項目")
      return
    }

    if (!workDescription.trim()) {
      toast.error("請輸入工作描述")
      return
    }

    setCreating(true)
    try {
      const workOrderCode = generateWorkOrderCode()

      const workOrderData = {
        code: workOrderCode,
        orderType: 'general' as const, // 通用工單類型

        // 通用工單專用欄位
        workItem: workItem.trim(),
        workDescription: workDescription.trim(),

        // BOM 表：包含選擇的原料和香精
        billOfMaterials: selectedItems.map(item => ({
          id: item.id,
          name: item.name,
          code: item.code,
          type: item.type,
          quantity: 0, // 通用工單不預設數量，由使用者手動輸入
          unit: item.unit,
          ratio: 0,
          isCalculated: false,
          category: item.type === 'fragrance' ? 'fragrance' : 'common',
          usedQuantity: item.usedQuantity || 0
        })),

        targetQuantity: 0, // 通用工單沒有目標數量
        actualQuantity: 0,
        status: "預報",
        qcStatus: "未檢驗",
        createdAt: new Date(),
        createdByRef: null, // 這裡應該加入當前用戶的參考
        updatedAt: new Date()
      }

      const docRef = await addDoc(collection(db!, "workOrders"), workOrderData)

      toast.success(`通用工單 ${workOrderCode} 建立成功`)
      router.push(`/dashboard/work-orders/${docRef.id}`)
    } catch (error) {
      console.error("建立通用工單失敗:", error)
      toast.error("建立通用工單失敗")
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600 mt-6 font-medium text-lg">載入中...</p>
          <p className="text-slate-500 text-sm mt-2">正在準備工單建立環境</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto py-8 px-4">
        {/* 頁面標題 */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="hover:bg-white/80 backdrop-blur-sm transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
              建立通用工單
            </h1>
            <p className="text-gray-600 mt-2 text-lg font-medium">自由選擇原料和香精進行生產作業</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* 左側：工單基本資訊 */}
          <div className="xl:col-span-1 space-y-6">
            {/* 工單基本資料卡片 */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-blue-200 to-blue-300 text-blue-800 rounded-t-xl">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  工單基本資料
                </CardTitle>
                <CardDescription className="text-blue-700">
                  填寫工作項目和描述
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* 工作項目 */}
                <div>
                  <Label htmlFor="workItem" className="text-sm font-semibold text-gray-700 mb-3 block">
                    工作項目 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="workItem"
                    value={workItem}
                    onChange={(e) => setWorkItem(e.target.value)}
                    placeholder="例如：煙油調配、包裝作業、品檢測試"
                    className="h-12 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-all duration-200 bg-white"
                  />
                </div>

                {/* 工作描述 */}
                <div>
                  <Label htmlFor="workDescription" className="text-sm font-semibold text-gray-700 mb-3 block">
                    工作描述 <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="workDescription"
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    placeholder="詳細描述工作內容、注意事項等..."
                    rows={6}
                    className="border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-all duration-200 bg-white resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 工單資訊卡片 */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-purple-200 to-purple-300 text-purple-800 rounded-t-xl">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Package className="h-5 w-5 text-purple-600" />
                  </div>
                  工單資訊
                </CardTitle>
                <CardDescription className="text-purple-700">
                  工單編號預覽
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-600">工單號碼：</span>
                    <span className="font-bold text-purple-700 text-lg font-mono">{generateWorkOrderCode()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右側：物料選擇 */}
          <div className="xl:col-span-2">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-orange-200 to-orange-300 text-orange-800 rounded-t-xl">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-orange-600" />
                  </div>
                  原料/香精選擇
                </CardTitle>
                <CardDescription className="text-orange-700">
                  選擇需要使用的原料和香精
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* 選擇按鈕區 */}
                  <div className="flex gap-4">
                    {/* 添加原料 */}
                    <Popover open={openMaterialSelect} onOpenChange={setOpenMaterialSelect}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex-1 h-12 bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 hover:border-green-400 text-green-700 font-semibold"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          添加原料
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96 p-0">
                        <Command>
                          <CommandInput placeholder="搜尋原料名稱或代號..." />
                          <CommandEmpty>找不到符合條件的原料。</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {materials.map((material) => (
                              <CommandItem
                                key={material.id}
                                onSelect={() => handleAddItem(material)}
                                className="cursor-pointer"
                              >
                                <div className="flex flex-col flex-1">
                                  <span className="font-medium">{material.name}</span>
                                  <span className="text-xs text-slate-500">
                                    代號：{material.code} | 庫存：{material.currentStock} {material.unit}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* 添加香精 */}
                    <Popover open={openFragranceSelect} onOpenChange={setOpenFragranceSelect}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex-1 h-12 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 hover:border-blue-400 text-blue-700 font-semibold"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          添加香精
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96 p-0">
                        <Command>
                          <CommandInput placeholder="搜尋香精名稱或代號..." />
                          <CommandEmpty>找不到符合條件的香精。</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {fragrances.map((fragrance) => (
                              <CommandItem
                                key={fragrance.id}
                                onSelect={() => handleAddItem(fragrance)}
                                className="cursor-pointer"
                              >
                                <div className="flex flex-col flex-1">
                                  <span className="font-medium">{fragrance.name}</span>
                                  <span className="text-xs text-slate-500">
                                    代號：{fragrance.code} | 庫存：{fragrance.currentStock} {fragrance.unit}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* 已選擇的物料清單 */}
                  {selectedItems.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-lg">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <TableHead className="text-gray-700 font-bold">類型</TableHead>
                            <TableHead className="text-gray-700 font-bold">物料代號</TableHead>
                            <TableHead className="text-gray-700 font-bold">物料名稱</TableHead>
                            <TableHead className="text-gray-700 font-bold">使用數量</TableHead>
                            <TableHead className="text-gray-700 font-bold">當前庫存</TableHead>
                            <TableHead className="text-gray-700 font-bold">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItems.map((item) => (
                            <TableRow key={item.id} className="hover:bg-gray-50/50 transition-all duration-200">
                              <TableCell>
                                <Badge
                                  className={
                                    item.type === 'fragrance'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                      : 'bg-green-100 text-green-800 border border-green-300'
                                  }
                                >
                                  {item.type === 'fragrance' ? '香精' : '原料'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-semibold text-gray-800">{item.code}</TableCell>
                              <TableCell className="font-medium text-gray-700">{item.name}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={item.usedQuantity || ''}
                                  onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                  placeholder="0"
                                  className="w-24 h-9 text-center"
                                />
                                <span className="ml-2 text-sm text-gray-600">{item.unit}</span>
                              </TableCell>
                              <TableCell className="text-gray-600">
                                {item.currentStock} {item.unit}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">尚未選擇任何物料</h3>
                      <p className="text-gray-500">點擊上方按鈕添加原料或香精</p>
                    </div>
                  )}

                  {/* 建立工單按鈕 */}
                  <div className="pt-6">
                    <Button
                      onClick={handleCreateWorkOrder}
                      disabled={creating}
                      className="w-full h-16 text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 hover:from-blue-500 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      size="lg"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                          建立中...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-3 h-6 w-6" />
                          建立通用工單
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
