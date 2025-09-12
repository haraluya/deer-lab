// src/app/dashboard/personnel/permissions/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useApiForm } from '@/hooks/useApiClient';
import { AdminOnly } from '@/components/PermissionGate';
import { usePermission } from '@/hooks/usePermission';
import { RoleEditDialog } from '@/components/RoleEditDialog';
import { RoleCreateDialog } from '@/components/RoleCreateDialog';
import { UserRoleAssignDialog } from '@/components/UserRoleAssignDialog';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, Users, Settings, Plus, Edit3, Trash2, 
  Eye, UserCheck, AlertTriangle, CheckCircle, 
  Lock, Unlock, Crown, User, X, ArrowLeft, Info
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

interface UserWithRole {
  id: string;
  uid: string;
  name: string;
  employeeId: string;
  phone?: string;
  roleName?: string;
  roleId?: string;
  status: string;
  permissions?: string[];
}

function PermissionsPageContent() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('roles');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showRoleDetailDialog, setShowRoleDetailDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [showEditRoleDialog, setShowEditRoleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showCreateRoleDialog, setShowCreateRoleDialog] = useState(false);
  const [showUserRoleAssignDialog, setShowUserRoleAssignDialog] = useState(false);
  const [assigningUser, setAssigningUser] = useState<UserWithRole | null>(null);
  
  const { isAdmin } = usePermission();
  const apiClient = useApiForm();

  // 載入角色列表
  const fetchRoles = useCallback(async () => {
    console.log('📋 開始載入角色列表');
    
    // 優先嘗試本地 Firestore 查詢（避免 Functions 問題）
    try {
      const { getFirestore, collection, getDocs, orderBy, query } = await import('firebase/firestore');
      const db = getFirestore();
      
      console.log('🔥 使用本地 Firestore 載入角色');
      const rolesQuery = query(collection(db, 'roles'), orderBy('createdAt', 'asc'));
      const rolesSnapshot = await getDocs(rolesQuery);
      
      const localRoles = rolesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Role[];
      
      setRoles(localRoles);
      
      if (localRoles.length === 0) {
        console.log('⚠️  系統中沒有角色');
        toast.info('系統中尚未有角色，請初始化預設角色');
      } else {
        console.log(`✅ 成功載入 ${localRoles.length} 個角色:`, localRoles.map(r => r.displayName));
        toast.success(`成功載入 ${localRoles.length} 個角色`);
      }
      return; // 成功後直接返回
    } catch (localError) {
      console.warn('⚠️  本地 Firestore 查詢失敗，嘗試 Functions:', localError);
    }

    // 如果本地查詢失敗，才嘗試統一 API 客戶端
    try {
      const result = await apiClient.callGeneric('getRoles');
      
      if (result.success && result.data) {
        const roles = result.data.roles || [];
        setRoles(roles);
        toast.success(`載入 ${roles.length} 個角色（統一 API）`);
      } else {
        toast.error('載入角色列表失敗');
      }
    } catch (error) {
      console.error('❌ 統一 API 和本地查詢都失敗:', error);
      toast.error('載入角色列表失敗，請檢查網路連線');
    }
  }, [apiClient]);

  // 載入用戶列表
  const fetchUsers = useCallback(async () => {
    console.log('📋 開始載入用戶列表');
    
    try {
      const { getFirestore, collection, getDocs, orderBy, query } = await import('firebase/firestore');
      const db = getFirestore();
      
      const usersQuery = query(collection(db, 'users'), orderBy('name', 'asc'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const usersList: UserWithRole[] = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        // 解析角色資訊
        let roleName = userData.roleName || '未設定';
        let roleId = '';
        
        if (userData.roleRef) {
          try {
            const { getDoc } = await import('firebase/firestore');
            const roleDoc = await getDoc(userData.roleRef);
            if (roleDoc.exists()) {
              const roleData = roleDoc.data() as any;
              roleName = roleData?.displayName || roleData?.name || '未知角色';
              roleId = roleDoc.id;
            }
          } catch (roleError) {
            console.warn('載入角色資訊失敗:', roleError);
          }
        }
        
        usersList.push({
          id: userDoc.id,
          uid: userData.uid || userDoc.id,
          name: userData.name || '未知用戶',
          employeeId: userData.employeeId || '',
          phone: userData.phone || '',
          roleName,
          roleId,
          status: userData.status || 'active',
          permissions: userData.permissions || [],
        });
      }
      
      setUsers(usersList);
      console.log(`✅ 成功載入 ${usersList.length} 個用戶`);
      
    } catch (error) {
      console.error('❌ 載入用戶列表失敗:', error);
      toast.error('載入用戶列表失敗');
    }
  }, []);

  // 初始化預設角色
  const initializeRoles = async () => {
    try {
      const result = await apiClient.callGeneric('initializeDefaultRoles');
      
      if (result.success && result.data) {
        if (result.data.status === 'success') {
          toast.success(`成功初始化 ${result.data.roles?.length || 0} 個預設角色`);
          await fetchRoles();
        } else if (result.data.status === 'skipped') {
          toast.info('系統已有角色，跳過初始化');
        }
      }
    } catch (error) {
      console.error('初始化角色錯誤:', error);
      
      // 如果 Functions 失敗，嘗試本地 Firestore 初始化
      try {
        const { getFirestore, collection, doc, setDoc, getDocs, serverTimestamp } = await import('firebase/firestore');
        const db = getFirestore();
        
        // 檢查是否已有角色
        const rolesCollection = collection(db, 'roles');
        const existingRoles = await getDocs(rolesCollection);
        
        if (!existingRoles.empty) {
          toast.info('系統已有角色，跳過初始化');
          return;
        }

        // 定義預設角色
        const defaultRoles = [
          {
            id: 'admin',
            name: 'admin',
            displayName: '系統管理員',
            description: '擁有系統全部權限，可管理所有功能和用戶',
            permissions: [
              'personnel.view', 'personnel.manage', 'time.view', 'time.manage',
              'suppliers.view', 'suppliers.manage', 'purchase.view', 'purchase.manage',
              'materials.view', 'materials.manage', 'fragrances.view', 'fragrances.manage',
              'products.view', 'products.manage', 'workOrders.view', 'workOrders.manage',
              'inventory.view', 'inventory.manage', 'inventoryRecords.view', 'cost.view',
              'timeReports.view', 'roles.manage', 'system.settings'
            ],
            isDefault: true,
            color: '#dc2626'
          },
          {
            id: 'foreman',
            name: 'foreman', 
            displayName: '生產領班',
            description: '負責生產管理，可管理工單、物料、產品，無成員管理權限',
            permissions: [
              'suppliers.view', 'purchase.view', 'purchase.manage',
              'materials.view', 'materials.manage', 'fragrances.view', 'fragrances.manage',
              'products.view', 'products.manage', 'workOrders.view', 'workOrders.manage',
              'inventory.view', 'inventory.manage', 'inventoryRecords.view', 'cost.view',
              'timeReports.view', 'time.view', 'time.manage'
            ],
            isDefault: true,
            color: '#2563eb'
          },
          {
            id: 'timekeeper',
            name: 'timekeeper',
            displayName: '計時人員', 
            description: '主要負責工時記錄，可查看生產資料但無法編輯',
            permissions: [
              'materials.view', 'fragrances.view', 'products.view', 'workOrders.view',
              'time.view', 'time.manage'
            ],
            isDefault: true,
            color: '#059669'
          }
        ];

        // 創建角色
        let createdCount = 0;
        for (const role of defaultRoles) {
          const roleRef = doc(db, 'roles', role.id);
          await setDoc(roleRef, {
            ...role,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          createdCount++;
        }

        toast.success(`成功初始化 ${createdCount} 個角色（本地模式）`);
        await fetchRoles();
      } catch (localError) {
        console.error('本地初始化角色失敗:', localError);
        toast.error('初始化角色失敗');
      }
    }
  };

  // 修復預設角色標記
  const fixDefaultRoles = async () => {
    try {
      const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
      const db = getFirestore();
      
      // 定義預設角色的 ID 和屬性
      const defaultRoleUpdates = [
        {
          id: 'admin',
          updates: {
            isDefault: true,
            color: '#dc2626',
            name: 'admin',
            displayName: '系統管理員'
          }
        },
        {
          id: 'foreman', 
          updates: {
            isDefault: true,
            color: '#2563eb',
            name: 'foreman',
            displayName: '生產領班'
          }
        },
        {
          id: 'timekeeper',
          updates: {
            isDefault: true,
            color: '#059669',
            name: 'timekeeper',
            displayName: '計時人員'
          }
        }
      ];

      let updatedCount = 0;
      for (const roleUpdate of defaultRoleUpdates) {
        // 尋找對應的角色
        const existingRole = roles.find(role => 
          role.id === roleUpdate.id || 
          role.name === roleUpdate.updates.name ||
          role.displayName === roleUpdate.updates.displayName
        );
        
        if (existingRole) {
          const roleRef = doc(db, 'roles', existingRole.id);
          await updateDoc(roleRef, {
            ...roleUpdate.updates,
            updatedAt: new Date()
          });
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        toast.success(`成功修復 ${updatedCount} 個預設角色標記`);
        await fetchRoles(); // 重新載入角色
      } else {
        toast.info('未找到需要修復的預設角色');
      }
    } catch (error) {
      console.error('修復預設角色標記錯誤:', error);
      toast.error('修復預設角色標記失敗');
    }
  };

  // 處理角色檢視
  const handleViewRole = (role: Role) => {
    setSelectedRole(role);
    setShowRoleDetailDialog(true);
  };

  // 處理角色編輯
  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setShowEditRoleDialog(true);
  };
  
  // 處理用戶角色分配
  const handleAssignUserRole = (user: UserWithRole) => {
    setAssigningUser(user);
    setShowUserRoleAssignDialog(true);
  };

  // 處理新增角色
  const handleCreateRole = () => {
    setShowCreateRoleDialog(true);
  };

  // 處理角色刪除
  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
    setShowDeleteConfirmDialog(true);
  };

  // 確認刪除角色
  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    
    try {
      const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');
      const db = getFirestore();
      
      await deleteDoc(doc(db, 'roles', roleToDelete.id));
      toast.success(`成功刪除角色: ${roleToDelete.displayName}`);
      await fetchRoles(); // 重新載入角色
      
      setShowDeleteConfirmDialog(false);
      setRoleToDelete(null);
    } catch (error) {
      console.error('刪除角色失敗:', error);
      toast.error('刪除角色失敗，請稍後再試');
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

  // 權限描述對應
  const getPermissionDescription = (permission: string): string => {
    const permissionMap: Record<string, string> = {
      'personnel.view': '查看成員',
      'personnel.manage': '管理成員',
      'time.view': '查看工時',
      'time.manage': '管理工時',
      'suppliers.view': '查看供應商',
      'suppliers.manage': '管理供應商',
      'purchase.view': '查看採購',
      'purchase.manage': '管理採購',
      'materials.view': '查看原料',
      'materials.manage': '管理原料',
      'fragrances.view': '查看配方',
      'fragrances.manage': '管理配方',
      'products.view': '查看產品',
      'products.manage': '管理產品',
      'workOrders.view': '查看工單',
      'workOrders.manage': '管理工單',
      'inventory.view': '查看庫存',
      'inventory.manage': '管理庫存',
      'inventoryRecords.view': '查看記錄',
      'cost.view': '查看成本',
      'timeReports.view': '查看報表',
      'roles.manage': '管理權限',
      'system.settings': '系統設定'
    };
    return permissionMap[permission] || permission;
  };

  return (
    <div className="p-6 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/personnel">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回成員管理
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">權限管理</h1>
            <p className="text-muted-foreground">管理系統角色和使用者權限分配</p>
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
          {roles.length > 0 && (
            <Button 
              onClick={fixDefaultRoles} 
              variant="outline"
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
            >
              <Settings className="mr-2 h-4 w-4" />
              修復預設角色標記
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

      {roles.length > 0 && roles.filter(r => r.isDefault).length < 3 && (
        <Alert className="border-yellow-300 bg-gradient-to-r from-yellow-50 to-amber-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800 font-semibold">
            ⚠️ 預設角色不完整
          </AlertTitle>
          <AlertDescription className="text-yellow-700 text-sm">
            <div>系統偵測到預設角色配置可能不完整。建議點擊「修復預設角色標記」按鈕來確保權限系統正常運作。</div>
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
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">角色列表</h3>
              <p className="text-sm text-muted-foreground">管理系統角色和權限配置</p>
            </div>
            <Button onClick={handleCreateRole} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              新增角色
            </Button>
          </div>
          
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
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleViewRole(role)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          檢視
                        </Button>
                        
                        {!role.isDefault && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditRole(role)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeleteRole(role)}
                            >
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
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">目前沒有用戶資料</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {users.map((user) => (
                        <Card key={user.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-base">{user.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">#{user.employeeId}</p>
                              </div>
                              <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                                {user.status === 'active' ? '活躍' : '非活躍'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <p className="text-sm font-medium">當前角色</p>
                              <Badge variant="outline" className="mt-1">
                                {user.roleName || '未設定'}
                              </Badge>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full"
                              onClick={() => handleAssignUserRole(user)}
                            >
                              編輯角色
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 角色詳情對話框 */}
      <Dialog open={showRoleDetailDialog} onOpenChange={setShowRoleDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedRole && (
                <>
                  <div className={`p-2 rounded-lg ${getRoleColor(selectedRole.color)}`}>
                    {React.createElement(getRoleIcon(selectedRole.name), { className: "h-5 w-5 text-white" })}
                  </div>
                  <div>
                    <span>{selectedRole.displayName}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {selectedRole.isDefault ? '預設角色' : '自訂角色'}
                    </Badge>
                  </div>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedRole?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedRole && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">角色 ID</p>
                  <p className="text-sm">{selectedRole.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">權限數量</p>
                  <p className="text-sm">{selectedRole.permissions?.length || 0} 項權限</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-3">權限列表</p>
                <div className="max-h-48 overflow-y-auto w-full border rounded-md p-3">
                  <div className="space-y-2">
                    {selectedRole.permissions && selectedRole.permissions.length > 0 ? (
                      selectedRole.permissions.map((permission, index) => (
                        <div key={index} className="flex items-center justify-between py-1">
                          <span className="text-sm">{permission}</span>
                          <Badge variant="secondary" className="text-xs">
                            {getPermissionDescription(permission)}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">此角色尚未設定任何權限</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDetailDialog(false)}>
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 角色編輯對話框 */}
      <RoleEditDialog
        role={editingRole}
        open={showEditRoleDialog}
        onOpenChange={setShowEditRoleDialog}
        onSuccess={fetchRoles}
      />

      {/* 新增角色對話框 */}
      <RoleCreateDialog
        open={showCreateRoleDialog}
        onOpenChange={setShowCreateRoleDialog}
        onSuccess={fetchRoles}
      />
      
      {/* 用戶角色分配對話框 */}
      <UserRoleAssignDialog
        user={assigningUser}
        open={showUserRoleAssignDialog}
        onOpenChange={setShowUserRoleAssignDialog}
        onSuccess={fetchUsers}
      />

      {/* 刪除確認對話框 */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              確認刪除角色
            </DialogTitle>
            <DialogDescription>
              您確定要刪除角色「{roleToDelete?.displayName}」嗎？此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirmDialog(false)}
            >
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteRole}
            >
              確認刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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