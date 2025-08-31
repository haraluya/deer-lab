'use client'

import { useState, useCallback } from 'react'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useUIStore } from '@/stores/uiStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BatchOperationProgress } from '@/components/GlobalLoadingOverlay'
import { 
  Package, 
  FlaskConical, 
  Play, 
  Square, 
  CheckSquare, 
  X,
  Plus,
  Minus,
  RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'

interface BatchOperationsPanelProps {
  onClose: () => void
}

export function BatchOperationsPanel({ onClose }: BatchOperationsPanelProps) {
  const { 
    batchOperations, 
    selectedItems, 
    getSelectedItems,
    enableBatchMode,
    disableBatchMode,
    addBatchUpdate,
    removeBatchUpdate,
    clearBatchUpdates,
    applyBatchUpdates,
    selectAll,
    selectNone,
    clearSelections
  } = useInventoryStore()
  
  const { addProgressIndicator, updateProgressIndicator, removeProgressIndicator } = useUIStore()
  
  const [batchQuantity, setBatchQuantity] = useState('')
  const [batchReason, setBatchReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const selectedItemsData = getSelectedItems()
  const totalSelectedItems = selectedItemsData.materials.length + selectedItemsData.fragrances.length
  const pendingUpdatesCount = Object.keys(batchOperations.pendingUpdates).length

  // 啟用批量模式
  const handleEnableBatchMode = useCallback(() => {
    enableBatchMode()
    toast.success('已啟用批量操作模式')
  }, [enableBatchMode])

  // 停用批量模式
  const handleDisableBatchMode = useCallback(() => {
    disableBatchMode()
    onClose()
    toast.info('已停用批量操作模式')
  }, [disableBatchMode, onClose])

  // 全選物料
  const handleSelectAllMaterials = () => {
    selectAll('materials')
    toast.success('已選擇所有物料')
  }

  // 全選香精
  const handleSelectAllFragrances = () => {
    selectAll('fragrances')
    toast.success('已選擇所有香精')
  }

  // 清空選擇
  const handleClearSelections = () => {
    selectNone('materials')
    selectNone('fragrances')
    toast.info('已清空選擇')
  }

  // 新增批量更新
  const handleAddBatchUpdate = () => {
    if (!batchQuantity || !batchReason) {
      toast.error('請輸入數量和原因')
      return
    }

    const quantity = parseFloat(batchQuantity)
    if (isNaN(quantity)) {
      toast.error('請輸入有效的數量')
      return
    }

    // 為所有選中的項目添加更新
    const allSelectedItems = [...selectedItemsData.materials, ...selectedItemsData.fragrances]
    allSelectedItems.forEach(item => {
      addBatchUpdate(item.id, quantity, batchReason)
    })

    setBatchQuantity('')
    setBatchReason('')
    toast.success(`已為 ${allSelectedItems.length} 個項目添加批量更新`)
  }

  // 應用批量更新
  const handleApplyBatchUpdates = async () => {
    if (pendingUpdatesCount === 0) {
      toast.warning('沒有待應用的更新')
      return
    }

    setIsProcessing(true)
    const progressId = 'batch-operations'
    
    addProgressIndicator(progressId, {
      isVisible: true,
      progress: 0,
      message: `準備批量更新 ${pendingUpdatesCount} 個項目...`,
      type: 'determinate'
    })

    try {
      const updates = Object.entries(batchOperations.pendingUpdates)
      let completed = 0
      
      for (const [itemId, update] of updates) {
        updateProgressIndicator(progressId, {
          progress: (completed / updates.length) * 100,
          message: `更新項目 ${completed + 1}/${updates.length}...`
        })
        
        // 模擬更新延遲
        await new Promise(resolve => setTimeout(resolve, 200))
        completed++
      }

      await applyBatchUpdates()
      
      updateProgressIndicator(progressId, {
        progress: 100,
        message: '批量更新完成'
      })

      setTimeout(() => {
        removeProgressIndicator(progressId)
      }, 1000)

      toast.success(`成功更新 ${pendingUpdatesCount} 個項目`)
      clearSelections()
      
    } catch (error) {
      updateProgressIndicator(progressId, {
        progress: -1,
        message: '批量更新失敗'
      })
      
      setTimeout(() => {
        removeProgressIndicator(progressId)
      }, 2000)
      
      toast.error('批量更新失敗')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <CheckSquare className="h-5 w-5" />
            批量操作面板
          </CardTitle>
          <Button onClick={handleDisableBatchMode} variant="ghost" size="sm">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 批量模式狀態 */}
        {!batchOperations.isEnabled ? (
          <div className="text-center py-6">
            <div className="mb-4">
              <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-700">批量操作模式</h3>
              <p className="text-gray-500">啟用後可以批量選擇和修改庫存項目</p>
            </div>
            <Button onClick={handleEnableBatchMode} className="bg-purple-600 hover:bg-purple-700">
              <Play className="mr-2 h-4 w-4" />
              啟用批量操作
            </Button>
          </div>
        ) : (
          <>
            {/* 選擇控制 */}
            <div>
              <h4 className="font-medium mb-3">選擇控制</h4>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSelectAllMaterials} variant="outline" size="sm">
                  <Package className="mr-2 h-3 w-3" />
                  全選物料
                </Button>
                <Button onClick={handleSelectAllFragrances} variant="outline" size="sm">
                  <FlaskConical className="mr-2 h-3 w-3" />
                  全選香精
                </Button>
                <Button onClick={handleClearSelections} variant="outline" size="sm">
                  <Square className="mr-2 h-3 w-3" />
                  清空選擇
                </Button>
              </div>
              
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                <span>已選擇: {totalSelectedItems} 個項目</span>
                <span>待更新: {pendingUpdatesCount} 個項目</span>
              </div>
            </div>

            <Separator />

            {/* 批量更新設定 */}
            <div>
              <h4 className="font-medium mb-3">批量更新設定</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">新庫存量</label>
                  <Input
                    type="number"
                    placeholder="輸入新的庫存數量"
                    value={batchQuantity}
                    onChange={(e) => setBatchQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">更新原因</label>
                  <Input
                    placeholder="輸入更新原因"
                    value={batchReason}
                    onChange={(e) => setBatchReason(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={handleAddBatchUpdate}
                  disabled={totalSelectedItems === 0}
                  className="flex-1"
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  為選中項目添加更新
                </Button>
                <Button 
                  onClick={clearBatchUpdates}
                  disabled={pendingUpdatesCount === 0}
                  variant="ghost"
                  size="sm"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* 待更新項目預覽 */}
            {pendingUpdatesCount > 0 && (
              <div>
                <h4 className="font-medium mb-3">待更新項目 ({pendingUpdatesCount})</h4>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {Object.entries(batchOperations.pendingUpdates).map(([itemId, update]) => (
                    <div key={itemId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm font-mono">{itemId}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{update.quantity}</Badge>
                        <span className="text-xs text-gray-500">{update.reason}</span>
                        <Button
                          onClick={() => removeBatchUpdate(itemId)}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 批量操作執行 */}
            <div className="flex gap-2">
              <Button
                onClick={handleApplyBatchUpdates}
                disabled={pendingUpdatesCount === 0 || isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    執行中...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    應用批量更新
                  </>
                )}
              </Button>
              <Button onClick={handleDisableBatchMode} variant="outline">
                取消
              </Button>
            </div>
            
            {/* 進度展示 */}
            {isProcessing && pendingUpdatesCount > 0 && (
              <BatchOperationProgress
                total={pendingUpdatesCount}
                completed={0} // 這裡可以根據實際進度更新
                failed={0}
                currentOperation="正在更新庫存..."
                onCancel={() => setIsProcessing(false)}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default BatchOperationsPanel