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

import { MaterialIcon } from '@/components/ui/material-icon';

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
  
  const isEditMode = !!materialData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      subCategory: '',
      supplierId: 'none',
      safetyStockLevel: 0,
      costPerUnit: 0,
      unit: '',
      notes: '',
    },
  });

  // 監聽分類變化，自動生成代號
  const watchCategory = form.watch('category');
  const watchSubCategory = form.watch('subCategory');
  const [generatedCode, setGeneratedCode] = useState<string>('');

  // 當分類改變時，自動生成新的代號
  useEffect(() => {
    if (watchCategory && watchSubCategory && !isEditMode) {
      // 在新增模式下，當分類改變時生成新的代號
      const generateCode = async () => {
        try {
          const { generateUniqueMaterialCode } = await import('@/lib/utils');
          const mainCategoryId = await getCategoryId(watchCategory);
          const subCategoryId = await getSubCategoryId(watchSubCategory);
          const newCode = await generateUniqueMaterialCode(mainCategoryId, subCategoryId, db);
          setGeneratedCode(newCode);
        } catch (error) {
          console.error('生成物料代號失敗:', error);
          setGeneratedCode('生成失敗');
        }
      };
      generateCode();
    }
  }, [watchCategory, watchSubCategory, isEditMode]);

  // 獲取主分類ID
  const getCategoryId = async (categoryName: string): Promise<string> => {
    try {
      if (!db) {
        throw new Error('Firebase 未初始化');
      }
      
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const categoryQuery = query(collection(db, 'materialCategories'), where('name', '==', categoryName));
      const categorySnapshot = await getDocs(categoryQuery);
      
      if (!categorySnapshot.empty) {
        return categorySnapshot.docs[0].data().id || 'XX';
      }
      
      // 如果沒有找到，生成新的ID
      const { generateCategoryId } = await import('@/lib/utils');
      return generateCategoryId();
    } catch (error) {
      console.error('獲取主分類ID失敗:', error);
      return 'XX';
    }
  };

  // 獲取細分分類ID
  const getSubCategoryId = async (subCategoryName: string): Promise<string> => {
    try {
      if (!db) {
        throw new Error('Firebase 未初始化');
      }
      
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const subCategoryQuery = query(collection(db, 'materialSubCategories'), where('name', '==', subCategoryName));
      const subCategorySnapshot = await getDocs(subCategoryQuery);
      
      if (!subCategorySnapshot.empty) {
        return subCategorySnapshot.docs[0].data().id || '000';
      }
      
      // 如果沒有找到，生成新的ID
      const { generateSubCategoryId } = await import('@/lib/utils');
      return generateSubCategoryId();
    } catch (error) {
      console.error('獲取細分分類ID失敗:', error);
      return '000';
    }
  };

  // 解析並顯示代碼結構
  const renderCodeStructure = (code: string) => {
    if (code.length !== 9) {
      return <span className="text-muted-foreground">等待生成...</span>;
    }
    
    const mainCategoryId = code.substring(0, 2);
    const subCategoryId = code.substring(2, 5);
    const randomCode = code.substring(5, 9);
    
    return (
      <div className="flex items-center gap-1 text-sm font-mono">
        <span className="bg-blue-100 text-blue-800 px-1 rounded">{mainCategoryId}</span>
        <span className="text-muted-foreground">+</span>
        <span className="bg-green-100 text-green-800 px-1 rounded">{subCategoryId}</span>
        <span className="text-muted-foreground">+</span>
        <span className="bg-purple-100 text-purple-800 px-1 rounded">{randomCode}</span>
      </div>
    );
  };

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
        supplierId: materialData.supplierRef?.id || 'none',
        safetyStockLevel: materialData.safetyStockLevel || 0,
        costPerUnit: materialData.costPerUnit || 0,
        unit: materialData.unit || '',
        notes: materialData.notes || '',
      };
      form.reset(formData);
      setGeneratedCode(materialData.code || '');
    } else if (isOpen && !materialData) {
      form.reset();
      setGeneratedCode('');
    }
  }, [isOpen, materialData, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    const toastId = toast.loading(isEditMode ? '正在更新物料...' : '正在新增物料...');

    try {
      const functions = getFunctions();
      
      if (isEditMode && materialData) {
        const updateMaterial = httpsCallable(functions, 'updateMaterial');
        await updateMaterial({
          materialId: materialData.id,
          ...data,
          supplierId: data.supplierId === 'none' ? undefined : data.supplierId
        });
        toast.success(`物料 ${data.name} 已成功更新。`, { id: toastId });
      } else {
              const createMaterial = httpsCallable(functions, 'createMaterial');
      await createMaterial({
        ...data,
        supplierId: data.supplierId === 'none' ? undefined : data.supplierId
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            {isEditMode ? '編輯物料' : '新增物料'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            {isEditMode ? '修改物料詳細資訊' : '建立新的物料資料'}
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
                      <FormLabel className="text-sm font-semibold text-gray-700">物料名稱 *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="例如：高級香精 A" 
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <MaterialIcon category={watchCategory || 'default'} size="lg" />
                  </div>
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-foreground">主分類 *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="border-input focus:border-primary focus:ring-primary">
                                <SelectValue placeholder="選擇主分類" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  <div className="flex items-center gap-2">
                                    <MaterialIcon category={category} size="sm" />
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
                      <FormLabel className="text-sm font-semibold text-foreground">細分分類 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                                                        <SelectTrigger className="border-input focus:border-primary focus:ring-primary">
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
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-foreground">物料代號</label>
                    <div className="mt-1 p-3 bg-muted border border-border rounded-md">
                      {isEditMode ? (
                        <div>
                          <div className="text-sm font-mono mb-1">{materialData?.code}</div>
                          {renderCodeStructure(materialData?.code || '')}
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm font-mono mb-1">{generatedCode || '等待選擇分類...'}</div>
                          {renderCodeStructure(generatedCode)}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        <div>格式：主分類ID(2位字母) + 細分分類ID(3位數字) + 隨機碼(4位數字)</div>
                        <div>例如：AB1234567</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 供應商資訊 */}
            <div className="space-y-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
              <h3 className="text-xl font-bold flex items-center gap-3 text-green-800">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Building className="h-4 w-4 text-green-600" />
                </div>
                供應商資訊
              </h3>
              
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">供應商</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-input focus:border-success focus:ring-success">
                          <SelectValue placeholder="選擇供應商" />
                        </SelectTrigger>
                      </FormControl>
                                              <SelectContent>
                          <SelectItem value="none">無供應商</SelectItem>
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
            <div className="space-y-6 p-6 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200 shadow-sm">
              <h3 className="text-xl font-bold flex items-center gap-3 text-purple-800">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
                庫存與成本
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="safetyStockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">安全庫存</FormLabel>
                      <FormControl>
                                                  <Input 
                            type="number" 
                            placeholder="0" 
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
                  name="costPerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">單位成本</FormLabel>
                      <FormControl>
                                                  <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
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
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">單位</FormLabel>
                      <FormControl>
                                                  <Input 
                            placeholder="例如：kg, 個, 包" 
                            className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
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
            <div className="space-y-6 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 shadow-sm">
              <h3 className="text-xl font-bold flex items-center gap-3 text-yellow-800">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Package className="h-4 w-4 text-yellow-600" />
                </div>
                備註資訊
              </h3>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">備註</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="請輸入物料相關的備註資訊..." 
                        className="min-h-[100px] resize-none border-gray-300 focus:border-yellow-500 focus:ring-yellow-500"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 操作按鈕 */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                取消
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    處理中...
                  </div>
                ) : (
                  isEditMode ? "更新物料" : "新增物料"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
