"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, addDoc, doc, getDoc, DocumentReference } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { ArrowLeft, Plus, Package, Loader2 } from "lucide-react"

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

  // 過濾產品列表
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.seriesName && product.seriesName.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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
        console.log('載入的物料列表:', materialsList) // 調試日誌
        setMaterials(materialsList)

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
    if (!selectedProduct || !materials.length) return []

    console.log('計算物料需求:', { selectedProduct, materials, targetQuantity })

    const materialRequirementsMap = new Map<string, any>()

    // 1. 使用香精配方比例（如果有的話）
    let fragranceRatios = { fragrance: 0.357, pg: 0.4501, vg: 0.1929 } // 預設比例
    if (selectedProduct.fragranceFormula) {
      const { percentage, pgRatio, vgRatio } = selectedProduct.fragranceFormula
      console.log('香精配方資料:', { percentage, pgRatio, vgRatio })
      if (percentage > 0) {
        fragranceRatios = {
          fragrance: percentage / 100,
          pg: pgRatio / 100,
          vg: vgRatio / 100
        }
      }
    }
    console.log('使用香精比例:', fragranceRatios)

    // 2. 核心液體 (香精、PG、VG、尼古丁) - 使用配方比例
    // 香精 - 總是添加，即使比例為0
    if (selectedProduct.fragranceCode && selectedProduct.fragranceCode !== '未指定') {
      const fragranceQuantity = targetQuantity * fragranceRatios.fragrance
      materialRequirementsMap.set('fragrance', {
        materialId: 'fragrance',
        materialCode: selectedProduct.fragranceCode,
        materialName: selectedProduct.fragranceName,
        requiredQuantity: fragranceQuantity,
        currentStock: 0,
        unit: 'KG',
        hasEnoughStock: true,
        category: 'fragrance',
        ratio: fragranceRatios.fragrance
      })
      console.log('添加香精:', selectedProduct.fragranceName, fragranceQuantity, '比例:', fragranceRatios.fragrance)
    }

    // PG (丙二醇) - 使用配方比例
    const pgMaterial = materials.find(m => m.name.includes('PG丙二醇') || m.name.includes('PG') || m.code.includes('PG'))
    if (pgMaterial) {
      const pgQuantity = targetQuantity * fragranceRatios.pg
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

    // VG (甘油) - 使用配方比例
    const vgMaterial = materials.find(m => m.name.includes('VG甘油') || m.name.includes('VG') || m.code.includes('VG'))
    if (vgMaterial) {
      const vgQuantity = targetQuantity * fragranceRatios.vg
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

    // 尼古丁 - 使用配方比例
    if (selectedProduct.nicotineMg && selectedProduct.nicotineMg > 0) {
      const nicotineMaterial = materials.find(m => m.name.includes('丁鹽') || m.name.includes('尼古丁') || m.code.includes('NIC'))
      if (nicotineMaterial) {
        const nicotineQuantity = (targetQuantity * selectedProduct.nicotineMg) / 250
        materialRequirementsMap.set(nicotineMaterial.id, {
          materialId: nicotineMaterial.id,
          materialCode: nicotineMaterial.code,
          materialName: nicotineMaterial.name,
          requiredQuantity: nicotineQuantity,
          currentStock: nicotineMaterial.currentStock || 0,
          unit: nicotineMaterial.unit || 'KG',
          hasEnoughStock: (nicotineMaterial.currentStock || 0) >= nicotineQuantity,
          category: 'nicotine',
          ratio: selectedProduct.nicotineMg / 250
        })
        console.log('添加尼古丁:', nicotineMaterial.name, nicotineQuantity)
      }
    }

    // 3. 其他材料（專屬材料和通用材料）- 每個產品1個
    // 專屬材料
    console.log('專屬材料名稱:', selectedProduct.specificMaterialNames)
    if (selectedProduct.specificMaterialNames && selectedProduct.specificMaterialNames.length > 0) {
      selectedProduct.specificMaterialNames.forEach(materialName => {
        const material = materials.find(m => m.name === materialName)
        if (material) {
          const requiredQuantity = 1 * targetQuantity // 每個產品1個
          materialRequirementsMap.set(material.id, {
            materialId: material.id,
            materialCode: material.code,
            materialName: material.name,
            requiredQuantity: requiredQuantity,
            currentStock: material.currentStock || 0,
            unit: material.unit || '個',
            hasEnoughStock: (material.currentStock || 0) >= requiredQuantity,
            category: 'specific',
            ratio: 1
          })
          console.log('添加專屬材料:', material.name, requiredQuantity)
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
          const requiredQuantity = 1 * targetQuantity // 每個產品1個
          materialRequirementsMap.set(material.id, {
            materialId: material.id,
            materialCode: material.code,
            materialName: material.name,
            requiredQuantity: requiredQuantity,
            currentStock: material.currentStock || 0,
            unit: material.unit || '個',
            hasEnoughStock: (material.currentStock || 0) >= requiredQuantity,
            category: 'common',
            ratio: 1
          })
          console.log('添加通用材料:', material.name, requiredQuantity)
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
    const insufficientMaterials = materialRequirements.filter(m => !m.hasEnoughStock)

    if (insufficientMaterials.length > 0) {
      toast.error(`以下物料庫存不足：${insufficientMaterials.map(m => m.materialName).join(", ")}`)
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
          materialId: m.materialId,
          materialCode: m.materialCode,
          materialName: m.materialName,
          quantity: m.requiredQuantity,
          unit: m.unit
        })),
        targetQuantity,
        actualQuantity: 0,
        status: "未確認",
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
  const hasInsufficientStock = materialRequirements.some(m => !m.hasEnoughStock)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
        <h1 className="text-2xl font-bold">建立新工單</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側：產品選擇和設定 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>產品選擇</CardTitle>
              <CardDescription>選擇要生產的產品</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                             <div>
                 <Label htmlFor="product">產品</Label>
                 <Select onValueChange={handleProductSelect}>
                   <SelectTrigger>
                     <SelectValue placeholder="選擇要生產的產品" />
                   </SelectTrigger>
                   <SelectContent>
                     {filteredProducts.map((product) => (
                       <SelectItem key={product.id} value={product.id}>
                         <div className="flex flex-col">
                           <span>{product.code} - {product.name}</span>
                           {product.seriesName && (
                             <span className="text-xs text-muted-foreground">{product.seriesName}</span>
                           )}
                         </div>
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>

              {selectedProduct && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">產品資訊</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">產品代號：</span>{selectedProduct.code}</div>
                    <div><span className="font-medium">產品名稱：</span>{selectedProduct.name}</div>
                    <div><span className="font-medium">產品系列：</span>{selectedProduct.seriesName}</div>
                    <div><span className="font-medium">香精：</span>{selectedProduct.fragranceName}</div>
                    <div><span className="font-medium">尼古丁濃度：</span>{selectedProduct.nicotineMg} mg/ml</div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="targetQuantity">目標產量 (KG)</Label>
                <Input
                  type="number"
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(Number(e.target.value))}
                  placeholder="1"
                  min="1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>工單資訊</CardTitle>
              <CardDescription>工單基本資訊</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div><span className="font-medium">工單號碼：</span>{generateWorkOrderCode()}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右側：物料需求分析 */}
        <Card>
          <CardHeader>
            <CardTitle>物料需求分析</CardTitle>
            <CardDescription>
              基於目標產量 {targetQuantity}KG 的物料需求
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedProduct ? (
              <div className="space-y-4">
                                 <div className="space-y-4">
                   {/* 核心液體區域 */}
                   <div>
                     <h4 className="font-semibold text-lg mb-3 text-blue-600 border-b border-blue-200 pb-2">
                       核心液體 (按香精配方比例)
                     </h4>
                     <Table>
                       <TableHeader>
                         <TableRow className="bg-blue-50">
                           <TableHead className="text-blue-700 font-semibold">物料代號</TableHead>
                           <TableHead className="text-blue-700 font-semibold">物料名稱</TableHead>
                           <TableHead className="text-blue-700 font-semibold">需求量 (KG)</TableHead>
                           <TableHead className="text-blue-700 font-semibold">當前庫存</TableHead>
                           <TableHead className="text-blue-700 font-semibold">狀態</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {materialRequirements
                           .filter(m => ['fragrance', 'pg', 'vg', 'nicotine'].includes(m.category))
                           .map((material, index) => (
                             <TableRow key={index} className="hover:bg-blue-50">
                               <TableCell className="font-medium">{material.materialCode}</TableCell>
                               <TableCell className="font-medium">{material.materialName}</TableCell>
                               <TableCell className="font-semibold text-blue-600">
                                 {material.requiredQuantity.toFixed(2)}
                               </TableCell>
                               <TableCell>{material.currentStock}</TableCell>
                               <TableCell>
                                 {material.hasEnoughStock ? (
                                   <Badge variant="default" className="bg-green-100 text-green-800">庫存充足</Badge>
                                 ) : (
                                   <Badge variant="destructive">庫存不足</Badge>
                                 )}
                               </TableCell>
                             </TableRow>
                           ))}
                       </TableBody>
                     </Table>
                   </div>

                   {/* 其他材料區域 */}
                   <div>
                     <h4 className="font-semibold text-lg mb-3 text-gray-600 border-b border-gray-200 pb-2">
                       其他材料 (每個產品1個)
                     </h4>
                     <Table>
                       <TableHeader>
                         <TableRow className="bg-gray-50">
                           <TableHead className="text-gray-700 font-semibold">物料代號</TableHead>
                           <TableHead className="text-gray-700 font-semibold">物料名稱</TableHead>
                           <TableHead className="text-gray-700 font-semibold">需求量 (個)</TableHead>
                           <TableHead className="text-gray-700 font-semibold">當前庫存</TableHead>
                           <TableHead className="text-gray-700 font-semibold">狀態</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {materialRequirements
                           .filter(m => !['fragrance', 'pg', 'vg', 'nicotine'].includes(m.category))
                           .map((material, index) => (
                             <TableRow key={index} className="hover:bg-gray-50">
                               <TableCell className="font-medium">{material.materialCode}</TableCell>
                               <TableCell className="font-medium">{material.materialName}</TableCell>
                               <TableCell className="font-semibold text-gray-600">
                                 {material.requiredQuantity.toFixed(0)}
                               </TableCell>
                               <TableCell>{material.currentStock}</TableCell>
                               <TableCell>
                                 {material.hasEnoughStock ? (
                                   <Badge variant="default" className="bg-green-100 text-green-800">庫存充足</Badge>
                                 ) : (
                                   <Badge variant="destructive">庫存不足</Badge>
                                 )}
                               </TableCell>
                             </TableRow>
                           ))}
                       </TableBody>
                     </Table>
                   </div>
                 </div>

                <Button 
                  onClick={handleCreateWorkOrder}
                  disabled={!selectedProduct || hasInsufficientStock || creating}
                  className="w-full"
                  size="lg"
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      建立中...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      建立工單
                    </>
                  )}
                </Button>
                
                {!selectedProduct && (
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    請先選擇產品
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>請選擇產品以查看物料需求</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
