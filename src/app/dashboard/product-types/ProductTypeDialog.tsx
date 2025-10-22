// src/app/dashboard/product-types/ProductTypeDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApiForm } from '@/hooks/useApiClient';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Layers } from 'lucide-react';
import { ColorPicker, getRandomColor } from '@/components/ui/color-picker';

const formSchema = z.object({
  name: z.string().min(2, { message: '產品類型名稱至少需要 2 個字元' }),
  code: z.string().min(1, { message: '產品類型代碼為必填欄位' }).max(10, { message: '代碼不可超過 10 個字元' }),
  color: z.string().min(1, { message: '請選擇產品類型顏色' }),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export interface ProductTypeData {
  id: string;
  name: string;
  code: string;
  color: string;
  description?: string;
  isActive?: boolean;
}

interface ProductTypeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onTypeUpdate: () => void;
  typeData?: ProductTypeData | null;
}

export function ProductTypeDialog({ isOpen, onOpenChange, onTypeUpdate, typeData }: ProductTypeDialogProps) {
  const apiClient = useApiForm();
  const isEditMode = !!typeData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      color: getRandomColor(),
      description: '',
    },
  });

  useEffect(() => {
    if (isOpen && typeData) {
      form.reset({
        name: typeData.name || '',
        code: typeData.code || '',
        color: typeData.color || getRandomColor(),
        description: typeData.description || '',
      });
    } else if (isOpen && !typeData) {
      form.reset({
        name: '',
        code: '',
        color: getRandomColor(),
        description: '',
      });
    }
  }, [isOpen, typeData, form]);

  async function onSubmit(values: FormData) {
    try {
      if (isEditMode && typeData) {
        const result = await apiClient.call('updateProductType', {
          id: typeData.id,
          name: values.name,
          code: values.code,
          color: values.color,
          description: values.description,
          isActive: true
        });

        if (result.success) {
          toast.success(`產品類型 ${values.name} 已更新。`);
          onTypeUpdate();
          onOpenChange(false);
        } else {
          toast.error(result.error?.message || '更新產品類型發生錯誤');
        }
      } else {
        const result = await apiClient.call('createProductType', {
          name: values.name,
          code: values.code,
          color: values.color,
          description: values.description,
          isActive: true
        });

        if (result.success) {
          toast.success(`產品類型 ${values.name} 已建立。`);
          onTypeUpdate();
          onOpenChange(false);
        } else {
          toast.error(result.error?.message || '建立產品類型發生錯誤');
        }
      }
    } catch (error: any) {
      console.error('產品類型操作錯誤:', error);
      toast.error(error.message || '系統發生錯誤，請稍後再試');
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">
            {isEditMode ? '編輯產品類型' : '新增產品類型'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {isEditMode ? '修改產品類型的基本資訊和顯示顏色' : '建立新的產品類型並設定顯示顏色'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本資訊 */}
            <div className="space-y-6 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 shadow-sm">
              <h3 className="text-xl font-bold flex items-center gap-3 text-indigo-800">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Layers className="h-4 w-4 text-indigo-600" />
                </div>
                基本資訊
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">類型名稱 *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="例如：罐裝油"
                          className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">類型代碼 *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="例如：BOT"
                          className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-500">建議使用 2-5 個英文字母</p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-sm font-semibold text-gray-700">描述</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="選填：簡短描述此產品類型..."
                          className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 顏色選擇 */}
              <div className="mt-4">
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="產品類型顏色 *"
                      />
                      <FormMessage />
                      <p className="text-xs text-gray-500 mt-1">
                        此顏色將用於在系統中區分不同產品類型
                      </p>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={apiClient.loading}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={apiClient.loading}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {apiClient.loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {isEditMode ? '更新中...' : '建立中...'}
                  </>
                ) : (
                  <>
                    {isEditMode ? '更新類型' : '建立類型'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
