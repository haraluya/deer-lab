// src/app/dashboard/fragrances/FragranceDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApiForm } from '@/hooks/useApiClient';
import { collection, getDocs, DocumentReference, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import FragranceCalculations from '@/utils/fragranceCalculations';
import { validateStock, validatePercentage, limitToThreeDecimals, validateRatioSum } from '@/utils/numberValidation';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FlaskConical, Tag, Package, Droplets } from 'lucide-react';

// Zod schema for fragrance form validation
const formSchema = z.object({
  code: z.string().min(1, { message: '香精代號為必填欄位' }),
  name: z.string().min(2, { message: '香精名稱至少需要 2 個字元' }),
  fragranceType: z.string().min(1, { message: '必須選擇香精種類' }),
  fragranceStatus: z.string().default('備用'), // 預設為備用，不再是必填
  supplierId: z.string().optional(),
  currentStock: z.coerce.number().min(0, { message: '現有庫存不能為負數' }).default(0),
  safetyStockLevel: z.coerce.number().min(0).default(0),
  costPerUnit: z.coerce.number().min(0).default(0),
  percentage: z.coerce.number().min(0).max(100, { message: '香精比例不能超過100%' }).default(0),
  pgRatio: z.coerce.number().min(0).max(100, { message: 'PG比例不能超過100%' }).default(0),
  vgRatio: z.coerce.number().min(0).max(100, { message: 'VG比例不能超過100%' }).default(0),
  remarks: z.string().optional(),
}).refine((data) => {
  // 使用統一的驗證函數
  return validateRatioSum(data.percentage || 0, data.pgRatio || 0, data.vgRatio || 0);
}, {
  message: "香精、PG、VG比例總和必須等於100%（或全部為0）",
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
  fragranceType?: string;
  fragranceStatus?: string;
  supplierRef?: DocumentReference;
  safetyStockLevel?: number;
  costPerUnit?: number;
  unit?: string; // 新增 unit 欄位
  percentage?: number;
  pgRatio?: number;
  vgRatio?: number;
  remarks?: string;
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [fragranceTypes, setFragranceTypes] = useState<string[]>([]);
  const [fragranceStatuses, setFragranceStatuses] = useState<string[]>([]);
  const isEditMode = !!fragranceData;
  const apiClient = useApiForm();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '', name: '', fragranceType: '', fragranceStatus: '備用', supplierId: '',
      currentStock: 0, safetyStockLevel: 0, costPerUnit: 0, percentage: 0, pgRatio: 0, vgRatio: 0, remarks: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          if (!db) {
            throw new Error("Firebase 未初始化")
          }
          
          // 獲取供應商，只顯示名稱中包含「生技」的公司
          const suppliersSnapshot = await getDocs(collection(db, 'suppliers'));
          const suppliersList = suppliersSnapshot.docs
            .map(doc => ({ id: doc.id, name: doc.data().name }))
            .filter(supplier => supplier.name && supplier.name.includes('生技')) as Supplier[];
          setSuppliers(suppliersList);

          // 獲取香精種類
          try {
            const fragranceTypesSnapshot = await getDocs(collection(db, 'fragranceTypes'));
            const fragranceTypesList = fragranceTypesSnapshot.docs.map(doc => doc.data().name).filter(Boolean);
            setFragranceTypes(fragranceTypesList.length > 0 ? fragranceTypesList : ['棉芯', '陶瓷芯', '棉陶芯通用']);
          } catch (error) {
            console.log("香精種類集合不存在，使用預設值");
            setFragranceTypes(['棉芯', '陶瓷芯', '棉陶芯通用']);
          }

          // 獲取香精狀態
          try {
            const fragranceStatusesSnapshot = await getDocs(collection(db, 'fragranceStatuses'));
            const fragranceStatusesList = fragranceStatusesSnapshot.docs.map(doc => doc.data().name).filter(Boolean);
            setFragranceStatuses(fragranceStatusesList.length > 0 ? fragranceStatusesList : ['啟用', '備用', '棄用']);
          } catch (error) {
            console.log("香精狀態集合不存在，使用預設值");
            setFragranceStatuses(['啟用', '備用', '棄用']);
          }
        } catch (error) {
          toast.error("讀取資料失敗。");
        }
      };
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && fragranceData) {
      console.log('正在初始化香精編輯表單，原始資料:', fragranceData);
      
      // 處理向後相容性
      const fragranceType = fragranceData.fragranceType || fragranceData.status || '';
      const fragranceStatus = fragranceData.fragranceStatus || fragranceData.status || '';
      
      const formData = {
        code: fragranceData.code || '',
        name: fragranceData.name || '',
        fragranceType: fragranceType,
        fragranceStatus: fragranceStatus,
        supplierId: fragranceData.supplierRef?.id || '',
        currentStock: fragranceData.currentStock || 0,
        safetyStockLevel: fragranceData.safetyStockLevel || 0,
        costPerUnit: fragranceData.costPerUnit || 0,
        percentage: fragranceData.percentage || 0,
        pgRatio: fragranceData.pgRatio || 0,
        vgRatio: fragranceData.vgRatio || 0,
        remarks: fragranceData.remarks || '',
      };
      
      console.log('表單初始化資料:', formData);
      form.reset(formData);
    } else if (isOpen && !fragranceData) {
      form.reset();
    }
  }, [isOpen, fragranceData, form]);

  // 監聽香精比例變化，自動計算PG和VG
  const fragrancePercentage = form.watch("percentage") || 0;

  // 當香精比例變化時，自動更新PG和VG比例
  useEffect(() => {
    // 只在新增模式下自動計算，編輯模式下保持原有比例
    if (fragrancePercentage >= 0 && !isEditMode) {
      const { pgRatio, vgRatio } = calculateRatios(fragrancePercentage);
      form.setValue("pgRatio", pgRatio);
      form.setValue("vgRatio", vgRatio);
    }
  }, [fragrancePercentage, form, isEditMode]);

  // 自動計算PG和VG比例
  const calculateRatios = (fragrancePercentage: number) => {
    return FragranceCalculations.calculatePGVGRatios(fragrancePercentage);
  };

  async function onSubmit(values: FormData) {
    let finalValues;

      // 限制所有數值最多三位小數
      finalValues = {
        ...values,
        currentStock: validateStock(values.currentStock),
        safetyStockLevel: validateStock(values.safetyStockLevel),
        costPerUnit: limitToThreeDecimals(values.costPerUnit),
        percentage: validatePercentage(values.percentage || 0),
        pgRatio: validatePercentage(values.pgRatio || 0),
        vgRatio: validatePercentage(values.vgRatio || 0),
        unit: 'KG', // 固定單位為KG
        category: '香精', // 統一設定為香精分類
      };
      
      if (isEditMode) {
        const result = await apiClient.call('updateFragrance', { fragranceId: fragranceData.id, ...finalValues });
        if (!result.success) return;
      } else {
        const result = await apiClient.call('createFragrance', finalValues);
        if (!result.success) return;
      }
      onFragranceUpdate();
      onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-white sm:max-w-4xl max-w-[calc(100vw-1rem)]">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <FlaskConical className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            {isEditMode ? '編輯香精' : '新增香精'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            {isEditMode ? '修改香精詳細資訊' : '建立新的香精資料'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本資料 */}
            <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3 text-purple-800">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Tag className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                </div>
                基本資料
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">香精代號 *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="例如：HYH-0123M1" 
                          className="border-gray-300 focus:border-purple-500 focus:ring-purple-500 h-12 text-base"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">香精名稱 *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="例如：茉莉綠茶" 
                          className="border-gray-300 focus:border-purple-500 focus:ring-purple-500 h-12 text-base"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fragranceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">香精種類 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500 h-12">
                            <SelectValue placeholder="選擇香精種類" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fragranceTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 只在編輯模式顯示狀態選擇框 */}
                {isEditMode && (
                  <FormField
                    control={form.control}
                    name="fragranceStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">啟用狀態</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500 h-12">
                              <SelectValue placeholder="選擇啟用狀態" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fragranceStatuses.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                        <p className="text-xs text-gray-500 mt-1">
                          新增香精時預設為備用狀態，有產品使用後會自動啟用
                        </p>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">供應商</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500 h-12">
                            <SelectValue placeholder="選擇供應商" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 庫存與成本 */}
            <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3 text-green-800">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                </div>
                庫存與成本
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <FormField
                  control={form.control}
                  name="currentStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">現有庫存 (KG)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0"
                          className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="safetyStockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">安全庫存 (KG)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0"
                          className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="costPerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">單位成本 (元/KG)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00"
                          className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 香精比例 */}
            <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3 text-blue-800">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Droplets className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                </div>
                香精比例
              </h3>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                  <h4 className="text-base sm:text-lg font-semibold text-blue-700">配方比例設定</h4>
                  {isEditMode && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentPercentage = form.getValues("percentage") || 0;
                        const { pgRatio, vgRatio } = calculateRatios(currentPercentage);
                        form.setValue("pgRatio", pgRatio);
                        form.setValue("vgRatio", vgRatio);
                        toast.success("PG和VG比例已重新計算");
                      }}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50 w-full sm:w-auto"
                    >
                      重新計算PG/VG
                    </Button>
                  )}
                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <FormField
                    control={form.control}
                    name="percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">香精比例 (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="輸入香精比例，PG和VG將自動計算"
                            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              // 在編輯模式下，當香精比例改變時，重新計算PG和VG
                              if (isEditMode) {
                                const newPercentage = parseFloat(e.target.value) || 0;
                                const { pgRatio, vgRatio } = calculateRatios(newPercentage);
                                form.setValue("pgRatio", pgRatio);
                                form.setValue("vgRatio", vgRatio);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pgRatio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">PG 比例 (%) - 自動計算</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            disabled
                            placeholder="根據香精比例自動計算"
                            className="border-gray-300 bg-gray-50"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vgRatio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">VG 比例 (%) - 自動計算</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            disabled
                            placeholder="根據香精比例自動計算"
                            className="border-gray-300 bg-gray-50"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* 備註 */}
            <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 shadow-sm">
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3 text-yellow-800">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Tag className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
                </div>
                備註
              </h3>
              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="輸入香精備註 (選填)"
                        className="border-gray-300 focus:border-yellow-500 focus:ring-yellow-500"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
              >
                取消
              </Button>
              <Button 
                type="submit" 
                disabled={apiClient.loading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
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
