'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserCheck, Database, AlertTriangle } from 'lucide-react';

// 直接定義完整權限列表，避免import問題
const FULL_PERMISSIONS = [
  'personnel.view', 'personnel.manage', 'time.view', 'time.manage',
  'suppliers.view', 'suppliers.manage', 'purchase.view', 'purchase.manage',
  'materials.view', 'materials.manage', 'fragrances.view', 'fragrances.manage',
  'products.view', 'products.manage', 'workOrders.view', 'workOrders.manage',
  'inventory.view', 'inventory.manage', 'inventoryRecords.view', 'cost.view',
  'timeReports.view', 'roles.manage', 'system.settings'
];

export default function FixPermissionsPage() {
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
        toast.error(`找不到工號 ${targetEmployeeId} 的用戶`);
        return;
      }
      
      // 更新用戶權限
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      await updateDoc(userDoc.ref, {
        roleName: '系統管理員',
        permissions: FULL_PERMISSIONS,
        updatedAt: serverTimestamp(),
        fixPermissionsAt: new Date().toISOString(),
        fixPermissionsNote: '緊急權限修復'
      });
      
      toast.success(`✅ 已為 ${userData.name} (${targetEmployeeId}) 設定完整管理員權限`);
      
      console.log('權限設定完成:', {
        user: userData.name,
        employeeId: targetEmployeeId,
        permissionCount: FULL_PERMISSIONS.length,
        permissions: FULL_PERMISSIONS
      });
      
    } catch (error) {
      console.error('設定權限失敗:', error);
      toast.error('設定權限失敗: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">權限系統緊急修復</h1>
          <p className="text-lg text-gray-600">為工號 {targetEmployeeId} 快速恢復管理員權限</p>
        </div>

        {/* 緊急提示 */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              緊急修復工具
            </CardTitle>
          </CardHeader>
          <CardContent className="text-red-700">
            <p>此頁面用於緊急恢復權限系統管理功能。操作後該用戶將獲得完整的系統管理員權限。</p>
          </CardContent>
        </Card>

        {/* 操作區域 */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-6 w-6" />
              權限修復操作
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">操作說明</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 此功能將直接更新 Firestore 資料庫</li>
                <li>• 為工號 {targetEmployeeId} 設定完整管理員權限</li>
                <li>• 包含所有 {FULL_PERMISSIONS.length} 項系統權限</li>
                <li>• 設定後該用戶需要重新登入以載入新權限</li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  目標員工編號
                </label>
                <input
                  type="text"
                  value={targetEmployeeId}
                  onChange={(e) => setTargetEmployeeId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="請輸入員工編號"
                />
              </div>
              
              <Button 
                onClick={setAdminPermissions}
                disabled={isProcessing || !targetEmployeeId.trim()}
                className="w-full py-3 text-lg"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Database className="h-5 w-5 mr-2 animate-spin" />
                    處理中...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-5 w-5 mr-2" />
                    為工號 {targetEmployeeId} 設定管理員權限
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 權限列表 */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>將設定的權限列表 ({FULL_PERMISSIONS.length} 項)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {FULL_PERMISSIONS.map((permission, index) => (
                <Badge key={index} variant="outline" className="text-xs py-1">
                  {permission}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 使用說明 */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>操作後的步驟</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-sm space-y-2">
              <li>1. 等待權限設定完成的確認訊息</li>
              <li>2. 使用工號 {targetEmployeeId} 重新登入系統</li>
              <li>3. 前往「成員管理」→「權限管理」重建角色系統</li>
              <li>4. 為其他用戶分配適當的角色和權限</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}