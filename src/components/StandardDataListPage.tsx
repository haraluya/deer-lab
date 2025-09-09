'use client';

import React, { ReactNode, useState } from 'react';
import { StandardDataTable, StandardColumn, StandardAction } from './StandardDataTable';
import { useDataSearch, UseDataSearchOptions } from '@/hooks/useDataSearch';
import { useCartOperations, CartOperationItem, CartOperationsConfig } from '@/hooks/useCartOperations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Plus, ShoppingCart, ListChecks, Package, AlertTriangle, X, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// 統計卡片配置
export interface StatCard {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient?: string;
  valueClassName?: string;
}

// 過濾器配置
export interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string; count?: number }[];
  multiSelect?: boolean;
}

// 標準頁面配置
export interface StandardDataListPageConfig<T> {
  // 基本配置
  entityName: string;
  entityNamePlural: string;
  
  // 資料和載入
  data: T[];
  loading?: boolean;
  
  // 搜尋和過濾
  searchConfig: UseDataSearchOptions<T>;
  filterOptions?: FilterOption[];
  
  // 表格配置
  columns: StandardColumn<T>[];
  actions?: StandardAction<T>[];
  getRowClassName?: (item: T, index: number) => string;
  
  // 購物車配置（可選）
  cartConfig?: CartOperationsConfig & {
    enabled: boolean;
    validateItem?: (item: T) => boolean | string;
  };
  
  // 統計卡片（可選）
  statCards?: StatCard[];
  
  // 操作按鈕
  onAdd?: () => void;
  onImportExport?: () => void;
  onBatchAction?: (selectedItems: T[]) => void;
  
  // 自定義內容
  customHeader?: ReactNode;
  customFilters?: ReactNode;
  customActions?: ReactNode;
  
  // 權限
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canBatchDelete?: boolean;
}

/**
 * 標準化資料列表頁面組件
 * 整合搜尋、過濾、表格顯示、購物車等功能
 */
export function StandardDataListPage<T extends CartOperationItem>({
  entityName,
  entityNamePlural,
  data,
  loading = false,
  searchConfig,
  filterOptions = [],
  columns,
  actions = [],
  getRowClassName,
  cartConfig,
  statCards,
  onAdd,
  onImportExport,
  onBatchAction,
  customHeader,
  customFilters,
  customActions,
  canAdd = true,
  canEdit = true,
  canDelete = true,
  canBatchDelete = false,
}: StandardDataListPageConfig<T>) {
  
  // 搜尋和過濾 Hook
  const {
    searchTerm,
    setSearchTerm,
    activeFilters,
    setFilter,
    clearFilter,
    clearAllFilters,
    filteredData,
    totalCount,
    filteredCount
  } = useDataSearch(data, searchConfig);

  // 購物車操作 Hook（總是調用，但可能不啟用）
  const cartOperations = useCartOperations(
    filteredData,
    {
      itemType: cartConfig?.itemType || 'material',
      itemTypeName: entityName,
    }
  );

  const [showFilters, setShowFilters] = useState(false);

  // 處理過濾器變更
  const handleFilterChange = (filterKey: string, value: string, multiSelect = false) => {
    const currentFilter = activeFilters[filterKey] as Set<string> | undefined;
    
    if (multiSelect) {
      const newFilter = new Set(currentFilter || []);
      if (newFilter.has(value)) {
        newFilter.delete(value);
      } else {
        newFilter.add(value);
      }
      
      if (newFilter.size === 0) {
        clearFilter(filterKey);
      } else {
        setFilter(filterKey, newFilter);
      }
    } else {
      const isCurrentlySelected = currentFilter?.has(value);
      if (isCurrentlySelected) {
        clearFilter(filterKey);
      } else {
        setFilter(filterKey, new Set([value]));
      }
    }
  };

  // 渲染統計卡片
  const renderStatCards = () => {
    if (!statCards || statCards.length === 0) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index} className="relative overflow-hidden">
              <div className={`absolute inset-0 ${stat.gradient || 'bg-gradient-to-br from-orange-400/10 to-blue-500/10'} opacity-50`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.valueClassName || ''}`}>
                  {stat.value}
                </div>
                {stat.description && (
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // 渲染搜尋欄
  const renderSearchBar = () => (
    <div className="flex items-center gap-2 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={`搜尋${entityNamePlural}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
      
      {filterOptions.length > 0 && (
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={`${Object.keys(activeFilters).length > 0 ? 'bg-blue-50 border-blue-200' : ''}`}
            >
              <ListChecks className="h-4 w-4 mr-2" />
              篩選 
              {Object.keys(activeFilters).length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {Object.keys(activeFilters).length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">篩選條件</h4>
                {Object.keys(activeFilters).length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearAllFilters}
                    className="h-auto p-1 text-xs"
                  >
                    清除全部
                  </Button>
                )}
              </div>
              
              {filterOptions.map((filter) => (
                <div key={filter.key} className="space-y-2">
                  <label className="text-sm font-medium">{filter.label}</label>
                  <div className="flex flex-wrap gap-1">
                    {filter.options.map((option) => {
                      const isSelected = (activeFilters[filter.key] as Set<string>)?.has(option.value);
                      return (
                        <Button
                          key={option.value}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleFilterChange(filter.key, option.value, filter.multiSelect)}
                        >
                          {option.label}
                          {option.count !== undefined && (
                            <Badge variant="secondary" className="ml-1 px-1 text-xs">
                              {option.count}
                            </Badge>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
      
      {customFilters}
    </div>
  );

  // 渲染操作按鈕列
  const renderActionBar = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {canAdd && onAdd && (
          <Button onClick={onAdd} className="bg-gradient-to-r from-orange-500 to-blue-500 text-white">
            <Plus className="h-4 w-4 mr-2" />
            新增{entityName}
          </Button>
        )}
        
        {onImportExport && (
          <Button variant="outline" onClick={onImportExport}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            匯入/匯出
          </Button>
        )}
        
        {customActions}
      </div>
      
      {/* 批量操作 */}
      {cartConfig?.enabled && cartOperations.selectionStats.hasSelection && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            已選擇 {cartOperations.selectionStats.selectedCount} 個項目
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={cartOperations.addSelectedItems}
            disabled={cartOperations.cartLoading}
          >
            {cartOperations.cartLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4 mr-2" />
            )}
            加入採購車
          </Button>
          
          {canBatchDelete && onBatchAction && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                const selectedItems = data.filter(item => 
                  cartOperations.selectedItems.has(item.id)
                );
                onBatchAction(selectedItems);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              批量刪除
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={cartOperations.clearSelection}
          >
            清除選擇
          </Button>
        </div>
      )}
    </div>
  );

  // 渲染結果統計
  const renderResultsInfo = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="text-sm text-muted-foreground">
        {filteredCount === totalCount ? (
          `共 ${totalCount} 個${entityName}`
        ) : (
          `顯示 ${filteredCount} / ${totalCount} 個${entityName}`
        )}
      </div>
      
      {/* 活動過濾器標籤 */}
      {Object.keys(activeFilters).length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">過濾條件:</span>
          {Object.entries(activeFilters).map(([key, value]) => {
            const filter = filterOptions.find(f => f.key === key);
            if (!filter) return null;
            
            const filterValue = value instanceof Set ? Array.from(value) : [value];
            return filterValue.map((val) => (
              <Badge 
                key={`${key}-${val}`}
                variant="secondary" 
                className="text-xs"
              >
                {filter.label}: {val}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => handleFilterChange(key, val as string, filter.multiSelect)}
                />
              </Badge>
            ));
          })}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {customHeader}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {entityNamePlural}管理
            </CardTitle>
            <CardDescription>載入中...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {customHeader}
      
      {/* 統計卡片 */}
      {renderStatCards()}
      
      {/* 主要內容卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {entityNamePlural}管理
          </CardTitle>
          <CardDescription>
            管理和查看所有{entityName}，支援搜尋、篩選和批量操作
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 搜尋欄 */}
          {renderSearchBar()}
          
          {/* 操作按鈕列 */}
          {renderActionBar()}
          
          {/* 結果統計 */}
          {renderResultsInfo()}
          
          {/* 資料表格 */}
          <StandardDataTable
            data={filteredData}
            columns={columns}
            loading={loading}
            actions={actions}
            selection={cartConfig?.enabled ? {
              enabled: true,
              selectedItems: cartOperations.selectedItems,
              onToggleItem: cartOperations.handleToggleItem,
              onToggleAll: cartOperations.handleToggleAll,
              isAllSelected: cartOperations.selectionStats.isAllSelected,
              isPartialSelected: cartOperations.selectionStats.isPartiallySelected,
              getItemId: (item) => item.id,
              disabled: cartConfig?.validateItem ? (item) => {
                const result = cartConfig.validateItem!(item);
                return typeof result === 'string';
              } : undefined,
            } : undefined}
            getRowClassName={getRowClassName}
            emptyMessage={`暫無${entityName}資料，請嘗試新增或調整篩選條件`}
          />
        </CardContent>
      </Card>
    </div>
  );
}