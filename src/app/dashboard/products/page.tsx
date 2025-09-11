'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, DocumentReference, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { useDataSearch, createProductSearchConfig } from '@/hooks/useDataSearch';

import { MoreHorizontal, Droplets, FileSpreadsheet, Eye, Edit, Package, Factory, Calendar, Plus, Tag, Library, Search, Shield, FlaskConical, Star, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/usePermission';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import { ProductDialog, ProductData } from './ProductDialog'; 
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FragranceChangeDialog } from './FragranceChangeDialog';
import { DetailViewDialog } from '@/components/DetailViewDialog';
import { ImportExportDialog } from '@/components/ImportExportDialog';
import { FragranceCalculatorDialog } from './FragranceCalculatorDialog';
import { StandardDataListPage, StandardColumn, StandardAction, QuickFilter, StandardStats } from '@/components/StandardDataListPage';

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
  const [isFragranceCalculatorOpen, setIsFragranceCalculatorOpen] = useState(false);

  // 使用統一的搜尋過濾 Hook
  const {
    searchTerm,
    setSearchTerm,
    activeFilters,
    setFilter,
    clearFilter,
    filteredData: filteredProducts,
    totalCount,
    filteredCount
  } = useDataSearch(products, createProductSearchConfig<ProductWithDetails>());

  // 便利方法：獲取當前過濾器值
  const selectedSeries = (activeFilters.seriesName as Set<string>) || new Set<string>();
  const selectedStatus = (activeFilters.status as Set<string>) || new Set<string>();

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
    } catch (error) {
      console.error("讀取產品資料失敗:", error);
      toast.error("讀取產品資料失敗。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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

  // 配置欄位
  const columns: StandardColumn<ProductWithDetails>[] = [
    {
      key: 'name',
      title: '產品資訊',
      sortable: true,
      searchable: true,
      priority: 5,
      render: (value, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{record.name}</div>
            <div className="text-xs text-green-600 font-medium">{record.code}</div>
          </div>
        </div>
      ),
      mobileRender: (value, record) => (
        <div>
          <div className="font-medium text-gray-900">{record.name}</div>
          <div className="text-xs text-green-600 font-medium">{record.code}</div>
        </div>
      )
    },
    {
      key: 'seriesName',
      title: '系列',
      sortable: true,
      searchable: true,
      priority: 4,
      render: (value) => (
        <span className="text-sm font-medium text-foreground">{value}</span>
      )
    },
    {
      key: 'fragranceCode',
      title: '使用香精',
      searchable: true,
      priority: 4,
      render: (value, record) => (
        <div>
          <span className="text-sm font-medium text-green-600">{value || '未指定'}</span>
          <div className="text-xs text-gray-500">{record.fragranceName}</div>
        </div>
      ),
      mobileRender: (value, record) => (
        <div>
          <span className="text-sm text-green-600">{value || '未指定'}</span>
          <div className="text-xs text-gray-500">{record.fragranceName}</div>
        </div>
      )
    },
    {
      key: 'nicotineMg',
      title: '丁鹽濃度',
      sortable: true,
      priority: 3,
      render: (value) => (
        <span className="text-sm font-medium text-foreground">{value || 0} MG</span>
      )
    },
    {
      key: 'status',
      title: '狀態',
      filterable: true,
      priority: 2,
      render: (value) => (
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          value === '備用' ? 'bg-yellow-100 text-yellow-800' :
          value === '棄用' ? 'bg-pink-100 text-pink-800' :
          'bg-green-100 text-green-800'
        }`}>
          {value || '啟用'}
        </div>
      )
    }
  ];

  // 配置操作
  const actions: StandardAction<ProductWithDetails>[] = [
    {
      key: 'view',
      title: '查看詳細',
      icon: <Eye className="h-4 w-4" />,
      onClick: (record) => router.push(`/dashboard/products/${record.id}`)
    },
    ...(canManageProducts ? [
      {
        key: 'edit',
        title: '編輯產品',
        icon: <Edit className="h-4 w-4" />,
        onClick: (record: ProductWithDetails) => {
          setSelectedProduct(record);
          setIsDialogOpen(true);
        }
      },
      {
        key: 'delete',
        title: '刪除產品',
        icon: <Package className="h-4 w-4" />,
        variant: 'destructive' as const,
        confirmMessage: '確定要刪除此產品嗎？此操作無法復原。',
        onClick: (record: ProductWithDetails) => {
          setSelectedProduct(record);
          setIsConfirmOpen(true);
        }
      }
    ] : [])
  ];

  // 配置批量操作
  const bulkActions: StandardAction<ProductWithDetails[]>[] = canManageProducts ? [
    {
      key: 'batchDelete',
      title: '批次刪除',
      icon: <Package className="h-4 w-4" />,
      variant: 'destructive' as const,
      confirmMessage: '確定要刪除選中的產品嗎？此操作無法復原。',
      onClick: (records) => {
        setIsBatchDeleteOpen(true);
      }
    },
    {
      key: 'fragranceCalculator',
      title: '香精試算',
      icon: <FlaskConical className="h-4 w-4" />,
      onClick: (records) => {
        if (records.length === 0) {
          toast.error('請先選擇要試算的產品');
          return;
        }
        
        if (records.length > 10) {
          toast.error('最多只能選擇 10 個產品進行香精試算');
          return;
        }
        
        setIsFragranceCalculatorOpen(true);
      }
    }
  ] : [];

  // 配置快速篩選
  const quickFilters: QuickFilter[] = [
    {
      key: 'status',
      label: '啟用',
      value: '啟用',
      color: 'green',
      count: products.filter(p => (p.status || '啟用') === '啟用').length
    },
    {
      key: 'status',
      label: '備用',
      value: '備用',
      color: 'yellow',
      count: products.filter(p => p.status === '備用').length
    },
    {
      key: 'status',
      label: '棄用',
      value: '棄用',
      color: 'red',
      count: products.filter(p => p.status === '棄用').length
    }
  ];

  // 配置統計資料
  const stats: StandardStats[] = [
    {
      title: '總產品數',
      value: products.length,
      subtitle: '所有產品',
      icon: <Package className="h-4 w-4" />,
      color: 'blue'
    },
    {
      title: '啟用產品',
      value: products.filter(p => (p.status || '啟用') === '啟用').length,
      subtitle: '可正常生產',
      icon: <Star className="h-4 w-4" />,
      color: 'green'
    },
    {
      title: '產品系列',
      value: new Set(products.map(p => p.seriesName)).size,
      subtitle: '系列總數',
      icon: <Library className="h-4 w-4" />,
      color: 'purple'
    },
    {
      title: '使用香精',
      value: new Set(products.filter(p => p.fragranceCode).map(p => p.fragranceCode)).size,
      subtitle: '香精種類',
      icon: <Droplets className="h-4 w-4" />,
      color: 'orange'
    }
  ];

  // 操作處理函式
  const handleAdd = () => { 
    setSelectedProduct(null); 
    setIsDialogOpen(true); 
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

  // 工具列額外動作
  const toolbarActions = (
    <>
      {canManageProducts && (
        <Button 
          variant="outline" 
          onClick={() => router.push('/dashboard/product-series')}
          className="border-purple-200 text-purple-600 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all duration-200"
        >
          <Library className="h-4 w-4 mr-2" />
          系列管理
        </Button>
      )}
      {canManageProducts && (
        <Button 
          variant="outline" 
          onClick={() => router.push('/dashboard/products/fragrance-history')}
          className="border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-200"
        >
          <Calendar className="h-4 w-4 mr-2" />
          香精歷程
        </Button>
      )}
    </>
  );

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

      <StandardDataListPage
        data={filteredProducts}
        loading={isLoading}
        columns={columns}
        actions={actions}
        bulkActions={bulkActions}
        onRowClick={(record) => router.push(`/dashboard/products/${record.id}`)}
        
        // 搜尋與過濾
        searchable={true}
        searchPlaceholder="搜尋產品名稱、代號、系列或香精..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        quickFilters={quickFilters}
        activeFilters={activeFilters}
        onFilterChange={(key, value) => {
          if (value === null) {
            clearFilter(key);
          } else {
            setFilter(key, value);
          }
        }}
        onClearFilters={() => {
          Object.keys(activeFilters).forEach(key => clearFilter(key));
        }}
        
        // 選擇功能
        selectable={true}
        selectedRows={Array.from(selectedProducts)}
        onSelectionChange={(selected) => setSelectedProducts(new Set(selected as string[]))}
        rowKey="id"
        
        // 統計資訊
        stats={stats}
        showStats={true}
        
        // 工具列功能
        showToolbar={true}
        toolbarActions={toolbarActions}
        showImportExport={canManageProducts}
        onImport={() => setIsImportExportOpen(true)}
        onExport={() => setIsImportExportOpen(true)}
        
        // 新增功能
        showAddButton={canManageProducts}
        addButtonText="新增產品"
        onAdd={handleAdd}
        
        // 權限控制
        permissions={{
          view: canViewProducts,
          create: canManageProducts,
          edit: canManageProducts,
          delete: canManageProducts,
          export: canManageProducts,
          import: canManageProducts
        }}
        
        className="space-y-6"
      />

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
        products={products}
        onProductSelectionChange={(productId, checked) => {
          const newSelected = new Set(selectedProducts);
          if (checked) {
            newSelected.add(productId);
          } else {
            newSelected.delete(productId);
          }
          setSelectedProducts(newSelected);
        }}
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