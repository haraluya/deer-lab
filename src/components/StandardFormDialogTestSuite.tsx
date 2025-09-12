'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import StandardFormDialog from '@/components/StandardFormDialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, TestTube, User, Package, Truck, Edit } from 'lucide-react';

/**
 * 🧪 StandardFormDialog 測試套件
 * 
 * 用於驗證重構後的 StandardFormDialog 與統一 API 客戶端的整合
 */
export function StandardFormDialogTestSuite() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [openDialogs, setOpenDialogs] = useState<Record<string, boolean>>({});

  const addTestResult = (message: string) => {
    setTestResults(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev]);
  };

  const openDialog = (dialogId: string) => {
    setOpenDialogs(prev => ({ ...prev, [dialogId]: true }));
    addTestResult(`🔓 開啟對話框: ${dialogId}`);
  };

  const closeDialog = (dialogId: string) => {
    setOpenDialogs(prev => ({ ...prev, [dialogId]: false }));
    addTestResult(`🔒 關閉對話框: ${dialogId}`);
  };

  const onSuccess = (dialogId: string) => {
    addTestResult(`✅ 對話框 ${dialogId} 提交成功`);
    closeDialog(dialogId);
    toast.success(`${dialogId} 操作成功！`);
  };

  // 測試用的表單 Schema
  const testUserSchema = z.object({
    name: z.string().min(1, '姓名必填'),
    email: z.string().email('請輸入有效的電子郵件'),
    role: z.string().min(1, '角色必填'),
    department: z.string().optional(),
  });

  const testSupplierSchema = z.object({
    name: z.string().min(1, '供應商名稱必填'),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('請輸入有效的電子郵件').optional().or(z.literal('')),
    address: z.string().optional(),
  });

  const testProductSchema = z.object({
    name: z.string().min(1, '產品名稱必填'),
    category: z.string().min(1, '分類必填'),
    type: z.string().min(1, '類型必填'),
    description: z.string().optional(),
  });

  // 測試自訂提交邏輯
  const customSubmitTest = async (values: any, isEditMode: boolean) => {
    addTestResult(`🔧 執行自訂提交邏輯 (編輯模式: ${isEditMode})`);
    addTestResult(`📋 提交資料: ${JSON.stringify(values, null, 2)}`);
    
    // 模擬 API 調用延遲
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 50% 機率模擬成功/失敗
    if (Math.random() > 0.5) {
      addTestResult(`✅ 自訂提交成功`);
    } else {
      addTestResult(`❌ 自訂提交失敗`);
      throw new Error('模擬提交失敗');
    }
  };

  // 測試提交前處理
  const beforeSubmitTest = async (values: any) => {
    addTestResult(`🔄 執行提交前處理`);
    addTestResult(`📝 原始資料: ${JSON.stringify(values)}`);
    
    // 添加時間戳記
    const processedValues = {
      ...values,
      timestamp: new Date().toISOString(),
      processed: true,
    };
    
    addTestResult(`🔧 處理後資料: ${JSON.stringify(processedValues)}`);
    return processedValues;
  };

  // 測試提交後處理
  const afterSubmitTest = (result: any, isEditMode: boolean) => {
    addTestResult(`🎉 執行提交後處理 (編輯模式: ${isEditMode})`);
    addTestResult(`📊 API 回應: ${JSON.stringify(result, null, 2)}`);
  };

  const clearResults = () => {
    setTestResults([]);
    addTestResult('🧹 測試結果已清除');
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🧪 StandardFormDialog 測試套件</h2>
        <p className="text-gray-600">測試重構後的 StandardFormDialog 與統一 API 客戶端整合</p>
      </div>

      {/* 測試按鈕區域 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {/* 基本功能測試 */}
        <Button
          onClick={() => openDialog('basic-user')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <User className="w-4 h-4 mr-2" />
          基本用戶表單
        </Button>

        <Button
          onClick={() => openDialog('supplier-form')}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Truck className="w-4 h-4 mr-2" />
          供應商表單
        </Button>

        <Button
          onClick={() => openDialog('product-form')}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Package className="w-4 h-4 mr-2" />
          產品表單
        </Button>

        {/* 進階功能測試 */}
        <Button
          onClick={() => openDialog('custom-submit')}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          <TestTube className="w-4 h-4 mr-2" />
          自訂提交
        </Button>

        <Button
          onClick={() => openDialog('edit-mode')}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Edit className="w-4 h-4 mr-2" />
          編輯模式
        </Button>
      </div>

      {/* 測試結果區域 */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">測試結果</h3>
        <Button onClick={clearResults} variant="outline" size="sm">
          清除結果
        </Button>
      </div>

      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-80 overflow-y-auto mb-6">
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

      {/* 對話框測試實例 */}
      {/* 基本用戶表單 */}
      <StandardFormDialog
        isOpen={openDialogs['basic-user'] || false}
        onOpenChange={(open) => !open && closeDialog('basic-user')}
        onSuccess={() => onSuccess('basic-user')}
        title="用戶"
        description="測試基本的用戶建立功能"
        formSchema={testUserSchema}
        sections={[
          {
            title: '基本資訊',
            color: 'blue',
            fields: [
              {
                name: 'name' as any,
                label: '姓名',
                type: 'text',
                placeholder: '請輸入姓名',
                required: true,
              },
              {
                name: 'email' as any,
                label: '電子郵件',
                type: 'text',
                placeholder: '請輸入電子郵件',
                required: true,
              },
              {
                name: 'role' as any,
                label: '角色',
                type: 'select',
                placeholder: '請選擇角色',
                required: true,
                selectOptions: [
                  { value: 'admin', label: '管理員' },
                  { value: 'user', label: '一般用戶' },
                  { value: 'viewer', label: '查看者' },
                ],
              },
              {
                name: 'department' as any,
                label: '部門',
                type: 'text',
                placeholder: '請輸入部門',
              },
            ],
          },
        ]}
        defaultValues={{
          name: '',
          email: '',
          role: '',
          department: '',
        }}
        createFunctionName="createUser"
        headerIcon={<User className="w-5 h-5 text-white" />}
      />

      {/* 供應商表單 */}
      <StandardFormDialog
        isOpen={openDialogs['supplier-form'] || false}
        onOpenChange={(open) => !open && closeDialog('supplier-form')}
        onSuccess={() => onSuccess('supplier-form')}
        title="供應商"
        description="測試供應商建立功能"
        formSchema={testSupplierSchema}
        sections={[
          {
            title: '供應商資訊',
            color: 'green',
            fields: [
              {
                name: 'name' as any,
                label: '供應商名稱',
                type: 'text',
                placeholder: '請輸入供應商名稱',
                required: true,
              },
              {
                name: 'contactPerson' as any,
                label: '聯絡人',
                type: 'text',
                placeholder: '請輸入聯絡人',
              },
              {
                name: 'phone' as any,
                label: '電話',
                type: 'text',
                placeholder: '請輸入電話',
              },
              {
                name: 'email' as any,
                label: '電子郵件',
                type: 'text',
                placeholder: '請輸入電子郵件',
              },
              {
                name: 'address' as any,
                label: '地址',
                type: 'textarea',
                placeholder: '請輸入地址',
              },
            ],
          },
        ]}
        defaultValues={{
          name: '',
          contactPerson: '',
          phone: '',
          email: '',
          address: '',
        }}
        createFunctionName="createSupplier"
        headerIcon={<Truck className="w-5 h-5 text-white" />}
      />

      {/* 產品表單 */}
      <StandardFormDialog
        isOpen={openDialogs['product-form'] || false}
        onOpenChange={(open) => !open && closeDialog('product-form')}
        onSuccess={() => onSuccess('product-form')}
        title="產品"
        description="測試產品建立功能"
        formSchema={testProductSchema}
        sections={[
          {
            title: '產品資訊',
            color: 'purple',
            fields: [
              {
                name: 'name' as any,
                label: '產品名稱',
                type: 'text',
                placeholder: '請輸入產品名稱',
                required: true,
              },
              {
                name: 'category' as any,
                label: '分類',
                type: 'select',
                placeholder: '請選擇分類',
                required: true,
                selectOptions: [
                  { value: '肥皂', label: '肥皂' },
                  { value: '洗髮精', label: '洗髮精' },
                  { value: '護膚品', label: '護膚品' },
                ],
              },
              {
                name: 'type' as any,
                label: '類型',
                type: 'select',
                placeholder: '請選擇類型',
                required: true,
                selectOptions: [
                  { value: '固態', label: '固態' },
                  { value: '液態', label: '液態' },
                  { value: '膏狀', label: '膏狀' },
                ],
              },
              {
                name: 'description' as any,
                label: '描述',
                type: 'textarea',
                placeholder: '請輸入產品描述',
              },
            ],
          },
        ]}
        defaultValues={{
          name: '',
          category: '',
          type: '',
          description: '',
        }}
        createFunctionName="createProduct"
        headerIcon={<Package className="w-5 h-5 text-white" />}
      />

      {/* 自訂提交測試 */}
      <StandardFormDialog
        isOpen={openDialogs['custom-submit'] || false}
        onOpenChange={(open) => !open && closeDialog('custom-submit')}
        onSuccess={() => onSuccess('custom-submit')}
        title="自訂提交測試"
        description="測試自訂提交邏輯"
        formSchema={testUserSchema}
        sections={[
          {
            title: '測試資料',
            color: 'orange',
            fields: [
              {
                name: 'name' as any,
                label: '姓名',
                type: 'text',
                placeholder: '請輸入姓名',
                required: true,
              },
              {
                name: 'email' as any,
                label: '電子郵件',
                type: 'text',
                placeholder: '請輸入電子郵件',
                required: true,
              },
              {
                name: 'role' as any,
                label: '角色',
                type: 'text',
                placeholder: '請輸入角色',
                required: true,
              },
            ],
          },
        ]}
        defaultValues={{
          name: '測試用戶',
          email: 'test@example.com',
          role: 'tester',
          department: '測試部門',
        }}
        customSubmit={customSubmitTest}
        beforeSubmit={beforeSubmitTest}
        afterSubmit={afterSubmitTest}
        headerIcon={<TestTube className="w-5 h-5 text-white" />}
      />

      {/* 編輯模式測試 */}
      <StandardFormDialog
        isOpen={openDialogs['edit-mode'] || false}
        onOpenChange={(open) => !open && closeDialog('edit-mode')}
        onSuccess={() => onSuccess('edit-mode')}
        title="編輯模式測試"
        description="測試編輯模式功能"
        formSchema={testUserSchema}
        sections={[
          {
            title: '編輯資料',
            color: 'red',
            fields: [
              {
                name: 'name' as any,
                label: '姓名',
                type: 'text',
                placeholder: '請輸入姓名',
                required: true,
              },
              {
                name: 'email' as any,
                label: '電子郵件',
                type: 'text',
                placeholder: '請輸入電子郵件',
                required: true,
              },
              {
                name: 'role' as any,
                label: '角色',
                type: 'text',
                placeholder: '請輸入角色',
                required: true,
              },
            ],
          },
        ]}
        defaultValues={{
          name: '',
          email: '',
          role: '',
          department: '',
        }}
        editData={{
          id: 'test-user-123',
          name: '現有用戶',
          email: 'existing@example.com',
          role: 'editor',
          department: '編輯部門',
        }}
        updateFunctionName="updateUser"
        customSubmit={customSubmitTest}
        beforeSubmit={beforeSubmitTest}
        afterSubmit={afterSubmitTest}
        headerIcon={<Edit className="w-5 h-5 text-white" />}
      />
    </div>
  );
}