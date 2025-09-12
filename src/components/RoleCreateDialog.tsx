'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

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
import { Plus, Palette, Save, X, Sparkles } from 'lucide-react';

// 表單驗證
const roleCreateFormSchema = z.object({
  name: z.string()
    .min(2, '角色名稱至少需要2個字元')
    .max(50, '角色名稱不能超過50個字元')
    .regex(/^[a-z0-9_-]+$/, '角色名稱只能包含小寫字母、數字、底線和連字號'),
  displayName: z.string().min(2, '顯示名稱至少需要2個字元').max(50, '顯示名稱不能超過50個字元'),
  description: z.string().max(500, '描述不能超過500個字元'),
  permissions: z.array(z.string()).min(1, '至少需要選擇一個權限'),
  color: z.string(),
});

type RoleCreateFormValues = z.infer<typeof roleCreateFormSchema>;

interface RoleCreateDialogProps {
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

// 角色範本
const roleTemplates = [
  {
    name: 'viewer',
    displayName: '觀察者',
    description: '只能查看基本資料，無編輯權限',
    permissions: ['materials.view', 'fragrances.view', 'products.view', 'workOrders.view'],
    color: '#6b7280'
  },
  {
    name: 'operator',
    displayName: '操作員',
    description: '可管理生產相關資料和工單',
    permissions: [
      'materials.view', 'materials.manage', 'fragrances.view', 'fragrances.manage',
      'products.view', 'products.manage', 'workOrders.view', 'workOrders.manage',
      'inventory.view', 'inventory.manage', 'time.view', 'time.manage'
    ],
    color: '#059669'
  },
  {
    name: 'supervisor',
    displayName: '主管',
    description: '除成員管理外的完整權限',
    permissions: [
      'suppliers.view', 'suppliers.manage', 'purchase.view', 'purchase.manage',
      'materials.view', 'materials.manage', 'fragrances.view', 'fragrances.manage',
      'products.view', 'products.manage', 'workOrders.view', 'workOrders.manage',
      'inventory.view', 'inventory.manage', 'inventoryRecords.view', 'cost.view',
      'timeReports.view', 'time.view', 'time.manage'
    ],
    color: '#2563eb'
  }
];

export function RoleCreateDialog({ open, onOpenChange, onSuccess }: RoleCreateDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [permissionGroups] = useState(PERMISSION_GROUPS);

  const form = useForm<RoleCreateFormValues>({
    resolver: zodResolver(roleCreateFormSchema),
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

  // 應用角色範本
  const applyTemplate = (template: typeof roleTemplates[0]) => {
    setValue('name', template.name);
    setValue('displayName', template.displayName);
    setValue('description', template.description);
    setValue('permissions', template.permissions);
    setValue('color', template.color);
    toast.success(`已應用 ${template.displayName} 範本`);
  };

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
      const newPermissions = [...new Set([...currentPermissions, ...groupPermissions])];
      setValue('permissions', newPermissions);
    } else {
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

  // 生成唯一ID
  const generateUniqueId = (baseName: string) => {
    const timestamp = Date.now().toString(36);
    const randomSuffix = Math.random().toString(36).substr(2, 4);
    return `${baseName}_${timestamp}_${randomSuffix}`.toLowerCase();
  };

  // 提交表單
  const onSubmit = async (data: RoleCreateFormValues) => {
    setIsLoading(true);

    try {
      // 使用時間戳生成唯一ID
      const uniqueId = generateUniqueId(data.name);
      
      // 優先使用本地 Firestore 創建（更可靠）
      const db = getFirestore();
      const roleRef = doc(collection(db, 'roles'), uniqueId);
      
      const roleData = {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        permissions: data.permissions,
        color: data.color,
        isDefault: false, // 自訂角色
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(roleRef, roleData);

      toast.success(`角色 ${data.displayName} 創建成功`);
      form.reset();
      onSuccess?.();
      onOpenChange(false);
      
    } catch (localError) {
      console.warn('本地創建失敗，嘗試使用 Cloud Functions:', localError);
      
      // 如果本地創建失敗，嘗試 Cloud Functions
      try {
        const functions = getFunctions();
        const createRoleFunction = httpsCallable(functions, 'createRole');
        
        const result = await createRoleFunction({
          name: data.name,
          displayName: data.displayName,
          description: data.description,
          permissions: data.permissions,
          color: data.color,
        });

        const response = result.data as any;
        if (response.status === 'success') {
          toast.success(`角色 ${data.displayName} 創建成功`);
          form.reset();
          onSuccess?.();
          onOpenChange(false);
        } else {
          throw new Error(response.message || '創建角色失敗');
        }
      } catch (functionsError) {
        console.error('Cloud Functions 創建失敗:', functionsError);
        toast.error('創建角色失敗，請稍後再試');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            創建新角色
          </DialogTitle>
          <DialogDescription>
            為系統創建新的角色並配置權限
          </DialogDescription>
        </DialogHeader>

        {/* 角色範本區域 */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            快速範本
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {roleTemplates.map((template) => (
              <div
                key={template.name}
                className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => applyTemplate(template)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: template.color }}
                  />
                  <h4 className="font-medium">{template.displayName}</h4>
                </div>
                <p className="text-sm text-muted-foreground">{template.description}</p>
                <Badge variant="secondary" className="mt-2">
                  {template.permissions.length} 項權限
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本資訊區域 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">基本資訊</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>角色ID</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：manager, operator" {...field} />
                      </FormControl>
                      <FormDescription>
                        用於系統識別，只能包含小寫字母、數字、底線和連字號
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
                        <Input placeholder="例如：部門經理" {...field} />
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
                          <Button
                            key={color.value}
                            type="button"
                            size="sm"
                            variant="outline"
                            className={`relative h-10 w-20 ${color.bgClass} text-white border-2 ${
                              field.value === color.value 
                                ? 'ring-2 ring-offset-2 ring-blue-500 border-white' 
                                : 'border-transparent hover:opacity-80'
                            }`}
                            onClick={() => field.onChange(color.value)}
                          >
                            <span className="text-white text-xs font-medium">
                              {color.name}
                            </span>
                          </Button>
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
                                <Checkbox
                                  checked={isSelected}
                                  ref={(el) => {
                                    if (el && 'indeterminate' in el) {
                                      (el as any).indeterminate = isPartial;
                                    }
                                  }}
                                  onCheckedChange={(checked) => 
                                    handleGroupToggle(groupPermissionIds, checked as boolean)
                                  }
                                />
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
                className="bg-gradient-to-r from-green-500 to-green-600"
              >
                {isLoading ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {isLoading ? '創建中...' : '創建角色'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}