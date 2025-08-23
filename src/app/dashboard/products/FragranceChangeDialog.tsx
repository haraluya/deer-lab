// src/app/dashboard/products/FragranceChangeDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ProductData } from './ProductDialog';
import { OptionType } from '@/components/ui/multi-select';

// 表單的 Zod 驗證 Schema
const formSchema = z.object({
  newFragranceId: z.string({ required_error: '必須選擇一個新的香精' }),
  reason: z.string().min(5, { message: '更換原因至少需要 5 個字元' }),
});

type FormData = z.infer<typeof formSchema>;

interface FragranceChangeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdate: () => void;
  productData: ProductData | null;
  currentFragranceName: string;
}

export function FragranceChangeDialog({ isOpen, onOpenChange, onUpdate, productData, currentFragranceName }: FragranceChangeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fragranceOptions, setFragranceOptions] = useState<OptionType[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { newFragranceId: undefined, reason: '' },
  });

  // 當對話框開啟時，載入所有可用的香精選項
  useEffect(() => {
    if (isOpen) {
      const fetchFragrances = async () => {
        try {
          const q = query(collection(db, 'fragrances'), where('status', '==', 'active'));
          const querySnapshot = await getDocs(q);
          const options = querySnapshot.docs
            .map(doc => ({ value: doc.id, label: doc.data().name }))
            // 過濾掉當前正在使用的香精
            .filter(option => option.value !== productData?.currentFragranceRef?.id);
          setFragranceOptions(options);
        } catch (error) {
          toast.error("讀取香精選項失敗。");
        }
      };
      fetchFragrances();
      // 重置表單
      form.reset({ newFragranceId: undefined, reason: '' });
    }
  }, [isOpen, productData, form]);

  // 表單提交處理
  async function onSubmit(values: FormData) {
    if (!productData) return;

    setIsSubmitting(true);
    const toastId = toast.loading('正在更換香精...');
    try {
      const functions = getFunctions();
      const changeProductFragrance = httpsCallable(functions, 'changeProductFragrance');
      
      await changeProductFragrance({
        productId: productData.id,
        newFragranceId: values.newFragranceId,
        reason: values.reason,
      });

      toast.success(`產品 ${productData.name} 的香精已成功更換。`, { id: toastId });
      onUpdate();
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
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900" aria-describedby="fragrance-change-dialog-description">
        <DialogHeader>
          <DialogTitle>更換產品香精</DialogTitle>
          <DialogDescription id="fragrance-change-dialog-description">
            為產品「{productData?.name}」更換新的香精。此操作將會被記錄。
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm text-muted-foreground">目前香精</p>
          <p className="font-semibold">{currentFragranceName}</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newFragranceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>選擇新香精</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="從可用的香精中選擇..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fragranceOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>更換原因</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="請詳細說明更換原因，例如：配方升級、舊版停產等..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting} className="w-full mt-4">
              {isSubmitting ? '處理中...' : '確認更換'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
