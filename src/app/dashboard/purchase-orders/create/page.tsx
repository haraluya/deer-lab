// src/app/dashboard/purchase-orders/create/page.tsx
'use client';

import { useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, query, where, documentId, DocumentReference, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { useForm, useFieldArray, Controller } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Loader2, Calculator, DollarSign, Package } from 'lucide-react';

interface FetchedItemData extends DocumentData {
  name: string;
  code: string;
  unit?: string;
  costPerUnit?: number;
  supplierRef?: DocumentReference;
}

interface PurchaseItem {
  id: string;
  name: string;
  code: string;
  supplierId: string;
  supplierName: string;
  unit: string;
  costPerUnit: number;
  quantity: number;
  subtotal: number;
}

interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  total: number;
}

type FormData = {
  suppliers: SupplierGroup[];
};

function CreatePurchaseOrderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, reset, watch } = useForm<FormData>({
    defaultValues: { suppliers: [] },
  });

  const { fields } = useFieldArray({ control, name: "suppliers" });
  const watchedSuppliers = watch("suppliers");

  // 計算總計
  const grandTotal = useMemo(() => {
    return watchedSuppliers?.reduce((total, supplier) => total + (supplier.total || 0), 0) || 0;
  }, [watchedSuppliers]);

  const loadItems = useCallback(async (type: string, ids: string[]) => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      const collectionName = type === 'material' ? 'materials' : 'fragrances';
      const q = query(collection(db, collectionName), where(documentId(), 'in', ids));
      const itemsSnapshot = await getDocs(q);

      const items: PurchaseItem[] = await Promise.all(itemsSnapshot.docs.map(async (itemDoc) => {
        const itemData = itemDoc.data() as FetchedItemData;
        let supplierName = '未指定供應商';
        let supplierId = 'unknown';

        if (itemData.supplierRef) {
          supplierId = itemData.supplierRef.id;
          const supplierDoc = await getDoc(itemData.supplierRef);
          if (supplierDoc.exists()) {
            supplierName = supplierDoc.data().name;
          }
        }
        
        const costPerUnit = itemData.costPerUnit || 0;
        const quantity = 1;
        
        return {
          id: itemDoc.id,
          name: itemData.name,
          code: itemData.code,
          supplierId: supplierId,
          supplierName: supplierName,
          unit: itemData.unit || '',
          costPerUnit: costPerUnit,
          quantity: quantity,
          subtotal: costPerUnit * quantity,
        };
      }));

      const groups: Record<string, SupplierGroup> = {};
      for (const item of items) {
        if (!groups[item.supplierId]) {
          groups[item.supplierId] = {
            supplierId: item.supplierId,
            supplierName: item.supplierName,
            items: [],
            total: 0,
          };
        }
        groups[item.supplierId].items.push(item);
        groups[item.supplierId].total += item.subtotal;
      }
      
      reset({ suppliers: Object.values(groups) });

    } catch (error) {
      toast.error("讀取採購項目資料時發生錯誤。");
    } finally {
      setIsLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    const itemType = searchParams.get('type');
    const itemIdsStr = searchParams.get('ids');
    if (itemType && itemIdsStr) {
      loadItems(itemType, itemIdsStr.split(','));
    } else {
      setIsLoading(false);
    }
  }, [searchParams, loadItems]);
  
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    const toastId = toast.loading("正在建立採購單...");
    try {
      const functions = getFunctions();
      const createPurchaseOrders = httpsCallable(functions, 'createPurchaseOrders');
      
      const payload = {
        suppliers: data.suppliers.map(s => ({
          ...s,
          items: s.items.filter(item => Number(item.quantity) > 0)
        })).filter(s => s.items.length > 0)
      };

      if (payload.suppliers.length === 0) {
        toast.info("請至少為一個項目填寫大於 0 的採購數量。", { id: toastId });
        setIsSubmitting(false);
        return;
      }

      await createPurchaseOrders(payload);
      toast.success(`成功建立 ${payload.suppliers.length} 張採購單。`, { id: toastId });
      router.push('/dashboard/purchase-orders');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "建立採購單失敗";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-border rounded-full animate-spin border-t-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">載入中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Alert variant="destructive">
            <AlertTitle>錯誤</AlertTitle>
            <AlertDescription>沒有有效的採購項目。</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> 返回
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      {/* 頁面標題 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">建立採購單</h1>
            <p className="text-muted-foreground mt-2">建立新的採購單，包含詳細的成本計算</p>
          </div>
        </div>
        
        {/* 總計卡片 */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">總計金額</span>
            </div>
            <div className="text-2xl font-bold text-primary mt-1">
              ${grandTotal.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-8">
          {fields.map((supplierField, sIndex) => {
            const supplier = watchedSuppliers?.[sIndex];
            const supplierTotal = supplier?.total || 0;
            
            return (
              <Card key={supplierField.id} className="border-2 border-primary/10">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        {supplierField.supplierName}
                      </CardTitle>
                      <CardDescription>
                        供應商採購項目清單
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-sm">
                      小計: ${supplierTotal.toFixed(2)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">代號</TableHead>
                        <TableHead className="font-semibold">名稱</TableHead>
                        <TableHead className="font-semibold text-right">單價</TableHead>
                        <TableHead className="font-semibold text-center w-[200px]">採購數量</TableHead>
                        <TableHead className="font-semibold text-right">小計</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierField.items.map((item, iIndex) => (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-sm">{item.code}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-muted-foreground">$</span>
                            <span className="font-medium">{item.costPerUnit.toFixed(2)}</span>
                          </TableCell>
                          <TableCell>
                            <Controller
                              control={control}
                              name={`suppliers.${sIndex}.items.${iIndex}.quantity`}
                              render={({ field }) => (
                                <div className="flex items-center gap-2 justify-center">
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    className="w-20 text-center"
                                    {...field} 
                                    onChange={e => {
                                      const value = parseInt(e.target.value, 10) || 0;
                                      field.onChange(value);
                                    }}
                                    onBlur={() => {
                                      // 只在失去焦點時更新小計
                                      const value = field.value || 0;
                                      const newSubtotal = value * item.costPerUnit;
                                      const newSuppliers = [...(watchedSuppliers || [])];
                                      newSuppliers[sIndex].items[iIndex].subtotal = newSubtotal;
                                      newSuppliers[sIndex].total = newSuppliers[sIndex].items.reduce((sum, item) => sum + item.subtotal, 0);
                                      reset({ suppliers: newSuppliers });
                                    }}
                                  />
                                  <span className="text-sm text-muted-foreground min-w-[2rem]">{item.unit}</span>
                                </div>
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-muted-foreground">$</span>
                            <span className="font-medium">
                              {((watchedSuppliers?.[sIndex]?.items[iIndex]?.quantity || 0) * item.costPerUnit).toFixed(2)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* 提交按鈕 */}
        <div className="flex justify-end mt-8">
          <Button type="submit" disabled={isSubmitting} size="lg" className="px-8">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Send className="mr-2 h-5 w-5" />
            )}
            {isSubmitting ? '處理中...' : '送出採購單'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function CreatePurchaseOrderPageWrapper() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-border rounded-full animate-spin border-t-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">載入中...</p>
          </div>
        </div>
      </div>
    }>
      <CreatePurchaseOrderPage />
    </Suspense>
  );
}
