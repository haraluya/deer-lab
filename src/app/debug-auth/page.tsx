'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';

export default function DebugAuthPage() {
  const { user, appUser, isLoading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [authState, setAuthState] = useState<any>(null);

  useEffect(() => {
    console.log('🔍 DebugAuthPage 載入');
    
    // 直接監聽 Firebase Auth 狀態
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        console.log('🔄 Firebase Auth 狀態變更:', firebaseUser?.uid);
        setAuthState(firebaseUser);
      });
    }

    const info = {
      authContextLoading: isLoading,
      authContextUser: user?.uid,
      authContextAppUser: appUser?.name,
      firebaseAuth: !!auth,
      firestore: !!db,
      authStateUser: authState?.uid
    };

    setDebugInfo(info);
    console.log('🔍 調試信息:', info);

    return () => {
      if (auth) {
        // unsubscribe 需要在 auth 存在時才能調用
      }
    };
  }, [user, appUser, isLoading, authState]);

  const testDirectLogin = async () => {
    try {
      console.log('🔐 直接登入測試...');
      
      if (!auth) {
        throw new Error("Firebase Auth 未初始化");
      }
      
      const result = await signInWithEmailAndPassword(auth, '001@deer-lab.local', '123456');
      console.log('✅ 直接登入成功:', result.user.uid);
      
      alert('直接登入成功！');
      
    } catch (error: any) {
      console.error('❌ 直接登入失敗:', error);
      alert(`直接登入失敗: ${error.message}`);
    }
  };

  const checkAuthState = () => {
    console.log('🔍 檢查認證狀態...');
    console.log('AuthContext User:', user);
    console.log('AuthContext AppUser:', appUser);
    console.log('Firebase Auth State:', authState);
    console.log('AuthContext Loading:', isLoading);
    
    alert('請查看瀏覽器控制台的詳細信息');
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">🔍 AuthContext 詳細調試</h1>
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>AuthContext 狀態</CardTitle>
            <CardDescription>AuthContext 的當前狀態</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Loading: {debugInfo.authContextLoading ? '是' : '否'}</p>
              <p>User: {debugInfo.authContextUser || '無'}</p>
              <p>AppUser: {debugInfo.authContextAppUser || '無'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Firebase 狀態</CardTitle>
            <CardDescription>Firebase 服務的狀態</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Firebase Auth: {debugInfo.firebaseAuth ? '✅' : '❌'}</p>
              <p>Firestore: {debugInfo.firestore ? '✅' : '❌'}</p>
              <p>Auth State User: {debugInfo.authStateUser || '無'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>測試操作</CardTitle>
            <CardDescription>執行各種測試操作</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={testDirectLogin} className="w-full">
              🔐 直接登入測試
            </Button>
            <Button onClick={checkAuthState} className="w-full" variant="outline">
              🔍 檢查認證狀態
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>詳細信息</CardTitle>
            <CardDescription>更多調試信息</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>AuthContext 是否響應: {user !== undefined ? '✅' : '❌'}</p>
              <p>AppUser 是否響應: {appUser !== undefined ? '✅' : '❌'}</p>
              <p>Loading 是否響應: {isLoading !== undefined ? '✅' : '❌'}</p>
              <p>Firebase Auth 狀態: {authState ? '已設置' : '未設置'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
