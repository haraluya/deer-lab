'use client';

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, DocumentReference, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';

import { MaterialDialog, MaterialData } from './MaterialDialog';
import { MaterialCategoryDialog } from './MaterialCategoryDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MaterialIcon } from '@/components/ui/material-icon';
import { MoreHorizontal, ShoppingCart, ListChecks, Save, X, Loader2, Search, FileSpreadsheet, Eye, Edit, Warehouse, Building, Tag, Package, AlertTriangle, Shield, Plus, Calculator, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
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

  // --- 盤點功能相關狀態 ---
  const [isStocktakeMode, setIsStocktakeMode] = useState(false);
  const [updatedStocks, setUpdatedStocks] = useState<{ [key: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [selectedDetailMaterial, setSelectedDetailMaterial] = useState<MaterialWithSupplier | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  // -------------------------

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
      
      setMaterials(materialsList);
      setFilteredMaterials(materialsList);
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
  const handleSearchAndFilter = () => {
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

    console.log('篩選結果:', {
      searchTerm: searchTerm.trim(),
      totalMaterials: materials.length,
      filteredCount: filtered.length,
      selectedCategory,
      selectedSubCategory
    });

    setFilteredMaterials(filtered);
  };

  // 處理搜尋 - 移除延遲
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // 立即執行篩選，不使用延遲
    handleSearchAndFilter();
  };

  // 處理分類篩選
  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(selectedCategory === category ? "" : category);
  };

  // 處理子分類篩選
  const handleSubCategoryFilter = (subCategory: string) => {
    setSelectedSubCategory(selectedSubCategory === subCategory ? "" : subCategory);
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
  
  const handleCreatePurchaseOrder = () => {
    if (purchaseCart.size === 0) {
      toast.info("請至少選擇一個物料加入採購單。");
      return;
    }
    const itemIds = Array.from(purchaseCart).join(',');
    const itemType = 'material';
    router.push(`/dashboard/purchase-orders/create?type=${itemType}&ids=${itemIds}`);
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

    const toastId = toast.loading("正在儲存盤點結果...");
    try {
      const functions = getFunctions();
      const performStocktake = httpsCallable(functions, 'performStocktake');
      await performStocktake({ items: changedItems });
      
      toast.success("盤點結果儲存成功，庫存已更新。", { id: toastId });
      setUpdatedStocks({});
      setIsStocktakeMode(false);
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

  useEffect(() => {
    handleSearchAndFilter();
  }, [selectedCategory, selectedSubCategory, searchTerm]);

  const { categories, subCategories } = useMemo(() => getAllCategories(), [materials]);

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-orange-600">
            物料管理
          </h1>
          <p className="text-muted-foreground mt-2">管理系統中的所有物料資料</p>
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
              <Button onClick={handleCreatePurchaseOrder} disabled={purchaseCart.size === 0} variant="outline" className="w-full">
                <ShoppingCart className="mr-2 h-4 w-4" />
                採購單 ({purchaseCart.size})
              </Button>
              <Button 
                onClick={() => setIsBatchDeleteOpen(true)} 
                disabled={purchaseCart.size === 0} 
                variant="destructive" 
                className="w-full"
              >
                <X className="mr-2 h-4 w-4" />
                批量刪除 ({purchaseCart.size})
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
              <Button onClick={handleCreatePurchaseOrder} disabled={purchaseCart.size === 0} variant="outline">
                <ShoppingCart className="mr-2 h-4 w-4" />
                建立採購單 ({purchaseCart.size})
              </Button>
              <Button 
                onClick={() => setIsBatchDeleteOpen(true)} 
                disabled={purchaseCart.size === 0} 
                variant="destructive"
              >
                <X className="mr-2 h-4 w-4" />
                批量刪除 ({purchaseCart.size})
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
       {(categories.length > 0 || subCategories.length > 0) && (
         <div className="mb-6">
           <div className="flex flex-wrap gap-2">
             {/* 主分類 */}
             {categories.length > 0 && categories.map((category) => (
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
             {subCategories.length > 0 && subCategories.map((subCategory) => (
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
          {/* 手機版列表 */}
          <div className="lg:hidden space-y-4">
            {filteredMaterials.map((material) => (
              <Card key={material.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => router.push(`/dashboard/materials/${material.id}`)}>
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
                      <span>{material.category || '未分類'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">供應商:</span>
                      <span>{material.supplierName}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">目前庫存:</span>
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
                  </div>

                  {/* 盤點模式下的庫存輸入 */}
                  {isStocktakeMode && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">盤點數量:</span>
                        <Input
                          type="number"
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
                    <TableHead>供應商</TableHead>
                    <TableHead>庫存</TableHead>
                    <TableHead>成本</TableHead>
                    <TableHead className="w-12">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material) => (
                    <TableRow 
                      key={material.id}
                      className="hover:bg-orange-50 transition-colors duration-200"
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
                        className="cursor-pointer"
                        onClick={() => router.push(`/dashboard/materials/${material.id}`)}
                      >
                        <div className="font-medium text-foreground">{material.name}</div>
                        <div className="text-xs text-muted-foreground">代號: {material.code}</div>
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => router.push(`/dashboard/materials/${material.id}`)}
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
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => router.push(`/dashboard/materials/${material.id}`)}
                      >
                        {material.supplierName}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => router.push(`/dashboard/materials/${material.id}`)}
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
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => router.push(`/dashboard/materials/${material.id}`)}
                      >
                        ${material.costPerUnit || 0}
                      </TableCell>
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

      {/* 物料分類對話框 */}
      <MaterialCategoryDialog
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
      />

      {/* 匯入匯出對話框 */}
      <ImportExportDialog
        isOpen={isImportExportOpen}
        onOpenChange={setIsImportExportOpen}
        onImport={async (data: any[], options?: { updateMode?: boolean }, onProgress?: (current: number, total: number) => void) => {
          const functions = getFunctions();
          const importMaterials = httpsCallable(functions, 'importMaterials');
          
          try {
            // 調試日誌：檢查匯入資料
            console.log('開始匯入資料:', {
              totalRecords: data.length,
              updateMode: options?.updateMode,
              sampleData: data.slice(0, 3).map(item => ({
                name: item.name,
                supplierName: item.supplierName,
                hasSupplierName: !!item.supplierName
              }))
            });
            
            // 分批處理資料
            const batchSize = 20; // 每批處理20筆
            const totalBatches = Math.ceil(data.length / batchSize);
            let processedCount = 0;
            
            for (let i = 0; i < totalBatches; i++) {
              const startIndex = i * batchSize;
              const endIndex = Math.min(startIndex + batchSize, data.length);
              const batch = data.slice(startIndex, endIndex);
              
              const result = await importMaterials({ 
                materials: batch,
                updateMode: options?.updateMode || false
              });
              
              processedCount += batch.length;
              onProgress?.(processedCount, data.length);
              
              // 每批之間稍作延遲，避免過度負載
              if (i < totalBatches - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
            
            console.log('匯入結果:', `成功處理 ${processedCount} 筆資料`);
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
        title="物料"
        description="匯入或匯出物料資料，支援 Excel 和 CSV 格式。匯入時會自動生成缺失的分類和代號。"
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
