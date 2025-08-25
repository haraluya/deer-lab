"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, addDoc, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { ArrowLeft, Plus, Package, Calculator } from "lucide-react"

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
  fragranceName: string
  nicotineMg: number
  billOfMaterials: Array<{
    materialId: string
    materialCode: string
    materialName: string
    quantity: number
    unit: string
  }>
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
  const [targetQuantity, setTargetQuantity] = useState(1000)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        if (!db) {
          throw new Error("Firebase 未初始化")
        }
        
        // 載入產品資料
        const productsSnapshot = await getDocs(collection(db, "products"))
        const productsList = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[]
        setProducts(productsList)

        // 載入物料資料
        const materialsSnapshot = await getDocs(collection(db, "materials"))
        const materialsList = materialsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Material[]
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

    return selectedProduct.billOfMaterials.map(bom => {
      const material = materials.find(m => m.id === bom.materialId)
      const requiredQuantity = (bom.quantity / 1000) * targetQuantity // 假設配方是基於1000g
      const currentStock = material?.currentStock || 0
      const shortage = Math.max(0, requiredQuantity - currentStock)

      return {
        ...bom,
        materialName: material?.name || bom.materialName,
        requiredQuantity,
        currentStock,
        shortage,
        hasEnoughStock: currentStock >= requiredQuantity
      }
    })
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
          fragranceName: selectedProduct.fragranceName,
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
        <div className="text-lg">載入中...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
        <h1 className="text-3xl font-bold">建立新工單</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側：產品選擇和基本設定 */}
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
                    <SelectValue placeholder="選擇產品" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.code} - {product.name}
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
                    <div><span className="font-medium">香精：</span>{selectedProduct.fragranceName}</div>
                    <div><span className="font-medium">尼古丁濃度：</span>{selectedProduct.nicotineMg} mg/ml</div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="targetQuantity">目標產量 (g)</Label>
                <Input
                  type="number"
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(Number(e.target.value))}
                  placeholder="1000"
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
            <CardContent className="space-y-4">
              <div>
                <Label>工單號碼</Label>
                <div className="p-3 bg-muted rounded-md font-mono text-sm">
                  {generateWorkOrderCode()}
                </div>
              </div>
              
              <div>
                <Label>建立時間</Label>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {new Date().toLocaleString()}
                </div>
              </div>

              <div>
                <Label>初始狀態</Label>
                <div className="flex gap-2">
                  <Badge variant="outline">未確認</Badge>
                  <Badge variant="outline">未檢驗</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右側：物料需求分析 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                物料需求分析
              </CardTitle>
              <CardDescription>
                基於目標產量 {targetQuantity}g 的物料需求
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
                        <TableHead className="text-right">需求量</TableHead>
                        <TableHead className="text-right">當前庫存</TableHead>
                        <TableHead className="text-right">狀態</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materialRequirements.map((material, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{material.materialCode}</TableCell>
                          <TableCell>{material.materialName}</TableCell>
                          <TableCell className="text-right font-medium">
                            {material.requiredQuantity.toFixed(3)} {material.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            {material.currentStock} {material.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={material.hasEnoughStock ? "default" : "destructive"}>
                              {material.hasEnoughStock ? "庫存充足" : "庫存不足"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {hasInsufficientStock && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-semibold text-red-800 mb-2">⚠️ 庫存不足警告</h4>
                      <p className="text-sm text-red-700">
                        部分物料庫存不足，無法建立工單。請先補充庫存。
                      </p>
                    </div>
                  )}

                  {!hasInsufficientStock && materialRequirements.length > 0 && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">✅ 庫存充足</h4>
                      <p className="text-sm text-green-700">
                        所有物料庫存充足，可以建立工單。
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>請先選擇產品以查看物料需求</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 建立按鈕 */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handleCreateWorkOrder}
                disabled={!selectedProduct || hasInsufficientStock || creating}
                className="w-full"
                size="lg"
              >
                {creating ? (
                  <>
                    <Calculator className="h-4 w-4 mr-2 animate-spin" />
                    建立中...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    建立工單
                  </>
                )}
              </Button>
              
              {!selectedProduct && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  請先選擇產品
                </p>
              )}
              
              {hasInsufficientStock && (
                <p className="text-sm text-red-600 text-center mt-2">
                  部分物料庫存不足，無法建立工單
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
