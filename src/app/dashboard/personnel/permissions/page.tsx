// src/app/dashboard/personnel/permissions/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { AdminOnly } from '@/components/PermissionGate';
import { usePermission } from '@/hooks/usePermission';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, Users, Settings, Plus, Edit3, Trash2, 
  Eye, UserCheck, AlertTriangle, CheckCircle, 
  Lock, Unlock, Crown, User
} from 'lucide-react';
import { toast } from 'sonner';

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

interface UserWithRole {
  id: string;
  name: string;
  employeeId: string;
  roleName?: string;
  roleId?: string;
  status: string;
}

function PermissionsPageContent() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('roles');
  
  const { isAdmin } = usePermission();

  // 載入角色列表
  const fetchRoles = useCallback(async () => {
    try {
      const functions = getFunctions();
      const getRolesFunction = httpsCallable(functions, 'getRoles');
      const result = await getRolesFunction();
      
      const data = result.data as any;
      if (data.status === 'success') {
        setRoles(data.roles || []);
      } else {
        toast.error('載入角色列表失敗');
      }
    } catch (error) {
      console.error('載入角色列表錯誤:', error);
      toast.error('載入角色列表失敗');
    }
  }, []);

  // 載入用戶列表（簡化版）
  const fetchUsers = useCallback(async () => {
    // 這裡可以調用現有的用戶載入邏輯
    // 暫時使用空陣列
    setUsers([]);
  }, []);

  // 初始化預設角色
  const initializeRoles = async () => {
    try {
      const functions = getFunctions();
      const initFunction = httpsCallable(functions, 'initializeDefaultRoles');
      const result = await initFunction();
      
      const data = result.data as any;
      if (data.status === 'success') {
        toast.success(`成功初始化 ${data.roles?.length || 0} 個預設角色`);
        await fetchRoles();
      } else if (data.status === 'skipped') {
        toast.info('系統已有角色，跳過初始化');
      }
    } catch (error) {
      console.error('初始化角色錯誤:', error);
      toast.error('初始化角色失敗');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchRoles(), fetchUsers()]);
      setIsLoading(false);
    };
    
    loadData();
  }, [fetchRoles, fetchUsers]);

  // 角色顏色對應
  const getRoleColor = (color?: string) => {
    switch (color) {
      case '#dc2626': return 'bg-red-500';
      case '#2563eb': return 'bg-blue-500';
      case '#059669': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // 角色圖示對應
  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'admin': return Crown;
      case 'foreman': return UserCheck;
      case 'timekeeper': return User;
      default: return Shield;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">權限管理</h1>
          <p className="text-muted-foreground">管理系統角色和使用者權限分配</p>
        </div>
        
        {/* 初始化按鈕 */}
        {roles.length === 0 && (
          <Button onClick={initializeRoles} className="bg-gradient-to-r from-blue-500 to-blue-600">
            <Plus className="mr-2 h-4 w-4" />
            初始化預設角色
          </Button>
        )}
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600 font-medium">總角色數</p>
                <p className="text-2xl font-bold text-blue-800">{roles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600 font-medium">預設角色</p>
                <p className="text-2xl font-bold text-green-800">
                  {roles.filter(r => r.isDefault).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600 font-medium">已分配用戶</p>
                <p className="text-2xl font-bold text-purple-800">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-orange-600 font-medium">自訂角色</p>
                <p className="text-2xl font-bold text-orange-800">
                  {roles.filter(r => !r.isDefault).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要內容區域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            角色管理
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            權限分配
          </TabsTrigger>
        </TabsList>

        {/* 角色管理分頁 */}
        <TabsContent value="roles" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => {
                const Icon = getRoleIcon(role.name);
                
                return (
                  <Card key={role.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${getRoleColor(role.color)}`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{role.displayName}</CardTitle>
                            <p className="text-sm text-muted-foreground">{role.name}</p>
                          </div>
                        </div>
                        
                        {role.isDefault && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="mr-1 h-3 w-3" />
                            預設
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                      
                      <div>
                        <p className="text-sm font-medium mb-2">權限數量</p>
                        <Badge variant="secondary">
                          {role.permissions?.length || 0} 項權限
                        </Badge>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="mr-2 h-4 w-4" />
                          檢視
                        </Button>
                        
                        {!role.isDefault && (
                          <>
                            <Button size="sm" variant="outline">
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 權限分配分頁 */}
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>用戶角色分配</CardTitle>
              <p className="text-muted-foreground">為用戶指派角色和權限</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">用戶角色分配功能開發中...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PermissionsPage() {
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