'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { PERMISSION_GROUPS } from '@/utils/permissionConstants';
import { Shield, Palette, Save, X } from 'lucide-react';

// 表單驗證
const roleFormSchema = z.object({
  name: z.string().min(2, '角色名稱至少需要2個字元').max(50, '角色名稱不能超過50個字元'),
  displayName: z.string().min(2, '顯示名稱至少需要2個字元').max(50, '顯示名稱不能超過50個字元'),
  description: z.string().max(500, '描述不能超過500個字元'),
  permissions: z.array(z.string()).min(1, '至少需要選擇一個權限'),
  color: z.string(),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

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

interface RoleEditDialogProps {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// 預設顏色選項
const colorOptions = [
  { name: '紅色', value: '#dc2626', bgClass: 'bg-red-600' },
  { name: '藍色', value: '#2563eb', bgClass: 'bg-blue-600' },
  { name: '綠色', value: '#059669', bgClass: 'bg-green-600' },
  { name: '紫色', value: '#7c3aed', bgClass: 'bg-purple-600' },
  { name: '橘色', value: '#ea580c', bgClass: 'bg-orange-600' },
  { name: '粉色', value: '#db2777', bgClass: 'bg-pink-600' },
  { name: '青色', value: '#0891b2', bgClass: 'bg-cyan-600' },
  { name: '灰色', value: '#6b7280', bgClass: 'bg-gray-600' },
];

export function RoleEditDialog({ role, open, onOpenChange, onSuccess }: RoleEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [permissionGroups] = useState(PERMISSION_GROUPS);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: '',
      displayName: '',
      description: '',
      permissions: [],
      color: '#6b7280',
    },
  });

  const { watch, setValue } = form;
  const watchedPermissions = watch('permissions');
  const watchedColor = watch('color');

  // 當角色資料變更時，重新設定表單
  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name || '',
        displayName: role.displayName || '',
        description: role.description || '',
        permissions: role.permissions || [],
        color: role.color || '#6b7280',
      });
    } else {
      form.reset({
        name: '',
        displayName: '',
        description: '',
        permissions: [],
        color: '#6b7280',
      });
    }
  }, [role, form]);

  // 處理權限選擇
  const handlePermissionToggle = (permission: string, checked: boolean) => {
    const currentPermissions = watchedPermissions || [];
    if (checked) {
      setValue('permissions', [...currentPermissions, permission]);
    } else {
      setValue('permissions', currentPermissions.filter(p => p !== permission));
    }
  };

  // 全選/取消全選權限組
  const handleGroupToggle = (groupPermissions: string[], checked: boolean) => {
    const currentPermissions = watchedPermissions || [];
    if (checked) {
      // 加入這個組的所有權限
      const newPermissions = [...new Set([...currentPermissions, ...groupPermissions])];
      setValue('permissions', newPermissions);
    } else {
      // 移除這個組的所有權限
      const newPermissions = currentPermissions.filter(p => !groupPermissions.includes(p));
      setValue('permissions', newPermissions);
    }
  };

  // 檢查權限組是否全選
  const isGroupSelected = (groupPermissions: string[]) => {
    const currentPermissions = watchedPermissions || [];
    return groupPermissions.every(p => currentPermissions.includes(p));
  };

  // 檢查權限組是否部分選中
  const isGroupPartiallySelected = (groupPermissions: string[]) => {
    const currentPermissions = watchedPermissions || [];
    return groupPermissions.some(p => currentPermissions.includes(p)) && 
           !groupPermissions.every(p => currentPermissions.includes(p));
  };

  // 提交表單
  const onSubmit = async (data: RoleFormValues) => {
    if (!role) return;

    setIsLoading(true);

    try {
      // 優先使用本地 Firestore 更新（更可靠）
      const db = getFirestore();
      const roleRef = doc(db, 'roles', role.id);
      
      await updateDoc(roleRef, {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        permissions: data.permissions,
        color: data.color,
        updatedAt: serverTimestamp(),
      });

      toast.success(`角色 ${data.displayName} 更新成功`);
      onSuccess?.();
      onOpenChange(false);
      
    } catch (localError) {
      console.warn('本地更新失敗，嘗試使用 Cloud Functions:', localError);
      
      // 如果本地更新失敗，嘗試 Cloud Functions
      try {
        const functions = getFunctions();
        const updateRoleFunction = httpsCallable(functions, 'updateRole');
        
        const result = await updateRoleFunction({
          roleId: role.id,
          name: data.name,
          displayName: data.displayName,
          description: data.description,
          permissions: data.permissions,
          color: data.color,
        });

        const response = result.data as any;
        if (response.status === 'success') {
          toast.success(`角色 ${data.displayName} 更新成功`);
          onSuccess?.();
          onOpenChange(false);
        } else {
          throw new Error(response.message || '更新角色失敗');
        }
      } catch (functionsError) {
        console.error('Cloud Functions 更新失敗:', functionsError);
        toast.error('更新角色失敗，請稍後再試');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            編輯角色：{role.displayName}
          </DialogTitle>
          <DialogDescription>
            修改角色的基本資訊和權限配置
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本資訊區域 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                基本資訊
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>角色ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="例如：admin, manager" 
                          {...field} 
                          disabled={role.isDefault}
                        />
                      </FormControl>
                      <FormDescription>
                        {role.isDefault ? '預設角色的ID不可修改' : '用於系統識別的唯一標識符'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>顯示名稱</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：系統管理員" {...field} />
                      </FormControl>
                      <FormDescription>
                        在使用者界面中顯示的名稱
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>角色描述</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="描述此角色的職責和功能範圍..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      詳細說明此角色的職責和權限範圍
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 顏色選擇器 */}
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      角色顏色
                    </FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            className={`relative h-10 w-20 ${color.bgClass} text-white border-2 rounded-md transition-all duration-200 ${
                              field.value === color.value 
                                ? 'ring-2 ring-offset-2 ring-blue-500 border-white scale-105' 
                                : 'border-transparent hover:opacity-80 hover:scale-105'
                            }`}
                            onClick={() => field.onChange(color.value)}
                          >
                            <span className="text-white text-xs font-medium">
                              {color.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormDescription>
                      選擇角色在界面中顯示的代表色彩
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* 權限設定區域 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">權限配置</h3>
                <Badge variant="secondary">
                  已選擇 {watchedPermissions?.length || 0} 項權限
                </Badge>
              </div>

              <FormField
                control={form.control}
                name="permissions"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-6">
                      {permissionGroups.map((group) => {
                        const groupPermissionIds = group.permissions.map(p => p.id);
                        const isSelected = isGroupSelected(groupPermissionIds);
                        const isPartial = isGroupPartiallySelected(groupPermissionIds);
                        
                        return (
                          <div key={group.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <div className="relative">
                                  <Checkbox
                                    checked={isSelected}
                                    data-indeterminate={isPartial}
                                    onCheckedChange={(checked) => 
                                      handleGroupToggle(groupPermissionIds, checked as boolean)
                                    }
                                  />
                                </div>
                                <div>
                                  <h4 className="font-medium">{group.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {group.description}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline">
                                {groupPermissionIds.filter(p => 
                                  watchedPermissions?.includes(p)
                                ).length} / {groupPermissionIds.length}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                              {group.permissions.map((permission) => (
                                <div key={permission.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={watchedPermissions?.includes(permission.id) || false}
                                    onCheckedChange={(checked) => 
                                      handlePermissionToggle(permission.id, checked as boolean)
                                    }
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-medium">{permission.name}</span>
                                    <p className="text-xs text-muted-foreground">
                                      {permission.description}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                <X className="mr-2 h-4 w-4" />
                取消
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-500 to-blue-600"
              >
                {isLoading ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isLoading ? '更新中...' : '儲存變更'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}