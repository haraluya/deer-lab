// src/types/ui.ts
/**
 * UI 組件和介面相關類型定義
 */

import { ReactNode } from 'react';

// ==================== 通用 UI 類型 ====================

export interface BaseProps {
  className?: string;
  children?: ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
}

export interface ErrorState {
  hasError: boolean;
  error?: Error | string;
  errorMessage?: string;
}

// ==================== 表格相關類型 ====================

export interface TableColumn<T> {
  key: keyof T | string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: PaginationConfig;
  rowKey?: keyof T | ((record: T) => string);
  onRowClick?: (record: T, index: number) => void;
  className?: string;
}

export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  onChange?: (page: number, pageSize: number) => void;
  onShowSizeChange?: (current: number, size: number) => void;
}

// ==================== 表單相關類型 ====================

export interface FormField<T = any> {
  name: keyof T;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'textarea' | 'date' | 'time' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
}

export interface FormProps<T> {
  fields: FormField<T>[];
  initialValues?: Partial<T>;
  onSubmit: (values: T) => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

// ==================== 對話框相關類型 ====================

export interface DialogProps extends BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export interface ConfirmDialogProps extends DialogProps {
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

// ==================== 通知相關類型 ====================

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationConfig {
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  closable?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ==================== 導航和佈局類型 ====================

export interface NavItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  children?: NavItem[];
  badge?: string | number;
  disabled?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

export interface LayoutProps extends BaseProps {
  sidebar?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

// ==================== 搜索和篩選類型 ====================

export interface SearchConfig {
  placeholder?: string;
  fields?: string[]; // 搜索的欄位
  debounceMs?: number;
  onSearch: (query: string) => void;
}

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'multiSelect' | 'date' | 'dateRange' | 'number' | 'numberRange';
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
}

export interface FilterConfig {
  filters: FilterOption[];
  onFilterChange: (filters: Record<string, any>) => void;
  defaultValues?: Record<string, any>;
}

// ==================== 卡片和列表類型 ====================

export interface CardProps extends BaseProps {
  title?: string;
  description?: string;
  image?: string;
  actions?: ReactNode;
  onClick?: () => void;
  loading?: boolean;
}

export interface StatCardProps extends BaseProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
}

// ==================== 數據可視化類型 ====================

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartProps {
  data: ChartDataPoint[];
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  title?: string;
  height?: number;
  loading?: boolean;
  className?: string;
}

// ==================== 響應式設計類型 ====================

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ResponsiveConfig<T> {
  default: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}

export interface ViewportInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

// ==================== 主題相關類型 ====================

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  error: string;
  warning: string;
  info: string;
  success: string;
}

export interface ThemeConfig {
  colors: ThemeColors;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  animations: Record<string, string>;
}

// ==================== 狀態管理類型 ====================

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | string | null;
  lastUpdated?: Date;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ==================== 事件處理類型 ====================

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

export type ActionHandler<T = void> = () => Promise<ActionResult> | ActionResult;
export type AsyncActionHandler<T = any> = (params?: T) => Promise<ActionResult>;

// ==================== 拖拽相關類型 ====================

export interface DragItem {
  id: string;
  type: string;
  data: any;
}

export interface DropResult {
  draggedItem: DragItem;
  targetId: string;
  position: 'before' | 'after' | 'inside';
}

// ==================== 檔案處理類型 ====================

export interface FileUploadConfig {
  accept?: string;
  maxSize?: number; // bytes
  maxFiles?: number;
  multiple?: boolean;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
  uploadedAt: Date;
}