// src/app/dashboard/fragrances/FragranceDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, getDocs, DocumentReference, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Zod schema for fragrance form validation
const formSchema = z.object({
  code: z.string().min(1, { message: '香精代號為必填欄位' }),
  name: z.string().min(2, { message: '香精名稱至少需要 2 個字元' }),
  status: z.string({ required_error: '必須選擇一個狀態' }),
  supplierId: z.string().optional(),
  safetyStockLevel: z.coerce.number().min(0).optional(),
  costPerUnit: z.coerce.number().min(0).optional(),
  percentage: z.coerce.number().min(0).max(100, { message: '香精比例不能超過100%' }),
  pgRatio: z.coerce.number().min(0).max(100, { message: 'PG比例不能超過100%' }),
  vgRatio: z.coerce.number().min(0).max(100, { message: 'VG比例不能超過100%' }),
}).refine((data) => {
  const total = (data.percentage || 0) + (data.pgRatio || 0) + (data.vgRatio || 0);
  return total <= 100;
}, {
  message: "香精、PG、VG比例總和不能超過100%",
  path: ["percentage"],
});

type FormData = z.infer<typeof formSchema>;

interface Supplier {
  id: string;
  name: string;
}

export interface FragranceData extends DocumentData {
  id: string;
  code: string;
  name: string;
  status: string;
  supplierRef?: DocumentReference;
  safetyStockLevel?: number;
  costPerUnit?: number;
  percentage?: number;
  pgRatio?: number;
  vgRatio?: number;
  currentStock: number;
}

interface FragranceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onFragranceUpdate: () => void;
  fragranceData?: FragranceData | null;
}

export function FragranceDialog({
  isOpen,
  onOpenChange,
  onFragranceUpdate,
  fragranceData,
}: FragranceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const isEditMode = !!fragranceData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '', name: '', status: 'active', supplierId: '',
      safetyStockLevel: 0, costPerUnit: 0, percentage: 0, pgRatio: 0, vgRatio: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      const fetchSuppliers = async () => {
        try {
          if (!db) {
            throw new Error("Firebase 未初始化")
          }
          const querySnapshot = await getDocs(collection(db, 'suppliers'));
          const suppliersList = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })) as Supplier[];
          setSuppliers(suppliersList);
        } catch (error) {
          toast.error("讀取供應商列表失敗。");
        }
      };
      fetchSuppliers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && fragranceData) {
      form.reset({
        code: fragranceData.code || '',
        name: fragranceData.name || '',
        status: fragranceData.status || 'active',
        supplierId: fragranceData.supplierRef?.id || '',
        safetyStockLevel: fragranceData.safetyStockLevel || 0,
        costPerUnit: fragranceData.costPerUnit || 0,
        percentage: fragranceData.percentage || 0,
        pgRatio: fragranceData.pgRatio || 0,
        vgRatio: fragranceData.vgRatio || 0,
      });
    } else if (isOpen && !fragranceData) {
      form.reset();
    }
  }, [isOpen, fragranceData, form]);

  // 監聽香精比例變化，自動計算PG和VG
  const fragrancePercentage = form.watch("percentage") || 0;

  // 當香精比例變化時，自動更新PG和VG比例
  useEffect(() => {
    if (fragrancePercentage >= 0) {
      const { pgRatio, vgRatio } = calculateRatios(fragrancePercentage);
      form.setValue("pgRatio", pgRatio);
      form.setValue("vgRatio", vgRatio);
    }
  }, [fragrancePercentage, form]);

  // 自動計算PG和VG比例
  const calculateRatios = (fragrancePercentage: number) => {
    let pgRatio = 0;
    let vgRatio = 0;
    
    if (fragrancePercentage <= 60) {
      // 香精+PG補滿60%，VG為40%
      pgRatio = 60 - fragrancePercentage;
      vgRatio = 40;
    } else {
      // 香精超過60%，PG為0，VG補滿
      pgRatio = 0;
      vgRatio = 100 - fragrancePercentage;
    }
    
    return { pgRatio, vgRatio };
  };

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    const toastId = toast.loading(isEditMode ? '正在更新香精...' : '正在新增香精...');
    try {
      const functions = getFunctions();
      
      // 自動計算PG和VG比例
      const { pgRatio, vgRatio } = calculateRatios(values.percentage || 0);
      const updatedValues = {
        ...values,
        pgRatio,
        vgRatio,
      };
      
      if (isEditMode) {
        const updateFragrance = httpsCallable(functions, 'updateFragrance');
        await updateFragrance({ fragranceId: fragranceData.id, ...updatedValues });
        toast.success(`香精 ${values.name} 的資料已更新。`, { id: toastId });
      } else {
        const createFragrance = httpsCallable(functions, 'createFragrance');
        await createFragrance(updatedValues);
        toast.success(`香精 ${values.name} 已成功建立。`, { id: toastId });
      }
      onFragranceUpdate();
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '發生未知錯誤。';
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-900" aria-describedby="fragrance-dialog-description">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '編輯香精資料' : '新增香精'}</DialogTitle>
          <DialogDescription id="fragrance-dialog-description">請填寫香精的詳細資訊。</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
            <FormField control={form.control} name="code" render={({ field }) => ( <FormItem><FormLabel>香精代號</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>香精名稱</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel>狀態</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="選擇狀態" /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">啟用</SelectItem><SelectItem value="inactive">停用</SelectItem><SelectItem value="discontinued">已下架</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="supplierId" render={({ field }) => ( <FormItem><FormLabel>供應商</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="選擇供應商" /></SelectTrigger></FormControl><SelectContent>{suppliers.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="safetyStockLevel" render={({ field }) => ( <FormItem><FormLabel>安全庫存</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="costPerUnit" render={({ field }) => ( <FormItem><FormLabel>單位成本</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="percentage" render={({ field }) => ( <FormItem><FormLabel>香精比例 (%)</FormLabel><FormControl><Input type="number" {...field} placeholder="輸入香精比例，PG和VG將自動計算" /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="pgRatio" render={({ field }) => ( <FormItem><FormLabel>PG 比例 (%)</FormLabel><FormControl><Input type="number" {...field} disabled /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="vgRatio" render={({ field }) => ( <FormItem><FormLabel>VG 比例 (%)</FormLabel><FormControl><Input type="number" {...field} disabled /></FormControl><FormMessage /></FormItem> )} />
            <Button type="submit" disabled={isSubmitting} className="w-full mt-4 col-span-full">
              {isSubmitting ? '處理中...' : (isEditMode ? '儲存更新' : '確認新增')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
