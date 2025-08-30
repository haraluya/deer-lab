"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, addDoc, doc, getDoc } from "firebase/firestore"
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
  billOfMaterials: Array<{
    materialId: string
    materialCode: string
    materialName: string
    quantity: number
    unit: string
  }>
  seriesRef?: string // 新增產品系列參考
  currentFragranceRef?: string // 新增香精參考
  fragranceCode?: string // 新增香精代號
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
  const [searchTerm, setSearchTerm] = useState('') // 新增搜尋功能

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
          if (data.currentFragranceRef) {
            try {
              const fragranceDoc = await getDoc(data.currentFragranceRef)
              if (fragranceDoc.exists()) {
                const fragranceData = fragranceDoc.data() as any
                fragranceName = fragranceData.name || '未指定'
                fragranceCode = fragranceData.code || '未指定'
              }
            } catch (error) {
              console.error('獲取香精資訊失敗:', error)
            }
          }

          return {
            id: doc.id,
            name: data.name,
            code: data.code,
            seriesName: seriesName,
            seriesRef: data.seriesRef,
            fragranceRef: data.currentFragranceRef,
            fragranceName: fragranceName,
            fragranceCode: fragranceCode,
            nicotineMg: data.nicotineMg || 0,
            billOfMaterials: data.billOfMaterials || []
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
    if (!selectedProduct) return []

    console.log('計算物料需求:', { selectedProduct, materials, targetQuantity })

    const materialRequirements = []

    // 1. 香精
    if (selectedProduct.fragranceCode && selectedProduct.fragranceCode !== '未指定') {
      const fragranceQuantity = (targetQuantity * 5) / 100 // 5% 香精比例
      materialRequirements.push({
        materialId: 'fragrance',
        materialCode: selectedProduct.fragranceCode,
        materialName: selectedProduct.fragranceName,
        requiredQuantity: fragranceQuantity,
        currentStock: 0,
        unit: 'KG',
        hasEnoughStock: true
      })
    }

    // 2. PG (丙二醇)
    const pgMaterial = materials.find(m => m.name.includes('PG') || m.code.includes('PG'))
    if (pgMaterial) {
      const pgQuantity = (targetQuantity * 70) / 100
      materialRequirements.push({
        materialId: pgMaterial.id,
        materialCode: pgMaterial.code,
        materialName: pgMaterial.name,
        requiredQuantity: pgQuantity,
        currentStock: pgMaterial.currentStock || 0,
        unit: pgMaterial.unit || 'KG',
        hasEnoughStock: (pgMaterial.currentStock || 0) >= pgQuantity
      })
    }

    // 3. VG (甘油)
    const vgMaterial = materials.find(m => m.name.includes('VG') || m.code.includes('VG'))
    if (vgMaterial) {
      const vgQuantity = (targetQuantity * 25) / 100
      materialRequirements.push({
        materialId: vgMaterial.id,
        materialCode: vgMaterial.code,
        materialName: vgMaterial.name,
        requiredQuantity: vgQuantity,
        currentStock: vgMaterial.currentStock || 0,
        unit: vgMaterial.unit || 'KG',
        hasEnoughStock: (vgMaterial.currentStock || 0) >= vgQuantity
      })
    }

    // 4. 尼古丁
    if (selectedProduct.nicotineMg && selectedProduct.nicotineMg > 0) {
      const nicotineMaterial = materials.find(m => 
        m.name.includes('丁鹽') || m.name.includes('尼古丁') || m.code.includes('NIC')
      )
      if (nicotineMaterial) {
        const nicotineQuantity = (targetQuantity * selectedProduct.nicotineMg) / 250
        materialRequirements.push({
          materialId: nicotineMaterial.id,
          materialCode: nicotineMaterial.code,
          materialName: nicotineMaterial.name,
          requiredQuantity: nicotineQuantity,
          currentStock: nicotineMaterial.currentStock || 0,
          unit: nicotineMaterial.unit || 'KG',
          hasEnoughStock: (nicotineMaterial.currentStock || 0) >= nicotineQuantity
        })
      }
    }

    // 5. 產品專屬物料 (如果有)
    const specificMaterials = materials.filter(m => 
      m.name.includes('專用') || 
      m.name.includes('特殊') ||
      m.code.includes('SPEC') ||
      m.name.includes('專屬')
    )
    
    specificMaterials.forEach(material => {
      materialRequirements.push({
        materialId: material.id,
        materialCode: material.code,
        materialName: material.name,
        requiredQuantity: 0, // 預設為0，可手動調整
        currentStock: material.currentStock || 0,
        unit: material.unit || 'KG',
        hasEnoughStock: true
      })
    })

    // 6. 系列通用物料 (瓶蓋、瓶身、標籤等)
    const commonMaterials = materials.filter(m => 
      m.name.includes('瓶蓋') || 
      m.name.includes('瓶身') || 
      m.name.includes('標籤') ||
      m.name.includes('包裝') ||
      m.name.includes('通用') ||
      m.name.includes('蓋子') ||
      m.name.includes('瓶子') ||
      m.name.includes('貼紙')
    )
    
    commonMaterials.forEach(material => {
      materialRequirements.push({
        materialId: material.id,
        materialCode: material.code,
        materialName: material.name,
        requiredQuantity: 0, // 預設為0，可手動調整
        currentStock: material.currentStock || 0,
        unit: material.unit || 'KG',
        hasEnoughStock: true
      })
    })

    console.log('最終物料需求:', materialRequirements)
    return materialRequirements
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
                <div className="space-y-2">
                  {/* 搜尋輸入框 */}
                  <Input
                    placeholder="搜尋產品名稱、代號或系列..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-2"
                  />
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>物料代號</TableHead>
                      <TableHead>物料名稱</TableHead>
                      <TableHead>需求量</TableHead>
                      <TableHead>當前庫存</TableHead>
                      <TableHead>狀態</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialRequirements.map((material, index) => (
                      <TableRow key={index}>
                        <TableCell>{material.materialCode}</TableCell>
                        <TableCell>{material.materialName}</TableCell>
                        <TableCell>{material.requiredQuantity.toFixed(2)}</TableCell>
                        <TableCell>{material.currentStock}</TableCell>
                        <TableCell>
                          {material.hasEnoughStock ? (
                            <Badge variant="default">庫存充足</Badge>
                          ) : (
                            <Badge variant="destructive">庫存不足</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

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
