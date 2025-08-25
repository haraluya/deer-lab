// src/app/dashboard/personnel/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, DocumentReference } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { AppUser } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PersonnelDialog } from './PersonnelDialog';
import { DetailViewDialog } from '@/components/DetailViewDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MoreHorizontal, Trash2, Eye, Edit, User, Shield, Calendar } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  uid: string;
  name: string;
  employeeId: string;
  phone: string;
  roleRef?: DocumentReference;
  roleName: string;
  status: string;
}

function PersonnelPageContent() {
  const { canManagePersonnel } = usePermissions();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersonnelDialogOpen, setIsPersonnelDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDetailUser, setSelectedDetailUser] = useState<UserWithRole | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');

  const fetchUsers = useCallback(async () => {
    // ... (fetchUsers 函式內容保持不變)
    setIsLoading(true);
    try {
      const usersCollectionRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollectionRef);
      const usersData = await Promise.all(
        usersSnapshot.docs.map(async (userDoc) => {
          const userData = userDoc.data();
          const uid = userDoc.id;
          let roleName = '未設定';
          const roleRef = userData.roleRef;
          if (roleRef && roleRef instanceof DocumentReference) {
            try {
              const roleDocSnap = await getDoc(roleRef);
              if (roleDocSnap.exists()) {
                roleName = roleDocSnap.data()?.name || '未知角色';
              }
            } catch (roleError) {
              console.error(`無法讀取角色資料 for user ${uid}:`, roleError);
              roleName = '讀取失敗';
            }
          }
          return { ...userData, id: uid, uid, roleName } as UserWithRole;
        })
      );
      setUsers(usersData);
    } catch (error) {
      console.error("讀取人員資料失敗:", error);
      toast.error("讀取人員資料失敗，請檢查網路連線或聯絡管理員。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            人員管理
          </h1>
          <p className="text-gray-600 mt-2">管理系統使用者帳號與權限</p>
        </div>
      </div>

      {/* 手機版功能按鈕區域 */}
      <div className="lg:hidden mb-6">
        <Button 
          onClick={handleAdd}
          disabled={!canManagePersonnel()}
          className={`w-full shadow-lg hover:shadow-xl transition-all duration-200 ${
            canManagePersonnel() 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <User className="mr-2 h-4 w-4" />
          {canManagePersonnel() ? '新增人員' : '權限不足'}
        </Button>
      </div>

      {/* 桌面版功能按鈕區域 */}
      <div className="hidden lg:block mb-6">
        <div className="flex justify-end">
          <Button 
            onClick={handleAdd}
            disabled={!canManagePersonnel()}
            className={`shadow-lg hover:shadow-xl transition-all duration-200 ${
              canManagePersonnel() 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <User className="mr-2 h-4 w-4" />
            {canManagePersonnel() ? '新增人員' : '權限不足'}
          </Button>
        </div>
      </div>

      {/* 手機版表格容器 */}
      <div className="lg:hidden">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <h2 className="text-base font-semibold text-gray-800">人員清單</h2>
              </div>
              <div className="text-xs text-gray-600">
                共 {users.length} 位
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-blue-200 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                  <span className="mt-3 text-sm text-gray-600 font-medium">載入中...</span>
                </div>
              ) : users.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <div 
                      key={user.uid} 
                      className="p-4 hover:bg-blue-50/50 transition-colors duration-200"
                      onClick={() => handleViewDetail(user)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{user.name || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{user.phone || 'N/A'}</div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetail(user)}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看詳細
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleEdit(user)}
                              disabled={!canManagePersonnel()}
                              className={!canManagePersonnel() ? 'text-gray-400 cursor-not-allowed' : ''}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              {canManagePersonnel() ? '編輯資料' : '權限不足'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleChangeStatus(user)}
                              disabled={!canManagePersonnel()}
                              className={!canManagePersonnel() ? 'text-gray-400 cursor-not-allowed' : ''}
                            >
                              {canManagePersonnel() ? (user.status === 'active' ? '停用帳號' : '啟用帳號') : '權限不足'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(user)} 
                              disabled={!canManagePersonnel()}
                              className={`${!canManagePersonnel() ? 'text-gray-400 cursor-not-allowed' : 'text-red-600'}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {canManagePersonnel() ? '刪除員工' : '權限不足'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-gray-500">工號</span>
                          </div>
                          <span className="font-medium text-gray-700">{user.employeeId || 'N/A'}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Shield className="h-3 w-3 text-blue-600" />
                            <span className="text-gray-500">角色</span>
                          </div>
                          <span className="font-medium text-gray-700">{user.roleName || '未設定'}</span>
                        </div>
                        <div className="col-span-2">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-gray-500">狀態</span>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            user.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.status === 'active' ? '在職' : (user.status ? '停用' : 'N/A')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <User className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 mb-1">沒有人員資料</h3>
                  <p className="text-sm text-gray-500 mb-4 text-center">開始新增第一位人員來管理您的團隊</p>
                  <Button 
                    onClick={handleAdd}
                    variant="outline"
                    size="sm"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <User className="mr-2 h-4 w-4" />
                    新增人員
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 桌面版表格容器 */}
      <div className="hidden lg:block">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">人員清單</h2>
            </div>
            <div className="text-sm text-gray-600">
              共 {users.length} 位人員
            </div>
          </div>
        </div>
        
        <div className="table-responsive">
          <Table className="table-enhanced">
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">姓名</TableHead>
                <TableHead className="text-left">工號</TableHead>
                <TableHead className="text-left">角色</TableHead>
                <TableHead className="text-left">狀態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                      </div>
                      <span className="mt-4 text-gray-600 font-medium">載入人員資料中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length > 0 ? (
              users.map((user) => (
                <TableRow 
                  key={user.uid}
                  className="cursor-pointer hover:bg-blue-50/50 transition-colors duration-200"
                  onClick={() => handleViewDetail(user)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{user.phone || 'N/A'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="number-display number-neutral">{user.employeeId || 'N/A'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">{user.roleName || '未設定'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`status-badge ${
                      user.status === 'active' ? 'status-active' : 'status-inactive'
                    }`}>
                      {user.status === 'active' ? '在職' : (user.status ? '停用' : 'N/A')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">開啟選單</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewDetail(user)}>
                          <Eye className="mr-2 h-4 w-4" />
                          查看詳細
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                          <Edit className="mr-2 h-4 w-4" />
                          編輯資料
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeStatus(user)}>
                          {user.status === 'active' ? '停用帳號' : '啟用帳號'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(user)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          刪除員工
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">沒有人員資料</h3>
                    <p className="text-gray-500 mb-4">開始新增第一位人員來管理您的團隊</p>
                    <Button 
                      onClick={handleAdd}
                      variant="outline"
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <User className="mr-2 h-4 w-4" />
                      新增人員
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
            </Table>
          </div>
        </div>
      </div>

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
        <DetailViewDialog
          isOpen={isDetailViewOpen}
          onOpenChange={setIsDetailViewOpen}
          title={selectedDetailUser.name || '未命名'}
          subtitle={`工號: ${selectedDetailUser.employeeId}`}
          sections={[
            {
              title: "基本資訊",
              icon: <User className="h-4 w-4" />,
              fields: [
                { label: "姓名", value: selectedDetailUser.name },
                { label: "工號", value: selectedDetailUser.employeeId },
                { label: "電話", value: selectedDetailUser.phone },
                { label: "狀態", value: selectedDetailUser.status, type: "badge" },
              ]
            },
            {
              title: "權限資訊",
              icon: <Shield className="h-4 w-4" />,
              fields: [
                { label: "角色", value: selectedDetailUser.roleName || '未設定' },
              ]
            }
          ]}
          actions={
            <>
              <Button variant="outline" onClick={() => setIsDetailViewOpen(false)}>
                關閉
              </Button>
              <Button onClick={() => {
                setIsDetailViewOpen(false);
                handleEdit(selectedDetailUser);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                編輯
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}

export default function PersonnelPage() {
  return (
    <PersonnelPageContent />
  );
}
