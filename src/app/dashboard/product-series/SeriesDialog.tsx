// src/app/dashboard/product-series/SeriesDialog.tsx
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
import { MultiSelect, OptionType } from '@/components/ui/multi-select'; 

// ... (SeriesDialog 的其餘程式碼保持不變) ...
const formSchema = z.object({
  name: z.string().min(2, { message: '系列名稱至少需要 2 個字元' }),
  code: z.string().min(1, { message: '系列代號為必填欄位' }),
  commonMaterialIds: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

export interface SeriesData extends DocumentData {
  id: string;
  name: string;
  code: string;
  commonMaterials: DocumentReference[];
}

interface SeriesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSeriesUpdate: () => void;
  seriesData?: SeriesData | null;
}

export function SeriesDialog({ isOpen, onOpenChange, onSeriesUpdate, seriesData }: SeriesDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [materialOptions, setMaterialOptions] = useState<OptionType[]>([]);
  const isEditMode = !!seriesData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', code: '', commonMaterialIds: [] },
  });

  useEffect(() => {
    if (isOpen) {
      const fetchMaterials = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'materials'));
          const options = querySnapshot.docs.map(doc => ({
            value: doc.id,
            label: doc.data().name,
          }));
          setMaterialOptions(options);
        } catch (error) {
          toast.error("讀取物料選項失敗。");
        }
      };
      fetchMaterials();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && seriesData) {
      form.reset({
        name: seriesData.name || '',
        code: seriesData.code || '',
        commonMaterialIds: seriesData.commonMaterials.map(ref => ref.id),
      });
    } else if (isOpen && !seriesData) {
      form.reset({ name: '', code: '', commonMaterialIds: [] });
    }
  }, [isOpen, seriesData, form]);

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    const toastId = toast.loading(isEditMode ? '正在更新系列...' : '正在新增系列...');
    try {
      const functions = getFunctions();
      if (isEditMode) {
        const updateProductSeries = httpsCallable(functions, 'updateProductSeries');
        await updateProductSeries({ seriesId: seriesData.id, ...values });
        toast.success(`系列 ${values.name} 已更新。`, { id: toastId });
      } else {
        const createProductSeries = httpsCallable(functions, 'createProductSeries');
        await createProductSeries(values);
        toast.success(`系列 ${values.name} 已建立。`, { id: toastId });
      }
      onSeriesUpdate();
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
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900" aria-describedby="series-dialog-description">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '編輯產品系列' : '新增產品系列'}</DialogTitle>
          <DialogDescription id="series-dialog-description">設定系列的名稱、代號並綁定通用材料。</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>系列名稱</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="code" render={({ field }) => ( <FormItem><FormLabel>系列代號</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField
              control={form.control}
              name="commonMaterialIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>通用材料</FormLabel>
                  <MultiSelect
                    options={materialOptions}
                    selected={field.value || []}
                    onChange={field.onChange}
                    placeholder="選擇通用材料..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting} className="w-full mt-4">
              {isSubmitting ? '處理中...' : (isEditMode ? '儲存更新' : '確認新增')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
