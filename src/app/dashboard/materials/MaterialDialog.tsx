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
import { generateUniqueMaterialCode, getCategoryIcon, getCategoryColor } from '@/lib/utils';

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
import { Textarea } from '@/components/ui/textarea';
import { Package, Building, DollarSign, Shield, Hash, Tag } from 'lucide-react';

// Zod schema for form validation
const formSchema = z.object({
  name: z.string().min(2, { message: '物料名稱至少需要 2 個字元' }),
  category: z.string().min(1, { message: '請選擇主分類' }),
  subCategory: z.string().min(1, { message: '請選擇細分分類' }),
  supplierId: z.string().optional(),
  safetyStockLevel: z.coerce.number({ message: '安全庫存必須為數字' }).optional(),
  costPerUnit: z.coerce.number().min(0, { message: '單位成本不能為負數' }).optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
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
  notes?: string;
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
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [categoryIcon, setCategoryIcon] = useState<string>('📦');
  const [bgColor, setBgColor] = useState<string>('bg-blue-100');
  const isEditMode = !!materialData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      subCategory: '',
      supplierId: '',
      safetyStockLevel: 0,
      costPerUnit: 0,
      unit: '',
      notes: '',
    },
  });

  // 監聽分類變化，自動生成代號
  const watchCategory = form.watch('category');
  const watchSubCategory = form.watch('subCategory');

  useEffect(() => {
    if (watchCategory && watchSubCategory && !isEditMode) {
      const generateCode = async () => {
        try {
          const code = await generateUniqueMaterialCode(watchCategory, watchSubCategory, db);
          setGeneratedCode(code);
        } catch (error) {
          console.error('生成物料代號失敗:', error);
          // 使用本地生成作為備用
          const fallbackCode = `${watchCategory.substring(0, 2).toUpperCase()}${watchSubCategory.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 90) + 10}`;
          setGeneratedCode(fallbackCode);
        }
      };
      generateCode();
    }
  }, [watchCategory, watchSubCategory, isEditMode]);

  // 更新分類圖示和背景顏色
  useEffect(() => {
    if (watchCategory) {
      setCategoryIcon(getCategoryIcon(watchCategory));
      setBgColor(getCategoryColor(watchCategory));
    }
  }, [watchCategory]);

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
      const formData = {
        name: materialData.name || '',
        category: materialData.category || '',
        subCategory: materialData.subCategory || '',
        supplierId: materialData.supplierRef?.id || '',
        safetyStockLevel: materialData.safetyStockLevel || 0,
        costPerUnit: materialData.costPerUnit || 0,
        unit: materialData.unit || '',
        notes: materialData.notes || '',
      };
      form.reset(formData);
      setGeneratedCode(materialData.code || '');
      setCategoryIcon(getCategoryIcon(materialData.category || ''));
      setBgColor(getCategoryColor(materialData.category || ''));
    } else if (isOpen && !materialData) {
      form.reset();
      setGeneratedCode('');
      setCategoryIcon('📦');
      setBgColor('bg-blue-100');
    }
  }, [isOpen, materialData, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    const toastId = toast.loading(isEditMode ? '正在更新物料...' : '正在新增物料...');

    try {
      const functions = getFunctions();
      
      // 使用生成的代號或現有代號
      const finalCode = isEditMode ? materialData?.code : generatedCode;
      
      if (isEditMode && materialData) {
        const updateMaterial = httpsCallable(functions, 'updateMaterial');
        await updateMaterial({
          materialId: materialData.id,
          code: finalCode,
          ...data
        });
        toast.success(`物料 ${data.name} 已成功更新。`, { id: toastId });
      } else {
        const createMaterial = httpsCallable(functions, 'createMaterial');
        await createMaterial({
          code: finalCode,
          ...data
        });
        toast.success(`物料 ${data.name} 已成功建立。`, { id: toastId });
      }
      
      onMaterialUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting material form:', error);
      let errorMessage = isEditMode ? '更新物料時發生錯誤。' : '新增物料時發生錯誤。';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEditMode ? '編輯物料' : '新增物料'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? '修改物料詳細資訊' : '建立新的物料資料'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本資料 */}
            <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-800">
                <Tag className="h-4 w-4" />
                基本資料
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>物料名稱 *</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：高級香精 A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center text-2xl`}>
                    {categoryIcon}
                  </div>
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>主分類 *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="選擇主分類" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{getCategoryIcon(category)}</span>
                                    <span>{category}</span>
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

                <FormField
                  control={form.control}
                  name="subCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>細分分類 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="選擇細分分類" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subCategories.map((subCategory) => (
                            <SelectItem key={subCategory} value={subCategory}>
                              {subCategory}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-500" />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">物料代號</label>
                    <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded-md text-sm font-mono">
                      {generatedCode || '選擇分類後自動生成'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 供應商資訊 */}
            <div className="space-y-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-green-800">
                <Building className="h-4 w-4" />
                供應商資訊
              </h3>
              
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>供應商</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="選擇供應商" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">無供應商</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 庫存與成本 */}
            <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-purple-800">
                <Shield className="h-4 w-4" />
                庫存與成本
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="safetyStockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>安全庫存</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
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
                      <FormLabel>單位成本</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>單位</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：kg, 個, 包" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 備註 */}
            <div className="space-y-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-yellow-800">
                <Package className="h-4 w-4" />
                備註資訊
              </h3>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>備註</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="請輸入物料相關的備註資訊..." 
                        className="min-h-[100px] resize-none"
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
