// src/app/dashboard/suppliers/SupplierDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApiClient } from '@/hooks/useApiClient';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Building, User, Package, Phone } from 'lucide-react';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// Zod schema for form validation
const formSchema = z.object({
  name: z.string().min(2, { message: '供應商名稱至少需要 2 個字元' }),
  products: z.string().optional(),
  contactWindow: z.string().optional(),
  contactMethod: z.string().optional(),
  liaisonPersonId: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// 人員資料介面
interface PersonnelData {
  id: string;
  name: string;
  employeeId: string;
  phone: string;
  status: string;
}

// The data structure for a supplier
export interface SupplierData {
  id: string;
  name: string;
  products?: string;
  contactWindow?: string;
  contactMethod?: string;
  liaisonPersonId?: string;
  liaisonPersonName?: string;
  notes?: string;
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
  const [personnelList, setPersonnelList] = useState<PersonnelData[]>([]);
  const apiClient = useApiClient();
  const isEditMode = !!supplierData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      products: '',
      contactWindow: '',
      contactMethod: '',
      liaisonPersonId: '',
      notes: '',
    },
  });

  // 載入人員資料
  useEffect(() => {
    const loadPersonnel = async () => {
      try {
        if (!db) {
          console.error("Firestore 未初始化");
          return;
        }
        
        const personnelSnapshot = await getDocs(collection(db, 'users'));
        const personnelData = personnelSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter((person: any) => person.status === 'active') // 只顯示啟用狀態的人員
          .map((person: any) => ({
            id: person.id,
            name: person.name,
            employeeId: person.employeeId,
            phone: person.phone,
            status: person.status
          })) as PersonnelData[];
        
        setPersonnelList(personnelData);
      } catch (error) {
        console.error("載入人員資料失敗:", error);
        toast.error("載入人員資料失敗");
      }
    };

    if (isOpen) {
      loadPersonnel();
    }
  }, [isOpen]);

  // When the dialog opens or supplierData changes, populate the form
  useEffect(() => {
    if (isOpen) {
      if (supplierData) {
        // 編輯模式：填入現有資料
        form.reset({
          name: supplierData.name || '',
          products: supplierData.products || '',
          contactWindow: supplierData.contactWindow || '',
          contactMethod: supplierData.contactMethod || '',
          liaisonPersonId: supplierData.liaisonPersonId || '',
          notes: supplierData.notes || '',
        });
      } else {
        // 新增模式：清空所有欄位
        form.reset({
          name: '',
          products: '',
          contactWindow: '',
          contactMethod: '',
          liaisonPersonId: '',
          notes: '',
        });
      }
    }
  }, [isOpen, supplierData, form]);

  async function onSubmit(values: FormData) {
    console.log('提交的資料:', values); // 調試日誌
    
    if (isEditMode && supplierData) {
      const result = await apiClient.call('updateSupplier', {
        id: supplierData.id,
        name: values.name,
        contactPerson: values.contactWindow,
        phone: values.contactMethod,
        notes: values.notes,
        isActive: true
      });

      if (result.success) {
        toast.success(`供應商 ${values.name} 的資料已成功更新。`);
        onSupplierUpdate();
        onOpenChange(false);
      }
    } else {
      const result = await apiClient.call('createSupplier', {
        name: values.name,
        contactPerson: values.contactWindow,
        phone: values.contactMethod,
        notes: values.notes,
        isActive: true
      });

      if (result.success) {
        toast.success(`供應商 ${values.name} 已成功建立。`);
        onSupplierUpdate();
        onOpenChange(false);
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gradient-to-br from-white via-slate-50/30 to-blue-50/20 border-0 shadow-2xl backdrop-blur-sm" aria-describedby="supplier-dialog-description">
        <div className="flex flex-col h-full">
          {/* 頭部區域 - 全新設計 */}
          <DialogHeader className="pb-6 border-b border-slate-200/50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Building className="h-8 w-8 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {isEditMode ? '編輯供應商' : '新增供應商'}
                  </DialogTitle>
                  <DialogDescription id="supplier-dialog-description" className="text-slate-600 text-base mt-2">
                    {isEditMode ? '修改供應商的詳細聯絡資訊與合作關係' : '建立新的供應商合作夥伴資料'}
                  </DialogDescription>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="px-2 py-1 bg-blue-100/80 text-blue-700 rounded-full text-xs font-semibold">
                      {isEditMode ? '編輯模式' : '新增模式'}
                    </span>
                    <span className="px-2 py-1 bg-green-100/80 text-green-700 rounded-full text-xs font-semibold">
                      即時儲存
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 狀態資訊 */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-blue-100/80 text-blue-700 rounded-full text-sm font-semibold shadow-sm">
                  {isEditMode ? '編輯模式' : '新增模式'}
                </span>
                <span className="px-3 py-1.5 bg-green-100/80 text-green-700 rounded-full text-sm font-semibold shadow-sm">
                  即時儲存
                </span>
              </div>
            </div>
          </DialogHeader>
          
          {/* 表單內容區域 */}
          <div className="flex-1 overflow-y-auto py-6 min-h-0">
            <Form {...form}>
              <form id="supplier-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* 基本資料區域 - 全新設計 */}
                <div className="p-8 bg-white/80 backdrop-blur-sm rounded-3xl border border-white/40 shadow-lg">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Building className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">基本資料</h3>
                      <p className="text-sm text-slate-600">供應商的基本識別資訊</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-sm font-bold text-blue-600 uppercase tracking-wide">
                            供應商名稱 <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="例如：ABC 原料有限公司" 
                              className="h-12 bg-white/90 border-blue-200/50 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl text-base shadow-sm transition-all duration-200"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="products"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-sm font-bold text-indigo-600 uppercase tracking-wide">
                            供應商品
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="例如：香精, 原料, 包材, 化學品" 
                              className="h-12 bg-white/90 border-indigo-200/50 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl text-base shadow-sm transition-all duration-200"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 聯絡資訊區域 - 全新設計 */}
                <div className="p-8 bg-white/80 backdrop-blur-sm rounded-3xl border border-white/40 shadow-lg">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">聯絡資訊</h3>
                      <p className="text-sm text-slate-600">建立有效的溝通管道</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="contactWindow"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-sm font-bold text-emerald-600 uppercase tracking-wide">
                            聯絡窗口
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="例如：王經理、李主任" 
                              className="h-12 bg-white/90 border-emerald-200/50 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl text-base shadow-sm transition-all duration-200"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactMethod"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-sm font-bold text-purple-600 uppercase tracking-wide">
                            聯絡方式
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="電話、Email、Line ID 或其他聯絡方式" 
                              className="h-12 bg-white/90 border-purple-200/50 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl text-base shadow-sm transition-all duration-200"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mt-6">
                    <FormField
                      control={form.control}
                      name="liaisonPersonId"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-sm font-bold text-orange-600 uppercase tracking-wide">
                            內部對接人員
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 bg-white/90 border-orange-200/50 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl text-base shadow-sm transition-all duration-200">
                                <SelectValue placeholder="選擇負責對接的內部人員" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-xl rounded-xl">
                              {personnelList.map((person) => (
                                <SelectItem 
                                  key={person.id} 
                                  value={person.id}
                                  className="flex items-center gap-2 hover:bg-orange-50/80 transition-colors rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
                                      <User className="h-3 w-3 text-orange-600" />
                                    </div>
                                    <span className="font-medium">{person.name}</span>
                                    <span className="text-xs text-slate-500 font-medium">({person.employeeId})</span>
                                  </div>
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

                {/* 備註資訊區域 - 全新設計 */}
                <div className="p-8 bg-white/80 backdrop-blur-sm rounded-3xl border border-white/40 shadow-lg">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">詳細備註</h3>
                      <p className="text-sm text-slate-600">記錄重要的合作資訊與特殊事項</p>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-sm font-bold text-purple-600 uppercase tracking-wide">
                          備註內容
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="在此記錄供應商的特殊要求、合作條件、付款方式、交貨時間、品質標準或其他重要事項..."
                            className="min-h-[140px] resize-none bg-white/90 border-purple-200/50 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl text-base shadow-sm transition-all duration-200 leading-relaxed"
                            {...field} 
                          />
                        </FormControl>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>支援換行格式</span>
                          <span>{field.value?.length || 0} / 2000 字元</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

              </form>
            </Form>
          </div>
          
          {/* 底部操作區域 */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-200/50 bg-white/50 px-2">
            <div className="text-xs text-slate-500">
              * 必填欄位 | 資料將即時同步至雲端
            </div>
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl"
              >
                取消
              </Button>
              <Button 
                form="supplier-form"
                type="submit" 
                disabled={apiClient.loading}
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6"
              >
                {apiClient.loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    處理中...
                  </div>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    {isEditMode ? "更新資料" : "建立供應商"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
