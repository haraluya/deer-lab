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
      const suppliersSnapshot = await getDocs(collection(db, "suppliers"));
      suppliersSnapshot.forEach((doc) => {
        const supplierData = doc.data();
        suppliersMap.set(doc.id, supplierData.name);
      });
      
      // 獲取主分類
      try {
        const categoriesSnapshot = await getDocs(collection(db, "materialCategories"));
        categoriesSnapshot.forEach((doc) => {
          const categoryData = doc.data();
          categoriesMap.set(doc.id, categoryData.name);
        });
      } catch (error) {
        console.log("主分類集合不存在，跳過");
      }
      
      // 獲取細分類
      try {
        const subCategoriesSnapshot = await getDocs(collection(db, "materialSubCategories"));
        subCategoriesSnapshot.forEach((doc) => {
          const subCategoryData = doc.data();
          subCategoriesMap.set(doc.id, subCategoryData.name);
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
        
        // 獲取供應商名稱
        const supplierName = data.supplierId ? suppliersMap.get(data.supplierId) || '未知供應商' : '未指定';
        
        // 獲取分類名稱
        let categoryName = '';
        let subCategoryName = '';
        
        if (data.category) {
          // 如果是舊格式的 category，直接使用
          if (typeof data.category === 'string') {
            categoryName = data.category;
          }
        }
        
        // 如果有分類ID，從分類資料中獲取名稱
        if (data.mainCategoryId) {
          const mainCatName = categoriesMap.get(data.mainCategoryId);
          if (mainCatName) {
            categoryName = mainCatName;
          }
        }
        
        if (data.subCategoryId) {
          const subCatName = subCategoriesMap.get(data.subCategoryId);
          if (subCatName) {
            subCategoryName = subCatName;
          }
        }
        
        // 如果都沒有，使用 category 字段中的分類
        if (!categoryName && data.category) {
          const categoryParts = data.category.split('/');
          categoryName = categoryParts[0] || '';
          if (categoryParts.length > 1) {
            subCategoryName = categoryParts[1] || '';
          }
        }
        
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
          {record.categoryName && record.categoryName !== '未分類' && (
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              {record.categoryName}
            </Badge>
          )}
          {record.subCategoryName && (
            <Badge variant="outline" className="text-gray-600 border-gray-300 text-xs">
              {record.subCategoryName}
            </Badge>
          )}
          {record.categoryName === '未分類' && (
            <span className="text-gray-400 text-sm">未分類</span>
          )}
        </div>
      ),
      mobileRender: (value, record) => (
        <div className="space-y-1">
          {record.categoryName && record.categoryName !== '未分類' && (
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
              {record.categoryName}
            </Badge>
          )}
          {record.subCategoryName && (
            <div>
              <Badge variant="outline" className="text-gray-600 border-gray-300 text-xs">
                {record.subCategoryName}
              </Badge>
            </div>
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
    const categories = Array.from(new Set(materials.map(m => m.categoryName).filter(c => c && c !== '未分類')));
    const suppliers = Array.from(new Set(materials.map(m => m.supplierName).filter(s => s && s !== '未指定')));
    
    return [
      // 狀態篩選
      {
        key: 'isLowStock',
        label: '低庫存',
        value: true,
        count: materials.filter(m => m.isLowStock).length,
        color: 'red'
      },
      {
        key: 'isActive',
        label: '活躍物料',
        value: true,
        count: materials.filter(m => m.isActive !== false).length,
        color: 'green'
      },
      // 分類篩選 (顯示前5個)
      ...categories.slice(0, 5).map(category => ({
        key: 'categoryName',
        label: category,
        value: category,
        count: materials.filter(m => m.categoryName === category).length,
        color: 'blue' as const
      })),
      // 供應商篩選 (顯示前3個)
      ...suppliers.slice(0, 3).map(supplier => ({
        key: 'supplierName',
        label: supplier,
        value: supplier,
        count: materials.filter(m => m.supplierName === supplier).length,
        color: 'purple' as const
      }))
    ];
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
        onImport={() => toast.info('匯入功能開發中...')}
        onExport={() => toast.info('匯出功能開發中...')}
        
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
    </div>
  );
}