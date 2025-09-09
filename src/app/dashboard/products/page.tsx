// src/app/dashboard/products/page.tsx
'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, DocumentReference, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';

import { MoreHorizontal, Droplets, FileSpreadsheet, Eye, Edit, Package, Factory, Calendar, Plus, Tag, Library, Search, Shield, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/usePermission';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

import { ProductDialog, ProductData } from './ProductDialog'; 
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FragranceChangeDialog } from './FragranceChangeDialog';
import { DetailViewDialog } from '@/components/DetailViewDialog';
import { ImportExportDialog } from '@/components/ImportExportDialog';
import { FragranceCalculatorDialog } from './FragranceCalculatorDialog';

// 擴充介面，用於在前端顯示關聯資料的名稱
interface ProductWithDetails extends ProductData {
  seriesName: string;
  fragranceName: string;
  fragranceCode: string;
  status?: '啟用' | '備用' | '棄用';
}

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isFragranceDialogOpen, setIsFragranceDialogOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<ProductWithDetails | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDetails | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<ProductWithDetails[]>([]);
  const [selectedProductTypes, setSelectedProductTypes] = useState<Set<string>>(new Set());
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(new Set());
  const [isFragranceCalculatorOpen, setIsFragranceCalculatorOpen] = useState(false);

  // 權限檢查
  const { hasPermission, isAdmin } = usePermission();
  const canViewProducts = hasPermission('products.view') || hasPermission('products:view');
  const canManageProducts = hasPermission('products.manage') || hasPermission('products:manage') || hasPermission('products:create') || hasPermission('products:edit');
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      
      const seriesMap = new Map<string, string>();
      const fragrancesMap = new Map<string, { name: string; code: string }>();
      
      const seriesSnapshot = await getDocs(collection(db, "productSeries"));
      seriesSnapshot.forEach(doc => seriesMap.set(doc.id, doc.data().name));
      
      const fragrancesSnapshot = await getDocs(collection(db, "fragrances"));
      fragrancesSnapshot.forEach(doc => {
        const data = doc.data();
        fragrancesMap.set(doc.id, {
          name: data.name || '未知香精',
          code: data.code || ''
        });
      });

      const productsSnapshot = await getDocs(collection(db, 'products'));
      
      const productsList = productsSnapshot.docs.map(doc => {
        const data = doc.data() as ProductData;
        const fragranceInfo = fragrancesMap.get(data.currentFragranceRef?.id);
        return {
          ...data,
          id: doc.id,
          seriesName: seriesMap.get(data.seriesRef?.id) || '未知系列',
          fragranceName: fragranceInfo?.name || '未知香精',
          fragranceCode: fragranceInfo?.code || '',
        } as ProductWithDetails;
      });

      // 排序：先按系列名稱升序，再按產品名稱升序
      const sortedProductsList = productsList.sort((a, b) => {
        // 首先按系列名稱排序
        const seriesComparison = (a.seriesName || '').localeCompare(b.seriesName || '');
        if (seriesComparison !== 0) {
          return seriesComparison;
        }
        // 如果系列相同，再按產品名稱排序
        return (a.name || '').localeCompare(b.name || '');
      });

      setProducts(sortedProductsList);
      setFilteredProducts(sortedProductsList);
    } catch (error) {
      console.error("讀取產品資料失敗:", error);
      toast.error("讀取產品資料失敗。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 搜尋過濾功能
  useEffect(() => {
    if (!searchTerm.trim() && selectedProductTypes.size === 0 && selectedSeries.size === 0) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter(product => {
      // 搜尋詞過濾
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (
          product.code?.toLowerCase().includes(searchLower) ||
          product.name?.toLowerCase().includes(searchLower) ||
          product.seriesName?.toLowerCase().includes(searchLower) ||
          product.fragranceName?.toLowerCase().includes(searchLower) ||
          product.fragranceCode?.toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }

      // 產品類型過濾
      if (selectedProductTypes.size > 0) {
        // 這裡需要從產品系列中獲取產品類型，暫時跳過
        // TODO: 實現產品類型過濾
      }

      // 產品系列過濾
      if (selectedSeries.size > 0 && !selectedSeries.has(product.seriesName || '')) {
        return false;
      }

      return true;
    });

    // 排序：先按系列名稱升序，再按產品名稱升序
    const sorted = filtered.sort((a, b) => {
      // 首先按系列名稱排序
      const seriesComparison = (a.seriesName || '').localeCompare(b.seriesName || '');
      if (seriesComparison !== 0) {
        return seriesComparison;
      }
      // 如果系列相同，再按產品名稱排序
      return (a.name || '').localeCompare(b.name || '');
    });

    setFilteredProducts(sorted);
  }, [products, searchTerm, selectedProductTypes, selectedSeries]);

  // 處理 URL 查詢參數
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && products.length > 0) {
      const productToEdit = products.find(product => product.id === editId);
      if (productToEdit) {
        setSelectedProduct(productToEdit);
        setIsDialogOpen(true);
        // 清除 URL 中的 edit 參數
        router.replace('/dashboard/products');
      }
    }
  }, [searchParams, products, router]);

  // 操作處理函式
  const handleAdd = () => { 
    setSelectedProduct(null); 
    setIsDialogOpen(true); 
  };
  
  const handleEdit = (product: ProductWithDetails) => { 
    setSelectedProduct(product); 
    setIsDialogOpen(true); 
  };
  
  const handleDelete = (product: ProductWithDetails) => { 
    setSelectedProduct(product); 
    setIsConfirmOpen(true); 
  };

  const handleViewDetail = (product: ProductWithDetails) => {
    router.push(`/dashboard/products/${product.id}`);
  };

  const handleSeriesManagement = () => {
    router.push('/dashboard/product-series');
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleFragranceCalculator = () => {
    if (selectedProducts.size === 0) {
      toast.error('請先選擇要試算的產品');
      return;
    }
    
    if (selectedProducts.size > 10) {
      toast.error('最多只能選擇 10 個產品進行香精試算');
      return;
    }
    
    setIsFragranceCalculatorOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;
    const toastId = toast.loading("正在刪除產品...");
    try {
      const functions = getFunctions();
      const deleteProduct = httpsCallable(functions, 'deleteProduct');
      await deleteProduct({ productId: selectedProduct.id });
      toast.success(`產品 ${selectedProduct.name} 已成功刪除。`, { id: toastId });
      loadData();
    } catch (error) {
      console.error("刪除產品失敗:", error);
      let errorMessage = "刪除產品時發生錯誤。";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsConfirmOpen(false);
      setSelectedProduct(null);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedProducts.size === 0) return;
    const toastId = toast.loading(`正在刪除 ${selectedProducts.size} 個產品...`);
    try {
      const functions = getFunctions();
      const deleteProduct = httpsCallable(functions, 'deleteProduct');
      
      const deletePromises = Array.from(selectedProducts).map(productId => 
        deleteProduct({ productId })
      );
      
      await Promise.all(deletePromises);
      toast.success(`已成功刪除 ${selectedProducts.size} 個產品。`, { id: toastId });
      setSelectedProducts(new Set());
      loadData();
    } catch (error) {
      console.error("批次刪除產品失敗:", error);
      let errorMessage = "批次刪除產品時發生錯誤。";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsBatchDeleteOpen(false);
    }
  };

  // 匯入/匯出處理函式
  const handleImport = async (data: any[], options?: { updateMode?: boolean }, onProgress?: (current: number, total: number) => void) => {
    if (!db) {
      throw new Error('Firebase 未初始化');
    }

    const functions = getFunctions();
    const createProduct = httpsCallable(functions, 'createProduct');
    const updateProduct = httpsCallable(functions, 'updateProduct');
    
    let current = 0;
    const total = data.length;
    const results = {
      success: 0,
      failed: 0,
      failedItems: [] as Array<{ item: any; error: string; row: number }>
    };
    
    for (const item of data) {
      try {
        // 查找系列ID
        let seriesId = null;
        if (item.seriesName) {
          const seriesQuery = query(
            collection(db, 'productSeries'),
            where('name', '==', item.seriesName)
          );
          const seriesSnapshot = await getDocs(seriesQuery);
          if (!seriesSnapshot.empty) {
            seriesId = seriesSnapshot.docs[0].id;
          } else {
            throw new Error(`系列名稱 "${item.seriesName}" 不存在於系統中`);
          }
        }

        // 查找香精ID
        let fragranceId = null;
        if (item.fragranceCode) {
          const fragranceQuery = query(
            collection(db, 'fragrances'),
            where('code', '==', item.fragranceCode)
          );
          const fragranceSnapshot = await getDocs(fragranceQuery);
          if (!fragranceSnapshot.empty) {
            fragranceId = fragranceSnapshot.docs[0].id;
          } else {
            throw new Error(`香精編號 "${item.fragranceCode}" 不存在於系統中`);
          }
        }

        // 檢查產品是否已存在（根據產品代號）
        let existingProductId = null;
        if (item.code && item.code.trim() !== '') {
          const productQuery = query(
            collection(db, 'products'),
            where('code', '==', item.code)
          );
          const productSnapshot = await getDocs(productQuery);
          if (!productSnapshot.empty) {
            existingProductId = productSnapshot.docs[0].id;
          }
        }

        // 準備產品數據
        const productData = {
          name: item.name,
          seriesId: seriesId,
          fragranceId: fragranceId,
          nicotineMg: item.nicotineMg || 0,
          specificMaterialIds: item.specificMaterialIds || [],
          status: item.status || '啟用'
        };

        // 如果有產品代號，加入產品代號（如果沒有，後端會自動生成）
        if (item.code && item.code.trim() !== '') {
          (productData as any).code = item.code;
        }

        if (existingProductId && options?.updateMode) {
          // 更新現有產品
          await updateProduct({
            productId: existingProductId,
            ...productData
          });
        } else if (!existingProductId) {
          // 創建新產品（如果沒有產品代號，後端會自動生成）
          await createProduct(productData);
        } else {
          // 產品已存在但沒有啟用更新模式
          console.warn(`產品代號 "${item.code}" 已存在，跳過創建`);
        }

        results.success++;
        current++;
        if (onProgress) {
          onProgress(current, total);
        }
      } catch (error) {
        console.error('匯入產品失敗:', error);
        const errorMessage = error instanceof Error ? error.message : '未知錯誤';
        results.failed++;
        results.failedItems.push({
          item: item,
          error: errorMessage,
          row: current + 1
        });
        
        // 如果啟用了更新模式，繼續處理其他項目
        if (!options?.updateMode) {
          throw new Error(`匯入產品 "${item.name}" 失敗: ${errorMessage}`);
        }
        
        current++;
        if (onProgress) {
          onProgress(current, total);
        }
      }
    }
    
    // 如果有失敗項目，拋出包含詳細信息的錯誤
    if (results.failed > 0) {
      const errorMessage = `匯入完成，成功 ${results.success} 筆，失敗 ${results.failed} 筆`;
      const error = new Error(errorMessage);
      (error as any).results = results;
      throw error;
    }
    
    loadData();
  };

    const handleExport = async () => {
    return products.map(product => ({
      name: product.name,
      code: product.code,
      seriesName: product.seriesName,
      fragranceCode: product.fragranceCode,
      nicotineMg: product.nicotineMg,
      status: product.status || '啟用'
    }));
  };

  // 權限保護：如果沒有查看權限，顯示無權限頁面
  if (!canViewProducts && !isAdmin()) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="max-w-2xl mx-auto">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            您沒有權限查看產品管理頁面。請聯繫系統管理員獲取相關權限。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            產品管理
          </h1>
          <p className="text-gray-600 mt-2">管理產品資訊與系列配置</p>
        </div>
      </div>

      {/* 手機版功能按鈕區域 */}
      <div className="lg:hidden mb-6">
        {selectedProducts.size > 0 && (
          <div className="mb-3 space-y-2">
            <Button 
              variant="outline" 
              onClick={handleFragranceCalculator}
              className="w-full border-purple-200 text-purple-600 hover:bg-purple-100 hover:border-purple-300 hover:shadow-sm transition-all duration-200"
            >
              <FlaskConical className="mr-2 h-4 w-4" />
              香精試算 ({selectedProducts.size} 個產品)
            </Button>
            {canManageProducts && (
              <Button 
                variant="destructive" 
                onClick={() => setIsBatchDeleteOpen(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <Package className="mr-2 h-4 w-4" />
                批次刪除 ({selectedProducts.size} 個產品)
              </Button>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {canManageProducts && (
            <Button 
              variant="outline" 
              onClick={handleSeriesManagement}
              className="border-purple-200 text-purple-600 hover:bg-purple-100 hover:border-purple-300 hover:shadow-sm transition-all duration-200"
            >
              <Library className="mr-2 h-4 w-4" />
              系列管理
            </Button>
          )}
          {canManageProducts && (
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard/products/fragrance-history')}
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-300 hover:shadow-sm transition-all duration-200"
            >
              <Calendar className="mr-2 h-4 w-4" />
              香精歷程
            </Button>
          )}
          {canManageProducts && (
            <Button variant="outline" onClick={() => setIsImportExportOpen(true)} className="w-full">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              匯入/匯出
            </Button>
          )}
          {canManageProducts && (
            <Button 
              onClick={handleAdd}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              新增產品
            </Button>
          )}
        </div>
      </div>

      {/* 桌面版功能按鈕區域 */}
      <div className="hidden lg:block mb-6">
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {selectedProducts.size > 0 && (
            <Button 
              variant="outline" 
              onClick={handleFragranceCalculator}
              className="border-purple-200 text-purple-600 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all duration-200"
            >
              <FlaskConical className="mr-2 h-4 w-4" />
              香精試算 ({selectedProducts.size})
            </Button>
          )}
          {selectedProducts.size > 0 && canManageProducts && (
            <Button 
              variant="destructive" 
              onClick={() => setIsBatchDeleteOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Package className="mr-2 h-4 w-4" />
              批次刪除 ({selectedProducts.size})
            </Button>
          )}
          {canManageProducts && (
            <Button 
              variant="outline" 
              onClick={handleSeriesManagement}
              className="border-purple-200 text-purple-600 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all duration-200"
            >
              <Library className="mr-2 h-4 w-4" />
              系列管理
            </Button>
          )}
          {canManageProducts && (
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard/products/fragrance-history')}
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-200"
            >
              <Calendar className="mr-2 h-4 w-4" />
              香精更換歷程
            </Button>
          )}
          {canManageProducts && (
            <Button variant="outline" onClick={() => setIsImportExportOpen(true)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              匯入/匯出
            </Button>
          )}
          {canManageProducts && (
            <Button 
              onClick={handleAdd}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              新增產品
            </Button>
          )}
        </div>
      </div>

      {/* 搜尋框 */}
      <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-gray-50 to-purple-50">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-purple-600" />
            <Input
              placeholder="搜尋產品名稱、代號、系列或香精..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-purple-200 focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* 篩選標籤 */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {/* 產品系列標籤 */}
          {Array.from(new Set(products.map(p => p.seriesName))).map(series => (
            <Badge
              key={series}
              variant={selectedSeries.has(series || '') ? "default" : "secondary"}
              className={`cursor-pointer transition-colors ${
                selectedSeries.has(series || '') 
                  ? "bg-purple-600 hover:bg-purple-700 text-white" 
                  : "bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300"
              }`}
              onClick={() => {
                setSelectedSeries(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(series || '')) {
                    newSet.delete(series || '');
                  } else {
                    newSet.add(series || '');
                  }
                  return newSet;
                });
              }}
            >
              {series}
            </Badge>
          ))}
        </div>
      </div>

      {/* 手機版表格容器 */}
      <div className="lg:hidden">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-600" />
                <h2 className="text-base font-semibold text-gray-800">產品清單</h2>
              </div>
              <div className="text-xs text-gray-600">
                共 {filteredProducts.length} 個
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-purple-200 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-purple-600 rounded-full animate-spin"></div>
                  </div>
                  <span className="mt-3 text-sm text-gray-600 font-medium">載入中...</span>
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className="p-4 hover:bg-purple-100/60 transition-all duration-200 border border-transparent hover:border-purple-200 hover:shadow-sm rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div 
                          className="flex items-center gap-3 cursor-pointer flex-1"
                          onClick={() => handleViewDetail(product)}
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Package className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{product.name}</div>
                            <div className="text-xs text-green-600 font-medium">{product.code}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetail(product)}>
                                <Eye className="mr-2 h-4 w-4" />
                                查看詳細
                              </DropdownMenuItem>
                              {canManageProducts && (
                                <DropdownMenuItem onClick={() => handleEdit(product)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  編輯產品
                                </DropdownMenuItem>
                              )}
                              {canManageProducts && <DropdownMenuSeparator />}
                              {canManageProducts && (
                                <DropdownMenuItem onClick={() => handleDelete(product)} className="text-red-600">
                                  <Package className="h-4 w-4 mr-2" />
                                  刪除產品
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      <div 
                        className="grid grid-cols-1 gap-3 text-sm cursor-pointer"
                        onClick={() => handleViewDetail(product)}
                      >
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-gray-500">系列</span>
                          </div>
                          <span className="text-sm text-gray-700">{product.seriesName}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-gray-500">使用香精</span>
                          </div>
                          <div>
                            <span className="text-sm text-green-600">{product.fragranceCode || '未指定'}</span>
                            <div className="text-xs text-gray-500">{product.fragranceName}</div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-gray-500">丁鹽濃度</span>
                          </div>
                          <span className="text-sm text-gray-700">{product.nicotineMg || 0} MG</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">狀態</span>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            product.status === '備用' ? 'bg-yellow-100 text-yellow-800' :
                            product.status === '棄用' ? 'bg-pink-100 text-pink-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {product.status || '啟用'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-medium text-foreground mb-1">沒有產品資料</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center">開始建立第一個產品來管理產品資訊</p>
                  <Button 
                    onClick={handleAdd}
                    variant="outline"
                    size="sm"
                    className="border-purple-200 text-purple-600 hover:bg-purple-50"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    新增產品
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
        <div className="px-6 py-4 bg-gradient-to-r from-background to-purple-50 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-foreground">產品清單</h2>
            </div>
            <div className="text-sm text-muted-foreground">
              共 {filteredProducts.length} 個產品
            </div>
          </div>
        </div>
        
        <div className="table-responsive">
          <Table className="table-enhanced">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] text-center">
                  <div className="flex items-center gap-2" title="全選所有產品">
                    <Checkbox
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-xs text-muted-foreground">全選</span>
                  </div>
                </TableHead>
                <TableHead className="text-left">產品資訊</TableHead>
                <TableHead className="text-left">系列</TableHead>
                <TableHead className="text-left">使用香精</TableHead>
                <TableHead className="text-left">丁鹽濃度</TableHead>
                <TableHead className="text-left">狀態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-purple-200 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-purple-600 rounded-full animate-spin"></div>
                      </div>
                      <span className="mt-4 text-muted-foreground font-medium">載入產品資料中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <TableRow 
                    key={product.id} 
                    className="hover:bg-purple-200/70 hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={() => handleViewDetail(product)}
                  >
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <Package className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{product.name}</div>
                          <div className="text-xs text-green-600 font-medium">{product.code}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground">{product.seriesName}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="text-sm font-medium text-green-600">{product.fragranceCode || '未指定'}</span>
                        <div className="text-xs text-gray-500">{product.fragranceName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground">{product.nicotineMg || 0} MG</span>
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        product.status === '備用' ? 'bg-yellow-100 text-yellow-800' :
                        product.status === '棄用' ? 'bg-pink-100 text-pink-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {product.status || '啟用'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                          >
                            <span className="sr-only">開啟選單</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewDetail(product)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看詳細
                          </DropdownMenuItem>
                          {canManageProducts && (
                            <DropdownMenuItem onClick={() => handleEdit(product)}>
                              <Edit className="h-4 w-4 mr-2" />
                              編輯產品
                            </DropdownMenuItem>
                          )}
                          {canManageProducts && <DropdownMenuSeparator />}
                          {canManageProducts && (
                            <DropdownMenuItem 
                              onClick={() => handleDelete(product)}
                              className="text-red-600 focus:text-red-600"
                            >
                              刪除產品
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-2">沒有產品資料</h3>
                      <p className="text-muted-foreground mb-4">開始建立第一個產品來管理產品資訊</p>
                      {canManageProducts && (
                        <Button 
                          onClick={handleAdd}
                          variant="outline"
                          className="border-purple-200 text-purple-600 hover:bg-purple-50"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          新增產品
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
        </div>
      </div>
      </div>

      <ProductDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onProductUpdate={loadData}
        productData={selectedProduct}
      />

      {selectedProduct && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmDelete}
          title={`確認刪除產品`}
          description={`您確定要永久刪除產品「${selectedProduct.name}」嗎？此操作無法復原。`}
        />
      )}

      <ConfirmDialog
        isOpen={isBatchDeleteOpen}
        onOpenChange={setIsBatchDeleteOpen}
        onConfirm={handleBatchDelete}
        title={`確認批次刪除`}
        description={`您確定要永久刪除選中的 ${selectedProducts.size} 個產品嗎？此操作無法復原。`}
      />

      <FragranceChangeDialog
        isOpen={isFragranceDialogOpen}
        onOpenChange={setIsFragranceDialogOpen}
        onUpdate={loadData}
        productData={selectedProduct}
        currentFragranceName={selectedProduct?.fragranceName || ''}
      />



      <ImportExportDialog
        isOpen={isImportExportOpen}
        onOpenChange={setIsImportExportOpen}
        onImport={handleImport}
        onExport={handleExport}
        title="產品資料"
        description="匯入或匯出產品資料，支援 Excel 和 CSV 格式"
        sampleData={[
          {
            name: "示例產品",
            code: "",
            seriesName: "示例系列",
            fragranceCode: "FRAG001",
            nicotineMg: 3,
            status: "啟用"
          }
        ]}
                fields={[
          { key: "name", label: "產品名稱", required: true, type: "string" },
          { key: "code", label: "產品代號", required: false, type: "string" },
          { key: "seriesName", label: "系列名稱", required: true, type: "string" },
          { key: "fragranceCode", label: "香精編號", required: true, type: "string" },
          { key: "nicotineMg", label: "尼古丁濃度", required: false, type: "number" },
          { key: "status", label: "狀態", required: false, type: "string" }
        ]}
      />

      <FragranceCalculatorDialog
        isOpen={isFragranceCalculatorOpen}
        onOpenChange={setIsFragranceCalculatorOpen}
        selectedProductIds={selectedProducts}
        products={filteredProducts}
        onProductSelectionChange={handleSelectProduct}
      />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
