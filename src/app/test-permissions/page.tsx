'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPermissionsPage() {
  const { appUser, hasPermission, hasAnyPermission } = useAuth();
  const { isAdmin, isManager, isForeman, isTimekeeper, userLevel, userPermissions } = usePermission();

  // 測試權限清單
  const testPermissions = [
    'materials.view',
    'materials.manage',
    'products.view',
    'products.manage',
    'workOrders.view',
    'workOrders.manage',
    'personnel.view',
    'personnel.manage',
    'roles.manage',
    'system.admin',
    '*'
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">權限系統測試頁面</h1>

      {/* 用戶基本資訊 */}
      <Card>
        <CardHeader>
          <CardTitle>用戶基本資訊</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>姓名:</strong> {appUser?.name || '未設定'}
            </div>
            <div>
              <strong>員工ID:</strong> {appUser?.employeeId || '未設定'}
            </div>
            <div>
              <strong>角色名稱:</strong> {appUser?.roleName || '未設定'}
            </div>
            <div>
              <strong>用戶級別:</strong> {userLevel}
            </div>
            <div>
              <strong>權限數量:</strong> {userPermissions.length}
            </div>
            <div>
              <strong>狀態:</strong> {appUser?.status || '未設定'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 角色檢查結果 */}
      <Card>
        <CardHeader>
          <CardTitle>角色檢查結果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className={`p-3 rounded ${isAdmin() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <strong>是否為管理員:</strong> {isAdmin() ? '是' : '否'}
            </div>
            <div className={`p-3 rounded ${isManager() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <strong>是否為管理階層:</strong> {isManager() ? '是' : '否'}
            </div>
            <div className={`p-3 rounded ${isForeman() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <strong>是否為領班:</strong> {isForeman() ? '是' : '否'}
            </div>
            <div className={`p-3 rounded ${isTimekeeper() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <strong>是否為計時人員:</strong> {isTimekeeper() ? '是' : '否'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 權限清單 */}
      <Card>
        <CardHeader>
          <CardTitle>當前權限清單 ({userPermissions.length} 項)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {userPermissions.map((permission, index) => (
              <div key={index} className="p-2 bg-blue-50 text-blue-800 rounded text-sm">
                {permission}
              </div>
            ))}
          </div>
          {userPermissions.length === 0 && (
            <div className="text-red-500">無任何權限</div>
          )}
        </CardContent>
      </Card>

      {/* 權限測試 */}
      <Card>
        <CardHeader>
          <CardTitle>權限測試結果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {testPermissions.map((permission) => (
              <div
                key={permission}
                className={`p-3 rounded ${hasPermission(permission) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
              >
                <div className="font-medium">{permission}</div>
                <div className="text-sm">{hasPermission(permission) ? '✅ 有權限' : '❌ 無權限'}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 群組權限測試 */}
      <Card>
        <CardHeader>
          <CardTitle>群組權限測試</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <strong>原物料權限群組:</strong>
              <span className={`ml-2 px-2 py-1 rounded ${hasAnyPermission(['materials.view', 'materials.manage']) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {hasAnyPermission(['materials.view', 'materials.manage']) ? '有權限' : '無權限'}
              </span>
            </div>
            <div>
              <strong>產品管理權限群組:</strong>
              <span className={`ml-2 px-2 py-1 rounded ${hasAnyPermission(['products.view', 'products.manage']) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {hasAnyPermission(['products.view', 'products.manage']) ? '有權限' : '無權限'}
              </span>
            </div>
            <div>
              <strong>人員管理權限群組:</strong>
              <span className={`ml-2 px-2 py-1 rounded ${hasAnyPermission(['personnel.view', 'personnel.manage']) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {hasAnyPermission(['personnel.view', 'personnel.manage']) ? '有權限' : '無權限'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 調試資訊 */}
      <Card>
        <CardHeader>
          <CardTitle>調試資訊</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(appUser, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}