"use client"

import { useState } from "react"
import { useApiForm } from "@/hooks/useApiClient"
import { invalidateInventoryCache } from "@/hooks/useInventoryCache"
import { invalidateLowStockCache } from "@/hooks/useLowStockCache"
import { invalidateMaterialsCache } from "@/hooks/useMaterialsCache"
import { invalidateFragrancesCache } from "@/hooks/useFragrancesCache"
import { toast } from "sonner"
import { Loader2, Package, FlaskConical, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface InventoryItem {
  id: string
  code: string
  name: string
  currentStock: number
  unit: string
  minStock: number
  maxStock: number
  costPerUnit: number
  category?: string
  series?: string
  type: 'material' | 'fragrance'
}

interface QuickUpdateDialogProps {
  isOpen: boolean
  onClose: () => void
  item: InventoryItem
  onSuccess: () => void
}

export function QuickUpdateDialog({ isOpen, onClose, item, onSuccess }: QuickUpdateDialogProps) {
  const [newStock, setNewStock] = useState(item.currentStock.toString())
  const [remarks, setRemarks] = useState('')
  const apiClient = useApiForm()

  const handleSubmit = async () => {
    const stockValue = parseFloat(newStock)

    if (isNaN(stockValue) || stockValue < 0) {
      toast.error('請輸入有效的庫存數量')
      return
    }

    if (stockValue === item.currentStock) {
      toast.error('新庫存數量與當前相同，無需更新')
      return
    }

    // 調試：檢查參數
    const updateData = {
      type: item.type,
      itemId: item.id,
      newStock: stockValue,
      reason: remarks.trim() || `快速更新${item.type === 'material' ? '物料' : '香精'}庫存`
    };

    console.log('🔧 準備發送的更新參數:', updateData);
    console.log('🔧 item object:', item);

    const result = await apiClient.call('quickUpdateInventory', {
      updates: [updateData]
    })

    if (result.success && result.data) {
      // 處理批量操作結果
      const { summary } = result.data;
      if (summary.successful > 0) {
        // 🚀 庫存更新成功後立即清除所有相關快取
        invalidateInventoryCache();
        invalidateLowStockCache();
        invalidateMaterialsCache();
        invalidateFragrancesCache();
        console.log('🗑️ 庫存更新後已清除總覽快取、低庫存快取、物料列表快取和香精列表快取');

        toast.success('庫存更新成功');
        onSuccess();
        onClose();
      }
      if (summary.failed > 0) {
        toast.error(`${summary.failed} 項更新失敗`);
      }
    } else {
      // 處理API調用失敗
      console.error('API調用失敗:', result.error);
      toast.error(result.error?.message || '庫存更新失敗');
    }
  }

  const quantityChange = parseFloat(newStock) - item.currentStock
  const getChangeColor = () => {
    if (quantityChange > 0) return 'text-green-600'
    if (quantityChange < 0) return 'text-red-600' 
    return 'text-gray-600'
  }

  const getStockWarning = () => {
    const stockValue = parseFloat(newStock)
    if (isNaN(stockValue)) return null
    
    if (stockValue <= item.minStock) {
      return {
        type: 'warning',
        message: '警告：新庫存低於安全庫存！',
        color: 'text-red-600 bg-red-50 border-red-200'
      }
    }
    
    if (stockValue >= item.maxStock) {
      return {
        type: 'info',
        message: '提示：新庫存高於最大庫存',
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
      }
    }
    
    return null
  }

  const stockWarning = getStockWarning()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.type === 'material' ? 
              <Package className="h-5 w-5 text-blue-600" /> :
              <FlaskConical className="h-5 w-5 text-purple-600" />
            }
            快速更新庫存
          </DialogTitle>
          <DialogDescription>
            快速調整 {item.name} 的庫存數量，系統會自動記錄變更
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 項目資訊 */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">項目代碼:</span>
              <span className="font-mono text-sm font-medium">{item.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">項目名稱:</span>
              <span className="text-sm font-medium">{item.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">當前庫存:</span>
              <span className="text-sm font-medium">{item.currentStock} {item.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">安全庫存:</span>
              <span className="text-sm">{item.minStock} {item.unit}</span>
            </div>
          </div>

          {/* 新庫存輸入 */}
          <div className="space-y-2">
            <Label htmlFor="newStock">新庫存數量</Label>
            <div className="flex gap-2">
              <Input
                id="newStock"
                type="number"
                step="0.01"
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center px-3 bg-gray-100 rounded-md text-sm text-gray-600">
                {item.unit}
              </div>
            </div>
            
            {/* 變化量顯示 */}
            {!isNaN(quantityChange) && quantityChange !== 0 && (
              <div className={`text-sm font-medium ${getChangeColor()}`}>
                變化: {quantityChange > 0 ? '+' : ''}{quantityChange} {item.unit}
              </div>
            )}
          </div>

          {/* 庫存警告 */}
          {stockWarning && (
            <div className={`p-3 rounded-lg border flex items-center gap-2 ${stockWarning.color}`}>
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{stockWarning.message}</span>
            </div>
          )}

          {/* 備註 */}
          <div className="space-y-2">
            <Label htmlFor="remarks">備註 (選填)</Label>
            <Textarea
              id="remarks"
              placeholder="輸入更新原因或備註..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={apiClient.loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={apiClient.loading}>
            {apiClient.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            確認更新
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}