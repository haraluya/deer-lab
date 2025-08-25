// src/app/dashboard/purchase-orders/create/page.tsx
'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
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
import { ArrowLeft, Send, Loader2 } from 'lucide-react';

interface FetchedItemData extends DocumentData {
  name: string;
  code: string;
  unit?: string;
  supplierRef?: DocumentReference;
}

interface PurchaseItem {
  id: string;
  name: string;
  code: string;
  supplierId: string;
  supplierName: string;
  unit: string;
  quantity: number;
}

interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
}

type FormData = {
  suppliers: SupplierGroup[];
};

function CreatePurchaseOrderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, reset } = useForm<FormData>({
    defaultValues: { suppliers: [] },
  });

  const { fields } = useFieldArray({ control, name: "suppliers" });

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
        return {
          id: itemDoc.id,
          name: itemData.name,
          code: itemData.code,
          supplierId: supplierId,
          supplierName: supplierName,
          unit: itemData.unit || '',
          quantity: 1,
        };
      }));

      const groups: Record<string, SupplierGroup> = {};
      for (const item of items) {
        if (!groups[item.supplierId]) {
          groups[item.supplierId] = {
            supplierId: item.supplierId,
            supplierName: item.supplierName,
            items: [],
          };
        }
        groups[item.supplierId].items.push(item);
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
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Alert variant="destructive"><AlertTitle>錯誤</AlertTitle><AlertDescription>沒有有效的採購項目。</AlertDescription></Alert>
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> 返回</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-3xl font-bold">建立採購單</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-8">
          {fields.map((supplierField, sIndex) => (
            <Card key={supplierField.id}>
              <CardHeader><CardTitle>{supplierField.supplierName}</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>代號</TableHead><TableHead>名稱</TableHead><TableHead className="w-[150px]">採購數量</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {supplierField.items.map((item, iIndex) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.code}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Controller
                            control={control}
                            name={`suppliers.${sIndex}.items.${iIndex}.quantity`}
                            render={({ field }) => (
                              <div className="flex items-center gap-2">
                                <Input type="number" min="0" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                                <span>{item.unit}</span>
                              </div>
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex justify-end mt-8">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {isSubmitting ? '處理中...' : '送出採購單'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function CreatePurchaseOrderPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <CreatePurchaseOrderPage />
    </Suspense>
  );
}
