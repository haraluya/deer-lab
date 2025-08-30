"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, addDoc, doc, getDoc, DocumentReference } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { ArrowLeft, Plus, Package, Loader2, Calculator, Target, Zap, CheckCircle, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Product {
  id: string
  code: string
  name: string
  seriesName?: string
  fragranceName: string
  nicotineMg: number
  seriesRef?: DocumentReference // 產品系列參考
  currentFragranceRef?: DocumentReference // 香精參考
  fragranceCode?: string // 香精代號
  fragranceFormula?: {
    percentage: number
    pgRatio: number
    vgRatio: number
  }
  specificMaterials?: DocumentReference[] // 專屬材料參考
  specificMaterialNames?: string[] // 專屬材料名稱
  commonMaterials?: DocumentReference[] // 通用材料參考
  commonMaterialNames?: string[] // 通用材料名稱
}

interface Material {
  id: string
  code: string
  name: string
  currentStock: number
  unit: string
}

export default function CreateWorkOrderPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [targetQuantity, setTargetQuantity] = useState(1) // 改為1 KG
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('') // 搜尋功能

  // 過濾產品列表並按系列排序
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.seriesName && product.seriesName.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => {
    // 先按系列名稱排序
    const seriesA = a.seriesName || '未指定'
    const seriesB = b.seriesName || '未指定'
    if (seriesA !== seriesB) {
      return seriesA.localeCompare(seriesB)
    }
    // 同系列內按產品名稱排序
    return a.name.localeCompare(b.name)
  })

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        if (!db) {
          throw new Error("Firebase 未初始化")
        }
        
        // 載入產品資料
        const productsSnapshot = await getDocs(collection(db, "products"))
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

          // 獲取專屬材料名稱
          let specificMaterialNames: string[] = []
          if (data.specificMaterials && data.specificMaterials.length > 0) {
            try {
              const materialDocs = await Promise.all(
                data.specificMaterials.map((ref: DocumentReference) => getDoc(ref))
              )
              specificMaterialNames = materialDocs
                .filter(doc => doc.exists())
                .map(doc => {
                  const materialData = doc.data() as any
                  return materialData?.name || '未知材料'
                })
            } catch (error) {
              console.error('獲取專屬材料失敗:', error)
            }
          }

          // 獲取通用材料名稱
          let commonMaterialNames: string[] = []
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
                  commonMaterialNames = materialDocs
                    .filter(doc => doc.exists())
                    .map(doc => {
                      const materialData = doc.data() as any
                      return materialData?.name || '未知材料'
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
            commonMaterials: commonMaterialRefs,
            commonMaterialNames: commonMaterialNames
          }
        }))
        setProducts(productsList)

        // 載入物料資料
        const materialsSnapshot = await getDocs(collection(db, "materials"))
        const materialsList = materialsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Material[]
        
        // 載入香精資料
        const fragrancesSnapshot = await getDocs(collection(db, "fragrances"))
        const fragrancesList = fragrancesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Material[]
        
        // 合併物料和香精資料
        const allMaterials = [...materialsList, ...fragrancesList]
        console.log('載入的物料列表:', materialsList.length, '個') // 調試日誌
        console.log('載入的香精列表:', fragrancesList.length, '個') // 調試日誌
        console.log('合併後的總物料列表:', allMaterials.length, '個') // 調試日誌
        setMaterials(allMaterials)

      } catch (error) {
        console.error("載入資料失敗:", error)
        toast.error("載入資料失敗")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId)
    setSelectedProduct(product || null)
  }

  const calculateMaterialRequirements = () => {
    if (!selectedProduct || !materials.length) {
      console.log('缺少必要資料:', { 
        hasSelectedProduct: !!selectedProduct, 
        materialsCount: materials.length,
        selectedProduct: selectedProduct,
        materials: materials
      })
      return []
    }

    console.log('計算物料需求:', { 
      selectedProduct: {
        id: selectedProduct.id,
        name: selectedProduct.name,
        fragranceName: selectedProduct.fragranceName,
        fragranceCode: selectedProduct.fragranceCode,
        specificMaterialNames: selectedProduct.specificMaterialNames,
        commonMaterialNames: selectedProduct.commonMaterialNames
      }, 
      materialsCount: materials.length,
      targetQuantity 
    })

    const materialRequirementsMap = new Map<string, any>()

    // 1. 直接使用香精詳情中的配方比例（避免浮點數精度問題）
    let fragranceRatios = { fragrance: 35.7, pg: 24.3, vg: 40 } // 預設比例
    if (selectedProduct.fragranceFormula) {
      const { percentage, pgRatio, vgRatio } = selectedProduct.fragranceFormula
      console.log('香精配方資料:', { percentage, pgRatio, vgRatio })
      
      // 直接使用香精詳情中的原始比例，避免浮點數精度問題
      if (percentage > 0) {
        // 直接使用原始百分比值，不進行任何計算
        fragranceRatios = {
          fragrance: percentage, // 直接使用香精詳情中的percentage（如35.7）
          pg: pgRatio,          // 直接使用香精詳情中的pgRatio（如24.3）
          vg: vgRatio           // 直接使用香精詳情中的vgRatio（如40）
        }
        
        console.log('直接使用香精詳情中的配方比例（避免浮點數精度問題）:', {
          香精: percentage + '%',
          PG: pgRatio + '%',
          VG: vgRatio + '%',
          總計: (percentage + pgRatio + vgRatio) + '%'
        })
      } else {
        console.log('香精比例為0，使用預設比例')
      }
    } else {
      console.log('沒有香精配方資料，使用預設比例')
    }
    console.log('使用香精比例:', fragranceRatios)

    // 2. 核心液體 (香精、PG、VG、尼古丁) - 總是添加所有核心液體
    // 香精 - 總是添加，並檢查實際庫存
    if (selectedProduct.fragranceName && selectedProduct.fragranceName !== '未指定') {
      const fragranceQuantity = targetQuantity * (fragranceRatios.fragrance / 100) // 35.7% = 0.357
      
      // 查找香精的實際庫存
      const fragranceMaterial = materials.find(m => 
        m.code === selectedProduct.fragranceCode || 
        m.name === selectedProduct.fragranceName ||
        m.name.includes(selectedProduct.fragranceName) ||
        (selectedProduct.fragranceCode && m.code.includes(selectedProduct.fragranceCode))
      )
      
      console.log('香精匹配結果:', {
        fragranceCode: selectedProduct.fragranceCode,
        fragranceName: selectedProduct.fragranceName,
        foundMaterial: fragranceMaterial ? {
          id: fragranceMaterial.id,
          code: fragranceMaterial.code,
          name: fragranceMaterial.name
        } : null,
        allMaterials: materials.map(m => ({ code: m.code, name: m.name }))
      })
      
      const currentStock = fragranceMaterial ? (fragranceMaterial.currentStock || 0) : 0
      const hasEnoughStock = currentStock >= fragranceQuantity
      
      materialRequirementsMap.set('fragrance', {
        materialId: fragranceMaterial ? fragranceMaterial.id : 'fragrance',
        materialCode: selectedProduct.fragranceCode,
        materialName: selectedProduct.fragranceName,
        requiredQuantity: fragranceQuantity,
        currentStock: currentStock,
        unit: 'KG',
        hasEnoughStock: hasEnoughStock,
        category: 'fragrance',
        ratio: fragranceRatios.fragrance
      })
      console.log('添加香精:', selectedProduct.fragranceName, fragranceQuantity, '比例:', fragranceRatios.fragrance, '庫存:', currentStock, '充足:', hasEnoughStock)
    }

    // PG (丙二醇) - 總是添加，使用配方比例
    const pgMaterial = materials.find(m => m.name.includes('PG丙二醇') || m.name.includes('PG') || m.code.includes('PG'))
    if (pgMaterial) {
      const pgQuantity = targetQuantity * (fragranceRatios.pg / 100) // 24.3% = 0.243
      materialRequirementsMap.set(pgMaterial.id, {
        materialId: pgMaterial.id,
        materialCode: pgMaterial.code,
        materialName: pgMaterial.name,
        requiredQuantity: pgQuantity,
        currentStock: pgMaterial.currentStock || 0,
        unit: pgMaterial.unit || 'KG',
        hasEnoughStock: (pgMaterial.currentStock || 0) >= pgQuantity,
        category: 'pg',
        ratio: fragranceRatios.pg
      })
      console.log('添加PG:', pgMaterial.name, pgQuantity, '比例:', fragranceRatios.pg)
    }

    // VG (甘油) - 總是添加，使用配方比例
    const vgMaterial = materials.find(m => m.name.includes('VG甘油') || m.name.includes('VG') || m.code.includes('VG'))
    if (vgMaterial) {
      const vgQuantity = targetQuantity * (fragranceRatios.vg / 100) // 40% = 0.4
      materialRequirementsMap.set(vgMaterial.id, {
        materialId: vgMaterial.id,
        materialCode: vgMaterial.code,
        materialName: vgMaterial.name,
        requiredQuantity: vgQuantity,
        currentStock: vgMaterial.currentStock || 0,
        unit: vgMaterial.unit || 'KG',
        hasEnoughStock: (vgMaterial.currentStock || 0) >= vgQuantity,
        category: 'vg',
        ratio: fragranceRatios.vg
      })
      console.log('添加VG:', vgMaterial.name, vgQuantity, '比例:', fragranceRatios.vg)
    }

    // 尼古丁 - 總是添加，使用產品濃度計算
    const nicotineMaterial = materials.find(m => m.name.includes('丁鹽') || m.name.includes('尼古丁') || m.code.includes('NIC'))
    if (nicotineMaterial) {
      const nicotineQuantity = selectedProduct.nicotineMg && selectedProduct.nicotineMg > 0 
        ? (targetQuantity * selectedProduct.nicotineMg) / 250 
        : 0
      materialRequirementsMap.set(nicotineMaterial.id, {
        materialId: nicotineMaterial.id,
        materialCode: nicotineMaterial.code,
        materialName: nicotineMaterial.name,
        requiredQuantity: nicotineQuantity,
        currentStock: nicotineMaterial.currentStock || 0,
        unit: nicotineMaterial.unit || 'KG',
        hasEnoughStock: (nicotineMaterial.currentStock || 0) >= nicotineQuantity,
        category: 'nicotine',
        ratio: selectedProduct.nicotineMg ? selectedProduct.nicotineMg / 250 : 0
      })
      console.log('添加尼古丁:', nicotineMaterial.name, nicotineQuantity, '濃度:', selectedProduct.nicotineMg)
    }

    // 3. 其他材料（專屬材料和通用材料）- 根據實際需求計算
    // 專屬材料
    console.log('專屬材料名稱:', selectedProduct.specificMaterialNames)
    if (selectedProduct.specificMaterialNames && selectedProduct.specificMaterialNames.length > 0) {
      selectedProduct.specificMaterialNames.forEach(materialName => {
        const material = materials.find(m => m.name === materialName)
        console.log('專屬材料匹配:', {
          materialName,
          foundMaterial: material ? {
            id: material.id,
            code: material.code,
            name: material.name
          } : null
        })
        if (material) {
          // 根據物料類型計算需求量
          let requiredQuantity = 0
          let unit = material.unit || '個'
          
          // 如果是包裝材料，每個產品1個
          if (material.name.includes('包裝') || material.name.includes('盒') || material.name.includes('貼紙') || 
              material.name.includes('底座') || material.name.includes('空倉') || material.name.includes('小塞')) {
            requiredQuantity = targetQuantity
            unit = '個'
          }
          // 如果是其他材料，可能需要不同的計算方式
          else {
            requiredQuantity = targetQuantity
            unit = material.unit || '個'
          }
          
          materialRequirementsMap.set(material.id, {
            materialId: material.id,
            materialCode: material.code,
            materialName: material.name,
            requiredQuantity: requiredQuantity,
            currentStock: material.currentStock || 0,
            unit: unit,
            hasEnoughStock: (material.currentStock || 0) >= requiredQuantity,
            category: 'specific',
            ratio: 1
          })
          console.log('添加專屬材料:', material.name, requiredQuantity, unit)
        } else {
          console.log('找不到專屬材料:', materialName)
        }
      })
    }

    // 通用材料
    console.log('通用材料名稱:', selectedProduct.commonMaterialNames)
    if (selectedProduct.commonMaterialNames && selectedProduct.commonMaterialNames.length > 0) {
      selectedProduct.commonMaterialNames.forEach(materialName => {
        const material = materials.find(m => m.name === materialName)
        if (material) {
          // 根據物料類型計算需求量
          let requiredQuantity = 0
          let unit = material.unit || '個'
          
          // 如果是包裝材料，每個產品1個
          if (material.name.includes('包裝') || material.name.includes('盒') || material.name.includes('貼紙') || 
              material.name.includes('底座') || material.name.includes('空倉') || material.name.includes('小塞')) {
            requiredQuantity = targetQuantity
            unit = '個'
          }
          // 如果是其他材料，可能需要不同的計算方式
          else {
            requiredQuantity = targetQuantity
            unit = material.unit || '個'
          }
          
          materialRequirementsMap.set(material.id, {
            materialId: material.id,
            materialCode: material.code,
            materialName: material.name,
            requiredQuantity: requiredQuantity,
            currentStock: material.currentStock || 0,
            unit: unit,
            hasEnoughStock: (material.currentStock || 0) >= requiredQuantity,
            category: 'common',
            ratio: 1
          })
          console.log('添加通用材料:', material.name, requiredQuantity, unit)
        } else {
          console.log('找不到通用材料:', materialName)
        }
      })
    }

    // 轉換為陣列並排序
    const finalRequirements = Array.from(materialRequirementsMap.values())

    // 排序：香精、PG、VG、尼古丁優先，然後按類別和名稱排序
    finalRequirements.sort((a, b) => {
      const categoryOrder = ['fragrance', 'pg', 'vg', 'nicotine', 'specific', 'common', 'other']
      const categoryA = categoryOrder.indexOf(a.category || 'other')
      const categoryB = categoryOrder.indexOf(b.category || 'other')

      if (categoryA !== categoryB) {
        return categoryA - categoryB
      }
      return (a.materialName || '').localeCompare(b.materialName || '')
    })

    console.log('最終物料需求:', finalRequirements)
    return finalRequirements
  }

  const generateWorkOrderCode = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `WO-${year}${month}${day}-${random}`
  }

  const handleCreateWorkOrder = async () => {
    if (!selectedProduct) {
      toast.error("請選擇產品")
      return
    }

    if (targetQuantity <= 0) {
      toast.error("請輸入有效的目標產量")
      return
    }

    const materialRequirements = calculateMaterialRequirements()
    // 只檢查核心配方物料的庫存
    const insufficientMaterials = materialRequirements.filter(m => 
      ['fragrance', 'pg', 'vg', 'nicotine'].includes(m.category) && !m.hasEnoughStock
    )

    if (insufficientMaterials.length > 0) {
      toast.error(`以下核心物料庫存不足：${insufficientMaterials.map(m => m.materialName).join(", ")}`)
      return
    }

    setCreating(true)
    try {
      const workOrderCode = generateWorkOrderCode()
      
      const workOrderData = {
        code: workOrderCode,
        productRef: doc(db!, "products", selectedProduct.id),
        productSnapshot: {
          code: selectedProduct.code,
          name: selectedProduct.name,
          seriesName: selectedProduct.seriesName,
          fragranceName: selectedProduct.fragranceName,
          fragranceCode: selectedProduct.fragranceCode,
          nicotineMg: selectedProduct.nicotineMg
        },
        billOfMaterials: materialRequirements.map(m => ({
          id: m.materialId,
          name: m.materialName,
          code: m.materialCode,
          type: m.category === 'fragrance' ? 'fragrance' : 'material',
          quantity: ['fragrance', 'pg', 'vg', 'nicotine'].includes(m.category) ? m.requiredQuantity : 0, // 只有核心配方物料才有需求量
          unit: m.unit,
          ratio: m.ratio || 0, // 直接儲存香精詳情中的原始百分比值，避免浮點數精度問題
          isCalculated: true,
          category: m.category,
          usedQuantity: 0 // 所有物料的使用數量預設為0
        })),
        targetQuantity,
        actualQuantity: 0,
        status: "預報",
        qcStatus: "未檢驗",
        createdAt: new Date(),
        createdByRef: null, // 這裡應該加入當前用戶的參考
        updatedAt: new Date()
      }

      const docRef = await addDoc(collection(db!, "workOrders"), workOrderData)
      
      toast.success(`工單 ${workOrderCode} 建立成功`)
      router.push(`/dashboard/work-orders/${docRef.id}`)
    } catch (error) {
      console.error("建立工單失敗:", error)
      toast.error("建立工單失敗")
    } finally {
      setCreating(false)
    }
  }

  const materialRequirements = calculateMaterialRequirements()
  // 只檢查核心配方物料的庫存
  const hasInsufficientStock = materialRequirements.some(m => 
    ['fragrance', 'pg', 'vg', 'nicotine'].includes(m.category) && !m.hasEnoughStock
  )

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
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
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
              建立新工單
            </h1>
            <p className="text-slate-600 mt-2 text-lg">選擇產品並設定生產參數</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* 左側：產品選擇和設定 */}
          <div className="xl:col-span-1 space-y-6">
            {/* 產品選擇卡片 */}
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Package className="h-5 w-5" />
                  </div>
                  產品選擇
                </CardTitle>
                <CardDescription className="text-blue-100">
                  選擇要生產的產品
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label htmlFor="product" className="text-sm font-semibold text-slate-700 mb-3 block">
                    產品
                  </Label>
                  <Select onValueChange={handleProductSelect}>
                    <SelectTrigger className="h-12 border-2 border-slate-200 hover:border-blue-300 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm">
                      <SelectValue placeholder="選擇要生產的產品" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">[{product.seriesName || '未指定'}] - {product.name}</span>
                            <span className="text-xs text-slate-500">{product.code}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 產品資訊 */}
                {selectedProduct && (
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
                    <h4 className="font-semibold mb-4 text-emerald-800 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      產品資訊
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-600">產品系列：</span>
                        <span className="font-semibold text-slate-800">{selectedProduct.seriesName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-600">產品名稱：</span>
                        <span className="font-semibold text-slate-800">{selectedProduct.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-600">產品代號：</span>
                        <span className="font-semibold text-slate-800">{selectedProduct.code}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-600">香精：</span>
                        <span className="font-semibold text-slate-800">{selectedProduct.fragranceName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-600">尼古丁濃度：</span>
                        <span className="font-semibold text-slate-800">{selectedProduct.nicotineMg} mg/ml</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 目標產量 */}
                <div>
                  <Label htmlFor="targetQuantity" className="text-sm font-semibold text-slate-700 mb-3 block">
                    目標產量 (KG)
                  </Label>
                  <Input
                    type="number"
                    value={targetQuantity}
                    onChange={(e) => setTargetQuantity(Number(e.target.value))}
                    placeholder="1"
                    min="1"
                    className="h-12 border-2 border-slate-200 hover:border-blue-300 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 工單資訊卡片 */}
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-700 text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Target className="h-5 w-5" />
                  </div>
                  工單資訊
                </CardTitle>
                <CardDescription className="text-purple-100">
                  工單基本資訊
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-600">工單號碼：</span>
                    <span className="font-bold text-purple-700 text-lg font-mono">{generateWorkOrderCode()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右側：物料需求分析 */}
          <div className="xl:col-span-2">
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-orange-600 to-red-700 text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Calculator className="h-5 w-5" />
                  </div>
                  物料需求分析
                </CardTitle>
                <CardDescription className="text-orange-100">
                  基於目標產量 {targetQuantity}KG 的物料需求
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {selectedProduct ? (
                  <div className="space-y-8">
                    {/* 核心液體區域 */}
                    <div>
                      <h4 className="font-bold text-xl mb-6 text-blue-700 border-b-2 border-blue-200 pb-4 flex items-center gap-3">
                        <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                        <Zap className="h-5 w-5" />
                        核心液體 (按香精配方比例)
                      </h4>
                      <div className="overflow-hidden rounded-xl border border-blue-200 shadow-lg">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gradient-to-r from-blue-600 to-indigo-700">
                              <TableHead className="text-white font-bold">物料代號</TableHead>
                              <TableHead className="text-white font-bold">物料名稱</TableHead>
                              <TableHead className="text-white font-bold">需求量 (KG)</TableHead>
                              <TableHead className="text-white font-bold">當前庫存</TableHead>
                              <TableHead className="text-white font-bold">狀態</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {materialRequirements
                              .filter(m => ['fragrance', 'pg', 'vg', 'nicotine'].includes(m.category))
                              .map((material, index) => (
                                <TableRow key={index} className="hover:bg-blue-50/50 transition-all duration-200">
                                  <TableCell className="font-semibold text-slate-800">{material.materialCode}</TableCell>
                                  <TableCell className="font-medium text-slate-700">{material.materialName}</TableCell>
                                  <TableCell className="font-bold text-blue-600 text-lg">
                                    {material.requiredQuantity.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-slate-600">{material.currentStock}</TableCell>
                                  <TableCell>
                                    {material.hasEnoughStock ? (
                                      <Badge className="bg-green-100 text-green-800 border border-green-300 font-semibold">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        庫存充足
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive" className="font-semibold">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        庫存不足
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* 其他材料區域 */}
                    <div>
                      <h4 className="font-bold text-xl mb-6 text-slate-700 border-b-2 border-slate-200 pb-4 flex items-center gap-3">
                        <div className="w-4 h-4 bg-slate-500 rounded-full"></div>
                        <Package className="h-5 w-5" />
                        其他材料 (手動配置使用數量)
                      </h4>
                      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-lg">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gradient-to-r from-slate-600 to-gray-700">
                              <TableHead className="text-white font-bold">物料代號</TableHead>
                              <TableHead className="text-white font-bold">物料名稱</TableHead>
                              <TableHead className="text-white font-bold">當前庫存</TableHead>
                              <TableHead className="text-white font-bold">狀態</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {materialRequirements
                              .filter(m => !['fragrance', 'pg', 'vg', 'nicotine'].includes(m.category))
                              .map((material, index) => (
                                <TableRow key={index} className="hover:bg-slate-50/50 transition-all duration-200">
                                  <TableCell className="font-semibold text-slate-800">{material.materialCode}</TableCell>
                                  <TableCell className="font-medium text-slate-700">{material.materialName}</TableCell>
                                  <TableCell className="text-slate-600">{material.currentStock}</TableCell>
                                  <TableCell>
                                    <Badge className="bg-blue-100 text-blue-800 border border-blue-300 font-semibold">
                                      <Package className="h-3 w-3 mr-1" />
                                      手動配置
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* 建立工單按鈕 */}
                    <div className="pt-6">
                      <Button 
                        onClick={handleCreateWorkOrder}
                        disabled={!selectedProduct || hasInsufficientStock || creating}
                        className="w-full h-16 text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            建立工單
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center">
                      <Package className="h-16 w-16 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-700 mb-4">請選擇產品</h3>
                    <p className="text-slate-500 text-lg">選擇產品後將顯示詳細的物料需求分析</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
