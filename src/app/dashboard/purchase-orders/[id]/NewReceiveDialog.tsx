'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useApiForm } from '@/hooks/useApiClient';

interface NewReceiveDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  purchaseOrder: any;
}

export function NewReceiveDialog({ isOpen, onOpenChange, onSuccess, purchaseOrder }: NewReceiveDialogProps) {
  const apiClient = useApiForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});


  // 初始化收貨數量
  React.useEffect(() => {
    if (purchaseOrder?.items) {
      const initialQuantities: Record<string, number> = {};
      purchaseOrder.items.forEach((item: any, index: number) => {
        initialQuantities[index] = Number(item.quantity) || 0;
      });
      setReceivedQuantities(initialQuantities);
    }
  }, [purchaseOrder]);

  const handleQuantityChange = (index: number, value: string) => {
    const numValue = Number(value) || 0;
    setReceivedQuantities(prev => ({
      ...prev,
      [index]: numValue
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 調試日誌
      console.log('📦 採購單項目:', purchaseOrder.items);
      console.log('📦 第一個項目的 itemRef:', purchaseOrder.items[0]?.itemRef);

      const payload = {
        purchaseOrderId: purchaseOrder.id,
        items: purchaseOrder.items.map((item: any, index: number) => {
          // 生成 itemRefPath - 優先使用 itemRef
          let itemRefPath = '';

          // 調試日誌：查看 itemRef 的實際結構
          console.log(`項目 ${index} - itemRef 結構:`, {
            itemRef: item.itemRef,
            hasPath: item.itemRef?.path,
            hasId: item.itemRef?.id,
            hasKey: item.itemRef?._key,
            fullItem: item
          });

          // Firebase DocumentReference 會有 _key 屬性，包含完整路徑
          if (item.itemRef) {
            // 處理 Firebase DocumentReference 的各種可能格式
            if (item.itemRef._key && item.itemRef._key.path && item.itemRef._key.path.segments) {
              // Firestore DocumentReference 結構
              const segments = item.itemRef._key.path.segments;
              itemRefPath = segments.join('/');
              console.log(`使用 _key.path.segments: ${itemRefPath}`);
            } else if (item.itemRef.path) {
              // 標準 path 屬性
              itemRefPath = item.itemRef.path;
              console.log(`使用 path: ${itemRefPath}`);
            } else if (item.itemRef.id) {
              // 只有 id 的情況，根據 unit 判斷類型
              const collection = item.unit ? 'materials' : 'fragrances';
              const itemId = typeof item.itemRef.id === 'string' ? item.itemRef.id : String(item.itemRef.id);
              itemRefPath = `${collection}/${itemId}`;
              console.log(`使用 id: ${itemRefPath}`, { originalId: item.itemRef.id, type: typeof item.itemRef.id });
            }
          }

          // 🔧 修復：如果沒有 itemRefPath，根據類型和代號建構路徑
          if (!itemRefPath) {
            console.error('⚠️ 無法從項目生成 itemRefPath，嘗試使用備用方案:', item);

            // 根據單位判斷是材料還是香精
            // 香精通常沒有單位或單位為 KG，材料有各種單位
            const isFragrance = !item.unit || item.unit === 'KG' || item.unit === 'kg';
            const collection = isFragrance ? 'fragrances' : 'materials';

            // 使用代號作為備用方案（後端會用代號查找實際ID）
            const itemCode = item.code || 'UNKNOWN';
            itemRefPath = `${collection}/${itemCode}`;

            console.warn(`使用備用路徑: ${itemRefPath}`, {
              itemCode,
              collection,
              originalItem: item
            });
            toast.warning(`項目 "${item.name}" 使用代號查找，建議更新採購單以包含正確的物料參考`);
          }

          return {
            itemRefPath,
            code: item.code,
            name: item.name,
            receivedQuantity: receivedQuantities[index] || 0
          };
        })
      };


      const result = await apiClient.call('receivePurchaseOrderItems', payload);

      if (result.success) {
        toast.success("收貨入庫成功，庫存已更新");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error?.message || "入庫操作失敗");
      }
    } catch (error) {
      console.error("入庫操作失敗:", error);
      toast.error("入庫操作失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!purchaseOrder?.items) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            收貨入庫確認
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            請確認以下項目的實際收貨數量，系統將根據您輸入的數量更新庫存。
          </p>

          <div className="space-y-3">
            {purchaseOrder.items.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-600">代號: {item.code}</div>
                  <div className="text-sm text-gray-600">訂購數量: {item.quantity} {item.unit}</div>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor={`quantity-${index}`} className="text-sm">實際收貨:</Label>
                  <Input
                    id={`quantity-${index}`}
                    type="number"
                    min="0"
                    value={receivedQuantities[index] || 0}
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                    className="w-20 text-center"
                  />
                  <span className="text-sm text-gray-600">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            確認入庫
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}