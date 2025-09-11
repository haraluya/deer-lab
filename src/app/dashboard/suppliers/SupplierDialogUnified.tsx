'use client';

import React from 'react';
import * as z from 'zod';
import { Building, User, Phone, Package, FileText } from 'lucide-react';
import { StandardFormDialog, FormSectionConfig } from '@/components/StandardFormDialog';

// Zod schema for form validation
const supplierFormSchema = z.object({
  name: z.string().min(2, { message: '供應商名稱至少需要 2 個字元' }),
  products: z.string().optional(),
  contactWindow: z.string().optional(),
  contactMethod: z.string().optional(),
  liaisonPersonId: z.string().optional(),
  notes: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

// The data structure for a supplier
export interface SupplierData {
  id: string;
  name: string;
  products?: string;
  contactWindow?: string;
  contactMethod?: string;
  liaisonPersonId?: string;
  liaisonPersonName?: string;
  notes?: string;
  createdAt?: any;
}

interface SupplierDialogUnifiedProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSupplierUpdate: () => void; // Callback to refresh the list
  supplierData?: SupplierData | null; // Supplier data for editing, null for adding
}

export function SupplierDialogUnified({
  isOpen,
  onOpenChange,
  onSupplierUpdate,
  supplierData,
}: SupplierDialogUnifiedProps) {
  const isEditMode = !!supplierData;
  
  // 表單預設值
  const defaultValues: Partial<SupplierFormData> = {
    name: '',
    products: '',
    contactWindow: '',
    contactMethod: '',
    liaisonPersonId: '',
    notes: '',
  };

  // 表單區塊配置 - 使用空依賴陣列避免無限重渲染
  const formSections: FormSectionConfig<SupplierFormData>[] = React.useMemo(() => [
    {
      title: '基本資料',
      description: '供應商的基本識別資訊',
      icon: <Building className="h-5 w-5" />,
      color: 'blue',
      fields: [
        {
          name: 'name',
          label: '供應商名稱',
          type: 'text',
          required: true,
          placeholder: '例如：ABC 原料有限公司',
          gridColumn: 1,
          priority: 100,
        },
        {
          name: 'products',
          label: '供應商品',
          type: 'text',
          placeholder: '例如：香精, 原料, 包材, 化學品',
          gridColumn: 1,
          priority: 90,
        },
      ],
    },
    {
      title: '聯絡資訊',
      description: '建立有效的溝通管道',
      icon: <Phone className="h-5 w-5" />,
      color: 'green',
      fields: [
        {
          name: 'contactWindow',
          label: '聯絡窗口',
          type: 'text',
          placeholder: '例如：王經理、李主任',
          gridColumn: 1,
          priority: 80,
        },
        {
          name: 'contactMethod',
          label: '聯絡方式',
          type: 'text',
          placeholder: '電話、Email、Line ID 或其他聯絡方式',
          gridColumn: 1,
          priority: 70,
        },
        {
          name: 'liaisonPersonId',
          label: '內部對接人員',
          type: 'select',
          placeholder: '選擇負責對接的內部人員',
          gridColumn: 2,
          priority: 60,
          // selectOptions 會由智能選項生成器自動提供
        },
      ],
    },
    {
      title: '詳細備註',
      description: '記錄重要的合作資訊與特殊事項',
      icon: <FileText className="h-5 w-5" />,
      color: 'purple',
      fields: [
        {
          name: 'notes',
          label: '備註內容',
          type: 'textarea',
          placeholder: '在此記錄供應商的特殊要求、合作條件、付款方式、交貨時間、品質標準或其他重要事項...',
          gridColumn: 2,
          description: '支援換行格式 | 最多 2000 字元',
          priority: 50,
        },
      ],
    },
  ], []); // 空依賴陣列

  const handleSuccess = () => {
    onSupplierUpdate(); // 觸發父組件重新整理
  };

  const prepareFormData = async (values: SupplierFormData): Promise<any> => {
    // 如果是編輯模式，需要加上 supplierId
    if (isEditMode && supplierData) {
      return { supplierId: supplierData.id, ...values };
    }
    return values;
  };

  return (
    <StandardFormDialog<SupplierFormData>
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onSuccess={handleSuccess}
      title="供應商"
      description="建立新的供應商合作夥伴資料"
      formSchema={supplierFormSchema}
      sections={formSections}
      defaultValues={defaultValues}
      editData={supplierData ? {
        name: supplierData.name || '',
        products: supplierData.products || '',
        contactWindow: supplierData.contactWindow || '',
        contactMethod: supplierData.contactMethod || '',
        liaisonPersonId: supplierData.liaisonPersonId || '',
        notes: supplierData.notes || '',
      } : null}
      dataLoaderConfig={{
        loadUsers: true, // 載入使用者資料給內部對接人員選擇
      }}
      createFunctionName="createSupplier"
      updateFunctionName="updateSupplier"
      beforeSubmit={prepareFormData}
      headerIcon={
        <Building className="h-6 w-6 text-white" />
      }
      submitButtonText={{
        create: '建立供應商',
        update: '更新資料'
      }}
      maxWidth="4xl"
    />
  );
}