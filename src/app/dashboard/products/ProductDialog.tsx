// src/app/dashboard/products/ProductDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, getDocs, DocumentReference, DocumentData, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, OptionType } from '@/components/ui/multi-select';
import { Package, Tag, FlaskConical } from 'lucide-react';

// 表單的 Zod 驗證 Schema
const formSchema = z.object({
  name: z.string().min(2, { message: '產品名稱至少需要 2 個字元' }),
  seriesId: z.string({ required_error: '必須選擇一個產品系列' }),
  fragranceId: z.string({ required_error: '必須選擇一個香精' }),
  nicotineMg: z.coerce.number().min(0, { message: '尼古丁濃度不能為負數' }).default(0),
  specificMaterialIds: z.array(z.string()).optional().default([]),
  status: z.enum(['active', 'inactive']),
});

type FormData = z.infer<typeof formSchema>;

// 產品資料的介面定義
export interface ProductData extends DocumentData {
  id: string;
  name: string;
  code: string;
  seriesRef: DocumentReference;
  currentFragranceRef: DocumentReference;
  specificMaterials: DocumentReference[];
  nicotineMg: number;
  status: 'active' | 'inactive';
}

// 下拉選單選項的介面
interface SelectOptions {
  series: OptionType[];
  fragrances: OptionType[];
  materials: OptionType[];
}

interface ProductDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProductUpdate: () => void;
  productData?: ProductData | null;
}

export function ProductDialog({ isOpen, onOpenChange, onProductUpdate, productData }: ProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [options, setOptions] = useState<SelectOptions>({ series: [], fragrances: [], materials: [] });
  const isEditMode = !!productData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      seriesId: undefined,
      fragranceId: undefined,
      nicotineMg: 0,
      specificMaterialIds: [],
      status: 'active',
    },
  });

  // 當對話框開啟時，載入所有下拉選單所需的資料
  useEffect(() => {
    if (isOpen) {
      const fetchOptions = async () => {
        try {
          if (!db) {
            throw new Error("Firebase 未初始化")
          }
          // 查詢所有系列、啟用中的香精、啟用中的物料
          const seriesQuery = getDocs(collection(db, 'productSeries'));
          const fragrancesQuery = getDocs(query(collection(db, 'fragrances'), where('status', '==', 'active')));
          const materialsQuery = getDocs(collection(db, 'materials'));

          const [seriesSnapshot, fragrancesSnapshot, materialsSnapshot] = await Promise.all([seriesQuery, fragrancesQuery, materialsQuery]);
          
          setOptions({
            series: seriesSnapshot.docs.map(doc => ({ value: doc.id, label: doc.data().name })),
            fragrances: fragrancesSnapshot.docs.map(doc => ({ value: doc.id, label: doc.data().name })),
            materials: materialsSnapshot.docs.map(doc => ({ value: doc.id, label: doc.data().name })),
          });
        } catch (error) {
          console.error("讀取下拉選單資料失敗:", error);
          toast.error("讀取下拉選單資料失敗。");
        }
      };
      fetchOptions();
    }
  }, [isOpen]);

  // 當處於編輯模式時，用傳入的 productData 填充表單
  useEffect(() => {
    if (isOpen && productData) {
      form.reset({
        name: productData.name || '',
        seriesId: productData.seriesRef?.id || undefined,
        fragranceId: productData.currentFragranceRef?.id || undefined,
        nicotineMg: productData.nicotineMg || 0,
        specificMaterialIds: productData.specificMaterials?.map(ref => ref.id) || [],
        status: productData.status || 'active',
      });
    } else if (isOpen && !productData) {
      form.reset({
        name: '',
        seriesId: undefined,
        fragranceId: undefined,
        nicotineMg: 0,
        specificMaterialIds: [],
        status: 'active',
      });
    }
  }, [isOpen, productData, form]);

  // 表單提交處理
  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    const toastId = toast.loading(isEditMode ? '正在更新產品...' : '正在新增產品...');
    try {
      const functions = getFunctions();
      const payload = { ...values };

      if (isEditMode && productData) {
        const updateProduct = httpsCallable(functions, 'updateProduct');
        await updateProduct({ productId: productData.id, ...payload });
        toast.success(`產品 ${values.name} 已更新。`, { id: toastId });
      } else {
        const createProduct = httpsCallable(functions, 'createProduct');
        await createProduct(payload);
        toast.success(`產品 ${values.name} 已建立。`, { id: toastId });
      }
      onProductUpdate();
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            {isEditMode ? '編輯產品' : '新增產品'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            {isEditMode ? '修改產品詳細資訊' : '建立新的產品資料'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本資料 */}
            <div className="space-y-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
              <h3 className="text-xl font-bold flex items-center gap-3 text-blue-800">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Tag className="h-4 w-4 text-blue-600" />
                </div>
                基本資料
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">產品名稱 *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="例如：茉莉綠茶香精" 
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nicotineMg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">尼古丁濃度 (mg)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0"
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="seriesId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">所屬系列 *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditMode}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="選擇一個產品系列" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {options.series.map(option => (
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">狀態 *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="設定狀態" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">啟用中</SelectItem>
                          <SelectItem value="inactive">已停用</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 配方設定 */}
            <div className="space-y-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
              <h3 className="text-xl font-bold flex items-center gap-3 text-green-800">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <FlaskConical className="h-4 w-4 text-green-600" />
                </div>
                配方設定
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fragranceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">專屬香精 *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                            <SelectValue placeholder="選擇一個香精" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {options.fragrances.map(option => (
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
                  name="specificMaterialIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">專屬材料</FormLabel>
                      <MultiSelect
                        options={options.materials}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="選擇專屬材料..."
                      />
                      <FormMessage />
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
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                取消
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    處理中...
                  </>
                ) : (
                  isEditMode ? '儲存更新' : '確認新增'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
