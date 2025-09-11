// src/app/dashboard/materials/MaterialDialogUnified.tsx
'use client';

import { useMemo } from 'react';
import { MaterialData } from '@/types/entities';
import { StandardFormDialog, FormSectionConfig } from '@/components/StandardFormDialog';
import { Package, Building, Shield, Tag } from 'lucide-react';
import * as z from 'zod';

// 保持原有的 Zod 驗證架構
const formSchema = z.object({
  name: z.string().min(2, { message: '物料名稱至少需要 2 個字元' }),
  category: z.string().min(1, { message: '請選擇主分類' }),
  subCategory: z.string().min(1, { message: '請選擇細分分類' }),
  supplierId: z.string().optional(),
  currentStock: z.coerce.number().min(0, { message: '現有庫存不能為負數' }).optional(),
  safetyStockLevel: z.coerce.number({ message: '安全庫存必須為數字' }).optional(),
  costPerUnit: z.coerce.number().min(0, { message: '單位成本不能為負數' }).optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MaterialDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onMaterialUpdate: () => void;
  materialData?: MaterialData | null;
}

export function MaterialDialogUnified({
  isOpen,
  onOpenChange,
  onMaterialUpdate,
  materialData,
}: MaterialDialogProps) {
  const isEditMode = !!materialData;

  // 使用 useMemo 來穩定表單配置
  const formSections: FormSectionConfig<FormData>[] = useMemo(() => [
    {
      title: '基本資料',
      icon: <Tag className="h-4 w-4" />,
      color: 'blue',
      fields: [
        {
          name: 'name',
          label: '物料名稱',
          type: 'text',
          placeholder: '例如：高級香精 A',
          required: true,
          gridColumn: 2,
        },
        {
          name: 'category',
          label: '主分類',
          type: 'select',
          required: true,
          // selectOptions 會由智能選項生成器自動提供
          gridColumn: 1,
        },
        {
          name: 'subCategory',
          label: '細分分類',
          type: 'select',
          required: true,
          // selectOptions 會由智能選項生成器自動提供
          gridColumn: 1,
        },
      ],
    },
    {
      title: '供應商資訊',
      icon: <Building className="h-4 w-4" />,
      color: 'green',
      fields: [
        {
          name: 'supplierId',
          label: '供應商',
          type: 'select',
          // selectOptions 會由智能選項生成器自動提供（包含"無供應商"選項）
          gridColumn: 2,
        },
      ],
    },
    {
      title: '庫存與成本',
      icon: <Shield className="h-4 w-4" />,
      color: 'purple',
      fields: [
        {
          name: 'currentStock',
          label: '現有庫存',
          type: 'number',
          placeholder: '0',
          gridColumn: 1,
        },
        {
          name: 'safetyStockLevel',
          label: '安全庫存',
          type: 'number',
          placeholder: '0',
          gridColumn: 1,
        },
        {
          name: 'costPerUnit',
          label: '單位成本',
          type: 'number',
          placeholder: '0.00',
          gridColumn: 1,
        },
        {
          name: 'unit',
          label: '單位',
          type: 'select',
          selectOptions: [
            { value: '個', label: '個' },
            { value: 'KG', label: 'KG' },
            { value: '張', label: '張' },
          ],
          gridColumn: 1,
        },
      ],
    },
    {
      title: '備註資訊',
      icon: <Package className="h-4 w-4" />,
      color: 'yellow',
      fields: [
        {
          name: 'notes',
          label: '備註',
          type: 'textarea',
          placeholder: '請輸入物料相關的備註資訊...',
          gridColumn: 2,
        },
      ],
    },
  ], []); // 空依賴陣列，因為配置是靜態的

  // 預設值
  const defaultValues: Partial<FormData> = {
    name: '',
    category: '',
    subCategory: '',
    supplierId: 'none',
    currentStock: 0,
    safetyStockLevel: 0,
    costPerUnit: 0,
    unit: '個',
    notes: '',
  };

  // 編輯資料處理
  const editData = materialData ? {
    name: materialData.name || '',
    category: materialData.category || '',
    subCategory: materialData.subCategory || '',
    supplierId: materialData.supplierRef?.id || 'none',
    currentStock: materialData.currentStock || 0,
    safetyStockLevel: materialData.safetyStockLevel || 0,
    costPerUnit: materialData.costPerUnit || 0,
    unit: materialData.unit || '個',
    notes: materialData.notes || '',
  } : null;

  // 提交前處理
  const beforeSubmit = async (values: FormData) => {
    // 處理供應商ID
    const processedValues = {
      ...values,
      supplierId: values.supplierId === 'none' ? undefined : values.supplierId
    };

    // 如果是編輯模式，添加 materialId
    if (isEditMode && materialData) {
      return {
        materialId: materialData.id,
        ...processedValues,
      };
    }

    return processedValues;
  };

  return (
    <StandardFormDialog<FormData>
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onSuccess={onMaterialUpdate}
      title="物料"
      description="建立新的物料資料"
      formSchema={formSchema}
      sections={formSections}
      defaultValues={defaultValues}
      editData={editData}
      dataLoaderConfig={{
        loadSuppliers: true,
        loadMaterialCategories: true,
        loadMaterialSubCategories: true,
      }}
      createFunctionName="createMaterial"
      updateFunctionName="updateMaterial"
      headerIcon={<Package className="h-5 w-5 text-white" />}
      beforeSubmit={beforeSubmit}
      maxWidth="4xl"
    />
  );
}