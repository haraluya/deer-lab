'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { FragranceData } from './FragranceDialog';
import { usePermission } from '@/hooks/usePermission';
import { useCartOperations } from '@/hooks/useCartOperations';
import { StandardDataListPage, StandardColumn, StandardAction, StandardStats, StandardFilter, QuickFilter } from '@/components/StandardDataListPage';
import { Droplets, DollarSign, AlertTriangle, Building, Eye, Edit, Trash2, ShoppingCart, Plus, Calculator, Package, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { FragranceDialog } from './FragranceDialog';

// 擴展 FragranceData 以包含供應商資訊
interface FragranceWithSupplier extends FragranceData {
  supplierName: string;
  type: 'fragrance';
}

export default function FragrancesPage() {
  const router = useRouter();
  const [fragrances, setFragrances] = useState<FragranceWithSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  // 對話框狀態
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFragrance, setSelectedFragrance] = useState<FragranceData | null>(null);

  // 權限檢查
  const { hasPermission } = usePermission();
  const canViewFragrances = hasPermission('fragrances.view') || hasPermission('fragrances.manage');
  const canManageFragrances = hasPermission('fragrances.manage');

  // 購物車操作
  const { addSingleItem: addToPurchaseCart } = useCartOperations(fragrances, { itemType: 'fragrance' });

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

  // 獲取香精資料
  const fetchFragrances = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!db) {
        console.error("Firebase db 未初始化");
        setIsLoading(false);
        return;
      }
      const suppliersMap = await fetchSuppliers();
      const querySnapshot = await getDocs(collection(db, "fragrances"));
      
      const fragrancesData: FragranceWithSupplier[] = querySnapshot.docs.map((doc) => {
        const data = { id: doc.id, ...doc.data() } as FragranceData;
        return {
          ...data,
          supplierName: data.supplierRef ? suppliersMap.get(data.supplierRef.id) || '未知供應商' : '未指定',
          type: 'fragrance' as const,
          unit: data.unit || 'ml' // 預設單位
        };
      });
      
      setFragrances(fragrancesData);
    } catch (error) {
      console.error("獲取香精資料失敗:", error);
      toast.error("載入香精資料失敗");
    } finally {
      setIsLoading(false);
    }
  }, [fetchSuppliers]);

  // 初始載入
  useEffect(() => {
    if (canViewFragrances) {
      fetchFragrances();
    }
  }, [canViewFragrances, fetchFragrances]);

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
      fetchFragrances();
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
      key: 'code',
      title: '香精編號',
      sortable: true,
      priority: 5,
      render: (value) => (
        <span className="font-mono text-sm font-medium">{value}</span>
      )
    },
    {
      key: 'name',
      title: '香精名稱',
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
      render: (value, record) => {
        const isLowStock = record.safetyStockLevel && value < record.safetyStockLevel;
        return (
          <div className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
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
      key: 'percentage',
      title: '香精比例',
      sortable: true,
      align: 'right',
      priority: 4,
      render: (value) => value ? `${value}%` : '-',
      mobileRender: (value) => (
        <span className="font-semibold text-purple-600">{value ? `${value}%` : '-'}</span>
      )
    },
    {
      key: 'costPerUnit',
      title: '單位成本',
      sortable: true,
      align: 'right',
      priority: 3,
      render: (value) => value ? `$${value.toFixed(2)}` : '-',
      mobileRender: (value) => (
        <span className="font-semibold text-green-600">{value ? `$${value.toFixed(2)}` : '-'}</span>
      )
    },
    {
      key: 'fragranceType',
      title: '香精種類',
      priority: 3,
      render: (value) => value ? (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{value}</Badge>
      ) : '-'
    },
    {
      key: 'fragranceStatus',
      title: '狀態',
      priority: 2,
      render: (value) => {
        const colorMap: Record<string, string> = {
          'active': 'bg-green-50 text-green-700 border-green-200',
          'standby': 'bg-yellow-50 text-yellow-700 border-yellow-200',
          'discontinued': 'bg-red-50 text-red-700 border-red-200'
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
      priority: 2,
      render: (value) => (
        <span className="text-sm">{value}</span>
      )
    },
    {
      key: 'safetyStockLevel',
      title: '安全庫存',
      align: 'right',
      priority: 1,
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

  // 統計資訊
  const stats: StandardStats[] = useMemo(() => {
    const lowStockCount = fragrances.filter(f => 
      f.safetyStockLevel && f.currentStock < f.safetyStockLevel
    ).length;
    const totalValue = fragrances.reduce((sum, f) => 
      sum + ((f.currentStock || 0) * (f.costPerUnit || 0)), 0
    );
    const activeCount = fragrances.filter(f => f.fragranceStatus === 'active').length;

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
        value: `$${totalValue.toFixed(2)}`,
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
        title: '活躍香精',
        value: activeCount,
        subtitle: '正在使用中',
        icon: <Package className="h-4 w-4" />,
        color: 'purple'
      }
    ];
  }, [fragrances]);

  // 快速篩選標籤
  const quickFilters: QuickFilter[] = useMemo(() => {
    const fragranceTypes = Array.from(new Set(fragrances.map(f => f.fragranceType).filter(Boolean))) as string[];
    const fragranceStatuses = Array.from(new Set(fragrances.map(f => f.fragranceStatus).filter(Boolean))) as string[];
    
    return [
      {
        key: 'lowStock',
        label: '低庫存',
        value: true,
        count: fragrances.filter(f => f.safetyStockLevel && f.currentStock < f.safetyStockLevel).length,
        color: 'red'
      },
      {
        key: 'fragranceStatus',
        label: '活躍香精',
        value: 'active',
        count: fragrances.filter(f => f.fragranceStatus === 'active').length,
        color: 'green'
      },
      ...fragranceTypes.slice(0, 3).map(type => ({
        key: 'fragranceType',
        label: type,
        value: type,
        count: fragrances.filter(f => f.fragranceType === type).length,
        color: 'blue' as const
      })),
      ...fragranceStatuses.filter(status => status !== 'active').slice(0, 2).map(status => ({
        key: 'fragranceStatus',
        label: status,
        value: status,
        count: fragrances.filter(f => f.fragranceStatus === status).length,
        color: 'purple' as const
      }))
    ];
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
                <span className="font-semibold text-green-600">${fragrance.costPerUnit.toFixed(2)}</span>
              </div>
            )}
            
            {fragrance.fragranceStatus && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-gray-500">狀態</span>
                </div>
                <Badge variant="outline" className={
                  fragrance.fragranceStatus === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                  fragrance.fragranceStatus === 'standby' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  'bg-red-50 text-red-700 border-red-200'
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
    <>
      <StandardDataListPage
        data={filteredData}
        loading={isLoading}
        columns={columns}
        actions={actions}
        
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
        showAddButton={canManageFragrances}
        addButtonText="新增香精"
        onAdd={handleAdd}
        
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
        
        className="w-full max-w-full overflow-hidden px-2 md:px-4 py-4 md:py-6"
      />

      {/* 新增/編輯對話框 */}
      <FragranceDialog
        isOpen={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedFragrance(null);
        }}
        onFragranceUpdate={() => {
          fetchFragrances();
        }}
        fragranceData={selectedFragrance}
      />
    </>
  );
}