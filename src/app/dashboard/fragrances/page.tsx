'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FragranceData } from './FragranceDialog';
import { usePermission } from '@/hooks/usePermission';
import { useCartOperations } from '@/hooks/useCartOperations';
import { useApiClient } from '@/hooks/useApiClient';
import { useFragrancesCache } from '@/hooks/useFragrancesCache';
import { StandardDataListPage, StandardColumn, StandardAction, StandardFilter, QuickFilter } from '@/components/StandardDataListPage';
import { StandardStats } from '@/components/StandardStatsCard';
import { Droplets, DollarSign, AlertTriangle, Building, Eye, Edit, Trash2, ShoppingCart, Plus, Calculator, Package, MoreHorizontal, Warehouse } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatPrice, formatStock } from '@/utils/numberFormat';
import { FragranceDialog } from './FragranceDialog';
import { ImportExportDialog } from '@/components/ImportExportDialog';

// 擴展 FragranceData 以包含供應商資訊
interface FragranceWithSupplier extends FragranceData {
  supplierName: string;
  type: 'fragrance';
}

export default function FragrancesPage() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [stocktakeMode, setStocktakeMode] = useState(false);
  const [stocktakeUpdates, setStocktakeUpdates] = useState<Record<string, number>>({});

  // 分頁狀態
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // 排序狀態
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 🚀 使用智能快取 Hook 替代原有載入邏輯
  const {
    fragrances,
    loading: isLoading,
    error: fragrancesError,
    loadFragrances,
    invalidateCache,
    isFromCache,
    cacheAge
  } = useFragrancesCache();
  
  // 對話框狀態
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFragrance, setSelectedFragrance] = useState<FragranceData | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // 權限檢查
  const { hasPermission } = usePermission();
  const canViewFragrances = hasPermission('fragrances.view') || hasPermission('fragrances.manage');
  const canManageFragrances = hasPermission('fragrances.manage');

  // 購物車操作
  const { addSingleItem: addToPurchaseCart } = useCartOperations(fragrances, { itemType: 'fragrance' });

  // API 客戶端
  const apiClient = useApiClient();

  // 初始載入
  useEffect(() => {
    if (canViewFragrances) {
      loadFragrances();
    }
  }, [canViewFragrances, loadFragrances]);

  // 錯誤處理
  useEffect(() => {
    if (fragrancesError) {
      toast.error(fragrancesError);
    }
  }, [fragrancesError]);

  // 處理新增
  const handleAdd = () => {
    setSelectedFragrance(null);
    setIsDialogOpen(true);
  };

  // 處理編輯
  const handleEdit = (fragrance: FragranceWithSupplier) => {
    setSelectedFragrance(fragrance);
    setIsDialogOpen(true);
  };

  // 處理刪除
  const handleDelete = async (fragrance: FragranceWithSupplier) => {
    if (!canManageFragrances) {
      toast.error("權限不足");
      return;
    }

    if (!db) {
      toast.error("系統錯誤：資料庫未初始化");
      return;
    }

    try {
      await deleteDoc(doc(db, "fragrances", fragrance.id));
      toast.success("刪除成功");

      // 🚀 刪除成功後清除快取並重新載入
      invalidateCache();
      loadFragrances();
    } catch (error) {
      console.error("刪除失敗:", error);
      toast.error("刪除失敗");
    }
  };

  // 處理加入購物車
  const handleAddToCart = async (fragrance: FragranceWithSupplier) => {
    try {
      await addToPurchaseCart(fragrance);
      toast.success("已加入採購車");
    } catch (error) {
      console.error("加入購物車失敗:", error);
      toast.error("加入購物車失敗");
    }
  };

  // 處理盤點儲存
  const handleStocktakeSave = async () => {
    if (!canManageFragrances || Object.keys(stocktakeUpdates).length === 0) {
      toast.error("沒有變更需要儲存");
      return;
    }

    try {
      const result = await apiClient.call('quickUpdateInventory', {
        updates: Object.entries(stocktakeUpdates).map(([id, quantity]) => ({
          itemId: id,
          newStock: quantity,
          type: 'fragrance' as const,
          reason: '盤點調整'
        }))
      });

      if (result.success && result.data) {
        const { summary } = result.data;
        if (summary.successful > 0) {
          toast.success(`成功更新 ${summary.successful} 項香精庫存`);
          if (summary.failed > 0) {
            toast.warning(`${summary.failed} 項更新失敗`);
          }
        }
        setStocktakeUpdates({});
        setStocktakeMode(false);

        // 🚀 盤點成功後清除快取並重新載入
        invalidateCache();
        loadFragrances();
      } else {
        // 處理API調用失敗
        console.error('香精盤點API調用失敗:', result.error);
        toast.error(result.error?.message || '盤點儲存失敗');
      }
    } catch (error) {
      console.error("盤點儲存失敗:", error);
      toast.error("盤點儲存失敗");
    }
  };

  // 過濾後的資料
  const filteredData = useMemo(() => {
    let result = fragrances;

    // 搜尋過濾
    if (searchValue.trim()) {
      const searchTerm = searchValue.toLowerCase();
      result = result.filter(fragrance =>
        fragrance.name.toLowerCase().includes(searchTerm) ||
        fragrance.code.toLowerCase().includes(searchTerm) ||
        fragrance.supplierName.toLowerCase().includes(searchTerm) ||
        (fragrance.fragranceType && fragrance.fragranceType.toLowerCase().includes(searchTerm)) ||
        (fragrance.fragranceStatus && fragrance.fragranceStatus.toLowerCase().includes(searchTerm))
      );
    }

    // 篩選器過濾
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        switch (key) {
          case 'fragranceType':
            result = result.filter(item => item.fragranceType === value);
            break;
          case 'fragranceStatus':
            result = result.filter(item => item.fragranceStatus === value);
            break;
          case 'supplier':
            result = result.filter(item => item.supplierName === value);
            break;
          case 'lowStock':
            result = result.filter(item => 
              item.safetyStockLevel && item.currentStock < item.safetyStockLevel
            );
            break;
        }
      }
    });

    return result;
  }, [fragrances, searchValue, activeFilters]);

  // 定義欄位
  const columns: StandardColumn<FragranceWithSupplier>[] = [
    {
      key: 'fragranceInfo',
      title: '香精資訊',
      sortable: true,
      priority: 5,
      render: (value, record) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Droplets className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">{record.name}</span>
            <span className="font-mono text-sm text-gray-500">{record.code}</span>
          </div>
        </div>
      )
    },
    {
      key: 'fragranceType',
      title: '香精種類',
      priority: 4,
      render: (value) => value ? (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{value}</Badge>
      ) : '-'
    },
    {
      key: 'fragranceStatus',
      title: '啟用狀態',
      priority: 4,
      render: (value) => {
        const colorMap: Record<string, string> = {
          '啟用': 'bg-green-50 text-green-700 border-green-200',
          '備用': 'bg-yellow-50 text-yellow-700 border-yellow-200',
          '棄用': 'bg-pink-50 text-pink-700 border-pink-200',
          'active': 'bg-green-50 text-green-700 border-green-200',
          'standby': 'bg-yellow-50 text-yellow-700 border-yellow-200',
          'discontinued': 'bg-pink-50 text-pink-700 border-pink-200'
        };
        return value ? (
          <Badge variant="outline" className={colorMap[value] || 'bg-gray-50 text-gray-700'}>
            {value}
          </Badge>
        ) : '-';
      }
    },
    {
      key: 'supplierName',
      title: '供應商',
      priority: 3,
      render: (value) => (
        <span className="text-sm">{value}</span>
      )
    },
    {
      key: 'percentage',
      title: '香精比例',
      sortable: true,
      align: 'right',
      priority: 3,
      render: (value) => value ? (
        <div className="font-semibold text-purple-600">
          {value}%
        </div>
      ) : '-'
    },
    {
      key: 'currentStock',
      title: '目前庫存',
      sortable: true,
      align: 'right',
      priority: 3,
      render: (value, record) => {
        const isLowStock = record.safetyStockLevel && value < record.safetyStockLevel;
        return (
          <div className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
            {value} {record.unit || 'ml'}
          </div>
        );
      },
      mobileRender: (value, record) => {
        const isLowStock = record.safetyStockLevel && value < record.safetyStockLevel;
        return (
          <div className={`font-bold ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
            {value} {record.unit || 'ml'}
          </div>
        );
      }
    },
    {
      key: 'safetyStockLevel',
      title: '安全庫存',
      align: 'right',
      priority: 2,
      hideOnMobile: true,
      render: (value, record) => value ? `${value} ${record.unit || 'ml'}` : '-'
    }
  ];

  // 定義操作
  const actions: StandardAction<FragranceWithSupplier>[] = [
    {
      key: 'view',
      title: '查看',
      icon: <Eye className="h-4 w-4" />,
      onClick: (fragrance) => {
        // TODO: 實作查看詳情
        console.log('查看香精:', fragrance);
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
      visible: () => canManageFragrances
    },
    {
      key: 'delete',
      title: '刪除',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      confirmMessage: '確定要刪除此香精嗎？此操作無法恢復。',
      onClick: handleDelete,
      visible: () => canManageFragrances
    }
  ];

  // 批量操作
  const bulkActions: StandardAction<FragranceWithSupplier[]>[] = canManageFragrances ? [
    {
      key: 'batchAddToCart',
      title: '批量加入購物車',
      icon: <ShoppingCart className="h-4 w-4" />,
      onClick: async (fragrances) => {
        try {
          for (const fragrance of fragrances) {
            await addToPurchaseCart(fragrance);
          }
          toast.success(`已將 ${fragrances.length} 項香精加入購物車`);
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
      confirmMessage: '確定要刪除選中的香精嗎？此操作不可復原。',
      onClick: async (fragrances) => {
        const toastId = toast.loading("正在刪除香精...");
        try {
          for (const fragrance of fragrances) {
            const result = await apiClient.call('deleteFragrance', { id: fragrance.id });
            if (!result.success) {
              throw new Error(result.error?.message || '刪除失敗');
            }
          }
          
          toast.success(`已成功刪除 ${fragrances.length} 項香精`, { id: toastId });

          // 🚀 批量刪除成功後清除快取並重新載入
          invalidateCache();
          loadFragrances();
          setSelectedRows([]); // 清除選中狀態
        } catch (error) {
          console.error("批量刪除香精失敗", error);
          toast.error("批量刪除香精失敗", { id: toastId });
        }
      }
    }
  ] : [];

  // 統計資訊
  const stats: StandardStats[] = useMemo(() => {
    const lowStockCount = fragrances.filter(f => 
      f.safetyStockLevel && f.currentStock < f.safetyStockLevel
    ).length;
    const totalValue = fragrances.reduce((sum, f) => 
      sum + ((f.currentStock || 0) * (f.costPerUnit || 0)), 0
    );
    const activeCount = fragrances.filter(f => 
      f.fragranceStatus === '啟用'
    ).length;

    return [
      {
        title: '總香精數',
        value: fragrances.length,
        subtitle: '所有香精',
        icon: <Droplets className="h-4 w-4" />,
        color: 'blue'
      },
      {
        title: '總價值',
        value: `$${Math.round(totalValue).toLocaleString()}`,
        subtitle: '庫存總價值',
        icon: <DollarSign className="h-4 w-4" />,
        color: 'green'
      },
      {
        title: '低庫存香精',
        value: lowStockCount,
        subtitle: '需要補貨',
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'red'
      },
      {
        title: '已啟用香精',
        value: activeCount,
        subtitle: '已啟用數量',
        icon: <Package className="h-4 w-4" />,
        color: 'purple'
      }
    ];
  }, [fragrances]);

  // 快速篩選標籤
  const quickFilters: QuickFilter[] = useMemo(() => {
    const fragranceTypes = Array.from(new Set(fragrances.map(f => f.fragranceType).filter(Boolean))) as string[];
    const fragranceStatuses = Array.from(new Set(fragrances.map(f => f.fragranceStatus).filter(Boolean))) as string[];

    // 為香精種類分配顏色 (避開啟用狀態顏色)
    const typeColorMap: Record<string, 'blue' | 'purple' | 'orange'> = {};
    const availableTypeColors: ('blue' | 'purple' | 'orange')[] = ['blue', 'purple', 'orange'];
    fragranceTypes.forEach((type, index) => {
      typeColorMap[type] = availableTypeColors[index % availableTypeColors.length];
    });

    return [
      // 1. 低庫存 (紅色)
      {
        key: 'lowStock',
        label: '低庫存',
        value: true,
        count: fragrances.filter(f => f.safetyStockLevel && f.currentStock < f.safetyStockLevel).length,
        color: 'red' as const
      },
      // 2. 香精種類 (藍色系列)
      ...fragranceTypes.slice(0, 3).map(type => ({
        key: 'fragranceType',
        label: type,
        value: type,
        count: fragrances.filter(f => f.fragranceType === type).length,
        color: typeColorMap[type]
      })),
      // 3. 啟用狀態 (依照對應顏色)
      {
        key: 'fragranceStatus',
        label: '啟用',
        value: '啟用',
        count: fragrances.filter(f => f.fragranceStatus === '啟用').length,
        color: 'green' as const // 啟用 - 綠色
      },
      {
        key: 'fragranceStatus',
        label: '備用',
        value: '備用',
        count: fragrances.filter(f => f.fragranceStatus === '備用').length,
        color: 'yellow' as const // 備用 - 黃色
      },
      ...fragranceStatuses.filter(status => !['啟用', '備用'].includes(status)).slice(0, 2).map(status => ({
        key: 'fragranceStatus',
        label: status,
        value: status,
        count: fragrances.filter(f => f.fragranceStatus === status).length,
        color: status === '棄用' ? ('red' as const) : ('gray' as const) // 棄用 - 紅色，其他 - 灰色
      }))
    ].filter(filter => filter.count > 0); // 只顯示有數據的標籤
  }, [fragrances]);

  // 過濾器
  const filters: StandardFilter[] = useMemo(() => {
    const fragranceTypes = Array.from(new Set(fragrances.map(f => f.fragranceType).filter(Boolean))) as string[];
    const fragranceStatuses = Array.from(new Set(fragrances.map(f => f.fragranceStatus).filter(Boolean))) as string[];
    const suppliers = Array.from(new Set(fragrances.map(f => f.supplierName).filter(Boolean))) as string[];

    return [
      {
        key: 'fragranceType',
        title: '香精種類',
        type: 'select',
        options: fragranceTypes.map(type => ({
          label: type,
          value: type,
          count: fragrances.filter(f => f.fragranceType === type).length
        })),
        placeholder: '選擇香精種類...'
      },
      {
        key: 'fragranceStatus',
        title: '狀態',
        type: 'select',
        options: fragranceStatuses.map(status => ({
          label: status,
          value: status,
          count: fragrances.filter(f => f.fragranceStatus === status).length
        })),
        placeholder: '選擇狀態...'
      },
      {
        key: 'supplier',
        title: '供應商',
        type: 'select',
        options: suppliers.map(supplier => ({
          label: supplier,
          value: supplier,
          count: fragrances.filter(f => f.supplierName === supplier).length
        })),
        placeholder: '選擇供應商...'
      }
    ];
  }, [fragrances]);

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

  // 工具列額外動作
  const toolbarActions = (
    <>
      {canManageFragrances && (
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

  // 自訂卡片渲染函數
  const renderFragranceCard = (fragrance: FragranceWithSupplier, index: number) => {
    const isLowStock = fragrance.safetyStockLevel && fragrance.currentStock < fragrance.safetyStockLevel;
    const recordKey = fragrance.id;
    const isSelected = selectedRows.includes(recordKey);

    return (
      <Card
        key={recordKey}
        className={`
          ${isSelected ? 'ring-2 ring-orange-300 bg-orange-50 shadow-lg' : 'hover:shadow-md'}
          cursor-pointer transition-all duration-200 relative border-0 shadow-sm
          ${isLowStock ? 'bg-destructive/10' : 'bg-gradient-to-br from-white to-gray-50/50'}
          w-full min-w-0 max-w-full min-h-[140px] overflow-hidden
        `}
        onClick={() => router.push(`/dashboard/fragrances/${fragrance.id}`)}
      >
        {/* 選擇框 */}
        <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => {
              const newSelectedRows = checked 
                ? [...selectedRows, recordKey]
                : selectedRows.filter(id => id !== recordKey);
              setSelectedRows(newSelectedRows);
            }}
            className="bg-white shadow-sm border-2 border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
          />
        </div>
        
        {/* 卡片標題區域 */}
        <CardHeader className="pb-2 pt-3 px-4 w-full">
          <div className="flex items-start justify-between w-full">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Droplets className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold text-gray-900 leading-tight truncate">
                  {fragrance.name}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                    {fragrance.code}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* 操作選單 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => handleAddToCart(fragrance)}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  加入採購車
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/dashboard/fragrances/${fragrance.id}`)}>
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
                  <DropdownMenuItem onClick={() => handleDelete(fragrance)} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    刪除
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        {/* 卡片內容區域 */}
        <CardContent className="pt-0 pb-3 px-4 w-full overflow-hidden">
          <div className="grid grid-cols-2 gap-4 text-sm min-w-0">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Building className="h-3 w-3 text-blue-600" />
                <span className="text-gray-500">供應商</span>
              </div>
              <span className="font-medium text-gray-700 truncate">{fragrance.supplierName}</span>
            </div>
            
            {fragrance.fragranceType && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-gray-500">種類</span>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium px-2 py-1">
                  {fragrance.fragranceType}
                </Badge>
              </div>
            )}
            
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Package className="h-3 w-3 text-gray-400" />
                <span className="text-gray-500">目前庫存</span>
              </div>
              <div className="flex items-center gap-1">
                {isLowStock && (
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                )}
                <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                  {fragrance.currentStock} {fragrance.unit || 'ml'}
                </span>
              </div>
            </div>
            
            {fragrance.percentage && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Calculator className="h-3 w-3 text-purple-600" />
                  <span className="text-gray-500">香精比例</span>
                </div>
                <span className="font-semibold text-purple-600">{fragrance.percentage}%</span>
              </div>
            )}
            
            {fragrance.costPerUnit && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign className="h-3 w-3 text-green-600" />
                  <span className="text-gray-500">單位成本</span>
                </div>
                <span className="font-semibold text-green-600">${formatPrice(fragrance.costPerUnit)}</span>
              </div>
            )}
            
            {fragrance.fragranceStatus && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-gray-500">狀態</span>
                </div>
                <Badge variant="outline" className={
                  fragrance.fragranceStatus === '啟用' || fragrance.fragranceStatus === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                  fragrance.fragranceStatus === '備用' || fragrance.fragranceStatus === 'standby' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  fragrance.fragranceStatus === '棄用' || fragrance.fragranceStatus === 'discontinued' ? 'bg-pink-50 text-pink-700 border-pink-200' :
                  'bg-gray-50 text-gray-700 border-gray-200'
                }>
                  {fragrance.fragranceStatus}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!canViewFragrances) {
    return (
      <div className="text-center py-8">
        <p>您沒有權限查看此頁面</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            香精配方庫
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-gray-600">管理所有香精配方，包括庫存監控和品質管理</p>
            {/* 🚀 快取狀態顯示 */}
            {isFromCache && (
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                ⚡ 快取資料 ({Math.floor(cacheAge / 1000)}秒前)
              </div>
            )}
          </div>
        </div>
      </div>

      <StandardDataListPage
        data={filteredData}
        loading={isLoading}
        columns={columns}
        actions={actions}
        bulkActions={bulkActions}
        
        // 搜尋功能
        searchable={true}
        searchPlaceholder="搜尋香精編號、名稱、種類或供應商..."
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
        toolbarActions={toolbarActions}
        showImportExport={canManageFragrances}
        onImport={() => setIsImportExportOpen(true)}
        
        // 新增功能
        showAddButton={canManageFragrances}
        addButtonText="新增香精"
        onAdd={handleAdd}

        // 盤點模式
        stocktakeMode={stocktakeMode}
        onStocktakeModeChange={setStocktakeMode}
        stocktakeUpdates={stocktakeUpdates}
        onStocktakeUpdateChange={setStocktakeUpdates}
        onStocktakeSave={handleStocktakeSave}

        // 權限控制
        permissions={{
          view: canViewFragrances,
          create: canManageFragrances,
          edit: canManageFragrances,
          delete: canManageFragrances,
          export: canManageFragrances,
          import: canManageFragrances
        }}
        
        // 行點擊
        onRowClick={(fragrance) => router.push(`/dashboard/fragrances/${fragrance.id}`)}
        
        // 使用統一卡片渲染，提高信息密度
        // renderCard={renderFragranceCard}
        
        // 啟用原版相容模式
        legacyMode={true}
        
        className="space-y-6"
      />

      {/* 新增/編輯對話框 */}
      <FragranceDialog
        isOpen={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedFragrance(null);
        }}
        onFragranceUpdate={() => {
          // 🚀 香精更新後清除快取並重新載入
          invalidateCache();
          loadFragrances();
        }}
        fragranceData={selectedFragrance}
      />

      <ImportExportDialog
        isOpen={isImportExportOpen}
        onOpenChange={setIsImportExportOpen}
        onImport={async (data: any[], options?: { updateMode?: boolean }, onProgress?: (current: number, total: number) => void) => {
          try {
            // 呼叫 importFragrances API
            const result = await apiClient.call('importFragrances', {
              fragrances: data
            });

            // 顯示匯入結果
            if (result.success && result.data?.summary) {
              const summary = result.data.summary;
              if (summary.successful > 0 && summary.failed === 0) {
                toast.success(`成功匯入 ${summary.successful} 筆香精資料！`);
              } else if (summary.successful > 0 && summary.failed > 0) {
                toast.warning(`匯入完成：成功 ${summary.successful} 筆，失敗 ${summary.failed} 筆`);
              } else if (summary.failed > 0) {
                toast.error(`匯入失敗：共 ${summary.failed} 筆失敗`);
              }
            } else {
              toast.error('匯入過程發生未知錯誤');
            }

            // 🚀 匯入成功後清除快取並重新載入
            invalidateCache();
            await loadFragrances();

            // 關閉匯入對話框
            setIsImportExportOpen(false);

            // return result; // 不需要回傳結果
          } catch (error) {
            console.error('匯入香精失敗', error);
            const errorMessage = error instanceof Error ? error.message : '匯入過程發生未知錯誤';
            toast.error(`匯入失敗：${errorMessage}`);
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
            pgRatio: 50,
            vgRatio: 50,
            unit: "KG"
          }
        ]}
        fields={[
          { key: "code", label: "香精代號", required: true, type: "string" },
          { key: "name", label: "香精名稱", required: true, type: "string" },
          { key: "fragranceType", label: "香精種類", required: false, type: "string" },
          { key: "fragranceStatus", label: "啟用狀態", required: false, type: "string" },
          { key: "supplierName", label: "供應商", required: false, type: "string" },
          { key: "currentStock", label: "目前庫存", required: false, type: "number" },
          { key: "safetyStockLevel", label: "安全庫存", required: false, type: "number" },
          { key: "costPerUnit", label: "單位成本", required: false, type: "number" },
          { key: "percentage", label: "香精比例%", required: false, type: "number" },
          { key: "pgRatio", label: "PG比例", required: false, type: "number" },
          { key: "vgRatio", label: "VG比例", required: false, type: "number" },
          { key: "unit", label: "單位", required: false, type: "string" }
        ]}
      />
    </div>
  );
}