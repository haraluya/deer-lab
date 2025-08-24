'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthWrapper } from '@/components/AuthWrapper';

function TestPageContent() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log('TestPage: 頁面已載入');
    console.log('TestPage: 當前路徑:', pathname);
  }, [pathname]);

  if (!mounted) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">測試頁面載入中...</h1>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">測試頁面</h1>
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h2 className="font-semibold mb-2">路由資訊</h2>
          <p><strong>當前路徑:</strong> {pathname}</p>
          <p><strong>頁面組件:</strong> TestPageContent</p>
          <p><strong>載入時間:</strong> {new Date().toLocaleString()}</p>
        </div>
        
        <div className="p-4 bg-green-50 rounded-lg">
          <h2 className="font-semibold mb-2">測試內容</h2>
          <p>如果您看到這個內容，說明路由工作正常！</p>
          <p>這個頁面應該顯示測試內容，而不是 dashboard 內容。</p>
        </div>

        <div className="p-4 bg-yellow-50 rounded-lg">
          <h2 className="font-semibold mb-2">導航測試</h2>
          <p>請嘗試點擊側邊欄的其他分頁，看看是否能正確切換。</p>
        </div>
      </div>
    </div>
  );
}

export default function TestPage() {
  return (
    <AuthWrapper>
      <TestPageContent />
    </AuthWrapper>
  );
}
