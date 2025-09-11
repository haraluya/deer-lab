'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { MaterialData } from '@/types/entities';
import { usePermission } from '@/hooks/usePermission';
import { useCartOperations } from '@/hooks/useCartOperations';
import { useDataSearch } from '@/hooks/useDataSearch';
import { StandardDataListPage, StandardColumn, StandardAction, StandardStats, QuickFilter } from '@/components/StandardDataListPage';
import { Package, DollarSign, AlertTriangle, Building, Eye, Edit, Trash2, ShoppingCart, Plus, Warehouse, MoreHorizontal, Tag, Layers, FolderOpen, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MaterialDialog } from './MaterialDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ImportExportDialog } from '@/components/ImportExportDialog';

// 擴展 MaterialData 以包含供應商資訊
interface MaterialWithSupplier extends MaterialData {
  supplierName: string;
  categoryName: string;
  subCategoryName: string;
  type: 'material';
  isLowStock: boolean;
}

export default function MaterialsPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<MaterialWithSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [stocktakeMode, setStocktakeMode] = useState(false);
  const [stocktakeUpdates, setStocktakeUpdates] = useState<Record<string, number>>({});
  
  // 對話框狀態
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialData | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // 權限檢查
  const { hasPermission } = usePermission();
  const canViewMaterials = hasPermission('materials.view') || hasPermission('materials.manage');
  const canManageMaterials = hasPermission('materials.manage');

  // 購物車操作
  const { addSingleItem: addToPurchaseCart } = useCartOperations(materials, { itemType: 'material' });

  // 搜尋配置
  const searchConfig = {
    searchFields: [
      { key: 'name' as keyof MaterialWithSupplier },
      { key: 'code' as keyof MaterialWithSupplier },
      { key: 'supplierName' as keyof MaterialWithSupplier },
      { key: 'categoryName' as keyof MaterialWithSupplier },
      { key: 'subCategoryName' as keyof MaterialWithSupplier }
    ],
    filterConfigs: [
      {
        key: 'categoryName' as keyof MaterialWithSupplier,
        type: 'set' as const
      },
      {
        key: 'subCategoryName' as keyof MaterialWithSupplier,
        type: 'set' as const
      },
      {
        key: 'supplierName' as keyof MaterialWithSupplier,
        type: 'set' as const
      },
      {
        key: 'isLowStock' as keyof MaterialWithSupplier,
        type: 'boolean' as const
      }
    ]
  };

  const {
    searchTerm,
    setSearchTerm,
    activeFilters,
    setFilter,
    clearFilter,
    filteredData: filteredMaterials,
    totalCount,
    filteredCount
  } = useDataSearch(materials, searchConfig);

  // 獲取供應商和分類資料
  const fetchRelatedData = useCallback(async () => {
    const suppliersMap = new Map<string, string>();
    const categoriesMap = new Map<string, string>();
    const subCategoriesMap = new Map<string, string>();
    
    try {
      if (!db) {
        console.error("Firebase db 未初始化");
        return { suppliersMap, categoriesMap, subCategoriesMap };
      }
      
      // 獲取供應商
      try {
        const suppliersSnapshot = await getDocs(collection(db, "suppliers"));
        console.log(`載入供應商資料：${suppliersSnapshot.size} 筆`);
        suppliersSnapshot.forEach((doc) => {
          const supplierData = doc.data();
          if (supplierData.name) {
            suppliersMap.set(doc.id, supplierData.name);
          }
        });
        console.log("供應商對照表:", Array.from(suppliersMap.entries()));
      } catch (error) {
        console.log("供應商集合不存在或載入失敗:", error);
      }
      
      // 獲取主分類
      try {
        const categoriesSnapshot = await getDocs(collection(db, "materialCategories"));
        console.log(`載入主分類資料：${categoriesSnapshot.size} 筆`);
        categoriesSnapshot.forEach((doc) => {
          const categoryData = doc.data();
          if (categoryData.name) {
            categoriesMap.set(doc.id, categoryData.name);
          }
        });
      } catch (error) {
        console.log("主分類集合不存在，跳過");
      }
      
      // 獲取細分類
      try {
        const subCategoriesSnapshot = await getDocs(collection(db, "materialSubCategories"));
        console.log(`載入細分類資料：${subCategoriesSnapshot.size} 筆`);
        subCategoriesSnapshot.forEach((doc) => {
          const subCategoryData = doc.data();
          if (subCategoryData.name) {
            subCategoriesMap.set(doc.id, subCategoryData.name);
          }
        });
      } catch (error) {
        console.log("細分類集合不存在，跳過");
      }
      
    } catch (error) {
      console.error("獲取關聯資料失敗:", error);
    }
    
    return { suppliersMap, categoriesMap, subCategoriesMap };
  }, []);

  // 獲取原料資料
  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!db) {
        console.error("Firebase db 未初始化");
        setIsLoading(false);
        return;
      }
      
      const { suppliersMap, categoriesMap, subCategoriesMap } = await fetchRelatedData();
      const querySnapshot = await getDocs(collection(db, "materials"));
      
      const materialsData: MaterialWithSupplier[] = querySnapshot.docs.map((doc) => {
        const data = { id: doc.id, ...doc.data() } as MaterialData;
        
        // 獲取供應商名稱 - 處理 supplierRef（Firebase 引用）
        let supplierName = '未指定';
        
        // 優先順序：直接欄位 > ID 查找 > Firebase 引用 > 其他格式
        if (data.supplierName && data.supplierName.trim() !== '') {
          supplierName = data.supplierName.trim();
        } else if (data.supplierId && suppliersMap.has(data.supplierId)) {
          supplierName = suppliersMap.get(data.supplierId)!;
        } else if (data.supplierRef && data.supplierRef.id) {
          // 處理 Firebase DocumentReference
          const refId = data.supplierRef.id;
          supplierName = suppliersMap.get(refId) || '未知供應商';
        } else if (data.supplier && typeof data.supplier === 'string') {
          supplierName = data.supplier;
        } else if (data.supplier && data.supplier.name) {
          supplierName = data.supplier.name;
        }
        
        console.log(`[供應商除錯] 原料: ${data.name}`);
        console.log(`  - supplierName: "${data.supplierName}"`);
        console.log(`  - supplierId: "${data.supplierId}"`);
        console.log(`  - supplierRef: `, data.supplierRef);
        console.log(`  - supplierRef.id: `, data.supplierRef?.id);
        console.log(`  - supplier: `, data.supplier);
        console.log(`  - 最終供應商: "${supplierName}"`);
        
        // 獲取分類名稱 - 統一處理各種可能的分類格式
        let categoryName = '';
        let subCategoryName = '';
        
        // 1. 優先使用 mainCategoryId 和 subCategoryId
        if (data.mainCategoryId) {
          categoryName = categoriesMap.get(data.mainCategoryId) || '';
        }
        if (data.subCategoryId) {
          subCategoryName = subCategoriesMap.get(data.subCategoryId) || '';
        }
        
        // 2. 如果沒有 ID，檢查 category 字段
        if (!categoryName && data.category) {
          if (typeof data.category === 'string') {
            if (data.category.includes('/')) {
              // 分類格式: "主分類/細分類"
              const categoryParts = data.category.split('/');
              categoryName = categoryParts[0]?.trim() || '';
              subCategoryName = categoryParts[1]?.trim() || '';
            } else {
              // 單一分類
              categoryName = data.category.trim();
            }
          }
        }
        
        // 3. 如果還是沒有，檢查是否有獨立的 subCategory 字段
        if (!subCategoryName && data.subCategory) {
          subCategoryName = data.subCategory;
        }
        
        console.log(`[分類除錯] 原料: ${data.name}, 主分類: ${categoryName}, 細分類: ${subCategoryName}`);
        
        return {
          ...data,
          supplierName: supplierName,
          categoryName: categoryName || '未分類',
          subCategoryName: subCategoryName || '',
          type: 'material' as const,
          isLowStock: data.currentStock < data.minStock
        };
      });
      
      // 按分類和名稱排序
      const sortedMaterials = materialsData.sort((a, b) => {
        const categoryComparison = a.categoryName.localeCompare(b.categoryName);
        if (categoryComparison !== 0) return categoryComparison;
        return a.name.localeCompare(b.name);
      });
      
      setMaterials(sortedMaterials);
    } catch (error) {
      console.error("獲取原料資料失敗:", error);
      toast.error("載入原料資料失敗");
    } finally {
      setIsLoading(false);
    }
  }, [fetchRelatedData]);

  // 初始載入
  useEffect(() => {
    if (canViewMaterials) {
      fetchMaterials();
    }
  }, [canViewMaterials, fetchMaterials]);

  // 定義欄位
  const columns: StandardColumn<MaterialWithSupplier>[] = [
    {
      key: 'name',
      title: '物料資訊',
      sortable: true,
      searchable: true,
      priority: 5,
      render: (value, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{record.name}</div>
            <div className="text-xs text-blue-600 font-medium">{record.code}</div>
          </div>
        </div>
      ),
      mobileRender: (value, record) => (
        <div>
          <div className="font-medium text-gray-900">{record.name}</div>
          <div className="text-xs text-blue-600 font-medium">{record.code}</div>
        </div>
      )
    },
    {
      key: 'categoryName',
      title: '分類',
      sortable: true,
      filterable: true,
      priority: 4,
      render: (value, record) => (
        <div className="space-y-1">
          {record.categoryName && record.categoryName !== '未分類' ? (
            <div className="space-y-1">
              {/* 主分類標籤 */}
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs font-medium">
                {record.categoryName}
              </Badge>
              {/* 細分分類標籤 */}
              {record.subCategoryName && record.subCategoryName !== '' && (
                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs font-medium ml-1">
                  {record.subCategoryName}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">未分類</span>
          )}
        </div>
      ),
      mobileRender: (value, record) => (
        <div className="space-y-1">
          {record.categoryName && record.categoryName !== '未分類' ? (
            <div className="space-y-1">
              {/* 主分類標籤 */}
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                {record.categoryName}
              </Badge>
              {/* 細分分類標籤 */}
              {record.subCategoryName && record.subCategoryName !== '' && (
                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                  {record.subCategoryName}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-xs">未分類</span>
          )}
        </div>
      )
    },
    {
      key: 'supplierName',
      title: '供應商',
      sortable: true,
      filterable: true,
      priority: 3,
      render: (value, record) => (
        <span className="text-sm font-medium text-foreground">
          {record.supplierName}
        </span>
      )
    },
    {
      key: 'currentStock',
      title: '庫存狀態',
      sortable: true,
      align: 'center',
      priority: 4,
      render: (value, record) => (
        <div className="text-center space-y-1">
          <div className={`font-semibold ${
            record.isLowStock ? 'text-red-600' : 'text-green-600'
          }`}>
            {record.currentStock} {record.unit}
          </div>
          <div className="text-xs text-gray-500">
            安全庫存: {record.minStock}
          </div>
          {record.isLowStock && (
            <Badge variant="destructive" className="text-xs">
              低庫存
            </Badge>
          )}
        </div>
      ),
      mobileRender: (value, record) => (
        <div className="text-right">
          <div className={`font-semibold ${
            record.isLowStock ? 'text-red-600' : 'text-green-600'
          }`}>
            {record.currentStock} {record.unit}
          </div>
          <div className="text-xs text-gray-500">
            最低: {record.minStock}
          </div>
        </div>
      )
    },
    {
      key: 'costPerUnit',
      title: '單位成本',
      sortable: true,
      align: 'right',
      priority: 2,
      hideOnMobile: true,
      render: (value) => (
        <span className="font-semibold text-foreground">
          ${value.toFixed(2)}
        </span>
      )
    }
  ];

  // 定義操作
  const actions: StandardAction<MaterialWithSupplier>[] = [
    {
      key: 'view',
      title: '查看詳細',
      icon: <Eye className="h-4 w-4" />,
      onClick: (material) => router.push(`/dashboard/materials/${material.id}`)
    },
    {
      key: 'addToCart',
      title: '加入購物車',
      icon: <ShoppingCart className="h-4 w-4" />,
      onClick: async (material) => {
        try {
          await addToPurchaseCart(material);
          toast.success("已加入採購車");
        } catch (error) {
          console.error("加入購物車失敗:", error);
          toast.error("加入購物車失敗");
        }
      }
    },
    ...(canManageMaterials ? [
      {
        key: 'edit',
        title: '編輯物料',
        icon: <Edit className="h-4 w-4" />,
        onClick: (material: MaterialWithSupplier) => {
          setSelectedMaterial(material);
          setIsDialogOpen(true);
        }
      },
      {
        key: 'delete',
        title: '刪除物料',
        icon: <Trash2 className="h-4 w-4" />,
        variant: 'destructive' as const,
        confirmMessage: '確定要刪除此物料嗎？此操作無法復原。',
        onClick: (material: MaterialWithSupplier) => {
          setSelectedMaterial(material);
          setIsConfirmOpen(true);
        }
      }
    ] : [])
  ];

  // 批量操作
  const bulkActions: StandardAction<MaterialWithSupplier[]>[] = canManageMaterials ? [
    {
      key: 'batchAddToCart',
      title: '批量加入購物車',
      icon: <ShoppingCart className="h-4 w-4" />,
      onClick: async (materials) => {
        try {
          for (const material of materials) {
            await addToPurchaseCart(material);
          }
          toast.success(`已將 ${materials.length} 項物料加入購物車`);
        } catch (error) {
          toast.error("批量加入購物車失敗");
        }
      }
    },
    {
      key: 'batchDelete',
      title: '批量刪除',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      confirmMessage: '確定要刪除選中的物料嗎？此操作不可復原。',
      onClick: async (materials) => {
        const toastId = toast.loading("正在刪除物料...");
        try {
          const functions = getFunctions();
          const deleteMaterial = httpsCallable(functions, 'deleteMaterial');
          
          for (const material of materials) {
            await deleteMaterial({ materialId: material.id });
          }
          
          toast.success(`已成功刪除 ${materials.length} 項物料`, { id: toastId });
          fetchMaterials();
          setSelectedRows([]); // 清除選中狀態
        } catch (error) {
          console.error("批量刪除物料失敗", error);
          toast.error("批量刪除物料失敗", { id: toastId });
        }
      }
    }
  ] : [];

  // 統計資訊
  const stats: StandardStats[] = useMemo(() => {
    const lowStockCount = materials.filter(m => m.isLowStock).length;
    const totalValue = materials.reduce((sum, m) => sum + (m.currentStock * m.costPerUnit), 0);
    const activeCount = materials.filter(m => m.isActive !== false).length;
    const categoryCount = new Set(materials.map(m => m.categoryName).filter(c => c && c !== '未分類')).size;

    return [
      {
        title: '總物料數',
        value: materials.length,
        subtitle: '所有物料',
        icon: <Package className="h-4 w-4" />,
        color: 'blue'
      },
      {
        title: '庫存總值',
        value: `$${totalValue.toFixed(0)}`,
        subtitle: '當前庫存價值',
        icon: <DollarSign className="h-4 w-4" />,
        color: 'green'
      },
      {
        title: '低庫存',
        value: lowStockCount,
        subtitle: '需要補貨',
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'red'
      },
      {
        title: '物料分類',
        value: categoryCount,
        subtitle: '分類總數',
        icon: <Tag className="h-4 w-4" />,
        color: 'purple'
      }
    ];
  }, [materials]);

  // 快速篩選標籤
  const quickFilters: QuickFilter[] = useMemo(() => {
    console.log('🔧 [快選標籤除錯] 開始產生快選標籤，原料總數:', materials.length);
    
    // 收集所有主分類和細分類
    const mainCategories = new Map<string, number>();
    const subCategories = new Map<string, number>();
    
    materials.forEach(material => {
      const mainCat = material.categoryName || '未分類';
      const subCat = material.subCategoryName || '';
      
      // 統計主分類
      if (mainCat && mainCat !== '未分類') {
        mainCategories.set(mainCat, (mainCategories.get(mainCat) || 0) + 1);
      }
      
      // 統計細分類
      if (subCat) {
        subCategories.set(subCat, (subCategories.get(subCat) || 0) + 1);
      }
    });
    
    console.log('🔧 [快選標籤除錯] 主分類:', Array.from(mainCategories.entries()));
    console.log('🔧 [快選標籤除錯] 細分類:', Array.from(subCategories.entries()));
    
    // 定義顏色
    const colors: Array<'blue' | 'green' | 'purple' | 'orange' | 'yellow' | 'red'> = ['blue', 'green', 'purple', 'orange', 'yellow', 'red'];
    let colorIndex = 0;
    
    // 產生主分類標籤 - 統一使用藍色
    const mainCategoryTags = Array.from(mainCategories.entries()).map(([categoryName, count]) => ({
      key: 'categoryName',
      label: categoryName,
      value: categoryName,
      count: count,
      color: 'blue' as const
    }));
    
    // 產生細分類標籤 - 統一使用綠色
    const subCategoryTags = Array.from(subCategories.entries()).map(([subCategoryName, count]) => ({
      key: 'subCategoryName',
      label: subCategoryName,
      value: subCategoryName,
      count: count,
      color: 'green' as const
    }));
    
    // 供應商標籤 (排除"未指定")
    const suppliers = Array.from(new Set(materials.map(m => m.supplierName).filter(s => s && s !== '未指定')));
    const supplierTags = suppliers.slice(0, 4).map((supplier) => ({
      key: 'supplierName',
      label: supplier,
      value: supplier,
      count: materials.filter(m => m.supplierName === supplier).length,
      color: 'gray' as const
    }));
    
    const finalQuickFilters = [
      // 狀態篩選
      {
        key: 'isLowStock',
        label: '低庫存',
        value: true,
        count: materials.filter(m => m.isLowStock).length,
        color: 'red' as const
      },
      // 主分類標籤
      ...mainCategoryTags,
      // 細分類標籤
      ...subCategoryTags,
      // 供應商標籤
      ...supplierTags
    ];
    
    console.log('🔧 [快選標籤除錯] 最終快選標籤:', finalQuickFilters);
    return finalQuickFilters;
  }, [materials]);

  // 操作處理函式
  const handleAdd = () => {
    setSelectedMaterial(null);
    setIsDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedMaterial || !db) {
      toast.error("系統錯誤：資料庫未初始化");
      return;
    }
    const toastId = toast.loading("正在刪除物料...");
    try {
      await deleteDoc(doc(db, "materials", selectedMaterial.id));
      toast.success(`物料 ${selectedMaterial.name} 已成功刪除。`, { id: toastId });
      fetchMaterials();
    } catch (error) {
      console.error("刪除物料失敗:", error);
      toast.error("刪除物料失敗", { id: toastId });
    } finally {
      setIsConfirmOpen(false);
      setSelectedMaterial(null);
    }
  };

  // 處理盤點儲存
  const handleStocktakeSave = async () => {
    if (!canManageMaterials || Object.keys(stocktakeUpdates).length === 0) {
      toast.error("沒有變更需要儲存");
      return;
    }

    try {
      const functions = getFunctions();
      const batchUpdateInventory = httpsCallable(functions, 'batchUpdateInventory');
      
      await batchUpdateInventory({
        updates: Object.entries(stocktakeUpdates).map(([id, quantity]) => ({
          id,
          quantity,
          type: 'material'
        }))
      });

      toast.success(`已更新 ${Object.keys(stocktakeUpdates).length} 項原料庫存`);
      setStocktakeUpdates({});
      setStocktakeMode(false);
      fetchMaterials();
    } catch (error) {
      console.error("盤點儲存失敗:", error);
      toast.error("盤點儲存失敗");
    }
  };

  // 工具列額外動作
  const toolbarActions = (
    <>
      {canManageMaterials && (
        <Button 
          variant="outline" 
          onClick={() => router.push('/dashboard/material-categories')}
          className="border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-200"
        >
          <Tag className="h-4 w-4 mr-2" />
          分類管理
        </Button>
      )}
      {canManageMaterials && (
        <Button 
          variant="outline" 
          onClick={() => setStocktakeMode(!stocktakeMode)}
          className={`transition-all duration-200 ${
            stocktakeMode 
              ? 'bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200' 
              : 'border-orange-200 text-orange-600 hover:bg-orange-600 hover:text-white hover:border-orange-600'
          }`}
        >
          <Warehouse className="h-4 w-4 mr-2" />
          {stocktakeMode ? '退出盤點' : '庫存盤點'}
        </Button>
      )}
    </>
  );

  if (!canViewMaterials) {
    return (
      <div className="text-center py-8">
        <p>您沒有權限查看此頁面</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-blue-600 bg-clip-text text-transparent">
            原料庫管理
          </h1>
          <p className="text-gray-600 mt-2">管理原料庫存、分類與供應商資訊</p>
        </div>
      </div>

      <StandardDataListPage
        data={filteredMaterials}
        loading={isLoading}
        columns={columns}
        actions={actions}
        bulkActions={bulkActions}
        onRowClick={(record) => router.push(`/dashboard/materials/${record.id}`)}
        
        // 搜尋與過濾
        searchable={true}
        searchPlaceholder="搜尋物料名稱、代號、分類或供應商..."
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
        selectedRows={selectedRows}
        onSelectionChange={(selected) => setSelectedRows(selected as string[])}
        rowKey="id"
        
        // 統計資訊
        stats={stats}
        showStats={true}
        
        // 工具列功能
        showToolbar={true}
        toolbarActions={toolbarActions}
        showImportExport={canManageMaterials}
        onImport={() => setIsImportExportOpen(true)}
        
        // 新增功能
        showAddButton={canManageMaterials}
        addButtonText="新增物料"
        onAdd={handleAdd}
        
        // 盤點模式
        stocktakeMode={stocktakeMode}
        onStocktakeModeChange={setStocktakeMode}
        stocktakeUpdates={stocktakeUpdates}
        onStocktakeUpdateChange={setStocktakeUpdates}
        onStocktakeSave={handleStocktakeSave}
        
        // 權限控制
        permissions={{
          view: canViewMaterials,
          create: canManageMaterials,
          edit: canManageMaterials,
          delete: canManageMaterials,
          export: canManageMaterials,
          import: canManageMaterials
        }}
        
        className="space-y-6"
      />

      <MaterialDialog
        isOpen={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedMaterial(null);
        }}
        onMaterialUpdate={() => {
          fetchMaterials();
        }}
        materialData={selectedMaterial}
      />

      {selectedMaterial && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmDelete}
          title="確認刪除物料"
          description={`您確定要永久刪除物料「${selectedMaterial.name}」嗎？此操作無法復原。`}
        />
      )}

      <ImportExportDialog
        isOpen={isImportExportOpen}
        onOpenChange={setIsImportExportOpen}
        onImport={async (data: any[], options?: { updateMode?: boolean }, onProgress?: (current: number, total: number) => void) => {
          const functions = getFunctions();
          
          try {
            console.log('原料匯入資料:', data);
            fetchMaterials();
          } catch (error) {
            console.error('匯入原料失敗', error);
            throw error;
          }
        }}
        onExport={async () => {
          return materials.map(material => ({
            code: material.code,
            name: material.name,
            categoryName: material.categoryName,
            subCategoryName: material.subCategoryName,
            supplierName: material.supplierName,
            currentStock: material.currentStock,
            safetyStockLevel: material.safetyStockLevel,
            costPerUnit: material.costPerUnit,
            unit: material.unit,
            status: material.status
          }));
        }}
        title="原料資料"
        description="匯入或匯出原料資料，支援 Excel 和 CSV 格式。"
        color="orange"
        showUpdateOption={false}
        maxBatchSize={500}
        sampleData={[
          {
            code: "",
            name: "示例原料",
            categoryName: "紙盒",
            subCategoryName: "彩盒",
            supplierName: "示例供應商",
            currentStock: 100,
            safetyStockLevel: 50,
            costPerUnit: 12.5,
            unit: "KG",
            status: "啟用"
          }
        ]}
        fields={[
          { key: "code", label: "原料代號 (留空自動生成)", required: false, type: "string" },
          { key: "name", label: "原料名稱", required: true, type: "string" },
          { key: "categoryName", label: "主分類", required: false, type: "string" },
          { key: "subCategoryName", label: "細分分類", required: false, type: "string" },
          { key: "supplierName", label: "供應商", required: false, type: "string" },
          { key: "currentStock", label: "目前庫存", required: false, type: "number" },
          { key: "safetyStockLevel", label: "安全庫存", required: false, type: "number" },
          { key: "costPerUnit", label: "單位成本", required: false, type: "number" },
          { key: "unit", label: "單位", required: false, type: "string" },
          { key: "status", label: "狀態", required: false, type: "string" }
        ]}
      />
    </div>
  );
}