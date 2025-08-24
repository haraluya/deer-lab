// src/app/page.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Factory } from "lucide-react";

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState(''); // 員工工號
  const [password, setPassword] = useState('');     // 密碼
  const [error, setError] = useState('');           // 錯誤訊息
  const [isLoading, setIsLoading] = useState(false);  // 載入狀態

  const { user } = useAuth(); // 從我們的 AuthContext 取得使用者狀態
  const router = useRouter(); // Next.js 的路由工具

  // 如果使用者已經登入，就直接導向到 dashboard
  useEffect(() => {
    if (user && !isLoading) {
      router.push('/dashboard');
    }
  }, [user, router, isLoading]);

  // 表單提交處理函式
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault(); // 防止表單預設的重新整理行為
    setError('');
    setIsLoading(true);

    // 檢查 Firebase 是否正確初始化
    if (!auth) {
      setError('系統初始化中，請稍後再試。');
      setIsLoading(false);
      return;
    }

    // PRD 規格：使用「工號」登入
    // Firebase Auth 的標準是 Email，所以我們做一個轉換
    // 將工號 `admin` 轉換成 `admin@deer-lab.local` 這樣的格式
    // 這個 `@deer-lab.local` 是一個虛構的域名，僅用於滿足 Firebase 格式要求
    const email = `${employeeId}@deer-lab.local`;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // 登入成功後，上面的 useEffect 會偵測到 user 狀態變化，並自動跳轉
    } catch (e) { // *** 修改點 1: 將 (error: any) 改為 (e)，讓 TypeScript 自動推斷為 'unknown' 型別，更安全。
      
      // *** 修改點 2: 增加型別檢查，確保 'e' 是我們預期的 Firebase 錯誤物件格式。
      // 這樣做可以避免執行時錯誤，並解決 ESLint 的警告。
      if (e instanceof Error && 'code' in e && typeof e.code === 'string') {
        const firebaseError = e as { code: string; message: string }; // 進行型別斷言，方便後續使用
        console.error(firebaseError.code, firebaseError.message);
        
        if (firebaseError.code === 'auth/invalid-credential' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/user-not-found') {
          setError('工號或密碼錯誤，請重新輸入。');
        } else if (firebaseError.code === 'auth/network-request-failed') {
          setError('網路連線失敗，請檢查網路連線後再試。');
        } else if (firebaseError.code === 'auth/too-many-requests') {
          setError('登入嘗試次數過多，請稍後再試。');
        } else {
          setError('發生未知錯誤，請稍後再試。');
        }
      } else {
        // 如果錯誤不是我們預期的格式，給一個通用的錯誤訊息
        setError('發生一個非預期的錯誤。');
        console.error("An unexpected error occurred:", e);
      }

    } finally {
      setIsLoading(false); // 無論成功或失敗，都結束載入狀態
    }
  };

  // 如果正在載入或已經登入，顯示載入中，避免使用者看到登入頁
  if (isLoading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在處理登入...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-md px-4 sm:px-0">
        <Card className="text-card-foreground flex flex-col gap-6 rounded-xl py-6 w-full shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 text-center pb-6">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Factory className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Deer Lab
            </CardTitle>
            <CardDescription className="text-lg text-gray-600 mt-2">
              生產管理系統
            </CardDescription>
            <p className="text-sm text-gray-500 mt-2">
              請輸入您的工號與密碼以登入系統
            </p>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="px-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="employeeId">工號</Label>
                <Input
                  type="text"
                  id="employeeId"
                  placeholder="例如: admin"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密碼</Label>
                <Input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex items-center px-6 [.border-t]:pt-6 pt-6">
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? '登入中...' : '登入'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}
