// src/app/dashboard/product-series/SeriesDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApiClient } from '@/hooks/useApiClient';
import { collection, getDocs, DocumentReference, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelect, OptionType } from '@/components/ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Tag } from 'lucide-react'; 

const formSchema = z.object({
  name: z.string().min(2, { message: '系列名稱至少需要 2 個字元' }),
  code: z.string().min(1, { message: '系列代號為必填欄位' }),
  productType: z.string().min(1, { message: '產品類型為必填欄位' }),
  commonMaterialIds: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

export interface SeriesData extends DocumentData {
  id: string;
  name: string;
  code: string;
  typeCode?: string;
  productType: string;
  commonMaterials: DocumentReference[];
}

interface SeriesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSeriesUpdate: () => void;
  seriesData?: SeriesData | null;
}

const PRODUCT_TYPES = [
  { value: '罐裝油(BOT)', label: '罐裝油(BOT)' },
  { value: '一代棉芯煙彈(OMP)', label: '一代棉芯煙彈(OMP)' },
  { value: '一代陶瓷芯煙彈(OTP)', label: '一代陶瓷芯煙彈(OTP)' },
  { value: '五代陶瓷芯煙彈(FTP)', label: '五代陶瓷芯煙彈(FTP)' },
  { value: '其他(ETC)', label: '其他(ETC)' },
];

export function SeriesDialog({ isOpen, onOpenChange, onSeriesUpdate, seriesData }: SeriesDialogProps) {
  const [materialOptions, setMaterialOptions] = useState<OptionType[]>([]);
  const apiClient = useApiClient();
  const isEditMode = !!seriesData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', code: '', productType: '其他(ETC)', commonMaterialIds: [] },
  });

  useEffect(() => {
    if (isOpen) {
      const fetchMaterials = async () => {
        try {
          if (!db) {
            throw new Error("Firebase 未初始化")
          }
          const querySnapshot = await getDocs(collection(db, 'materials'));
          const options = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const category = data.category || '未分類';
            const subCategory = data.subCategory || '未分類';
            return {
              value: doc.id,
              label: `${data.name} [${category}] [${subCategory}]`,
              category: category,
              subCategory: subCategory,
              materialName: data.name
            };
          }).sort((a, b) => {
            // 先按主分類排序，再按細分分類排序，最後按物料名稱排序
            if (a.category !== b.category) {
              return a.category.localeCompare(b.category, 'zh-TW');
            }
            if (a.subCategory !== b.subCategory) {
              return a.subCategory.localeCompare(b.subCategory, 'zh-TW');
            }
            return a.materialName.localeCompare(b.materialName, 'zh-TW');
          });
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
        code: seriesData.code || seriesData.typeCode || '',
        productType: seriesData.productType || '其他(ETC)',
        commonMaterialIds: seriesData.commonMaterials?.map(ref => ref.id) || [],
      });
    } else if (isOpen && !seriesData) {
      form.reset({ name: '', code: '', productType: '其他(ETC)', commonMaterialIds: [] });
    }
  }, [isOpen, seriesData, form]);

  async function onSubmit(values: FormData) {
    if (isEditMode && seriesData) {
      const result = await apiClient.call('updateProductSeries', {
        id: seriesData.id,
        name: values.name,
        typeCode: values.code,
        productType: values.productType,
        description: `${values.name} 系列`,
        defaultMaterials: values.commonMaterialIds?.map(materialId => ({
          materialId,
          quantity: 1
        })),
        isActive: true
      });

      if (result.success) {
        toast.success(`系列 ${values.name} 已更新。`);
        onSeriesUpdate();
        onOpenChange(false);
      }
    } else {
      const result = await apiClient.call('createProductSeries', {
        name: values.name,
        typeCode: values.code,
        productType: values.productType,
        description: `${values.name} 系列`,
        defaultMaterials: values.commonMaterialIds?.map(materialId => ({
          materialId,
          quantity: 1
        })),
        isActive: true
      });

      if (result.success) {
        toast.success(`系列 ${values.name} 已建立。`);
        onSeriesUpdate();
        onOpenChange(false);
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">
            {isEditMode ? '編輯產品系列' : '新增產品系列'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {isEditMode ? '修改產品系列的基本資訊和常用物料配置' : '建立新的產品系列並配置常用物料'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本資訊 */}
            <div className="space-y-6 p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 shadow-sm">
              <h3 className="text-xl font-bold flex items-center gap-3 text-orange-800">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Tag className="h-4 w-4 text-orange-600" />
                </div>
                基本資訊
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">系列名稱 *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="例如：經典系列" 
                          className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
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
                      <FormLabel className="text-sm font-semibold text-gray-700">系列代號 *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="例如：CLASSIC" 
                          className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="productType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">產品類型 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:border-orange-500 focus:ring-orange-500">
                            <SelectValue placeholder="選擇產品類型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRODUCT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 通用材料 */}
            <div className="space-y-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
              <h3 className="text-xl font-bold flex items-center gap-3 text-blue-800">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                通用材料
              </h3>
              
              <FormField
                control={form.control}
                name="commonMaterialIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">選擇通用材料</FormLabel>
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
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {apiClient.loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {isEditMode ? '更新中...' : '建立中...'}
                  </>
                ) : (
                  <>
                    {isEditMode ? '更新系列' : '建立系列'}
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
