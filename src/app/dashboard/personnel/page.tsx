// src/app/dashboard/personnel/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, DocumentReference, query, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { AppUser } from '@/context/AuthContext';

import { PersonnelDialog } from './PersonnelDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { 
  MoreHorizontal, Trash2, Eye, Edit, User, Shield, Calendar, Users, UserCheck, UserX, 
  Search, Filter, Plus, Activity, TrendingUp, Settings
} from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StandardDataListPage, StandardColumn, StandardAction, QuickFilter } from '@/components/StandardDataListPage';
import { StandardStats } from '@/components/StandardStatsCard';
import { toast } from 'sonner';
import { useDataSearch } from '@/hooks/useDataSearch';

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
  phone: string;
  roleRef?: DocumentReference;
  roleName: string;
  roleId?: string;
  status: string;
}

function PersonnelPageContent() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { isAdmin, userRole, userPermissions } = usePermission();
  
  const [isPersonnelDialogOpen, setIsPersonnelDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDetailUser, setSelectedDetailUser] = useState<UserWithRole | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');

  // 使用統一的搜尋過濾 Hook
  const searchConfig = {
    searchFields: [
      { key: 'name' as keyof UserWithRole },
      { key: 'employeeId' as keyof UserWithRole },
      { key: 'phone' as keyof UserWithRole }
    ],
    filterConfigs: [
      {
        key: 'status' as keyof UserWithRole,
        type: 'set' as const
      },
      {
        key: 'roleName' as keyof UserWithRole,
        type: 'set' as const
      }
    ]
  };

  const {
    searchTerm,
    setSearchTerm,
    activeFilters,
    setFilter,
    clearFilter,
    filteredData: filteredUsers,
    totalCount,
    filteredCount
  } = useDataSearch(users, searchConfig);

  // 角色顏色對應 - 和權限管理頁面保持一致
  const getRoleColor = useCallback((color?: string) => {
    switch (color) {
      case '#dc2626': return 'red';
      case '#2563eb': return 'blue';
      case '#059669': return 'green';
      case '#7c3aed': return 'purple';
      case '#ea580c': return 'orange';
      default: return 'gray';
    }
  }, []);

  const getRoleColorClasses = useCallback((color?: string) => {
    const baseColor = getRoleColor(color);
    switch (baseColor) {
      case 'red':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'blue':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'green':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'purple':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'orange':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }, [getRoleColor]);


  // 重新載入使用者資料的函數（供其他操作使用）
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      const usersCollectionRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollectionRef);
      const usersData = await Promise.all(
        usersSnapshot.docs.map(async (userDoc) => {
          const userData = userDoc.data();
          const uid = userDoc.id;
          let roleName = '未設定';
          let roleId = '';
          
          // 優先使用直接設定的 roleName 欄位
          if (userData.roleName && typeof userData.roleName === 'string') {
            roleName = userData.roleName;
          } else {
            // 如果沒有直接的 roleName，嘗試從 roleRef 讀取
            const roleRef = userData.roleRef;
            if (roleRef && roleRef instanceof DocumentReference) {
              try {
                const roleDocSnap = await getDoc(roleRef);
                if (roleDocSnap.exists()) {
                  roleName = roleDocSnap.data()?.displayName || roleDocSnap.data()?.name || '未知角色';
                  roleId = roleRef.id;
                }
              } catch (roleError) {
                console.error(`無法讀取角色資料 for user ${uid}:`, roleError);
                roleName = '讀取失敗';
              }
            }
          }
          
          // 如果有 roleId，從已載入的角色中查找對應資料
          if (userData.roleId && roles.length > 0) {
            const role = roles.find(r => r.id === userData.roleId);
            if (role) {
              roleName = role.displayName;
              roleId = role.id;
            }
          }
          
          return { ...userData, id: uid, uid, roleName, roleId } as UserWithRole;
        })
      );
      setUsers(usersData);
    } catch (error) {
      console.error("讀取人員資料失敗:", error);
      toast.error("讀取人員資料失敗，請檢查網路連線或聯絡管理員。");
    } finally {
      setIsLoading(false);
    }
  }, [roles]);

  useEffect(() => {
    const initializeData = async () => {
      // 先載入角色
      try {
        if (!db) {
          throw new Error("Firebase 未初始化");
        }
        const rolesQuery = query(collection(db, 'roles'), orderBy('createdAt', 'asc'));
        const rolesSnapshot = await getDocs(rolesQuery);
        
        const rolesList = rolesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Role[];
        
        setRoles(rolesList);
        
        // 角色載入完成後載入用戶資料
        const loadUsers = async () => {
          setIsLoading(true);
          try {
            if (!db) return;
            const usersCollectionRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersCollectionRef);
            const usersData = await Promise.all(
              usersSnapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();
                const uid = userDoc.id;
                let roleName = '未設定';
                let roleId = '';
                
                // 優先使用直接設定的 roleName 欄位
                if (userData.roleName && typeof userData.roleName === 'string') {
                  roleName = userData.roleName;
                } else {
                  // 如果沒有直接的 roleName，嘗試從 roleRef 讀取
                  const roleRef = userData.roleRef;
                  if (roleRef && roleRef instanceof DocumentReference) {
                    try {
                      const roleDocSnap = await getDoc(roleRef);
                      if (roleDocSnap.exists()) {
                        roleName = roleDocSnap.data()?.displayName || roleDocSnap.data()?.name || '未知角色';
                        roleId = roleRef.id;
                      }
                    } catch (roleError) {
                      console.error(`無法讀取角色資料 for user ${uid}:`, roleError);
                      roleName = '讀取失敗';
                    }
                  }
                }
                
                // 如果有 roleId，從已載入的角色中查找對應資料
                if (userData.roleId && rolesList.length > 0) {
                  const role = rolesList.find(r => r.id === userData.roleId);
                  if (role) {
                    roleName = role.displayName;
                    roleId = role.id;
                  }
                }
                
                return { ...userData, id: uid, uid, roleName, roleId } as UserWithRole;
              })
            );
            setUsers(usersData);
          } catch (error) {
            console.error("讀取人員資料失敗:", error);
            toast.error("讀取人員資料失敗，請檢查網路連線或聯絡管理員。");
          } finally {
            setIsLoading(false);
          }
        };
        
        await loadUsers();
      } catch (error) {
        console.error("初始化資料失敗:", error);
      }
    };
    initializeData();
  }, []); // 空依賴陣列，只在組件掛載時執行一次

  // 統計數據
  const stats: StandardStats[] = [
    {
      title: '總成員',
      value: users.length,
      subtitle: '位團隊成員',
      icon: <Users className="h-4 w-4" />,
      color: 'blue'
    },
    {
      title: '活躍成員',
      value: users.filter(u => u.status === 'active').length,
      subtitle: '位在職成員',
      icon: <UserCheck className="h-4 w-4" />,
      color: 'green'
    },
    {
      title: '停用帳號',
      value: users.filter(u => u.status === 'inactive').length,
      subtitle: '位停用帳號',
      icon: <UserX className="h-4 w-4" />,
      color: 'red'
    },
    {
      title: '角色類型',
      value: [...new Set(users.map(u => u.roleName))].length,
      subtitle: '種權限角色',
      icon: <Shield className="h-4 w-4" />,
      color: 'purple'
    }
  ];

  // 配置欄位
  const columns: StandardColumn<UserWithRole>[] = [
    {
      key: 'name',
      title: '成員資訊',
      sortable: true,
      searchable: true,
      priority: 5,
      render: (value, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
            {record.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{record.name}</div>
            <div className="text-sm text-gray-500">系統用戶</div>
          </div>
        </div>
      ),
      mobileRender: (value, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
            {record.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{record.name}</h3>
            <p className="text-sm text-gray-500">工號: {record.employeeId}</p>
          </div>
        </div>
      )
    },
    {
      key: 'employeeId',
      title: '工號',
      sortable: true,
      searchable: true,
      priority: 4,
      render: (value) => (
        <Badge variant="outline" className="bg-gray-50">
          {value}
        </Badge>
      ),
      hideOnMobile: true
    },
    {
      key: 'roleName',
      title: '角色',
      sortable: true,
      filterable: true,
      priority: 4,
      render: (value, record) => {
        // 從角色資料中查找對應的顏色
        const role = roles.find(r => r.displayName === value || r.name === value);
        const roleColor = role?.color;
        
        return (
          <Badge 
            variant="outline"
            className={getRoleColorClasses(roleColor)}
          >
            {value}
          </Badge>
        );
      }
    },
    {
      key: 'status',
      title: '狀態',
      sortable: true,
      filterable: true,
      priority: 4,
      align: 'center',
      render: (value) => (
        <Badge 
          variant={value === 'active' ? 'default' : 'destructive'}
          className={value === 'active' 
            ? 'bg-green-100 text-green-800 border-green-200' 
            : 'bg-red-100 text-red-800 border-red-200'
          }
        >
          {value === 'active' ? '活躍' : '停用'}
        </Badge>
      )
    },
    {
      key: 'phone',
      title: '聯絡方式',
      priority: 2,
      hideOnMobile: true,
      render: (value) => (
        <div className="text-sm text-gray-600">
          {value || '未設定'}
        </div>
      )
    }
  ];

  // 配置操作
  const actions: StandardAction<UserWithRole>[] = [
    {
      key: 'view',
      title: '查看詳情',
      icon: <Eye className="h-4 w-4" />,
      onClick: (record) => handleViewDetail(record)
    },
    {
      key: 'edit',
      title: '編輯資訊',
      icon: <Edit className="h-4 w-4" />,
      onClick: (record) => handleEdit(record)
    },
    {
      key: 'changeStatus',
      title: (record) => record.status === 'active' ? '停用帳號' : '啟用帳號',
      icon: (record) => record.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />,
      onClick: (record) => handleChangeStatus(record)
    },
    {
      key: 'delete',
      title: '刪除成員',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive' as const,
      confirmMessage: '確定要刪除此成員嗎？此操作無法復原。',
      onClick: (record) => handleDelete(record)
    }
  ];

  // 配置快速篩選
  const quickFilters: QuickFilter[] = [
    // 狀態篩選
    {
      key: 'status',
      label: '活躍',
      value: 'active',
      color: 'green',
      count: users.filter(u => u.status === 'active').length
    },
    {
      key: 'status',
      label: '停用',
      value: 'inactive', 
      color: 'red',
      count: users.filter(u => u.status === 'inactive').length
    },
    // 角色篩選
    ...Array.from(new Set(users.map(u => u.roleName)))
      .filter(role => role !== '未設定')
      .sort()
      .map(role => {
        // 從角色資料中查找對應的顏色
        const roleData = roles.find(r => r.displayName === role || r.name === role);
        const roleColor = roleData?.color;
        const quickFilterColor = getRoleColor(roleColor) as 'purple' | 'blue' | 'green' | 'red' | 'orange' | 'gray';
        
        return {
          key: 'roleName',
          label: role,
          value: role,
          color: quickFilterColor,
          count: users.filter(u => u.roleName === role).length
        };
      })
  ];

  // 操作處理函式
  const handleAdd = () => {
    setDialogMode('add');
    setSelectedUser(null);
    setIsPersonnelDialogOpen(true);
  };

  const handleEdit = (user: UserWithRole) => {
    setDialogMode('edit');
    setSelectedUser(user);
    setIsPersonnelDialogOpen(true);
  };

  const handleChangeStatus = (user: UserWithRole) => {
    setSelectedUser(user);
    setIsConfirmDialogOpen(true);
  };

  const handleDelete = (user: UserWithRole) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleViewDetail = (user: UserWithRole) => {
    setSelectedDetailUser(user);
    setIsDetailViewOpen(true);
  };

  const handleConfirmChangeStatus = async () => {
    if (!selectedUser) return;

    const newStatus = selectedUser.status === 'active' ? 'inactive' : 'active';
    const toastId = toast.loading("正在更新狀態...");

    try {
      const functions = getFunctions();
      const setUserStatus = httpsCallable(functions, 'setUserStatus');
      await setUserStatus({ uid: selectedUser.uid, status: newStatus });

      toast.success("員工狀態已成功更新。", { id: toastId });
      fetchUsers(); // 重新整理列表
    } catch (error) {
      console.error("變更狀態失敗:", error);
      let errorMessage = "變更狀態時發生錯誤。";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsConfirmDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    const toastId = toast.loading("正在刪除員工...");

    try {
      const functions = getFunctions();
      const deletePersonnel = httpsCallable(functions, 'deletePersonnel');
      await deletePersonnel({ personnelId: selectedUser.uid });

      toast.success("員工已成功刪除。", { id: toastId });
      fetchUsers(); // 重新整理列表
    } catch (error) {
      console.error("刪除員工失敗:", error);
      let errorMessage = "刪除員工時發生錯誤。";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            成員管理
          </h1>
          <p className="text-gray-600 mt-2">管理團隊成員資訊，包括權限設置和聯絡方式</p>
        </div>
        
        <div className="flex gap-3">
          {/* 權限管理按鈕 - 僅系統管理員可見 */}
          {isAdmin() && (
            <Link href="/dashboard/personnel/permissions">
              <Button 
                variant="outline"
                className="gap-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Settings className="h-5 w-5" />
                權限管理
              </Button>
            </Link>
          )}
        </div>
      </div>

        <StandardDataListPage
        data={filteredUsers}
        loading={isLoading}
        columns={columns}
        actions={actions}
        onRowClick={(record) => handleViewDetail(record)}
        
        // 搜尋與過濾
        searchable={true}
        searchPlaceholder="搜尋成員姓名、工號、電話..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        quickFilters={quickFilters}
        activeFilters={activeFilters}
        onFilterChange={(key, value) => {
          if (value === null) {
            clearFilter(key);
          } else {
            setFilter(key, value);
          }
        }}
        onClearFilters={() => {
          Object.keys(activeFilters).forEach(key => clearFilter(key));
        }}
        
        // 統計資訊
        stats={stats}
        showStats={true}
        
        // 工具列功能
        showToolbar={true}
        
        // 新增功能
        showAddButton={true}
        addButtonText="新增成員"
        onAdd={handleAdd}
        
        className="space-y-6"
      />

      {/* 對話框組件 */}
      <PersonnelDialog 
        isOpen={isPersonnelDialogOpen} 
        onOpenChange={setIsPersonnelDialogOpen} 
        onPersonnelUpdate={fetchUsers} 
        personnelData={dialogMode === 'edit' ? selectedUser : null} 
      />
      
      {/* 狀態變更確認對話框 */}
      {selectedUser && (
        <ConfirmDialog
          isOpen={isConfirmDialogOpen}
          onOpenChange={setIsConfirmDialogOpen}
          onConfirm={handleConfirmChangeStatus}
          title={`確認變更狀態`}
          description={`您確定要將員工「${selectedUser.name || 'N/A'}」的狀態變更為「${selectedUser.status === 'active' ? '停用' : '在職'}」嗎？此操作將會影響該員工的登入權限。`}
        />
      )}

      {/* 刪除確認對話框 */}
      {selectedUser && (
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          title={`確認刪除員工`}
          description={`您確定要永久刪除員工「${selectedUser.name || 'N/A'}」嗎？此操作無法復原，將會刪除所有相關資料。`}
        />
      )}

      {/* 詳細資料對話框 */}
      {selectedDetailUser && (
        <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
            <DialogHeader className="pb-6 border-b border-gradient-to-r from-blue-200 to-indigo-200">
              <DialogTitle className="flex items-center gap-4 text-3xl font-bold">
                {/* 大頭照區域 */}
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-bold text-white">
                      {selectedDetailUser.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1">
                    <div className={`w-5 h-5 rounded-full border-2 border-white ${
                      selectedDetailUser.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {selectedDetailUser.name}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="outline" className="bg-white/80 text-blue-700 border-blue-200 font-mono">
                      {selectedDetailUser.employeeId}
                    </Badge>
                    {(() => {
                      const role = roles.find(r => r.displayName === selectedDetailUser.roleName || r.name === selectedDetailUser.roleName);
                      const roleColor = role?.color;
                      return (
                        <Badge 
                          variant="outline"
                          className={getRoleColorClasses(roleColor)}
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          {selectedDetailUser.roleName}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 pt-6">
              {/* 基本資訊卡片區域 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 姓名卡片 */}
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100/80 rounded-xl border border-blue-200/50 shadow-sm">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">姓名</p>
                    <p className="text-lg font-semibold text-blue-800">{selectedDetailUser.name}</p>
                  </div>
                </div>

                {/* 工號卡片 */}
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/80 rounded-xl border border-emerald-200/50 shadow-sm">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                    <Badge className="h-5 w-5 text-white bg-transparent border-0" />
                  </div>
                  <div>
                    <p className="text-sm text-emerald-600 font-medium">工號</p>
                    <p className="text-lg font-semibold text-emerald-800 font-mono">{selectedDetailUser.employeeId}</p>
                  </div>
                </div>

                {/* 聯絡電話卡片 */}
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100/80 rounded-xl border border-orange-200/50 shadow-sm">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-orange-600 font-medium">聯絡電話</p>
                    <p className="text-base font-semibold text-orange-800 truncate">
                      {selectedDetailUser.phone || '未設定'}
                    </p>
                  </div>
                </div>

                {/* 帳號狀態卡片 */}
                <div className={`flex items-center gap-3 p-4 rounded-xl border shadow-sm ${
                  selectedDetailUser.status === 'active' 
                    ? 'bg-gradient-to-r from-green-50 to-green-100/80 border-green-200/50'
                    : 'bg-gradient-to-r from-red-50 to-red-100/80 border-red-200/50'
                }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${
                    selectedDetailUser.status === 'active'
                      ? 'bg-gradient-to-r from-green-500 to-green-600'
                      : 'bg-gradient-to-r from-red-500 to-red-600'
                  }`}>
                    {selectedDetailUser.status === 'active' ? (
                      <UserCheck className="h-5 w-5 text-white" />
                    ) : (
                      <UserX className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      selectedDetailUser.status === 'active' ? 'text-green-600' : 'text-red-600'
                    }`}>帳號狀態</p>
                    <p className={`text-lg font-semibold ${
                      selectedDetailUser.status === 'active' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {selectedDetailUser.status === 'active' ? '啟用中' : '已停用'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 權限資訊詳細卡片 */}
              <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 rounded-2xl border border-purple-200/50 shadow-lg p-6">
                <h3 className="text-xl font-bold flex items-center gap-3 text-purple-800 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-sm">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  權限與角色資訊
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-purple-100">
                    <label className="text-sm font-semibold text-purple-700 block mb-2">系統角色</label>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const role = roles.find(r => r.displayName === selectedDetailUser.roleName || r.name === selectedDetailUser.roleName);
                        const roleColor = role?.color;
                        return (
                          <Badge 
                            variant="outline"
                            className={`text-base px-3 py-1 ${getRoleColorClasses(roleColor)}`}
                          >
                            {selectedDetailUser.roleName || '未設定'}
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-purple-100">
                    <label className="text-sm font-semibold text-purple-700 block mb-2">權限等級</label>
                    <div className="text-lg font-medium text-purple-900">
                      {selectedDetailUser.roleName === '管理員' ? '最高權限' : 
                       selectedDetailUser.roleName === '主管' ? '管理權限' : 
                       selectedDetailUser.roleName === '計時人員' ? '基本權限' : '未分配'}
                    </div>
                  </div>
                  
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-purple-100">
                    <label className="text-sm font-semibold text-purple-700 block mb-2">登入狀態</label>
                    <div className={`flex items-center gap-2 ${
                      selectedDetailUser.status === 'active' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {selectedDetailUser.status === 'active' ? (
                        <><UserCheck className="h-4 w-4" /> 可正常登入</>
                      ) : (
                        <><UserX className="h-4 w-4" /> 禁止登入</>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按鈕區域 */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gradient-to-r from-gray-200 to-gray-300 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setIsDetailViewOpen(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                關閉
              </Button>
              <Button 
                onClick={() => {
                  setIsDetailViewOpen(false);
                  handleEdit(selectedDetailUser);
                }}
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6"
              >
                <Edit className="mr-2 h-4 w-4" />
                編輯成員
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function PersonnelPage() {
  return (
    <PersonnelPageContent />
  );
}