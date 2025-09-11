'use client';

import React, { useState, useEffect, ReactNode, useMemo } from 'react';
import { Search, Filter, Plus, Download, Upload, MoreHorizontal, Eye, Edit, Trash2, ShoppingCart, ListChecks, Save, X, Loader2, Package, AlertTriangle, Settings, Grid3X3, List, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// =============================================================================
// 核心類型定義
// =============================================================================

export interface StandardColumn<T = any> {
  key: string;
  title: string;
  width?: string | number;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  render?: (value: any, record: T, index: number) => ReactNode;
  mobileRender?: (value: any, record: T, index: number) => ReactNode;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
  priority?: number; // 響應式優先級 (1-5, 5最重要)
  hideOnMobile?: boolean;
  className?: string;
  headerClassName?: string; // 表頭列樣式
  cellClassName?: string;   // 儲存格樣式
}

export interface StandardAction<T = any> {
  key: string;
  title: string;
  icon?: ReactNode;
  onClick: (record: T, index: number) => void;
  visible?: (record: T) => boolean;
  disabled?: (record: T) => boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  className?: string;
  confirmMessage?: string;
}

export interface StandardFilter {
  key: string;
  title: string;
  type: 'select' | 'multiSelect' | 'dateRange' | 'numberRange' | 'boolean' | 'search';
  options?: Array<{ label: string; value: string | number | boolean; count?: number }>;
  placeholder?: string;
  defaultValue?: any;
}

export interface QuickFilter {
  key: string;
  label: string;
  value: any;
  count?: number;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'gray';
}

export interface StandardViewMode {
  key: 'table' | 'card' | 'grid';
  title: string;
  icon: ReactNode;
  responsive?: boolean;
}

export interface StandardStats {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
  trend?: {
    direction: 'up' | 'down' | 'stable';
    value: string;
  };
  onClick?: () => void;
}

// 新增：表格樣式組態接口
export interface TableStyleConfig {
  headerStyle?: 'default' | 'gradient' | 'solid' | 'minimal';
  headerClassName?: string;
  rowStyle?: 'default' | 'striped' | 'bordered' | 'minimal';
  rowClassName?: string;
  hoverEffect?: boolean;
  compactMode?: boolean;
  roundedCorners?: boolean;
  shadowLevel?: 'none' | 'sm' | 'md' | 'lg';
}

// 新增：卡片樣式組態接口
export interface CardStyleConfig {
  cardStyle?: 'default' | 'flat' | 'elevated' | 'outlined';
  cardClassName?: string;
  layout?: 'vertical' | 'horizontal' | 'compact';
  spacing?: 'tight' | 'normal' | 'loose';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg';
  showDividers?: boolean;
}

export interface StandardDataListPageProps<T = any> {
  // 資料相關
  data: T[];
  loading?: boolean;
  error?: string | Error;
  columns: StandardColumn<T>[];
  
  // 操作相關
  actions?: StandardAction<T>[];
  bulkActions?: StandardAction<T[]>[];
  onRowClick?: (record: T, index: number) => void;
  onRowDoubleClick?: (record: T, index: number) => void;
  
  // 搜尋與過濾
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: StandardFilter[];
  activeFilters?: Record<string, any>;
  onFilterChange?: (filterKey: string, value: any) => void;
  onClearFilters?: () => void;
  
  // 快速篩選標籤
  quickFilters?: QuickFilter[];
  showQuickFilters?: boolean;
  
  // 選擇功能
  selectable?: boolean;
  selectedRows?: string[] | number[];
  onSelectionChange?: (selectedRowKeys: string[] | number[]) => void;
  rowKey?: string | ((record: T) => string | number);
  
  // 視圖模式
  viewModes?: StandardViewMode[];
  defaultViewMode?: 'table' | 'card' | 'grid';
  onViewModeChange?: (mode: 'table' | 'card' | 'grid') => void;
  
  // 統計資訊
  stats?: StandardStats[];
  showStats?: boolean;
  
  // 工具列功能
  showToolbar?: boolean;
  toolbarActions?: ReactNode;
  showImportExport?: boolean;
  onImport?: () => void;
  onExport?: () => void;
  
  // 新增功能
  showAddButton?: boolean;
  addButtonText?: string;
  onAdd?: () => void;
  
  // 分頁
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    onChange?: (page: number, pageSize: number) => void;
  };
  
  // 排序
  sortable?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  
  // 自定義渲染
  renderCard?: (record: T, index: number) => ReactNode;
  renderGridItem?: (record: T, index: number) => ReactNode;
  renderEmptyState?: () => ReactNode;
  renderToolbarExtra?: () => ReactNode;
  
  // 樣式設定
  className?: string;
  tableClassName?: string;
  cardClassName?: string;
  height?: string | number;
  
  // 新增：進階樣式組態
  tableStyle?: TableStyleConfig;
  cardStyle?: CardStyleConfig;
  
  // 新增：原版相容模式
  legacyMode?: boolean; // 是否使用原版樣式
  
  // 權限控制
  permissions?: {
    view?: boolean;
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
    export?: boolean;
    import?: boolean;
  };
  
  // 特殊模式
  stocktakeMode?: boolean;
  onStocktakeModeChange?: (enabled: boolean) => void;
  stocktakeUpdates?: Record<string, number>;
  onStocktakeUpdateChange?: (updates: Record<string, number>) => void;
  onStocktakeSave?: () => void;
  
  // 響應式設定
  responsive?: {
    breakpoints?: {
      xs?: number;
      sm?: number;
      md?: number;
      lg?: number;
      xl?: number;
    };
    mobileFirst?: boolean;
  };
}

// =============================================================================
// 工具函數
// =============================================================================

const getRowKey = <T,>(record: T, index: number, rowKey?: string | ((record: T) => string | number)): string | number => {
  if (typeof rowKey === 'function') {
    return rowKey(record);
  }
  if (typeof rowKey === 'string' && record && typeof record === 'object') {
    return (record as any)[rowKey];
  }
  return index;
};

const getColorClasses = (color?: string) => {
  const colorMap = {
    blue: 'from-blue-500 to-blue-600 text-white',
    green: 'from-green-500 to-green-600 text-white',
    yellow: 'from-yellow-500 to-yellow-600 text-white',
    red: 'from-red-500 to-red-600 text-white',
    purple: 'from-purple-500 to-purple-600 text-white',
    orange: 'from-orange-500 to-orange-600 text-white',
  };
  return colorMap[color as keyof typeof colorMap] || 'from-gray-500 to-gray-600 text-white';
};

// =============================================================================
// 子組件
// =============================================================================

interface StatsCardsProps {
  stats: StandardStats[];
}

interface StatsCardsPropsWithMobile extends StatsCardsProps {
  isMobile?: boolean;
}

const StatsCards: React.FC<StatsCardsPropsWithMobile> = ({ stats, isMobile = false }) => {
  return (
    <div className={`grid gap-3 mb-4 ${
      isMobile 
        ? 'grid-cols-2 px-2' // 手機版：2欄 + 側邊距
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6'
    }`}>
      {stats.map((stat, index) => (
        <Card 
          key={index} 
          className={`
            relative overflow-hidden transition-all 
            ${stat.onClick ? 'cursor-pointer' : ''}
            ${isMobile 
              ? 'shadow-sm hover:shadow-md min-h-[100px] max-w-full' // 手機版：緊湊尺寸
              : 'shadow-sm hover:shadow-lg hover:scale-[1.02]'
            }
          `}
          onClick={stat.onClick}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${getColorClasses(stat.color)} opacity-10`} />
          <CardHeader className={`flex flex-row items-center justify-between space-y-0 relative z-10 ${
            isMobile ? 'pb-1 pt-2 px-3' : 'pb-2 pt-4 px-6'
          }`}>
            <CardTitle className={`font-medium text-muted-foreground leading-tight ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              {stat.title}
            </CardTitle>
            {stat.icon && (
              <div className={`text-muted-foreground flex-shrink-0 ${
                isMobile ? 'text-sm' : 'text-base'
              }`}>
                {stat.icon}
              </div>
            )}
          </CardHeader>
          <CardContent className={`relative z-10 ${
            isMobile ? 'pt-0 pb-2 px-3' : 'pt-0 pb-4 px-6'
          }`}>
            <div className={`font-bold mb-1 leading-tight ${
              isMobile ? 'text-2xl' : 'text-2xl' // 手機版字體更大
            }`}>
              {stat.value}
            </div>
            {stat.subtitle && (
              <p className={`text-muted-foreground leading-tight ${
                isMobile ? 'text-xs' : 'text-xs'
              }`}>
                {stat.subtitle}
              </p>
            )}
            {stat.trend && (
              <div className={`flex items-center mt-1 ${
                stat.trend.direction === 'up' 
                  ? 'text-green-600' 
                  : stat.trend.direction === 'down' 
                    ? 'text-red-600' 
                    : 'text-gray-600'
              } ${isMobile ? 'text-xs' : 'text-xs'}`}>
                <span>{stat.trend.value}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

interface ToolbarProps<T> {
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: StandardFilter[];
  activeFilters?: Record<string, any>;
  onFilterChange?: (filterKey: string, value: any) => void;
  onClearFilters?: () => void;
  quickFilters?: QuickFilter[];
  showQuickFilters?: boolean;
  showAddButton?: boolean;
  addButtonText?: string;
  onAdd?: () => void;
  showImportExport?: boolean;
  onImport?: () => void;
  onExport?: () => void;
  viewModes?: StandardViewMode[];
  currentViewMode?: 'table' | 'card' | 'grid';
  onViewModeChange?: (mode: 'table' | 'card' | 'grid') => void;
  toolbarActions?: ReactNode;
  renderToolbarExtra?: () => ReactNode;
  stocktakeMode?: boolean;
  onStocktakeModeChange?: (enabled: boolean) => void;
  stocktakeUpdates?: Record<string, number>;
  onStocktakeUpdateChange?: (updates: Record<string, number>) => void;
  onStocktakeSave?: () => void;
  selectedCount?: number;
  bulkActions?: StandardAction<T[]>[];
  onBulkAction?: (action: StandardAction<T[]>, selectedData: T[]) => void;
}

const Toolbar = <T,>({
  searchable,
  searchPlaceholder = "搜尋...",
  searchValue,
  onSearchChange,
  filters,
  activeFilters,
  onFilterChange,
  onClearFilters,
  quickFilters,
  showQuickFilters = true,
  showAddButton,
  addButtonText = "新增",
  onAdd,
  showImportExport,
  onImport,
  onExport,
  viewModes,
  currentViewMode,
  onViewModeChange,
  toolbarActions,
  renderToolbarExtra,
  stocktakeMode,
  onStocktakeModeChange,
  stocktakeUpdates = {},
  onStocktakeUpdateChange,
  onStocktakeSave,
  selectedCount = 0,
  bulkActions,
  onBulkAction
}: ToolbarProps<T>) => {
  const [showFilters, setShowFilters] = useState(false);
  
  const hasActiveFilters = activeFilters && Object.keys(activeFilters).some(key => {
    const value = activeFilters[key];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
    return value !== undefined && value !== null && value !== '';
  });
  
  const getQuickFilterColorClasses = (color?: string) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
      red: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.gray;
  };

  return (
    <div className={`space-y-4 mb-6 ${typeof window !== 'undefined' && window.innerWidth < 768 ? 'px-2' : ''}`}>
      {/* 快速篩選標籤 */}
      {showQuickFilters && quickFilters && quickFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 max-w-full overflow-hidden">
          {quickFilters.map((filter) => {
            const isActive = activeFilters?.[filter.key] === filter.value;
            return (
              <Button
                key={`${filter.key}-${filter.value}`}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (isActive) {
                    onFilterChange?.(filter.key, null);
                  } else {
                    onFilterChange?.(filter.key, filter.value);
                  }
                }}
                className={`
                  h-7 px-3 text-xs font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-gradient-to-r from-orange-500 to-blue-500 text-white shadow-md' 
                    : `${getQuickFilterColorClasses(filter.color)} border`
                  }
                `}
              >
                {filter.label}
                {filter.count !== undefined && (
                  <Badge 
                    variant="secondary" 
                    className={`ml-1.5 h-4 w-auto px-1.5 text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-white/60'
                    }`}
                  >
                    {filter.count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      )}
      
      {/* 主工具列 */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* 左側：搜尋 */}
        {searchable && (
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-10 bg-white/50 backdrop-blur-sm border-gray-200 focus:border-orange-300 focus:ring-orange-200"
            />
          </div>
        )}
        
        {/* 右側：操作按鈕 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 過濾器按鈕 */}
          {filters && filters.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`relative ${hasActiveFilters ? 'border-orange-300 bg-orange-50' : ''}`}
            >
              <Filter className="h-4 w-4 mr-2" />
              篩選
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {Object.keys(activeFilters).length}
                </Badge>
              )}
            </Button>
          )}
          
          {/* 視圖模式切換 */}
          {viewModes && viewModes.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {viewModes.find(mode => mode.key === currentViewMode)?.icon}
                  <span className="ml-2 hidden sm:inline">
                    {viewModes.find(mode => mode.key === currentViewMode)?.title}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {viewModes.map((mode) => (
                  <DropdownMenuItem
                    key={mode.key}
                    onClick={() => onViewModeChange?.(mode.key)}
                    className={mode.key === currentViewMode ? 'bg-orange-50' : ''}
                  >
                    {mode.icon}
                    <span className="ml-2">{mode.title}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* 盤點模式 */}
          {onStocktakeModeChange && (
            <Button
              variant={stocktakeMode ? "default" : "outline"}
              onClick={() => onStocktakeModeChange?.(!stocktakeMode)}
              className={stocktakeMode ? "bg-gradient-to-r from-orange-500 to-blue-500 text-white" : ""}
            >
              <ListChecks className="h-4 w-4 mr-2" />
              {stocktakeMode ? "結束盤點" : "盤點模式"}
            </Button>
          )}
          
          {/* 匯入匯出 */}
          {showImportExport && (
            <>
              <Button variant="outline" onClick={onImport}>
                <Upload className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">匯入</span>
              </Button>
              <Button variant="outline" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">匯出</span>
              </Button>
            </>
          )}
          
          {/* 新增按鈕 */}
          {showAddButton && onAdd && (
            <Button 
              onClick={onAdd}
              className="bg-gradient-to-r from-orange-500 to-blue-500 hover:from-orange-600 hover:to-blue-600 text-white shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              {addButtonText}
            </Button>
          )}
          
          {/* 自定義工具列動作 */}
          {toolbarActions}
        </div>
      </div>
      
      {/* 盤點模式工具列 */}
      {stocktakeMode && (
        <div className="flex items-center gap-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-700">
              盤點模式已啟用
            </span>
            {Object.keys(stocktakeUpdates).length > 0 && (
              <Badge variant="secondary">
                {Object.keys(stocktakeUpdates).length} 項變更
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {Object.keys(stocktakeUpdates).length > 0 && onStocktakeSave && (
              <Button size="sm" onClick={onStocktakeSave}>
                <Save className="h-4 w-4 mr-2" />
                儲存變更
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onStocktakeModeChange?.(false)}
            >
              <X className="h-4 w-4 mr-2" />
              結束盤點
            </Button>
          </div>
        </div>
      )}
      
      {/* 批量操作列 */}
      {selectedCount > 0 && bulkActions && bulkActions.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <span className="text-sm font-medium text-orange-700">
            已選擇 {selectedCount} 項
          </span>
          <div className="flex items-center gap-2">
            {bulkActions.map((action) => (
              <Button
                key={action.key}
                variant={action.variant || "outline"}
                size="sm"
                onClick={() => onBulkAction?.(action, [])}
                className={action.className}
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.title}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* 過濾器面板 */}
      {showFilters && filters && filters.length > 0 && (
        <Card className="bg-gray-50/50 backdrop-blur-sm border-gray-200">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filters.map((filter) => (
                <div key={filter.key} className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {filter.title}
                  </label>
                  {filter.type === 'select' && (
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:border-orange-300 focus:ring-orange-200"
                      value={activeFilters?.[filter.key] || ''}
                      onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                    >
                      <option value="">{filter.placeholder || '請選擇...'}</option>
                      {filter.options?.map((option) => (
                        <option key={String(option.value)} value={String(option.value)}>
                          {option.label} {option.count ? `(${option.count})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {filter.type === 'search' && (
                    <Input
                      placeholder={filter.placeholder}
                      value={activeFilters?.[filter.key] || ''}
                      onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                      className="bg-white border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                    />
                  )}
                </div>
              ))}
            </div>
            
            {/* 過濾器操作按鈕 */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearFilters}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    清除篩選
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                收起
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 自定義工具列額外內容 */}
      {renderToolbarExtra?.()}
    </div>
  );
};

// =============================================================================
// 主組件
// =============================================================================

export const StandardDataListPage = <T,>({
  data,
  loading = false,
  error,
  columns,
  actions,
  bulkActions,
  onRowClick,
  onRowDoubleClick,
  searchable = true,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filters,
  activeFilters,
  onFilterChange,
  onClearFilters,
  quickFilters,
  showQuickFilters = true,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  rowKey = 'id',
  viewModes = [
    { key: 'table', title: '表格', icon: <List className="h-4 w-4" /> },
    { key: 'card', title: '卡片', icon: <Grid3X3 className="h-4 w-4" /> }
  ],
  defaultViewMode = 'table',
  onViewModeChange,
  stats,
  showStats = true,
  showToolbar = true,
  toolbarActions,
  showImportExport = false,
  onImport,
  onExport,
  showAddButton = true,
  addButtonText = "新增",
  onAdd,
  pagination,
  sortable = true,
  sortBy,
  sortDirection,
  onSort,
  renderCard,
  renderGridItem,
  renderEmptyState,
  renderToolbarExtra,
  className,
  tableClassName,
  cardClassName,
  height,
  tableStyle,
  cardStyle,
  legacyMode = false,
  permissions,
  stocktakeMode,
  onStocktakeModeChange,
  stocktakeUpdates = {},
  onStocktakeUpdateChange,
  onStocktakeSave,
  responsive,
}: StandardDataListPageProps<T>) => {
  // 所有 Hooks 必須在最頂部
  const [isMobile, setIsMobile] = useState(false);
  const [currentViewMode, setCurrentViewMode] = useState<'table' | 'card' | 'grid'>(defaultViewMode);
  
  // 樣式組態邏輯
  const getTableHeaderStyle = () => {
    if (legacyMode) {
      return 'bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200';
    }
    
    switch (tableStyle?.headerStyle) {
      case 'gradient':
        return 'bg-gradient-to-r from-orange-50 to-blue-50';
      case 'solid':
        return 'bg-gray-100';
      case 'minimal':
        return 'bg-transparent border-b';
      default:
        return 'bg-gray-50';
    }
  };
  
  const getTableRowStyle = (isSelected: boolean, index: number) => {
    let baseStyle = '';
    
    if (legacyMode) {
      baseStyle = `
        ${isSelected ? 'bg-orange-50 ring-1 ring-orange-200' : ''}
        ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
        transition-all duration-200
        border-b border-gray-100 last:border-b-0
      `;
    } else {
      baseStyle = `
        ${isSelected ? 'bg-orange-50' : ''}
        ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
        transition-colors
      `;
    }
    
    return baseStyle.trim();
  };
  
  const getCardContainerStyle = () => {
    if (legacyMode) {
      return 'p-2 sm:p-3 md:p-4 w-full max-w-full overflow-hidden'; // 原版響應式樣式
    }
    return `${isMobile ? 'px-2 py-4' : 'p-4 md:p-6'} w-full overflow-hidden`;
  };
  
  // 檢查視窗大小並更新響應式狀態
  useEffect(() => {
    const checkScreenSize = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768); // md breakpoint
      }
    };

    // 初始檢查
    checkScreenSize();

    // 監聽視窗大小變化
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkScreenSize);
      
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  // 自動切換到合適的模式（手機端：卡片，桌面端：表格）
  useEffect(() => {
    if (isMobile && currentViewMode === 'table') {
      setCurrentViewMode('card');
    } else if (!isMobile && currentViewMode === 'card' && defaultViewMode === 'table') {
      setCurrentViewMode('table');
    }
  }, [isMobile, currentViewMode, defaultViewMode]);
  
  // 處理視圖模式變更
  const handleViewModeChange = (mode: 'table' | 'card' | 'grid') => {
    setCurrentViewMode(mode);
    onViewModeChange?.(mode);
  };
  
  // 處理行選擇
  const handleRowSelection = (recordKey: string | number, checked: boolean) => {
    if (!selectable || !onSelectionChange) return;
    
    const newSelectedRows = [...(selectedRows || [])];
    const index = newSelectedRows.indexOf(recordKey);
    
    if (checked && index === -1) {
      newSelectedRows.push(recordKey);
    } else if (!checked && index > -1) {
      newSelectedRows.splice(index, 1);
    }
    
    onSelectionChange(newSelectedRows as string[] | number[]);
  };
  
  // 處理全選
  const handleSelectAll = (checked: boolean) => {
    if (!selectable || !onSelectionChange) return;
    
    if (checked) {
      const allKeys = data.map((record, index) => getRowKey(record, index, rowKey));
      onSelectionChange(allKeys as string[] | number[]);
    } else {
      onSelectionChange([]);
    }
  };
  
  // 處理排序
  const handleSort = (columnKey: string) => {
    if (!sortable || !onSort) return;
    
    let direction: 'asc' | 'desc' = 'asc';
    if (sortBy === columnKey && sortDirection === 'asc') {
      direction = 'desc';
    }
    
    onSort(columnKey, direction);
  };
  
  // 處理批量操作
  const handleBulkAction = (action: StandardAction<T[]>) => {
    const selectedData = data.filter((record, index) => {
      const key = getRowKey(record, index, rowKey);
      return (selectedRows as any)?.includes(key);
    });
    
    if (action.confirmMessage) {
      if (!confirm(action.confirmMessage)) return;
    }
    
    action.onClick(selectedData, 0);
  };
  
  // 處理盤點輸入變更
  const handleStocktakeInputChange = (recordKey: string, value: number) => {
    if (!onStocktakeUpdateChange) return;
    
    const newUpdates = { ...stocktakeUpdates };
    if (value === 0 && stocktakeUpdates[recordKey] === undefined) {
      // 如果輸入0且之前沒有變更記錄，不記錄
      delete newUpdates[recordKey];
    } else {
      newUpdates[recordKey] = value;
    }
    
    onStocktakeUpdateChange(newUpdates);
  };
  
  // 渲染加載狀態
  if (loading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        {showStats && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {stats.map((_, index) => (
              <Card key={index}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {showToolbar && (
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        )}
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(10)].map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // 渲染錯誤狀態
  if (error) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            載入資料時發生錯誤：{errorMessage}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // 渲染空狀態
  if (!data || data.length === 0) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        {showStats && stats && <StatsCards stats={stats} isMobile={isMobile} />}
        
        {showToolbar && (
          <Toolbar
            searchable={searchable}
            searchPlaceholder={searchPlaceholder}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            filters={filters}
            activeFilters={activeFilters}
            onFilterChange={onFilterChange}
            onClearFilters={onClearFilters}
            quickFilters={quickFilters}
            showQuickFilters={showQuickFilters}
            showAddButton={showAddButton && permissions?.create !== false}
            addButtonText={addButtonText}
            onAdd={onAdd}
            showImportExport={showImportExport && permissions?.import !== false}
            onImport={onImport}
            onExport={onExport}
            viewModes={viewModes}
            currentViewMode={currentViewMode}
            onViewModeChange={handleViewModeChange}
            toolbarActions={toolbarActions}
            renderToolbarExtra={renderToolbarExtra}
            stocktakeMode={stocktakeMode}
            onStocktakeModeChange={onStocktakeModeChange}
            stocktakeUpdates={stocktakeUpdates}
            onStocktakeUpdateChange={onStocktakeUpdateChange}
            onStocktakeSave={onStocktakeSave}
            selectedCount={selectedRows.length}
            bulkActions={bulkActions}
            onBulkAction={handleBulkAction}
          />
        )}
        
        <Card>
          <CardContent className="p-12 text-center">
            {renderEmptyState ? renderEmptyState() : (
              <div>
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">暫無資料</h3>
                <p className="text-muted-foreground mb-6">
                  尚未找到任何資料，請嘗試調整搜尋條件或新增資料。
                </p>
                {showAddButton && onAdd && permissions?.create !== false && (
                  <Button 
                    onClick={onAdd}
                    className="bg-gradient-to-r from-orange-500 to-blue-500 hover:from-orange-600 hover:to-blue-600 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {addButtonText}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }


  // 渲染活動篩選標籤
  const renderActiveFilterTags = () => {
    if (!activeFilters || Object.keys(activeFilters).length === 0) return null;

    const filterTags = Object.entries(activeFilters).map(([key, value]) => {
      const filter = filters?.find(f => f.key === key);
      if (!filter || !value) return null;

      if (Array.isArray(value) && value.length === 0) return null;
      if (typeof value === 'string' && value.trim() === '') return null;

      const displayValue = Array.isArray(value) 
        ? value.join(', ') 
        : filter.options?.find(opt => opt.value === value)?.label || String(value);

      return (
        <Badge 
          key={key}
          variant="secondary" 
          className="bg-orange-100 text-orange-800 hover:bg-orange-200 cursor-pointer flex items-center gap-1"
          onClick={() => onFilterChange?.(key, null)}
        >
          {filter.title}: {displayValue}
          <X className="h-3 w-3 hover:text-orange-600" />
        </Badge>
      );
    }).filter(Boolean);

    if (filterTags.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
        <span className="text-sm font-medium text-orange-700 mr-2">篩選條件:</span>
        {filterTags}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-orange-600 hover:text-orange-700 h-6 px-2 text-xs"
        >
          清除全部
        </Button>
      </div>
    );
  };

  // 主要渲染邏輯
  return (
    <div className={`${isMobile ? 'space-y-3 max-w-full overflow-hidden' : 'space-y-6'} ${className || ''}`} style={{ height }}>
      {/* 統計卡片 */}
      {showStats && stats && <StatsCards stats={stats} isMobile={isMobile} />}
      
      {/* 工具列 */}
      {showToolbar && (
        <Toolbar
          searchable={searchable}
          searchPlaceholder={searchPlaceholder}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={onFilterChange}
          onClearFilters={onClearFilters}
          quickFilters={quickFilters}
          showQuickFilters={showQuickFilters}
          showAddButton={showAddButton && permissions?.create !== false}
          addButtonText={addButtonText}
          onAdd={onAdd}
          showImportExport={showImportExport && permissions?.import !== false}
          onImport={onImport}
          onExport={onExport}
          viewModes={viewModes?.filter(mode => {
            // 手機端隱藏表格模式（因為會自動切換到卡片）
            if (isMobile && mode.key === 'table') return false;
            return true;
          })}
          currentViewMode={currentViewMode}
          onViewModeChange={handleViewModeChange}
          toolbarActions={toolbarActions}
          renderToolbarExtra={renderToolbarExtra}
          stocktakeMode={stocktakeMode}
          onStocktakeModeChange={onStocktakeModeChange}
          stocktakeUpdates={stocktakeUpdates}
          onStocktakeUpdateChange={onStocktakeUpdateChange}
          onStocktakeSave={onStocktakeSave}
          selectedCount={selectedRows.length}
          bulkActions={bulkActions}
          onBulkAction={handleBulkAction}
        />
      )}
      
      {/* 活動篩選標籤 */}
      {renderActiveFilterTags()}
      
      {/* 資料展示區域 */}
      <Card className={`${cardClassName} ${isMobile ? 'mx-2 max-w-full overflow-hidden' : 'mx-3 md:mx-0'}`}>
        <CardContent className="p-0">
          {(currentViewMode === 'table' && !isMobile) && (
            <div className="overflow-x-auto">
              <Table className={tableClassName}>
                <TableHeader className={getTableHeaderStyle()}>
                  <TableRow>
                    {/* 選擇欄 */}
                    {selectable && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedRows.length === data.length}
                          onCheckedChange={(checked) => handleSelectAll(!!checked)}
                          {...(selectedRows.length > 0 && selectedRows.length < data.length ? { "data-indeterminate": true } : {})}
                        />
                      </TableHead>
                    )}
                    
                    {/* 資料欄位 */}
                    {columns.map((column) => (
                      <TableHead
                        key={column.key}
                        className={`${column.className || ''} ${column.hideOnMobile ? 'hidden lg:table-cell' : ''}`}
                        style={{ width: column.width }}
                      >
                        <div className={`flex items-center ${column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                          <span>{column.title}</span>
                          {column.sortable && sortable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-2 h-4 w-4 p-0"
                              onClick={() => handleSort(column.key)}
                            >
                              <ChevronDown
                                className={`h-3 w-3 transition-transform ${
                                  sortBy === column.key
                                    ? sortDirection === 'desc'
                                      ? 'rotate-180'
                                      : ''
                                    : 'opacity-50'
                                }`}
                              />
                            </Button>
                          )}
                        </div>
                      </TableHead>
                    ))}
                    
                    {/* 盤點模式欄 */}
                    {stocktakeMode && (
                      <TableHead className="w-32 text-center">盤點數量</TableHead>
                    )}
                    
                    {/* 操作欄 */}
                    {actions && actions.length > 0 && (
                      <TableHead className="w-20 text-center">操作</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((record, index) => {
                    const recordKey = getRowKey(record, index, rowKey);
                    const isSelected = (selectedRows as any)?.includes(recordKey);
                    
                    return (
                      <TableRow
                        key={String(recordKey)}
                        className={getTableRowStyle(isSelected, index)}
                        onClick={() => onRowClick?.(record, index)}
                        onDoubleClick={() => onRowDoubleClick?.(record, index)}
                      >
                        {/* 選擇欄 */}
                        {selectable && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleRowSelection(recordKey, !!checked)}
                            />
                          </TableCell>
                        )}
                        
                        {/* 資料欄位 */}
                        {columns.map((column) => (
                          <TableCell
                            key={column.key}
                            className={`${column.className || ''} ${column.hideOnMobile ? 'hidden lg:table-cell' : ''} ${
                              column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'
                            }`}
                          >
                            {column.render 
                              ? column.render((record as any)[column.key], record, index)
                              : String((record as any)[column.key] || '')
                            }
                          </TableCell>
                        ))}
                        
                        {/* 盤點輸入欄 */}
                        {stocktakeMode && (
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={stocktakeUpdates[String(recordKey)] ?? ''}
                              onChange={(e) => handleStocktakeInputChange(String(recordKey), Number(e.target.value) || 0)}
                              className="w-20 text-center"
                            />
                          </TableCell>
                        )}
                        
                        {/* 操作欄 */}
                        {actions && actions.length > 0 && (
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {actions.map((action) => {
                                  if (action.visible && !action.visible(record)) return null;
                                  
                                  const isDisabled = action.disabled?.(record);
                                  
                                  return (
                                    <DropdownMenuItem
                                      key={action.key}
                                      onClick={() => {
                                        if (action.confirmMessage) {
                                          if (!confirm(action.confirmMessage)) return;
                                        }
                                        action.onClick(record, index);
                                      }}
                                      disabled={isDisabled}
                                      className={action.className}
                                    >
                                      {action.icon && <span className="mr-2">{action.icon}</span>}
                                      {action.title}
                                    </DropdownMenuItem>
                                  );
                                })}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* 卡片視圖 - 專業響應式系統 */}
          {(currentViewMode === 'card' || isMobile) && (
            <div className="w-full">
              {/* 使用 CSS Container Queries 和 Flexbox 的專業響應式佈局 */}
              <div 
                className={`
                  flex flex-wrap gap-3 w-full overflow-hidden
                  ${isMobile 
                    ? 'p-2 justify-center' // 手機版：較小間距
                    : 'gap-4 p-4 justify-center sm:justify-start'
                  }
                `}
                style={{
                  // 確保每張卡片有最佳寬度
                  '--card-min-width': isMobile ? '100%' : '280px',
                  '--card-max-width': isMobile ? '100%' : '400px'
                } as React.CSSProperties}
              >
                {data.map((record, index) => {
                  const recordKey = getRowKey(record, index, rowKey);
                  const isSelected = (selectedRows as any)?.includes(recordKey);
                  
                  // 如果有自定義渲染函數，使用自定義渲染但加上響應式包裝
                  if (renderCard) {
                    return (
                      <div
                        key={String(recordKey)}
                        className={`
                          flex-shrink-0 min-w-0 max-w-full overflow-hidden
                          ${isMobile 
                            ? 'w-full' // 手機版：全寬
                            : 'w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)] xl:w-[calc(25%-0.75rem)]'
                          }
                        `}
                        style={{ containIntrinsicSize: '100%' }}
                      >
                        <div className="w-full h-full overflow-hidden">
                          {renderCard(record, index)}
                        </div>
                      </div>
                    );
                  }
                  
                  // 統一的專業響應式卡片渲染
                  return (
                    <Card
                      key={String(recordKey)}
                      className={`
                        ${isSelected ? 'ring-2 ring-orange-300 bg-orange-50 shadow-lg' : 'hover:shadow-md'}
                        ${onRowClick ? 'cursor-pointer' : ''}
                        transition-all duration-200 relative border-0 shadow-sm
                        bg-gradient-to-br from-white to-gray-50/50
                        flex-shrink-0 min-w-0 max-w-full overflow-hidden
                        ${isMobile 
                          ? 'w-full min-h-[140px]' // 手機版：全寬，較小高度
                          : 'w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)] xl:w-[calc(25%-0.75rem)] min-h-[160px]'
                        }
                      `}
                      onClick={() => onRowClick?.(record, index)}
                    >
                      {/* 選擇框 */}
                      {selectable && (
                        <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleRowSelection(recordKey, !!checked)}
                            className="bg-white shadow-sm border-black"
                          />
                        </div>
                      )}
                      
                      {/* 卡片內容 - 完全重新設計的佈局 */}
                      <CardContent className="p-3 w-full h-full overflow-hidden">
                        <div className="flex flex-col h-full justify-between gap-3">
                          {/* 頂部：主要資訊 */}
                          <div className="space-y-2">
                            {/* 標題 */}
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 
                                  className="font-semibold text-sm text-gray-900 leading-tight overflow-hidden"
                                  style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    maxHeight: '2.5rem'
                                  }}
                                >
                                  {columns[0]?.render 
                                    ? columns[0].render((record as any)[columns[0].key], record, index)
                                    : String((record as any)[columns[0]?.key] || '')
                                  }
                                </h3>
                                {columns[1] && (
                                  <p 
                                    className="text-xs text-gray-600 mt-1 overflow-hidden"
                                    style={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 1,
                                      WebkitBoxOrient: 'vertical',
                                      maxHeight: '1.2rem'
                                    }}
                                  >
                                    {columns[1].render 
                                      ? columns[1].render((record as any)[columns[1].key], record, index)
                                      : String((record as any)[columns[1].key] || '')
                                    }
                                  </p>
                                )}
                              </div>
                              {selectable && <div className="w-6"></div>}
                            </div>
                            
                            {/* 關鍵資訊 - 緊湊的標籤式佈局 */}
                            <div className="flex flex-wrap gap-1">
                              {columns
                                .slice(2)
                                .filter(column => !column.hideOnMobile)
                                .sort((a, b) => (b.priority || 0) - (a.priority || 0))
                                .slice(0, 3)
                                .map((column) => {
                                  const value = (record as any)[column.key];
                                  const renderedValue = column.mobileRender 
                                    ? column.mobileRender(value, record, index)
                                    : column.render 
                                    ? column.render(value, record, index) 
                                    : String(value || '-');
                                  
                                  return (
                                    <div 
                                      key={column.key}
                                      className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded text-xs min-w-0"
                                    >
                                      <span className="text-gray-500 truncate">{column.title}:</span>
                                      <span className="font-medium text-gray-900 truncate max-w-20">
                                        {renderedValue}
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                          
                          {/* 底部：操作區域 */}
                          <div className="space-y-2 mt-auto">
                            {/* 盤點模式 */}
                            {stocktakeMode && (
                              <div className="flex items-center justify-between py-2 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                                <span className="text-xs font-medium text-gray-700">盤點:</span>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={stocktakeUpdates[String(recordKey)] ?? ''}
                                  onChange={(e) => handleStocktakeInputChange(String(recordKey), Number(e.target.value) || 0)}
                                  className="w-16 h-6 text-xs text-center border-orange-200 focus:border-orange-400"
                                />
                              </div>
                            )}
                            
                            {/* 操作按鈕 */}
                            {actions && actions.length > 0 && (
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                {actions.slice(0, 2).map((action) => {
                                  if (action.visible && !action.visible(record)) return null;
                                  const isDisabled = action.disabled?.(record);
                                  
                                  return (
                                    <Button
                                      key={action.key}
                                      variant={action.variant === 'destructive' ? "destructive" : "outline"}
                                      disabled={isDisabled}
                                      size="sm"
                                      onClick={() => {
                                        if (action.confirmMessage && !confirm(action.confirmMessage)) return;
                                        action.onClick(record, index);
                                      }}
                                      className={`
                                        flex-1 h-6 px-2 text-xs
                                        ${action.variant === 'destructive' 
                                          ? 'border-red-300 text-red-600 hover:bg-red-50' 
                                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }
                                        ${action.className || ''}
                                      `}
                                      title={action.title}
                                    >
                                      {action.icon && <span className="mr-1 text-xs">{action.icon}</span>}
                                      <span className="truncate">{action.title}</span>
                                    </Button>
                                  );
                                })}
                                
                                {/* 更多操作 */}
                                {actions.length > 2 && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-6 w-6 p-0 border-gray-300">
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                      {actions.slice(2).map((action) => {
                                        if (action.visible && !action.visible(record)) return null;
                                        const isDisabled = action.disabled?.(record);
                                        
                                        return (
                                          <DropdownMenuItem
                                            key={action.key}
                                            onClick={() => {
                                              if (action.confirmMessage && !confirm(action.confirmMessage)) return;
                                              action.onClick(record, index);
                                            }}
                                            disabled={isDisabled}
                                            className={`${action.className || ''} text-xs`}
                                          >
                                            {action.icon && (
                                              <span className="mr-2 h-3 w-3 flex items-center justify-center">
                                                {action.icon}
                                              </span>
                                            )}
                                            {action.title}
                                          </DropdownMenuItem>
                                        );
                                      })}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* 網格視圖 */}
          {currentViewMode === 'grid' && (
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {data.map((record, index) => {
                  const recordKey = getRowKey(record, index, rowKey);
                  const isSelected = (selectedRows as any)?.includes(recordKey);
                  
                  return renderGridItem ? renderGridItem(record, index) : (
                    <div
                      key={String(recordKey)}
                      className={`
                        relative aspect-square border rounded-lg p-3 flex flex-col items-center justify-center
                        ${isSelected ? 'ring-2 ring-orange-200 bg-orange-50' : 'bg-white'}
                        ${onRowClick ? 'cursor-pointer hover:shadow-md' : ''}
                        transition-all
                      `}
                      onClick={() => onRowClick?.(record, index)}
                    >
                      {selectable && (
                        <div className="absolute top-1 right-1" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleRowSelection(recordKey, !!checked)}
                          />
                        </div>
                      )}
                      
                      <div className="text-center">
                        <div className="font-medium text-sm mb-1">
                          {String((record as any)[columns[0]?.key] || '')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {String((record as any)[columns[1]?.key] || '')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 分頁 */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            總共 {pagination.total} 項
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.current <= 1}
              onClick={() => pagination.onChange?.(pagination.current - 1, pagination.pageSize)}
            >
              上一頁
            </Button>
            <span className="text-sm">
              {pagination.current} / {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
              onClick={() => pagination.onChange?.(pagination.current + 1, pagination.pageSize)}
            >
              下一頁
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandardDataListPage;