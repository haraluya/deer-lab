'use client';

import { useAuth } from '@/context/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Shield, User, Settings, RefreshCcw } from 'lucide-react';

export default function DebugPermissionsPage() {
  const { appUser, user } = useAuth();
  const { hasPermission, isAdmin, userPermissions, userRole } = usePermission();

  const forceRefresh = () => {
    window.location.reload();
  };

  const assignAdminRole = async () => {
    try {
      const { getFirestore, doc, setDoc } = await import('firebase/firestore');
      const db = getFirestore();
      
      if (!user?.uid) {
        toast.error('未找到用戶 UID');
        return;
      }

      const adminRoleRef = doc(db, 'roles', 'admin');
      const userRef = doc(db, 'users', user.uid);
      
      // 更新用戶角色
      await setDoc(userRef, {
        ...appUser,
        roleRef: adminRoleRef,
        updatedAt: new Date()
      }, { merge: true });
      
      toast.success('已指派管理員角色，請重新載入頁面');
    } catch (error) {
      console.error('指派角色失敗:', error);
      toast.error('指派角色失敗');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">權限系統調試</h1>
        <div className="flex gap-2">
          <Button onClick={forceRefresh} variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" />
            重新載入
          </Button>
          <Button onClick={assignAdminRole} variant="destructive">
            <Shield className="h-4 w-4 mr-2" />
            指派管理員角色
          </Button>
        </div>
      </div>

      {/* 用戶基本資訊 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            用戶資訊
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Firebase UID</p>
              <p className="text-sm text-muted-foreground">{user?.uid || '未登入'}</p>
            </div>
            <div>
              <p className="font-medium">用戶名稱</p>
              <p className="text-sm text-muted-foreground">{appUser?.name || '未設定'}</p>
            </div>
            <div>
              <p className="font-medium">員工編號</p>
              <p className="text-sm text-muted-foreground">{appUser?.employeeId || '未設定'}</p>
            </div>
            <div>
              <p className="font-medium">當前角色</p>
              <p className="text-sm text-muted-foreground">{userRole}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 權限檢查 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            權限狀態
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge variant={isAdmin() ? 'default' : 'secondary'}>
              管理員權限: {isAdmin() ? '✅ 是' : '❌ 否'}
            </Badge>
            <Badge variant="outline">
              權限數量: {userPermissions.length}
            </Badge>
          </div>

          <div>
            <p className="font-medium mb-2">所有權限列表：</p>
            <div className="grid grid-cols-3 gap-2">
              {userPermissions.length > 0 ? (
                userPermissions.map((permission, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {permission}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">沒有權限</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 關鍵權限測試 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            關鍵權限測試
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[
              'personnel.view', 'personnel.manage',
              'materials.view', 'materials.manage',
              'roles.manage', 'system.settings'
            ].map(permission => (
              <div key={permission} className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm">{permission}</span>
                <Badge variant={hasPermission(permission) ? 'default' : 'destructive'}>
                  {hasPermission(permission) ? '✅' : '❌'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 角色引用資訊 */}
      <Card>
        <CardHeader>
          <CardTitle>角色引用調試</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>角色引用路徑:</strong> {appUser?.roleRef?.path || '無'}</p>
            <p><strong>角色引用ID:</strong> {appUser?.roleRef?.id || '無'}</p>
            <p><strong>原始用戶資料:</strong></p>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(appUser, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}