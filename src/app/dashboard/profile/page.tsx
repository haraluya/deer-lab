'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { User, Phone, Shield, Calendar } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function ProfilePage() {
  const { appUser, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  useEffect(() => {
    if (appUser) {
      setFormData({
        name: appUser.name || '',
        phone: appUser.phone || '',
      });
    }
  }, [appUser]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!appUser) {
      toast.error('無法獲取用戶資料');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('姓名不能為空');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('電話不能為空');
      return;
    }

    setIsSubmitting(true);
    try {
      const functions = getFunctions();
      const updateUser = httpsCallable(functions, 'updateUser');
      
      await updateUser({
        uid: appUser.uid,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
      });

      toast.success('資料更新成功！');
      setIsEditing(false);
      // 重新載入頁面以更新資料
      window.location.reload();
    } catch (error: any) {
      console.error('更新失敗:', error);
      toast.error(error.message || '更新失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: appUser?.name || '',
      phone: appUser?.phone || '',
    });
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (!appUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-muted-foreground">無法載入用戶資料</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            個人資料
          </h1>
          <p className="text-muted-foreground mt-2">管理您的個人資料和帳戶設定</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              基本資料
            </CardTitle>
            <CardDescription>
              您可以修改您的姓名和聯絡資訊
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 員工編號 - 不可編輯 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                員工編號
              </Label>
              <Input
                value={appUser.employeeId || 'N/A'}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground">
                員工編號無法修改，如有問題請聯絡管理員
              </p>
            </div>

            {/* 姓名 - 可編輯 */}
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="請輸入姓名"
                />
              ) : (
                <Input
                  value={appUser.name || 'N/A'}
                  disabled
                  className="bg-gray-50"
                />
              )}
            </div>

            {/* 電話 - 可編輯 */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                電話
              </Label>
              {isEditing ? (
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="請輸入電話號碼"
                />
              ) : (
                <Input
                  value={appUser.phone || 'N/A'}
                  disabled
                  className="bg-gray-50"
                />
              )}
            </div>

            {/* 角色 - 不可編輯 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                角色
              </Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {appUser.roleName || '未設定'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                角色權限由管理員設定，無法自行修改
              </p>
            </div>

            {/* 狀態 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                帳戶狀態
              </Label>
              <div className="flex items-center gap-2">
                <Badge variant={appUser.status === 'active' ? 'default' : 'destructive'}>
                  {appUser.status === 'active' ? '啟用' : '停用'}
                </Badge>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-4 pt-4">
              {isEditing ? (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? '儲存中...' : '儲存變更'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    取消
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="flex-1"
                >
                  編輯資料
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
