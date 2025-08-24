'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { AuthWrapper } from '@/components/AuthWrapper';
import { RoleDialog } from './RoleDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Plus, MoreHorizontal, Trash2, Edit, Eye, Shield, Calendar } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  createdAt?: any;
  updatedAt?: any;
}

function RolesPageContent() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const rolesCollectionRef = collection(db, 'roles');
      const rolesSnapshot = await getDocs(rolesCollectionRef);
      const rolesData = rolesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Role[];
      setRoles(rolesData);
    } catch (error) {
      console.error("讀取角色資料失敗:", error);
      toast.error("讀取角色資料失敗，請檢查網路連線或聯絡管理員。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleAdd = () => {
    setDialogMode('add');
    setSelectedRole(null);
    setIsRoleDialogOpen(true);
  };

  const handleEdit = (role: Role) => {
    setDialogMode('edit');
    setSelectedRole(role);
    setIsRoleDialogOpen(true);
  };

  const handleDelete = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };

  const handleViewDetail = (role: Role) => {
    // TODO: Implement view detail functionality
    console.log('View detail:', role);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRole) return;

    const toastId = toast.loading("正在刪除角色...");

    try {
      // 先檢查是否有使用者使用此角色
      const functions = getFunctions();
      const checkRoleUsage = httpsCallable(functions, 'checkRoleUsage');
      const result = await checkRoleUsage({ roleId: selectedRole.id });
      
      if (result.data && (result.data as any).userCount > 0) {
        toast.error(`無法刪除角色「${selectedRole.name}」，因為還有 ${(result.data as any).userCount} 個使用者正在使用此角色。`, { id: toastId });
        return;
      }

      // 刪除角色
      await deleteDoc(doc(db, 'roles', selectedRole.id));
      
      toast.success("角色已成功刪除。", { id: toastId });
      fetchRoles(); // 重新整理列表
    } catch (error) {
      console.error("刪除角色失敗:", error);
      let errorMessage = "刪除角色時發生錯誤。";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            角色管理
          </h1>
          <p className="text-gray-600 mt-2">管理系統角色與權限設定</p>
        </div>
      </div>

      {/* 手機版功能按鈕區域 */}
      <div className="lg:hidden mb-6">
        <Button 
          onClick={handleAdd}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          新增角色
        </Button>
      </div>

      {/* 桌面版功能按鈕區域 */}
      <div className="hidden lg:block mb-6">
        <div className="flex justify-end">
          <Button 
            onClick={handleAdd}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            新增角色
          </Button>
        </div>
      </div>

      {/* 手機版表格容器 */}
      <div className="lg:hidden">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-600" />
                <h2 className="text-base font-semibold text-gray-800">角色清單</h2>
              </div>
              <div className="text-xs text-gray-600">
                共 {roles.length} 個
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-purple-200 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-purple-600 rounded-full animate-spin"></div>
                  </div>
                  <span className="mt-3 text-sm text-gray-600 font-medium">載入中...</span>
                </div>
              ) : roles.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {roles.map((role) => (
                    <div 
                      key={role.id} 
                      className="p-4 hover:bg-purple-50/50 transition-colors duration-200"
                      onClick={() => handleViewDetail(role)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Shield className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{role.name}</div>
                            <div className="text-xs text-gray-500">ID: {role.id}</div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetail(role)}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看詳細
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(role)}>
                              <Edit className="mr-2 h-4 w-4" />
                              編輯角色
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(role)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              刪除角色
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-gray-500">描述</span>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {role.description || '無描述'}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-gray-500">權限數量</span>
                            </div>
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              {role.permissions?.length || 0} 個權限
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-500">建立時間</span>
                            </div>
                            <span className="text-xs text-gray-600">
                              {role.createdAt ? 
                                new Date(role.createdAt.toDate()).toLocaleDateString('zh-TW') : 
                                '未知'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Shield className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 mb-1">沒有角色資料</h3>
                  <p className="text-sm text-gray-500 mb-4 text-center">開始建立第一個角色來管理權限</p>
                  <Button 
                    onClick={handleAdd}
                    variant="outline"
                    size="sm"
                    className="border-purple-200 text-purple-600 hover:bg-purple-50"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    新增角色
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
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-800">角色清單</h2>
            </div>
            <div className="text-sm text-gray-600">
              共 {roles.length} 個角色
            </div>
          </div>
        </div>
        
        <div className="table-responsive">
          <Table className="table-enhanced">
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">角色名稱</TableHead>
                <TableHead className="text-left">描述</TableHead>
                <TableHead className="text-left">權限數量</TableHead>
                <TableHead className="text-left">建立時間</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-purple-200 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-purple-600 rounded-full animate-spin"></div>
                      </div>
                      <span className="mt-4 text-gray-600 font-medium">載入角色資料中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : roles.length > 0 ? (
              roles.map((role) => (
                <TableRow key={role.id} className="hover:bg-purple-50/50 transition-colors duration-200">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{role.name}</div>
                        <div className="text-xs text-gray-500">角色 ID: {role.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {role.description || '無描述'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                        {role.permissions?.length || 0} 個權限
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {role.createdAt ? 
                          new Date(role.createdAt.toDate()).toLocaleDateString('zh-TW') : 
                          '未知'
                        }
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
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
                        <DropdownMenuItem onClick={() => handleEdit(role)}>
                          <Edit className="h-4 w-4 mr-2" />
                          編輯角色
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(role)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          刪除角色
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
                      <Shield className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">沒有角色資料</h3>
                    <p className="text-gray-500 mb-4">開始建立第一個角色來管理系統權限</p>
                    <Button 
                      onClick={handleAdd}
                      variant="outline"
                      className="border-purple-200 text-purple-600 hover:bg-purple-50"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      新增角色
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

      <RoleDialog 
        isOpen={isRoleDialogOpen} 
        onOpenChange={setIsRoleDialogOpen} 
        onRoleUpdate={fetchRoles} 
        roleData={dialogMode === 'edit' ? selectedRole : null} 
      />

      {/* 刪除確認對話框 */}
      {selectedRole && (
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          title={`確認刪除角色`}
          description={`您確定要永久刪除角色「${selectedRole.name}」嗎？此操作無法復原。`}
        />
      )}
    </div>
  );
}



export default function RolesPage() {
  return (
    <AuthWrapper>
      <RolesPageContent />
    </AuthWrapper>
  );
}
