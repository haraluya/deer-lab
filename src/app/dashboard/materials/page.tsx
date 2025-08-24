'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, DocumentReference, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { MaterialDialog, MaterialData } from './MaterialDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MoreHorizontal, ShoppingCart, ListChecks, Save, X, Loader2, Search, FileSpreadsheet, Eye, Edit, Warehouse, Building, Tag, Package } from 'lucide-react';
import { toast } from 'sonner';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ImportExportDialog } from '@/components/ImportExportDialog';
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
      const materialsCollectionRef = collection(db, 'materials');
      const materialsSnapshot = await getDocs(materialsCollectionRef);
      
      const materialsList = materialsSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        const supplierRef = data.supplierRef as DocumentReference | undefined;
        const supplierName = supplierRef ? suppliersMap.get(supplierRef.id) || '讀取失敗' : '未指定';
        
        return {
          id: doc.id,
          refPath: doc.ref.path, // 新增文檔路徑
          code: data.code,
          name: data.name,
          category: data.category,
          subCategory: data.subCategory,
          supplierRef: data.supplierRef,
          safetyStockLevel: data.safetyStockLevel,
          costPerUnit: data.costPerUnit,
          unit: data.unit,
          currentStock: data.currentStock,
          supplierName,
        } as MaterialWithSupplier;
      });
      
      setMaterials(materialsList);
      setFilteredMaterials(materialsList);
    } catch (error) {
      console.error("Failed to fetch materials:", error);
      toast.error("讀取物料資料失敗");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    const suppliersMap = await fetchSuppliers();
    await fetchMaterials(suppliersMap);
  }, [fetchSuppliers, fetchMaterials]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let filtered = materials;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(material =>
        material.name.toLowerCase().includes(searchLower) ||
        material.code.toLowerCase().includes(searchLower) ||
        material.category?.toLowerCase().includes(searchLower) ||
        material.supplierName.toLowerCase().includes(searchLower)
      );
    }

    setFilteredMaterials(filtered);
  }, [materials, searchTerm]);

  const handleAdd = () => {
    setSelectedMaterial(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (material: MaterialWithSupplier) => {
    setSelectedMaterial(material);
    setIsDialogOpen(true);
  };

  const handleDelete = (material: MaterialWithSupplier) => {
    setSelectedMaterial(material);
    setIsConfirmOpen(true);
  };

  const handleViewDetail = (material: MaterialWithSupplier) => {
    setSelectedDetailMaterial(material);
    setIsDetailViewOpen(true);
  };

  const handleCartToggle = (materialId: string) => {
    setPurchaseCart(prev => {
      const newCart = new Set(prev);
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
      toast.error("請先選擇要採購的物料");
      return;
    }

    const selectedMaterialIds = Array.from(purchaseCart);
    const queryParams = new URLSearchParams();
    selectedMaterialIds.forEach(id => queryParams.append('material', id));
    
    router.push(`/dashboard/purchase-orders/create?${queryParams.toString()}`);
  };

  const handleConfirmDelete = async () => {
    if (!selectedMaterial) return;
    
    setIsConfirmOpen(false);
    const toastId = toast.loading("正在刪除物料...");
    
    try {
      const functions = getFunctions();
      const deleteMaterial = httpsCallable(functions, 'deleteMaterial');
      await deleteMaterial({ materialId: selectedMaterial.id });
      
      toast.success("物料刪除成功", { id: toastId });
      loadData();
    } catch (error) {
      let errorMessage = "刪除物料時發生錯誤。";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsConfirmOpen(false);
      setSelectedMaterial(null);
    }
  };

  // --- 盤點功能相關函式 ---
  const handleStockChange = (id: string, value: number) => {
    setUpdatedStocks(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveStocktake = async () => {
    const changedItems = materials
      .filter(m => updatedStocks[m.id] !== undefined && updatedStocks[m.id] !== m.currentStock)
      .map(m => ({
        itemRefPath: m.refPath,
        currentStock: m.currentStock,
        newStock: updatedStocks[m.id],
      }));

    if (changedItems.length === 0) {
      toast.info("庫存數量沒有變更，無需儲存。");
      setIsStocktakeMode(false);
      setUpdatedStocks({});
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("正在儲存盤點結果...");
    try {
      const functions = getFunctions();
      const performStocktake = httpsCallable(functions, 'performStocktake');
      await performStocktake({ items: changedItems });
      
      toast.success("盤點結果儲存成功，庫存已更新。", { id: toastId });
      setUpdatedStocks({});
      setIsStocktakeMode(false);
      loadData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "儲存盤點失敗";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelStocktake = () => {
    setUpdatedStocks({});
    setIsStocktakeMode(false);
  };

  // 匯入/匯出處理函式
  const handleImport = async (data: any[]) => {
    const functions = getFunctions();
    const createMaterial = httpsCallable(functions, 'createMaterial');
    
    for (const item of data) {
      try {
        await createMaterial(item);
      } catch (error) {
        console.error('匯入物料失敗:', error);
        throw error;
      }
    }
    loadData();
  };

  const handleExport = async () => {
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
      status: material.status
    }));
  };
  // -------------------------

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            物料管理
          </h1>
          <p className="text-gray-600 mt-2">管理生產所需的物料與庫存</p>
        </div>
      </div>

      {/* 手機版功能按鈕區域 */}
      <div className="lg:hidden mb-6">
        <div className="grid grid-cols-2 gap-3">
          {isStocktakeMode ? (
            <>
              <Button onClick={handleSaveStocktake} disabled={isSubmitting} className="w-full">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                儲存盤點
              </Button>
              <Button variant="outline" onClick={handleCancelStocktake} disabled={isSubmitting} className="w-full">
                <X className="mr-2 h-4 w-4" />
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
                <ListChecks className="mr-2 h-4 w-4" />
                盤點模式
              </Button>
              <Button onClick={handleAdd} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                新增物料
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 桌面版功能按鈕區域 */}
      <div className="hidden lg:block mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {isStocktakeMode ? (
            <>
              <Button onClick={handleSaveStocktake} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                儲存盤點
              </Button>
              <Button variant="outline" onClick={handleCancelStocktake} disabled={isSubmitting}>
                <X className="mr-2 h-4 w-4" />
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
                <ListChecks className="mr-2 h-4 w-4" />
                盤點模式
              </Button>
              <Button onClick={handleAdd}>新增物料</Button>
            </>
          )}
        </div>
      </div>

      {/* 搜尋框 */}
      <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-gray-50 to-green-50">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-green-600" />
            <Input
              placeholder="搜尋物料代號、名稱、供應商、分類、狀態、庫存等..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-green-200 focus:border-green-500 focus:ring-green-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* 手機版表格容器 */}
      <div className="lg:hidden">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-green-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-green-600" />
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
                    <div className="w-10 h-10 border-4 border-green-200 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-green-600 rounded-full animate-spin"></div>
                  </div>
                  <span className="mt-3 text-sm text-gray-600 font-medium">載入中...</span>
                </div>
              ) : filteredMaterials.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {filteredMaterials.map((material) => {
                    const isLowStock = typeof material.safetyStockLevel === 'number' && material.currentStock < material.safetyStockLevel;
                    return (
                      <div 
                        key={material.id} 
                        className={`p-4 ${isLowStock && !isStocktakeMode ? 'bg-red-50/50' : ''} hover:bg-green-50/50 transition-colors duration-200`}
                        onClick={() => handleViewDetail(material)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                              <Package className="h-4 w-4 text-white" />
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
                              <Tag className="h-3 w-3 text-green-600" />
                              <span className="text-gray-500">分類</span>
                            </div>
                            <span className="font-medium text-gray-700">{material.category || 'N/A'}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Building className="h-3 w-3 text-blue-600" />
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
                                  className="w-20 h-7 text-sm border-green-200 focus:border-green-500 focus:ring-green-500"
                                  value={updatedStocks[material.id] ?? material.currentStock}
                                  onChange={(e) => handleStockChange(material.id, Number(e.target.value))}
                                />
                                <span className="text-xs text-gray-600">{material.unit || ''}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                                  {material.currentStock} {material.unit || ''}
                                </span>
                                {isLowStock && (
                                  <span className="text-xs text-red-600 font-medium">低庫存</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-gray-500">安全庫存</span>
                            </div>
                            <span className="font-medium text-gray-700">
                              {material.safetyStockLevel || 0} {material.unit || ''}
                            </span>
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
                  <p className="text-sm text-gray-500 mb-4 text-center">開始建立第一個物料來管理庫存</p>
                  <Button 
                    onClick={handleAdd}
                    variant="outline"
                    size="sm"
                    className="border-green-200 text-green-600 hover:bg-green-50"
                  >
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
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-green-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
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
                  <TableHead className="font-semibold">物料代號</TableHead>
                  <TableHead className="font-semibold">物料名稱</TableHead>
                  <TableHead className="font-semibold">分類</TableHead>
                  <TableHead className="font-semibold">供應商</TableHead>
                  <TableHead className="font-semibold text-right">目前庫存</TableHead>
                  <TableHead className="font-semibold text-right">安全庫存</TableHead>
                  <TableHead className="font-semibold text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center">
                        <div className="relative">
                          <div className="w-12 h-12 border-4 border-green-200 rounded-full animate-spin"></div>
                          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-green-600 rounded-full animate-spin"></div>
                        </div>
                        <span className="mt-4 text-gray-600 font-medium">載入物料資料中...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredMaterials.length > 0 ? (
                  filteredMaterials.map((material) => {
                    const isLowStock = typeof material.safetyStockLevel === 'number' && material.currentStock < material.safetyStockLevel;
                    return (
                      <TableRow 
                        key={material.id} 
                        className={`${isLowStock && !isStocktakeMode ? 'bg-red-50/50' : ''} cursor-pointer hover:bg-green-50/50 transition-colors duration-200`} 
                        data-state={purchaseCart.has(material.id) ? "selected" : ""}
                        onClick={() => handleViewDetail(material)}
                      >
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={purchaseCart.has(material.id)}
                            onCheckedChange={() => handleCartToggle(material.id)}
                            aria-label={`選擇 ${material.name}`}
                            disabled={isStocktakeMode} // 盤點模式下禁用
                          />
                        </TableCell>
                        <TableCell>
                          <span className="number-display number-neutral">{material.code}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                              <Package className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{material.name}</div>
                              <div className="text-xs text-gray-500">ID: {material.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-700">{material.category || 'N/A'}</span>
                          </div>
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
                                className="w-24 h-8 text-right border-green-200 focus:border-green-500 focus:ring-green-500"
                                value={updatedStocks[material.id] ?? material.currentStock}
                                onChange={(e) => handleStockChange(material.id, Number(e.target.value))}
                              />
                              <span className="text-sm text-gray-600">{material.unit || ''}</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <Warehouse className="h-4 w-4 text-gray-400" />
                              <span className={`number-display ${isLowStock ? 'number-negative' : 'number-positive'}`}>
                                {material.currentStock} {material.unit || ''}
                              </span>
                              {isLowStock && (
                                <span className="text-xs text-red-600 font-medium">低庫存</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="number-display number-neutral">
                              {material.safetyStockLevel || 0} {material.unit || ''}
                            </span>
                          </div>
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
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">沒有物料資料</h3>
                        <p className="text-gray-500 mb-4">開始建立第一個物料來管理庫存</p>
                        <Button 
                          onClick={handleAdd}
                          variant="outline"
                          className="border-green-200 text-green-600 hover:bg-green-50"
                        >
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

      <MaterialDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onMaterialUpdate={loadData}
        materialData={selectedMaterial}
      />
      
      {selectedMaterial && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmDelete}
          title={`確認刪除物料`}
          description={`您確定要刪除「${selectedMaterial.name}」嗎？此操作無法復原。`}
        />
      )}

      <ImportExportDialog
        isOpen={isImportExportOpen}
        onOpenChange={setIsImportExportOpen}
        onImport={handleImport}
        onExport={handleExport}
        title="物料資料"
        description="匯入或匯出物料資料，支援 Excel 和 CSV 格式"
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
            status: "active"
          }
        ]}
        fields={[
          { key: "code", label: "物料代號", required: true, type: "string" },
          { key: "name", label: "物料名稱", required: true, type: "string" },
          { key: "category", label: "分類", required: false, type: "string" },
          { key: "subCategory", label: "子分類", required: false, type: "string" },
          { key: "supplierName", label: "供應商", required: false, type: "string" },
          { key: "safetyStockLevel", label: "安全庫存", required: false, type: "number" },
          { key: "costPerUnit", label: "單位成本", required: false, type: "number" },
          { key: "unit", label: "單位", required: false, type: "string" },
          { key: "currentStock", label: "目前庫存", required: false, type: "number" },
          { key: "status", label: "狀態", required: false, type: "string" }
        ]}
      />

      {/* 詳細資料對話框 */}
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
              fields: [
                { label: "物料代號", value: selectedDetailMaterial.code },
                { label: "物料名稱", value: selectedDetailMaterial.name },
                { label: "分類", value: selectedDetailMaterial.category },
                { label: "細分分類", value: selectedDetailMaterial.subCategory },
                { label: "供應商", value: selectedDetailMaterial.supplierName },
                { label: "單位", value: selectedDetailMaterial.unit },
              ]
            },
            {
              title: "庫存資訊",
              icon: <Warehouse className="h-4 w-4" />,
              fields: [
                { label: "目前庫存", value: selectedDetailMaterial.currentStock, type: "number" },
                { label: "安全庫存", value: selectedDetailMaterial.safetyStockLevel, type: "number" },
                { label: "單位成本", value: selectedDetailMaterial.costPerUnit, type: "currency" },
              ]
            }
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
    </div>
  );
}


export default function MaterialsPage() {
  return (
    <MaterialsPageContent />
  );
}
