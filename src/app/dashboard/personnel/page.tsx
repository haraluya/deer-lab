// src/app/dashboard/personnel/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, DocumentReference } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { AppUser } from '@/context/AuthContext';

import { PersonnelDialog } from './PersonnelDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MoreHorizontal, Trash2, Eye, Edit, User, Shield, Calendar, Users, UserCheck, UserX, Search, Filter, Plus, Activity, TrendingUp } from 'lucide-react';

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // 暫時移除權限檢查
  const hasPermission = true;
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
      setFilteredUsers(usersData);
    } catch (error) {
      console.error("讀取人員資料失敗:", error);
      toast.error("讀取人員資料失敗，請檢查網路連線或聯絡管理員。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 篩選邏輯
  useEffect(() => {
    let filtered = users;
    
    // 搜尋篩選
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm)
      );
    }
    
    // 狀態篩選
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }
    
    // 角色篩選
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.roleName === roleFilter);
    }
    
    setFilteredUsers(filtered);
  }, [users, searchTerm, statusFilter, roleFilter]);

  // 統計數據
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    roles: [...new Set(users.map(u => u.roleName))].length
  };

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

  // 取得角色清單
  const uniqueRoles = [...new Set(users.map(u => u.roleName).filter(role => role !== '未設定'))];

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
    <div className="container mx-auto py-6">
      {/* 標題區 */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            成員管理
          </h1>
          <p className="text-gray-600 mt-2 text-lg">管理團隊成員資訊與權限設定</p>
        </div>
        <Button 
          onClick={handleAdd}
          className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
          size="lg"
        >
          <Plus className="h-5 w-5" />
          新增成員
        </Button>
      </div>

      {/* 統計卡片區 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-blue-800">總成員</CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
              <p className="text-xs text-blue-600 font-medium">位團隊成員</p>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-600/10 pointer-events-none" />
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-green-800">活躍成員</CardTitle>
              <div className="p-2 bg-green-500 rounded-lg">
                <UserCheck className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-green-900">{stats.active}</div>
              <p className="text-xs text-green-600 font-medium">位在職成員</p>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-green-600/10 pointer-events-none" />
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-red-50 to-pink-100 border-2 border-red-200 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-red-800">停用帳號</CardTitle>
              <div className="p-2 bg-red-500 rounded-lg">
                <UserX className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-red-900">{stats.inactive}</div>
              <p className="text-xs text-red-600 font-medium">位停用帳號</p>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-red-600/10 pointer-events-none" />
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-violet-100 border-2 border-purple-200 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-purple-800">角色類型</CardTitle>
              <div className="p-2 bg-purple-500 rounded-lg">
                <Shield className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-purple-900">{stats.roles}</div>
              <p className="text-xs text-purple-600 font-medium">種權限角色</p>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-purple-600/10 pointer-events-none" />
        </Card>
      </div>

      {/* 搜尋和篩選區 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            搜尋與篩選
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">搜尋成員</label>
              <div className="relative">
                <Input
                  placeholder="姓名、工號、電話..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-2 border-gray-200 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">帳號狀態</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white border-2 border-gray-200 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="active">活躍</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">角色權限</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="bg-white border-2 border-gray-200 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部角色</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {(searchTerm || statusFilter !== 'all' || roleFilter !== 'all') && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                顯示 {filteredUsers.length} 位成員，共 {users.length} 位
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setRoleFilter('all');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                清除篩選
              </Button>
            </div>
          )}
        </CardContent>
      </Card>


      {/* 成員列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            成員列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="w-10 h-10 border-4 border-blue-200 rounded-full animate-spin"></div>
                <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <span className="mt-3 text-sm text-gray-600 font-medium">載入中...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || roleFilter !== 'all' 
                  ? '找不到符合條件的成員'
                  : '尚無成員資料'
                }
              </p>
            </div>
          ) : (
            <>
              {/* 桌面版表格 */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">成員資訊</TableHead>
                      <TableHead className="font-semibold text-gray-700">工號</TableHead>
                      <TableHead className="font-semibold text-gray-700">角色</TableHead>
                      <TableHead className="font-semibold text-gray-700">狀態</TableHead>
                      <TableHead className="font-semibold text-gray-700">聯絡方式</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.uid} className="hover:bg-blue-50/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">系統用戶</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-gray-50">
                            {user.employeeId}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={`${
                              user.roleName === '管理員' 
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : user.roleName === '主管' 
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            {user.roleName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.status === 'active' ? 'default' : 'destructive'}
                            className={user.status === 'active' 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : 'bg-red-100 text-red-800 border-red-200'
                            }
                          >
                            {user.status === 'active' ? '活躍' : '停用'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            {user.phone || '未設定'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100">
                                <span className="sr-only">開啟選單</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>操作選單</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleViewDetail(user)} className="gap-2">
                                <Eye className="h-4 w-4" />
                                查看詳情
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(user)} className="gap-2">
                                <Edit className="h-4 w-4" />
                                編輯資訊
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangeStatus(user)} className="gap-2">
                                {user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                {user.status === 'active' ? '停用帳號' : '啟用帳號'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(user)} 
                                className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                刪除成員
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 手機版卡片 */}
              <div className="md:hidden space-y-3">
                {filteredUsers.map((user) => (
                  <Card key={user.uid} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{user.name}</h3>
                              <p className="text-sm text-gray-500">工號: {user.employeeId}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={user.status === 'active' ? 'default' : 'destructive'}
                            className={`text-xs mb-1 ${
                              user.status === 'active' 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}
                          >
                            {user.status === 'active' ? '活躍' : '停用'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">角色：</span>
                          <Badge 
                            variant="outline"
                            className={`text-xs ${
                              user.roleName === '管理員' 
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : user.roleName === '主管' 
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            {user.roleName}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">聯絡：</span>
                          <span className="text-gray-900 font-medium">{user.phone || '未設定'}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewDetail(user)}
                          className="flex-1 gap-1 text-xs hover:bg-blue-50 hover:border-blue-200"
                        >
                          <Eye className="h-3 w-3" />
                          查看
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(user)}
                          className="flex-1 gap-1 text-xs hover:bg-green-50 hover:border-green-200"
                        >
                          <Edit className="h-3 w-3" />
                          編輯
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="px-2 hover:bg-gray-100">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>更多操作</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleChangeStatus(user)} className="gap-2">
                              {user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                              {user.status === 'active' ? '停用帳號' : '啟用帳號'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(user)} 
                              className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              刪除成員
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader className="pb-4 border-b border-gray-200">
              <DialogTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                員工詳情
              </DialogTitle>
              <p className="text-gray-600 mt-2">工號: {selectedDetailUser.employeeId}</p>
            </DialogHeader>

            <div className="space-y-6">
              {/* 基本資訊 */}
              <div className="space-y-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                <h3 className="text-xl font-bold flex items-center gap-3 text-blue-800">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  基本資訊
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">姓名</label>
                    <div className="text-lg font-medium text-gray-900">{selectedDetailUser.name || '-'}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">工號</label>
                    <div className="text-lg font-medium text-gray-900">{selectedDetailUser.employeeId || '-'}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">電話</label>
                    <div className="text-lg font-medium text-gray-900">{selectedDetailUser.phone || '-'}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">狀態</label>
                    <div className="text-lg">
                      <Badge variant={selectedDetailUser.status === 'active' ? 'default' : 'secondary'}>
                        {selectedDetailUser.status === 'active' ? '啟用' : '停用'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* 權限資訊 */}
              <div className="space-y-6 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 shadow-sm">
                <h3 className="text-xl font-bold flex items-center gap-3 text-purple-800">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Shield className="h-4 w-4 text-purple-600" />
                  </div>
                  權限資訊
                </h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">角色</label>
                  <div className="text-lg font-medium text-gray-900">{selectedDetailUser.roleName || '未設定'}</div>
                </div>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setIsDetailViewOpen(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                關閉
              </Button>
              <Button 
                onClick={() => {
                  setIsDetailViewOpen(false);
                  handleEdit(selectedDetailUser);
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Edit className="mr-2 h-4 w-4" />
                編輯
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
