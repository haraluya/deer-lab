// src/app/dashboard/personnel/permissions/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useApiForm } from '@/hooks/useApiClient';
import { AdminOnly } from '@/components/PermissionGate';
import { usePermission } from '@/hooks/usePermission';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Shield, Settings, Plus, Eye, UserCheck, CheckCircle,
  Lock, Crown, User, X, ArrowLeft, Info, AlertTriangle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import Link from 'next/link';

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
  color: string;
  createdAt?: any;
  updatedAt?: any;
}

function PermissionsPageContent() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRoleDetailDialog, setShowRoleDetailDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const apiClient = useApiForm();

  // 載入角色資料 - 開發環境直接使用預設資料
  const fetchRoles = async () => {
    console.log('🔄 載入預設角色資料（開發模式）...');

    // 在開發環境中直接使用預設角色，避免 API 調用錯誤
    const defaultRoles = [
      {
        id: 'admin-role',
        name: 'admin',
        displayName: '系統管理員',
        description: '擁有系統完整管理權限，包括人員管理、角色設定等所有功能',
        permissions: [
          'system.admin', 'personnel.manage', 'personnel.create', 'personnel.edit', 'personnel.delete',
          'roles.manage', 'roles.view', 'time.manage', 'workOrders.manage', 'suppliers.manage',
          'materials.manage', 'products.manage', 'inventory.manage', 'cost.view'
        ],
        isDefault: true,
        color: '#dc2626'
      },
      {
        id: 'foreman-role',
        name: 'foreman',
        displayName: '生產領班',
        description: '負責生產管理和工時記錄，具有生產相關的管理權限',
        permissions: [
          'personnel.view', 'time.manage', 'time.create', 'time.edit',
          'workOrders.manage', 'workOrders.create', 'workOrders.edit',
          'materials.view', 'products.view', 'inventory.view'
        ],
        isDefault: true,
        color: '#2563eb'
      },
      {
        id: 'timekeeper-role',
        name: 'timekeeper',
        displayName: '計時人員',
        description: '專門負責工時記錄和基本資料查看',
        permissions: [
          'time.view', 'time.create', 'time.edit',
          'personnel.view', 'workOrders.view',
          'timeReports.view'
        ],
        isDefault: true,
        color: '#059669'
      }
    ];

    setRoles(defaultRoles);
    console.log(`✅ 載入 ${defaultRoles.length} 個預設角色`);
  };

  // 初始化預設角色
  const initializeRoles = async () => {
    try {
      const result = await apiClient.call('initializeDefaultRoles');
      if (result.success) {
        toast.success('預設角色初始化成功');
        fetchRoles();
      } else {
        toast.error('預設角色初始化失敗');
      }
    } catch (error) {
      console.error('初始化角色時發生錯誤:', error);
      toast.error('初始化角色失敗，請稍後再試');
    }
  };

  // 查看角色詳情
  const handleViewRole = (role: Role) => {
    setSelectedRole(role);
    setShowRoleDetailDialog(true);
  };

  // 載入資料
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchRoles();
      setIsLoading(false);
    };
    loadData();
  }, []); // 只在組件掛載時執行一次

  // 獲取角色顏色樣式
  const getRoleColorClass = (color: string) => {
    switch (color) {
      case '#dc2626': return 'bg-red-500';
      case '#2563eb': return 'bg-blue-500';
      case '#059669': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // 獲取角色圖示
  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'admin': return Crown;
      case 'foreman': return UserCheck;
      case 'timekeeper': return User;
      default: return Shield;
    }
  };

  // 獲取權限中文描述
  const getPermissionDescription = (permission: string): string => {
    const permissionMap: Record<string, string> = {
      // 人員管理
      'personnel.view': '👥 查看人員資料',
      'personnel.manage': '👥 管理人員資料',
      'personnel.create': '👥 新增人員',
      'personnel.edit': '👥 編輯人員',
      'personnel.delete': '👥 刪除人員',

      // 工時管理
      'time.view': '⏰ 查看工時記錄',
      'time.manage': '⏰ 管理工時記錄',
      'time.create': '⏰ 新增工時',
      'time.edit': '⏰ 編輯工時',
      'time.delete': '⏰ 刪除工時',

      // 供應商管理
      'suppliers.view': '🏢 查看供應商',
      'suppliers.manage': '🏢 管理供應商',
      'suppliers.create': '🏢 新增供應商',
      'suppliers.edit': '🏢 編輯供應商',
      'suppliers.delete': '🏢 刪除供應商',

      // 採購管理
      'purchase.view': '🛒 查看採購單',
      'purchase.manage': '🛒 管理採購單',
      'purchaseOrders.view': '🛒 查看採購訂單',
      'purchaseOrders.manage': '🛒 管理採購訂單',
      'purchaseOrders.create': '🛒 新增採購單',
      'purchaseOrders.edit': '🛒 編輯採購單',
      'purchaseOrders.delete': '🛒 刪除採購單',

      // 原料管理
      'materials.view': '🧪 查看原物料',
      'materials.manage': '🧪 管理原物料',
      'materials.create': '🧪 新增原料',
      'materials.edit': '🧪 編輯原料',
      'materials.delete': '🧪 刪除原料',

      // 香精配方
      'fragrances.view': '🌸 查看香精配方',
      'fragrances.manage': '🌸 管理香精配方',

      // 產品管理
      'products.view': '📦 查看產品',
      'products.manage': '📦 管理產品',
      'products.create': '📦 新增產品',
      'products.edit': '📦 編輯產品',
      'products.delete': '📦 刪除產品',

      // 工單管理
      'workOrders.view': '📋 查看生產工單',
      'workOrders.manage': '📋 管理生產工單',
      'workOrders.create': '📋 新增工單',
      'workOrders.edit': '📋 編輯工單',
      'workOrders.delete': '📋 刪除工單',

      // 庫存管理
      'inventory.view': '📊 查看庫存資料',
      'inventory.manage': '📊 管理庫存調整',

      // 記錄與報表
      'inventoryRecords.view': '📈 查看庫存記錄',
      'cost.view': '💰 查看成本資料',
      'timeReports.view': '📋 查看工時報表',

      // 角色權限
      'roles.view': '🔐 查看角色',
      'roles.manage': '🔐 管理角色權限',
      'roles.create': '🔐 新增角色',
      'roles.edit': '🔐 編輯角色',
      'roles.delete': '🔐 刪除角色',

      // 系統管理
      'system.settings': '⚙️ 系統設定管理',
      'system.admin': '👑 系統管理員權限'
    };
    return permissionMap[permission] || `❓ ${permission}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/personnel"
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">權限管理</h1>
            <p className="text-muted-foreground">檢視系統預設角色和權限設定（系統管理員、生產領班、計時人員）</p>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-2">
          {roles.length === 0 && (
            <Button onClick={initializeRoles} disabled={apiClient.loading} className="bg-gradient-to-r from-blue-500 to-blue-600">
              <Plus className="mr-2 h-4 w-4" />
              初始化預設角色
            </Button>
          )}
        </div>
      </div>

      {/* 新手引導提示 */}
      {roles.length === 0 && (
        <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 font-semibold">
            🚀 歡迎使用權限管理系統
          </AlertTitle>
          <AlertDescription className="text-amber-700 text-sm">
            <div className="space-y-2">
              <div><strong>首次使用提醒</strong>：系統檢測到您是第一次使用權限管理功能</div>
              <div className="space-y-1">
                <div>📋 <strong>初始化步驟</strong>：</div>
                <div className="ml-4 space-y-1">
                  <div>1️⃣ 點擊右上角「初始化預設角色」按鈕</div>
                  <div>2️⃣ 系統會自動建立三種角色：系統管理員、生產領班、計時人員</div>
                  <div>3️⃣ 完成後您可以在「用戶分配」標籤中為成員指派角色</div>
                </div>
                <div>💡 <strong>權限說明</strong>：角色系統將控制用戶在系統中可以訪問的功能範圍</div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600 font-medium">總角色數</p>
                <p className="text-2xl font-bold text-blue-700">{roles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Lock className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600 font-medium">權限層級</p>
                <p className="text-2xl font-bold text-green-700">3</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-600 font-medium">預設權限</p>
                <p className="text-2xl font-bold text-yellow-700">3</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600 font-medium">系統狀態</p>
                <p className="text-2xl font-bold text-purple-700">正常</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 角色管理區域 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold">角色管理</h2>
        </div>

        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map((role) => {
                const Icon = getRoleIcon(role.name);

                return (
                  <Card key={role.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getRoleColorClass(role.color)} text-white`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{role.displayName || role.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">權限數量</span>
                        <Badge variant="secondary">
                          {role.permissions?.length || 0} 項權限
                        </Badge>
                      </div>

                      <div className="flex justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleViewRole(role)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          檢視權限詳情
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 角色詳情對話框 */}
      <Dialog open={showRoleDetailDialog} onOpenChange={setShowRoleDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedRole && (
                <>
                  <div className={`p-2 rounded-lg ${getRoleColorClass(selectedRole.color)} text-white`}>
                    {React.createElement(getRoleIcon(selectedRole.name), { className: "h-6 w-6 text-white" })}
                  </div>
                  <div>
                    <div className="text-xl font-bold">{selectedRole.displayName || selectedRole.name}</div>
                    <div className="text-sm text-muted-foreground font-normal">
                      角色詳細資訊與權限清單
                    </div>
                  </div>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedRole?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {selectedRole && (
              <>
                {/* 角色基本資訊卡片 */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">角色名稱</p>
                        <p className="font-semibold text-blue-700">{selectedRole.displayName}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">系統代碼</p>
                        <p className="font-semibold text-blue-700">{selectedRole.name}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">權限數量</p>
                        <p className="font-semibold text-blue-700">{selectedRole.permissions?.length || 0} 項</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">預設角色</p>
                        <p className="font-semibold text-blue-700">{selectedRole.isDefault ? '是' : '否'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 權限詳情區域 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Lock className="h-5 w-5 text-blue-600" />
                    權限詳情 ({selectedRole.permissions?.length || 0} 項)
                  </h3>

                  {selectedRole.permissions && selectedRole.permissions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedRole.permissions.map((permission, index) => (
                        <div
                          key={index}
                          className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="font-medium text-sm">
                            {getPermissionDescription(permission)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {permission}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>此角色尚未設定任何權限</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDetailDialog(false)}>
              <X className="mr-2 h-4 w-4" />
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PermissionsPage() {
  const { isAdmin } = usePermission();

  return (
    <AdminOnly fallback={
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertTriangle className="h-16 w-16 text-orange-500" />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">權限不足</h2>
          <p className="text-muted-foreground">只有系統管理員可以訪問權限管理頁面</p>
        </div>
      </div>
    }>
      <PermissionsPageContent />
    </AdminOnly>
  );
}