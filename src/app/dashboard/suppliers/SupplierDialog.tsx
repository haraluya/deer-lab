// src/app/dashboard/suppliers/SupplierDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Zod schema for form validation
const formSchema = z.object({
  name: z.string().min(2, { message: '供應商名稱至少需要 2 個字元' }),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// The data structure for a supplier
export interface SupplierData {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: string;
  createdAt?: any;
}

interface SupplierDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSupplierUpdate: () => void; // Callback to refresh the list
  supplierData?: SupplierData | null; // Supplier data for editing, null for adding
}

export function SupplierDialog({
  isOpen,
  onOpenChange,
  onSupplierUpdate,
  supplierData,
}: SupplierDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!supplierData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
    },
  });

  // When the dialog opens or supplierData changes, populate the form
  useEffect(() => {
    if (isOpen && supplierData) {
      form.reset({
        name: supplierData.name || '',
        contactPerson: supplierData.contactPerson || '',
        phone: supplierData.phone || '',
        email: supplierData.email || '',
        address: supplierData.address || '',
      });
    } else if (isOpen && !supplierData) {
      form.reset(); // Reset form for new entry
    }
  }, [isOpen, supplierData, form]);

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    const toastId = toast.loading(isEditMode ? '正在更新供應商...' : '正在新增供應商...');

    try {
      const functions = getFunctions();
      if (isEditMode) {
        // Call updateSupplier Cloud Function
        const updateSupplier = httpsCallable(functions, 'updateSupplier');
        await updateSupplier({ supplierId: supplierData.id, ...values });
        toast.success(`供應商 ${values.name} 的資料已成功更新。`, { id: toastId });
      } else {
        // Call createSupplier Cloud Function
        const createSupplier = httpsCallable(functions, 'createSupplier');
        await createSupplier(values);
        toast.success(`供應商 ${values.name} 已成功建立。`, { id: toastId });
      }
      
      onSupplierUpdate(); // Trigger parent component's refresh callback
      onOpenChange(false); // Close the dialog
    } catch (error) {
      console.error('Error submitting supplier form:', error);
      let errorMessage = isEditMode ? '更新供應商資料時發生錯誤。' : '新增供應商時發生錯誤。';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 shadow-lg rounded-lg" aria-describedby="supplier-dialog-description">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '編輯供應商資料' : '新增供應商'}</DialogTitle>
          <DialogDescription id="supplier-dialog-description">
            {isEditMode ? '修改供應商的詳細聯絡資訊。' : '請填寫新供應商的詳細聯絡資訊。'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>供應商名稱</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：ABC 原料公司" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>聯絡人</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：王經理" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>聯絡電話</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：02-12345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>電子郵件</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：contact@company.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>地址</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：台北市信義區市府路1號" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting} className="w-full mt-6">
              {isSubmitting ? '處理中...' : (isEditMode ? '儲存更新' : '確認新增')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
