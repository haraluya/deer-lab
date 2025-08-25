// src/app/dashboard/materials/MaterialDialog.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


// Zod schema for form validation
const formSchema = z.object({
  code: z.string().min(1, { message: '物料代號為必填欄位' }),
  name: z.string().min(2, { message: '物料名稱至少需要 2 個字元' }),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  supplierId: z.string().optional(), // We'll pass the supplier's document ID
  safetyStockLevel: z.coerce.number().min(0, { message: '安全庫存不能為負數' }).optional(),
  costPerUnit: z.coerce.number().min(0, { message: '單位成本不能為負數' }).optional(),
  unit: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Data structure for a single supplier (for the dropdown)
interface Supplier {
  id: string;
  name: string;
}

// Data structure for a material
export interface MaterialData extends DocumentData {
  id: string;
  code: string;
  name: string;
  category?: string;
  subCategory?: string;
  supplierRef?: DocumentReference;
  safetyStockLevel?: number;
  costPerUnit?: number;
  unit?: string;
  currentStock: number;
}

interface MaterialDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onMaterialUpdate: () => void;
  materialData?: MaterialData | null;
}

export function MaterialDialog({
  isOpen,
  onOpenChange,
  onMaterialUpdate,
  materialData,
}: MaterialDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const isEditMode = !!materialData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      name: '',
      category: '',
      subCategory: '',
      supplierId: '',
      safetyStockLevel: 0,
      costPerUnit: 0,
      unit: '',
    },
  });

  // Fetch suppliers and categories when the dialog is opened
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          if (!db) {
            throw new Error("Firebase 未初始化")
          }
          
          // Fetch suppliers
          const suppliersCollectionRef = collection(db, 'suppliers');
          const suppliersSnapshot = await getDocs(suppliersCollectionRef);
          const suppliersList = suppliersSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
          })) as Supplier[];
          setSuppliers(suppliersList);

          // Fetch materials to extract categories and subCategories
          const materialsCollectionRef = collection(db, 'materials');
          const materialsSnapshot = await getDocs(materialsCollectionRef);
          const categorySet = new Set<string>();
          const subCategorySet = new Set<string>();
          
          materialsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.category) categorySet.add(data.category);
            if (data.subCategory) subCategorySet.add(data.subCategory);
          });
          
          setCategories(Array.from(categorySet).sort());
          setSubCategories(Array.from(subCategorySet).sort());
        } catch (error) {
          console.error("Failed to fetch data:", error);
          toast.error("讀取資料失敗。");
        }
      };
      fetchData();
    }
  }, [isOpen]);

  // Populate form when in edit mode
  useEffect(() => {
    if (isOpen && materialData) {
      form.reset({
        code: materialData.code || '',
        name: materialData.name || '',
        category: materialData.category || '',
        subCategory: materialData.subCategory || '',
        supplierId: materialData.supplierRef?.id || '',
        safetyStockLevel: materialData.safetyStockLevel || 0,
        costPerUnit: materialData.costPerUnit || 0,
        unit: materialData.unit || '',
      });
    } else if (isOpen && !materialData) {
      form.reset();
    }
  }, [isOpen, materialData, form]);

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    const toastId = toast.loading(isEditMode ? '正在更新物料...' : '正在新增物料...');

    try {
      const functions = getFunctions();
      if (isEditMode) {
        const updateMaterial = httpsCallable(functions, 'updateMaterial');
        await updateMaterial({ materialId: materialData.id, ...values });
        toast.success(`物料 ${values.name} 的資料已成功更新。`, { id: toastId });
      } else {
        const createMaterial = httpsCallable(functions, 'createMaterial');
        await createMaterial(values);
        toast.success(`物料 ${values.name} 已成功建立。`, { id: toastId });
      }
      
      onMaterialUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting material form:', error);
      let errorMessage = isEditMode ? '更新物料資料時發生錯誤。' : '新增物料時發生錯誤。';
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
       <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-900 shadow-lg rounded-lg" aria-describedby="material-dialog-description">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '編輯物料資料' : '新增物料'}</DialogTitle>
          <DialogDescription id="material-dialog-description">
            {isEditMode ? '修改物料的詳細資訊。' : '請填寫新物料的詳細資訊。'}
          </DialogDescription>
        </DialogHeader>
                 <Form {...form}>
           <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <FormField control={form.control} name="code" render={({ field }) => ( <FormItem><FormLabel>物料代號</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>物料名稱</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField 
              control={form.control} 
              name="category" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>分類</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇分類" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />
            <FormField 
              control={form.control} 
              name="subCategory" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>細分分類</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇細分分類" />
                      </SelectTrigger>
                      <SelectContent>
                        {subCategories.map((subCat) => (
                          <SelectItem key={subCat} value={subCat}>
                            {subCat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />
            <FormField control={form.control} name="supplierId" render={({ field }) => ( <FormItem><FormLabel>供應商</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="選擇一個供應商" /></SelectTrigger></FormControl><SelectContent>{suppliers.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="safetyStockLevel" render={({ field }) => ( <FormItem><FormLabel>安全庫存</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="costPerUnit" render={({ field }) => ( <FormItem><FormLabel>單位成本</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="unit" render={({ field }) => ( <FormItem><FormLabel>單位</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="選擇單位" /></SelectTrigger></FormControl><SelectContent><SelectItem value="kg">kg</SelectItem><SelectItem value="張">張</SelectItem><SelectItem value="個">個</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                         <Button type="submit" disabled={isSubmitting} className="w-full mt-4 col-span-full">
              {isSubmitting ? '處理中...' : (isEditMode ? '儲存更新' : '確認新增')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
