// 表單欄位類型庫統一匯出
export { default as TextInput } from './TextInput';
export { default as NumberInput } from './NumberInput';
export { default as SelectInput } from './SelectInput';
export { default as TextareaInput } from './TextareaInput';
// TODO: 待實作的進階元件
// export { default as SearchableSelectInput } from './SearchableSelectInput';
// export { default as MultiSelectInput } from './MultiSelectInput';

// 預設欄位類型配置
export const DEFAULT_FIELD_TYPES = {
  text: 'TextInput',
  number: 'NumberInput',
  select: 'SelectInput',
  textarea: 'TextareaInput',
  searchableSelect: 'SearchableSelectInput',
  multiSelect: 'MultiSelectInput',
} as const;

// 常用驗證規則
export const VALIDATION_RULES = {
  required: (message?: string) => ({ required: message || '此欄位為必填' }),
  minLength: (min: number, message?: string) => ({ 
    minLength: { value: min, message: message || `至少需要 ${min} 個字元` }
  }),
  maxLength: (max: number, message?: string) => ({ 
    maxLength: { value: max, message: message || `最多 ${max} 個字元` }
  }),
  min: (min: number, message?: string) => ({ 
    min: { value: min, message: message || `最小值為 ${min}` }
  }),
  max: (max: number, message?: string) => ({ 
    max: { value: max, message: message || `最大值為 ${max}` }
  }),
  pattern: (pattern: RegExp, message: string) => ({ 
    pattern: { value: pattern, message }
  }),
  email: () => ({ 
    pattern: { 
      value: /^\S+@\S+$/i, 
      message: '請輸入有效的電子郵件地址' 
    }
  }),
  phone: () => ({ 
    pattern: { 
      value: /^[\d-+().\s]+$/, 
      message: '請輸入有效的電話號碼' 
    }
  }),
} as const;

// 欄位分組配置
export interface FieldGroupConfig {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'orange' | 'red' | 'gray';
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

// 預設欄位分組
export const DEFAULT_FIELD_GROUPS: Record<string, FieldGroupConfig> = {
  basic: {
    title: '基本資料',
    color: 'blue',
    defaultExpanded: true,
  },
  contact: {
    title: '聯絡資訊',
    color: 'green',
    defaultExpanded: true,
  },
  details: {
    title: '詳細資訊',
    color: 'purple',
    defaultExpanded: true,
  },
  notes: {
    title: '備註資訊',
    color: 'yellow',
    defaultExpanded: false,
  },
  advanced: {
    title: '進階設定',
    color: 'gray',
    defaultExpanded: false,
  },
} as const;