// src/hooks/useGlobalCart.ts
import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  type: 'material' | 'fragrance';
  code: string;
  name: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unit: string;
  currentStock: number;
  price?: number;
  notes?: string;
  addedBy?: string;
  addedAt?: any;
  updatedAt?: any;
}

export function useGlobalCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

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
            const functions = getFunctions();
            const syncCart = httpsCallable(functions, 'syncGlobalCart');
            
            const result = await syncCart({ items: localItems });
            
            if (result.data) {
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

    if (!isLoading && cartItems.length === 0) {
      migrateFromLocalStorage();
    }
  }, [isLoading, cartItems.length]);

  // 添加項目到購物車
  const addToCart = useCallback(async (item: Omit<CartItem, 'id' | 'addedBy' | 'addedAt' | 'updatedAt'>) => {
    try {
      setIsSyncing(true);
      const functions = getFunctions();
      const addItem = httpsCallable(functions, 'addToGlobalCart');
      
      const result = await addItem({ item });
      
      if (result.data) {
        toast.success('已加入購物車');
        return true;
      }
      return false;
    } catch (error) {
      console.error('加入購物車失敗:', error);
      toast.error('加入購物車失敗');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // 更新購物車項目
  const updateCartItem = useCallback(async (itemId: string, updates: Partial<CartItem>) => {
    try {
      setIsSyncing(true);
      const functions = getFunctions();
      const updateItem = httpsCallable(functions, 'updateGlobalCartItem');
      
      const result = await updateItem({ itemId, updates });
      
      if (result.data) {
        toast.success('購物車已更新');
        return true;
      }
      return false;
    } catch (error) {
      console.error('更新購物車失敗:', error);
      toast.error('更新購物車失敗');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // 從購物車移除項目
  const removeFromCart = useCallback(async (itemId: string) => {
    try {
      setIsSyncing(true);
      const functions = getFunctions();
      const removeItem = httpsCallable(functions, 'removeFromGlobalCart');
      
      const result = await removeItem({ itemId });
      
      if (result.data) {
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
  }, []);

  // 清空購物車
  const clearCart = useCallback(async () => {
    try {
      setIsSyncing(true);
      const functions = getFunctions();
      const clear = httpsCallable(functions, 'clearGlobalCart');
      
      const result = await clear();
      
      if (result.data) {
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
  }, []);

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