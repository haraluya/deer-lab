'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import Image from 'next/image';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeId || !password) {
      toast.error('請輸入員工編號和密碼');
      return;
    }

    setIsLoggingIn(true);
    
    try {
      // 使用工號登入
      const success = await login(employeeId, password);
      
      if (success) {
        // 登入成功後跳轉到儀表板
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('登入錯誤:', error);
      toast.error('登入失敗，請檢查您的憑證');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Image src="/icon.png" alt="Deer Lab Logo" width={48} height={48} className="mr-3" />
            <CardTitle className="text-2xl font-bold">Deer Lab</CardTitle>
          </div>
          <CardDescription>生產管理系統</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">員工編號</Label>
              <Input
                id="employeeId"
                type="text"
                placeholder="請輸入員工編號"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={isLoggingIn || isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                type="password"
                placeholder="請輸入密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn || isLoading}
                required
              />
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoggingIn || isLoading}
            >
              {isLoggingIn ? '登入中...' : '登入'}
            </Button>
          </form>
          

        </CardContent>
      </Card>
    </div>
  );
}
