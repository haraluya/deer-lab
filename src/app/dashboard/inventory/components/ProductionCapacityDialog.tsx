"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, orderBy, doc, getDoc, DocumentReference } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { Calculator, Package, FlaskConical, CheckCircle, XCircle, AlertTriangle, Plus, Minus } from "lucide-react"
import { findMaterialByCategory } from "@/lib/systemConfig"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Product {
  id: string
  code: string
  name: string
  seriesName?: string
  fragranceName: string
  nicotineMg: number
  seriesRef?: DocumentReference
  currentFragranceRef?: DocumentReference
  fragranceCode?: string
  fragranceFormula?: {
    percentage: number
    pgRatio: number
    vgRatio: number
  }
  specificMaterials?: DocumentReference[]
  specificMaterialNames?: string[]
  specificMaterialCodes?: string[]
  commonMaterials?: DocumentReference[]
  commonMaterialNames?: string[]
  commonMaterialCodes?: string[]
}

interface ProductionPlan {
  productId: string
  productName: string
  productCode: string
  targetQuantity: number
}

interface MaterialRequirement {
  id: string
  type: 'material' | 'fragrance'
  code: string
  name: string
  requiredQuantity: number
  currentStock: number
  unit: string
  shortage: number
  canProduce: boolean
}

interface ProductionCapacityDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function ProductionCapacityDialog({ isOpen, onClose }: ProductionCapacityDialogProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [fragrances, setFragrances] = useState<any[]>([])
  const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([])
  const [requirements, setRequirements] = useState<MaterialRequirement[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [openComboboxes, setOpenComboboxes] = useState<{[key: number]: boolean}>({})
  const [searchTerms, setSearchTerms] = useState<{[key: number]: string}>({})

  // 載入基礎數據
  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  // 過濾產品列表的輔助函數
  const getFilteredProducts = (searchTerm: string) => {
    if (!searchTerm) return products
    
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.seriesName && product.seriesName.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => {
      // 先按系列名稱排序
      const seriesA = a.seriesName || '未指定'
      const seriesB = b.seriesName || '未指定'
      if (seriesA !== seriesB) {
        return seriesA.localeCompare(seriesB, 'zh-TW')
      }
      // 同系列內按產品名稱排序
      return a.name.localeCompare(b.name, 'zh-TW')
    })
  }

  const loadData = async () => {
    setLoading(true)
    try {
      if (!db) throw new Error("Firebase 未初始化")

      // 並行載入所有數據
      const [productsSnapshot, materialsSnapshot, fragrancesSnapshot] = await Promise.all([
        getDocs(query(collection(db, "products"), orderBy("name"))),
        getDocs(query(collection(db, "materials"), orderBy("name"))),
        getDocs(query(collection(db, "fragrances"), orderBy("name")))
      ])

      // 載入產品資料，獲取完整資訊
      const productsList = await Promise.all(productsSnapshot.docs.map(async doc => {
        const data = doc.data()
        
        // 獲取產品系列名稱
        let seriesName = '未指定'
        if (data.seriesRef) {
          try {
            const seriesDoc = await getDoc(data.seriesRef)
            if (seriesDoc.exists()) {
              const seriesData = seriesDoc.data() as any
              seriesName = seriesData.name || '未指定'
            }
          } catch (error) {
            console.error('獲取產品系列失敗:', error)
          }
        }

        // 獲取香精資訊
        let fragranceName = '未指定'
        let fragranceCode = '未指定'
        let fragranceFormula = { percentage: 0, pgRatio: 0, vgRatio: 0 }
        if (data.currentFragranceRef) {
          try {
            const fragranceDoc = await getDoc(data.currentFragranceRef)
            if (fragranceDoc.exists()) {
              const fragranceData = fragranceDoc.data() as any
              fragranceName = fragranceData.name || '未指定'
              fragranceCode = fragranceData.code || '未指定'
              fragranceFormula = {
                percentage: fragranceData?.percentage || 0,
                pgRatio: fragranceData?.pgRatio || 0,
                vgRatio: fragranceData?.vgRatio || 0,
              }
            }
          } catch (error) {
            console.error('獲取香精資訊失敗:', error)
          }
        }

        // 獲取專屬材料名稱和代號
        let specificMaterialNames: string[] = []
        let specificMaterialCodes: string[] = []
        if (data.specificMaterials && data.specificMaterials.length > 0) {
          try {
            const materialDocs = await Promise.all(
              data.specificMaterials.map((ref: DocumentReference) => getDoc(ref))
            )
            materialDocs.forEach(doc => {
              if (doc.exists()) {
                const materialData = doc.data() as any
                specificMaterialNames.push(materialData?.name || '未知材料')
                specificMaterialCodes.push(materialData?.code || doc.id)
              }
            })
          } catch (error) {
            console.error('獲取專屬材料失敗:', error)
          }
        }

        // 獲取通用材料名稱和代號
        let commonMaterialNames: string[] = []
        let commonMaterialCodes: string[] = []
        let commonMaterialRefs: DocumentReference[] = []
        if (data.seriesRef) {
          try {
            const seriesDoc = await getDoc(data.seriesRef)
            if (seriesDoc.exists()) {
              const seriesData = seriesDoc.data() as any
              if (seriesData.commonMaterials && seriesData.commonMaterials.length > 0) {
                commonMaterialRefs = seriesData.commonMaterials
                const materialDocs = await Promise.all(
                  seriesData.commonMaterials.map((ref: DocumentReference) => getDoc(ref))
                )
                materialDocs.forEach(doc => {
                  if (doc.exists()) {
                    const materialData = doc.data() as any
                    commonMaterialNames.push(materialData?.name || '未知材料')
                    commonMaterialCodes.push(materialData?.code || doc.id)
                  }
                })
              }
            }
          } catch (error) {
            console.error('獲取通用材料失敗:', error)
          }
        }

        return {
          id: doc.id,
          name: data.name,
          code: data.code,
          seriesName: seriesName,
          seriesRef: data.seriesRef,
          currentFragranceRef: data.currentFragranceRef,
          fragranceName: fragranceName,
          fragranceCode: fragranceCode,
          fragranceFormula: fragranceFormula,
          nicotineMg: data.nicotineMg || 0,
          specificMaterials: data.specificMaterials || [],
          specificMaterialNames: specificMaterialNames,
          specificMaterialCodes: specificMaterialCodes,
          commonMaterials: commonMaterialRefs,
          commonMaterialNames: commonMaterialNames,
          commonMaterialCodes: commonMaterialCodes
        }
      }))

      const materialsList = materialsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      const fragrancesList = fragrancesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      setProducts(productsList)
      setMaterials(materialsList)
      setFragrances(fragrancesList)
    } catch (error) {
      console.error('載入數據失敗:', error)
      toast.error('載入數據失敗')
    } finally {
      setLoading(false)
    }
  }

  // 新增生產計畫
  const addProductionPlan = () => {
    setProductionPlans(prev => [...prev, {
      productId: '',
      productName: '',
      productCode: '',
      targetQuantity: 0
    }])
  }

  // 更新生產計畫
  const updateProductionPlan = (index: number, field: keyof ProductionPlan, value: string | number) => {
    setProductionPlans(prev => {
      const newPlans = [...prev]
      if (field === 'productId' && typeof value === 'string') {
        const product = products.find(p => p.id === value)
        newPlans[index] = {
          ...newPlans[index],
          productId: value,
          productName: product?.name || '',
          productCode: product?.code || ''
        }
      } else {
        newPlans[index] = { ...newPlans[index], [field]: value }
      }
      return newPlans
    })
  }

  // 移除生產計畫
  const removeProductionPlan = (index: number) => {
    setProductionPlans(prev => prev.filter((_, i) => i !== index))
  }

  // 格式化數值顯示，四捨五入到小數點後三位
  const formatNumber = (value: number) => {
    // 先處理浮點精度問題，四捨五入到小數點後三位
    const rounded = Math.round((value + Number.EPSILON) * 1000) / 1000;
    // 如果是整數則不顯示小數點，否則顯示到第三位並移除末尾的0
    if (rounded % 1 === 0) {
      return rounded.toString();
    } else {
      return parseFloat(rounded.toFixed(3)).toString();
    }
  };

  // 計算物料需求
  const calculateRequirements = () => {
    setCalculating(true)
    
    setTimeout(() => {
      try {
        if (!productionPlans.length || !materials.length || !fragrances.length) {
          console.log('缺少必要資料:', { 
            productionPlansCount: productionPlans.length,
            materialsCount: materials.length,
            fragrancesCount: fragrances.length
          })
          setCalculating(false)
          return
        }

        const materialRequirementsMap = new Map<string, any>()

        // 計算每個生產計畫的物料需求
        productionPlans.forEach(plan => {
          if (!plan.productId || !plan.targetQuantity) return
          
          const product = products.find(p => p.id === plan.productId)
          if (!product) return

          console.log('計算產品物料需求:', { 
            productName: product.name,
            targetQuantity: plan.targetQuantity,
            fragranceFormula: product.fragranceFormula
          })

          // 1. 檢查香精配方資料
          if (!product.fragranceFormula) {
            console.error('錯誤：沒有香精配方資料');
            return;
          }
          
          const { percentage, pgRatio, vgRatio } = product.fragranceFormula;
          
          if (!percentage || percentage <= 0) {
            console.error('錯誤：香精比例為0或無效');
            return;
          }
          
          const fragranceRatios = {
            fragrance: percentage || 0,
            pg: pgRatio || 0,
            vg: vgRatio || 0
          };

          // 2. 核心液體 (香精、PG、VG、尼古丁)
          // 香精 - 從香精集合中查找
          if (product.fragranceName && product.fragranceName !== '未指定' && fragranceRatios.fragrance > 0) {
            const fragranceQuantity = plan.targetQuantity * (fragranceRatios.fragrance / 100)
            
            // 🚨 修復：只使用精確的代號匹配，移除危險的名稱匹配
            const fragranceMaterial = fragrances.find(f => 
              f.code === product.fragranceCode ||
              (product.fragranceCode && f.code.includes(product.fragranceCode))
            )
            
            const currentStock = fragranceMaterial ? (fragranceMaterial.currentStock || 0) : 0
            const hasEnoughStock = currentStock >= fragranceQuantity
            
            const key = fragranceMaterial ? `fragrance-${fragranceMaterial.id}` : `fragrance-${product.fragranceCode}`
            if (materialRequirementsMap.has(key)) {
              const existing = materialRequirementsMap.get(key)
              materialRequirementsMap.set(key, {
                ...existing,
                requiredQuantity: existing.requiredQuantity + fragranceQuantity
              })
            } else {
              materialRequirementsMap.set(key, {
                id: fragranceMaterial ? fragranceMaterial.id : 'fragrance',
                type: 'fragrance',
                code: product.fragranceCode,
                name: product.fragranceName,
                requiredQuantity: fragranceQuantity,
                currentStock: currentStock,
                unit: 'KG',
                shortage: 0,
                canProduce: hasEnoughStock
              })
            }
          }

          // PG (丙二醇)
          const pgMaterial = findMaterialByCategory(materials, 'pg')
          if (pgMaterial && fragranceRatios.pg > 0) {
            const pgQuantity = plan.targetQuantity * (fragranceRatios.pg / 100)
            const key = `material-${pgMaterial.id}`
            if (materialRequirementsMap.has(key)) {
              const existing = materialRequirementsMap.get(key)
              materialRequirementsMap.set(key, {
                ...existing,
                requiredQuantity: existing.requiredQuantity + pgQuantity
              })
            } else {
              materialRequirementsMap.set(key, {
                id: pgMaterial.id,
                type: 'material',
                code: pgMaterial.code,
                name: pgMaterial.name,
                requiredQuantity: pgQuantity,
                currentStock: pgMaterial.currentStock || 0,
                unit: pgMaterial.unit || 'KG',
                shortage: 0,
                canProduce: (pgMaterial.currentStock || 0) >= pgQuantity
              })
            }
          }

          // VG (甘油)
          const vgMaterial = findMaterialByCategory(materials, 'vg')
          if (vgMaterial && fragranceRatios.vg > 0) {
            const vgQuantity = plan.targetQuantity * (fragranceRatios.vg / 100)
            const key = `material-${vgMaterial.id}`
            if (materialRequirementsMap.has(key)) {
              const existing = materialRequirementsMap.get(key)
              materialRequirementsMap.set(key, {
                ...existing,
                requiredQuantity: existing.requiredQuantity + vgQuantity
              })
            } else {
              materialRequirementsMap.set(key, {
                id: vgMaterial.id,
                type: 'material',
                code: vgMaterial.code,
                name: vgMaterial.name,
                requiredQuantity: vgQuantity,
                currentStock: vgMaterial.currentStock || 0,
                unit: vgMaterial.unit || 'KG',
                shortage: 0,
                canProduce: (vgMaterial.currentStock || 0) >= vgQuantity
              })
            }
          }

          // 尼古丁
          const nicotineMaterial = findMaterialByCategory(materials, 'nicotine')
          if (nicotineMaterial && product.nicotineMg && product.nicotineMg > 0) {
            const nicotineQuantity = (plan.targetQuantity * product.nicotineMg) / 250
            const key = `material-${nicotineMaterial.id}`
            if (materialRequirementsMap.has(key)) {
              const existing = materialRequirementsMap.get(key)
              materialRequirementsMap.set(key, {
                ...existing,
                requiredQuantity: existing.requiredQuantity + nicotineQuantity
              })
            } else {
              materialRequirementsMap.set(key, {
                id: nicotineMaterial.id,
                type: 'material',
                code: nicotineMaterial.code,
                name: nicotineMaterial.name,
                requiredQuantity: nicotineQuantity,
                currentStock: nicotineMaterial.currentStock || 0,
                unit: nicotineMaterial.unit || 'KG',
                shortage: 0,
                canProduce: (nicotineMaterial.currentStock || 0) >= nicotineQuantity
              })
            }
          }

          // 3. 其他材料（專屬材料和通用材料）
          // 專屬材料 - 優先使用代號，備用名稱
          const specificMaterialsToProcess = (product.specificMaterialCodes && product.specificMaterialCodes.length > 0)
            ? product.specificMaterialCodes
            : product.specificMaterialNames || []

          if (specificMaterialsToProcess.length > 0) {
            specificMaterialsToProcess.forEach((materialIdentifier, index) => {
              // 優先使用代號匹配，備用名稱匹配
              const material = materials.find(m => {
                if (product.specificMaterialCodes && product.specificMaterialCodes.length > 0) {
                  return m.code === materialIdentifier
                }
                return m.name === materialIdentifier || m.code === materialIdentifier
              })
              if (material) {
                let requiredQuantity = plan.targetQuantity
                const key = `material-${material.id}`
                if (materialRequirementsMap.has(key)) {
                  const existing = materialRequirementsMap.get(key)
                  materialRequirementsMap.set(key, {
                    ...existing,
                    requiredQuantity: existing.requiredQuantity + requiredQuantity
                  })
                } else {
                  materialRequirementsMap.set(key, {
                    id: material.id,
                    type: 'material',
                    code: material.code,
                    name: material.name,
                    requiredQuantity: requiredQuantity,
                    currentStock: material.currentStock || 0,
                    unit: material.unit || '個',
                    shortage: 0,
                    canProduce: (material.currentStock || 0) >= requiredQuantity
                  })
                }
              }
            })
          }

          // 通用材料 - 優先使用代號，備用名稱
          const commonMaterialsToProcess = (product.commonMaterialCodes && product.commonMaterialCodes.length > 0)
            ? product.commonMaterialCodes
            : product.commonMaterialNames || []

          if (commonMaterialsToProcess.length > 0) {
            commonMaterialsToProcess.forEach((materialIdentifier, index) => {
              // 優先使用代號匹配，備用名稱匹配
              const material = materials.find(m => {
                if (product.commonMaterialCodes && product.commonMaterialCodes.length > 0) {
                  return m.code === materialIdentifier
                }
                return m.name === materialIdentifier || m.code === materialIdentifier
              })
              if (material) {
                let requiredQuantity = plan.targetQuantity
                const key = `material-${material.id}`
                if (materialRequirementsMap.has(key)) {
                  const existing = materialRequirementsMap.get(key)
                  materialRequirementsMap.set(key, {
                    ...existing,
                    requiredQuantity: existing.requiredQuantity + requiredQuantity
                  })
                } else {
                  materialRequirementsMap.set(key, {
                    id: material.id,
                    type: 'material',
                    code: material.code,
                    name: material.name,
                    requiredQuantity: requiredQuantity,
                    currentStock: material.currentStock || 0,
                    unit: material.unit || '個',
                    shortage: 0,
                    canProduce: (material.currentStock || 0) >= requiredQuantity
                  })
                }
              }
            })
          }
        })

        // 計算短缺並更新狀態
        const requirementsList = Array.from(materialRequirementsMap.values()).map(req => ({
          ...req,
          shortage: Math.max(0, req.requiredQuantity - req.currentStock),
          canProduce: req.currentStock >= req.requiredQuantity
        }))

        // 排序：香精、PG、VG、尼古丁優先，然後按庫存狀態排序
        requirementsList.sort((a, b) => {
          // 優先級排序
          const getPriority = (item: any) => {
            if (item.type === 'fragrance') return 0
            if (item.name.includes('PG') || item.name.includes('丙二醇')) return 1
            if (item.name.includes('VG') || item.name.includes('甘油')) return 2
            if (item.name.includes('尼古丁') || item.name.includes('丁鹽')) return 3
            return 4
          }
          
          const priorityA = getPriority(a)
          const priorityB = getPriority(b)
          
          if (priorityA !== priorityB) {
            return priorityA - priorityB
          }
          
          // 相同優先級時，庫存不足的排在前面
          if (a.canProduce !== b.canProduce) {
            return a.canProduce ? 1 : -1
          }
          
          return a.name.localeCompare(b.name, 'zh-TW')
        })

        setRequirements(requirementsList)
        console.log('最終物料需求:', requirementsList)
      } catch (error) {
        console.error('計算需求失敗:', error)
        toast.error('計算需求失敗')
      } finally {
        setCalculating(false)
      }
    }, 500)
  }

  const canProduceAll = requirements.length > 0 && requirements.every(req => req.canProduce)
  const totalShortageValue = requirements
    .filter(req => !req.canProduce)
    .reduce((sum, req) => sum + req.shortage, 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <Calculator className="h-5 w-5" />
            生產能力評估工具
          </DialogTitle>
          <DialogDescription>
            選擇多個產品及其目標產量，系統會計算所需物料和香精，並評估是否有足夠庫存進行生產
          </DialogDescription>
        </DialogHeader>

        {/* 使用說明卡片 */}
        <Card className="mb-4 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Calculator className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-blue-800 font-semibold mb-2">💡 使用說明</h4>
                <div className="text-blue-700 text-sm space-y-1">
                  <div>• <strong>新增產品</strong>：點擊「新增產品」按鈕，選擇要生產的產品</div>
                  <div>• <strong>產品搜尋</strong>：可按產品名稱、代碼或系列名稱搜尋</div>
                  <div>• <strong>設定數量</strong>：輸入目標生產數量（瓶數）</div>
                  <div>• <strong>自動計算</strong>：系統會自動計算所需香精、PG、VG、尼古丁及專屬材料需求</div>
                  <div>• <strong>庫存檢查</strong>：綠色表示庫存充足，紅色表示庫存不足，黃色表示警告</div>
                  <div>• <strong>缺料統計</strong>：底部會顯示總共缺少的物料清單和數量</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* 生產計畫區 */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">生產計畫設定</h3>
              <Button onClick={addProductionPlan} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                新增產品
              </Button>
            </div>

            {productionPlans.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <Calculator className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">尚未新增生產計畫</p>
                <p className="text-sm">點擊「新增產品」開始設定生產目標</p>
              </div>
            ) : (
              <div className="space-y-3">
                {productionPlans.map((plan, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <Label>產品選擇</Label>
                      <Popover 
                        open={openComboboxes[index] || false} 
                        onOpenChange={(open) => setOpenComboboxes(prev => ({ ...prev, [index]: open }))}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openComboboxes[index] || false}
                            className="w-full justify-between"
                          >
                            {plan.productId
                              ? products.find((product) => product.id === plan.productId)?.name || "產品未找到"
                              : "選擇產品..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput 
                              placeholder="搜尋產品名稱或系列..." 
                              value={searchTerms[index] || ""}
                              onValueChange={(value) => setSearchTerms(prev => ({ ...prev, [index]: value }))}
                            />
                            <CommandList>
                              <CommandEmpty>找不到相符的產品。</CommandEmpty>
                              <CommandGroup>
                                {getFilteredProducts(searchTerms[index] || "").map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={product.id}
                                    onSelect={(currentValue) => {
                                      updateProductionPlan(index, 'productId', currentValue === plan.productId ? "" : currentValue)
                                      setOpenComboboxes(prev => ({ ...prev, [index]: false }))
                                      setSearchTerms(prev => ({ ...prev, [index]: "" }))
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        plan.productId === product.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">[{product.seriesName || '未指定'}] - {product.name}</span>
                                      <span className="text-xs text-muted-foreground">{product.code}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="w-40">
                      <Label>目標產量 (瓶)</Label>
                      <Input
                        type="number"
                        placeholder="數量"
                        value={plan.targetQuantity || ''}
                        onChange={(e) => updateProductionPlan(index, 'targetQuantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProductionPlan(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {productionPlans.length > 0 && (
              <Button
                onClick={calculateRequirements}
                disabled={calculating}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {calculating ? (
                  <>載入中...</>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    計算物料需求
                  </>
                )}
              </Button>
            )}
          </div>

          {/* 需求分析結果 */}
          {requirements.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">需求分析結果</h3>
                <Badge 
                  variant={canProduceAll ? "default" : "destructive"}
                  className="text-sm px-3 py-1"
                >
                  {canProduceAll ? (
                    <><CheckCircle className="h-4 w-4 mr-1" />可以生產</>
                  ) : (
                    <><XCircle className="h-4 w-4 mr-1" />庫存不足</>
                  )}
                </Badge>
              </div>

              {/* 桌面版表格 */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className={canProduceAll ? "bg-green-50" : "bg-red-50"}>
                      <TableHead className="font-semibold">類型</TableHead>
                      <TableHead className="font-semibold">代碼</TableHead>
                      <TableHead className="font-semibold">名稱</TableHead>
                      <TableHead className="font-semibold text-right">需要數量</TableHead>
                      <TableHead className="font-semibold text-right">當前庫存</TableHead>
                      <TableHead className="font-semibold text-right">短缺數量</TableHead>
                      <TableHead className="font-semibold text-center">狀態</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requirements.map((req) => (
                      <TableRow key={`${req.type}-${req.id}`} className="hover:bg-gray-50">
                        <TableCell>
                          <Badge variant="outline" className={`${
                            req.type === 'material' 
                              ? 'text-blue-600 border-blue-200 bg-blue-50' 
                              : 'text-purple-600 border-purple-200 bg-purple-50'
                          }`}>
                            {req.type === 'material' ? (
                              <><Package className="h-3 w-3 mr-1" />物料</>
                            ) : (
                              <><FlaskConical className="h-3 w-3 mr-1" />香精</>
                            )}
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="font-mono text-sm">{req.code}</TableCell>
                        <TableCell className="font-medium">{req.name}</TableCell>
                        
                        <TableCell className="text-right font-medium text-orange-600">
                          {formatNumber(req.requiredQuantity)} {req.unit}
                        </TableCell>
                        
                        <TableCell className="text-right">
                          {req.currentStock} {req.unit}
                        </TableCell>
                        
                        <TableCell className="text-right">
                          {req.shortage > 0 ? (
                            <span className="text-red-600 font-medium">
                              {req.shortage} {req.unit}
                            </span>
                          ) : (
                            <span className="text-green-600">-</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-center">
                          {req.canProduce ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              充足
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              不足
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 手機版卡片式佈局 */}
              <div className="md:hidden space-y-3">
                {requirements.map((req) => (
                  <Card key={`${req.type}-${req.id}`} className={`border-2 ${
                    req.canProduce 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${
                            req.type === 'material' 
                              ? 'text-blue-600 border-blue-200 bg-blue-50' 
                              : 'text-purple-600 border-purple-200 bg-purple-50'
                          }`}>
                            {req.type === 'material' ? (
                              <><Package className="h-3 w-3 mr-1" />物料</>
                            ) : (
                              <><FlaskConical className="h-3 w-3 mr-1" />香精</>
                            )}
                          </Badge>
                        </div>
                        {req.canProduce ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            充足
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            不足
                          </Badge>
                        )}
                      </div>

                      <div className="mb-3">
                        <div className="font-semibold text-gray-900">{req.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{req.code}</div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-white/70 p-2 rounded-lg text-center">
                          <div className="text-xs text-gray-600 mb-1">需要數量</div>
                          <div className="font-medium text-orange-600">
                            {formatNumber(req.requiredQuantity)} {req.unit}
                          </div>
                        </div>
                        <div className="bg-white/70 p-2 rounded-lg text-center">
                          <div className="text-xs text-gray-600 mb-1">當前庫存</div>
                          <div className="font-medium text-gray-900">
                            {req.currentStock} {req.unit}
                          </div>
                        </div>
                        <div className="bg-white/70 p-2 rounded-lg text-center">
                          <div className="text-xs text-gray-600 mb-1">短缺數量</div>
                          <div className="font-medium">
                            {req.shortage > 0 ? (
                              <span className="text-red-600">
                                {req.shortage} {req.unit}
                              </span>
                            ) : (
                              <span className="text-green-600">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 總結 */}
              <div className={`p-4 rounded-lg border ${
                canProduceAll 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {canProduceAll ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                  <span className="font-semibold">
                    {canProduceAll ? '生產評估：可以生產' : '生產評估：庫存不足'}
                  </span>
                </div>
                <p className="text-sm">
                  {canProduceAll 
                    ? '所有必需的物料和香精庫存充足，可以按計畫進行生產。'
                    : `有 ${requirements.filter(req => !req.canProduce).length} 項物料/香精庫存不足，需要先補貨才能進行生產。`
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}