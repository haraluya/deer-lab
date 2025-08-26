'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, DocumentReference, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';


import { MaterialDialog, MaterialData } from './MaterialDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MaterialIcon } from '@/components/ui/material-icon';
import { MoreHorizontal, ShoppingCart, ListChecks, Save, X, Loader2, Search, FileSpreadsheet, Eye, Edit, Warehouse, Building, Tag, Package, AlertTriangle, Shield, Plus, Calculator } from 'lucide-react';
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

  const [materials, setMaterials] = useState<MaterialWithSupplier[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<MaterialWithSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
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

  // 處理搜尋和篩選
  const handleSearchAndFilter = () => {
    let filtered = materials;

    // 搜尋篩選
    if (searchTerm.trim()) {
      filtered = filtered.filter(material =>
        material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.subCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 主分類篩選
    if (selectedCategory) {
      filtered = filtered.filter(material => material.category === selectedCategory);
    }

    // 子分類篩選
    if (selectedSubCategory) {
      filtered = filtered.filter(material => material.subCategory === selectedSubCategory);
    }

    setFilteredMaterials(filtered);
  };

  // 處理搜尋
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setTimeout(handleSearchAndFilter, 100);
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

  useEffect(() => {
    handleSearchAndFilter();
  }, [selectedCategory, selectedSubCategory, searchTerm]);

  const { categories, subCategories } = getAllCategories();

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            物料管理
          </h1>
          <p className="text-gray-600 mt-2">管理系統中的所有物料資料</p>
        </div>
      </div>

      {/* 手機版功能按鈕區域 */}
      <div className="lg:hidden mb-6">
        <div className="grid grid-cols-2 gap-3">
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
              <Button variant="outline" onClick={() => setIsImportExportOpen(true)} className="w-full">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                匯入/匯出
              </Button>
              <Button onClick={handleCreatePurchaseOrder} disabled={purchaseCart.size === 0} variant="outline" className="w-full">
                <ShoppingCart className="mr-2 h-4 w-4" />
                採購單 ({purchaseCart.size})
              </Button>
              <Button variant="outline" onClick={() => setIsStocktakeMode(true)} className="w-full">
                <Calculator className="mr-2 h-4 w-4" />
                盤點模式
              </Button>
              <Button 
                onClick={handleAdd}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
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
              <Button variant="outline" onClick={() => setIsImportExportOpen(true)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                匯入/匯出
              </Button>
              <Button onClick={handleCreatePurchaseOrder} disabled={purchaseCart.size === 0} variant="outline">
                <ShoppingCart className="mr-2 h-4 w-4" />
                建立採購單 ({purchaseCart.size})
              </Button>
              <Button variant="outline" onClick={() => setIsStocktakeMode(true)}>
                <Calculator className="mr-2 h-4 w-4" />
                盤點模式
              </Button>
              <Button 
                onClick={handleAdd}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="mr-2 h-4 w-4" />
                新增物料
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 搜尋框 */}
      <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-gray-50 to-blue-50">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-blue-600" />
            <Input
              placeholder="搜尋物料名稱、代號、分類或供應商..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* 分類篩選標籤 */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">分類篩選</h3>
        <div className="flex flex-wrap gap-2">
          {/* 主分類標籤 - 藍色系 */}
          {categories.map((category) => (
            <Badge
              key={`category-${category}`}
              variant="outline"
              className={`cursor-pointer transition-all duration-200 ${
                selectedCategory === category 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
              }`}
              onClick={() => handleCategoryFilter(category)}
            >
              <span className="mr-1">
                <MaterialIcon category={category} size="sm" />
              </span>
              {category}
            </Badge>
          ))}
          
          {/* 細分分類標籤 - 綠色系 */}
          {subCategories.map((subCategory) => (
            <Badge
              key={`subcategory-${subCategory}`}
              variant="outline"
              className={`cursor-pointer transition-all duration-200 ${
                selectedSubCategory === subCategory 
                  ? 'bg-green-600 text-white border-green-600 shadow-md' 
                  : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300'
              }`}
              onClick={() => handleSubCategoryFilter(subCategory)}
            >
              {subCategory}
            </Badge>
          ))}
        </div>
      </div>

      {/* 手機版表格容器 */}
      <div className="lg:hidden">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <h2 className="text-base font-semibold text-gray-800">物料清單</h2>
              </div>
              <div className="text-xs text-gray-600">
                共 {filteredMaterials.length} 項
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-blue-200 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                  <span className="mt-3 text-sm text-gray-600 font-medium">載入中...</span>
                </div>
              ) : filteredMaterials.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {filteredMaterials.map((material) => {
                    const isLowStockItem = isLowStock(material);
                    return (
                      <div 
                        key={material.id} 
                        className={`p-4 ${isLowStockItem && !isStocktakeMode ? 'bg-red-50/50' : ''} hover:bg-blue-50/50 transition-colors duration-200`}
                        onClick={() => handleViewDetail(material)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                              <MaterialIcon category={material.category || 'default'} size="sm" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{material.name}</div>
                              <div className="text-xs text-gray-500">代號: {material.code}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={purchaseCart.has(material.id)}
                              onCheckedChange={() => handleCartToggle(material.id)}
                              aria-label={`選擇 ${material.name}`}
                              disabled={isStocktakeMode}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={isStocktakeMode}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetail(material)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  查看詳細
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(material)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  編輯
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(material)} className="text-red-600">刪除</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Tag className="h-3 w-3 text-blue-600" />
                              <span className="text-gray-500">主分類</span>
                            </div>
                            <span className="font-medium text-gray-700">{material.category}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-gray-500">細分分類</span>
                            </div>
                            <span className="font-medium text-gray-700">{material.subCategory}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Building className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-500">供應商</span>
                            </div>
                            <span className="font-medium text-gray-700">{material.supplierName}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Warehouse className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-500">目前庫存</span>
                            </div>
                            {isStocktakeMode ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  className="w-20 h-7 text-sm border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                                  value={updatedStocks[material.id] ?? material.currentStock}
                                  onChange={(e) => handleStockChange(material.id, Number(e.target.value))}
                                />
                                <span className="text-xs text-gray-600">{material.unit}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className={`font-medium ${isLowStockItem ? 'text-red-600' : 'text-green-600'}`}>
                                  {material.currentStock} {material.unit}
                                </span>
                                {isLowStockItem && (
                                  <span className="text-xs text-red-600 font-medium">低庫存</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 mb-1">沒有物料資料</h3>
                  <p className="text-sm text-gray-500 mb-4 text-center">開始新增第一個物料來管理您的庫存</p>
                  <Button 
                    onClick={handleAdd}
                    variant="outline"
                    size="sm"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    新增物料
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 桌面版表格容器 */}
      <div className="hidden lg:block">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">物料清單</h2>
            </div>
            <div className="text-sm text-gray-600">
              共 {filteredMaterials.length} 項物料
            </div>
          </div>
        </div>
        
        <div className="table-responsive">
          <Table className="table-enhanced">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] text-center">選取</TableHead>
                <TableHead className="text-left">物料資訊</TableHead>
                <TableHead className="text-left">主分類</TableHead>
                <TableHead className="text-left">細分分類</TableHead>
                <TableHead className="text-left">供應商</TableHead>
                <TableHead className="text-right">目前庫存</TableHead>
                <TableHead className="text-right">安全庫存</TableHead>
                <TableHead className="text-right">成本</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                      </div>
                      <span className="mt-4 text-gray-600 font-medium">載入物料資料中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredMaterials.length > 0 ? (
                filteredMaterials.map((material) => {
                  const isLowStockItem = isLowStock(material);
                  return (
                    <TableRow 
                      key={material.id} 
                      className={`${isLowStockItem && !isStocktakeMode ? 'bg-red-50/50' : ''} cursor-pointer hover:bg-blue-50/50 transition-colors duration-200`} 
                      data-state={purchaseCart.has(material.id) ? "selected" : ""}
                      onClick={() => handleViewDetail(material)}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={purchaseCart.has(material.id)}
                          onCheckedChange={() => handleCartToggle(material.id)}
                          aria-label={`選擇 ${material.name}`}
                          disabled={isStocktakeMode}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                            <MaterialIcon category={material.category || 'default'} size="sm" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{material.name}</div>
                            <div className="text-xs text-gray-500">代號: {material.code}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {material.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {material.subCategory}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">{material.supplierName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {isStocktakeMode ? (
                          <div className="flex justify-end items-center gap-2">
                            <Input
                              type="number"
                              className="w-24 h-8 text-right border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                              value={updatedStocks[material.id] ?? material.currentStock}
                              onChange={(e) => handleStockChange(material.id, Number(e.target.value))}
                            />
                            <span className="text-sm text-gray-600">{material.unit}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Warehouse className="h-4 w-4 text-gray-400" />
                            <span className={`font-medium ${isLowStockItem ? 'text-red-600' : 'text-green-600'}`}>
                              {material.currentStock} {material.unit}
                            </span>
                            {isLowStockItem && (
                              <span className="text-xs text-red-600 font-medium">低庫存</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="number-display number-neutral">
                            {material.safetyStockLevel} {material.unit}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="number-display number-neutral">
                          ${Math.floor(material.costPerUnit || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isStocktakeMode}>
                              <span className="sr-only">開啟選單</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewDetail(material)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看詳細
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(material)}>
                              <Edit className="h-4 w-4 mr-2" />
                              編輯物料
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(material)}
                              className="text-red-600 focus:text-red-600"
                            >
                              刪除物料
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">沒有物料資料</h3>
                      <p className="text-gray-500 mb-4">開始新增第一個物料來管理您的庫存</p>
                      <Button 
                        onClick={handleAdd}
                        variant="outline"
                        className="border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        新增物料
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
        </div>
      </div>
      </div>

      {/* 物料對話框 */}
      <MaterialDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onMaterialUpdate={handleMaterialUpdate}
        materialData={selectedMaterial}
      />

      {/* 詳情對話框 */}
      {selectedDetailMaterial && (
        <DetailViewDialog
          isOpen={isDetailViewOpen}
          onOpenChange={setIsDetailViewOpen}
          title={selectedDetailMaterial.name}
          subtitle={`代號: ${selectedDetailMaterial.code}`}
          sections={[
            {
              title: "基本資訊",
              icon: <Package className="h-4 w-4" />,
              color: "blue" as const,
              fields: [
                { label: "物料代號", value: selectedDetailMaterial.code },
                { label: "物料名稱", value: selectedDetailMaterial.name },
                { label: "主分類", value: selectedDetailMaterial.category },
                { label: "細分分類", value: selectedDetailMaterial.subCategory },
              ]
            },
            {
              title: "供應商資訊",
              icon: <Building className="h-4 w-4" />,
              color: "green" as const,
              fields: [
                { label: "供應商", value: selectedDetailMaterial.supplierName },
              ]
            },
            {
              title: "庫存與成本",
              icon: <Warehouse className="h-4 w-4" />,
              color: "purple" as const,
              fields: [
                { label: "目前庫存", value: selectedDetailMaterial.currentStock, type: "number" },
                { label: "安全庫存", value: selectedDetailMaterial.safetyStockLevel, type: "number" },
                { label: "單位成本", value: selectedDetailMaterial.costPerUnit, type: "currency" },
                { label: "單位", value: selectedDetailMaterial.unit },
              ]
            },
            ...(selectedDetailMaterial.notes ? [{
              title: "備註",
              icon: <Tag className="h-4 w-4" />,
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

      {/* 匯入匯出對話框 */}
      <ImportExportDialog
        isOpen={isImportExportOpen}
        onOpenChange={setIsImportExportOpen}
        onImport={async (data: any[]) => {
          const functions = getFunctions();
          const importMaterials = httpsCallable(functions, 'importMaterials');
          
          try {
            const result = await importMaterials({ materials: data });
            console.log('匯入結果:', result);
            toast.success('物料匯入完成');
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
        description="匯入或匯出物料資料，支援 Excel 和 CSV 格式。匯入時會自動生成缺失的分類和代號。"
        color="blue"
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

export default MaterialsPageContent;
