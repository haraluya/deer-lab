'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SupplierData } from './SupplierDialogUnified';
import { usePermission } from '@/hooks/usePermission';
import { StandardDataListPage, StandardColumn, StandardAction, StandardFilter, QuickFilter } from '@/components/StandardDataListPage';
import { StandardStats } from '@/components/StandardStatsCard';
import { Building, User, Phone, Package, Eye, Edit, Trash2, Plus, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { SupplierDialogUnified } from './SupplierDialogUnified';

// 擴展 SupplierData 以包含統計資訊
interface SupplierWithStats extends SupplierData {
  materialsCount?: number;
  fragrancesCount?: number;
  type: 'supplier';
}

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  // 對話框狀態
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierData | null>(null);

  // 權限檢查
  const { hasPermission } = usePermission();
  const canViewSuppliers = hasPermission('suppliers.view') || hasPermission('suppliers.manage');
  const canManageSuppliers = hasPermission('suppliers.manage');

  // 獲取供應商統計資訊
  const fetchSupplierStats = useCallback(async () => {
    const stats = new Map<string, { materialsCount: number; fragrancesCount: number }>();
    
    if (!db) {
      console.error('Firestore 未初始化');
      return stats;
    }
    
    try {
      // 獲取原料統計
      const materialsSnapshot = await getDocs(collection(db, "materials"));
      materialsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.supplierId) {
          const current = stats.get(data.supplierId) || { materialsCount: 0, fragrancesCount: 0 };
          current.materialsCount++;
          stats.set(data.supplierId, current);
        }
      });

      // 獲取香精統計
      const fragrancesSnapshot = await getDocs(collection(db, "fragrances"));
      fragrancesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.supplierRef?.id) {
          const current = stats.get(data.supplierRef.id) || { materialsCount: 0, fragrancesCount: 0 };
          current.fragrancesCount++;
          stats.set(data.supplierRef.id, current);
        }
      });
    } catch (error) {
      console.error("獲取供應商統計失敗:", error);
    }
    
    return stats;
  }, []);

  // 獲取供應商資料
  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!db) {
        console.error("Firebase db 未初始化");
        setIsLoading(false);
        return;
      }
      
      const [suppliersSnapshot, statsMap] = await Promise.all([
        getDocs(collection(db, "suppliers")),
        fetchSupplierStats()
      ]);
      
      const suppliersData: SupplierWithStats[] = suppliersSnapshot.docs.map((doc) => {
        const data = { id: doc.id, ...doc.data() } as SupplierData;
        const stats = statsMap.get(doc.id) || { materialsCount: 0, fragrancesCount: 0 };
        return {
          ...data,
          ...stats,
          type: 'supplier' as const
        };
      });
      
      setSuppliers(suppliersData);
    } catch (error) {
      console.error("獲取供應商資料失敗:", error);
      toast.error("載入供應商資料失敗");
    } finally {
      setIsLoading(false);
    }
  }, [fetchSupplierStats]);

  // 初始載入
  useEffect(() => {
    if (canViewSuppliers) {
      fetchSuppliers();
    }
  }, [canViewSuppliers, fetchSuppliers]);

  // 處理新增
  const handleAdd = () => {
    setSelectedSupplier(null);
    setIsDialogOpen(true);
  };

  // 處理編輯
  const handleEdit = (supplier: SupplierWithStats) => {
    setSelectedSupplier(supplier);
    setIsDialogOpen(true);
  };

  // 處理刪除
  const handleDelete = async (supplier: SupplierWithStats) => {
    if (!canManageSuppliers) {
      toast.error("權限不足");
      return;
    }

    if (!db) {
      toast.error("系統錯誤：資料庫未初始化");
      return;
    }

    // 檢查是否有關聯的原料或香精
    if ((supplier.materialsCount || 0) > 0 || (supplier.fragrancesCount || 0) > 0) {
      toast.error("無法刪除：此供應商仍有關聯的原料或香精");
      return;
    }

    try {
      await deleteDoc(doc(db, "suppliers", supplier.id));
      toast.success("刪除成功");
      fetchSuppliers();
    } catch (error) {
      console.error("刪除失敗:", error);
      toast.error("刪除失敗");
    }
  };

  // 過濾後的資料
  const filteredData = useMemo(() => {
    let result = suppliers;

    // 搜尋過濾
    if (searchValue.trim()) {
      const searchTerm = searchValue.toLowerCase();
      result = result.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm) ||
        (supplier.products && supplier.products.toLowerCase().includes(searchTerm)) ||
        (supplier.contactMethod && supplier.contactMethod.toLowerCase().includes(searchTerm)) ||
        (supplier.liaisonPersonName && supplier.liaisonPersonName.toLowerCase().includes(searchTerm))
      );
    }

    // 篩選器過濾
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        switch (key) {
          case 'hasProducts':
            if (value === 'materials') {
              result = result.filter(item => (item.materialsCount || 0) > 0);
            } else if (value === 'fragrances') {
              result = result.filter(item => (item.fragrancesCount || 0) > 0);
            }
            break;
          case 'hasContact':
            result = result.filter(item => 
              value ? (item.contactMethod || item.liaisonPersonName) : 
              !(item.contactMethod || item.liaisonPersonName)
            );
            break;
        }
      }
    });

    return result;
  }, [suppliers, searchValue, activeFilters]);

  // 定義欄位
  const columns: StandardColumn<SupplierWithStats>[] = [
    {
      key: 'name',
      title: '供應商名稱',
      sortable: true,
      priority: 5,
      render: (value) => (
        <span className="font-semibold">{value}</span>
      )
    },
    {
      key: 'products',
      title: '主要產品',
      priority: 4,
      render: (value) => value ? (
        <span className="text-sm text-gray-600">{value}</span>
      ) : '-'
    },
    {
      key: 'materialsCount',
      title: '原料數量',
      sortable: true,
      align: 'center',
      priority: 3,
      render: (value) => (
        <Badge variant={value > 0 ? "default" : "secondary"} className="font-mono">
          {value || 0}
        </Badge>
      ),
      mobileRender: (value) => (
        <div className="flex items-center gap-1">
          <Package className="h-3 w-3 text-blue-600" />
          <span className="font-semibold text-blue-600">{value || 0}</span>
        </div>
      )
    },
    {
      key: 'fragrancesCount',
      title: '香精數量',
      sortable: true,
      align: 'center',
      priority: 3,
      render: (value) => (
        <Badge variant={value > 0 ? "default" : "secondary"} className="font-mono bg-purple-100 text-purple-800">
          {value || 0}
        </Badge>
      ),
      mobileRender: (value) => (
        <div className="flex items-center gap-1">
          <Package className="h-3 w-3 text-purple-600" />
          <span className="font-semibold text-purple-600">{value || 0}</span>
        </div>
      )
    },
    {
      key: 'contactMethod',
      title: '聯絡方式',
      priority: 2,
      render: (value) => value ? (
        <span className="text-sm">{value}</span>
      ) : '-'
    },
    {
      key: 'liaisonPersonName',
      title: '對接人員',
      priority: 2,
      render: (value) => value ? (
        <div className="flex items-center gap-1">
          <User className="h-3 w-3 text-gray-400" />
          <span className="text-sm">{value}</span>
        </div>
      ) : '-'
    },
    {
      key: 'contactWindow',
      title: '聯絡時間',
      priority: 1,
      hideOnMobile: true,
      render: (value) => value ? (
        <span className="text-sm text-gray-600">{value}</span>
      ) : '-'
    }
  ];

  // 定義操作
  const actions: StandardAction<SupplierWithStats>[] = [
    {
      key: 'view',
      title: '查看',
      icon: <Eye className="h-4 w-4" />,
      onClick: (supplier) => {
        router.push(`/dashboard/suppliers/${supplier.id}`);
      }
    },
    {
      key: 'edit',
      title: '編輯',
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      visible: () => canManageSuppliers
    },
    {
      key: 'delete',
      title: '刪除',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      confirmMessage: '確定要刪除此供應商嗎？此操作無法恢復。',
      onClick: handleDelete,
      visible: (supplier) => canManageSuppliers && (supplier.materialsCount || 0) === 0 && (supplier.fragrancesCount || 0) === 0
    }
  ];

  // 統計資訊
  const stats: StandardStats[] = useMemo(() => {
    const totalMaterials = suppliers.reduce((sum, s) => sum + (s.materialsCount || 0), 0);
    const totalFragrances = suppliers.reduce((sum, s) => sum + (s.fragrancesCount || 0), 0);
    const activeSuppliers = suppliers.filter(s => (s.materialsCount || 0) > 0 || (s.fragrancesCount || 0) > 0).length;
    const hasContactSuppliers = suppliers.filter(s => s.contactMethod || s.liaisonPersonName).length;

    return [
      {
        title: '總供應商數',
        value: suppliers.length,
        subtitle: '所有供應商',
        icon: <Building className="h-4 w-4" />,
        color: 'blue'
      },
      {
        title: '活躍供應商',
        value: activeSuppliers,
        subtitle: '有產品供應',
        icon: <Package className="h-4 w-4" />,
        color: 'green'
      },
      {
        title: '總原料數',
        value: totalMaterials,
        subtitle: '供應的原料',
        icon: <Package className="h-4 w-4" />,
        color: 'orange'
      },
      {
        title: '有聯絡資訊',
        value: hasContactSuppliers,
        subtitle: '完善聯絡方式',
        icon: <Phone className="h-4 w-4" />,
        color: 'purple'
      }
    ];
  }, [suppliers]);

  // 快速篩選標籤
  const quickFilters: QuickFilter[] = useMemo(() => [
    {
      key: 'hasProducts',
      label: '有原料供應',
      value: 'materials',
      count: suppliers.filter(s => (s.materialsCount || 0) > 0).length,
      color: 'blue'
    },
    {
      key: 'hasProducts',
      label: '有香精供應',
      value: 'fragrances',
      count: suppliers.filter(s => (s.fragrancesCount || 0) > 0).length,
      color: 'purple'
    },
    {
      key: 'hasContact',
      label: '有聯絡資訊',
      value: true,
      count: suppliers.filter(s => s.contactMethod || s.liaisonPersonName).length,
      color: 'green'
    }
  ], [suppliers]);

  // 過濾器
  const filters: StandardFilter[] = useMemo(() => [
    {
      key: 'hasProducts',
      title: '產品類型',
      type: 'select',
      options: [
        { 
          label: '有原料供應', 
          value: 'materials', 
          count: suppliers.filter(s => (s.materialsCount || 0) > 0).length 
        },
        { 
          label: '有香精供應', 
          value: 'fragrances', 
          count: suppliers.filter(s => (s.fragrancesCount || 0) > 0).length 
        }
      ],
      placeholder: '選擇產品類型...'
    },
    {
      key: 'hasContact',
      title: '聯絡資訊',
      type: 'select',
      options: [
        { 
          label: '有聯絡資訊', 
          value: true, 
          count: suppliers.filter(s => s.contactMethod || s.liaisonPersonName).length 
        },
        { 
          label: '缺少聯絡資訊', 
          value: false, 
          count: suppliers.filter(s => !s.contactMethod && !s.liaisonPersonName).length 
        }
      ],
      placeholder: '選擇聯絡狀態...'
    }
  ], [suppliers]);

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
  const renderSupplierCard = (supplier: SupplierWithStats, index: number) => {
    const recordKey = supplier.id;
    const isSelected = selectedRows.includes(recordKey);
    const hasProducts = (supplier.materialsCount || 0) > 0 || (supplier.fragrancesCount || 0) > 0;
    const hasContact = supplier.contactMethod || supplier.liaisonPersonName;

    return (
      <Card
        key={recordKey}
        className={`
          ${isSelected ? 'ring-2 ring-orange-300 bg-orange-50 shadow-lg' : 'hover:shadow-md'}
          cursor-pointer transition-all duration-200 relative border-0 shadow-sm
          ${hasProducts ? 'bg-gradient-to-br from-white to-green-50/30' : 'bg-gradient-to-br from-white to-gray-50/50'}
          w-full min-w-0 max-w-full min-h-[140px] overflow-hidden
        `}
        onClick={() => router.push(`/dashboard/suppliers/${supplier.id}`)}
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
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold text-gray-900 leading-tight truncate">
                  {supplier.name}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {hasProducts && (
                    <Badge className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                      活躍供應商
                    </Badge>
                  )}
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
                <DropdownMenuItem onClick={() => router.push(`/dashboard/suppliers/${supplier.id}`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  查看詳細
                </DropdownMenuItem>
                {canManageSuppliers && (
                  <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                    <Edit className="mr-2 h-4 w-4" />
                    編輯
                  </DropdownMenuItem>
                )}
                {canManageSuppliers && (supplier.materialsCount || 0) === 0 && (supplier.fragrancesCount || 0) === 0 && (
                  <DropdownMenuItem onClick={() => handleDelete(supplier)} className="text-red-600">
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
            {supplier.products && (
              <div className="col-span-2">
                <div className="flex items-center gap-1 mb-1">
                  <Package className="h-3 w-3 text-blue-600" />
                  <span className="text-gray-500">主要產品</span>
                </div>
                <span className="font-medium text-gray-700 truncate">{supplier.products}</span>
              </div>
            )}
            
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Package className="h-3 w-3 text-green-600" />
                <span className="text-gray-500">原料數量</span>
              </div>
              <Badge variant={supplier.materialsCount && supplier.materialsCount > 0 ? "default" : "secondary"} className="font-mono text-xs">
                {supplier.materialsCount || 0}
              </Badge>
            </div>
            
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Package className="h-3 w-3 text-purple-600" />
                <span className="text-gray-500">香精數量</span>
              </div>
              <Badge variant={supplier.fragrancesCount && supplier.fragrancesCount > 0 ? "default" : "secondary"} 
                     className="font-mono text-xs bg-purple-100 text-purple-800">
                {supplier.fragrancesCount || 0}
              </Badge>
            </div>
            
            {supplier.contactMethod && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Phone className="h-3 w-3 text-blue-600" />
                  <span className="text-gray-500">聯絡方式</span>
                </div>
                <span className="font-medium text-gray-700 text-xs truncate">{supplier.contactMethod}</span>
              </div>
            )}
            
            {supplier.liaisonPersonName && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <User className="h-3 w-3 text-orange-600" />
                  <span className="text-gray-500">對接人員</span>
                </div>
                <span className="font-medium text-gray-700 truncate">{supplier.liaisonPersonName}</span>
              </div>
            )}
            
            {supplier.contactWindow && (
              <div className="col-span-2">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-gray-500">聯絡時間</span>
                </div>
                <span className="font-medium text-gray-700 text-xs truncate">{supplier.contactWindow}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!canViewSuppliers) {
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            供應商管理
          </h1>
          <p className="text-gray-600 mt-2">管理所有供應商資訊，包括聯絡方式和產品供應情況</p>
        </div>
      </div>

      <StandardDataListPage
        data={filteredData}
        loading={isLoading}
        columns={columns}
        actions={actions}
        
        // 搜尋功能
        searchable={true}
        searchPlaceholder="搜尋供應商名稱、產品、聯絡方式或對接人員..."
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
        showAddButton={canManageSuppliers}
        addButtonText="新增供應商"
        onAdd={handleAdd}
        
        // 權限控制
        permissions={{
          view: canViewSuppliers,
          create: canManageSuppliers,
          edit: canManageSuppliers,
          delete: canManageSuppliers,
          export: canManageSuppliers,
          import: canManageSuppliers
        }}
        
        // 行點擊
        onRowClick={(supplier) => router.push(`/dashboard/suppliers/${supplier.id}`)}
        
        // 使用統一卡片渲染，提高信息密度
        // renderCard={renderSupplierCard}
        
        // 啟用原版相容模式
        legacyMode={true}
        
        className="w-full max-w-full overflow-hidden px-2 md:px-4 py-4 md:py-6"
      />

      {/* 新增/編輯對話框 */}
      <SupplierDialogUnified
        isOpen={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedSupplier(null);
        }}
        onSupplierUpdate={() => {
          fetchSuppliers();
        }}
        supplierData={selectedSupplier}
      />
    </div>
  );
}