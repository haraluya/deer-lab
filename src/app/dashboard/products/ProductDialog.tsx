// src/app/dashboard/products/ProductDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApiForm } from '@/hooks/useApiClient';
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
  status: z.enum(['啟用', '備用', '棄用']).default('啟用'),
  fragranceChangeReason: z.string().optional(),
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
  status?: '啟用' | '備用' | '棄用';
}

// 下拉選單選項的介面
interface SelectOptions {
  series: OptionType[];
  fragrances: OptionType[];
  materials: OptionType[];
}

// 系列詳細資訊介面
interface SeriesInfo {
  id: string;
  name: string;
  code: string;
  productType: string;
}

interface ProductDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProductUpdate: () => void;
  productData?: ProductData | null;
}

export function ProductDialog({ isOpen, onOpenChange, onProductUpdate, productData }: ProductDialogProps) {
  const [options, setOptions] = useState<SelectOptions>({ series: [], fragrances: [], materials: [] });
  const [selectedFragrance, setSelectedFragrance] = useState<any>(null);
  const [fragranceFormula, setFragranceFormula] = useState({ percentage: 0, pgRatio: 0, vgRatio: 0 });
  const [fragranceSearchTerm, setFragranceSearchTerm] = useState('');
  const [isFragranceDropdownOpen, setIsFragranceDropdownOpen] = useState(false);
  const [generatedProductNumber, setGeneratedProductNumber] = useState<string>('');
  const [generatedProductCode, setGeneratedProductCode] = useState<string>('');
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo[]>([]);
  const isEditMode = !!productData;
  const apiClient = useApiForm();
  
  // 香精更換檢測
  const [originalFragranceId, setOriginalFragranceId] = useState<string | null>(null);
  const [isFragranceChanged, setIsFragranceChanged] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      seriesId: undefined,
      fragranceId: undefined,
      nicotineMg: 0,
      specificMaterialIds: [],
      status: '啟用',
      fragranceChangeReason: '',
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
          console.log('🔍 開始查詢資料...');
          const seriesQuery = getDocs(collection(db, 'productSeries'));
          console.log('🔍 系列查詢已建立');
          const fragrancesQuery = getDocs(query(collection(db, 'fragrances'), where('fragranceStatus', 'in', ['啟用', '備用'])));
          console.log('🔍 香精查詢已建立，查詢條件: fragranceStatus in [啟用, 備用]');
          const materialsQuery = getDocs(collection(db, 'materials'));
          console.log('🔍 物料查詢已建立');

          const [seriesSnapshot, fragrancesSnapshot, materialsSnapshot] = await Promise.all([seriesQuery, fragrancesQuery, materialsQuery]);
          console.log('🔍 查詢結果:', {
            系列數量: seriesSnapshot.docs.length,
            香精數量: fragrancesSnapshot.docs.length,
            物料數量: materialsSnapshot.docs.length
          });

          // 除錯：顯示香精資料
          console.log('🔍 香精資料預覽:', fragrancesSnapshot.docs.slice(0, 3).map(doc => ({
            id: doc.id,
            fragranceStatus: doc.data().fragranceStatus,
            status: doc.data().status,
            code: doc.data().code,
            name: doc.data().name
          })));
          
          setOptions({
             series: seriesSnapshot.docs.map(doc => ({ value: doc.id, label: doc.data().name })),
             fragrances: fragrancesSnapshot.docs
               .map(doc => ({ 
                 value: doc.id, 
                 label: `${doc.data().code}(${doc.data().name})` 
               }))
               .sort((a, b) => a.label.localeCompare(b.label, 'zh-TW')),
             materials: materialsSnapshot.docs
               .map(doc => {
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
               })
               .sort((a, b) => {
                 // 先按主分類排序，再按細分分類排序，最後按物料名稱排序
                 if (a.category !== b.category) {
                   return a.category.localeCompare(b.category, 'zh-TW');
                 }
                 if (a.subCategory !== b.subCategory) {
                   return a.subCategory.localeCompare(b.subCategory, 'zh-TW');
                 }
                 return a.materialName.localeCompare(b.materialName, 'zh-TW');
               }),
           });
           
                                   // 保存系列詳細資訊
             const seriesData = seriesSnapshot.docs.map(doc => {
               const data = doc.data();
               console.log('單個系列資料:', { id: doc.id, data }); // 調試用
               
               // 處理產品類型，將顯示名稱轉換為代碼
               let productType = data.productType;
               if (!productType || productType === '') {
                 productType = '其他(ETC)'; // 預設為其他
               }
               
               // 將產品類型名稱轉換為代碼
               const productTypeCodeMap: { [key: string]: string } = {
                 '罐裝油(BOT)': 'BOT',
                 '一代棉芯煙彈(OMP)': 'OMP',
                 '一代陶瓷芯煙彈(OTP)': 'OTP',
                 '五代陶瓷芯煙彈(FTP)': 'FTP',
                 '其他(ETC)': 'ETC',
               };
               
               const productTypeCode = productTypeCodeMap[productType] || 'ETC';
               
                                return {
                   id: doc.id,
                   name: data.name,
                   code: data.code,
                   productType: productTypeCode, // 使用轉換後的代碼
                 };
             });
             console.log('完整系列資訊:', seriesData); // 調試用
             setSeriesInfo(seriesData);
        } catch (error) {
          console.error("讀取下拉選單資料失敗:", error);
          console.error("錯誤詳情:", {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            code: (error as any)?.code
          });
          toast.error(`讀取下拉選單資料失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
        }
      };
      fetchOptions();
    }
  }, [isOpen]);

  // 當香精選擇改變時，獲取香精配方資訊
  const handleFragranceChange = async (fragranceId: string) => {
    if (!fragranceId || !db) {
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
    if (isOpen && productData && options.series.length > 0 && options.fragrances.length > 0 && options.materials.length > 0) {
      console.log('重置表單資料:', {
        name: productData.name,
        seriesId: productData.seriesRef?.id,
        fragranceId: productData.currentFragranceRef?.id,
        nicotineMg: productData.nicotineMg,
        specificMaterialIds: productData.specificMaterials?.map(ref => ref.id)
      });
      
      form.reset({
        name: productData.name || '',
        seriesId: productData.seriesRef?.id || undefined,
        fragranceId: productData.currentFragranceRef?.id || undefined,
        nicotineMg: productData.nicotineMg || 0,
        specificMaterialIds: productData.specificMaterials?.map(ref => ref.id) || [],
        status: productData.status || '啟用',
        fragranceChangeReason: '',
      });
      
      // 記錄原始香精ID（用於判斷是否有更換）
      setOriginalFragranceId(productData.currentFragranceRef?.id || null);
      setIsFragranceChanged(false);
      
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
        status: '啟用',
        fragranceChangeReason: '',
      });
      // 重置產品編號和代碼預覽
      setGeneratedProductNumber('');
      setGeneratedProductCode('');
    }
  }, [isOpen, productData, form, options.series.length, options.fragrances.length, options.materials.length]);

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

  // 當系列選擇改變時，預覽產品代碼
  useEffect(() => {
    const seriesId = form.watch('seriesId');
    console.log('系列選擇改變:', { seriesId, isEditMode, seriesInfoLength: seriesInfo.length }); // 調試用
    
    if (seriesId && !isEditMode && seriesInfo.length > 0) {
      const selectedSeriesInfo = seriesInfo.find(s => s.id === seriesId);
      console.log('找到的系列信息:', selectedSeriesInfo); // 調試用
      
             if (selectedSeriesInfo && selectedSeriesInfo.productType && selectedSeriesInfo.code) {
         // 生成隨機4位數編號
         const randomNumber = Math.floor(1000 + Math.random() * 9000);
         setGeneratedProductNumber(String(randomNumber));
         
         // 預覽產品代碼格式
         const generatedCode = `${selectedSeriesInfo.productType}-${selectedSeriesInfo.code}-${randomNumber}`;
         setGeneratedProductCode(generatedCode);
         console.log('成功生成產品代碼:', {
           productType: selectedSeriesInfo.productType,
           code: selectedSeriesInfo.code,
           randomNumber: randomNumber,
           fullCode: generatedCode
         }); // 調試用
       } else {
        // 如果沒有找到系列信息或產品類型，清空預覽
        setGeneratedProductNumber('');
        setGeneratedProductCode('');
        console.log('未找到系列信息或產品類型:', { 
          hasSelectedSeriesInfo: !!selectedSeriesInfo, 
          productType: selectedSeriesInfo?.productType, 
          code: selectedSeriesInfo?.code 
        }); // 調試用
      }
    } else {
      setGeneratedProductNumber('');
      setGeneratedProductCode('');
      if (seriesId && !isEditMode && seriesInfo.length === 0) {
        console.log('系列資訊尚未載入完成'); // 調試用
      }
    }
  }, [form.watch('seriesId'), seriesInfo, isEditMode]);

  // 監聽香精選擇變更，檢測是否有更換
  useEffect(() => {
    const currentFragranceId = form.watch('fragranceId');
    if (isEditMode && originalFragranceId && currentFragranceId) {
      setIsFragranceChanged(currentFragranceId !== originalFragranceId);
    } else {
      setIsFragranceChanged(false);
    }
  }, [form.watch('fragranceId'), originalFragranceId, isEditMode]);

  // 表單提交處理
  async function onSubmit(values: FormData) {
    // 檢查如果香精有更換但沒有填寫更換原因
    if (isFragranceChanged && !values.fragranceChangeReason?.trim()) {
      toast.error('請填寫香精更換原因');
      return;
    }

      
      // 組裝要傳送的資料
      const payload = { 
        ...values,
        // 如果有香精更換且在編輯模式，添加更換原因資訊
        ...(isFragranceChanged && isEditMode && {
          fragranceChangeInfo: {
            oldFragranceId: originalFragranceId,
            newFragranceId: values.fragranceId,
            changeReason: values.fragranceChangeReason
          }
        })
      };

      // 使用統一 API 客戶端
      const result = await apiClient.call(
        isEditMode ? 'updateProduct' : 'createProduct',
        isEditMode
          ? { productId: productData.id, ...payload } as any
          : payload
      );
      
      if (!result.success) return;
      onProductUpdate();
      onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
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
             <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                             <h3 className="text-lg font-bold flex items-center gap-2 text-blue-800">
                 <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                   <Tag className="h-3 w-3 text-blue-600" />
                 </div>
                 基本資料
               </h3>
              
                                                                                                                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                                             <FormItem className="space-y-2">
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
                                             <FormItem className="space-y-2">
                         <FormLabel className="text-sm font-semibold text-gray-700">所屬系列 *</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value}>
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
                                               <FormItem className="space-y-2">
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

                   <FormField
                     control={form.control}
                     name="status"
                     render={({ field }) => (
                       <FormItem className="space-y-2">
                         <FormLabel className="text-sm font-semibold text-gray-700">產品狀態</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value}>
                           <FormControl>
                             <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                               <SelectValue placeholder="選擇產品狀態" />
                             </SelectTrigger>
                           </FormControl>
                           <SelectContent>
                             <SelectItem value="啟用">
                               <div className="flex items-center gap-2">
                                 <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                 啟用
                               </div>
                             </SelectItem>
                             <SelectItem value="備用">
                               <div className="flex items-center gap-2">
                                 <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                 備用
                               </div>
                             </SelectItem>
                             <SelectItem value="棄用">
                               <div className="flex items-center gap-2">
                                 <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                                 棄用
                               </div>
                             </SelectItem>
                           </SelectContent>
                         </Select>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   {/* 產品編號和代碼預覽（新增模式）或顯示（編輯模式） */}
                   {!isEditMode && form.watch('seriesId') && (
                     <>
                       <FormItem className="space-y-2">
                         <FormLabel className="text-sm font-semibold text-gray-700">產品編號</FormLabel>
                         <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                           <span className="text-sm font-mono text-gray-700">{generatedProductNumber || '載入中...'}</span>
                         </div>
                         <p className="text-xs text-gray-500">4位數隨機編號，系統自動生成</p>
                         {!generatedProductNumber && (
                           <p className="text-xs text-red-500">如果持續載入中，請重新選擇系列</p>
                         )}
                       </FormItem>

                       <FormItem className="space-y-2">
                         <FormLabel className="text-sm font-semibold text-gray-700">產品代碼預覽</FormLabel>
                         <div className="px-3 py-2 bg-blue-50 border border-blue-300 rounded-md">
                           <span className="text-sm font-mono text-blue-700">{generatedProductCode || '載入中...'}</span>
                         </div>
                         <p className="text-xs text-blue-500">格式：[系列類型]-[系列代號]-[隨機編號]</p>
                       </FormItem>
                     </>
                   )}

                   {/* 編輯模式顯示產品代號（不可修改） */}
                   {isEditMode && productData && (
                     <>
                       <FormItem className="space-y-2">
                         <FormLabel className="text-sm font-semibold text-gray-700">產品編號</FormLabel>
                         <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                           <span className="text-sm font-mono text-gray-700">{productData.productNumber || 'N/A'}</span>
                         </div>
                         <p className="text-xs text-gray-500">產品編號不可修改</p>
                       </FormItem>

                       <FormItem className="space-y-2">
                         <FormLabel className="text-sm font-semibold text-gray-700">產品代號</FormLabel>
                         <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                           <span className="text-sm font-mono text-gray-700">{productData.code || 'N/A'}</span>
                         </div>
                         <p className="text-xs text-gray-500">產品代號不可修改</p>
                       </FormItem>
                     </>
                   )}
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

                {/* 香精更換原因欄位（當檢測到香精有更換時顯示） */}
                {isFragranceChanged && (
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="fragranceChangeReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                            <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                            更換原因 *
                          </FormLabel>
                          <FormControl>
                            <textarea
                              {...field}
                              className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[80px] resize-none"
                              placeholder="請詳細說明更換原因，例如：配方升級、舊版停產等..."
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-orange-600 mt-1">
                            ⚠️ 檢測到香精有變更，此操作將會被記錄
                          </p>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

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
                disabled={apiClient.loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {apiClient.loading ? (
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
