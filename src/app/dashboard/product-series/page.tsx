'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useApiForm } from '@/hooks/useApiClient';
import { useDataSearch } from '@/hooks/useDataSearch';
import { getProductTypeColor, extractProductTypeCode } from '@/lib/utils';

import { SeriesDialog, SeriesData } from './SeriesDialog';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { MoreHorizontal, Plus, Eye, Edit, Trash2, Tag, Calendar, Package, ArrowLeft, Box, Hash, Layers, Boxes } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StandardDataListPage, StandardColumn, StandardAction, QuickFilter } from '@/components/StandardDataListPage';
import { StandardStats } from '@/components/StandardStatsCard';

interface SeriesWithMaterials extends SeriesData {
  materialNames: string[];
  productCount: number;
}

function ProductSeriesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiClient = useApiForm();
  const [series, setSeries] = useState<SeriesWithMaterials[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<SeriesData | null>(null);

  // 使用統一的搜尋過濾 Hook
  const searchConfig = {
    searchFields: [
      { key: 'name' as keyof SeriesWithMaterials },
      { key: 'code' as keyof SeriesWithMaterials },
      { key: 'productType' as keyof SeriesWithMaterials }
    ],
    filterConfigs: [
      {
        key: 'productType' as keyof SeriesWithMaterials,
        type: 'set' as const
      }
    ]
  };

  const {
    searchTerm,
    setSearchTerm,
    activeFilters,
    setFilter,
    clearFilter,
    filteredData: filteredSeries,
    totalCount,
    filteredCount
  } = useDataSearch(series, searchConfig);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      
      const materialsMap = new Map<string, string>();
      const materialSnapshot = await getDocs(collection(db, "materials"));
      materialSnapshot.forEach(doc => materialsMap.set(doc.id, doc.data().name));

      const seriesSnapshot = await getDocs(collection(db, 'productSeries'));
      const productsSnapshot = await getDocs(collection(db, 'products'));
      
      const seriesList = await Promise.all(seriesSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const materialRefs = data.commonMaterials as DocumentReference[] || [];
        const materialNames = materialRefs.map(ref => materialsMap.get(ref.id) || '未知物料');
        
        // 計算該系列下的產品數量
        const seriesProducts = productsSnapshot.docs.filter(productDoc => {
          const productData = productDoc.data();
          return productData.seriesRef?.id === doc.id;
        });
        
        return {
          id: doc.id,
          name: data.name,
          code: data.code || data.typeCode,
          typeCode: data.typeCode || data.code,
          productType: data.productType || '其他(ETC)',
          commonMaterials: data.commonMaterials,
          materialNames,
          productCount: seriesProducts.length,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as SeriesWithMaterials;
      }));
      
      // 先按產品類型排序，再按系列名稱排序
      const sortedSeriesList = seriesList.sort((a, b) => {
        const typeCodeA = extractProductTypeCode(a.productType || '');
        const typeCodeB = extractProductTypeCode(b.productType || '');

        // 先比較產品類型代碼
        if (typeCodeA !== typeCodeB) {
          return typeCodeA.localeCompare(typeCodeB);
        }

        // 同類型的，再按系列名稱排序
        return (a.name || '').localeCompare(b.name || '', 'zh-TW');
      });
      setSeries(sortedSeriesList);
    } catch (error) {
      console.error("讀取產品系列資料失敗:", error);
      toast.error("讀取產品系列資料失敗。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 處理 URL 查詢參數
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && series.length > 0) {
      const seriesToEdit = series.find(s => s.id === editId);
      if (seriesToEdit) {
        setSelectedSeries(seriesToEdit);
        setIsDialogOpen(true);
        // 清除 URL 中的 edit 參數
        router.replace('/dashboard/product-series');
      }
    }
  }, [searchParams, series, router]);

  // 配置欄位
  const columns: StandardColumn<SeriesWithMaterials>[] = [
    {
      key: 'name',
      title: '系列資訊',
      sortable: true,
      searchable: true,
      priority: 5,
      render: (value, record) => {
        const typeColor = getProductTypeColor(record.productType);
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-r ${typeColor.gradient} rounded-lg flex items-center justify-center`}>
              <Tag className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-foreground">{record.name}</div>
              <div className={`text-xs font-medium ${typeColor.text}`}>{record.code}</div>
            </div>
          </div>
        );
      },
      mobileRender: (value, record) => {
        const typeColor = getProductTypeColor(record.productType);
        return (
          <div>
            <div className="font-medium text-gray-900">{record.name}</div>
            <div className={`text-xs font-medium ${typeColor.text}`}>{record.code}</div>
          </div>
        );
      }
    },
    {
      key: 'productType',
      title: '產品類型',
      sortable: true,
      filterable: true,
      priority: 4,
      render: (value) => {
        const typeColor = getProductTypeColor(value);
        return (
          <Badge variant="outline" className={`${typeColor.bg} ${typeColor.text} ${typeColor.border}`}>
            {value}
          </Badge>
        );
      }
    },
    {
      key: 'productCount',
      title: '產品數量',
      sortable: true,
      priority: 3,
      align: 'center',
      render: (value) => (
        <div className="flex items-center justify-center gap-1">
          <Package className="h-4 w-4 text-emerald-600" />
          <span className="font-medium text-foreground">{value}</span>
        </div>
      )
    },
    {
      key: 'materialNames',
      title: '常用物料',
      priority: 2,
      hideOnMobile: true,
      render: (value: string[]) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {value.slice(0, 3).map((material, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="text-xs bg-gray-100 text-gray-700"
            >
              {material}
            </Badge>
          ))}
          {value.length > 3 && (
            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
              +{value.length - 3}
            </Badge>
          )}
        </div>
      ),
      mobileRender: (value: string[]) => (
        <span className="text-sm text-gray-600">
          {value.length > 0 ? `${value.length} 項物料` : '無常用物料'}
        </span>
      )
    }
  ];

  // 配置操作
  const actions: StandardAction<SeriesWithMaterials>[] = [
    {
      key: 'view',
      title: '查看詳細',
      icon: <Eye className="h-4 w-4" />,
      onClick: (record) => router.push(`/dashboard/product-series/${record.id}`)
    },
    {
      key: 'edit',
      title: '編輯系列',
      icon: <Edit className="h-4 w-4" />,
      onClick: (record) => {
        setSelectedSeries(record);
        setIsDialogOpen(true);
      }
    },
    {
      key: 'delete',
      title: '刪除系列',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive' as const,
      confirmMessage: '確定要刪除此系列嗎？此操作無法復原。',
      onClick: (record) => {
        setSelectedSeries(record);
        setIsConfirmOpen(true);
      }
    }
  ];

  // 配置快速篩選
  const quickFilters: QuickFilter[] = [
    ...Array.from(new Set(series.map(s => s.productType)))
      .sort((a, b) => {
        // 先按產品類型代碼排序
        const codeA = extractProductTypeCode(a);
        const codeB = extractProductTypeCode(b);
        return codeA.localeCompare(codeB);
      })
      .map(productType => {
        const typeColor = getProductTypeColor(productType);
        return {
          key: 'productType',
          label: productType,
          value: productType,
          color: typeColor.badgeColor,
          count: series.filter(s => s.productType === productType).length
        };
      })
  ];

  // 配置統計資料
  const stats: StandardStats[] = [
    {
      title: '總系列數',
      value: series.length,
      subtitle: '所有產品系列',
      icon: <Tag className="h-4 w-4" />,
      color: 'green'
    },
    {
      title: '產品類型',
      value: new Set(series.map(s => s.productType)).size,
      subtitle: '不同類型',
      icon: <Layers className="h-4 w-4" />,
      color: 'blue'
    },
    {
      title: '總產品數',
      value: series.reduce((sum, s) => sum + s.productCount, 0),
      subtitle: '所有系列產品',
      icon: <Package className="h-4 w-4" />,
      color: 'purple'
    },
    {
      title: '平均產品數',
      value: series.length > 0 ? Math.round(series.reduce((sum, s) => sum + s.productCount, 0) / series.length) : 0,
      subtitle: '每個系列平均',
      icon: <Boxes className="h-4 w-4" />,
      color: 'orange'
    }
  ];

  // 操作處理函式
  const handleAdd = () => {
    setSelectedSeries(null);
    setIsDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedSeries) return;
    const toastId = toast.loading("正在刪除系列...");
    try {
      const result = await apiClient.call('deleteProductSeries', { id: selectedSeries.id });
      if (result.success) {
        toast.success(`系列 ${selectedSeries.name} 已成功刪除。`, { id: toastId });
        loadData();
      }
    } catch (error) {
      console.error("刪除系列失敗:", error);
      let errorMessage = "刪除系列時發生錯誤。";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsConfirmOpen(false);
      setSelectedSeries(null);
    }
  };

  return (
    <div className="container mx-auto py-10">
      {/* 頁面標題區域 */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.push('/dashboard/products')}
          className="hover:bg-emerald-100 hover:border-emerald-300"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-grow">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            產品系列管理
          </h1>
          <p className="text-gray-600 mt-2">管理產品系列與常用物料配置</p>
        </div>
      </div>

      <StandardDataListPage
        data={filteredSeries}
        loading={isLoading}
        columns={columns}
        actions={actions}
        onRowClick={(record) => router.push(`/dashboard/product-series/${record.id}`)}
        
        // 搜尋與過濾
        searchable={true}
        searchPlaceholder="搜尋系列名稱、代號或類型..."
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
        
        // 統計資訊
        stats={stats}
        showStats={true}
        
        // 工具列功能
        showToolbar={true}
        
        // 新增功能
        showAddButton={true}
        addButtonText="新增系列"
        onAdd={handleAdd}
        
        // 自定義卡片渲染以提高資訊密度
        renderCard={(record, index) => {
          const isSelected = false; // 暫時不支援選擇
          const typeColor = getProductTypeColor(record.productType);

          return (
            <div
              className={`
                bg-gradient-to-br from-white ${typeColor.bg}/30 border ${typeColor.border}
                rounded-lg p-3 hover:shadow-md transition-all duration-200 cursor-pointer
                hover:border-${typeColor.border} hover:${typeColor.bg}/50
                min-h-[120px] flex flex-col justify-between
              `}
              onClick={() => router.push(`/dashboard/product-series/${record.id}`)}
            >
              {/* 頂部：主要資訊 */}
              <div className="space-y-2">
                {/* 標題行 */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-8 h-8 bg-gradient-to-br ${typeColor.gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Tag className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                        {record.name}
                      </h3>
                      <p className={`text-xs ${typeColor.text} font-medium truncate`}>
                        {record.code}
                      </p>
                    </div>
                  </div>

                  {/* 操作菜單 */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 w-6 p-0 hover:${typeColor.bg}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        // 可以添加快速操作菜單
                      }}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* 關鍵信息標籤 */}
                <div className="flex flex-wrap gap-1">
                  <Badge
                    variant="outline"
                    className={`${typeColor.bg} ${typeColor.text} ${typeColor.border} text-xs px-2 py-0.5`}
                  >
                    {record.productType}
                  </Badge>
                  <div className="flex items-center gap-1 bg-gray-50 rounded px-2 py-0.5">
                    <Package className="h-3 w-3 text-gray-500" />
                    <span className="text-xs font-medium text-gray-700">
                      {record.productCount} 產品
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-orange-50 rounded px-2 py-0.5">
                    <Box className="h-3 w-3 text-orange-500" />
                    <span className="text-xs font-medium text-orange-700">
                      {record.materialNames.length} 物料
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 底部：常用物料預覽 */}
              {record.materialNames.length > 0 && (
                <div className="border-t border-emerald-100 pt-2 mt-2">
                  <div className="flex flex-wrap gap-1">
                    {record.materialNames.slice(0, 2).map((material, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 max-w-20 truncate"
                        title={material}
                      >
                        {material}
                      </Badge>
                    ))}
                    {record.materialNames.length > 2 && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5"
                      >
                        +{record.materialNames.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        }}
        
        className="space-y-6"
      />

      <SeriesDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSeriesUpdate={loadData}
        seriesData={selectedSeries}
      />

      {selectedSeries && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmDelete}
          title={`確認刪除系列`}
          description={`您確定要永久刪除系列「${selectedSeries.name}」嗎？此操作無法復原。`}
        />
      )}
    </div>
  );
}

export default function ProductSeriesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductSeriesPageContent />
    </Suspense>
  );
}