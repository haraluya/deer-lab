'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, FlaskConical, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useApiClient } from '@/hooks/useApiClient';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { formatStock, formatQuantity } from '@/utils/numberFormat';

interface InventoryAdjustmentFormProps {
  itemId: string;
  itemType: 'material' | 'fragrance';
  itemCode: string;
  itemName: string;
  currentStock: number;
  onAdjustmentComplete: (newStock: number, remarks?: string) => void;
  onCancel: () => void;
}

export function InventoryAdjustmentForm({
  itemId,
  itemType,
  itemCode,
  itemName,
  currentStock,
  onAdjustmentComplete,
  onCancel
}: InventoryAdjustmentFormProps) {
  const { appUser } = useAuth();
  const apiClient = useApiClient();
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase');
  const [quantity, setQuantity] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error('請輸入有效的數量');
      return;
    }

    if (!appUser) {
      toast.error('用戶未認證');
      return;
    }

    setIsSubmitting(true);
    try {
      const quantityNum = parseFloat(quantity);
      const quantityChange = adjustmentType === 'increase' ? quantityNum : -quantityNum;
      const newStock = currentStock + quantityChange;

      if (newStock < 0) {
        toast.error('調整後庫存不能為負數');
        return;
      }

      // 使用統一 API 客戶端進行庫存調整
      const adjustmentData = {
        type: itemType,
        itemId,
        quantity: quantityNum,
        adjustmentType: adjustmentType === 'increase' ? 'add' as const : 'subtract' as const,
        reason: remarks || '手動庫存調整'
      };
      
      console.log('呼叫 adjustInventory 函數，資料:', adjustmentData);
      
      const result = await apiClient.call('adjustInventory', adjustmentData);
      
      if (!result.success) {
        throw new Error(result.error?.message || '庫存調整失敗');
      }

      toast.success('庫存調整成功');
      onAdjustmentComplete(newStock, remarks);
    } catch (error) {
      console.error('庫存調整失敗:', error);
      toast.error('庫存調整失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getItemTypeIcon = () => {
    return itemType === 'material' ? (
      <Package className="h-5 w-5 text-blue-500" />
    ) : (
      <FlaskConical className="h-5 w-5 text-purple-500" />
    );
  };

  const getItemTypeLabel = () => {
    return itemType === 'material' ? '物料' : '香精';
  };

  const getNewStock = () => {
    if (!quantity || parseFloat(quantity) <= 0) return formatStock(currentStock);
    const quantityNum = parseFloat(quantity);
    const change = adjustmentType === 'increase' ? quantityNum : -quantityNum;
    return formatStock(currentStock + change);
  };

  const getNewStockValue = () => {
    if (!quantity || parseFloat(quantity) <= 0) return currentStock;
    const quantityNum = parseFloat(quantity);
    const change = adjustmentType === 'increase' ? quantityNum : -quantityNum;
    return currentStock + change;
  };

  const isStockNegative = getNewStockValue() < 0;

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader>
        <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
          {getItemTypeIcon()}
          手動調整庫存
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 當前庫存顯示 */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">物料類型</Label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-sm">
                    {getItemTypeLabel()}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">物料編號</Label>
                <div className="mt-1 font-mono text-sm bg-white px-3 py-2 rounded-md border">
                  {itemCode}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">物料名稱</Label>
                <div className="mt-1 text-sm bg-white px-3 py-2 rounded-md border">
                  {itemName}
                </div>
              </div>
            </div>
          </div>

          {/* 調整類型選擇 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="adjustmentType" className="text-sm font-medium text-gray-700">
                調整類型
              </Label>
              <Select
                value={adjustmentType}
                onValueChange={(value: 'increase' | 'decrease') => setAdjustmentType(value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      增加庫存
                    </div>
                  </SelectItem>
                  <SelectItem value="decrease">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      減少庫存
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantity" className="text-sm font-medium text-gray-700">
                調整數量
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="輸入數量"
                className="mt-1"
                required
              />
            </div>
          </div>

          {/* 庫存變化預覽 */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-blue-700">當前庫存</Label>
                <div className="mt-1 text-2xl font-bold text-blue-900">{formatStock(currentStock)}</div>
              </div>
              <div>
                <Label className="text-sm font-medium text-blue-700">調整變化</Label>
                <div className="mt-1 flex items-center gap-2">
                  {adjustmentType === 'increase' ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`text-lg font-bold ${
                    adjustmentType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {adjustmentType === 'increase' ? '+' : '-'}{quantity || '0'}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-blue-700">調整後庫存</Label>
                <div className={`mt-1 text-2xl font-bold ${
                  isStockNegative ? 'text-red-600' : 'text-blue-900'
                }`}>
                  {getNewStock()}
                </div>
              </div>
            </div>
            
            {isStockNegative && (
              <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-200">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">警告：調整後庫存將為負數</span>
              </div>
            )}
          </div>

          {/* 備註 */}
          <div>
            <Label htmlFor="remarks" className="text-sm font-medium text-gray-700">
              備註（可選）
            </Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="請說明調整原因..."
              className="mt-1"
              rows={3}
            />
          </div>

          {/* 操作按鈕 */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isStockNegative}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isSubmitting ? '調整中...' : '確認調整'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
