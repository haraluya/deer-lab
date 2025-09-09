// src/hooks/useDataSearch.ts
import { useState, useCallback, useMemo } from 'react';

// 搜尋欄位配置介面
export interface SearchField<T> {
  key: keyof T;
  transform?: (value: any) => string; // 用於轉換值的函數（如日期格式化）
}

// 過濾器配置介面
export interface FilterConfig<T> {
  key: keyof T;
  type: 'set' | 'boolean' | 'range' | 'custom';
  transform?: (value: any) => any;
  customFilter?: (item: T, filterValue: any) => boolean;
}

// 排序配置介面
export interface SortConfig<T> {
  key: keyof T;
  direction: 'asc' | 'desc';
  transform?: (value: any) => any;
}

// Hook 選項介面
export interface UseDataSearchOptions<T> {
  searchFields: SearchField<T>[];
  filterConfigs?: FilterConfig<T>[];
  sortConfigs?: SortConfig<T>[];
  debounceMs?: number;
}

// Hook 返回值介面
export interface UseDataSearchReturn<T> {
  // 搜尋相關
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  
  // 過濾器相關
  activeFilters: Record<string, any>;
  setFilter: (key: string, value: any) => void;
  clearFilter: (key: string) => void;
  clearAllFilters: () => void;
  
  // 結果
  filteredData: T[];
  
  // 統計
  totalCount: number;
  filteredCount: number;
}

/**
 * 統一的資料搜尋與過濾 Hook
 * 支援多欄位搜尋、複雜過濾器和自訂排序
 */
export function useDataSearch<T extends Record<string, any>>(
  data: T[],
  options: UseDataSearchOptions<T>
): UseDataSearchReturn<T> {
  const { searchFields, filterConfigs = [], sortConfigs = [] } = options;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  // 設定單個過濾器
  const setFilter = useCallback((key: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // 清除單個過濾器
  const clearFilter = useCallback((key: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  // 清除所有過濾器
  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  // 搜尋過濾邏輯
  const searchFiltered = useMemo(() => {
    if (!searchTerm.trim()) {
      return data;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    
    return data.filter(item => {
      return searchFields.some(field => {
        const value = item[field.key];
        if (value == null) return false;
        
        // 使用轉換函數或直接轉字串
        const searchValue = field.transform 
          ? field.transform(value).toString().toLowerCase()
          : value.toString().toLowerCase();
          
        return searchValue.includes(searchLower);
      });
    });
  }, [data, searchTerm, searchFields]);

  // 過濾器邏輯
  const filtered = useMemo(() => {
    let result = searchFiltered;

    filterConfigs.forEach(config => {
      const filterValue = activeFilters[config.key as string];
      if (filterValue == null) return;

      result = result.filter(item => {
        if (config.customFilter) {
          return config.customFilter(item, filterValue);
        }

        const itemValue = config.transform 
          ? config.transform(item[config.key])
          : item[config.key];

        switch (config.type) {
          case 'set':
            if (filterValue instanceof Set) {
              return filterValue.size === 0 || filterValue.has(itemValue);
            }
            return filterValue === itemValue;

          case 'boolean':
            return Boolean(filterValue) === Boolean(itemValue);

          case 'range':
            if (filterValue.min != null && itemValue < filterValue.min) return false;
            if (filterValue.max != null && itemValue > filterValue.max) return false;
            return true;

          default:
            return itemValue === filterValue;
        }
      });
    });

    return result;
  }, [searchFiltered, activeFilters, filterConfigs]);

  // 排序邏輯
  const sortedData = useMemo(() => {
    if (sortConfigs.length === 0) {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      for (const sortConfig of sortConfigs) {
        const aValue = sortConfig.transform 
          ? sortConfig.transform(a[sortConfig.key])
          : a[sortConfig.key];
        const bValue = sortConfig.transform 
          ? sortConfig.transform(b[sortConfig.key])
          : b[sortConfig.key];

        let comparison = 0;
        
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
        
        if (comparison !== 0) {
          return sortConfig.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }, [filtered, sortConfigs]);

  return {
    searchTerm,
    setSearchTerm,
    activeFilters,
    setFilter,
    clearFilter,
    clearAllFilters,
    filteredData: sortedData,
    totalCount: data.length,
    filteredCount: sortedData.length,
  };
}

// 預設配置產生器 - 材料頁面
export function createMaterialSearchConfig<T extends {
  name: string;
  code: string;
  category?: string;
  subCategory?: string;
  supplierName?: string;
  currentStock: number;
  safetyStockLevel?: number;
}>(): UseDataSearchOptions<T> {
  return {
    searchFields: [
      { key: 'name' },
      { key: 'code' },
      { key: 'category' },
      { key: 'subCategory' },
      { key: 'supplierName' },
    ],
    filterConfigs: [
      {
        key: 'category',
        type: 'set',
      },
      {
        key: 'subCategory', 
        type: 'set',
      },
      {
        key: 'supplierName',
        type: 'set',
      },
      {
        key: 'currentStock',
        type: 'custom',
        customFilter: (item, showLowStockOnly: boolean) => {
          if (!showLowStockOnly) return true;
          const safetyLevel = item.safetyStockLevel || 0;
          return item.currentStock < safetyLevel;
        },
      },
    ],
    sortConfigs: [
      {
        key: 'category',
        direction: 'asc',
        transform: (value) => value || '',
      },
      {
        key: 'subCategory',
        direction: 'asc',
        transform: (value) => value || '',
      },
      {
        key: 'name',
        direction: 'asc',
      },
    ],
  };
}

// 預設配置產生器 - 香精頁面
export function createFragranceSearchConfig<T extends {
  name: string;
  code: string;
  fragranceType?: string;
  fragranceStatus?: string;
  supplierName?: string;
  currentStock: number;
  safetyStockLevel?: number;
  costPerUnit?: number;
  percentage?: number;
}>(): UseDataSearchOptions<T> {
  return {
    searchFields: [
      { key: 'name' },
      { key: 'code' },
      { key: 'fragranceType' },
      { key: 'fragranceStatus' },
      { key: 'supplierName' },
      { key: 'currentStock', transform: (value) => value?.toString() || '0' },
      { key: 'costPerUnit', transform: (value) => value?.toString() || '' },
      { key: 'percentage', transform: (value) => value?.toString() || '' },
    ],
    filterConfigs: [
      {
        key: 'fragranceType',
        type: 'set',
      },
      {
        key: 'fragranceStatus',
        type: 'set',
      },
      {
        key: 'supplierName',
        type: 'set',
      },
      {
        key: 'currentStock',
        type: 'custom',
        customFilter: (item, showLowStockOnly: boolean) => {
          if (!showLowStockOnly) return true;
          const safetyLevel = item.safetyStockLevel || 0;
          return item.currentStock < safetyLevel;
        },
      },
    ],
    sortConfigs: [
      {
        key: 'fragranceStatus',
        direction: 'asc',
        transform: (status) => {
          const statusOrder = { '啟用': 1, '備用': 2, '棄用': 3 };
          return statusOrder[status as keyof typeof statusOrder] || 4;
        },
      },
      {
        key: 'fragranceType',
        direction: 'asc',
        transform: (type) => {
          const typeOrder = { '棉芯': 1, '陶瓷芯': 2, '棉陶芯通用': 3 };
          return typeOrder[type as keyof typeof typeOrder] || 4;
        },
      },
      {
        key: 'name',
        direction: 'asc',
      },
    ],
  };
}

// 預設配置產生器 - 產品頁面
export function createProductSearchConfig<T extends {
  name: string;
  code: string;
  seriesName?: string;
  fragranceName?: string;
  fragranceCode?: string;
  status?: string;
}>(): UseDataSearchOptions<T> {
  return {
    searchFields: [
      { key: 'name' },
      { key: 'code' },
      { key: 'seriesName' },
      { key: 'fragranceName' },
      { key: 'fragranceCode' },
    ],
    filterConfigs: [
      {
        key: 'seriesName',
        type: 'set',
      },
      {
        key: 'status',
        type: 'set',
      },
    ],
    sortConfigs: [
      {
        key: 'seriesName',
        direction: 'asc',
        transform: (value) => value || '',
      },
      {
        key: 'name',
        direction: 'asc',
      },
    ],
  };
}