'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import Image from 'next/image';

export default function LoginPage() {
  const { login, isLoading, appUser } = useAuth();
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 已登入自動跳轉到 dashboard
  useEffect(() => {
    if (!isLoading && appUser) {
      router.push('/dashboard');
    }
  }, [isLoading, appUser, router]);

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

  // 載入中顯示載入畫面
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="text-gray-600 font-medium">檢查登入狀態...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* 背景裝飾元素 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-pink-400/20 to-orange-400/20 blur-3xl"></div>
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-to-br from-purple-400/10 to-blue-400/10 blur-2xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full bg-gradient-to-br from-orange-400/10 to-pink-400/10 blur-2xl"></div>
      </div>
      
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          {/* Logo 和品牌區域 */}
          <div className="flex flex-col items-center mb-4">
            <div className="w-24 h-24 rounded-2xl overflow-hidden mb-4 shadow-lg border-2 border-gray-200 bg-white p-1">
              <Image 
                src="/dexters-lab-logo.png" 
                alt="Dexter's Laboratory" 
                width={88} 
                height={88} 
                className="w-full h-full object-contain rounded-xl" 
              />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-700 bg-clip-text text-transparent">
              德科斯特的實驗室
            </CardTitle>
            <div className="text-sm text-gray-600 mt-2 px-4 py-1 bg-gray-100 rounded-full">
              Dexter&apos;s Lab Production Management
            </div>
          </div>
          <CardDescription className="text-base text-gray-600 font-medium">
            歡迎回來！請登入您的帳戶
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="employeeId" className="text-sm font-semibold text-gray-700">
                員工編號
              </Label>
              <div className="relative">
                <Input
                  id="employeeId"
                  type="text"
                  placeholder="請輸入您的員工編號"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  disabled={isLoggingIn || isLoading}
                  required
                  className="h-12 pl-4 pr-4 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-200 rounded-xl text-base transition-all duration-200 bg-white/80"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"></div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                密碼
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="請輸入您的密碼"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoggingIn || isLoading}
                  required
                  className="h-12 pl-4 pr-4 border-2 border-gray-200 focus:border-purple-500 focus:ring-purple-200 rounded-xl text-base transition-all duration-200 bg-white/80"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"></div>
                </div>
              </div>
            </div>
            
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl relative overflow-hidden"
                disabled={isLoggingIn || isLoading}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000"></div>
                <span className="relative z-10">
                  {isLoggingIn ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      登入中...
                    </div>
                  ) : (
                    '立即登入'
                  )}
                </span>
              </Button>
            </div>
          </form>
          
          {/* 裝飾性元素 */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                © 2024 德科斯特的實驗室 · 生產管理系統
              </p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <div className="w-1 h-1 rounded-full bg-blue-400"></div>
                <div className="w-1 h-1 rounded-full bg-purple-400"></div>
                <div className="w-1 h-1 rounded-full bg-pink-400"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
