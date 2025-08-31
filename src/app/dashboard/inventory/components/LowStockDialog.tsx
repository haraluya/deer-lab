"use client"

import { useState, useEffect } from "react"
import { getFunctions, httpsCallable } from "firebase/functions"
import { toast } from "sonner"
import { AlertTriangle, Package, FlaskConical, Loader2, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface LowStockItem {
  id: string
  type: 'material' | 'fragrance'
  code: string
  name: string
  currentStock: number
  minStock: number
  unit: string
  shortage: number
  costPerUnit: number
}

interface LowStockDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function LowStockDialog({ isOpen, onClose }: LowStockDialogProps) {
  const [items, setItems] = useState<LowStockItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadLowStockItems = async () => {
    setLoading(true)
    try {
      const functions = getFunctions()
      const getLowStockItems = httpsCallable(functions, 'getLowStockItems')
      
      const result = await getLowStockItems({})
      const data = result.data as any
      
      if (data.success) {
        setItems(data.items)
      }
    } catch (error) {
      console.error('載入低庫存項目失敗:', error)
      toast.error('載入低庫存項目失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadLowStockItems()
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            低庫存項目清單
          </DialogTitle>
          <div className="flex justify-between items-center">
            <DialogDescription>
              以下項目的庫存已低於或等於安全庫存線，建議及時補貨
            </DialogDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={loadLowStockItems}
              disabled={loading}
              className="ml-4"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              重新整理
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-32 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-green-600 mb-4">
                <Package className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-green-800 mb-2">太棒了！</h3>
              <p className="text-green-600">目前沒有低庫存項目</p>
              <p className="text-sm text-gray-500 mt-1">所有物料和香精庫存都在安全範圍內</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-red-50">
                    <TableHead className="font-semibold">類型</TableHead>
                    <TableHead className="font-semibold">代碼</TableHead>
                    <TableHead className="font-semibold">名稱</TableHead>
                    <TableHead className="font-semibold text-right">當前庫存</TableHead>
                    <TableHead className="font-semibold text-right">安全庫存</TableHead>
                    <TableHead className="font-semibold text-right">短缺數量</TableHead>
                    <TableHead className="font-semibold text-right">單價</TableHead>
                    <TableHead className="font-semibold text-right">補貨成本</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const reorderCost = item.shortage * item.costPerUnit
                    
                    return (
                      <TableRow key={`${item.type}-${item.id}`} className="hover:bg-gray-50">
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`${
                              item.type === 'material' 
                                ? 'text-blue-600 border-blue-200 bg-blue-50' 
                                : 'text-purple-600 border-purple-200 bg-purple-50'
                            }`}
                          >
                            {item.type === 'material' ? (
                              <><Package className="h-3 w-3 mr-1" />物料</>
                            ) : (
                              <><FlaskConical className="h-3 w-3 mr-1" />香精</>
                            )}
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="font-mono text-sm font-medium">
                          {item.code}
                        </TableCell>
                        
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        
                        <TableCell className="text-right">
                          <span className="text-red-600 font-medium">
                            {item.currentStock} {item.unit}
                          </span>
                        </TableCell>
                        
                        <TableCell className="text-right text-gray-600">
                          {item.minStock} {item.unit}
                        </TableCell>
                        
                        <TableCell className="text-right">
                          <Badge variant="destructive" className="font-medium">
                            {item.shortage} {item.unit}
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="text-right text-sm text-gray-600">
                          NT$ {item.costPerUnit.toLocaleString()}
                        </TableCell>
                        
                        <TableCell className="text-right font-medium text-red-600">
                          NT$ {reorderCost.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              
              {/* 統計摘要 */}
              <div className="border-t bg-gray-50 p-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">
                    共 {items.length} 項低庫存項目
                  </span>
                  <span className="font-medium text-red-600">
                    總補貨成本: NT$ {items.reduce((sum, item) => sum + (item.shortage * item.costPerUnit), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}