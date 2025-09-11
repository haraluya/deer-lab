'use client';

import React from 'react';
import * as z from 'zod';
import { DocumentReference } from 'firebase/firestore';
import { Tag, Package } from 'lucide-react';
import { StandardFormDialog, FormSectionConfig } from '@/components/StandardFormDialog';
import { MultiSelect, OptionType } from '@/components/ui/multi-select';

// Zod schema for form validation
const seriesFormSchema = z.object({
  name: z.string().min(2, { message: '系列名稱至少需要 2 個字元' }),
  code: z.string().min(1, { message: '系列代號為必填欄位' }),
  productType: z.string().min(1, { message: '產品類型為必填欄位' }),
  commonMaterialIds: z.array(z.string()).optional(),
});

type SeriesFormData = z.infer<typeof seriesFormSchema>;

// Series data structure
export interface SeriesData {
  id: string;
  name: string;
  code: string;
  productType: string;
  commonMaterials: DocumentReference[];
}

interface SeriesDialogUnifiedProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSeriesUpdate: () => void;
  seriesData?: SeriesData | null;
}

// 產品類型選項
const PRODUCT_TYPES = [
  { value: '罐裝油(BOT)', label: '罐裝油(BOT)' },
  { value: '一代棉芯煙彈(OMP)', label: '一代棉芯煙彈(OMP)' },
  { value: '一代陶瓷芯煙彈(OTP)', label: '一代陶瓷芯煙彈(OTP)' },
  { value: '五代陶瓷芯煙彈(FTP)', label: '五代陶瓷芯煙彈(FTP)' },
  { value: '其他(ETC)', label: '其他(ETC)' },
];

export function SeriesDialogUnified({
  isOpen,
  onOpenChange,
  onSeriesUpdate,
  seriesData,
}: SeriesDialogUnifiedProps) {
  const isEditMode = !!seriesData;
  
  // 表單預設值
  const defaultValues: Partial<SeriesFormData> = {
    name: '',
    code: '',
    productType: '其他(ETC)',
    commonMaterialIds: [],
  };

  // 表單區塊配置 - 使用空依賴陣列避免無限重渲染
  const formSections: FormSectionConfig<SeriesFormData>[] = React.useMemo(() => [
    {
      title: '基本資訊',
      description: '系列的基本識別資訊',
      icon: <Tag className="h-5 w-5" />,
      color: 'orange',
      fields: [
        {
          name: 'name',
          label: '系列名稱',
          type: 'text',
          required: true,
          placeholder: '例如：經典系列',
          gridColumn: 1,
          priority: 100,
        },
        {
          name: 'code',
          label: '系列代號',
          type: 'text',
          required: true,
          placeholder: '例如：CLASSIC',
          gridColumn: 1,
          priority: 90,
        },
        {
          name: 'productType',
          label: '產品類型',
          type: 'select',
          required: true,
          placeholder: '選擇產品類型',
          selectOptions: PRODUCT_TYPES,
          gridColumn: 2,
          priority: 80,
        },
      ],
    },
    {
      title: '通用材料',
      description: '選擇這個系列常用的材料',
      icon: <Package className="h-5 w-5" />,
      color: 'blue',
      fields: [
        {
          name: 'commonMaterialIds',
          label: '選擇通用材料',
          type: 'custom',
          placeholder: '選擇通用材料...',
          gridColumn: 2,
          priority: 70,
          customRender: (field: any, form: any) => {
            // 暫時保持簡單實現，後續需要透過 formDataLoader 來獲取材料資料
            const materialOptions: OptionType[] = [];

            return (
              <MultiSelect
                options={materialOptions}
                selected={field.value || []}
                onChange={field.onChange}
                placeholder="選擇通用材料..."
              />
            );
          },
        },
      ],
    },
  ], []); // 空依賴陣列

  const handleSuccess = () => {
    onSeriesUpdate(); // 觸發父組件重新整理
  };

  const prepareFormData = async (values: SeriesFormData): Promise<any> => {
    // 如果是編輯模式，需要加上 seriesId
    if (isEditMode && seriesData) {
      return { seriesId: seriesData.id, ...values };
    }
    return values;
  };

  return (
    <StandardFormDialog<SeriesFormData>
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onSuccess={handleSuccess}
      title="產品系列"
      description="建立新的產品系列並配置常用材料"
      formSchema={seriesFormSchema}
      sections={formSections}
      defaultValues={defaultValues}
      editData={seriesData ? {
        name: seriesData.name || '',
        code: seriesData.code || '',
        productType: seriesData.productType || '其他(ETC)',
        commonMaterialIds: seriesData.commonMaterials?.map(ref => ref.id) || [],
      } : null}
      // 需要載入材料資料給 MultiSelect 使用
      dataLoaderConfig={{
        loadProducts: true, // 這裡實際會載入 materials，待修正
      }}
      createFunctionName="createProductSeries"
      updateFunctionName="updateProductSeries"
      beforeSubmit={prepareFormData}
      headerIcon={
        <Tag className="h-6 w-6 text-white" />
      }
      submitButtonText={{
        create: '建立系列',
        update: '更新系列'
      }}
      maxWidth="2xl"
    />
  );
}