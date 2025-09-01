'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserCheck, Database } from 'lucide-react';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { ALL_PERMISSIONS } from '@/utils/permissions';

export default function TempAdminPage() {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const setAdminPermissions = async () => {
    if (!user) {
      toast.error('需要登入才能執行操作');
      return;
    }

    setIsProcessing(true);
    try {
      const db = getFirestore();
      
      // 查找工號052的用戶
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('employeeId', '==', '052'));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast.error('找不到工號052的用戶');
        return;
      }
      
      // 更新用戶權限
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      await updateDoc(userDoc.ref, {
        roleName: '系統管理員',
        permissions: ALL_PERMISSIONS,
        updatedAt: serverTimestamp(),
        tempAdminGrantedBy: user.uid,
        tempAdminGrantedAt: new Date().toISOString()
      });
      
      toast.success(`已為 ${userData.name} (052) 設定完整管理員權限`);
      
      console.log('權限設定完成:', {
        user: userData.name,
        employeeId: '052',
        permissionCount: ALL_PERMISSIONS.length,
        permissions: ALL_PERMISSIONS
      });
      
    } catch (error) {
      console.error('設定權限失敗:', error);
      toast.error('設定權限失敗: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">臨時管理員權限設定</h1>
          <p className="text-muted-foreground mt-2">快速為工號052設定系統管理員權限</p>
        </div>
        <Badge variant="secondary">
          <Database className="h-4 w-4 mr-2" />
          直接資料庫操作
        </Badge>
      </div>

      {/* 操作卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            權限設定操作
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">操作說明</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 此功能將直接更新 Firestore 資料庫中的用戶權限</li>
              <li>• 為工號 052 的用戶設定完整的系統管理員權限</li>
              <li>• 包含所有 {ALL_PERMISSIONS.length} 項系統權限</li>
              <li>• 設定後該用戶需要重新登入以載入新權限</li>
            </ul>
          </div>
          
          <Button 
            onClick={setAdminPermissions}
            disabled={isProcessing || !user}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              '處理中...'
            ) : (
              <>
                <UserCheck className="h-5 w-5 mr-2" />
                為工號 052 設定管理員權限
              </>
            )}
          </Button>
          
          {!user && (
            <p className="text-sm text-red-600 text-center">
              請先登入系統才能執行權限設定操作
            </p>
          )}
        </CardContent>
      </Card>

      {/* 權限詳情 */}
      <Card>
        <CardHeader>
          <CardTitle>將設定的權限列表</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            共 {ALL_PERMISSIONS.length} 項權限，包含所有系統功能的查看和管理權限：
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
            {ALL_PERMISSIONS.map((permission, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {permission}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}