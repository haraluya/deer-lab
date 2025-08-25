'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForceLoginPage() {
  const [status, setStatus] = useState('準備中...');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authState, setAuthState] = useState<any>(null);

  const { user, appUser, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // 強制登入函數
  const forceLogin = async () => {
    setIsLoading(true);
    setError('');
    setStatus('正在強制登入...');

    try {
      if (!auth) {
        throw new Error("Firebase Auth 未初始化");
      }
      
      // 嘗試登入
      const email = '001@deer-lab.local';
      const password = '123456';
      
      console.log('🔐 強制登入:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ 強制登入成功:', result.user.uid);
      
      setStatus('登入成功！等待 AuthContext 更新...');
      
      // 等待 AuthContext 更新
      await new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth!, (user) => {
          if (user) {
            console.log('✅ AuthContext 已更新:', user.uid);
            setAuthState(user);
            unsubscribe();
            resolve(true);
          }
        });
        
        // 10秒超時
        setTimeout(() => {
          unsubscribe();
          resolve(false);
        }, 10000);
      });
      
      setStatus('AuthContext 更新完成！正在跳轉...');
      
      // 等待一下再跳轉
      setTimeout(() => {
        router.push('/dashboard/personnel');
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ 強制登入失敗:', error);
      setError(`強制登入失敗: ${error.message}`);
      setStatus('登入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 檢查當前狀態
  useEffect(() => {
    console.log('🔍 檢查當前狀態...');
    console.log('AuthContext Loading:', authLoading);
    console.log('User:', user?.uid);
    console.log('AppUser:', appUser?.name);
    
    if (user && appUser) {
      setStatus('已登入！正在跳轉...');
      setTimeout(() => {
        router.push('/dashboard/personnel');
      }, 1000);
    }
  }, [user, appUser, authLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">🔧 強制登入修復</CardTitle>
          <CardDescription className="text-center">
            修復 AuthContext 登入問題
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 當前狀態 */}
          <div className="mb-4 p-3 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">📊 當前狀態:</h3>
            <p>AuthContext Loading: {authLoading ? '是' : '否'}</p>
            <p>用戶已登入: {user ? '是' : '否'}</p>
            <p>用戶資料: {appUser ? `${appUser.name} (${appUser.employeeId})` : '無'}</p>
            <p>Firebase Auth: {auth ? '已初始化' : '未初始化'}</p>
          </div>

          {/* 狀態顯示 */}
          <div className="mb-4 p-3 bg-blue-100 rounded">
            <h3 className="font-semibold mb-2">🔄 操作狀態:</h3>
            <p>{status}</p>
          </div>

          {/* 強制登入按鈕 */}
          <Button 
            onClick={forceLogin}
            disabled={isLoading || !!user}
            className="w-full mb-4"
            size="lg"
          >
            {isLoading ? '登入中...' : user ? '已登入' : '🔧 強制登入'}
          </Button>

          {/* 手動跳轉按鈕 */}
          {user && appUser && (
            <Button 
              onClick={() => router.push('/dashboard/personnel')}
              className="w-full"
              variant="outline"
            >
              🚀 前往人員管理
            </Button>
          )}

          {/* 錯誤訊息 */}
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* 調試信息 */}
          <div className="mt-4 p-3 bg-yellow-100 rounded text-sm">
            <h3 className="font-semibold mb-2">🔍 調試信息:</h3>
            <p>環境變數: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '已設置' : '未設置'}</p>
            <p>用戶 UID: {user?.uid || '無'}</p>
            <p>AuthState: {authState?.uid || '無'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
