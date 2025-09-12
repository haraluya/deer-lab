'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { useForm, UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema } from 'zod';
import { toast } from 'sonner';
import { useFormDataLoader, FormDataLoaderConfig } from '@/hooks/useFormDataLoader';
import { useApiForm } from '@/hooks/useApiClient';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// =============================================================================
// 類型定義
// =============================================================================

export interface FormFieldConfig<T extends FieldValues> {
  name: Path<T>;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiSelect' | 'textarea' | 'custom';
  placeholder?: string;
  required?: boolean;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  };
  selectOptions?: Array<{
    value: string | number;
    label: string;
    icon?: ReactNode;
  }>;
  customRender?: (field: any, form: UseFormReturn<T>) => ReactNode;
  dependencies?: Path<T>[]; // 依賴其他欄位的變化
  conditional?: (values: T) => boolean; // 條件顯示邏輯
  gridColumn?: 1 | 2 | 3; // 在 grid 中占用的列數
  priority?: number; // 排序優先級
}

export interface FormSectionConfig<T extends FieldValues> {
  title: string;
  description?: string;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'orange' | 'red' | 'gray';
  fields: FormFieldConfig<T>[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface StandardFormDialogProps<T extends FieldValues> {
  // 基本屬性
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  
  // 表單配置
  title: string;
  description?: string;
  formSchema: ZodSchema<T>;
  sections: FormSectionConfig<T>[];
  defaultValues: Partial<T>;
  
  // 資料相關
  editData?: T | null; // 編輯模式的資料
  onDataLoad?: () => Promise<any>; // 載入額外資料的回調（舊版相容性）
  skipDataLoading?: boolean; // 跳過內建資料載入，讓子元件自行處理（舊版相容性）
  dataLoaderConfig?: FormDataLoaderConfig; // 新的統一資料載入配置
  
  // Firebase Functions 配置
  createFunctionName?: string;
  updateFunctionName?: string;
  customSubmit?: (values: T, isEditMode: boolean) => Promise<void>;
  
  // UI 自訂
  headerIcon?: ReactNode;
  submitButtonText?: {
    create: string;
    update: string;
  };
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  
  // 進階選項
  beforeSubmit?: (values: T) => T | Promise<T>; // 提交前資料處理
  afterSubmit?: (result: any, isEditMode: boolean) => void; // 提交後處理
  formProps?: {
    mode?: 'onSubmit' | 'onChange' | 'onBlur';
    reValidateMode?: 'onSubmit' | 'onChange' | 'onBlur';
  };
}

// 顏色配置
const colorMap = {
  blue: {
    bg: 'from-blue-50 to-indigo-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
  },
  green: {
    bg: 'from-green-50 to-emerald-50',
    border: 'border-green-200',
    text: 'text-green-800',
    iconBg: 'bg-green-100',
    iconText: 'text-green-600',
  },
  purple: {
    bg: 'from-purple-50 to-violet-50',
    border: 'border-purple-200',
    text: 'text-purple-800',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
  },
  yellow: {
    bg: 'from-yellow-50 to-orange-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    iconBg: 'bg-yellow-100',
    iconText: 'text-yellow-600',
  },
  orange: {
    bg: 'from-orange-50 to-red-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    iconBg: 'bg-orange-100',
    iconText: 'text-orange-600',
  },
  red: {
    bg: 'from-red-50 to-pink-50',
    border: 'border-red-200',
    text: 'text-red-800',
    iconBg: 'bg-red-100',
    iconText: 'text-red-600',
  },
  gray: {
    bg: 'from-gray-50 to-slate-50',
    border: 'border-gray-200',
    text: 'text-gray-800',
    iconBg: 'bg-gray-100',
    iconText: 'text-gray-600',
  },
};

// 最大寬度配置
const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

// =============================================================================
// 表單欄位渲染器
// =============================================================================

function renderFormField<T extends FieldValues>(
  fieldConfig: FormFieldConfig<T>,
  form: UseFormReturn<T>,
  formDataLoader?: any
) {
  const { name, type, label, placeholder, selectOptions, customRender, required } = fieldConfig;

  // 智能選項生成器 - 根據欄位名稱自動提供資料
  const getSmartSelectOptions = () => {
    if (selectOptions) return selectOptions; // 如果已經有選項，直接使用
    if (!formDataLoader) return [];

    const fieldName = String(name);
    
    // 供應商相關欄位
    if (fieldName.includes('supplier') || fieldName.includes('Supplier')) {
      return [
        { value: 'none', label: '無供應商' },
        ...formDataLoader.suppliers.map((supplier: any) => ({ 
          value: supplier.id, 
          label: supplier.name 
        }))
      ];
    }
    
    // 主分類相關欄位 - 使用精確匹配
    if (fieldName === 'category') {
      return formDataLoader.materialCategories.map((category: string) => ({ 
        value: category, 
        label: category 
      }));
    }
    
    // 細分分類相關欄位 - 使用精確匹配
    if (fieldName === 'subCategory') {
      return formDataLoader.materialSubCategories.map((subCategory: string) => ({ 
        value: subCategory, 
        label: subCategory 
      }));
    }
    
    // 使用者相關欄位
    if (fieldName.includes('person') || fieldName.includes('Person') || fieldName.includes('user') || fieldName.includes('User')) {
      return formDataLoader.users.map((user: any) => ({ 
        value: user.id, 
        label: `${user.name} (${user.employeeId || user.id})` 
      }));
    }
    
    return [];
  };

  if (type === 'custom' && customRender) {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-semibold text-gray-700">
              {label} {required && <span className="text-red-500">*</span>}
            </FormLabel>
            {customRender(field, form)}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-semibold text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </FormLabel>
          <FormControl>
            {(() => {
              if (type === 'text') {
                return (
                  <input
                    {...field}
                    type="text"
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                  />
                );
              }
              if (type === 'number') {
                return (
                  <input
                    {...field}
                    type="number"
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : '')}
                  />
                );
              }
              if (type === 'textarea') {
                return (
                  <textarea
                    {...field}
                    placeholder={placeholder}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500 resize-none"
                  />
                );
              }
              if (type === 'select') {
                const smartOptions = getSmartSelectOptions();
                return (
                  <select
                    {...field}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">{placeholder || '請選擇...'}</option>
                    {smartOptions.map((option: { value: string | number; label: string }) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                );
              }
              return null;
            })()}
          </FormControl>
          <FormMessage />
          {fieldConfig.description && (
            <p className="text-xs text-gray-500 mt-1">{fieldConfig.description}</p>
          )}
        </FormItem>
      )}
    />
  );
}

// =============================================================================
// 主組件
// =============================================================================

export function StandardFormDialog<T extends FieldValues>({
  isOpen,
  onOpenChange,
  onSuccess,
  title,
  description,
  formSchema,
  sections,
  defaultValues,
  editData,
  onDataLoad,
  skipDataLoading = false,
  dataLoaderConfig,
  createFunctionName,
  updateFunctionName,
  customSubmit,
  headerIcon,
  submitButtonText = { create: '新增', update: '更新' },
  maxWidth = '4xl',
  beforeSubmit,
  afterSubmit,
  formProps,
}: StandardFormDialogProps<T>) {
  const [isDataLoading, setIsDataLoading] = useState(false);
  const isEditMode = !!editData;

  // 使用統一 API 客戶端 Hook
  const apiClient = useApiForm({
    showSuccessToast: false, // 由表單自行管理成功提示
    showErrorToast: true,    // 保持錯誤提示
  });

  // 使用新的統一資料載入 hook
  const formDataLoader = useFormDataLoader(dataLoaderConfig || {}, isOpen);

  const form = useForm<T>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues as any,
    mode: formProps?.mode || 'onSubmit',
    reValidateMode: formProps?.reValidateMode || 'onChange',
  });

  // 載入額外資料 - 支援舊版和新版載入方式
  useEffect(() => {
    if (isOpen && !skipDataLoading) {
      if (dataLoaderConfig) {
        // 新版載入方式：使用 formDataLoader 的狀態
        setIsDataLoading(formDataLoader.isLoading);
        if (formDataLoader.error) {
          toast.error(`載入資料失敗: ${formDataLoader.error}`);
        }
      } else if (onDataLoad) {
        // 舊版載入方式：相容性支援
        setIsDataLoading(true);
        console.log('🔄 StandardFormDialog: 開始載入資料（舊版方式）');
        onDataLoad()
          .then(() => {
            console.log('✅ StandardFormDialog: 資料載入成功');
          })
          .catch((error) => {
            console.error('❌ StandardFormDialog: 載入資料失敗:', error);
            toast.error(`載入資料失敗: ${error.message || '未知錯誤'}`);
          })
          .finally(() => {
            console.log('🏁 StandardFormDialog: 資料載入結束');
            setIsDataLoading(false);
          });
      } else {
        // 如果沒有任何載入配置，直接設為 false
        console.log('⏭️ StandardFormDialog: 無資料載入配置');
        setIsDataLoading(false);
      }
    } else if (skipDataLoading) {
      // 如果跳過資料載入，直接設為 false
      console.log('⏭️ StandardFormDialog: 跳過內建資料載入');
      setIsDataLoading(false);
    }
  }, [isOpen, onDataLoad, skipDataLoading, dataLoaderConfig, formDataLoader.isLoading, formDataLoader.error]);

  // 填充編輯資料
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        form.reset(editData);
      } else {
        form.reset(defaultValues as any);
      }
    }
  }, [isOpen, editData, form, defaultValues]);

  // 提交處理
  const onSubmit = async (values: T) => {
    const toastId = toast.loading(
      isEditMode ? `正在更新${title}...` : `正在新增${title}...`
    );

    try {
      // 提交前處理
      let processedValues = values;
      if (beforeSubmit) {
        processedValues = await beforeSubmit(values);
      }

      // 自訂提交邏輯
      if (customSubmit) {
        await customSubmit(processedValues, isEditMode);
      } else {
        // 使用統一 API 客戶端進行提交
        const functionName = isEditMode ? updateFunctionName : createFunctionName;
        
        if (!functionName) {
          throw new Error('未指定 Firebase Function 名稱');
        }

        const payload = isEditMode && editData 
          ? { ...(editData as any), ...processedValues }
          : processedValues;
          
        const result = await apiClient.callGeneric(functionName, payload, {
          showLoadingToast: false, // 使用表單的載入提示
          showSuccessToast: false, // 使用表單的成功提示
          showErrorToast: false,   // 使用表單的錯誤處理
        });
        
        if (!result.success) {
          throw new Error(result.error?.message || '操作失敗');
        }
        
        // 提交後處理
        if (afterSubmit) {
          afterSubmit(result.rawResponse, isEditMode);
        }
      }

      toast.success(
        `${title} ${isEditMode ? '已更新' : '已建立'}`,
        { id: toastId }
      );
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('提交失敗:', error);
      const errorMessage = error instanceof Error ? error.message : '操作失敗';
      toast.error(errorMessage, { id: toastId });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${maxWidthMap[maxWidth]} max-h-[90vh] overflow-y-auto bg-white`}
      >
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {headerIcon && (
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                {headerIcon}
              </div>
            )}
            {isEditMode ? `編輯${title}` : `新增${title}`}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-gray-600 mt-2">
              {isEditMode ? `修改${title}詳細資訊` : description}
            </DialogDescription>
          )}
        </DialogHeader>

        {isDataLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">載入中...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {sections.map((section, sectionIndex) => {
                const colors = colorMap[section.color || 'blue'];
                
                return (
                  <div
                    key={sectionIndex}
                    className={`space-y-6 p-6 bg-gradient-to-r ${colors.bg} rounded-xl border ${colors.border} shadow-sm`}
                  >
                    <h3 className={`text-xl font-bold flex items-center gap-3 ${colors.text}`}>
                      {section.icon && (
                        <div className={`w-8 h-8 ${colors.iconBg} rounded-lg flex items-center justify-center`}>
                          <div className={colors.iconText}>
                            {section.icon}
                          </div>
                        </div>
                      )}
                      {section.title}
                    </h3>
                    {section.description && (
                      <p className="text-gray-600 text-sm">{section.description}</p>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {section.fields
                        .filter(field => !field.conditional || field.conditional(form.getValues()))
                        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
                        .map((fieldConfig, fieldIndex) => (
                          <div
                            key={fieldIndex}
                            className={fieldConfig.gridColumn === 1 ? 'md:col-span-1' : 
                                      fieldConfig.gridColumn === 3 ? 'md:col-span-2' : ''}
                          >
                            {renderFormField(fieldConfig, form, formDataLoader)}
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}

              {/* 操作按鈕 */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={apiClient.loading}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {apiClient.loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      處理中...
                    </div>
                  ) : (
                    isEditMode ? submitButtonText.update : submitButtonText.create
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default StandardFormDialog;