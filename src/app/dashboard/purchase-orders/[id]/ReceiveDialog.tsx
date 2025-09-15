// src/app/dashboard/purchase-orders/[id]/ReceiveDialog.tsx
'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useApiForm } from '@/hooks/useApiClient';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Form } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Package } from 'lucide-react';

// Zod schema for form validation
const formSchema = z.object({
  items: z.array(z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    code: z.string().optional(),
    unit: z.string().optional(),
    itemRef: z.any().optional(), // We'll pass the ref object directly
    quantity: z.coerce.number().min(0, "數量不能為負數").optional(),
    receivedQuantity: z.coerce.number().min(0, "收貨數量不能為負數").default(0),
  })),
});

type FormData = z.infer<typeof formSchema>;

interface ReceiveDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  purchaseOrder: any; // Using 'any' for simplicity, could be strongly typed
}

export function ReceiveDialog({ isOpen, onOpenChange, onSuccess, purchaseOrder }: ReceiveDialogProps) {
  const apiClient = useApiForm();

  // 🔍 調試：記錄對話框狀態
  console.log('🔍 ReceiveDialog 渲染:', {
    isOpen,
    hasPurchaseOrder: !!purchaseOrder,
    purchaseOrderId: purchaseOrder?.id,
    purchaseOrderStatus: purchaseOrder?.status,
    itemsLength: purchaseOrder?.items?.length
  });

  // 🚨 防護：確保 items 是有效的數組
  const safeItems = Array.isArray(purchaseOrder.items) ? purchaseOrder.items : [];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: safeItems.map((item: any) => ({
        ...item,
        receivedQuantity: item.quantity
      })),
    },
  });

  // 🔍 調試：監控表單值變化
  const watchedValues = form.watch();
  console.log('🔍 表單當前值:', watchedValues);

  const { fields } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const onSubmit = async (data: FormData) => {
    console.log("🔍 onSubmit 函數被調用");
    console.log("🔍 表單狀態:", {
      isSubmitting: form.formState.isSubmitting,
      isValid: form.formState.isValid,
      errors: form.formState.errors,
      data: data
    });

    // 防止重複提交 - 檢查更嚴格
    if (form.formState.isSubmitting) {
      console.log("⚠️ 已在提交中，忽略重複提交");
      return;
    }

    // 記錄開始提交
    console.log("📤 開始表單提交流程");

    form.clearErrors();

    try {
      console.log("=== 開始入庫操作 ===");
      console.log("採購單 ID:", purchaseOrder.id);
      console.log("項目數量:", data.items.length);

      const payload = {
        purchaseOrderId: purchaseOrder.id,
        items: data.items.map(item => {
          // 🎯 簡化：直接使用 code 作為 ID，配合後端修復
          let itemRefPath = '';

          if (item.itemRef && item.itemRef.path) {
            itemRefPath = item.itemRef.path;
          } else if (item.code) {
            // 使用 code 作為文檔 ID
            itemRefPath = item.unit ? `materials/${item.code}` : `fragrances/${item.code}`;
          }

          return {
            itemRefPath,
            receivedQuantity: item.receivedQuantity,
            code: item.code,
            name: item.name,
          };
        }),
      };

      console.log("發送 payload:", payload);

      // 🔍 更詳細的調試
      console.log("🔍 準備調用 API:", {
        functionName: 'receivePurchaseOrderItems',
        payload: payload,
        apiClientType: typeof apiClient,
        apiClientMethods: Object.getOwnPropertyNames(apiClient)
      });

      // 使用統一 API 客戶端
      let result;
      try {
        result = await apiClient.call('receivePurchaseOrderItems', payload);
      } catch (apiError) {
        console.error("🚨 API 調用拋出錯誤:", apiError);
        console.error("🚨 錯誤堆疊:", apiError instanceof Error ? apiError.stack : '無堆疊資訊');
        throw apiError;
      }
      console.log("🔍 API 回應:", result);
      console.log("🔍 API 回應詳細:", {
        success: result.success,
        hasData: !!result.data,
        hasError: !!result.error,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
        rawResponse: result.rawResponse
      });

      if (result.success) {
        toast.success("收貨入庫成功，庫存已更新");
        onSuccess();
        onOpenChange(false);
      } else {
        const errorMessage = result.error?.message || "入庫操作失敗，請稍後再試";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("入庫操作失敗:", error);
      const errorMessage = error instanceof Error ? error.message : "入庫操作失敗，請稍後再試";
      toast.error(errorMessage);
    } finally {
      // 確保重置提交狀態
      console.log("🔄 重置表單提交狀態");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby="receive-dialog-description">
        <DialogHeader>
          <DialogTitle>收貨與入庫確認</DialogTitle>
          <DialogDescription id="receive-dialog-description">
            請確認以下採購項目的實際到貨數量。系統將根據您填寫的數量更新庫存。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="max-h-[60vh] overflow-y-auto">
              {/* 桌面版表格 */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>品項名稱</TableHead>
                      <TableHead className="w-[120px]">採購數量</TableHead>
                      <TableHead className="w-[150px]">實際收到數量</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">{field.name} <span className="text-muted-foreground font-mono text-xs">{field.code}</span></TableCell>
                        <TableCell>{field.quantity} {field.unit}</TableCell>
                        <TableCell>
                          <Controller
                            control={form.control}
                            name={`items.${index}.receivedQuantity`}
                            render={({ field: controllerField }) => (
                              <Input type="number" min="0" {...controllerField} />
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 手機版卡片式佈局 */}
              <div className="md:hidden space-y-4">
                {fields.map((field, index) => (
                  <Card key={field.id} className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                          <Package className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{field.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{field.code}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/70 p-3 rounded-lg">
                          <div className="text-xs text-gray-600 mb-2">採購數量</div>
                          <div className="font-semibold text-amber-600">
                            {field.quantity} {field.unit}
                          </div>
                        </div>
                        
                        <div className="bg-white/70 p-3 rounded-lg">
                          <div className="text-xs text-gray-600 mb-2">實際收到數量</div>
                          <Controller
                            control={form.control}
                            name={`items.${index}.receivedQuantity`}
                            render={({ field: controllerField }) => (
                              <Input 
                                type="number" 
                                min="0" 
                                {...controllerField} 
                                className="h-10 text-lg font-semibold text-center border-amber-200 focus:border-amber-500"
                              />
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                onClick={() => {
                  console.log("🔍 確認入庫按鈕被點擊");
                  console.log("🔍 表單是否有效:", form.formState.isValid);
                  console.log("🔍 表單錯誤:", form.formState.errors);
                }}
              >
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                確認入庫
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
