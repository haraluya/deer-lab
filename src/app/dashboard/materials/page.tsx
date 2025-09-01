'use client';

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, DocumentReference, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { CartItem } from '@/types';
import { useGlobalCart } from '@/hooks/useGlobalCart';

import { MaterialDialog, MaterialData } from './MaterialDialog';
import { MaterialCategoryDialog } from './MaterialCategoryDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MaterialIcon } from '@/components/ui/material-icon';
import { MoreHorizontal, ShoppingCart, ListChecks, Save, X, Loader2, Search, FileSpreadsheet, Eye, Edit, Warehouse, Building, Tag, Package, AlertTriangle, Shield, Plus, Calculator, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/usePermission';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImportExportDialog } from '@/components/ImportExportDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DetailViewDialog } from '@/components/DetailViewDialog';

// 擴展 MaterialData 以包含解析後的供應商名稱
interface MaterialWithSupplier extends MaterialData {
  supplierName: string;
  refPath: string; // 確保文檔路徑存在
}

function MaterialsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart, isLoading: cartLoading } = useGlobalCart();

  const [materials, setMaterials] = useState<MaterialWithSupplier[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<MaterialWithSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialData | null>(null);
  const [purchaseCart, setPurchaseCart] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // --- 盤點功能相關狀態 ---
  const [isStocktakeMode, setIsStocktakeMode] = useState(false);
  const [updatedStocks, setUpdatedStocks] = useState<{ [key: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStocktakeConfirmOpen, setIsStocktakeConfirmOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [selectedDetailMaterial, setSelectedDetailMaterial] = useState<MaterialWithSupplier | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  // -------------------------

  // 權限檢查
  const { hasPermission, isAdmin } = usePermission();
  const canViewMaterials = hasPermission('materials.view') || hasPermission('materials.manage');
  const canManageMaterials = hasPermission('materials.manage');
  
  const fetchSuppliers = useCallback(async () => {
    const suppliersMap = new Map<string, string>();
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      const querySnapshot = await getDocs(collection(db, "suppliers"));
      querySnapshot.forEach((doc) => {
        suppliersMap.set(doc.id, doc.data().name);
      });
    } catch (error) {
      console.error("Failed to fetch suppliers for mapping:", error);
    }
    return suppliersMap;
  }, []);

  const fetchMaterials = useCallback(async (suppliersMap: Map<string, string>) => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      const materialsCollectionRef = collection(db, 'materials');
      const materialsSnapshot = await getDocs(materialsCollectionRef);
      
      const materialsList = materialsSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        const supplierRef = data.supplierRef as DocumentReference | undefined;
        const supplierName = supplierRef ? suppliersMap.get(supplierRef.id) || '讀取失敗' : '未指定';
        
        return {
          id: doc.id,
          refPath: doc.ref.path,
          code: data.code,
          name: data.name,
          category: data.category,
          subCategory: data.subCategory,
          supplierRef: data.supplierRef,
          supplierName,
          safetyStockLevel: data.safetyStockLevel || 0,
          costPerUnit: data.costPerUnit || 0,
          unit: data.unit,
          currentStock: data.currentStock || 0,
          notes: data.notes,
        };
      }) as MaterialWithSupplier[];
      
      // 排序：先按主分類，再按細分分類，最後按物料名稱（升序）
      materialsList.sort((a, b) => {
        // 第一級排序：主分類
        const categoryA = a.category || '';
        const categoryB = b.category || '';
        if (categoryA !== categoryB) {
          return categoryA.localeCompare(categoryB, 'zh-TW');
        }
        
        // 第二級排序：細分分類
        const subCategoryA = a.subCategory || '';
        const subCategoryB = b.subCategory || '';
        if (subCategoryA !== subCategoryB) {
          return subCategoryA.localeCompare(subCategoryB, 'zh-TW');
        }
        
        // 第三級排序：物料名稱
        return a.name.localeCompare(b.name, 'zh-TW');
      });
      
      setMaterials(materialsList);
    } catch (error) {
      console.error("Failed to fetch materials:", error);
      toast.error("讀取物料資料失敗。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 檢查是否低於安全庫存
  const isLowStock = (material: MaterialWithSupplier) => {
    return (material.currentStock || 0) < (material.safetyStockLevel || 0);
  };

  // 計算低於安全庫存的物料數量
  const getLowStockCount = () => {
    return materials.filter(material => isLowStock(material)).length;
  };

  // 獲取所有分類和子分類
  const getAllCategories = () => {
    const categorySet = new Set<string>();
    const subCategorySet = new Set<string>();
    
    materials.forEach(material => {
      if (material.category) categorySet.add(material.category);
      if (material.subCategory) subCategorySet.add(material.subCategory);
    });
    
    return {
      categories: Array.from(categorySet).sort(),
      subCategories: Array.from(subCategorySet).sort()
    };
  };

  // 高效篩選算法：使用 Map 和 Set 進行快速查找
  const getAvailableFilterOptions = useCallback(() => {
    // 使用 Map 建立分類關係索引，提升查找效率
    const categoryToSubCategories = new Map<string, Set<string>>();
    const subCategoryToCategories = new Map<string, Set<string>>();
    
    // 建立索引關係（只執行一次）
    materials.forEach(material => {
      if (material.category && material.subCategory) {
        // 主分類 -> 子分類映射
        if (!categoryToSubCategories.has(material.category)) {
          categoryToSubCategories.set(material.category, new Set());
        }
        categoryToSubCategories.get(material.category)!.add(material.subCategory);
        
        // 子分類 -> 主分類映射
        if (!subCategoryToCategories.has(material.subCategory)) {
          subCategoryToCategories.set(material.subCategory, new Set());
        }
        subCategoryToCategories.get(material.subCategory)!.add(material.category);
      }
    });

    // 根據搜尋條件快速篩選
    let searchFilteredMaterials = materials;
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      searchFilteredMaterials = materials.filter(material => {
        return material.name.toLowerCase().includes(searchLower) ||
               material.code.toLowerCase().includes(searchLower) ||
               material.category?.toLowerCase().includes(searchLower) ||
               material.subCategory?.toLowerCase().includes(searchLower) ||
               material.supplierName.toLowerCase().includes(searchLower);
      });
    }

    // 從搜尋結果中提取可用的分類
    const availableCategories = new Set<string>();
    const availableSubCategories = new Set<string>();
    
    searchFilteredMaterials.forEach(material => {
      if (material.category) availableCategories.add(material.category);
      if (material.subCategory) availableSubCategories.add(material.subCategory);
    });

    // 根據當前選擇進行智能篩選
    let finalCategories = new Set<string>();
    let finalSubCategories = new Set<string>();

    if (selectedCategory && selectedSubCategory) {
      // 兩個都選了：檢查組合是否有效
      const subCats = categoryToSubCategories.get(selectedCategory);
      const cats = subCategoryToCategories.get(selectedSubCategory);
      
      if (subCats?.has(selectedSubCategory) && cats?.has(selectedCategory)) {
        // 組合有效：只顯示選中的標籤
        finalCategories.add(selectedCategory);
        finalSubCategories.add(selectedSubCategory);
      } else {
        // 組合無效：分別處理每個選擇
        if (selectedCategory) {
          finalCategories.add(selectedCategory);
          const subCats = categoryToSubCategories.get(selectedCategory);
          if (subCats) {
            subCats.forEach(subCat => {
              if (availableSubCategories.has(subCat)) {
                finalSubCategories.add(subCat);
              }
            });
          }
        }
        
        if (selectedSubCategory) {
          finalSubCategories.add(selectedSubCategory);
          const cats = subCategoryToCategories.get(selectedSubCategory);
          if (cats) {
            cats.forEach(cat => {
              if (availableCategories.has(cat)) {
                finalCategories.add(cat);
              }
            });
          }
        }
      }
    } else if (selectedCategory) {
      // 只選了主分類：顯示該主分類和相關的子分類
      finalCategories.add(selectedCategory);
      const subCats = categoryToSubCategories.get(selectedCategory);
      if (subCats) {
        subCats.forEach(subCat => {
          if (availableSubCategories.has(subCat)) {
            finalSubCategories.add(subCat);
          }
        });
      }
    } else if (selectedSubCategory) {
      // 只選了子分類：顯示該子分類和相關的主分類
      finalSubCategories.add(selectedSubCategory);
      const cats = subCategoryToCategories.get(selectedSubCategory);
      if (cats) {
        cats.forEach(cat => {
          if (availableCategories.has(cat)) {
            finalCategories.add(cat);
          }
        });
      }
    } else {
      // 都沒選：顯示所有可用的分類
      finalCategories = availableCategories;
      finalSubCategories = availableSubCategories;
    }

    return {
      categories: Array.from(finalCategories).sort(),
      subCategories: Array.from(finalSubCategories).sort()
    };
  }, [materials, searchTerm, selectedCategory, selectedSubCategory, showLowStockOnly]);

  // 處理查看詳情
  const handleViewDetail = (material: MaterialWithSupplier) => {
    setSelectedDetailMaterial(material);
    setIsDetailViewOpen(true);
  };

  // 處理編輯
  const handleEdit = (material: MaterialData) => {
    setSelectedMaterial(material);
    setIsDialogOpen(true);
  };

  // 處理刪除
  const handleDelete = (material: MaterialData) => {
    setSelectedMaterial(material);
    setIsConfirmOpen(true);
  };

  // 處理確認刪除
  const handleConfirmDelete = async () => {
    if (!selectedMaterial) return;

    try {
      const functions = getFunctions();
      const deleteMaterial = httpsCallable(functions, 'deleteMaterial');
      await deleteMaterial({ materialId: selectedMaterial.id });
      
      toast.success(`物料 ${selectedMaterial.name} 已成功刪除。`);
      const suppliersMap = await fetchSuppliers();
      await fetchMaterials(suppliersMap);
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('刪除物料時發生錯誤。');
    } finally {
      setIsConfirmOpen(false);
      setSelectedMaterial(null);
    }
  };

  // 處理批量刪除
  const handleBatchDelete = async () => {
    if (purchaseCart.size === 0) {
      toast.info("請至少選擇一個物料進行刪除。");
      return;
    }

    try {
      const functions = getFunctions();
      const deleteMaterial = httpsCallable(functions, 'deleteMaterial');
      
      const selectedMaterials = materials.filter(m => purchaseCart.has(m.id));
      const toastId = toast.loading(`正在刪除 ${selectedMaterials.length} 個物料...`);
      
      for (const material of selectedMaterials) {
        await deleteMaterial({ materialId: material.id });
      }
      
      toast.success(`成功刪除 ${selectedMaterials.length} 個物料。`, { id: toastId });
      setPurchaseCart(new Set());
      const suppliersMap = await fetchSuppliers();
      await fetchMaterials(suppliersMap);
    } catch (error) {
      console.error('Error batch deleting materials:', error);
      toast.error('批量刪除物料時發生錯誤。');
    } finally {
      setIsBatchDeleteOpen(false);
    }
  };

  // 處理搜尋和篩選
  const handleSearchAndFilter = useCallback(() => {
    let filtered = materials;

    // 搜尋篩選
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      console.log('搜尋條件:', searchLower);
      
      filtered = filtered.filter(material => {
        const nameMatch = material.name.toLowerCase().includes(searchLower);
        const codeMatch = material.code.toLowerCase().includes(searchLower);
        const categoryMatch = material.category?.toLowerCase().includes(searchLower);
        const subCategoryMatch = material.subCategory?.toLowerCase().includes(searchLower);
        const supplierMatch = material.supplierName.toLowerCase().includes(searchLower);
        
        const isMatch = nameMatch || codeMatch || categoryMatch || subCategoryMatch || supplierMatch;
        
        if (isMatch) {
          console.log('找到匹配:', material.name, {
            nameMatch,
            codeMatch,
            categoryMatch,
            subCategoryMatch,
            supplierMatch
          });
        }
        
        return isMatch;
      });
    }

    // 主分類篩選
    if (selectedCategory) {
      filtered = filtered.filter(material => material.category === selectedCategory);
    }

    // 子分類篩選
    if (selectedSubCategory) {
      filtered = filtered.filter(material => material.subCategory === selectedSubCategory);
    }

    // 低於安全庫存篩選
    if (showLowStockOnly) {
      filtered = filtered.filter(material => isLowStock(material));
    }

    // 排序：先按主分類，再按細分分類，最後按物料名稱（升序）
    filtered.sort((a, b) => {
      // 第一級排序：主分類
      const categoryA = a.category || '';
      const categoryB = b.category || '';
      if (categoryA !== categoryB) {
        return categoryA.localeCompare(categoryB, 'zh-TW');
      }
      
      // 第二級排序：細分分類
      const subCategoryA = a.subCategory || '';
      const subCategoryB = b.subCategory || '';
      if (subCategoryA !== subCategoryB) {
        return subCategoryA.localeCompare(subCategoryB, 'zh-TW');
      }
      
      // 第三級排序：物料名稱
      return a.name.localeCompare(b.name, 'zh-TW');
    });

    console.log('篩選結果:', {
      searchTerm: searchTerm.trim(),
      totalMaterials: materials.length,
      filteredCount: filtered.length,
      selectedCategory,
      selectedSubCategory
    });

    setFilteredMaterials(filtered);
  }, [materials, searchTerm, selectedCategory, selectedSubCategory, showLowStockOnly]);

  // 處理搜尋 - 移除延遲
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // 立即執行篩選，不使用延遲
    handleSearchAndFilter();
  };

  // 處理分類篩選
  const handleCategoryFilter = (category: string) => {
    const newCategory = selectedCategory === category ? "" : category;
    setSelectedCategory(newCategory);
    
    // 如果取消選取主分類，保留子分類，讓篩選邏輯自動處理
    // 不再自動清除子分類
  };

  // 處理子分類篩選
  const handleSubCategoryFilter = (subCategory: string) => {
    const newSubCategory = selectedSubCategory === subCategory ? "" : subCategory;
    setSelectedSubCategory(newSubCategory);
    
    // 如果取消選取子分類，保留主分類，讓篩選邏輯自動處理
    // 不再自動清除主分類
  };

  // 處理低於安全庫存篩選
  const handleLowStockFilter = () => {
    setShowLowStockOnly(!showLowStockOnly);
  };

  // 處理新增物料
  const handleAdd = () => {
    setSelectedMaterial(null);
    setIsDialogOpen(true);
  };

  // 處理物料更新
  const handleMaterialUpdate = async () => {
    const suppliersMap = await fetchSuppliers();
    await fetchMaterials(suppliersMap);
  };

  // 購物車相關功能
  const handleCartToggle = (materialId: string) => {
    setPurchaseCart(prevCart => {
      const newCart = new Set(prevCart);
      if (newCart.has(materialId)) {
        newCart.delete(materialId);
      } else {
        newCart.add(materialId);
      }
      return newCart;
    });
  };
  
  // 添加到採購車
  const addToPurchaseCart = async (material: MaterialWithSupplier) => {
    try {
      const cartItem = {
        id: material.id,
        name: material.name,
        code: material.code,
        type: 'material' as const,
        supplierId: material.supplierRef?.id || '',
        supplierName: material.supplierName || '未指定',
        unit: material.unit || '',
        quantity: 1,
        costPerUnit: material.costPerUnit || 0,
        price: material.costPerUnit || 0,
        currentStock: material.currentStock || 0,
      };

      await addToCart(cartItem);
      toast.success(`已將 ${material.name} 加入採購車`);
    } catch (error) {
      console.error("添加到採購車失敗:", error);
      toast.error("添加到採購車失敗");
    }
  };
  
  const handleAddToPurchaseCart = async () => {
    if (purchaseCart.size === 0) {
      toast.info("請至少選擇一個物料加入採購車。");
      return;
    }
    
    try {
      // 獲取選中的物料資料
      const selectedMaterials = materials.filter(m => purchaseCart.has(m.id));
      
      // 將選中的物料逐一加入全域採購車
      for (const material of selectedMaterials) {
        const cartItem = {
          id: material.id,
          name: material.name,
          code: material.code,
          type: 'material' as const,
          supplierId: material.supplierRef?.id || '',
          supplierName: material.supplierName || '未指定',
          unit: material.unit || '',
          quantity: 1,
          costPerUnit: material.costPerUnit || 0,
          price: material.costPerUnit || 0,
          currentStock: material.currentStock || 0,
        };
        
        await addToCart(cartItem);
      }
      
      toast.success(`已將 ${selectedMaterials.length} 個物料加入採購車`);
      setPurchaseCart(new Set()); // 清空選中的項目
    } catch (error) {
      console.error("加入採購車失敗:", error);
      toast.error("加入採購車失敗");
    }
  };

  // 盤點功能相關函式
  const handleStockChange = (id: string, value: number) => {
    setUpdatedStocks(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveStocktake = async () => {
    const changedItems = materials
      .filter(m => updatedStocks[m.id] !== undefined && updatedStocks[m.id] !== m.currentStock)
      .map(m => ({
        itemRefPath: `materials/${m.id}`,
        currentStock: m.currentStock,
        newStock: updatedStocks[m.id],
      }));

    if (changedItems.length === 0) {
      toast.info("庫存數量沒有變更，無需儲存。");
      setIsStocktakeMode(false);
      setUpdatedStocks({});
      return;
    }

    // 顯示確認對話框
    setIsStocktakeConfirmOpen(true);
  };

  const handleConfirmStocktake = async () => {
    const changedItems = materials
      .filter(m => updatedStocks[m.id] !== undefined && updatedStocks[m.id] !== m.currentStock)
      .map(m => ({
        itemRefPath: `materials/${m.id}`,
        currentStock: m.currentStock,
        newStock: updatedStocks[m.id],
      }));

    const toastId = toast.loading("正在儲存盤點結果...");
    try {
      const functions = getFunctions();
      const performStocktake = httpsCallable(functions, 'performStocktake');
      await performStocktake({ items: changedItems });
      
      toast.success("盤點結果儲存成功，庫存已更新。", { id: toastId });
      setUpdatedStocks({});
      setIsStocktakeMode(false);
      setIsStocktakeConfirmOpen(false);
      const suppliersMap = await fetchSuppliers();
      await fetchMaterials(suppliersMap);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "儲存盤點失敗";
      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleCancelStocktake = () => {
    setUpdatedStocks({});
    setIsStocktakeMode(false);
  };

  useEffect(() => {
    const loadData = async () => {
      const suppliersMap = await fetchSuppliers();
      await fetchMaterials(suppliersMap);
    };
    loadData();
  }, [fetchMaterials, fetchSuppliers]);

  // 處理 URL 查詢參數
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && materials.length > 0) {
      const materialToEdit = materials.find(m => m.id === editId);
      if (materialToEdit) {
        setSelectedMaterial(materialToEdit);
        setIsDialogOpen(true);
        // 清除 URL 中的 edit 參數
        router.replace('/dashboard/materials');
      }
    }
  }, [searchParams, materials, router]);

  // 當篩選條件或資料變化時，重新應用篩選和排序
  useEffect(() => {
    if (materials.length > 0) {
      handleSearchAndFilter();
    }
  }, [materials, handleSearchAndFilter]);

  const { categories, subCategories } = useMemo(() => getAvailableFilterOptions(), [getAvailableFilterOptions]);

  // 權限保護：如果沒有查看權限，顯示無權限頁面
  if (!canViewMaterials && !isAdmin()) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="max-w-2xl mx-auto">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            您沒有權限查看原料庫頁面。請聯繫系統管理員獲取相關權限。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 materials-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-orange-600">
            {isStocktakeMode ? "盤點模式中" : "原料庫"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isStocktakeMode ? "進行庫存盤點作業" : "管理系統中的所有物料資料"}
          </p>
        </div>
      </div>

      {/* 手機版功能按鈕區域 */}
      <div className="lg:hidden mb-6">
        <div className="grid grid-cols-2 gap-3 mb-3">
          {isStocktakeMode ? (
            <>
              <Button onClick={handleSaveStocktake} className="w-full">
                <Package className="mr-2 h-4 w-4" />
                儲存盤點
              </Button>
              <Button variant="outline" onClick={handleCancelStocktake} className="w-full">
                取消
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)} className="w-full">
                <FolderOpen className="mr-2 h-4 w-4" />
                物料分類
              </Button>
              <Button variant="outline" onClick={() => setIsImportExportOpen(true)} className="w-full">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                匯入/匯出
              </Button>

              <Button variant="outline" onClick={() => setIsStocktakeMode(true)} className="w-full">
                <Calculator className="mr-2 h-4 w-4" />
                盤點模式
              </Button>
              <Button 
                onClick={handleAdd}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                新增物料
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 桌面版功能按鈕區域 */}
      <div className="hidden lg:block mb-6">
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {isStocktakeMode ? (
            <>
              <Button onClick={handleSaveStocktake}>
                <Package className="mr-2 h-4 w-4" />
                儲存盤點
              </Button>
              <Button variant="outline" onClick={handleCancelStocktake}>
                取消
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)}>
                <FolderOpen className="mr-2 h-4 w-4" />
                物料分類
              </Button>
              <Button variant="outline" onClick={() => setIsImportExportOpen(true)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                匯入/匯出
              </Button>

              <Button variant="outline" onClick={() => setIsStocktakeMode(true)}>
                <Calculator className="mr-2 h-4 w-4" />
                盤點模式
              </Button>
              <Button 
                onClick={handleAdd}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                新增物料
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 搜尋框 */}
      <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-orange-50 to-orange-100">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-orange-600" />
            <Input
              placeholder="搜尋物料名稱、代號、分類或供應商..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 border-input focus:border-orange-500 focus:ring-orange-500"
            />
          </div>
        </CardContent>
      </Card>

             {/* 分類標籤 */}
       <div className="mb-6">
         <div className="flex flex-wrap gap-2">
           {/* 安全庫存標籤 */}
           {getLowStockCount() > 0 && (
             <Badge
               variant={showLowStockOnly ? "default" : "secondary"}
               className={`cursor-pointer transition-colors ${
                 showLowStockOnly 
                   ? "bg-red-600 hover:bg-red-700 text-white" 
                   : "bg-red-100 hover:bg-red-200 text-red-800 border-red-300"
               }`}
               onClick={handleLowStockFilter}
             >
               安全庫存 ({getLowStockCount()})
             </Badge>
           )}

           {/* 主分類 */}
           {categories.map((category) => (
             <Badge
               key={category}
               variant={selectedCategory === category ? "default" : "secondary"}
               className={`cursor-pointer transition-colors ${
                 selectedCategory === category 
                   ? "bg-blue-600 hover:bg-blue-700 text-white" 
                   : "bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300"
               }`}
               onClick={() => handleCategoryFilter(category)}
             >
               {category}
             </Badge>
           ))}

           {/* 子分類 */}
           {subCategories.map((subCategory) => (
             <Badge
               key={subCategory}
               variant={selectedSubCategory === subCategory ? "default" : "secondary"}
               className={`cursor-pointer transition-colors ${
                 selectedSubCategory === subCategory 
                   ? "bg-green-600 hover:bg-green-700 text-white" 
                   : "bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
               }`}
               onClick={() => handleSubCategoryFilter(subCategory)}
             >
               {subCategory}
             </Badge>
           ))}
                  </div>
       </div>

       {/* 購物車操作按鈕 - 只有當有項目被勾選時才顯示 */}
       {purchaseCart.size > 0 && !isStocktakeMode && (
         <div className="mb-6">
           <div className="flex items-center gap-2">
             <Button
               variant="outline"
               size="sm"
               onClick={handleAddToPurchaseCart}
               className="flex items-center gap-2"
             >
               <ShoppingCart className="h-4 w-4" />
               加入採購車 ({purchaseCart.size})
             </Button>
             {canManageMaterials && (
               <Button
                 variant="destructive"
                 size="sm"
                 onClick={() => setIsBatchDeleteOpen(true)}
                 className="flex items-center gap-2"
               >
                 <X className="h-4 w-4" />
                 批量刪除 ({purchaseCart.size})
               </Button>
             )}
           </div>
         </div>
       )}

       {/* 載入中 */}
      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-border rounded-full animate-spin border-t-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">載入中...</p>
          </div>
        </div>
      )}

      {/* 物料列表 */}
      {!isLoading && (
        <>
          {/* 手機版卡片列表 */}
          <div className="lg:hidden space-y-4">
            {filteredMaterials.map((material) => (
              <Card 
                key={material.id} 
                className={`relative transition-colors duration-200 ${
                  isLowStock(material) ? "bg-pink-50" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className={`flex-1 ${!isStocktakeMode ? 'cursor-pointer' : ''}`} onClick={!isStocktakeMode ? () => router.push(`/dashboard/materials/${material.id}`) : undefined}>
                      <div className="font-medium text-foreground text-sm">{material.name}</div>
                      <div className="text-xs text-muted-foreground">代號: {material.code}</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewDetail(material)}>
                          <Eye className="mr-2 h-4 w-4" />
                          查看詳情
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(material)}>
                          <Edit className="mr-2 h-4 w-4" />
                          編輯
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(material)} className="text-red-600">
                          <X className="mr-2 h-4 w-4" />
                          刪除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">分類:</span>
                      <div className="flex flex-wrap gap-1">
                        {material.category && (
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300"
                          >
                            {material.category}
                          </Badge>
                        )}
                        {material.subCategory && (
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
                          >
                            {material.subCategory}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {!isStocktakeMode && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">供應商:</span>
                        <span>{material.supplierName}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{isStocktakeMode ? "應有庫存:" : "目前庫存:"}</span>
                      <div className="flex items-center gap-2">
                        <span className={isLowStock(material) ? "text-red-600 font-medium" : ""}>
                          {material.currentStock || 0} {material.unit}
                        </span>
                        {isLowStock(material) && (
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">安全庫存:</span>
                      <span>{material.safetyStockLevel || 0} {material.unit}</span>
                    </div>
                    {!isStocktakeMode && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">成本:</span>
                        <span>${material.costPerUnit || 0}</span>
                      </div>
                    )}
                  </div>

                  {/* 盤點模式下的庫存輸入 */}
                  {isStocktakeMode && (
                    <div className={`mt-3 pt-3 border-t ${
                      (updatedStocks[material.id] ?? material.currentStock ?? 0) > (material.currentStock ?? 0)
                        ? "bg-green-50 -mx-4 -mb-4 px-4 pb-4"
                        : (updatedStocks[material.id] ?? material.currentStock ?? 0) < (material.currentStock ?? 0)
                        ? "bg-pink-50 -mx-4 -mb-4 px-4 pb-4"
                        : ""
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">現有庫存:</span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={updatedStocks[material.id] ?? material.currentStock ?? 0}
                          onChange={(e) => handleStockChange(material.id, Number(e.target.value))}
                          className="w-20 h-8 text-sm"
                        />
                        <span className="text-sm text-muted-foreground">{material.unit}</span>
                      </div>
                    </div>
                  )}

                  {/* 購物車功能 */}
                  {!isStocktakeMode && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={purchaseCart.has(material.id)}
                            onCheckedChange={() => handleCartToggle(material.id)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addToPurchaseCart(material)}
                            disabled={cartLoading}
                            className="h-8 px-2 text-xs border-amber-200 text-amber-600 hover:bg-amber-50"
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            加入採購車
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ${material.costPerUnit || 0}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 桌面版表格 */}
          <div className="hidden lg:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      {!isStocktakeMode && (
                        <div className="flex items-center gap-2" title="全選所有物料">
                          <Checkbox
                            checked={purchaseCart.size === filteredMaterials.length && filteredMaterials.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setPurchaseCart(new Set(filteredMaterials.map(m => m.id)));
                              } else {
                                setPurchaseCart(new Set());
                              }
                            }}
                          />
                          <span className="text-xs text-muted-foreground">全選</span>
                        </div>
                      )}
                    </TableHead>
                    <TableHead>物料資訊</TableHead>
                    <TableHead>分類</TableHead>
                    {!isStocktakeMode && <TableHead>供應商</TableHead>}
                    <TableHead>{isStocktakeMode ? "應有庫存" : "庫存"}</TableHead>
                    {isStocktakeMode && <TableHead>現有庫存</TableHead>}
                    {!isStocktakeMode && <TableHead>成本</TableHead>}
                    <TableHead className="w-12">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material) => (
                    <TableRow 
                      key={material.id}
                      className={`hover:bg-orange-50 transition-colors duration-200 ${
                        isLowStock(material) ? "bg-pink-50" : ""
                      }`}
                    >
                                             <TableCell onClick={(e) => e.stopPropagation()}>
                         {!isStocktakeMode && (
                           <Checkbox
                             checked={purchaseCart.has(material.id)}
                             onCheckedChange={() => handleCartToggle(material.id)}
                           />
                         )}
                       </TableCell>
                      <TableCell 
                        className={!isStocktakeMode ? "cursor-pointer" : ""}
                        onClick={!isStocktakeMode ? () => router.push(`/dashboard/materials/${material.id}`) : undefined}
                      >
                        <div className="font-medium text-foreground">{material.name}</div>
                        <div className="text-xs text-muted-foreground">代號: {material.code}</div>
                      </TableCell>
                      <TableCell 
                        className={!isStocktakeMode ? "cursor-pointer" : ""}
                        onClick={!isStocktakeMode ? () => router.push(`/dashboard/materials/${material.id}`) : undefined}
                      >
                        <div className="flex flex-wrap gap-1">
                          {material.category && (
                            <Badge 
                              variant="outline" 
                              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300"
                            >
                              {material.category}
                            </Badge>
                          )}
                          {material.subCategory && (
                            <Badge 
                              variant="outline" 
                              className="text-xs bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
                            >
                              {material.subCategory}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {!isStocktakeMode && (
                        <TableCell 
                          className={!isStocktakeMode ? "cursor-pointer" : ""}
                          onClick={!isStocktakeMode ? () => router.push(`/dashboard/materials/${material.id}`) : undefined}
                        >
                          {material.supplierName}
                        </TableCell>
                      )}
                      <TableCell 
                        className={!isStocktakeMode ? "cursor-pointer" : ""}
                        onClick={!isStocktakeMode ? () => router.push(`/dashboard/materials/${material.id}`) : undefined}
                      >
                        <div className="flex items-center gap-2">
                          <span className={isLowStock(material) ? "text-red-600 font-medium" : ""}>
                            {material.currentStock || 0} {material.unit}
                          </span>
                          {isLowStock(material) && (
                            <AlertTriangle className="h-3 w-3 text-red-600" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          安全庫存: {material.safetyStockLevel || 0} {material.unit}
                        </div>
                      </TableCell>
                      {isStocktakeMode && (
                        <TableCell className={
                          (updatedStocks[material.id] ?? material.currentStock ?? 0) > (material.currentStock ?? 0)
                            ? "bg-green-50"
                            : (updatedStocks[material.id] ?? material.currentStock ?? 0) < (material.currentStock ?? 0)
                            ? "bg-pink-50"
                            : ""
                        }>
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={updatedStocks[material.id] ?? material.currentStock ?? 0}
                            onChange={(e) => handleStockChange(material.id, Number(e.target.value))}
                            className="w-20 h-8 text-sm"
                          />
                        </TableCell>
                      )}
                      {!isStocktakeMode && (
                        <TableCell 
                          className={!isStocktakeMode ? "cursor-pointer" : ""}
                          onClick={!isStocktakeMode ? () => router.push(`/dashboard/materials/${material.id}`) : undefined}
                        >
                          ${material.costPerUnit || 0}
                        </TableCell>
                      )}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => addToPurchaseCart(material)}>
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              加入採購車
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewDetail(material)}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看詳情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(material)}>
                              <Edit className="mr-2 h-4 w-4" />
                              編輯
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(material)} className="text-red-600">
                              <X className="mr-2 h-4 w-4" />
                              刪除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* 無資料顯示 */}
          {filteredMaterials.length === 0 && !isLoading && (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-border rounded-full animate-spin border-t-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">沒有找到符合條件的物料</p>
            </div>
          )}
        </>
      )}

      {/* 新增/編輯物料對話框 */}
      <MaterialDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        materialData={selectedMaterial}
        onMaterialUpdate={handleMaterialUpdate}
      />

      {/* 詳情查看對話框 */}
      {selectedDetailMaterial && (
        <DetailViewDialog
          isOpen={isDetailViewOpen}
          onOpenChange={setIsDetailViewOpen}
          title={selectedDetailMaterial.name}
          subtitle={`物料代號: ${selectedDetailMaterial.code}`}
          sections={[
            {
              title: "基本資訊",
              color: "blue" as const,
              fields: [
                { label: "物料代號", value: selectedDetailMaterial.code },
                { label: "物料名稱", value: selectedDetailMaterial.name },
                { label: "主分類", value: selectedDetailMaterial.category || "未分類" },
                { label: "細分分類", value: selectedDetailMaterial.subCategory || "未分類" },
                { label: "供應商", value: selectedDetailMaterial.supplierName },
                { label: "單位", value: selectedDetailMaterial.unit || "未指定" },
              ]
            },
            {
              title: "庫存資訊",
              color: "green" as const,
              fields: [
                { label: "目前庫存", value: `${selectedDetailMaterial.currentStock || 0} ${selectedDetailMaterial.unit || ""}` },
                { label: "安全庫存", value: `${selectedDetailMaterial.safetyStockLevel || 0} ${selectedDetailMaterial.unit || ""}` },
                { label: "單位成本", value: `$${selectedDetailMaterial.costPerUnit || 0}` },
              ]
            },
            ...(selectedDetailMaterial.notes ? [{
              title: "備註",
              color: "yellow" as const,
              fields: [
                { label: "備註", value: selectedDetailMaterial.notes },
              ]
            }] : [])
          ]}
          actions={
            <>
              <Button variant="outline" onClick={() => setIsDetailViewOpen(false)}>
                關閉
              </Button>
              <Button onClick={() => {
                setIsDetailViewOpen(false);
                handleEdit(selectedDetailMaterial);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                編輯
              </Button>
            </>
          }
        />
      )}

      {/* 確認刪除對話框 */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={handleConfirmDelete}
        title="確認刪除"
        description={`您確定要刪除物料「${selectedMaterial?.name}」嗎？此操作無法復原。`}
      />

      {/* 批量刪除確認對話框 */}
      <ConfirmDialog
        isOpen={isBatchDeleteOpen}
        onOpenChange={setIsBatchDeleteOpen}
        onConfirm={handleBatchDelete}
        title="確認批量刪除"
        description={`您確定要刪除選取的 ${purchaseCart.size} 個物料嗎？此操作無法復原。`}
      />

      {/* 盤點確認對話框 */}
      <ConfirmDialog
        isOpen={isStocktakeConfirmOpen}
        onOpenChange={setIsStocktakeConfirmOpen}
        onConfirm={handleConfirmStocktake}
        title="確認盤點結果"
        description={`您確定要更新 ${materials.filter(m => updatedStocks[m.id] !== undefined && updatedStocks[m.id] !== m.currentStock).length} 個物料的庫存嗎？此操作將直接修改庫存資料。`}
      />

      {/* 物料分類對話框 */}
      <MaterialCategoryDialog
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
      />

      {/* 匯入匯出對話框 */}
      <ImportExportDialog
        isOpen={isImportExportOpen}
        onOpenChange={setIsImportExportOpen}
        onImport={async (data: MaterialData[], options?: { updateMode?: boolean }, onProgress?: (current: number, total: number) => void) => {
          const functions = getFunctions();
          
          try {
            // 調試日誌：檢查匯入資料
            console.log('開始匯入物料資料:', {
              totalRecords: data.length,
              sampleData: data.slice(0, 3).map(item => ({
                name: item.name,
                code: item.code,
                supplierName: item.supplierName,
                hasSupplierName: !!item.supplierName
              }))
            });
            
            // 獲取供應商映射表
            const suppliersMap = new Map<string, string>();
            if (!db) {
              throw new Error("Firebase 未初始化");
            }
            const supplierSnapshot = await getDocs(collection(db, "suppliers"));
            supplierSnapshot.forEach(doc => {
              const supplierData = doc.data();
              suppliersMap.set(supplierData.name, doc.id);
              console.log(`供應商映射: ${supplierData.name} -> ${doc.id}`);
            });
            
            // 獲取現有物料代號映射表
            const existingMaterialsMap = new Map<string, string>();
            const materialSnapshot = await getDocs(collection(db, "materials"));
            materialSnapshot.forEach(doc => {
              const data = doc.data();
              if (data.code) {
                existingMaterialsMap.set(data.code, doc.id);
              }
            });
            
            // 分批處理資料
            const batchSize = 20; // 每批處理20筆
            const totalBatches = Math.ceil(data.length / batchSize);
            let processedCount = 0;
            let createdCount = 0;
            let updatedCount = 0;
            
            for (let i = 0; i < totalBatches; i++) {
              const startIndex = i * batchSize;
              const endIndex = Math.min(startIndex + batchSize, data.length);
              const batch = data.slice(startIndex, endIndex);
              
              // 處理每一批資料
              for (const item of batch) {
                try {
                  // 處理供應商ID
                  let supplierId = undefined;
                  if (item.supplierName && item.supplierName.trim() !== '') {
                    const trimmedSupplierName = item.supplierName.trim();
                    supplierId = suppliersMap.get(trimmedSupplierName);
                    console.log(`尋找供應商: "${trimmedSupplierName}" -> ${supplierId || '未找到'}`);
                    if (!supplierId) {
                      console.warn(`找不到供應商: "${trimmedSupplierName}"`);
                    }
                  }
                  
                  // 處理數值欄位
                  const currentStock = item.currentStock !== undefined && item.currentStock !== null && String(item.currentStock) !== '' ? Number(item.currentStock) : 0;
                  const safetyStockLevel = item.safetyStockLevel !== undefined && item.safetyStockLevel !== null && String(item.safetyStockLevel) !== '' ? Number(item.safetyStockLevel) : 0;
                  const costPerUnit = item.costPerUnit !== undefined && item.costPerUnit !== null && String(item.costPerUnit) !== '' ? Number(item.costPerUnit) : 0;
                  
                  const processedItem: Partial<MaterialData> = {
                    code: item.code,
                    name: item.name,
                    category: item.category || '',
                    subCategory: item.subCategory || '',
                    supplierId,
                    currentStock,
                    safetyStockLevel,
                    costPerUnit,
                    unit: item.unit || '個',
                    notes: item.notes || ''
                  };
                  
                  console.log(`處理物料 ${item.name} 的完整資料:`, {
                    code: processedItem.code,
                    name: processedItem.name,
                    category: processedItem.category,
                    subCategory: processedItem.subCategory,
                    supplierId: processedItem.supplierId,
                    currentStock: processedItem.currentStock,
                    safetyStockLevel: processedItem.safetyStockLevel,
                    costPerUnit: processedItem.costPerUnit,
                    unit: processedItem.unit,
                    notes: processedItem.notes
                  });
                  
                  // 智能匹配邏輯：檢查物料代號是否存在
                  const existingMaterialId = existingMaterialsMap.get(item.code);
                  
                  if (existingMaterialId) {
                    // 物料代號已存在，執行更新
                    console.log(`物料代號 ${item.code} 已存在，執行更新操作`);
                    const updateMaterial = httpsCallable(functions, 'updateMaterialByCode');
                    await updateMaterial(processedItem);
                    updatedCount++;
                  } else {
                    // 物料代號不存在，執行新增
                    console.log(`物料代號 ${item.code} 不存在，執行新增操作`);
                    const createMaterial = httpsCallable(functions, 'createMaterial');
                    await createMaterial(processedItem);
                    createdCount++;
                  }
                } catch (error) {
                  console.error('處理物料資料失敗:', error);
                  throw error;
                }
              }
              
              processedCount += batch.length;
              onProgress?.(processedCount, data.length);
              
              // 每批之間稍作延遲，避免過度負載
              if (i < totalBatches - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
            
            console.log('物料匯入結果:', `成功處理 ${processedCount} 筆資料 (新增: ${createdCount}, 更新: ${updatedCount})`);
            handleMaterialUpdate();
          } catch (error) {
            console.error('匯入物料失敗:', error);
            throw error;
          }
        }}
        onExport={async () => {
          return materials.map(material => ({
            code: material.code,
            name: material.name,
            category: material.category,
            subCategory: material.subCategory,
            supplierName: material.supplierName,
            safetyStockLevel: material.safetyStockLevel,
            costPerUnit: material.costPerUnit,
            unit: material.unit,
            currentStock: material.currentStock,
            notes: material.notes
          }));
        }}
        title="物料資料"
        description="匯入或匯出物料資料，支援 Excel 和 CSV 格式。匯入時會智能匹配物料代號：如果代號不存在則新增，如果代號已存在則更新覆蓋有填入的欄位。"
        color="yellow"
        showUpdateOption={true}
        maxBatchSize={500}
        sampleData={[
          {
            code: "MAT001",
            name: "示例物料",
            category: "原料",
            subCategory: "基礎原料",
            supplierName: "示例供應商",
            safetyStockLevel: 100,
            costPerUnit: 10.5,
            unit: "kg",
            currentStock: 50,
            notes: "示例備註"
          }
        ]}
        fields={[
          { key: "code", label: "物料代號", required: false, type: "string" },
          { key: "name", label: "物料名稱", required: true, type: "string" },
          { key: "category", label: "主分類", required: false, type: "string" },
          { key: "subCategory", label: "細分分類", required: false, type: "string" },
          { key: "supplierName", label: "供應商", required: false, type: "string" },
          { key: "safetyStockLevel", label: "安全庫存", required: false, type: "number" },
          { key: "costPerUnit", label: "單位成本", required: false, type: "number" },
          { key: "unit", label: "單位", required: false, type: "string" },
          { key: "currentStock", label: "目前庫存", required: false, type: "number" },
          { key: "notes", label: "備註", required: false, type: "string" }
        ]}
      />
    </div>
  );
}

export default function MaterialsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MaterialsPageContent />
    </Suspense>
  );
}
