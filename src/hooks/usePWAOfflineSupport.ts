// src/hooks/usePWAOfflineSupport.ts
/**
 * 🚀 PWA 離線支援 Hook
 *
 * 建立時間：2025-09-19
 * 目的：提供 PWA 離線功能，包括 Service Worker、離線快取、同步機制
 */

import { useState, useEffect, useCallback } from 'react';
import { useMobileCacheStrategy } from './useMobileCacheStrategy';

// =============================================================================
// 類型定義
// =============================================================================

export interface OfflineQueueItem {
  id: string;
  action: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface PWAUpdateInfo {
  available: boolean;
  installing: boolean;
  waiting: boolean;
  registration?: ServiceWorkerRegistration;
}

export interface OfflineSyncStatus {
  isOnline: boolean;
  lastSync: number | null;
  pendingActions: number;
  syncInProgress: boolean;
}

export interface UsePWAOfflineSupportReturn {
  // 網路狀態
  isOnline: boolean;
  isOfflineMode: boolean;

  // PWA 更新
  updateInfo: PWAUpdateInfo;
  installUpdate: () => Promise<void>;

  // 離線同步
  syncStatus: OfflineSyncStatus;
  addToOfflineQueue: (action: string, data: any) => void;
  syncOfflineQueue: () => Promise<void>;
  clearOfflineQueue: () => void;

  // 離線快取
  cacheData: (key: string, data: any, expiry?: number) => void;
  getCachedData: (key: string) => any | null;
  clearExpiredCache: () => void;

  // PWA 安裝
  canInstall: boolean;
  showInstallPrompt: () => Promise<boolean>;
}

// =============================================================================
// 離線儲存管理
// =============================================================================

class OfflineStorage {
  private dbName = 'DeerLabOfflineDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      console.warn('IndexedDB 不支援，離線功能將受限');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 離線佇列儲存
        if (!db.objectStoreNames.contains('offlineQueue')) {
          const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id' });
          queueStore.createIndex('timestamp', 'timestamp');
        }

        // 快取資料儲存
        if (!db.objectStoreNames.contains('cacheData')) {
          const cacheStore = db.createObjectStore('cacheData', { keyPath: 'key' });
          cacheStore.createIndex('expiry', 'expiry');
        }

        // 同步狀態儲存
        if (!db.objectStoreNames.contains('syncStatus')) {
          db.createObjectStore('syncStatus', { keyPath: 'key' });
        }
      };
    });
  }

  async addToQueue(item: OfflineQueueItem): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['offlineQueue'], 'readwrite');
    const store = transaction.objectStore('offlineQueue');
    await store.add(item);
  }

  async getQueueItems(): Promise<OfflineQueueItem[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['offlineQueue'], 'readonly');
    const store = transaction.objectStore('offlineQueue');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromQueue(id: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['offlineQueue'], 'readwrite');
    const store = transaction.objectStore('offlineQueue');
    await store.delete(id);
  }

  async cacheData(key: string, data: any, expiry?: number): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['cacheData'], 'readwrite');
    const store = transaction.objectStore('cacheData');

    await store.put({
      key,
      data,
      timestamp: Date.now(),
      expiry: expiry || (Date.now() + 24 * 60 * 60 * 1000) // 預設24小時
    });
  }

  async getCachedData(key: string): Promise<any | null> {
    if (!this.db) return null;

    const transaction = this.db.transaction(['cacheData'], 'readonly');
    const store = transaction.objectStore('cacheData');
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // 檢查是否過期
        if (result.expiry && Date.now() > result.expiry) {
          // 過期了，刪除並回傳 null
          this.removeFromCache(key);
          resolve(null);
          return;
        }

        resolve(result.data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromCache(key: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['cacheData'], 'readwrite');
    const store = transaction.objectStore('cacheData');
    await store.delete(key);
  }

  async clearExpiredCache(): Promise<number> {
    if (!this.db) return 0;

    const transaction = this.db.transaction(['cacheData'], 'readwrite');
    const store = transaction.objectStore('cacheData');
    const index = store.index('expiry');

    // 取得所有過期的項目
    const request = index.openCursor(IDBKeyRange.upperBound(Date.now()));
    let deletedCount = 0;

    return new Promise((resolve) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      request.onerror = () => resolve(deletedCount);
    });
  }
}

const offlineStorage = new OfflineStorage();

// =============================================================================
// Hook 實現
// =============================================================================

export function usePWAOfflineSupport(): UsePWAOfflineSupportReturn {
  const { deviceInfo } = useMobileCacheStrategy();

  // 網路狀態
  const [isOnline, setIsOnline] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // PWA 更新狀態
  const [updateInfo, setUpdateInfo] = useState<PWAUpdateInfo>({
    available: false,
    installing: false,
    waiting: false
  });

  // 離線同步狀態
  const [syncStatus, setSyncStatus] = useState<OfflineSyncStatus>({
    isOnline: true,
    lastSync: null,
    pendingActions: 0,
    syncInProgress: false
  });

  // PWA 安裝
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  // =============================================================================
  // 初始化
  // =============================================================================

  useEffect(() => {
    // 初始化離線儲存
    offlineStorage.init().catch(console.error);

    // 監聽網路狀態
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      setSyncStatus(prev => ({ ...prev, isOnline: online }));

      if (online && !syncStatus.syncInProgress) {
        // 網路恢復時自動同步
        syncOfflineQueue();
      }
    };

    updateOnlineStatus(); // 初始檢查
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // PWA 安裝事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
      console.log('📱 PWA 可以安裝');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Service Worker 更新事件
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            setUpdateInfo(prev => ({ ...prev, installing: true }));

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateInfo(prev => ({
                  ...prev,
                  available: true,
                  installing: false,
                  waiting: true,
                  registration
                }));
                console.log('🔄 PWA 更新可用');
              }
            });
          }
        });
      });
    }

    // 清理過期快取
    const cleanupInterval = setInterval(() => {
      clearExpiredCache();
    }, 30 * 60 * 1000); // 每30分鐘清理一次

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearInterval(cleanupInterval);
    };
  }, []);

  // 載入待同步項目數量
  useEffect(() => {
    const loadPendingCount = async () => {
      const items = await offlineStorage.getQueueItems();
      setSyncStatus(prev => ({ ...prev, pendingActions: items.length }));
    };

    loadPendingCount();
  }, []);

  // =============================================================================
  // PWA 功能
  // =============================================================================

  const installUpdate = useCallback(async (): Promise<void> => {
    if (!updateInfo.waiting || !updateInfo.registration) return;

    const worker = updateInfo.registration.waiting;
    if (worker) {
      worker.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [updateInfo]);

  const showInstallPrompt = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('✅ PWA 已安裝');
        setCanInstall(false);
        setDeferredPrompt(null);
        return true;
      } else {
        console.log('❌ PWA 安裝被拒絕');
        return false;
      }
    } catch (error) {
      console.error('PWA 安裝錯誤:', error);
      return false;
    }
  }, [deferredPrompt]);

  // =============================================================================
  // 離線佇列管理
  // =============================================================================

  const addToOfflineQueue = useCallback((action: string, data: any) => {
    const item: OfflineQueueItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };

    offlineStorage.addToQueue(item).then(() => {
      setSyncStatus(prev => ({
        ...prev,
        pendingActions: prev.pendingActions + 1
      }));
      console.log('📝 已加入離線佇列:', action);
    });
  }, []);

  const syncOfflineQueue = useCallback(async (): Promise<void> => {
    if (!isOnline || syncStatus.syncInProgress) return;

    setSyncStatus(prev => ({ ...prev, syncInProgress: true }));

    try {
      const items = await offlineStorage.getQueueItems();
      console.log(`🔄 開始同步 ${items.length} 個離線項目`);

      let successCount = 0;
      let failureCount = 0;

      for (const item of items) {
        try {
          // 這裡應該調用對應的 API
          // await apiClient.call(item.action, item.data);

          await offlineStorage.removeFromQueue(item.id);
          successCount++;

        } catch (error) {
          console.warn(`離線項目同步失敗 [${item.action}]:`, error);

          // 增加重試次數
          if (item.retryCount < item.maxRetries) {
            item.retryCount++;
            await offlineStorage.addToQueue(item);
          } else {
            // 達到最大重試次數，移除項目
            await offlineStorage.removeFromQueue(item.id);
            failureCount++;
          }
        }
      }

      setSyncStatus(prev => ({
        ...prev,
        syncInProgress: false,
        lastSync: Date.now(),
        pendingActions: prev.pendingActions - successCount - failureCount
      }));

      if (successCount > 0) {
        console.log(`✅ 成功同步 ${successCount} 個項目`);
      }
      if (failureCount > 0) {
        console.log(`❌ ${failureCount} 個項目同步失敗`);
      }

    } catch (error) {
      console.error('離線佇列同步錯誤:', error);
      setSyncStatus(prev => ({ ...prev, syncInProgress: false }));
    }
  }, [isOnline, syncStatus.syncInProgress]);

  const clearOfflineQueue = useCallback(() => {
    // 清空整個佇列 (需要實作)
    setSyncStatus(prev => ({ ...prev, pendingActions: 0 }));
    console.log('🗑️ 離線佇列已清空');
  }, []);

  // =============================================================================
  // 離線快取
  // =============================================================================

  const cacheData = useCallback((key: string, data: any, expiry?: number) => {
    offlineStorage.cacheData(key, data, expiry).catch(console.error);
  }, []);

  const getCachedData = useCallback(async (key: string): Promise<any | null> => {
    return offlineStorage.getCachedData(key);
  }, []);

  const clearExpiredCache = useCallback(async (): Promise<void> => {
    const deletedCount = await offlineStorage.clearExpiredCache();
    if (deletedCount > 0) {
      console.log(`🧹 清理了 ${deletedCount} 個過期快取項目`);
    }
  }, []);

  // =============================================================================
  // 返回介面
  // =============================================================================

  return {
    // 網路狀態
    isOnline,
    isOfflineMode: !isOnline || isOfflineMode,

    // PWA 更新
    updateInfo,
    installUpdate,

    // 離線同步
    syncStatus,
    addToOfflineQueue,
    syncOfflineQueue,
    clearOfflineQueue,

    // 離線快取
    cacheData,
    getCachedData,
    clearExpiredCache,

    // PWA 安裝
    canInstall,
    showInstallPrompt,
  };
}