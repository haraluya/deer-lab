'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertTriangle, Shield, RefreshCcw, UserCheck } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function ResetPermissionsPage() {
  const [targetEmployeeId, setTargetEmployeeId] = useState('052');
  const [isResetting, setIsResetting] = useState(false);
  const [isGranting, setIsGranting] = useState(false);

  const resetPermissionsSystem = async () => {
    if (!targetEmployeeId.trim()) {
      toast.error('請輸入目標員工編號');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ 警告：此操作將:\n` +
      `1. 清除所有角色設定\n` +
      `2. 清除所有用戶的角色引用\n` +
      `3. 為員工編號 ${targetEmployeeId} 設定完整管理員權限\n\n` +
      `此操作無法復原，確定要繼續嗎？`
    );

    if (!confirmed) return;

    setIsResetting(true);
    try {
      const functions = getFunctions();
      const resetFunction = httpsCallable(functions, 'resetPermissionsSystem');
      
      const result = await resetFunction({ targetEmployeeId: targetEmployeeId.trim() });
      const data = result.data as any;

      if (data.status === 'success') {
        toast.success(data.message);
        console.log('重置詳情:', data.details);
      } else {
        toast.error(data.message || '重置失敗');
      }
    } catch (error: any) {
      console.error('重置權限系統失敗:', error);
      toast.error(error.message || '重置失敗，請檢查控制台');
    } finally {
      setIsResetting(false);
    }
  };

  const grantAdminPermissions = async () => {
    if (!targetEmployeeId.trim()) {
      toast.error('請輸入目標員工編號');
      return;
    }

    const confirmed = window.confirm(
      `確定要為員工編號 ${targetEmployeeId} 指派完整管理員權限嗎？`
    );

    if (!confirmed) return;

    setIsGranting(true);
    try {
      const functions = getFunctions();
      const grantFunction = httpsCallable(functions, 'grantAdminPermissions');
      
      const result = await grantFunction({ targetEmployeeId: targetEmployeeId.trim() });
      const data = result.data as any;

      if (data.status === 'success') {
        toast.success(data.message);
        console.log('指派詳情:', data.details);
      } else {
        toast.error(data.message || '指派失敗');
      }
    } catch (error: any) {
      console.error('指派管理員權限失敗:', error);
      toast.error(error.message || '指派失敗，請檢查控制台');
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">權限系統重置</h1>
          <p className="text-muted-foreground mt-2">緊急修復工具 - 僅在權限系統故障時使用</p>
        </div>
        <Badge variant="destructive" className="text-lg px-4 py-2">
          <AlertTriangle className="h-5 w-5 mr-2" />
          緊急工具
        </Badge>
      </div>

      {/* 警告提示 */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            重要警告
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-red-700">
          <p>• 此功能僅用於權限系統完全故障時的緊急修復</p>
          <p>• 完整重置會清除所有角色設定和用戶權限配置</p>
          <p>• 操作後需要重新配置所有用戶的角色和權限</p>
          <p>• 建議先嘗試「快速指派管理員權限」功能</p>
        </CardContent>
      </Card>

      {/* 目標員工編號設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            目標員工編號設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employeeId">員工編號</Label>
            <Input
              id="employeeId"
              value={targetEmployeeId}
              onChange={(e) => setTargetEmployeeId(e.target.value)}
              placeholder="請輸入員工編號 (例如: 052)"
              className="max-w-md"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            此員工將獲得完整的系統管理員權限，包含所有功能的查看和管理權限。
          </p>
        </CardContent>
      </Card>

      {/* 操作按鈕 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 快速指派權限 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Shield className="h-5 w-5" />
              快速指派管理員權限
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              為指定員工編號快速指派完整管理員權限，不影響現有角色設定。
            </p>
            <Button 
              onClick={grantAdminPermissions}
              disabled={isGranting || !targetEmployeeId.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isGranting ? (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                  處理中...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  指派管理員權限
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 完整重置 */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <RefreshCcw className="h-5 w-5" />
              完整權限系統重置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              清除所有角色和權限設定，為指定員工編號重新建立管理員權限。
            </p>
            <Button 
              onClick={resetPermissionsSystem}
              disabled={isResetting || !targetEmployeeId.trim()}
              variant="destructive"
              className="w-full"
            >
              {isResetting ? (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                  重置中...
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  執行完整重置
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 使用說明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用說明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-semibold mb-2">1. 快速指派管理員權限 (建議優先使用)</h4>
            <p className="text-sm text-muted-foreground">
              • 僅為指定員工編號設定完整權限，不影響其他用戶<br/>
              • 保留現有的角色設定<br/>
              • 操作風險較低，適合大部分權限問題
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">2. 完整權限系統重置 (僅緊急時使用)</h4>
            <p className="text-sm text-muted-foreground">
              • 清除所有角色定義和用戶權限配置<br/>
              • 為指定員工編號建立新的管理員權限<br/>
              • 操作後需要重新配置所有其他用戶的權限<br/>
              • 僅在權限系統完全損壞時使用
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">操作後的建議步驟</h4>
            <p className="text-sm text-muted-foreground">
              1. 使用指派權限的帳號重新登入系統<br/>
              2. 前往「成員管理」→「權限管理」重建角色設定<br/>
              3. 為其他用戶分配適當的角色和權限<br/>
              4. 測試所有功能是否正常運作
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}