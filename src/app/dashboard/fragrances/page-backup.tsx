'use client';

import { useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, DocumentReference, QueryDocumentSnapshot, DocumentData, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useDataSearch, createFragranceSearchConfig } from '@/hooks/useDataSearch';
import { db } from '@/lib/firebase';
import { FragranceDialog, FragranceData } from './FragranceDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MoreHorizontal, ShoppingCart, Search, Package, Calculator, FileSpreadsheet, Warehouse, Plus, Eye, Edit, Droplets, Building, Calendar, AlertTriangle, X, Shield, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import FragranceCalculations from '@/utils/fragranceCalculations';
import { logger } from '@/utils/logger';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/usePermission';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportExportDialog } from '@/components/ImportExportDialog';
import { DetailViewDialog } from '@/components/DetailViewDialog';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGlobalCart } from '@/hooks/useGlobalCart';
import { useCartOperations } from '@/hooks/useCartOperations';

interface FragranceWithSupplier extends FragranceData {
  supplierName: string;
  fragranceStatus?: string;
  type: 'fragrance';
}

function FragrancesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fragrances, setFragrances] = useState<FragranceWithSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedFragrance, setSelectedFragrance] = useState<FragranceData | null>(null);
  const [isStocktakeMode, setIsStocktakeMode] = useState(false);
  const [updatedStocks, setUpdatedStocks] = useState<Record<string, number>>({});
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [selectedDetailFragrance, setSelectedDetailFragrance] = useState<FragranceWithSupplier | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);

  // 權限檢查
  const { hasPermission, isAdmin } = usePermission();
  const canViewFragrances = hasPermission('fragrances.view') || hasPermission('fragrances.manage');
  const canManageFragrances = hasPermission('fragrances.manage');

  // 使用統一的搜尋過濾 Hook
  const {
    searchTerm,
    setSearchTerm,
    activeFilters,
    setFilter,
    clearFilter,
    filteredData: filteredFragrances,
    totalCount,
    filteredCount
  } = useDataSearch(fragrances, createFragranceSearchConfig<FragranceWithSupplier>());

  // 便利方法：獲取當前過濾器值
  const selectedSuppliers = (activeFilters.supplierName as Set<string>) || new Set<string>();
  const selectedFragranceTypes = (activeFilters.fragranceType as Set<string>) || new Set<string>();
  const selectedFragranceStatuses = (activeFilters.fragranceStatus as Set<string>) || new Set<string>();
  const showLowStockOnly = Boolean(activeFilters.currentStock);

  // 便利方法：設定過濾器
  const setSelectedSuppliers = (suppliers: Set<string>) => {
    if (suppliers.size > 0) {
      setFilter('supplierName', suppliers);
    } else {
      clearFilter('supplierName');
    }
  };

  const setSelectedFragranceTypes = (types: Set<string>) => {
    if (types.size > 0) {
      setFilter('fragranceType', types);
    } else {
      clearFilter('fragranceType');
    }
  };

  const setSelectedFragranceStatuses = (statuses: Set<string>) => {
    if (statuses.size > 0) {
      setFilter('fragranceStatus', statuses);
    } else {
      clearFilter('fragranceStatus');
    }
  };

  const setShowLowStockOnly = (show: boolean) => {
    if (show) {
      setFilter('currentStock', true);
    } else {
      clearFilter('currentStock');
    }
  };

  // 使用購物車操作 Hook
  const {
    selectedItems: purchaseCart,
    selectionStats,
    handleToggleAll: handleSelectAll,
    handleToggleItem: handleCartToggle,
    addSelectedItems: handleAddToPurchaseCart,
    cartLoading,
    addSingleItem: addToPurchaseCart
  } = useCartOperations(filteredFragrances, {
    itemType: 'fragrance',
    itemTypeName: '香精'
  });

  const fetchFragrances = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firebase 未初始化");
      }
      
      // 載入供應商資料
      const suppliersSnapshot = await getDocs(collection(db, 'suppliers'));
      const suppliersMap = new Map();
      suppliersSnapshot.docs.forEach(doc => {
        suppliersMap.set(doc.id, doc.data().name);
      });

      // 載入香精資料
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
          fragranceType: data.fragranceType || '未指定',
          fragranceStatus: data.fragranceStatus || '未指定',
          supplierRef: data.supplierRef,
          safetyStockLevel: data.safetyStockLevel,
          costPerUnit: data.costPerUnit,
          unit: data.unit || 'KG',
          percentage: data.percentage,
          pgRatio: data.pgRatio,
          vgRatio: data.vgRatio,
          currentStock: data.currentStock,
          supplierName,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          type: 'fragrance' as const,
        } as FragranceWithSupplier;
      });
      setFragrances(fragrancesList);
    } catch (error) {
      logger.error("讀取香精資料失敗", error as Error);
      toast.error("讀取香精資料失敗。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFragrances();
  }, [fetchFragrances]);

  // 處理 URL 查詢參數
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && fragrances.length > 0) {
      const fragranceToEdit = fragrances.find(f => f.id === editId);
      if (fragranceToEdit) {
        setSelectedFragrance(fragranceToEdit);
        setIsDialogOpen(true);
        router.replace('/dashboard/fragrances');
      }
    }
  }, [searchParams, fragrances, router]);

  // 操作處理函數
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
      fetchFragrances();
    } catch (error) {
      logger.error("刪除香精失敗", error as Error);
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

  // 盤點模式處理
  const handleStockChange = (fragranceId: string, newStock: number) => {
    setUpdatedStocks(prev => ({ ...prev, [fragranceId]: newStock }));
  };

  const handleSaveStocktake = async () => {
    const toastId = toast.loading("正在保存盤點結果...");
    try {
      if (!db) {
        throw new Error("Firebase 未初始化");
      }
      for (const [fragranceId, newStock] of Object.entries(updatedStocks)) {
        const fragranceRef = doc(db, 'fragrances', fragranceId);
        await updateDoc(fragranceRef, { currentStock: newStock });
      }
      toast.success("盤點結果已保存", { id: toastId });
      setIsStocktakeMode(false);
      setUpdatedStocks({});
      fetchFragrances();
    } catch (error) {
      toast.error("保存盤點結果失敗", { id: toastId });
      logger.error("保存盤點結果失敗", error as Error);
    }
  };

  const handleCancelStocktake = () => {
    setIsStocktakeMode(false);
    setUpdatedStocks({});
  };

  // 統計數據
  const getLowStockCount = () => {
    return fragrances.filter(f => typeof f.safetyStockLevel === 'number' && f.currentStock < f.safetyStockLevel).length;
  };

  const getTotalValue = () => {
    return fragrances.reduce((sum, f) => sum + (f.currentStock * (f.costPerUnit || 0)), 0);
  };

  // 取得可用的過濾選項
  const availableSuppliers = useMemo(() => {
    return [...new Set(fragrances.map(f => f.supplierName).filter(Boolean) as string[])].sort();
  }, [fragrances]);

  const availableFragranceTypes = useMemo(() => {
    return [...new Set(fragrances.map(f => f.fragranceType).filter(Boolean) as string[])].sort();
  }, [fragrances]);

  const availableFragranceStatuses = useMemo(() => {
    return [...new Set(fragrances.map(f => f.fragranceStatus).filter(Boolean) as string[])].sort();
  }, [fragrances]);

  // 權限保護
  if (!canViewFragrances && !isAdmin()) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="max-w-2xl mx-auto">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            您沒有權限查看香精管理頁面。請聯繫系統管理員獲取相關權限。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      {/* 頁面標題 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
            配方庫
          </h1>
          <p className="text-gray-600 mt-2">管理香精配方與庫存</p>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總香精數</CardTitle>
            <Droplets className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{fragrances.length}</div>
            <p className="text-xs text-muted-foreground">系統中的香精總數</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">低庫存警告</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getLowStockCount() > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {getLowStockCount()}
            </div>
            <p className="text-xs text-muted-foreground">庫存低於安全線</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總庫存價值</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${getTotalValue().toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">總庫存成本</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">香精試算</CardTitle>
            <Calculator className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">試算</div>
            <p className="text-xs text-muted-foreground">配方計算工具</p>
          </CardContent>
        </Card>
      </div>

      {/* 行動版功能按鈕區域 */}
      <div className="block lg:hidden mb-6">
        <div className="flex flex-col gap-2">
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
              {canManageFragrances && (
                <Button variant="outline" onClick={() => setIsImportExportOpen(true)} className="w-full">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  匯入/匯出
                </Button>
              )}
              <Button onClick={handleAddToPurchaseCart} disabled={selectionStats.selectedCount === 0 || cartLoading} variant="outline" className="w-full">
                <ShoppingCart className="mr-2 h-4 w-4" />
                加入採購車 ({selectionStats.selectedCount})
              </Button>
              {canManageFragrances && (
                <Button variant="outline" onClick={() => setIsStocktakeMode(true)} className="w-full">
                  <Calculator className="mr-2 h-4 w-4" />
                  盤點模式
                </Button>
              )}
              {canManageFragrances && (
                <Button 
                  onClick={handleAdd}
                  className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新增香精
                </Button>
              )}
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
              {canManageFragrances && (
                <div className="flex gap-1">
                  <Button variant="outline" onClick={() => setIsImportExportOpen(true)}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    匯入/匯出
                  </Button>
                </div>
              )}
              <Button onClick={handleAddToPurchaseCart} disabled={selectionStats.selectedCount === 0 || cartLoading} variant="outline">
                <ShoppingCart className="mr-2 h-4 w-4" />
                加入採購車 ({selectionStats.selectedCount})
              </Button>
              {canManageFragrances && (
                <Button variant="outline" onClick={() => setIsStocktakeMode(true)}>
                  <Calculator className="mr-2 h-4 w-4" />
                  盤點模式
                </Button>
              )}
              {canManageFragrances && (
                <Button 
                  onClick={handleAdd}
                  className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新增香精
                </Button>
              )}
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

      {/* 篩選標籤 */}
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
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            >
              安全庫存 ({getLowStockCount()})
            </Badge>
          )}

          {/* 供應商標籤 - 橙色 */}
          {availableSuppliers.map(supplier => (
            <Badge
              key={supplier}
              variant={selectedSuppliers.has(supplier) ? "default" : "secondary"}
              className={`cursor-pointer transition-colors ${
                selectedSuppliers.has(supplier) 
                  ? "bg-orange-600 hover:bg-orange-700 text-white" 
                  : "bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300"
              }`}
              onClick={() => {
                const newSet = new Set(selectedSuppliers);
                if (newSet.has(supplier)) {
                  newSet.delete(supplier);
                } else {
                  newSet.add(supplier);
                }
                setSelectedSuppliers(newSet);
              }}
            >
              {supplier}
            </Badge>
          ))}

          {/* 香精種類標籤 - 紫色 */}
          {availableFragranceTypes.map(type => {
            const isSelected = selectedFragranceTypes.has(type);
            const getTypeColor = (type: string) => {
              switch (type) {
                case '棉芯':
                  return isSelected 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300";
                case '陶瓷芯':
                  return isSelected 
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "bg-green-100 hover:bg-green-200 text-green-800 border-green-300";
                case '棉陶芯通用':
                  return isSelected 
                    ? "bg-purple-600 hover:bg-purple-700 text-white" 
                    : "bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300";
                default:
                  return isSelected 
                    ? "bg-gray-600 hover:bg-gray-700 text-white" 
                    : "bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300";
              }
            };
            
            return (
              <Badge
                key={type}
                variant={isSelected ? "default" : "secondary"}
                className={`cursor-pointer transition-colors ${getTypeColor(type)}`}
                onClick={() => {
                  const newSet = new Set(selectedFragranceTypes);
                  if (newSet.has(type)) {
                    newSet.delete(type);
                  } else {
                    newSet.add(type);
                  }
                  setSelectedFragranceTypes(newSet);
                }}
              >
                {type}
              </Badge>
            );
          })}

          {/* 香精狀態標籤 - 彩色 */}
          {availableFragranceStatuses.map(status => {
            const isSelected = selectedFragranceStatuses.has(status);
            const getStatusColor = (status: string) => {
              switch (status) {
                case '啟用':
                  return isSelected 
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "bg-green-100 hover:bg-green-200 text-green-800 border-green-300";
                case '備用':
                  return isSelected 
                    ? "bg-yellow-600 hover:bg-yellow-700 text-white" 
                    : "bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300";
                case '棄用':
                  return isSelected 
                    ? "bg-red-600 hover:bg-red-700 text-white" 
                    : "bg-red-100 hover:bg-red-200 text-red-800 border-red-300";
                default:
                  return isSelected 
                    ? "bg-gray-600 hover:bg-gray-700 text-white" 
                    : "bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300";
              }
            };
            
            return (
              <Badge
                key={status}
                variant={isSelected ? "default" : "secondary"}
                className={`cursor-pointer transition-colors ${getStatusColor(status)}`}
                onClick={() => {
                  const newSet = new Set(selectedFragranceStatuses);
                  if (newSet.has(status)) {
                    newSet.delete(status);
                  } else {
                    newSet.add(status);
                  }
                  setSelectedFragranceStatuses(newSet);
                }}
              >
                {status === '啟用' ? '🟢' : status === '備用' ? '🟡' : status === '棄用' ? '🔴' : ''} {status}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* 手機版卡片列表 */}
      <div className="lg:hidden mb-8">
        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-background to-accent/10 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold text-foreground">
                  {isStocktakeMode ? '香精盤點中' : '香精清單'}
                </h2>
              </div>
              <div className="text-sm text-muted-foreground">
                共 {filteredFragrances.length} 項香精
              </div>
            </div>
          </div>

          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-pink-200 rounded-full animate-spin"></div>
                  <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-pink-600 rounded-full animate-spin"></div>
                </div>
                <span className="mt-4 text-muted-foreground font-medium">載入香精資料中...</span>
              </div>
            ) : filteredFragrances.length > 0 ? (
              <div className="divide-y divide-border">
                {filteredFragrances.map((fragrance) => {
                  const isLowStock = typeof fragrance.safetyStockLevel === 'number' && fragrance.currentStock < fragrance.safetyStockLevel;
                  return (
                    <div 
                      key={fragrance.id} 
                      className={`p-4 hover:bg-accent/5 transition-colors duration-200 ${
                        isLowStock && !isStocktakeMode ? 'bg-destructive/10' : ''
                      } ${!isStocktakeMode ? 'cursor-pointer' : ''}`}
                      onClick={!isStocktakeMode ? () => router.push(`/dashboard/fragrances/${fragrance.id}`) : undefined}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                            <Droplets className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{fragrance.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                {fragrance.code}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={purchaseCart.has(fragrance.id)}
                            onCheckedChange={() => handleCartToggle(fragrance.id)}
                            aria-label={`選擇 ${fragrance.name}`}
                            disabled={isStocktakeMode}
                            onClick={(e) => e.stopPropagation()}
                            className="border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" className="h-8 w-8 p-0" disabled={isStocktakeMode}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => addToPurchaseCart(fragrance)}
                                disabled={cartLoading}
                              >
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                加入採購車
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewDetail(fragrance)}>
                                <Eye className="mr-2 h-4 w-4" />
                                查看詳細
                              </DropdownMenuItem>
                              {canManageFragrances && (
                                <DropdownMenuItem onClick={() => handleEdit(fragrance)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  編輯
                                </DropdownMenuItem>
                              )}
                              {canManageFragrances && (
                                <DropdownMenuItem onClick={() => handleDelete(fragrance)} className="text-red-600">刪除</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {!isStocktakeMode && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Building className="h-3 w-3 text-blue-600" />
                              <span className="text-gray-500">供應商</span>
                            </div>
                            <span className="font-medium text-gray-700">{fragrance.supplierName}</span>
                          </div>
                        )}
                        {!isStocktakeMode && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-gray-500">香精種類</span>
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              fragrance.fragranceType === '棉芯' ? 'bg-blue-100 text-blue-800' :
                              fragrance.fragranceType === '陶瓷芯' ? 'bg-green-100 text-green-800' :
                              fragrance.fragranceType === '棉陶芯通用' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {fragrance.fragranceType || '未指定'}
                            </span>
                          </div>
                        )}
                        {!isStocktakeMode && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-gray-500">啟用狀態</span>
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              fragrance.fragranceStatus === '啟用' ? 'bg-green-100 text-green-800' :
                              fragrance.fragranceStatus === '備用' ? 'bg-yellow-100 text-yellow-800' :
                              fragrance.fragranceStatus === '棄用' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {fragrance.fragranceStatus || '未指定'}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Warehouse className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-500">{isStocktakeMode ? "應有庫存:" : "目前庫存:"}</span>
                          </div>
                          {isStocktakeMode ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">
                                {fragrance.currentStock || 0} KG
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              {isLowStock && (
                                <AlertTriangle className="h-3 w-3 text-red-600" />
                              )}
                              <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                                {fragrance.currentStock} KG
                              </span>
                            </div>
                          )}
                        </div>
                        {isStocktakeMode && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-gray-500">現有庫存:</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                className="w-20 h-7 text-sm border-pink-200 focus:border-pink-500 focus:ring-pink-500"
                                value={updatedStocks[fragrance.id] ?? fragrance.currentStock}
                                onChange={(e) => handleStockChange(fragrance.id, Number(e.target.value))}
                              />
                              <span className="text-xs text-gray-600">KG</span>
                            </div>
                          </div>
                        )}
                        {!isStocktakeMode && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-gray-500">安全庫存</span>
                            </div>
                            <span className="font-medium text-gray-700">
                              {fragrance.safetyStockLevel || 0} KG
                            </span>
                          </div>
                        )}
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

      {/* 桌面版表格容器 */}
      <div className="hidden lg:block">
        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-background to-accent/10 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                {isStocktakeMode ? '香精盤點中' : '香精清單'}
              </h2>
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
                <TableHead className="w-[60px] text-center">
                  {!isStocktakeMode && (
                    <div className="flex items-center gap-2" title="全選所有香精">
                      <Checkbox
                        checked={selectionStats.isAllSelected}
                        onCheckedChange={handleSelectAll}
                        className="border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
                      />
                      <span className="text-xs text-muted-foreground">全選</span>
                    </div>
                  )}
                </TableHead>
                <TableHead className="text-left">香精資訊</TableHead>
                {!isStocktakeMode && <TableHead className="text-left">香精種類</TableHead>}
                {!isStocktakeMode && <TableHead className="text-left">啟用狀態</TableHead>}
                {!isStocktakeMode && <TableHead className="text-left">供應商</TableHead>}
                <TableHead className="text-right">{isStocktakeMode ? "應有庫存" : "目前庫存"}</TableHead>
                {isStocktakeMode && <TableHead className="text-right">現有庫存</TableHead>}
                {!isStocktakeMode && <TableHead className="text-right">安全庫存</TableHead>}
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
                      className={`${isLowStock && !isStocktakeMode ? 'bg-destructive/10' : ''} ${!isStocktakeMode ? 'cursor-pointer hover:bg-accent/5' : ''} transition-colors duration-200`} 
                      data-state={purchaseCart.has(fragrance.id) ? "selected" : ""}
                      onClick={!isStocktakeMode ? () => router.push(`/dashboard/fragrances/${fragrance.id}`) : undefined}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={purchaseCart.has(fragrance.id)}
                          onCheckedChange={() => handleCartToggle(fragrance.id)}
                          aria-label={`選擇 ${fragrance.name}`}
                          disabled={isStocktakeMode}
                          className="border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-pink-600 to-rose-600 rounded-lg flex items-center justify-center">
                            <Droplets className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{fragrance.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                                  {fragrance.code}
                                </Badge>
                              </div>
                          </div>
                        </div>
                      </TableCell>
                      {!isStocktakeMode && (
                        <TableCell>
                          <Badge className={`status-badge ${
                            fragrance.fragranceType === '棉芯' ? 'bg-blue-100 text-blue-800' :
                            fragrance.fragranceType === '陶瓷芯' ? 'bg-green-100 text-green-800' :
                            fragrance.fragranceType === '棉陶芯通用' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {fragrance.fragranceType || '未指定'}
                          </Badge>
                        </TableCell>
                      )}
                      {!isStocktakeMode && (
                        <TableCell>
                          <Badge className={`status-badge ${
                            fragrance.fragranceStatus === '啟用' ? 'bg-green-100 text-green-800' :
                            fragrance.fragranceStatus === '備用' ? 'bg-yellow-100 text-yellow-800' :
                            fragrance.fragranceStatus === '棄用' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {fragrance.fragranceStatus || '未指定'}
                          </Badge>
                        </TableCell>
                      )}
                      {!isStocktakeMode && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-foreground">{fragrance.supplierName}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        {isStocktakeMode ? (
                          <div className="flex justify-end items-center gap-2">
                            <span className="number-display number-neutral">
                              {fragrance.currentStock || 0} KG
                            </span>
                          </div>
                        ) : (
                          <div className="flex justify-end items-center gap-2">
                            {isLowStock && (
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            )}
                            <span className={`number-display font-semibold ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                              {fragrance.currentStock || 0} KG
                            </span>
                          </div>
                        )}
                      </TableCell>
                      {isStocktakeMode && (
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Input
                              type="number"
                              className="w-20 h-8 text-sm text-right border-pink-200 focus:border-pink-500 focus:ring-pink-500"
                              value={updatedStocks[fragrance.id] ?? fragrance.currentStock}
                              onChange={(e) => handleStockChange(fragrance.id, Number(e.target.value))}
                            />
                            <span className="text-xs text-gray-600">KG</span>
                          </div>
                        </TableCell>
                      )}
                      {!isStocktakeMode && (
                        <TableCell className="text-right">
                          <span className="number-display number-neutral">
                            {fragrance.safetyStockLevel || 0} KG
                          </span>
                        </TableCell>
                      )}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isStocktakeMode}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuItem 
                              onClick={() => addToPurchaseCart(fragrance)}
                              disabled={cartLoading}
                            >
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              加入採購車
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewDetail(fragrance)}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看詳細
                            </DropdownMenuItem>
                            {canManageFragrances && (
                              <DropdownMenuItem onClick={() => handleEdit(fragrance)}>
                                <Edit className="mr-2 h-4 w-4" />
                                編輯
                              </DropdownMenuItem>
                            )}
                            {canManageFragrances && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(fragrance)} className="text-red-600">
                                  刪除
                                </DropdownMenuItem>
                              </>
                            )}
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
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                        <Droplets className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-base font-medium text-foreground mb-1">沒有符合條件的香精</h3>
                      <p className="text-sm text-muted-foreground mb-4">嘗試調整搜尋或篩選條件</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        </div>
      </div>

      {/* 對話框組件 */}
      <FragranceDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onFragranceUpdate={fetchFragrances}
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
        onImport={async (data: any[], options?: { updateMode?: boolean }, onProgress?: (current: number, total: number) => void) => {
          const functions = getFunctions();
          
          try {
            console.log('香精匯入資料:', data);
            fetchFragrances();
          } catch (error) {
            logger.error('匯入香精失敗', error as Error);
            throw error;
          }
        }}
        onExport={async () => {
          return fragrances.map(fragrance => ({
            code: fragrance.code,
            name: fragrance.name,
            fragranceType: fragrance.fragranceType || '未指定',
            fragranceStatus: fragrance.fragranceStatus || '未指定',
            supplierName: fragrance.supplierName,
            currentStock: fragrance.currentStock,
            safetyStockLevel: fragrance.safetyStockLevel,
            costPerUnit: fragrance.costPerUnit,
            percentage: fragrance.percentage,
            pgRatio: fragrance.pgRatio,
            vgRatio: fragrance.vgRatio,
            unit: 'KG'
          }));
        }}
        title="香精資料"
        description="匯入或匯出香精資料，支援 Excel 和 CSV 格式。"
        color="purple"
        showUpdateOption={false}
        maxBatchSize={500}
        sampleData={[
          {
            code: "FRAG001",
            name: "示例香精",
            fragranceType: "棉芯",
            fragranceStatus: "啟用",
            supplierName: "示例供應商",
            currentStock: 500,
            safetyStockLevel: 1000,
            costPerUnit: 15.5,
            percentage: 5,
            unit: "KG"
          }
        ]}
        fields={[
          { key: "code", label: "香精代號", required: true, type: "string" },
          { key: "name", label: "香精名稱", required: false, type: "string" },
          { key: "fragranceType", label: "香精種類", required: false, type: "string" },
          { key: "fragranceStatus", label: "啟用狀態", required: false, type: "string" },
          { key: "supplierName", label: "供應商", required: false, type: "string" },
          { key: "currentStock", label: "目前庫存", required: false, type: "number" },
          { key: "safetyStockLevel", label: "安全庫存", required: false, type: "number" },
          { key: "costPerUnit", label: "單位成本", required: false, type: "number" },
          { key: "percentage", label: "香精比例%", required: false, type: "number" },
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
                { label: "香精種類", value: selectedDetailFragrance.fragranceType || '未指定' },
                { label: "啟用狀態", value: selectedDetailFragrance.fragranceStatus || '未指定' },
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

      {/* 香精試算器暫時移除 - 應該在產品頁面使用 */}
      {/* <FragranceCalculatorDialog
        isOpen={isCalculatorOpen}
        onOpenChange={setIsCalculatorOpen}
      /> */}
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