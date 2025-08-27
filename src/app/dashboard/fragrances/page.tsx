// src/app/dashboard/fragrances/page.tsx
'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, DocumentReference, QueryDocumentSnapshot, DocumentData, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { FragranceDialog, FragranceData } from './FragranceDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MoreHorizontal, ShoppingCart, Search, Package, Calculator, FileSpreadsheet, Warehouse, Plus, Eye, Edit, Droplets, Building, Calendar } from 'lucide-react';
import { toast } from 'sonner';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportExportDialog } from '@/components/ImportExportDialog';
import { DetailViewDialog } from '@/components/DetailViewDialog';

interface FragranceWithSupplier extends FragranceData {
  supplierName: string;
  fragranceType?: string;
}

function FragrancesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fragrances, setFragrances] = useState<FragranceWithSupplier[]>([]);
  const [filteredFragrances, setFilteredFragrances] = useState<FragranceWithSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedFragrance, setSelectedFragrance] = useState<FragranceData | null>(null);
  const [purchaseCart, setPurchaseCart] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isStocktakeMode, setIsStocktakeMode] = useState(false);
  const [updatedStocks, setUpdatedStocks] = useState<Record<string, number>>({});
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [selectedDetailFragrance, setSelectedDetailFragrance] = useState<FragranceWithSupplier | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      
      const suppliersMap = new Map<string, string>();
      const supplierSnapshot = await getDocs(collection(db, "suppliers"));
      supplierSnapshot.forEach(doc => suppliersMap.set(doc.id, doc.data().name));

      const fragrancesSnapshot = await getDocs(collection(db, 'fragrances'));
      const fragrancesList = fragrancesSnapshot.docs.map(doc => {
        const data = doc.data();
        const supplierRef = data.supplierRef as DocumentReference | undefined;
        const supplierName = supplierRef ? suppliersMap.get(supplierRef.id) || 'N/A' : '未指定';
        
        return {
          id: doc.id,
          code: data.code,
          name: data.name,
          status: data.status,
          fragranceType: data.fragranceType || data.status, // 向後相容性
          supplierRef: data.supplierRef,
          safetyStockLevel: data.safetyStockLevel,
          costPerUnit: data.costPerUnit,
          percentage: data.percentage,
          pgRatio: data.pgRatio,
          vgRatio: data.vgRatio,
          currentStock: data.currentStock,
          supplierName,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as FragranceWithSupplier;
      });
      setFragrances(fragrancesList);
      setFilteredFragrances(fragrancesList);
    } catch (error) {
      console.error("讀取香精資料失敗:", error);
      toast.error("讀取香精資料失敗。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 處理 URL 查詢參數
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && fragrances.length > 0) {
      const fragranceToEdit = fragrances.find(f => f.id === editId);
      if (fragranceToEdit) {
        setSelectedFragrance(fragranceToEdit);
        setIsDialogOpen(true);
        // 清除 URL 中的 edit 參數
        router.replace('/dashboard/fragrances');
      }
    }
  }, [searchParams, fragrances, router]);

  // 搜尋過濾功能
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredFragrances(fragrances);
      return;
    }

    const filtered = fragrances.filter(fragrance => {
      const searchLower = searchTerm.toLowerCase();
      return (
        fragrance.code?.toLowerCase().includes(searchLower) ||
        fragrance.name?.toLowerCase().includes(searchLower) ||
        fragrance.supplierName?.toLowerCase().includes(searchLower) ||
        fragrance.fragranceType?.toLowerCase().includes(searchLower) ||
        fragrance.currentStock?.toString().includes(searchLower) ||
        fragrance.costPerUnit?.toString().includes(searchLower) ||
        fragrance.percentage?.toString().includes(searchLower)
      );
    });
    setFilteredFragrances(filtered);
  }, [fragrances, searchTerm]);

  const handleCartToggle = (fragranceId: string) => {
    setPurchaseCart(prevCart => {
      const newCart = new Set(prevCart);
      if (newCart.has(fragranceId)) {
        newCart.delete(fragranceId);
      } else {
        newCart.add(fragranceId);
      }
      return newCart;
    });
  };
  
  const handleCreatePurchaseOrder = () => {
    if (purchaseCart.size === 0) {
      toast.info("請至少選擇一個香精加入採購單。");
      return;
    }
    const itemIds = Array.from(purchaseCart).join(',');
    const itemType = 'fragrance';
    router.push(`/dashboard/purchase-orders/create?type=${itemType}&ids=${itemIds}`);
  };

  const handleAdd = () => {
    setSelectedFragrance(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (fragrance: FragranceData) => {
    setSelectedFragrance(fragrance);
    setIsDialogOpen(true);
  };

  const handleDelete = (fragrance: FragranceData) => {
    setSelectedFragrance(fragrance);
    setIsConfirmOpen(true);
  };

  const handleViewDetail = (fragrance: FragranceWithSupplier) => {
    setSelectedDetailFragrance(fragrance);
    setIsDetailViewOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedFragrance) return;

    const toastId = toast.loading("正在刪除香精...");
    try {
      const functions = getFunctions();
      const deleteFragrance = httpsCallable(functions, 'deleteFragrance');
      await deleteFragrance({ fragranceId: selectedFragrance.id });

      toast.success(`香精 ${selectedFragrance.name} 已成功刪除。`, { id: toastId });
      loadData();
    } catch (error) {
      console.error("刪除香精失敗:", error);
      let errorMessage = "刪除香精時發生錯誤。";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsConfirmOpen(false);
      setSelectedFragrance(null);
    }
  };

  // 盤點功能相關函式
  const handleStockChange = (id: string, value: number) => {
    setUpdatedStocks(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveStocktake = async () => {
    const changedItems = fragrances
      .filter(f => updatedStocks[f.id] !== undefined && updatedStocks[f.id] !== f.currentStock)
      .map(f => ({
        itemRefPath: `fragrances/${f.id}`,
        currentStock: f.currentStock,
        newStock: updatedStocks[f.id],
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
      loadData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "儲存盤點失敗";
      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleCancelStocktake = () => {
    setUpdatedStocks({});
    setIsStocktakeMode(false);
  };

  // 匯入/匯出處理函式
  const handleImport = async (data: any[], options?: { updateMode?: boolean }, onProgress?: (current: number, total: number) => void) => {
    const functions = getFunctions();
    
    try {
      // 調試日誌：檢查匯入資料
      console.log('開始匯入香精資料:', {
        totalRecords: data.length,
        updateMode: options?.updateMode,
        sampleData: data.slice(0, 3).map(item => ({
          name: item.name,
          code: item.code,
          supplierName: item.supplierName,
          hasSupplierName: !!item.supplierName
        }))
      });
      
      // 獲取供應商映射表
      const suppliersMap = new Map<string, string>();
      const supplierSnapshot = await getDocs(collection(db, "suppliers"));
      supplierSnapshot.forEach(doc => suppliersMap.set(doc.data().name, doc.id));
      
      // 分批處理資料
      const batchSize = 20; // 每批處理20筆
      const totalBatches = Math.ceil(data.length / batchSize);
      let processedCount = 0;
      
      for (let i = 0; i < totalBatches; i++) {
        const startIndex = i * batchSize;
        const endIndex = Math.min(startIndex + batchSize, data.length);
        const batch = data.slice(startIndex, endIndex);
        
        // 處理每一批資料
        for (const item of batch) {
          try {
            // 處理供應商ID
            let supplierId = undefined;
            if (item.supplierName) {
              supplierId = suppliersMap.get(item.supplierName);
              if (!supplierId) {
                console.warn(`找不到供應商: ${item.supplierName}`);
              }
            }
            
            const processedItem = {
              ...item,
              supplierId,
              unit: 'KG' // 固定單位為KG
            };
            
            if (options?.updateMode) {
              // 更新模式：根據香精編號更新現有資料
              const updateFragrance = httpsCallable(functions, 'updateFragranceByCode');
              await updateFragrance(processedItem);
            } else {
              // 新增模式：建立新的香精
              const createFragrance = httpsCallable(functions, 'createFragrance');
              await createFragrance(processedItem);
            }
          } catch (error) {
            console.error('處理香精資料失敗:', error);
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
      
      console.log('香精匯入結果:', `成功處理 ${processedCount} 筆資料`);
      loadData();
    } catch (error) {
      console.error('匯入香精失敗:', error);
      throw error;
    }
  };

  const handleExport = async () => {
    return fragrances.map(fragrance => ({
      code: fragrance.code,
      name: fragrance.name,
      fragranceType: fragrance.fragranceType || fragrance.status,
      supplierName: fragrance.supplierName,
      safetyStockLevel: fragrance.safetyStockLevel,
      costPerUnit: fragrance.costPerUnit,
      percentage: fragrance.percentage,
      pgRatio: fragrance.pgRatio,
      vgRatio: fragrance.vgRatio,
      currentStock: fragrance.currentStock,
      unit: 'KG'
    }));
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
            香精管理
          </h1>
          <p className="text-gray-600 mt-2">管理香精配方與庫存</p>
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
                className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="mr-2 h-4 w-4" />
                新增香精
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
                className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="mr-2 h-4 w-4" />
                新增香精
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 搜尋框 */}
      <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-gray-50 to-pink-50">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-pink-600" />
            <Input
              placeholder="搜尋香精代號、名稱、供應商、香精種類、庫存等..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-pink-200 focus:border-pink-500 focus:ring-pink-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* 手機版表格容器 */}
      <div className="lg:hidden">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-pink-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-pink-600" />
                <h2 className="text-base font-semibold text-gray-800">香精清單</h2>
              </div>
              <div className="text-xs text-gray-600">
                共 {filteredFragrances.length} 項
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-pink-200 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-pink-600 rounded-full animate-spin"></div>
                  </div>
                  <span className="mt-3 text-sm text-gray-600 font-medium">載入中...</span>
                </div>
              ) : filteredFragrances.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {filteredFragrances.map((fragrance) => {
                    const isLowStock = typeof fragrance.safetyStockLevel === 'number' && fragrance.currentStock < fragrance.safetyStockLevel;
                    return (
                      <div 
                        key={fragrance.id} 
                        className={`p-4 ${isLowStock && !isStocktakeMode ? 'bg-red-50/50' : ''} hover:bg-pink-50/50 transition-colors duration-200`}
                        onClick={() => handleViewDetail(fragrance)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                              <Droplets className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{fragrance.name}</div>
                              <div className="text-xs text-gray-500">代號: {fragrance.code}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={purchaseCart.has(fragrance.id)}
                              onCheckedChange={() => handleCartToggle(fragrance.id)}
                              aria-label={`選擇 ${fragrance.name}`}
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
                                <DropdownMenuItem onClick={() => handleViewDetail(fragrance)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  查看詳細
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(fragrance)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  編輯
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(fragrance)} className="text-red-600">刪除</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Building className="h-3 w-3 text-blue-600" />
                              <span className="text-gray-500">供應商</span>
                            </div>
                            <span className="font-medium text-gray-700">{fragrance.supplierName}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-gray-500">香精種類</span>
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              fragrance.fragranceType === 'cotton' ? 'bg-blue-100 text-blue-800' :
                              fragrance.fragranceType === 'ceramic' ? 'bg-green-100 text-green-800' :
                              fragrance.fragranceType === 'universal' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {fragrance.fragranceType === 'cotton' ? '棉芯' :
                               fragrance.fragranceType === 'ceramic' ? '陶瓷芯' :
                               fragrance.fragranceType === 'universal' ? '棉陶芯通用' :
                               '未指定'}
                            </span>
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
                                  className="w-20 h-7 text-sm border-pink-200 focus:border-pink-500 focus:ring-pink-500"
                                  value={updatedStocks[fragrance.id] ?? fragrance.currentStock}
                                  onChange={(e) => handleStockChange(fragrance.id, Number(e.target.value))}
                                />
                                <span className="text-xs text-gray-600">ml</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                                  {fragrance.currentStock} ml
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
                              {fragrance.safetyStockLevel || 0} ml
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                    <Droplets className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-medium text-foreground mb-1">沒有香精資料</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center">開始建立第一個香精來管理配方</p>
                  <Button 
                    onClick={handleAdd}
                    variant="outline"
                    size="sm"
                    className="border-pink-200 text-pink-600 hover:bg-pink-50"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    新增香精
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 桌面版表格容器 */}
      <div className="hidden lg:block">
        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-background to-accent/10 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">香精清單</h2>
            </div>
            <div className="text-sm text-muted-foreground">
              共 {filteredFragrances.length} 項香精
            </div>
          </div>
        </div>
        
        <div className="table-responsive">
          <Table className="table-enhanced">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] text-center">選取</TableHead>
                <TableHead className="text-left">香精資訊</TableHead>
                <TableHead className="text-left">供應商</TableHead>
                <TableHead className="text-left">香精種類</TableHead>
                <TableHead className="text-right">目前庫存</TableHead>
                <TableHead className="text-right">安全庫存</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-pink-200 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-pink-600 rounded-full animate-spin"></div>
                      </div>
                      <span className="mt-4 text-muted-foreground font-medium">載入香精資料中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredFragrances.length > 0 ? (
                filteredFragrances.map((fragrance) => {
                  const isLowStock = typeof fragrance.safetyStockLevel === 'number' && fragrance.currentStock < fragrance.safetyStockLevel;
                  return (
                    <TableRow 
                      key={fragrance.id} 
                      className={`${isLowStock && !isStocktakeMode ? 'bg-destructive/10' : ''} cursor-pointer hover:bg-accent/5 transition-colors duration-200`} 
                      data-state={purchaseCart.has(fragrance.id) ? "selected" : ""}
                      onClick={() => router.push(`/dashboard/fragrances/${fragrance.id}`)}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={purchaseCart.has(fragrance.id)}
                          onCheckedChange={() => handleCartToggle(fragrance.id)}
                          aria-label={`選擇 ${fragrance.name}`}
                          disabled={isStocktakeMode}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                            <Droplets className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{fragrance.name}</div>
                            <div className="text-xs text-muted-foreground">代號: {fragrance.code}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">{fragrance.supplierName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`status-badge ${
                          fragrance.fragranceType === 'cotton' ? 'bg-blue-100 text-blue-800' :
                          fragrance.fragranceType === 'ceramic' ? 'bg-green-100 text-green-800' :
                          fragrance.fragranceType === 'universal' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {fragrance.fragranceType === 'cotton' ? '棉芯' :
                           fragrance.fragranceType === 'ceramic' ? '陶瓷芯' :
                           fragrance.fragranceType === 'universal' ? '棉陶芯通用' :
                           '未指定'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isStocktakeMode ? (
                          <div className="flex justify-end items-center gap-2">
                            <Input
                              type="number"
                              className="w-24 h-8 text-right border-pink-200 focus:border-pink-500 focus:ring-pink-500"
                              value={updatedStocks[fragrance.id] ?? fragrance.currentStock}
                              onChange={(e) => handleStockChange(fragrance.id, Number(e.target.value))}
                            />
                            <span className="text-sm text-gray-600">ml</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Warehouse className="h-4 w-4 text-gray-400" />
                            <span className={`number-display ${isLowStock ? 'number-negative' : 'number-positive'}`}>
                              {fragrance.currentStock} ml
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
                            {fragrance.safetyStockLevel || 0} ml
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
                            <DropdownMenuItem onClick={() => handleViewDetail(fragrance)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看詳細
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(fragrance)}>
                              <Edit className="h-4 w-4 mr-2" />
                              編輯香精
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(fragrance)}
                              className="text-red-600 focus:text-red-600"
                            >
                              刪除香精
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Droplets className="h-8 w-8 text-muted-foreground" />
                      </div>
                                              <h3 className="text-lg font-medium text-foreground mb-2">沒有香精資料</h3>
                        <p className="text-muted-foreground mb-4">開始建立第一個香精來管理配方</p>
                      <Button 
                        onClick={handleAdd}
                        variant="outline"
                        className="border-pink-200 text-pink-600 hover:bg-pink-50"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        新增香精
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

      <FragranceDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onFragranceUpdate={loadData}
        fragranceData={selectedFragrance}
      />

      {selectedFragrance && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmDelete}
          title={`確認刪除香精`}
          description={`您確定要永久刪除香精「${selectedFragrance.name}」嗎？此操作無法復原。`}
        />
      )}

      <ImportExportDialog
        isOpen={isImportExportOpen}
        onOpenChange={setIsImportExportOpen}
        onImport={handleImport}
        onExport={handleExport}
        title="香精資料"
        description="匯入或匯出香精資料，支援 Excel 和 CSV 格式。匯入時會自動生成缺失的代號。"
        color="pink"
        showUpdateOption={true}
        maxBatchSize={500}
        sampleData={[
          {
            code: "FRAG001",
            name: "示例香精",
            fragranceType: "cotton",
            supplierName: "示例供應商",
            safetyStockLevel: 1000,
            costPerUnit: 15.5,
            percentage: 5,
            pgRatio: 70,
            vgRatio: 30,
            currentStock: 500,
            unit: "KG"
          }
        ]}
        fields={[
          { key: "code", label: "香精代號", required: false, type: "string" },
          { key: "name", label: "香精名稱", required: true, type: "string" },
          { key: "fragranceType", label: "香精種類", required: false, type: "string" },
          { key: "supplierName", label: "供應商", required: false, type: "string" },
          { key: "safetyStockLevel", label: "安全庫存", required: false, type: "number" },
          { key: "costPerUnit", label: "單位成本", required: false, type: "number" },
          { key: "percentage", label: "香精比例", required: false, type: "number" },
          { key: "pgRatio", label: "PG比例", required: false, type: "number" },
          { key: "vgRatio", label: "VG比例", required: false, type: "number" },
          { key: "currentStock", label: "目前庫存", required: false, type: "number" },
          { key: "unit", label: "單位", required: false, type: "string" }
        ]}
      />

      {selectedDetailFragrance && (
        <DetailViewDialog
          isOpen={isDetailViewOpen}
          onOpenChange={setIsDetailViewOpen}
          title={selectedDetailFragrance.name}
          subtitle={`代號: ${selectedDetailFragrance.code}`}
          sections={[
            {
              title: "基本資訊",
              icon: <Droplets className="h-4 w-4" />,
              fields: [
                { label: "香精代號", value: selectedDetailFragrance.code },
                { label: "香精名稱", value: selectedDetailFragrance.name },
                { label: "供應商", value: selectedDetailFragrance.supplierName },
                { label: "香精種類", value: selectedDetailFragrance.fragranceType === 'cotton' ? '棉芯' :
                   selectedDetailFragrance.fragranceType === 'ceramic' ? '陶瓷芯' :
                   selectedDetailFragrance.fragranceType === 'universal' ? '棉陶芯通用' : '未指定' },
              ]
            },
            {
              title: "庫存資訊",
              icon: <Warehouse className="h-4 w-4" />,
              fields: [
                { label: "目前庫存", value: selectedDetailFragrance.currentStock, type: "number" },
                { label: "安全庫存", value: selectedDetailFragrance.safetyStockLevel, type: "number" },
                { label: "單位成本", value: selectedDetailFragrance.costPerUnit, type: "currency" },
              ]
            },
            {
              title: "配方資訊",
              icon: <Calculator className="h-4 w-4" />,
              fields: [
                { label: "濃度百分比", value: selectedDetailFragrance.percentage, type: "number" },
                { label: "PG比例", value: selectedDetailFragrance.pgRatio, type: "number" },
                { label: "VG比例", value: selectedDetailFragrance.vgRatio, type: "number" },
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
                handleEdit(selectedDetailFragrance);
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


export default function FragrancesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FragrancesPageContent />
    </Suspense>
  );
}
