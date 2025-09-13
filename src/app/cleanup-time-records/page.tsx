'use client';

import { useState } from 'react';
import { useApiClient } from '@/hooks/useApiClient';
import { useAuth } from '@/context/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Trash2, CheckCircle } from 'lucide-react';

export default function CleanupTimeRecordsPage() {
  const { appUser } = useAuth();
  const { isAdmin, isForeman } = usePermission();
  const apiClient = useApiClient();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const executeCleanup = async () => {
    if (!appUser) {
      toast.error('請先登入');
      return;
    }

    // 確認用戶有管理員權限
    if (!isAdmin() && !isForeman()) {
      toast.error('權限不足，只有管理員和生產領班可以執行此操作');
      return;
    }

    try {
      setIsLoading(true);
      console.log('開始執行清理無效工時記錄...');

      // 呼叫統一API客戶端進行清理
      const result = await apiClient.call('cleanupInvalidTimeRecords', {});

      if (!result.success) {
        throw new Error(result.error?.message || '清理操作失敗');
      }

      console.log('清理結果:', result.data);
      setResult(result.data);
      toast.success('清理操作完成！');

    } catch (error: any) {
      console.error('清理操作失敗:', error);
      toast.error(`清理失敗: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!appUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">請先登入系統</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-6 w-6" />
              清理無效工時記錄
            </CardTitle>
            <p className="text-sm text-gray-600">
              此操作會清理所有沒有對應工單或工單不存在的工時記錄
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 警告訊息 */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">
                      注意事項
                    </h3>
                    <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
                      <li>此操作會永久刪除無效的工時記錄</li>
                      <li>只有管理員和生產領班可以執行此操作</li>
                      <li>建議在系統維護時間執行</li>
                      <li>執行前請確認已備份重要資料</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 用戶資訊 */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm">
                  <strong>當前用戶：</strong> {appUser.name} ({appUser.roleName || '未設定'})
                </p>
                <p className="text-sm">
                  <strong>員工編號：</strong> {appUser.employeeId}
                </p>
              </div>

              {/* 執行按鈕 */}
              <div className="flex justify-center">
                <Button
                  onClick={executeCleanup}
                  disabled={isLoading || (!isAdmin() && !isForeman())}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      執行中...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      執行清理
                    </>
                  )}
                </Button>
              </div>

              {/* 結果顯示 */}
              {result && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                    <div className="w-full">
                      <h3 className="text-sm font-medium text-green-800 mb-2">
                        清理完成
                      </h3>
                      <div className="text-sm text-green-700 space-y-1">
                        <p><strong>檢查記錄數：</strong> {result.checkedCount}</p>
                        <p><strong>清理記錄數：</strong> {result.deletedCount}</p>
                        <p><strong>訊息：</strong> {result.message}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 說明文件 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">清理邏輯說明：</h4>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>檢查 timeEntries 集合中的所有工時記錄</li>
                  <li>刪除沒有 workOrderId 的記錄</li>
                  <li>刪除 workOrderId 對應的工單不存在的記錄</li>
                  <li>保留有效的工時記錄不變</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}