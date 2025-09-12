'use client';

import React from 'react';
import { ApiClientTestTool } from '@/components/ApiClientTestTool';
import { StandardFormDialogTestSuite } from '@/components/StandardFormDialogTestSuite';

/**
 * 🧪 API 客戶端測試頁面
 * 
 * 用於測試和驗證統一 API 客戶端的各項功能
 */
export default function TestApiClientPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🧪 API 客戶端測試頁面
          </h1>
          <p className="text-gray-600">
            測試鹿鹿小作坊統一 API 客戶端的各項功能
          </p>
        </div>
        
        <ApiClientTestTool />
        
        <div className="mt-12">
          <StandardFormDialogTestSuite />
        </div>
        
        <div className="mt-8 p-6 bg-blue-50 rounded-xl">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 測試說明</h3>
          <ul className="space-y-2 text-blue-700">
            <li>• <strong>基本調用</strong>：測試基礎的 API 調用功能</li>
            <li>• <strong>類型安全</strong>：測試 TypeScript 類型安全的 API 調用</li>
            <li>• <strong>錯誤處理</strong>：測試錯誤回應的處理機制</li>
            <li>• <strong>批次調用</strong>：測試同時調用多個 API 的功能</li>
            <li>• <strong>重試機制</strong>：測試失敗時的自動重試功能</li>
            <li>• <strong>Hook 變體</strong>：測試不同用途的 Hook 變體</li>
            <li>• <strong>併發控制</strong>：測試並發請求的管理機制</li>
            <li>• <strong>完整測試</strong>：執行所有測試項目</li>
          </ul>
        </div>
        
        <div className="mt-6 p-6 bg-green-50 rounded-xl">
          <h3 className="text-lg font-semibold text-green-800 mb-3">✅ 驗證項目</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-green-700">
            <div>
              <h4 className="font-semibold mb-2">功能測試</h4>
              <ul className="space-y-1 text-sm">
                <li>• API 調用成功/失敗處理</li>
                <li>• 載入狀態管理</li>
                <li>• Toast 提示顯示</li>
                <li>• 錯誤訊息格式化</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">效能測試</h4>
              <ul className="space-y-1 text-sm">
                <li>• 併發請求限制</li>
                <li>• 重試機制效率</li>
                <li>• 批次調用效能</li>
                <li>• 記憶體使用情況</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}