// src/app/dashboard/suppliers/SupplierDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [personnelList, setPersonnelList] = useState<PersonnelData[]>([]);
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
    setIsSubmitting(true);
    const toastId = toast.loading(isEditMode ? '正在更新供應商...' : '正在新增供應商...');

    try {
      const functions = getFunctions();
      console.log('提交的資料:', values); // 調試日誌
      
      if (isEditMode) {
        // Call updateSupplier Cloud Function
        const updateSupplier = httpsCallable(functions, 'updateSupplier');
        const result = await updateSupplier({ supplierId: supplierData.id, ...values });
        console.log('更新結果:', result); // 調試日誌
        toast.success(`供應商 ${values.name} 的資料已成功更新。`, { id: toastId });
      } else {
        // Call createSupplier Cloud Function
        const createSupplier = httpsCallable(functions, 'createSupplier');
        const result = await createSupplier(values);
        console.log('建立結果:', result); // 調試日誌
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby="supplier-dialog-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {isEditMode ? '編輯供應商資料' : '新增供應商'}
          </DialogTitle>
          <DialogDescription id="supplier-dialog-description">
            {isEditMode ? '修改供應商的詳細聯絡資訊。' : '請填寫新供應商的詳細聯絡資訊。'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本資料 */}
            <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-800">
                <Building className="h-4 w-4" />
                基本資料
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>供應商名稱 *</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：ABC 原料公司" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="products"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>供應商品</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：香精、原料、包材" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 聯絡資訊 */}
            <div className="space-y-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-green-800">
                <User className="h-4 w-4" />
                聯絡資訊
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactWindow"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>聯絡窗口</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：王經理" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>聯絡方式</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="例如：02-12345678 或 Line ID" 
                          {...field} 
                          className="border-green-300 focus:border-green-500 focus:ring-green-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="liaisonPersonId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>對接人員</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="選擇對接人員" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {personnelList.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              <div className="flex items-center gap-2">
                                <span>{person.name}</span>
                                <span className="text-xs text-gray-500">({person.employeeId})</span>
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

            {/* 備註資訊 */}
            <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-purple-800">
                <Package className="h-4 w-4" />
                備註資訊
              </h3>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>詳細備註</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="請輸入供應商相關的詳細備註資料..." 
                        className="min-h-[120px] resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 操作按鈕 */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                {isSubmitting ? "處理中..." : (isEditMode ? "更新" : "新增")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
