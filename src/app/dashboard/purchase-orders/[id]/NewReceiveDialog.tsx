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
      const payload = {
        purchaseOrderId: purchaseOrder.id,
        items: purchaseOrder.items.map((item: any, index: number) => {
          // 生成 itemRefPath
          let itemRefPath = '';
          if (item.itemRef && item.itemRef.path) {
            itemRefPath = item.itemRef.path;
          } else if (item.itemRef && item.itemRef.id) {
            itemRefPath = item.unit ? `materials/${item.itemRef.id}` : `fragrances/${item.itemRef.id}`;
          } else {
            itemRefPath = item.unit ? `materials/${item.id}` : `fragrances/${item.id}`;
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