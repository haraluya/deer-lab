'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApiClient } from '@/hooks/useApiClient';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { 
  UserCheck, 
  Shield, 
  Crown, 
  User as UserIcon, 
  Save, 
  X, 
  AlertTriangle, 
  Users 
} from 'lucide-react';

// 表單驗證
const userRoleAssignSchema = z.object({
  roleId: z.string().min(1, '請選擇角色'),
});

type UserRoleAssignFormValues = z.infer<typeof userRoleAssignSchema>;

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
  color: string;
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

interface UserRoleAssignDialogProps {
  user: UserWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// 角色圖示對應
const getRoleIcon = (roleName: string) => {
  switch (roleName) {
    case 'admin': return Crown;
    case 'foreman': return UserCheck;
    case 'timekeeper': return UserIcon;
    default: return Shield;
  }
};

// 角色顏色對應
const getRoleColor = (color: string) => {
  switch (color) {
    case '#dc2626': return 'bg-red-500 text-white';
    case '#2563eb': return 'bg-blue-500 text-white';
    case '#059669': return 'bg-green-500 text-white';
    case '#9333ea': return 'bg-purple-500 text-white';
    case '#ea580c': return 'bg-orange-500 text-white';
    case '#db2777': return 'bg-pink-500 text-white';
    case '#0891b2': return 'bg-cyan-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

export function UserRoleAssignDialog({ user, open, onOpenChange, onSuccess }: UserRoleAssignDialogProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const apiClient = useApiClient();

  const form = useForm<UserRoleAssignFormValues>({
    resolver: zodResolver(userRoleAssignSchema),
    defaultValues: {
      roleId: '',
    },
  });

  const { watch } = form;
  const watchedRoleId = watch('roleId');

  // 載入角色列表
  const fetchRoles = async () => {
    setIsLoadingRoles(true);
    
    try {
      const result = await apiClient.call('getRoles', undefined, { showErrorToast: false });
      if (result.success && result.data && result.data.roles) {
        // 轉換API返回的格式為本地Role格式
        const roles = result.data.roles.map(role => ({
          ...role,
          displayName: role.name, // API中沒有displayName，用name代替
          isDefault: false, // API中沒有isDefault，設為false
          color: '#6b7280' // API中沒有color，設為默認灰色
        }));
        setRoles(roles as Role[]);
        console.log(`✅ 載入 ${roles.length} 個角色`);
      } else {
        toast.error('載入角色列表失敗');
      }
    } finally {
      setIsLoadingRoles(false);
    }
  };

  // 當角色選擇變更時，更新選中的角色
  useEffect(() => {
    if (watchedRoleId) {
      const role = roles.find(r => r.id === watchedRoleId);
      setSelectedRole(role || null);
    } else {
      setSelectedRole(null);
    }
  }, [watchedRoleId, roles]);

  // 當對話框開啟時載入角色和設定預設值
  useEffect(() => {
    if (open) {
      fetchRoles();
      
      // 設定當前用戶的角色為預設值
      if (user?.roleId) {
        form.setValue('roleId', user.roleId);
      } else {
        form.reset({ roleId: '' });
      }
    }
  }, [open, user, form]);

  // 提交角色分配
  const onSubmit = async (data: UserRoleAssignFormValues) => {
    if (!user) return;

    const selectedRoleData = roles.find(r => r.id === data.roleId);
    if (!selectedRoleData) {
      toast.error('選中的角色不存在');
      return;
    }

    const result = await apiClient.call('assignUserRole', {
      uid: user.uid,
      roleId: data.roleId,
      reason: `管理員分配角色：${selectedRoleData.displayName}`,
    });

    if (result.success) {
      toast.success(`成功為 ${user.name} 分配角色：${selectedRoleData.displayName}`);
      onSuccess?.();
      onOpenChange(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            角色分配：{user.name}
          </DialogTitle>
          <DialogDescription>
            為用戶「{user.name}」（員工編號：{user.employeeId}）分配新的系統角色
          </DialogDescription>
        </DialogHeader>

        {/* 用戶當前資訊 */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">當前資訊</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">姓名</p>
              <p className="text-sm text-muted-foreground">{user.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">員工編號</p>
              <p className="text-sm text-muted-foreground">{user.employeeId}</p>
            </div>
            <div>
              <p className="text-sm font-medium">當前角色</p>
              <p className="text-sm text-muted-foreground">
                {user.roleName || '未設定角色'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">狀態</p>
              <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                {user.status === 'active' ? '活躍' : '非活躍'}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 角色選擇 */}
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>選擇新角色</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={isLoadingRoles}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue 
                          placeholder={isLoadingRoles ? "載入角色中..." : "選擇角色..."}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => {
                        const Icon = getRoleIcon(role.name);
                        
                        return (
                          <SelectItem key={role.id} value={role.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className={`p-1 rounded ${getRoleColor(role.color)}`}
                              >
                                <Icon className="h-3 w-3" />
                              </div>
                              <span>{role.displayName}</span>
                              {role.isDefault && (
                                <Badge variant="outline" className="text-xs ml-1">
                                  預設
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    為此用戶選擇適合的系統角色
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 角色預覽 */}
            {selectedRole && (
              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  角色預覽
                </h3>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded ${getRoleColor(selectedRole.color)}`}>
                      {React.createElement(getRoleIcon(selectedRole.name), { 
                        className: "h-4 w-4" 
                      })}
                    </div>
                    <div>
                      <p className="font-medium">{selectedRole.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRole.description}
                      </p>
                    </div>
                    {selectedRole.isDefault && (
                      <Badge variant="outline" className="ml-auto">
                        預設角色
                      </Badge>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">權限數量</p>
                    <Badge variant="secondary">
                      {selectedRole.permissions?.length || 0} 項權限
                    </Badge>
                  </div>
                </div>
                
                {/* 權限變更警告 */}
                {user.roleName && user.roleName !== selectedRole.displayName && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800">權限變更提醒</p>
                      <p className="text-yellow-700 mt-1">
                        用戶角色將從「{user.roleName}」變更為「{selectedRole.displayName}」，
                        其權限將相應調整。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={apiClient.loading}
              >
                <X className="mr-2 h-4 w-4" />
                取消
              </Button>
              <Button 
                type="submit" 
                disabled={apiClient.loading || !watchedRoleId}
                className="bg-gradient-to-r from-blue-500 to-blue-600"
              >
                {apiClient.loading ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {apiClient.loading ? '分配中...' : '確認分配'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}