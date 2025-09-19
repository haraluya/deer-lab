// src/examples/MobileOptimizedMaterialsPage.tsx
/**
 * 🎯 行動裝置優化物料頁面範例
 *
 * 建立時間：2025-09-19
 * 目的：展示完整整合所有行動裝置優化功能的物料管理頁面
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// 行動裝置優化 Hooks
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useMobileCacheStrategy } from '@/hooks/useMobileCacheStrategy';
import { useApiOptimization } from '@/hooks/useApiOptimization';
import { usePWAOfflineSupport } from '@/hooks/usePWAOfflineSupport';
import { useMobilePerformanceMonitor } from '@/hooks/useMobilePerformanceMonitor';
import { useMobileTheme } from '@/styles/mobileTheme';

// 行動裝置優化組件
import {
  MobileOptimizedLayout,
  MobileSearchBar,
  MobileStatsGrid,
  MobileCardLayout,
  MobileListView,
  MobileTabs
} from '@/components/MobileOptimizedLayout';

import {
  MobileTouchButton,
  MobileDataRow,
  FloatingActionButton,
  SwipeableCard,
  MobileLoadingSkeleton
} from '@/components/MobileFriendlyComponents';

// 原有組件和功能
import { StandardDataListPage, StandardColumn, StandardAction, QuickFilter } from '@/components/StandardDataListPage';
import { MaterialData } from '@/types/entities';
import { usePermission } from '@/hooks/usePermission';
import { useApiClient } from '@/hooks/useApiClient';
import { useDataSearch } from '@/hooks/useDataSearch';
import { useMaterialsCache } from '@/hooks/useMaterialsCache';

// Icons
import {
  Package,
  DollarSign,
  AlertTriangle,
  Building,
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  Plus,
  Settings,
  Layers,
  RefreshCw,
  Wifi,
  WifiOff,
  Filter,
  Search
} from 'lucide-react';

// UI Components
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// =============================================================================
// 擴展介面
// =============================================================================

interface MaterialWithSupplier extends MaterialData {
  supplierName: string;
  categoryName: string;
  subCategoryName: string;
  type: 'material';
  isLowStock: boolean;
}

// =============================================================================
// 主要組件
// =============================================================================

export default function MobileOptimizedMaterialsPage() {
  const router = useRouter();

  // 🚀 行動裝置檢測和優化
  const {
    isMobile,
    isTablet,
    isSlowConnection,
    performanceConfig
  } = useDeviceDetection();

  const {
    deviceInfo,
    cacheConfig,
    getNetworkStrategy
  } = useMobileCacheStrategy();

  const {
    optimizeApiCall,
    getMobileApiParams,
    analyzeApiResponse
  } = useApiOptimization();

  const {
    theme,
    colors,
    responsive,
    touchFriendly,
    safeArea,
    mobileOnly,
    desktopOnly,
    hapticFeedback
  } = useMobileTheme();

  // 🚀 PWA 和效能監控
  const {
    isOnline,
    syncStatus,
    addToOfflineQueue,
    canInstall,
    showInstallPrompt
  } = usePWAOfflineSupport();

  const {
    metrics,
    recordCacheHit,
    recordApiCall,
    getOptimizationSuggestions,
    isMonitoring,
    startMonitoring
  } = useMobilePerformanceMonitor();

  // 🚀 使用已優化的快取系統
  const {
    materials,
    loading: isLoading,
    error: materialsError,
    loadMaterials,
    invalidateCache,
    isFromCache,
    cacheAge
  } = useMaterialsCache();

  // 權限和API
  const { hasPermission } = usePermission();
  const canViewMaterials = hasPermission('materials.view') || hasPermission('materials.manage');
  const canManageMaterials = hasPermission('materials.manage');
  const apiClient = useApiClient();

  // 本地狀態
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'card'>(isMobile ? 'list' : 'card');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialData | null>(null);

  // =============================================================================
  // 搜尋和篩選配置
  // =============================================================================

  const searchConfig = {
    searchFields: [
      { key: 'name' as keyof MaterialWithSupplier },
      { key: 'code' as keyof MaterialWithSupplier },
      { key: 'supplierName' as keyof MaterialWithSupplier },
      { key: 'categoryName' as keyof MaterialWithSupplier }
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
    searchTerm: searchQuery,
    setSearchTerm: setSearchQuery,
    activeFilters,
    setFilter,
    clearFilter,
    filteredData: filteredMaterials,
    totalCount,
    filteredCount
  } = useDataSearch(materials, searchConfig);

  // =============================================================================
  // 初始化和載入
  // =============================================================================

  useEffect(() => {
    if (canViewMaterials) {
      loadMaterials();

      // 🚀 開發環境啟動效能監控
      if (process.env.NODE_ENV === 'development' && !isMonitoring) {
        startMonitoring();
      }
    }
  }, [canViewMaterials, loadMaterials, isMonitoring, startMonitoring]);

  // =============================================================================
  // 資料處理和統計
  // =============================================================================

  const processedMaterials = useMemo(() => {
    return filteredMaterials.map(material => ({
      ...material,
      type: 'material' as const,
      isLowStock: (material.currentStock || 0) <= (material.safetyStockLevel || 0),
      supplierName: material.supplierName || '未指定供應商',
      categoryName: material.categoryName || '未分類',
      subCategoryName: material.subCategoryName || ''
    }));
  }, [filteredMaterials]);

  // 根據當前搜尋條件和標籤過濾
  const displayMaterials = useMemo(() => {
    let filtered = processedMaterials;

    // 搜尋過濾
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(material =>
        material.name.toLowerCase().includes(query) ||
        material.code?.toLowerCase().includes(query) ||
        material.supplierName.toLowerCase().includes(query) ||
        material.categoryName.toLowerCase().includes(query)
      );
    }

    // 標籤過濾
    switch (activeTab) {
      case 'lowStock':
        filtered = filtered.filter(material => material.isLowStock);
        break;
      case 'highValue':
        filtered = filtered.filter(material => (material.costPerUnit || 0) > 100);
        break;
      case 'recentlyUpdated':
        // 可以加入最近更新的邏輯
        break;
    }

    return filtered;
  }, [processedMaterials, searchTerm, activeTab]);

  // 統計資料
  const stats = useMemo(() => {
    const totalValue = processedMaterials.reduce(
      (sum, material) => sum + ((material.currentStock || 0) * (material.costPerUnit || 0)),
      0
    );
    const lowStockCount = processedMaterials.filter(material => material.isLowStock).length;
    const categories = new Set(processedMaterials.map(material => material.categoryName)).size;

    return [
      {
        title: '物料總數',
        value: processedMaterials.length,
        icon: <Package className="h-4 w-4" />,
        color: 'text-blue-600'
      },
      {
        title: '低庫存警告',
        value: lowStockCount,
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'text-red-600'
      },
      {
        title: '總價值',
        value: `$${Math.round(totalValue).toLocaleString()}`,
        icon: <DollarSign className="h-4 w-4" />,
        color: 'text-green-600'
      },
      {
        title: '分類數',
        value: categories,
        icon: <Layers className="h-4 w-4" />,
        color: 'text-purple-600'
      }
    ];
  }, [processedMaterials]);

  // 標籤配置
  const tabs = [
    { key: 'all', label: '全部', count: processedMaterials.length },
    { key: 'lowStock', label: '低庫存', count: processedMaterials.filter(m => m.isLowStock).length },
    { key: 'highValue', label: '高價值', count: processedMaterials.filter(m => (m.costPerUnit || 0) > 100).length },
    { key: 'recentlyUpdated', label: '最近更新', count: 0 },
  ];

  // =============================================================================
  // 操作處理函數
  // =============================================================================

  const handleMaterialEdit = useCallback((material: MaterialData) => {
    const startTime = performance.now();

    if (isOnline) {
      toast.info(`編輯物料: ${material.name}`);
      setSelectedMaterial(material);
      // 這裡會開啟編輯對話框

      // 🚀 觸覺回饋
      hapticFeedback('light')();

      // 🚀 效能記錄
      recordApiCall('edit_material', performance.now() - startTime, true);
    } else {
      // 離線操作
      addToOfflineQueue('editMaterial', { id: material.id, action: 'edit' });
      toast.info('已離線儲存編輯操作，將在連線時同步');

      // 🚀 觸覺回饋（稍強）
      hapticFeedback('medium')();
    }
  }, [isOnline, addToOfflineQueue, hapticFeedback, recordApiCall]);

  const handleMaterialDelete = useCallback(async (material: MaterialData) => {
    if (!canManageMaterials) {
      toast.error('無刪除權限');
      return;
    }

    const startTime = performance.now();

    try {
      if (isOnline) {
        // 實際刪除邏輯
        await apiClient.call('deleteMaterial', { id: material.id });

        // 🚀 清除快取
        invalidateCache();

        toast.success(`已刪除物料: ${material.name}`);

        // 🚀 效能記錄
        recordApiCall('delete_material', performance.now() - startTime, true);
      } else {
        // 離線操作
        addToOfflineQueue('deleteMaterial', { id: material.id });
        toast.info('已離線儲存刪除操作，將在連線時同步');
      }

      // 🚀 觸覺回饋
      hapticFeedback('medium')();

    } catch (error) {
      console.error('刪除物料失敗:', error);
      toast.error('刪除失敗');

      // 🚀 效能記錄
      recordApiCall('delete_material', performance.now() - startTime, false);
    }
  }, [canManageMaterials, isOnline, apiClient, invalidateCache, addToOfflineQueue, hapticFeedback, recordApiCall]);

  const handleAddToPurchaseCart = useCallback((material: MaterialData) => {
    const startTime = performance.now();

    toast.info(`已加入採購清單: ${material.name}`);

    // 🚀 觸覺回饋
    hapticFeedback('light')();

    // 🚀 效能記錄
    recordApiCall('add_to_cart', performance.now() - startTime, true);
  }, [hapticFeedback, recordApiCall]);

  const handleRefresh = useCallback(async () => {
    const startTime = performance.now();

    try {
      await loadMaterials();
      toast.success('資料已刷新');

      // 🚀 效能記錄
      recordApiCall('refresh_materials', performance.now() - startTime, true);
    } catch (error) {
      toast.error('刷新失敗');

      // 🚀 效能記錄
      recordApiCall('refresh_materials', performance.now() - startTime, false);
    }
  }, [loadMaterials, recordApiCall]);

  // =============================================================================
  // 渲染函數
  // =============================================================================

  const renderMaterialItem = useCallback((material: MaterialWithSupplier, index: number) => {
    if (isMobile) {
      return (
        <SwipeableCard
          key={material.id}
          leftAction={{
            icon: <ShoppingCart className="h-4 w-4" />,
            label: '採購',
            color: 'bg-green-600'
          }}
          rightAction={{
            icon: <Edit className="h-4 w-4" />,
            label: '編輯',
            color: 'bg-blue-600'
          }}
          onSwipeLeft={() => handleAddToPurchaseCart(material)}
          onSwipeRight={() => handleMaterialEdit(material)}
        >
          <MobileDataRow
            icon={<Package className="h-5 w-5 text-blue-600" />}
            title={material.name}
            subtitle={`${material.code || '無代碼'} • ${material.categoryName}`}
            value={`${material.currentStock || 0} ${material.unit}`}
            badge={material.isLowStock ? { text: '低庫存', variant: 'destructive' } : undefined}
            actions={[
              {
                icon: <ShoppingCart className="h-4 w-4" />,
                label: '加入採購',
                onClick: () => handleAddToPurchaseCart(material)
              },
              {
                icon: <Edit className="h-4 w-4" />,
                label: '編輯',
                onClick: () => handleMaterialEdit(material)
              },
              ...(canManageMaterials ? [{
                icon: <Trash2 className="h-4 w-4" />,
                label: '刪除',
                onClick: () => handleMaterialDelete(material)
              }] : [])
            ]}
            onClick={() => toast.info(`查看 ${material.name} 詳情`)}
            className={touchFriendly('comfortable')}
          />
        </SwipeableCard>
      );
    } else {
      // 桌面版卡片 (保持原有設計)
      return (
        <div key={material.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-semibold">{material.name}</h3>
                <p className="text-sm text-gray-500">{material.code}</p>
                <p className="text-xs text-gray-400">{material.categoryName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">{material.currentStock} {material.unit}</p>
              <p className="text-sm text-gray-500">${material.costPerUnit}</p>
              {material.isLowStock && (
                <Badge variant="destructive" className="mt-1">低庫存</Badge>
              )}
            </div>
          </div>
        </div>
      );
    }
  }, [
    isMobile,
    touchFriendly,
    canManageMaterials,
    handleAddToPurchaseCart,
    handleMaterialEdit,
    handleMaterialDelete
  ]);

  // =============================================================================
  // 權限檢查
  // =============================================================================

  if (!canViewMaterials) {
    return (
      <MobileOptimizedLayout title="物料管理" showHeader={isMobile}>
        <div className="container mx-auto py-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              您沒有權限查看物料頁面。請聯繫系統管理員獲取相關權限。
            </AlertDescription>
          </Alert>
        </div>
      </MobileOptimizedLayout>
    );
  }

  // =============================================================================
  // 主渲染
  // =============================================================================

  return (
    <MobileOptimizedLayout
      title="物料管理"
      showHeader={isMobile}
      headerActions={
        <div className="flex items-center gap-2">
          {/* 網路狀態指示器 */}
          <div className="flex items-center gap-1">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            {isSlowConnection && (
              <Badge variant="outline" className="text-xs">慢速</Badge>
            )}
          </div>

          {/* PWA 安裝提示 */}
          {canInstall && (
            <MobileTouchButton
              variant="outline"
              size="sm"
              onClick={showInstallPrompt}
              hapticFeedback
            >
              <Plus className="h-4 w-4" />
            </MobileTouchButton>
          )}

          <MobileTouchButton
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={isLoading}
            hapticFeedback
          >
            <RefreshCw className="h-4 w-4" />
          </MobileTouchButton>
        </div>
      }
      className={safeArea()}
    >
      {/* 離線狀態提示 */}
      {!isOnline && (
        <Alert className={responsive('mx-4 mb-4', 'mx-0 mb-4')}>
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            目前離線模式，資料將在連線時自動同步
            {syncStatus.pendingActions > 0 && ` (待同步: ${syncStatus.pendingActions})`}
          </AlertDescription>
        </Alert>
      )}

      {/* 快取和效能狀態 */}
      {(isFromCache || metrics) && isMobile && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="text-xs text-blue-600 space-y-1">
            {isFromCache && (
              <div>⚡ 快取資料 (快取時間: {Math.floor(cacheAge / 1000)}秒前)</div>
            )}
            {metrics && (
              <div>
                📊 效能: 載入 {Math.round(metrics.pageLoadTime)}ms
                • 記憶體 {Math.round(metrics.memoryUsage)}MB
                • 快取命中率 {Math.round(metrics.cacheHitRate)}%
              </div>
            )}
            <div>
              🔧 裝置: {deviceInfo.isMobile ? '行動' : '桌面'}
              • 網路: {deviceInfo.isSlowConnection ? '慢速' : '正常'}
              • 快取策略: {Math.round(cacheConfig.materialsCache / 1000)}秒
            </div>
          </div>
        </div>
      )}

      {/* 統計卡片 */}
      <MobileStatsGrid stats={stats} className={mobileOnly('mb-0')} />

      {/* 搜尋列 */}
      <MobileSearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        onFilter={() => setShowFilters(!showFilters)}
        onAdd={canManageMaterials ? () => toast.info('新增物料') : undefined}
        placeholder="搜尋物料名稱、代碼、分類..."
        filterCount={Object.keys(activeFilters).length}
      />

      {/* 分頁標籤 */}
      <MobileTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* 載入狀態 */}
      {isLoading && (
        <MobileLoadingSkeleton
          rows={isMobile ? 6 : 8}
          showAvatar={true}
        />
      )}

      {/* 物料列表 */}
      {!isLoading && (
        isMobile ? (
          <MobileListView
            data={displayMaterials}
            renderItem={renderMaterialItem}
            onRefresh={handleRefresh}
            refreshing={isLoading}
            emptyMessage="沒有找到符合條件的物料"
          />
        ) : (
          <MobileCardLayout
            data={displayMaterials}
            renderCard={renderMaterialItem}
            emptyMessage="沒有找到符合條件的物料"
            className="px-6 pb-6"
          />
        )
      )}

      {/* 浮動操作按鈕 (僅行動裝置且有權限) */}
      {isMobile && canManageMaterials && (
        <FloatingActionButton
          icon={<Plus className="h-5 w-5" />}
          onClick={() => toast.info('新增物料')}
          label="新增物料"
          color="blue"
        />
      )}

      {/* 效能優化建議 (開發模式) */}
      {process.env.NODE_ENV === 'development' && metrics && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-80 text-white text-xs p-3 rounded-lg max-w-xs">
          <div className="font-semibold mb-2">🚀 效能監控</div>
          <div>載入時間: {Math.round(metrics.pageLoadTime)}ms</div>
          <div>記憶體使用: {Math.round(metrics.memoryUsage)}MB</div>
          <div>快取命中率: {Math.round(metrics.cacheHitRate)}%</div>
          {syncStatus.pendingActions > 0 && (
            <div className="text-yellow-300">待同步: {syncStatus.pendingActions}</div>
          )}

          {/* 優化建議 */}
          {getOptimizationSuggestions().length > 0 && (
            <div className="mt-2 text-yellow-300">
              💡 有 {getOptimizationSuggestions().length} 個優化建議
            </div>
          )}
        </div>
      )}
    </MobileOptimizedLayout>
  );
}