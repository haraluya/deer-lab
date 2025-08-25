"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { AlertTriangle, Package, Droplets } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface LowStockItem {
  id: string
  name: string
  code: string
  currentStock: number
  safetyStockLevel: number
  unit: string
  type: "material" | "fragrance"
}

export function LowStockNotification() {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const checkLowStock = async () => {
    setIsLoading(true)
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      
      const lowStockList: LowStockItem[] = []

      // 檢查物料庫存
      const materialsQuery = query(
        collection(db, "materials"),
        where("currentStock", "<", "safetyStockLevel")
      )
      const materialsSnapshot = await getDocs(materialsQuery)
      
      materialsSnapshot.forEach(doc => {
        const data = doc.data()
        if (data.currentStock < data.safetyStockLevel) {
          lowStockList.push({
            id: doc.id,
            name: data.name,
            code: data.code,
            currentStock: data.currentStock,
            safetyStockLevel: data.safetyStockLevel,
            unit: data.unit || "",
            type: "material"
          })
        }
      })

      // 檢查香精庫存
      const fragrancesQuery = query(
        collection(db, "fragrances"),
        where("currentStock", "<", "safetyStockLevel")
      )
      const fragrancesSnapshot = await getDocs(fragrancesQuery)
      
      fragrancesSnapshot.forEach(doc => {
        const data = doc.data()
        if (data.currentStock < data.safetyStockLevel) {
          lowStockList.push({
            id: doc.id,
            name: data.name,
            code: data.code,
            currentStock: data.currentStock,
            safetyStockLevel: data.safetyStockLevel,
            unit: data.unit || "",
            type: "fragrance"
          })
        }
      })

      setLowStockItems(lowStockList)

      // 如果有低庫存項目，顯示通知
      if (lowStockList.length > 0) {
        toast.warning(`發現 ${lowStockList.length} 個低庫存項目`, {
          description: "點擊查看詳細資訊",
          action: {
            label: "查看",
            onClick: () => setIsDialogOpen(true)
          }
        })
      }
    } catch (error) {
      console.error("檢查低庫存失敗:", error)
      toast.error("檢查低庫存失敗")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // 頁面載入時檢查一次
    checkLowStock()

    // 每 30 分鐘檢查一次
    const interval = setInterval(checkLowStock, 30 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  if (lowStockItems.length === 0) {
    return null
  }

  return (
    <>
      {/* 通知按鈕 */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="relative"
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        低庫存通知
        <Badge variant="destructive" className="ml-2">
          {lowStockItems.length}
        </Badge>
      </Button>

      {/* 詳細對話框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="low-stock-dialog-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              低庫存通知
            </DialogTitle>
            <DialogDescription id="low-stock-dialog-description">
              以下項目庫存低於安全庫存水平，建議及時補貨
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 統計資訊 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">總計</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{lowStockItems.length}</div>
                  <p className="text-xs text-muted-foreground">低庫存項目</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">物料</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {lowStockItems.filter(item => item.type === "material").length}
                  </div>
                  <p className="text-xs text-muted-foreground">低庫存物料</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">香精</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {lowStockItems.filter(item => item.type === "fragrance").length}
                  </div>
                  <p className="text-xs text-muted-foreground">低庫存香精</p>
                </CardContent>
              </Card>
            </div>

            {/* 低庫存列表 */}
            <div className="space-y-2">
              <h3 className="font-medium">低庫存項目列表</h3>
              <div className="grid gap-2">
                {lowStockItems.map((item) => (
                  <Card key={item.id} className="border-orange-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {item.type === "material" ? (
                            <Package className="h-5 w-5 text-blue-500" />
                          ) : (
                            <Droplets className="h-5 w-5 text-purple-500" />
                          )}
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              代號: {item.code} | 類型: {item.type === "material" ? "物料" : "香精"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-red-600">
                            {item.currentStock} {item.unit}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            安全庫存: {item.safetyStockLevel} {item.unit}
                          </div>
                          <Badge variant="destructive" className="mt-1">
                            庫存不足
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                關閉
              </Button>
              <Button onClick={checkLowStock} disabled={isLoading}>
                {isLoading ? "檢查中..." : "重新檢查"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
