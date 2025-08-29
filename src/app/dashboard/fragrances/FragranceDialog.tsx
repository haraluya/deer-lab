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
import { Textarea } from '@/components/ui/textarea';
import { FlaskConical, Tag, Package, Droplets } from 'lucide-react';

// Zod schema for fragrance form validation
const formSchema = z.object({
  code: z.string().min(1, { message: '香精代號為必填欄位' }),
  name: z.string().min(2, { message: '香精名稱至少需要 2 個字元' }),
  fragranceType: z.string({ required_error: '必須選擇香精種類' }),
  fragranceStatus: z.string({ required_error: '必須選擇香精狀態' }),
  supplierId: z.string().optional(),
  safetyStockLevel: z.coerce.number().min(0).optional(),
  costPerUnit: z.coerce.number().min(0).optional(),
  percentage: z.coerce.number().min(0).max(100, { message: '香精比例不能超過100%' }),
  pgRatio: z.coerce.number().min(0).max(100, { message: 'PG比例不能超過100%' }),
  vgRatio: z.coerce.number().min(0).max(100, { message: 'VG比例不能超過100%' }),
  remarks: z.string().optional(),
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
  fragranceType?: string;
  fragranceStatus?: string;
  supplierRef?: DocumentReference;
  safetyStockLevel?: number;
  costPerUnit?: number;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const isEditMode = !!fragranceData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '', name: '', fragranceType: 'cotton', fragranceStatus: 'active', supplierId: '',
      safetyStockLevel: 0, costPerUnit: 0, percentage: 0, pgRatio: 0, vgRatio: 0, remarks: '',
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
        fragranceType: fragranceData.fragranceType || fragranceData.status || 'cotton',
        fragranceStatus: fragranceData.fragranceStatus || 'active',
        supplierId: fragranceData.supplierRef?.id || '',
        safetyStockLevel: fragranceData.safetyStockLevel || 0,
        costPerUnit: fragranceData.costPerUnit || 0,
        percentage: fragranceData.percentage || 0,
        pgRatio: fragranceData.pgRatio || 0,
        vgRatio: fragranceData.vgRatio || 0,
        remarks: fragranceData.remarks || '',
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
      
      let finalValues;
      
      // 無論是新增還是編輯模式，都自動計算PG和VG比例
      const { pgRatio, vgRatio } = calculateRatios(values.percentage || 0);
      finalValues = {
        ...values,
        pgRatio,
        vgRatio,
        unit: 'KG', // 固定單位為KG
      };
      
      if (isEditMode) {
        const updateFragrance = httpsCallable(functions, 'updateFragrance');
        await updateFragrance({ fragranceId: fragranceData.id, ...finalValues });
        toast.success(`香精 ${values.name} 的資料已更新。`, { id: toastId });
      } else {
        const createFragrance = httpsCallable(functions, 'createFragrance');
        await createFragrance(finalValues);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <FlaskConical className="h-5 w-5 text-white" />
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
            <div className="space-y-6 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 shadow-sm">
              <h3 className="text-xl font-bold flex items-center gap-3 text-purple-800">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Tag className="h-4 w-4 text-purple-600" />
                </div>
                基本資料
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">香精代號 *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="例如：HYH-0123M1" 
                          className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
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
                          className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
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
                          <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                            <SelectValue placeholder="選擇香精種類" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cotton">棉芯</SelectItem>
                          <SelectItem value="ceramic">陶瓷芯</SelectItem>
                          <SelectItem value="universal">棉陶芯通用</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fragranceStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">啟用狀態 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                            <SelectValue placeholder="選擇啟用狀態" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">啟用</SelectItem>
                          <SelectItem value="standby">備用</SelectItem>
                          <SelectItem value="discontinued">棄用</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">供應商</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500">
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
            <div className="space-y-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
              <h3 className="text-xl font-bold flex items-center gap-3 text-green-800">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="h-4 w-4 text-green-600" />
                </div>
                庫存與成本
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="space-y-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
              <h3 className="text-xl font-bold flex items-center gap-3 text-blue-800">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Droplets className="h-4 w-4 text-blue-600" />
                </div>
                香精比例
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      <FormLabel className="text-sm font-semibold text-gray-700">PG 比例 (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          disabled
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
                      <FormLabel className="text-sm font-semibold text-gray-700">VG 比例 (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          disabled
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

            {/* 備註 */}
            <div className="space-y-6 p-6 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 shadow-sm">
              <h3 className="text-xl font-bold flex items-center gap-3 text-yellow-800">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Tag className="h-4 w-4 text-yellow-600" />
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
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
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
