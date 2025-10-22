// src/app/dashboard/product-types/page.tsx
'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useApiForm } from '@/hooks/useApiClient';
import { useDataSearch } from '@/hooks/useDataSearch';

import { ProductTypeDialog, ProductTypeData } from './ProductTypeDialog';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Plus, Edit, Trash2, Layers, Hash } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StandardDataListPage, StandardColumn, StandardAction } from '@/components/StandardDataListPage';
import { StandardStats } from '@/components/StandardStatsCard';
import { getColorOption } from '@/components/ui/color-picker';

interface ProductTypeWithCount extends ProductTypeData {
  seriesCount: number;
}

function ProductTypesPageContent() {
  const router = useRouter();
  const apiClient = useApiForm();
  const [types, setTypes] = useState<ProductTypeWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ProductTypeData | null>(null);

  // 使用統一的搜尋過濾 Hook
  const searchConfig = {
    searchFields: [
      { key: 'name' as keyof ProductTypeWithCount },
      { key: 'code' as keyof ProductTypeWithCount }
    ],
    filterConfigs: []
  };

  const {
    searchTerm,
    setSearchTerm,
    filteredData: filteredTypes,
  } = useDataSearch(types, searchConfig);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }

      const typesSnapshot = await getDocs(collection(db, 'productTypes'));
      const seriesSnapshot = await getDocs(collection(db, 'productSeries'));

      const typesList = await Promise.all(typesSnapshot.docs.map(async (doc) => {
        const data = doc.data();

        // 計算該類型下的系列數量
        const typeSeries = seriesSnapshot.docs.filter(seriesDoc => {
          const seriesData = seriesDoc.data();
          const seriesProductType = seriesData.productType || '';
          const typeFullName = `${data.name}(${data.code})`;
          return seriesProductType === typeFullName;
        });

        return {
          id: doc.id,
          name: data.name,
          code: data.code,
          color: data.color || 'gray',
          description: data.description || '',
          isActive: data.isActive !== false,
          seriesCount: typeSeries.length,
        } as ProductTypeWithCount;
      }));

      // 按名稱排序
      const sortedTypesList = typesList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-TW'));
      setTypes(sortedTypesList);
    } catch (error) {
      console.error("讀取產品類型資料失敗:", error);
      toast.error("讀取產品類型資料失敗。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 配置欄位
  const columns: StandardColumn<ProductTypeWithCount>[] = [
    {
      key: 'name',
      title: '類型資訊',
      sortable: true,
      searchable: true,
      priority: 5,
      render: (value, record) => {
        const colorOption = getColorOption(record.color);
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${colorOption.bgClass} rounded-lg flex items-center justify-center border-2 ${colorOption.borderClass}`}>
              <Layers className={`h-5 w-5 ${colorOption.textClass}`} />
            </div>
            <div>
              <div className="font-semibold text-foreground">{record.name}</div>
              <div className={`text-xs font-medium ${colorOption.textClass}`}>{record.code}</div>
            </div>
          </div>
        );
      },
      mobileRender: (value, record) => {
        const colorOption = getColorOption(record.color);
        return (
          <div>
            <div className="font-medium text-gray-900">{record.name}</div>
            <div className={`text-xs font-medium ${colorOption.textClass}`}>{record.code}</div>
          </div>
        );
      }
    },
    {
      key: 'description',
      title: '描述',
      priority: 3,
      hideOnMobile: true,
      render: (value) => (
        <span className="text-sm text-gray-600">{value || '無描述'}</span>
      )
    },
    {
      key: 'seriesCount',
      title: '系列數量',
      sortable: true,
      priority: 4,
      align: 'center',
      render: (value) => (
        <div className="flex items-center justify-center gap-1">
          <Hash className="h-4 w-4 text-indigo-600" />
          <span className="font-medium text-foreground">{value}</span>
        </div>
      )
    },
    {
      key: 'color',
      title: '顏色',
      priority: 2,
      align: 'center',
      hideOnMobile: true,
      render: (value) => {
        const colorOption = getColorOption(value);
        return (
          <div className="flex items-center justify-center gap-2">
            <div className={`w-6 h-6 rounded border-2 ${colorOption.bgClass} ${colorOption.borderClass}`}></div>
            <span className="text-xs text-gray-600">{colorOption.name}</span>
          </div>
        );
      }
    }
  ];

  // 配置操作
  const actions: StandardAction<ProductTypeWithCount>[] = [
    {
      key: 'edit',
      title: '編輯類型',
      icon: <Edit className="h-4 w-4" />,
      onClick: (record) => {
        setSelectedType(record);
        setIsDialogOpen(true);
      }
    },
    {
      key: 'delete',
      title: '刪除類型',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive' as const,
      confirmMessage: '確定要刪除此產品類型嗎？此操作無法復原。',
      onClick: (record) => {
        setSelectedType(record);
        setIsConfirmOpen(true);
      }
    }
  ];

  // 配置統計資料
  const stats: StandardStats[] = [
    {
      title: '總類型數',
      value: types.length,
      subtitle: '所有產品類型',
      icon: <Layers className="h-4 w-4" />,
      color: 'blue'
    },
    {
      title: '總系列數',
      value: types.reduce((sum, t) => sum + t.seriesCount, 0),
      subtitle: '所有類型的系列',
      icon: <Hash className="h-4 w-4" />,
      color: 'purple'
    }
  ];

  // 操作處理函式
  const handleAdd = () => {
    setSelectedType(null);
    setIsDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedType) return;
    const toastId = toast.loading("正在刪除產品類型...");
    try {
      const result = await apiClient.call('deleteProductType', { id: selectedType.id });
      if (result.success) {
        toast.success(`產品類型 ${selectedType.name} 已成功刪除。`, { id: toastId });
        loadData();
      }
    } catch (error) {
      console.error("刪除產品類型失敗:", error);
      let errorMessage = "刪除產品類型時發生錯誤。";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsConfirmOpen(false);
      setSelectedType(null);
    }
  };

  return (
    <div className="container mx-auto py-10">
      {/* 頁面標題區域 */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-grow">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            產品類型管理
          </h1>
          <p className="text-gray-600 mt-2">管理產品類型與顯示顏色配置</p>
        </div>
      </div>

      <StandardDataListPage
        data={filteredTypes}
        loading={isLoading}
        columns={columns}
        actions={actions}

        // 搜尋與過濾
        searchable={true}
        searchPlaceholder="搜尋類型名稱或代號..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}

        // 統計資訊
        stats={stats}
        showStats={true}

        // 工具列功能
        showToolbar={true}

        // 新增功能
        showAddButton={true}
        addButtonText="新增類型"
        onAdd={handleAdd}

        className="space-y-6"
      />

      <ProductTypeDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onTypeUpdate={loadData}
        typeData={selectedType}
      />

      {selectedType && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmDelete}
          title={`確認刪除產品類型`}
          description={`您確定要永久刪除產品類型「${selectedType.name}」嗎？此操作無法復原。`}
        />
      )}
    </div>
  );
}

export default function ProductTypesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductTypesPageContent />
    </Suspense>
  );
}
