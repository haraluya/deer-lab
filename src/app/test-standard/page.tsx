'use client';

import React, { useState, useMemo } from 'react';
import { StandardDataListPage, StandardColumn, StandardAction, StandardStats, StandardFilter, QuickFilter } from '@/components/StandardDataListPage';
import { Package, DollarSign, AlertTriangle, Users, Eye, Edit, Trash2, ShoppingCart } from 'lucide-react';

// 測試資料類型
interface TestItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  supplier: string;
  status: 'active' | 'inactive' | 'low_stock';
  lastUpdated: string;
}

// 生成測試資料
const generateTestData = (): TestItem[] => {
  const categories = ['電子產品', '辦公用品', '食品', '服裝', '家居用品'];
  const suppliers = ['供應商A', '供應商B', '供應商C', '供應商D'];
  const statuses: ('active' | 'inactive' | 'low_stock')[] = ['active', 'inactive', 'low_stock'];
  
  return Array.from({ length: 50 }, (_, index) => ({
    id: `item-${index + 1}`,
    name: `測試商品 ${index + 1}`,
    category: categories[Math.floor(Math.random() * categories.length)],
    stock: Math.floor(Math.random() * 100),
    price: Math.floor(Math.random() * 10000) / 100,
    supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }));
};

const TestStandardPage = () => {
  const [data] = useState<TestItem[]>(generateTestData);
  const [loading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [stocktakeMode, setStocktakeMode] = useState(false);
  const [stocktakeUpdates, setStocktakeUpdates] = useState<Record<string, number>>({});

  // 定義欄位
  const columns: StandardColumn<TestItem>[] = [
    {
      key: 'name',
      title: '商品名稱',
      sortable: true,
      priority: 5, // 最高優先級
      render: (value, record) => (
        <div className="font-medium">{value}</div>
      )
    },
    {
      key: 'category',
      title: '分類',
      filterable: true,
      priority: 3,
      render: (value) => (
        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-sm">{value}</span>
      ),
      mobileRender: (value) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{value}</span>
      )
    },
    {
      key: 'stock',
      title: '庫存',
      sortable: true,
      align: 'right',
      priority: 4, // 高優先級
      render: (value, record) => (
        <div className={`font-medium ${record.status === 'low_stock' ? 'text-red-600' : 'text-gray-900'}`}>
          {value}
        </div>
      ),
      mobileRender: (value, record) => (
        <div className={`font-bold text-base ${record.status === 'low_stock' ? 'text-red-600' : 'text-gray-900'}`}>
          {value} 件
        </div>
      )
    },
    {
      key: 'price',
      title: '價格',
      sortable: true,
      align: 'right',
      priority: 2,
      render: (value) => `$${value.toFixed(2)}`,
      mobileRender: (value) => (
        <span className="font-bold text-green-600 text-base">${value.toFixed(2)}</span>
      )
    },
    {
      key: 'supplier',
      title: '供應商',
      filterable: true,
      priority: 1
    },
    {
      key: 'status',
      title: '狀態',
      priority: 4, // 高優先級
      render: (value) => {
        const statusConfig = {
          active: { label: '正常', className: 'bg-green-100 text-green-800' },
          inactive: { label: '停用', className: 'bg-gray-100 text-gray-800' },
          low_stock: { label: '低庫存', className: 'bg-red-100 text-red-800' }
        };
        const config = statusConfig[value as keyof typeof statusConfig];
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
            {config.label}
          </span>
        );
      },
      mobileRender: (value) => {
        const statusConfig = {
          active: { label: '正常', className: 'bg-green-100 text-green-800', icon: '✅' },
          inactive: { label: '停用', className: 'bg-gray-100 text-gray-800', icon: '⏸️' },
          low_stock: { label: '低庫存', className: 'bg-red-100 text-red-800', icon: '⚠️' }
        };
        const config = statusConfig[value as keyof typeof statusConfig];
        return (
          <div className="flex items-center gap-1">
            <span>{config.icon}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${config.className}`}>
              {config.label}
            </span>
          </div>
        );
      }
    },
    {
      key: 'lastUpdated',
      title: '最後更新',
      priority: 1,
      render: (value) => new Date(value).toLocaleDateString('zh-TW'),
      mobileRender: (value) => (
        <span className="text-xs text-gray-500">{new Date(value).toLocaleDateString('zh-TW')}</span>
      )
    }
  ];

  // 定義操作
  const actions: StandardAction<TestItem>[] = [
    {
      key: 'view',
      title: '查看',
      icon: <Eye className="h-4 w-4" />,
      onClick: (record) => {
        alert(`查看商品: ${record.name}`);
      }
    },
    {
      key: 'edit',
      title: '編輯',
      icon: <Edit className="h-4 w-4" />,
      onClick: (record) => {
        alert(`編輯商品: ${record.name}`);
      }
    },
    {
      key: 'delete',
      title: '刪除',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      confirmMessage: '確定要刪除此商品嗎？',
      onClick: (record) => {
        alert(`刪除商品: ${record.name}`);
      }
    }
  ];

  // 批量操作
  const bulkActions: StandardAction<TestItem[]>[] = [
    {
      key: 'add_to_cart',
      title: '加入購物車',
      icon: <ShoppingCart className="h-4 w-4" />,
      onClick: (records) => {
        alert(`已將 ${records.length} 個商品加入購物車`);
      }
    },
    {
      key: 'batch_delete',
      title: '批量刪除',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      confirmMessage: '確定要刪除選中的商品嗎？',
      onClick: (records) => {
        alert(`批量刪除 ${records.length} 個商品`);
      }
    }
  ];

  // 統計資訊
  const stats: StandardStats[] = useMemo(() => [
    {
      title: '總商品數',
      value: data.length,
      subtitle: '所有商品',
      icon: <Package className="h-4 w-4" />,
      color: 'blue'
    },
    {
      title: '總價值',
      value: `$${data.reduce((sum, item) => sum + item.price * item.stock, 0).toFixed(2)}`,
      subtitle: '庫存總價值',
      icon: <DollarSign className="h-4 w-4" />,
      color: 'green'
    },
    {
      title: '低庫存商品',
      value: data.filter(item => item.status === 'low_stock').length,
      subtitle: '需要補貨',
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'red'
    },
    {
      title: '活躍供應商',
      value: new Set(data.filter(item => item.status === 'active').map(item => item.supplier)).size,
      subtitle: '正在合作中',
      icon: <Users className="h-4 w-4" />,
      color: 'orange'
    }
  ], [data]);

  // 快速篩選標籤
  const quickFilters: QuickFilter[] = useMemo(() => [
    {
      key: 'status',
      label: '正常商品',
      value: 'active',
      count: data.filter(item => item.status === 'active').length,
      color: 'green'
    },
    {
      key: 'status',
      label: '低庫存',
      value: 'low_stock',
      count: data.filter(item => item.status === 'low_stock').length,
      color: 'red'
    },
    {
      key: 'status',
      label: '停用商品',
      value: 'inactive',
      count: data.filter(item => item.status === 'inactive').length,
      color: 'gray'
    },
    {
      key: 'category',
      label: '電子產品',
      value: '電子產品',
      count: data.filter(item => item.category === '電子產品').length,
      color: 'blue'
    },
    {
      key: 'category',
      label: '辦公用品',
      value: '辦公用品',
      count: data.filter(item => item.category === '辦公用品').length,
      color: 'purple'
    },
    {
      key: 'supplier',
      label: '供應商A',
      value: '供應商A',
      count: data.filter(item => item.supplier === '供應商A').length,
      color: 'orange'
    }
  ], [data]);

  // 過濾器
  const filters: StandardFilter[] = [
    {
      key: 'category',
      title: '分類',
      type: 'select',
      options: Array.from(new Set(data.map(item => item.category))).map(category => ({
        label: category,
        value: category,
        count: data.filter(item => item.category === category).length
      })),
      placeholder: '選擇分類...'
    },
    {
      key: 'supplier',
      title: '供應商',
      type: 'select',
      options: Array.from(new Set(data.map(item => item.supplier))).map(supplier => ({
        label: supplier,
        value: supplier,
        count: data.filter(item => item.supplier === supplier).length
      })),
      placeholder: '選擇供應商...'
    },
    {
      key: 'status',
      title: '狀態',
      type: 'select',
      options: [
        { label: '正常', value: 'active', count: data.filter(item => item.status === 'active').length },
        { label: '停用', value: 'inactive', count: data.filter(item => item.status === 'inactive').length },
        { label: '低庫存', value: 'low_stock', count: data.filter(item => item.status === 'low_stock').length }
      ],
      placeholder: '選擇狀態...'
    }
  ];

  // 過濾資料
  const filteredData = useMemo(() => {
    let result = data;

    // 搜尋過濾
    if (searchValue) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        item.category.toLowerCase().includes(searchValue.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    // 篩選器過濾
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(item => (item as any)[key] === value);
      }
    });

    return result;
  }, [data, searchValue, activeFilters]);

  // 處理過濾器變更
  const handleFilterChange = (filterKey: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: value || undefined
    }));
  };

  // 清除所有過濾器
  const handleClearFilters = () => {
    setActiveFilters({});
  };

  return (
    <div className="w-full max-w-full overflow-hidden px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">StandardDataListPage 測試頁面</h1>
        <p className="text-gray-600">展示標準化資料列表頁面的完整功能</p>
      </div>

      <StandardDataListPage
        data={filteredData}
        loading={loading}
        columns={columns}
        actions={actions}
        bulkActions={bulkActions}
        
        // 搜尋功能
        searchable={true}
        searchPlaceholder="搜尋商品名稱、分類或供應商..."
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
        onImport={() => alert('匯入功能')}
        onExport={() => alert('匯出功能')}
        
        // 新增功能
        showAddButton={true}
        addButtonText="新增商品"
        onAdd={() => alert('新增商品')}
        
        // 視圖模式
        viewModes={[
          { key: 'table', title: '表格', icon: <Package className="h-4 w-4" /> },
          { key: 'card', title: '卡片', icon: <Package className="h-4 w-4" /> },
          { key: 'grid', title: '網格', icon: <Package className="h-4 w-4" /> }
        ]}
        defaultViewMode="table"
        
        // 盤點模式
        stocktakeMode={stocktakeMode}
        onStocktakeModeChange={setStocktakeMode}
        stocktakeUpdates={stocktakeUpdates}
        onStocktakeUpdateChange={setStocktakeUpdates}
        onStocktakeSave={() => {
          console.log('保存盤點結果:', stocktakeUpdates);
          alert(`已保存 ${Object.keys(stocktakeUpdates).length} 項盤點結果`);
          setStocktakeUpdates({});
          setStocktakeMode(false);
        }}
        
        // 權限控制
        permissions={{
          view: true,
          create: true,
          edit: true,
          delete: true,
          export: true,
          import: true
        }}
        
        // 行點擊
        onRowClick={(record) => console.log('點擊行:', record)}
        onRowDoubleClick={(record) => alert(`雙擊商品: ${record.name}`)}
        
        className="w-full max-w-full overflow-hidden px-2 md:px-4 py-4 md:py-6"
      />
    </div>
  );
};

export default TestStandardPage;