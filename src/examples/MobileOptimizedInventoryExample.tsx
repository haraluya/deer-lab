// src/examples/MobileOptimizedInventoryExample.tsx
/**
 * 🎯 行動裝置優化庫存頁面範例
 *
 * 建立時間：2025-09-19
 * 目的：展示如何整合所有行動裝置優化功能的完整範例
 */

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Package,
  FlaskConical,
  AlertTriangle,
  RefreshCw,
  Settings,
  Plus,
  Filter,
  Wifi,
  WifiOff
} from 'lucide-react';

// 行動裝置優化 Hooks
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useMobileCacheStrategy } from '@/hooks/useMobileCacheStrategy';
import { useApiOptimization } from '@/hooks/useApiOptimization';
import { usePWAOfflineSupport } from '@/hooks/usePWAOfflineSupport';

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
  MobileLoadingSkeleton
} from '@/components/MobileFriendlyComponents';

// 原有組件
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// 使用已優化的快取系統
import { useInventoryCache } from '@/hooks/useInventoryCache';

// =============================================================================
// 示範資料介面
// =============================================================================

interface InventoryItem {
  id: string;
  name: string;
  code: string;
  type: 'material' | 'fragrance';
  currentStock: number;
  unit: string;
  costPerUnit: number;
  safetyStockLevel: number;
  category: string;
  isLowStock: boolean;
}

// =============================================================================
// 主要組件
// =============================================================================

export default function MobileOptimizedInventoryExample() {
  // 🚀 行動裝置檢測和優化策略
  const {
    isMobile,
    isSlowConnection,
    performanceConfig
  } = useDeviceDetection();

  const { deviceInfo, cacheConfig } = useMobileCacheStrategy();
  const { optimizeApiCall, getMobileApiParams } = useApiOptimization();

  // 🚀 PWA 離線支援
  const {
    isOnline,
    syncStatus,
    addToOfflineQueue,
    canInstall,
    showInstallPrompt
  } = usePWAOfflineSupport();

  // 🚀 使用已優化的庫存快取 (自動支援行動裝置)
  const {
    overview,
    loading: overviewLoading,
    error: overviewError,
    loadOverview,
    isFromCache,
    cacheAge
  } = useInventoryCache();

  // 本地狀態
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'card'>(isMobile ? 'list' : 'card');

  // 模擬庫存資料 (實際應從 API 載入)
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // =============================================================================
  // 初始化和載入
  // =============================================================================

  useEffect(() => {
    loadInventoryData();
    loadOverview();
  }, []);

  const loadInventoryData = async () => {
    try {
      setLoading(true);

      // 🚀 行動裝置 API 優化
      const apiParams = getMobileApiParams('materials');
      console.log('📱 行動裝置 API 參數:', apiParams);

      // 模擬 API 調用延遲
      await new Promise(resolve => setTimeout(resolve, isMobile ? 800 : 500));

      // 模擬庫存資料
      const mockData: InventoryItem[] = [
        {
          id: '1',
          name: '椰子油',
          code: 'M001',
          type: 'material',
          currentStock: 150,
          unit: 'kg',
          costPerUnit: 45,
          safetyStockLevel: 50,
          category: '基底油',
          isLowStock: false
        },
        {
          id: '2',
          name: '薰衣草精油',
          code: 'F001',
          type: 'fragrance',
          currentStock: 25,
          unit: 'ml',
          costPerUnit: 120,
          safetyStockLevel: 30,
          category: '花香調',
          isLowStock: true
        },
        {
          id: '3',
          name: '甜橙精油',
          code: 'F002',
          type: 'fragrance',
          currentStock: 80,
          unit: 'ml',
          costPerUnit: 90,
          safetyStockLevel: 40,
          category: '果香調',
          isLowStock: false
        }
      ];

      setInventoryData(mockData);

      // 🚀 離線快取資料
      if ('cacheData' in window) {
        (window as any).cacheData('inventory_list', mockData, Date.now() + cacheConfig.materialsCache);
      }

    } catch (error) {
      console.error('載入庫存資料失敗:', error);
      toast.error('載入資料失敗');
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // 資料處理和篩選
  // =============================================================================

  const filteredData = useMemo(() => {
    let filtered = inventoryData;

    // 搜尋篩選
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 分類篩選
    switch (activeTab) {
      case 'materials':
        filtered = filtered.filter(item => item.type === 'material');
        break;
      case 'fragrances':
        filtered = filtered.filter(item => item.type === 'fragrance');
        break;
      case 'lowStock':
        filtered = filtered.filter(item => item.isLowStock);
        break;
    }

    return filtered;
  }, [inventoryData, searchTerm, activeTab]);

  // 統計資料
  const stats = useMemo(() => {
    const materials = inventoryData.filter(item => item.type === 'material');
    const fragrances = inventoryData.filter(item => item.type === 'fragrance');
    const lowStock = inventoryData.filter(item => item.isLowStock);
    const totalValue = inventoryData.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0);

    return [
      {
        title: '物料總數',
        value: materials.length,
        icon: <Package className="h-4 w-4" />,
        color: 'text-blue-600'
      },
      {
        title: '香精總數',
        value: fragrances.length,
        icon: <FlaskConical className="h-4 w-4" />,
        color: 'text-purple-600'
      },
      {
        title: '低庫存警告',
        value: lowStock.length,
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'text-red-600'
      },
      {
        title: '總價值',
        value: `$${Math.round(totalValue).toLocaleString()}`,
        icon: <span>💰</span>,
        color: 'text-green-600'
      }
    ];
  }, [inventoryData]);

  // 分頁標籤
  const tabs = [
    { key: 'all', label: '全部', count: inventoryData.length },
    { key: 'materials', label: '物料', count: inventoryData.filter(item => item.type === 'material').length },
    { key: 'fragrances', label: '香精', count: inventoryData.filter(item => item.type === 'fragrance').length },
    { key: 'lowStock', label: '低庫存', count: inventoryData.filter(item => item.isLowStock).length },
  ];

  // =============================================================================
  // 操作處理函數
  // =============================================================================

  const handleItemEdit = (item: InventoryItem) => {
    if (isOnline) {
      toast.info(`編輯 ${item.name}`);
    } else {
      // 離線操作
      addToOfflineQueue('editInventoryItem', { id: item.id, action: 'edit' });
      toast.info('已離線儲存編輯操作，將在連線時同步');
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      loadInventoryData(),
      loadOverview()
    ]);
    toast.success('資料已刷新');
  };

  // =============================================================================
  // 渲染函數
  // =============================================================================

  const renderInventoryItem = (item: InventoryItem, index: number) => {
    const icon = item.type === 'material'
      ? <Package className="h-5 w-5 text-blue-600" />
      : <FlaskConical className="h-5 w-5 text-purple-600" />;

    if (isMobile) {
      return (
        <MobileDataRow
          key={item.id}
          icon={icon}
          title={item.name}
          subtitle={`${item.code} • ${item.category}`}
          value={`${item.currentStock} ${item.unit}`}
          badge={item.isLowStock ? { text: '低庫存', variant: 'destructive' } : undefined}
          actions={[
            {
              icon: <Settings className="h-4 w-4" />,
              label: '編輯',
              onClick: () => handleItemEdit(item)
            }
          ]}
          onClick={() => toast.info(`查看 ${item.name} 詳情`)}
        />
      );
    } else {
      // 桌面版卡片
      return (
        <div key={item.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-500">{item.code}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">{item.currentStock} {item.unit}</p>
              {item.isLowStock && (
                <Badge variant="destructive" className="mt-1">低庫存</Badge>
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  // =============================================================================
  // 主渲染
  // =============================================================================

  return (
    <MobileOptimizedLayout
      title="庫存管理"
      showHeader={isMobile}
      headerActions={
        <div className="flex items-center gap-2">
          {/* 網路狀態指示器 */}
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}

          {/* PWA 安裝提示 */}
          {canInstall && (
            <MobileTouchButton
              variant="outline"
              size="sm"
              onClick={showInstallPrompt}
            >
              <Plus className="h-4 w-4" />
            </MobileTouchButton>
          )}

          <MobileTouchButton
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={loading}
          >
            <RefreshCw className="h-4 w-4" />
          </MobileTouchButton>
        </div>
      }
    >
      {/* 離線狀態提示 */}
      {!isOnline && (
        <Alert className="mx-4 mb-4">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            目前離線模式，資料將在連線時自動同步
            {syncStatus.pendingActions > 0 && ` (待同步: ${syncStatus.pendingActions})`}
          </AlertDescription>
        </Alert>
      )}

      {/* 快取狀態提示 */}
      {isFromCache && isMobile && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="text-xs text-blue-600">
            ⚡ 快取資料 (快取時間: {Math.floor(cacheAge / 1000)}秒前)
            • 裝置: {isMobile ? '行動' : '桌面'}
            • 網路: {isSlowConnection ? '慢速' : '正常'}
          </div>
        </div>
      )}

      {/* 統計卡片 */}
      <MobileStatsGrid stats={stats} />

      {/* 搜尋列 */}
      <MobileSearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        onFilter={() => setShowFilters(!showFilters)}
        placeholder="搜尋庫存項目..."
        filterCount={0}
      />

      {/* 分頁標籤 */}
      <MobileTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* 載入狀態 */}
      {loading && (
        <MobileLoadingSkeleton
          rows={isMobile ? 5 : 8}
          showAvatar={true}
        />
      )}

      {/* 資料列表 */}
      {!loading && (
        isMobile ? (
          <MobileListView
            data={filteredData}
            renderItem={renderInventoryItem}
            onRefresh={handleRefresh}
            refreshing={loading}
            emptyMessage="沒有找到庫存項目"
          />
        ) : (
          <MobileCardLayout
            data={filteredData}
            renderCard={renderInventoryItem}
            emptyMessage="沒有找到庫存項目"
            className="px-6 pb-6"
          />
        )
      )}

      {/* 浮動操作按鈕 (僅行動裝置) */}
      {isMobile && (
        <FloatingActionButton
          icon={<Plus className="h-5 w-5" />}
          onClick={() => toast.info('新增庫存項目')}
          label="新增項目"
          color="blue"
        />
      )}

      {/* 效能資訊 (開發模式) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded max-w-xs">
          <div>裝置: {isMobile ? '行動' : '桌面'}</div>
          <div>網路: {isSlowConnection ? '慢速' : '正常'}</div>
          <div>快取: {cacheConfig.materialsCache / 1000}s</div>
          <div>分頁: {cacheConfig.pageSize} 項目</div>
          {syncStatus.pendingActions > 0 && (
            <div>待同步: {syncStatus.pendingActions}</div>
          )}
        </div>
      )}
    </MobileOptimizedLayout>
  );
}