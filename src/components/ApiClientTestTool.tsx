'use client';

import React, { useState } from 'react';
import { useApiClient, useApiForm, useApiCrud, useApiSilent } from '@/hooks/useApiClient';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * 🧪 API 客戶端測試工具
 * 
 * 用於驗證統一 API 客戶端的各項功能
 */
export function ApiClientTestTool() {
  const [testResults, setTestResults] = useState<string[]>([]);
  
  // 測試不同的 Hook 變體
  const genericClient = useApiClient();
  const formClient = useApiForm();
  const crudClient = useApiCrud();
  const silentClient = useApiSilent();

  const addTestResult = (message: string) => {
    setTestResults(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev]);
  };

  // 測試基本 API 調用
  const testBasicApiCall = async () => {
    addTestResult('🧪 開始測試基本 API 調用...');
    
    try {
      const result = await genericClient.callGeneric('getRoles', undefined, {
        showLoadingToast: true,
        loadingMessage: '測試載入中...',
        showSuccessToast: false,
      });
      
      if (result.success) {
        addTestResult('✅ 基本 API 調用成功');
        addTestResult(`📊 統計: 成功 ${genericClient.stats.successfulCalls}, 失敗 ${genericClient.stats.failedCalls}`);
      } else {
        addTestResult(`❌ 基本 API 調用失敗: ${result.error?.message}`);
      }
    } catch (error: any) {
      addTestResult(`💥 基本 API 調用異常: ${error.message}`);
    }
  };

  // 測試類型安全的 API 調用
  const testTypedApiCall = async () => {
    addTestResult('🧪 開始測試類型安全 API 調用...');
    
    try {
      const result = await genericClient.call('getRoles');
      
      if (result.success) {
        addTestResult('✅ 類型安全 API 調用成功');
        addTestResult(`📋 回傳資料類型: ${typeof result.data}`);
      } else {
        addTestResult(`❌ 類型安全 API 調用失敗: ${result.error?.message}`);
      }
    } catch (error: any) {
      addTestResult(`💥 類型安全 API 調用異常: ${error.message}`);
    }
  };

  // 測試錯誤處理
  const testErrorHandling = async () => {
    addTestResult('🧪 開始測試錯誤處理...');
    
    try {
      const result = await genericClient.callGeneric('nonExistentFunction', {}, {
        showErrorToast: false, // 避免干擾測試
      });
      
      if (!result.success) {
        addTestResult('✅ 錯誤處理正常工作');
        addTestResult(`🚨 錯誤代碼: ${result.error?.code}`);
        addTestResult(`📝 錯誤訊息: ${result.error?.message}`);
      } else {
        addTestResult('⚠️ 應該返回錯誤但返回了成功');
      }
    } catch (error: any) {
      addTestResult(`✅ 異常錯誤處理正常: ${error.message}`);
    }
  };

  // 測試批次 API 調用
  const testBatchApiCall = async () => {
    addTestResult('🧪 開始測試批次 API 調用...');
    
    try {
      const results = await genericClient.batchCall([
        { endpoint: 'getRoles', data: undefined },
        { endpoint: 'getRoles', data: undefined }, // 重複調用測試
      ]);
      
      const successCount = results.filter(r => r.success).length;
      addTestResult(`✅ 批次調用完成: ${successCount}/${results.length} 成功`);
      addTestResult(`📊 批次統計更新: 總計 ${genericClient.stats.totalCalls} 次調用`);
    } catch (error: any) {
      addTestResult(`💥 批次 API 調用異常: ${error.message}`);
    }
  };

  // 測試重試機制 (使用 callGeneric 來測試不存在的函數)
  const testRetryMechanism = async () => {
    addTestResult('🧪 開始測試重試機制...');
    
    try {
      // 測試存在的函數的重試機制
      const result = await genericClient.callWithRetry('getRoles', undefined, {
        maxRetries: 2,
        retryDelay: 500,
        showErrorToast: false,
      });
      
      addTestResult(`🔄 重試機制測試完成，最終結果: ${result.success ? '成功' : '失敗'}`);
      addTestResult(`📈 總調用次數: ${genericClient.stats.totalCalls}`);
    } catch (error: any) {
      addTestResult(`✅ 重試機制正常異常處理: ${error.message}`);
    }
  };

  // 測試不同 Hook 變體
  const testHookVariants = async () => {
    addTestResult('🧪 開始測試 Hook 變體...');
    
    // 測試 CRUD Hook
    try {
      const result = await crudClient.read('getRoles');
      addTestResult(`✅ CRUD Hook 讀取測試: ${result.success ? '成功' : '失敗'}`);
    } catch (error: any) {
      addTestResult(`❌ CRUD Hook 測試異常: ${error.message}`);
    }
    
    // 測試 Silent Hook
    try {
      const result = await silentClient.call('getRoles');
      addTestResult(`✅ Silent Hook 測試: ${result.success ? '成功' : '失敗'} (無 toast)`);
    } catch (error: any) {
      addTestResult(`❌ Silent Hook 測試異常: ${error.message}`);
    }
  };

  // 測試併發控制
  const testConcurrencyControl = async () => {
    addTestResult('🧪 開始測試併發控制...');
    
    try {
      // 同時發起多個請求測試併發限制
      const promises = Array(8).fill(null).map((_, index) =>
        genericClient.callGeneric('getRoles', undefined, {
          showLoadingToast: false,
          showSuccessToast: false,
          showErrorToast: false,
        })
      );
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      
      addTestResult(`🚦 併發控制測試: ${successCount}/8 個請求成功`);
      addTestResult(`⚡ 載入狀態管理: ${genericClient.loading ? '正在載入' : '載入完成'}`);
    } catch (error: any) {
      addTestResult(`💥 併發控制測試異常: ${error.message}`);
    }
  };

  // 執行完整測試套件
  const runFullTestSuite = async () => {
    setTestResults([]);
    addTestResult('🚀 開始執行完整 API 客戶端測試套件...');
    
    await testBasicApiCall();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testTypedApiCall();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testErrorHandling();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testBatchApiCall();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testRetryMechanism();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testHookVariants();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testConcurrencyControl();
    
    addTestResult('🎉 完整測試套件執行完成！');
    toast.success('API 客戶端測試套件執行完成');
  };

  const clearResults = () => {
    setTestResults([]);
    addTestResult('🧹 測試結果已清除');
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🧪 API 客戶端測試工具</h2>
        <p className="text-gray-600">測試統一 API 客戶端的各項功能</p>
      </div>

      {/* Hook 狀態顯示 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="font-semibold text-blue-600">Generic Client</div>
          <div className={`text-sm ${genericClient.loading ? 'text-orange-600' : 'text-gray-600'}`}>
            {genericClient.loading ? '載入中' : '待命'}
          </div>
          <div className="text-xs text-gray-500">
            成功: {genericClient.stats.successfulCalls} | 失敗: {genericClient.stats.failedCalls}
          </div>
        </div>
        
        <div className="text-center">
          <div className="font-semibold text-green-600">Form Client</div>
          <div className={`text-sm ${formClient.loading ? 'text-orange-600' : 'text-gray-600'}`}>
            {formClient.loading ? '載入中' : '待命'}
          </div>
          <div className="text-xs text-gray-500">
            成功: {formClient.stats.successfulCalls} | 失敗: {formClient.stats.failedCalls}
          </div>
        </div>
        
        <div className="text-center">
          <div className="font-semibold text-purple-600">CRUD Client</div>
          <div className={`text-sm ${crudClient.loading ? 'text-orange-600' : 'text-gray-600'}`}>
            {crudClient.loading ? '載入中' : '待命'}
          </div>
          <div className="text-xs text-gray-500">
            成功: {crudClient.stats.successfulCalls} | 失敗: {crudClient.stats.failedCalls}
          </div>
        </div>
        
        <div className="text-center">
          <div className="font-semibold text-gray-600">Silent Client</div>
          <div className={`text-sm ${silentClient.loading ? 'text-orange-600' : 'text-gray-600'}`}>
            {silentClient.loading ? '載入中' : '待命'}
          </div>
          <div className="text-xs text-gray-500">
            成功: {silentClient.stats.successfulCalls} | 失敗: {silentClient.stats.failedCalls}
          </div>
        </div>
      </div>

      {/* 測試按鈕 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Button onClick={testBasicApiCall} variant="outline" size="sm">
          基本調用
        </Button>
        <Button onClick={testTypedApiCall} variant="outline" size="sm">
          類型安全
        </Button>
        <Button onClick={testErrorHandling} variant="outline" size="sm">
          錯誤處理
        </Button>
        <Button onClick={testBatchApiCall} variant="outline" size="sm">
          批次調用
        </Button>
        <Button onClick={testRetryMechanism} variant="outline" size="sm">
          重試機制
        </Button>
        <Button onClick={testHookVariants} variant="outline" size="sm">
          Hook 變體
        </Button>
        <Button onClick={testConcurrencyControl} variant="outline" size="sm">
          併發控制
        </Button>
        <Button onClick={runFullTestSuite} className="bg-blue-600 hover:bg-blue-700">
          完整測試
        </Button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">測試結果</h3>
        <Button onClick={clearResults} variant="outline" size="sm">
          清除結果
        </Button>
      </div>

      {/* 測試結果顯示 */}
      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
        {testResults.length === 0 ? (
          <div className="text-gray-500">尚無測試結果...</div>
        ) : (
          testResults.map((result, index) => (
            <div key={index} className="mb-1">
              {result}
            </div>
          ))
        )}
      </div>
    </div>
  );
}