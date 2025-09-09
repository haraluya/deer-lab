import { useState, useCallback, useMemo } from 'react';
import { useGlobalCart } from '@/hooks/useGlobalCart';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export interface CartOperationItem {
  id: string;
  name: string;
  code: string;
  type: 'material' | 'fragrance';
  supplierId?: string;
  supplierName?: string;
  unit?: string;
  currentStock: number;
  costPerUnit?: number;
  supplierRef?: {
    id: string;
  };
}

export interface CartOperationsConfig {
  itemType: 'material' | 'fragrance';
  itemTypeName?: string;
}

export function useCartOperations<T extends CartOperationItem>(
  items: T[],
  config: CartOperationsConfig
) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [cartLoading, setCartLoading] = useState(false);
  const { addToCart } = useGlobalCart();
  
  const { itemType, itemTypeName = itemType === 'material' ? '物料' : '香精' } = config;

  // 勾選/取消勾選單個項目
  const handleToggleItem = useCallback((itemId: string) => {
    setSelectedItems(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return newSelected;
    });
  }, []);

  // 全選/取消全選
  const handleToggleAll = useCallback(() => {
    const allItemIds = items.map(item => item.id);
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(allItemIds));
    }
  }, [items, selectedItems.size]);

  // 清空選擇
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // 單項加入購物車
  const addSingleItem = useCallback(async (item: T) => {
    try {
      setCartLoading(true);
      
      const cartItem = {
        id: item.id,
        name: item.name,
        code: item.code,
        type: item.type,
        supplierId: item.supplierRef?.id || item.supplierId || '',
        supplierName: item.supplierName || '未指定',
        unit: item.unit || (item.type === 'material' ? 'KG' : 'KG'),
        quantity: 1,
        costPerUnit: item.costPerUnit || 0,
        price: item.costPerUnit || 0,
        currentStock: item.currentStock || 0,
      };

      logger.debug(`準備加入採購車的${itemTypeName}資料`, {
        id: item.id,
        name: item.name,
        code: item.code,
        costPerUnit: item.costPerUnit
      });

      await addToCart(cartItem);
      toast.success(`已將 ${item.name} 加入採購車`);
    } catch (error) {
      logger.error(`添加${itemTypeName}到採購車失敗`, error as Error);
      toast.error(`添加${itemTypeName}到採購車失敗`);
    } finally {
      setCartLoading(false);
    }
  }, [addToCart, itemType, itemTypeName]);

  // 批量加入購物車
  const addSelectedItems = useCallback(async () => {
    if (selectedItems.size === 0) {
      toast.info(`請至少選擇一個${itemTypeName}加入採購車。`);
      return;
    }
    
    try {
      setCartLoading(true);
      
      // 獲取選中的項目資料
      const selectedItemsData = items.filter(item => selectedItems.has(item.id));
      let successCount = 0;
      
      // 逐一添加到全域購物車
      for (const item of selectedItemsData) {
        const cartItem = {
          id: item.id,
          type: item.type,
          code: item.code,
          name: item.name,
          supplierId: item.supplierRef?.id || item.supplierId || '',
          supplierName: item.supplierName || '未指定',
          quantity: 1,
          unit: item.unit || (item.type === 'material' ? 'KG' : 'KG'),
          currentStock: item.currentStock || 0,
          costPerUnit: item.costPerUnit || 0,
          price: item.costPerUnit || 0
        };
        
        await addToCart(cartItem);
        successCount++;
      }
      
      if (successCount > 0) {
        toast.success(`成功加入 ${successCount} 個${itemTypeName}到採購車`);
        clearSelection(); // 清空選擇
      }
      
    } catch (error) {
      logger.error(`批量添加${itemTypeName}到採購車失敗`, error as Error);
      toast.error(`批量添加${itemTypeName}到採購車失敗`);
    } finally {
      setCartLoading(false);
    }
  }, [selectedItems, items, addToCart, itemTypeName, clearSelection]);

  // 計算選中項目的統計
  const selectionStats = useMemo(() => {
    const selectedCount = selectedItems.size;
    const totalCount = items.length;
    const isAllSelected = selectedCount === totalCount && totalCount > 0;
    const isPartiallySelected = selectedCount > 0 && selectedCount < totalCount;
    
    return {
      selectedCount,
      totalCount,
      isAllSelected,
      isPartiallySelected,
      hasSelection: selectedCount > 0
    };
  }, [selectedItems.size, items.length]);

  return {
    selectedItems,
    cartLoading,
    handleToggleItem,
    handleToggleAll,
    clearSelection,
    addSingleItem,
    addSelectedItems,
    selectionStats
  };
}