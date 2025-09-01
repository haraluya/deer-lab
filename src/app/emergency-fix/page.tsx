'use client';

import { useState } from 'react';
// import { toast } from 'sonner';

// 直接定義完整權限列表
const FULL_PERMISSIONS = [
  'personnel.view', 'personnel.manage', 'time.view', 'time.manage',
  'suppliers.view', 'suppliers.manage', 'purchase.view', 'purchase.manage',
  'materials.view', 'materials.manage', 'fragrances.view', 'fragrances.manage',
  'products.view', 'products.manage', 'workOrders.view', 'workOrders.manage',
  'inventory.view', 'inventory.manage', 'inventoryRecords.view', 'cost.view',
  'timeReports.view', 'roles.manage', 'system.settings'
];

export default function EmergencyFixPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = useState('052');

  const setAdminPermissions = async () => {
    setIsProcessing(true);
    try {
      // 動態導入Firebase模組避免SSR問題
      const { getFirestore, collection, query, where, getDocs, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { getApp } = await import('firebase/app');
      
      // 確保Firebase已初始化
      let app;
      try {
        app = getApp();
      } catch (error) {
        // Firebase未初始化，需要初始化
        const { initializeApp } = await import('firebase/app');
        const firebaseConfig = {
          apiKey: "AIzaSyCgZpAhUG0GZC0uWOUTQ0FIhKZBwc6pC2I",
          authDomain: "deer-lab.firebaseapp.com",
          projectId: "deer-lab",
          storageBucket: "deer-lab.appspot.com",
          messagingSenderId: "1005802674127",
          appId: "1:1005802674127:web:8a3e3f3e6b6c7d8e9f0a1b"
        };
        app = initializeApp(firebaseConfig);
      }
      
      const db = getFirestore(app);
      
      // 查找目標員工編號的用戶
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('employeeId', '==', targetEmployeeId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert(`找不到工號 ${targetEmployeeId} 的用戶`);
        return;
      }
      
      // 更新用戶權限
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      await updateDoc(userDoc.ref, {
        roleName: '系統管理員',
        permissions: FULL_PERMISSIONS,
        updatedAt: serverTimestamp(),
        emergencyFixAt: new Date().toISOString(),
        emergencyFixNote: '緊急權限修復 - 恢復系統管理功能'
      });
      
      alert(`✅ 權限修復完成！${userData.name} (${targetEmployeeId}) 已獲得完整管理員權限`);
      
      console.log('緊急權限修復完成:', {
        user: userData.name,
        employeeId: targetEmployeeId,
        permissionCount: FULL_PERMISSIONS.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('權限修復失敗:', error);
      alert('修復失敗: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">緊急權限修復</h1>
          <p className="text-gray-600">快速恢復系統管理員權限</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              員工編號
            </label>
            <input
              type="text"
              value={targetEmployeeId}
              onChange={(e) => setTargetEmployeeId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="請輸入員工編號"
            />
          </div>
          
          <button 
            onClick={setAdminPermissions}
            disabled={isProcessing || !targetEmployeeId.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                處理中...
              </div>
            ) : (
              `修復工號 ${targetEmployeeId} 的權限`
            )}
          </button>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">操作說明：</h3>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• 此功能會直接更新資料庫</li>
            <li>• 設定後請重新登入系統</li>
            <li>• 獲得 {FULL_PERMISSIONS.length} 項完整權限</li>
            <li>• 可訪問所有系統功能</li>
          </ul>
        </div>
      </div>
    </div>
  );
}