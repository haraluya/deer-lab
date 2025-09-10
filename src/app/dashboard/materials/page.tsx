'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { MaterialData } from '@/types/entities';
import { usePermission } from '@/hooks/usePermission';
import { useCartOperations } from '@/hooks/useCartOperations';
import { StandardDataListPage, StandardColumn, StandardAction, StandardStats, StandardFilter, QuickFilter } from '@/components/StandardDataListPage';
import { Package, DollarSign, AlertTriangle, Building, Eye, Edit, Trash2, ShoppingCart, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { MaterialDialog } from './MaterialDialog';

// 擴展 MaterialData 以包含供應商資訊
interface MaterialWithSupplier extends MaterialData {
  supplierName: string;
  type: 'material';
}

export default function MaterialsPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<MaterialWithSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [stocktakeMode, setStocktakeMode] = useState(false);
  const [stocktakeUpdates, setStocktakeUpdates] = useState<Record<string, number>>({});
  
  // 對話框狀態
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialData | null>(null);

  // 權限檢查
  const { hasPermission } = usePermission();
  const canViewMaterials = hasPermission('materials.view') || hasPermission('materials.manage');
  const canManageMaterials = hasPermission('materials.manage');

  // 購物車操作
  const { addSingleItem: addToPurchaseCart } = useCartOperations(materials, { itemType: 'material' });

  // 獲取供應商資料
  const fetchSuppliers = useCallback(async () => {
    const suppliersMap = new Map<string, string>();
    try {
      if (!db) {
        console.error("Firebase db 未初始化");
        return suppliersMap;
      }
      const querySnapshot = await getDocs(collection(db, "suppliers"));
      querySnapshot.forEach((doc) => {
        suppliersMap.set(doc.id, doc.data().name);
      });
    } catch (error) {
      console.error("獲取供應商資料失敗:", error);
    }
    return suppliersMap;
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
      const suppliersMap = await fetchSuppliers();
      const querySnapshot = await getDocs(collection(db, "materials"));
      
      const materialsData: MaterialWithSupplier[] = querySnapshot.docs.map((doc) => {
        const data = { id: doc.id, ...doc.data() } as MaterialData;
        return {
          ...data,
          supplierName: data.supplierId ? suppliersMap.get(data.supplierId) || '未知供應商' : '未指定',
          type: 'material' as const
        };
      });
      
      setMaterials(materialsData);
    } catch (error) {
      console.error("獲取原料資料失敗:", error);
      toast.error("載入原料資料失敗");
    } finally {
      setIsLoading(false);
    }
  }, [fetchSuppliers]);

  // 初始載入
  useEffect(() => {
    if (canViewMaterials) {
      fetchMaterials();
    }
  }, [canViewMaterials, fetchMaterials]);

  // 處理新增
  const handleAdd = () => {
    setSelectedMaterial(null);
    setIsDialogOpen(true);
  };

  // 處理編輯
  const handleEdit = (material: MaterialWithSupplier) => {
    setSelectedMaterial(material);
    setIsDialogOpen(true);
  };

  // 處理刪除
  const handleDelete = async (material: MaterialWithSupplier) => {
    if (!canManageMaterials) {
      toast.error("權限不足");
      return;
    }

    if (!db) {
      toast.error("系統錯誤：資料庫未初始化");
      return;
    }

    try {
      await deleteDoc(doc(db, "materials", material.id));
      toast.success("刪除成功");
      fetchMaterials();
    } catch (error) {
      console.error("刪除失敗:", error);
      toast.error("刪除失敗");
    }
  };

  // 處理加入購物車
  const handleAddToCart = async (material: MaterialWithSupplier) => {
    try {
      await addToPurchaseCart(material);
      toast.success("已加入採購車");
    } catch (error) {
      console.error("加入購物車失敗:", error);
      toast.error("加入購物車失敗");
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

  // 過濾後的資料
  const filteredData = useMemo(() => {
    let result = materials;

    // 搜尋過濾
    if (searchValue.trim()) {
      const searchTerm = searchValue.toLowerCase();
      result = result.filter(material =>
        material.name.toLowerCase().includes(searchTerm) ||
        material.code.toLowerCase().includes(searchTerm) ||
        material.supplierName.toLowerCase().includes(searchTerm) ||
        (material.category && material.category.toLowerCase().includes(searchTerm))
      );
    }

    // 篩選器過濾
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        switch (key) {
          case 'category':
            result = result.filter(item => item.category === value);
            break;
          case 'supplier':
            result = result.filter(item => item.supplierName === value);
            break;
          case 'lowStock':
            result = result.filter(item => item.currentStock < item.minStock);
            break;
          case 'status':
            if (value === 'active') {
              result = result.filter(item => item.isActive !== false);
            } else if (value === 'inactive') {
              result = result.filter(item => item.isActive === false);
            }
            break;
        }
      }
    });

    return result;
  }, [materials, searchValue, activeFilters]);

  // 定義欄位
  const columns: StandardColumn<MaterialWithSupplier>[] = [
    {
      key: 'code',
      title: '原料編號',
      sortable: true,
      priority: 5,
      render: (value) => (
        <span className="font-mono text-sm font-medium">{value}</span>
      )
    },
    {
      key: 'name',
      title: '原料名稱',
      sortable: true,
      priority: 5,
      render: (value) => (
        <span className="font-semibold">{value}</span>
      )
    },
    {
      key: 'currentStock',
      title: '目前庫存',
      sortable: true,
      align: 'right',
      priority: 4,
      render: (value, record) => (
        <div className={`font-semibold ${value < record.minStock ? 'text-red-600' : 'text-gray-900'}`}>
          {value} {record.unit}
        </div>
      ),
      mobileRender: (value, record) => (
        <div className={`font-bold ${value < record.minStock ? 'text-red-600' : 'text-green-600'}`}>
          {value} {record.unit}
        </div>
      )
    },
    {
      key: 'costPerUnit',
      title: '單位成本',
      sortable: true,
      align: 'right',
      priority: 3,
      render: (value) => `$${value.toFixed(2)}`,
      mobileRender: (value) => (
        <span className="font-semibold text-green-600">${value.toFixed(2)}</span>
      )
    },
    {
      key: 'category',
      title: '分類',
      priority: 2,
      render: (value) => value ? (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">{value}</span>
      ) : '-'
    },
    {
      key: 'supplierName',
      title: '供應商',
      priority: 2,
      render: (value) => (
        <span className="text-sm">{value}</span>
      )
    },
    {
      key: 'minStock',
      title: '最低庫存',
      align: 'right',
      priority: 1,
      hideOnMobile: true,
      render: (value, record) => `${value} ${record.unit}`
    }
  ];

  // 定義操作
  const actions: StandardAction<MaterialWithSupplier>[] = [
    {
      key: 'view',
      title: '查看',
      icon: <Eye className="h-4 w-4" />,
      onClick: (material) => {
        // TODO: 實作查看詳情
        console.log('查看原料:', material);
      }
    },
    {
      key: 'addToCart',
      title: '加入購物車',
      icon: <ShoppingCart className="h-4 w-4" />,
      onClick: handleAddToCart
    },
    {
      key: 'edit',
      title: '編輯',
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      visible: () => canManageMaterials
    },
    {
      key: 'delete',
      title: '刪除',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      confirmMessage: '確定要刪除此原料嗎？此操作無法恢復。',
      onClick: handleDelete,
      visible: () => canManageMaterials
    }
  ];

  // 統計資訊
  const stats: StandardStats[] = useMemo(() => {
    const lowStockCount = materials.filter(m => m.currentStock < m.minStock).length;
    const totalValue = materials.reduce((sum, m) => sum + (m.currentStock * m.costPerUnit), 0);
    const activeCount = materials.filter(m => m.isActive !== false).length;

    return [
      {
        title: '總原料數',
        value: materials.length,
        subtitle: '所有原料',
        icon: <Package className="h-4 w-4" />,
        color: 'blue'
      },
      {
        title: '總價值',
        value: `$${totalValue.toFixed(2)}`,
        subtitle: '庫存總價值',
        icon: <DollarSign className="h-4 w-4" />,
        color: 'green'
      },
      {
        title: '低庫存原料',
        value: lowStockCount,
        subtitle: '需要補貨',
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'red'
      },
      {
        title: '活躍原料',
        value: activeCount,
        subtitle: '正在使用中',
        icon: <Building className="h-4 w-4" />,
        color: 'orange'
      }
    ];
  }, [materials]);

  // 快速篩選標籤
  const quickFilters: QuickFilter[] = useMemo(() => {
    const categories = Array.from(new Set(materials.map(m => m.category).filter(Boolean))) as string[];
    const suppliers = Array.from(new Set(materials.map(m => m.supplierName).filter(Boolean))) as string[];
    
    return [
      {
        key: 'lowStock',
        label: '低庫存',
        value: true,
        count: materials.filter(m => m.currentStock < m.minStock).length,
        color: 'red'
      },
      {
        key: 'status',
        label: '活躍原料',
        value: 'active',
        count: materials.filter(m => m.isActive !== false).length,
        color: 'green'
      },
      ...categories.slice(0, 3).map(category => ({
        key: 'category',
        label: category,
        value: category,
        count: materials.filter(m => m.category === category).length,
        color: 'blue' as const
      })),
      ...suppliers.slice(0, 2).map(supplier => ({
        key: 'supplier',
        label: supplier,
        value: supplier,
        count: materials.filter(m => m.supplierName === supplier).length,
        color: 'purple' as const
      }))
    ];
  }, [materials]);

  // 過濾器
  const filters: StandardFilter[] = useMemo(() => {
    const categories = Array.from(new Set(materials.map(m => m.category).filter(Boolean))) as string[];
    const suppliers = Array.from(new Set(materials.map(m => m.supplierName).filter(Boolean))) as string[];

    return [
      {
        key: 'category',
        title: '分類',
        type: 'select',
        options: categories.map(category => ({
          label: category,
          value: category,
          count: materials.filter(m => m.category === category).length
        })),
        placeholder: '選擇分類...'
      },
      {
        key: 'supplier',
        title: '供應商',
        type: 'select',
        options: suppliers.map(supplier => ({
          label: supplier,
          value: supplier,
          count: materials.filter(m => m.supplierName === supplier).length
        })),
        placeholder: '選擇供應商...'
      },
      {
        key: 'status',
        title: '狀態',
        type: 'select',
        options: [
          { label: '活躍', value: 'active', count: materials.filter(m => m.isActive !== false).length },
          { label: '停用', value: 'inactive', count: materials.filter(m => m.isActive === false).length }
        ],
        placeholder: '選擇狀態...'
      }
    ];
  }, [materials]);

  // 處理篩選變更
  const handleFilterChange = (filterKey: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  // 清除篩選
  const handleClearFilters = () => {
    setActiveFilters({});
  };

  if (!canViewMaterials) {
    return (
      <div className="text-center py-8">
        <p>您沒有權限查看此頁面</p>
      </div>
    );
  }

  return (
    <>
      <StandardDataListPage
        data={filteredData}
        loading={isLoading}
        columns={columns}
        actions={actions}
        
        // 搜尋功能
        searchable={true}
        searchPlaceholder="搜尋原料編號、名稱、分類或供應商..."
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        
        // 過濾功能
        filters={filters}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        
        // 快速篩選標籤
        quickFilters={quickFilters}
        showQuickFilters={true}
        
        // 選擇功能
        selectable={true}
        selectedRows={selectedRows}
        onSelectionChange={(selected: string[] | number[]) => setSelectedRows(selected as string[])}
        rowKey="id"
        
        // 統計資訊
        stats={stats}
        showStats={true}
        
        // 工具列功能
        showToolbar={true}
        showImportExport={true}
        onImport={() => {
          // TODO: 實作匯入功能
          toast.info('匯入功能開發中...');
        }}
        onExport={() => {
          // TODO: 實作匯出功能  
          toast.info('匯出功能開發中...');
        }}
        
        // 新增功能
        showAddButton={canManageMaterials}
        addButtonText="新增原料"
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
        
        // 行點擊
        onRowClick={(material) => router.push(`/dashboard/materials/${material.id}`)}
        
        className="container mx-auto px-4 py-6 max-w-full overflow-hidden"
      />

      {/* 新增/編輯對話框 */}
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
    </>
  );
}