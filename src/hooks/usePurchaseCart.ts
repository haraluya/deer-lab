import { useState, useEffect } from 'react';

export function usePurchaseCart() {
  const [cartItemCount, setCartItemCount] = useState(0);

  useEffect(() => {
    // 從 localStorage 讀取採購車資料
    const loadCartCount = () => {
      try {
        const savedCart = localStorage.getItem('purchaseCart');
        if (savedCart) {
          const cartItems = JSON.parse(savedCart);
          // 計算購物車中的項目數量（不同品項的數量）
          const itemCount = cartItems.length;
          setCartItemCount(itemCount);
        } else {
          setCartItemCount(0);
        }
      } catch (error) {
        console.error("載入採購車數量失敗:", error);
        setCartItemCount(0);
      }
    };

    // 初始載入
    loadCartCount();

    // 監聽 localStorage 變化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'purchaseCart') {
        loadCartCount();
      }
    };

    // 監聽同頁面的變化
    const handleCustomEvent = () => {
      loadCartCount();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('purchaseCartUpdated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('purchaseCartUpdated', handleCustomEvent);
    };
  }, []);

  return cartItemCount;
}
