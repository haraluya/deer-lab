// src/app/dashboard/products/ProductDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, getDocs, DocumentReference, DocumentData, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, OptionType } from '@/components/ui/multi-select';
import { Package, Tag, FlaskConical, Search, ChevronDown, Check } from 'lucide-react';

// 表單的 Zod 驗證 Schema
const formSchema = z.object({
  name: z.string().min(2, { message: '產品名稱至少需要 2 個字元' }),
  seriesId: z.string({ required_error: '必須選擇一個產品系列' }),
  fragranceId: z.string({ required_error: '必須選擇一個香精' }),
  nicotineMg: z.coerce.number().min(0, { message: '尼古丁濃度不能為負數' }).default(0),
  specificMaterialIds: z.array(z.string()).optional().default([]),
});

type FormData = z.infer<typeof formSchema>;

// 產品資料的介面定義
export interface ProductData extends DocumentData {
  id: string;
  name: string;
  code: string;
  productNumber: string;
  seriesRef: DocumentReference;
  currentFragranceRef: DocumentReference;
  specificMaterials: DocumentReference[];
  nicotineMg: number;
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
  const [selectedFragrance, setSelectedFragrance] = useState<any>(null);
  const [fragranceFormula, setFragranceFormula] = useState({ percentage: 0, pgRatio: 0, vgRatio: 0 });
  const [fragranceSearchTerm, setFragranceSearchTerm] = useState('');
  const [isFragranceDropdownOpen, setIsFragranceDropdownOpen] = useState(false);
  const isEditMode = !!productData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      seriesId: undefined,
      fragranceId: undefined,
      nicotineMg: 0,
      specificMaterialIds: [],
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
          const fragrancesQuery = getDocs(query(collection(db, 'fragrances'), where('fragranceStatus', '==', '啟用')));
          const materialsQuery = getDocs(collection(db, 'materials'));

          const [seriesSnapshot, fragrancesSnapshot, materialsSnapshot] = await Promise.all([seriesQuery, fragrancesQuery, materialsQuery]);
          
                     setOptions({
             series: seriesSnapshot.docs.map(doc => ({ value: doc.id, label: doc.data().name })),
             fragrances: fragrancesSnapshot.docs
               .map(doc => ({ 
                 value: doc.id, 
                 label: `${doc.data().code}(${doc.data().name})` 
               }))
               .sort((a, b) => a.label.localeCompare(b.label, 'zh-TW')),
             materials: materialsSnapshot.docs
               .map(doc => ({ value: doc.id, label: doc.data().name }))
               .sort((a, b) => a.label.localeCompare(b.label, 'zh-TW')),
           });
        } catch (error) {
          console.error("讀取下拉選單資料失敗:", error);
          toast.error("讀取下拉選單資料失敗。");
        }
      };
      fetchOptions();
    }
  }, [isOpen]);

  // 當香精選擇改變時，獲取香精配方資訊
  const handleFragranceChange = async (fragranceId: string) => {
    if (!fragranceId) {
      setSelectedFragrance(null);
      setFragranceFormula({ percentage: 0, pgRatio: 0, vgRatio: 0 });
      return;
    }

    try {
      const fragranceDoc = await getDoc(doc(db, 'fragrances', fragranceId));
      if (fragranceDoc.exists()) {
        const fragranceData = fragranceDoc.data();
        setSelectedFragrance(fragranceData);
        setFragranceFormula({
          percentage: fragranceData.percentage || 0,
          pgRatio: fragranceData.pgRatio || 0,
          vgRatio: fragranceData.vgRatio || 0,
        });
      }
    } catch (error) {
      console.error('獲取香精配方失敗:', error);
    }
  };

  // 當處於編輯模式時，用傳入的 productData 填充表單
  useEffect(() => {
    if (isOpen && productData) {
      form.reset({
        name: productData.name || '',
        seriesId: productData.seriesRef?.id || undefined,
        fragranceId: productData.currentFragranceRef?.id || undefined,
        nicotineMg: productData.nicotineMg || 0,
        specificMaterialIds: productData.specificMaterials?.map(ref => ref.id) || [],
      });
      
      // 如果編輯模式，載入香精配方資訊
      if (productData.currentFragranceRef?.id) {
        handleFragranceChange(productData.currentFragranceRef.id);
      }
    } else if (isOpen && !productData) {
      form.reset({
        name: '',
        seriesId: undefined,
        fragranceId: undefined,
        nicotineMg: 0,
        specificMaterialIds: [],
      });
    }
  }, [isOpen, productData, form]);

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.fragrance-dropdown')) {
        setIsFragranceDropdownOpen(false);
        setFragranceSearchTerm('');
      }
    };

    if (isFragranceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFragranceDropdownOpen]);

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
                   name="seriesId"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel className="text-sm font-semibold text-gray-700">所屬系列 *</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                   name="nicotineMg"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel className="text-sm font-semibold text-gray-700">丁鹽濃度 (MG)</FormLabel>
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
               </div>
            </div>

                         {/* 使用香精 */}
             <div className="space-y-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
               <h3 className="text-xl font-bold flex items-center gap-3 text-green-800">
                 <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                   <FlaskConical className="h-4 w-4 text-green-600" />
                 </div>
                 使用香精
               </h3>
               
                               <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="fragranceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">選擇香精 *</FormLabel>
                        <div className="relative fragrance-dropdown">
                          <div
                            className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:border-green-500 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500"
                            onClick={() => setIsFragranceDropdownOpen(!isFragranceDropdownOpen)}
                          >
                            <span className={field.value ? 'text-gray-900' : 'text-gray-500'}>
                              {field.value 
                                ? options.fragrances.find(opt => opt.value === field.value)?.label || '選擇一個香精'
                                : '選擇一個香精'
                              }
                            </span>
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isFragranceDropdownOpen ? 'rotate-180' : ''}`} />
                          </div>
                          
                          {isFragranceDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
                              {/* 搜尋輸入框 */}
                              <div className="p-2 border-b border-gray-200">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <Input
                                    type="text"
                                    placeholder="搜尋香精..."
                                    value={fragranceSearchTerm}
                                    onChange={(e) => setFragranceSearchTerm(e.target.value)}
                                    className="pl-10 border-0 focus:ring-0 focus:border-0"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              
                              {/* 選項列表 */}
                              <div className="max-h-48 overflow-y-auto">
                                {options.fragrances
                                  .filter(option => 
                                    option.label.toLowerCase().includes(fragranceSearchTerm.toLowerCase())
                                  )
                                  .map(option => (
                                    <div
                                      key={option.value}
                                      className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-green-50 ${
                                        field.value === option.value ? 'bg-green-100' : ''
                                      }`}
                                      onClick={() => {
                                        field.onChange(option.value);
                                        handleFragranceChange(option.value);
                                        setIsFragranceDropdownOpen(false);
                                        setFragranceSearchTerm('');
                                      }}
                                    >
                                      <span className="text-sm">{option.label}</span>
                                      {field.value === option.value && (
                                        <Check className="h-4 w-4 text-green-600" />
                                      )}
                                    </div>
                                  ))}
                                {options.fragrances.filter(option => 
                                  option.label.toLowerCase().includes(fragranceSearchTerm.toLowerCase())
                                ).length === 0 && (
                                  <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                    沒有找到符合的香精
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                               {/* 香精資訊顯示 */}
                {selectedFragrance && (
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-3">香精配方資訊</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">香精名稱：</span>
                        <span className="font-medium">{selectedFragrance.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">香精代號：</span>
                        <span className="font-medium">{selectedFragrance.code}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">香精比例：</span>
                        <span className="font-medium text-green-600">{fragranceFormula.percentage}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">PG比例：</span>
                        <span className="font-medium text-blue-600">{fragranceFormula.pgRatio}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">VG比例：</span>
                        <span className="font-medium text-purple-600">{fragranceFormula.vgRatio}%</span>
                      </div>
                    </div>
                  </div>
                )}
             </div>

             {/* 專屬材料 */}
             <div className="space-y-6 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 shadow-sm">
               <h3 className="text-xl font-bold flex items-center gap-3 text-purple-800">
                 <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                   <Package className="h-4 w-4 text-purple-600" />
                 </div>
                 專屬材料
               </h3>
               
               <div className="grid grid-cols-1 gap-6">
                 <FormField
                   control={form.control}
                   name="specificMaterialIds"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel className="text-sm font-semibold text-gray-700">選擇專屬材料</FormLabel>
                       <MultiSelect
                         options={options.materials}
                         selected={field.value || []}
                         onChange={field.onChange}
                         placeholder="選擇該產品專屬使用的材料..."
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
