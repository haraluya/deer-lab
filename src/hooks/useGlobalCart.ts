// src/hooks/useGlobalCart.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useApiClient } from '@/hooks/useApiClient';
import { toast } from 'sonner';
import { CartItem } from '@/types/entities'; // 使用統一的類型定義

export function useGlobalCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const apiClient = useApiClient();

  // 使用 ref 來避免 useEffect 依賴問題
  const cartItemsRef = useRef<CartItem[]>([]);

  // 更新 ref 當 cartItems 變化時
  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  // 監聽 Firestore 購物車變化
  useEffect(() => {
    if (!db) {
      console.error('Firebase 未初始化');
      setIsLoading(false);
      return;
    }

    console.log('useGlobalCart: 開始監聽購物車變化');
    
    const unsubscribe = onSnapshot(
      doc(db, 'globalCart', 'main'),
      (doc) => {
        console.log('useGlobalCart: 收到購物車更新');
        if (doc.exists()) {
          const data = doc.data();
          const items = data?.items || [];
          console.log('useGlobalCart: 購物車項目數量:', items.length);
          setCartItems(items);
          setCartItemCount(items.length);
        } else {
          console.log('useGlobalCart: 購物車文檔不存在，設置為空');
          setCartItems([]);
          setCartItemCount(0);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('監聽購物車失敗:', error);
        toast.error('無法載入購物車資料');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 從 localStorage 遷移舊資料（只執行一次）
  useEffect(() => {
    const migrateFromLocalStorage = async () => {
      try {
        const localCart = localStorage.getItem('purchaseCart');
        const hasMigrated = localStorage.getItem('cartMigrated');
        
        if (localCart && !hasMigrated) {
          const localItems = JSON.parse(localCart);
          
          if (localItems.length > 0) {
            setIsSyncing(true);
            
            const result = await apiClient.call('syncGlobalCart', { items: localItems });
            
            if (result.success) {
              localStorage.setItem('cartMigrated', 'true');
              localStorage.removeItem('purchaseCart');
              toast.success(`已將 ${localItems.length} 個項目遷移到雲端購物車`);
            }
          }
        }
      } catch (error) {
        console.error('遷移購物車失敗:', error);
        toast.error('遷移購物車資料失敗');
      } finally {
        setIsSyncing(false);
      }
    };

    if (!isLoading && cartItemsRef.current.length === 0) {
      migrateFromLocalStorage();
    }
  }, [isLoading, apiClient]);

  // 添加項目到購物車 - 樂觀更新以提升速度
  const addToCart = useCallback(async (item: Omit<CartItem, 'id' | 'addedBy' | 'addedAt' | 'updatedAt'>) => {
    // 立即樂觀更新本地狀態
    const newItemId = `${item.type}_${item.code}_${Date.now()}`;
    const optimisticItem: CartItem = {
      ...item,
      id: newItemId,
      addedBy: 'current_user',
      addedAt: new Date(),
      updatedAt: new Date()
    };

    // 使用函數式更新來檢查和更新狀態
    setCartItems(prevItems => {
      // 檢查是否已存在相同項目
      const existingItemIndex = prevItems.findIndex(
        (i) => i.type === item.type && i.code === item.code && i.supplierId === item.supplierId
      );

      let updatedItems;
      if (existingItemIndex >= 0) {
        // 增加現有項目的數量
        updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + item.quantity,
          updatedAt: new Date()
        };
      } else {
        // 添加新項目
        updatedItems = [...prevItems, optimisticItem];
      }

      // 更新計數
      setCartItemCount(updatedItems.length);
      return updatedItems;
    });

    // 立即顯示成功提示，不等待網路請求
    toast.success('已加入購物車');

    // 背景同步到 Firebase
    try {
      setIsSyncing(true);
      
      const result = await apiClient.call('testAddToGlobalCart', {
        type: item.type,
        itemId: item.code, // 使用 code 作為 itemId
        quantity: item.quantity,
        supplierId: item.supplierId
      });
      
      if (result.success) {
        // 成功，但不再顯示提示（已經顯示過了）
        return true;
      } else {
        // 失敗時顯示錯誤並讓 Firestore 監聽自動同步回正確狀態
        toast.error('同步到雲端失敗，但項目已暫存本地');
        return false;
      }
    } catch (error) {
      console.error('背景同步失敗:', error);
      // 暫時顯示錯誤訊息以便調試
      toast.error(`購物車同步失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [apiClient]);

  // 更新購物車項目 - 樂觀更新以改善使用者體驗
  const updateCartItem = useCallback(async (itemId: string, updates: Partial<CartItem>) => {
    // 樂觀更新：立即更新本地狀態
    const optimisticUpdate = () => {
      setCartItems(prevItems => {
        return prevItems.map(item => 
          item.id === itemId ? { ...item, ...updates } : item
        );
      });
    };

    optimisticUpdate();

    try {
      setIsSyncing(true);
      
      const result = await apiClient.call('updateGlobalCartItem', { itemId, ...updates });
      
      if (result.success) {
        // 成功時不顯示訊息，避免過多提示
        return true;
      } else {
        // 失敗時還原樂觀更新
        console.error('更新失敗，還原本地狀態');
        return false;
      }
    } catch (error) {
      console.error('更新購物車失敗:', error);
      // 失敗時還原本地狀態，但因為 Firestore 監聽會自動同步，所以不用手動還原
      toast.error('更新購物車失敗');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [apiClient]);

  // 從購物車移除項目 - 樂觀更新
  const removeFromCart = useCallback(async (itemId: string) => {
    // 樂觀更新：立即從本地狀態移除
    setCartItems(prevItems => {
      const filteredItems = prevItems.filter(item => item.id !== itemId);
      setCartItemCount(filteredItems.length);
      return filteredItems;
    });

    try {
      setIsSyncing(true);
      
      const result = await apiClient.call('removeFromGlobalCart', { itemId });
      
      if (result.success) {
        toast.success('已從購物車移除');
        return true;
      }
      return false;
    } catch (error) {
      console.error('移除項目失敗:', error);
      toast.error('移除項目失敗');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [apiClient]);

  // 清空購物車
  const clearCart = useCallback(async () => {
    try {
      setIsSyncing(true);
      
      const result = await apiClient.call('clearGlobalCart', {});
      
      if (result.success) {
        toast.success('購物車已清空');
        return true;
      }
      return false;
    } catch (error) {
      console.error('清空購物車失敗:', error);
      toast.error('清空購物車失敗');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [apiClient]);

  // 獲取供應商分組的購物車項目
  const getCartBySupplier = useCallback(() => {
    const grouped: { [key: string]: CartItem[] } = {};
    
    cartItems.forEach(item => {
      if (!grouped[item.supplierId]) {
        grouped[item.supplierId] = [];
      }
      grouped[item.supplierId].push(item);
    });
    
    return grouped;
  }, [cartItems]);

  return {
    cartItems,
    cartItemCount,
    isLoading,
    isSyncing,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartBySupplier
  };
}

// 保留相容性的 hook（向後相容）
export function usePurchaseCart() {
  const { cartItemCount } = useGlobalCart();
  return cartItemCount;
}