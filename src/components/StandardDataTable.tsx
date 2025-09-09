'use client';

import React, { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';

// 標準欄位定義
export interface StandardColumn<T> {
  key: keyof T | 'actions' | 'selection';
  title: string;
  width?: string;
  sortable?: boolean;
  render?: (value: any, item: T, index: number) => ReactNode;
  mobileRender?: (item: T) => ReactNode;
  hideOnMobile?: boolean;
  className?: string;
}

// 操作定義
export interface StandardAction<T> {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive';
  disabled?: (item: T) => boolean;
  hidden?: (item: T) => boolean;
}

// 選擇配置
export interface SelectionConfig<T> {
  enabled: boolean;
  selectedItems?: Set<string>;
  onToggleItem?: (itemId: string) => void;
  onToggleAll?: () => void;
  isAllSelected?: boolean;
  isPartialSelected?: boolean;
  getItemId: (item: T) => string;
  disabled?: (item: T) => boolean;
}

// 表格主要屬性
export interface StandardDataTableProps<T> {
  data: T[];
  columns: StandardColumn<T>[];
  loading?: boolean;
  selection?: SelectionConfig<T>;
  actions?: StandardAction<T>[];
  onRowClick?: (item: T) => void;
  getRowClassName?: (item: T, index: number) => string;
  emptyMessage?: string;
  mobileCardClassName?: string;
  tableClassName?: string;
}

/**
 * 標準化資料表格組件 - 支援桌面表格和行動卡片雙重模式
 */
export function StandardDataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  selection,
  actions = [],
  onRowClick,
  getRowClassName,
  emptyMessage = '暫無資料',
  mobileCardClassName = '',
  tableClassName = '',
}: StandardDataTableProps<T>) {

  // 過濾掉在行動版隱藏的欄位，用於桌面版
  const desktopColumns = columns.filter(col => !col.hideOnMobile);
  
  // 渲染空狀態
  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <div className="text-lg font-medium mb-2">暫無資料</div>
      <div className="text-sm">{emptyMessage}</div>
    </div>
  );

  // 渲染表格操作欄
  const renderActions = (item: T) => {
    const visibleActions = actions.filter(action => !action.hidden?.(item));
    
    if (visibleActions.length === 0) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>操作</DropdownMenuLabel>
          {visibleActions.map((action, index) => {
            const IconComponent = action.icon;
            const isDisabled = action.disabled?.(item);
            
            return (
              <React.Fragment key={action.key}>
                {index > 0 && action.variant === 'destructive' && (
                  <DropdownMenuSeparator />
                )}
                <DropdownMenuItem 
                  onClick={() => !isDisabled && action.onClick(item)}
                  className={action.variant === 'destructive' ? 'text-red-600' : ''}
                  disabled={isDisabled}
                >
                  {IconComponent && <IconComponent className="mr-2 h-4 w-4" />}
                  {action.label}
                </DropdownMenuItem>
              </React.Fragment>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // 渲染選擇欄
  const renderSelection = (item?: T) => {
    if (!selection?.enabled) return null;

    const itemId = item ? selection.getItemId(item) : '';
    const isSelected = item ? selection.selectedItems?.has(itemId) : false;
    const isDisabled = item ? selection.disabled?.(item) : false;

    if (item) {
      // 行級選擇
      return (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => selection.onToggleItem?.(itemId)}
          disabled={isDisabled}
          className="border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
        />
      );
    } else {
      // 表頭全選
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selection.isAllSelected || selection.isPartialSelected}
            onCheckedChange={selection.onToggleAll}
            className="border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
          />
          <span className="text-xs text-muted-foreground">
            {selection.isAllSelected ? '全選' : selection.isPartialSelected ? '部分選取' : '全選'}
          </span>
        </div>
      );
    }
  };

  // 渲染欄位內容
  const renderCellContent = (column: StandardColumn<T>, item: T, index: number) => {
    if (column.key === 'selection') {
      return renderSelection(item);
    }
    
    if (column.key === 'actions') {
      return renderActions(item);
    }

    if (column.render) {
      return column.render(item[column.key], item, index);
    }

    return item[column.key];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return renderEmpty();
  }

  return (
    <>
      {/* 手機版卡片列表 */}
      <div className={`lg:hidden space-y-4 ${mobileCardClassName}`}>
        {data.map((item, index) => {
          const itemId = selection?.getItemId(item) || '';
          const isSelected = selection?.selectedItems?.has(itemId);
          const rowClassName = getRowClassName?.(item, index) || '';
          
          return (
            <Card 
              key={itemId || index} 
              className={`relative transition-colors duration-200 ${rowClassName} ${
                isSelected ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardContent className="p-4">
                {/* 卡片頂部 - 主要資訊和操作 */}
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className={`flex-1 ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                  >
                    {/* 渲染主要欄位 */}
                    {columns
                      .filter(col => col.mobileRender || (!col.hideOnMobile && col.key !== 'selection' && col.key !== 'actions'))
                      .slice(0, 2) // 只顯示前兩個主要欄位
                      .map((column) => (
                        <div key={String(column.key)}>
                          {column.mobileRender ? 
                            column.mobileRender(item) : 
                            renderCellContent(column, item, index)
                          }
                        </div>
                      ))}
                  </div>
                  
                  {/* 操作按鈕 */}
                  <div className="flex items-center gap-2">
                    {selection?.enabled && renderSelection(item)}
                    {actions.length > 0 && renderActions(item)}
                  </div>
                </div>
                
                {/* 卡片詳細資訊 */}
                <div className="space-y-2">
                  {columns
                    .filter(col => 
                      !col.hideOnMobile && 
                      col.key !== 'selection' && 
                      col.key !== 'actions' &&
                      !col.mobileRender
                    )
                    .slice(2) // 跳過前兩個已顯示的欄位
                    .map((column) => (
                      <div key={String(column.key)} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{column.title}:</span>
                        <div>{renderCellContent(column, item, index)}</div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 桌面版表格 */}
      <div className="hidden lg:block">
        <Card>
          <Table className={tableClassName}>
            <TableHeader>
              <TableRow>
                {desktopColumns.map((column) => (
                  <TableHead 
                    key={String(column.key)} 
                    className={column.className}
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {column.key === 'selection' ? renderSelection() : column.title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => {
                const itemId = selection?.getItemId(item) || '';
                const rowClassName = getRowClassName?.(item, index) || '';
                
                return (
                  <TableRow 
                    key={itemId || index}
                    className={`hover:bg-muted/50 transition-colors duration-200 ${rowClassName}`}
                  >
                    {desktopColumns.map((column) => (
                      <TableCell 
                        key={String(column.key)}
                        className={`${
                          onRowClick && column.key !== 'selection' && column.key !== 'actions' 
                            ? 'cursor-pointer' 
                            : ''
                        } ${column.className || ''}`}
                        onClick={(e) => {
                          if (column.key === 'selection' || column.key === 'actions') {
                            e.stopPropagation();
                          } else if (onRowClick) {
                            onRowClick(item);
                          }
                        }}
                      >
                        {renderCellContent(column, item, index)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  );
}

// 常用欄位渲染器
export const StandardColumnRenderers = {
  // 文字欄位（帶副標題）
  textWithSubtext: (title: string, subtitle?: string) => (
    <div>
      <div className="font-medium text-foreground">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
    </div>
  ),

  // 數字欄位（帶單位）
  numberWithUnit: (value: number, unit?: string, className?: string) => (
    <span className={className}>
      {value || 0} {unit}
    </span>
  ),

  // 狀態徽章
  statusBadge: (status: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline') => (
    <Badge variant={variant}>{status}</Badge>
  ),

  // 多個徽章
  multipleBadges: (items: string[], colors?: Record<string, string>) => (
    <div className="flex flex-wrap gap-1">
      {items.map((item, index) => {
        const colorClass = colors?.[item] || 'bg-blue-100 text-blue-800 border-blue-300';
        return (
          <Badge 
            key={index}
            variant="outline" 
            className={`text-xs ${colorClass}`}
          >
            {item}
          </Badge>
        );
      })}
    </div>
  ),

  // 金額顯示
  currency: (amount: number, symbol = '$') => (
    <span>${amount?.toFixed(2) || '0.00'}</span>
  ),

  // 庫存狀態（含警告）
  stockWithWarning: (current: number, min: number, unit: string, warningIcon?: React.ComponentType<{ className?: string }>) => {
    const isLowStock = min > 0 && current < min;
    const WarningIcon = warningIcon;
    
    return (
      <div className="flex items-center gap-2">
        <span className={isLowStock ? "text-red-600 font-medium" : ""}>
          {current || 0} {unit}
        </span>
        {isLowStock && WarningIcon && (
          <WarningIcon className="h-3 w-3 text-red-600" />
        )}
      </div>
    );
  }
};

// 常用操作
export const StandardActions = {
  view: (onClick: (item: any) => void): StandardAction<any> => ({
    key: 'view',
    label: '查看詳情',
    icon: Eye,
    onClick,
  }),

  edit: (onClick: (item: any) => void): StandardAction<any> => ({
    key: 'edit',
    label: '編輯',
    icon: Edit,
    onClick,
  }),

  delete: (onClick: (item: any) => void, disabled?: (item: any) => boolean): StandardAction<any> => ({
    key: 'delete',
    label: '刪除',
    icon: Trash2,
    onClick,
    variant: 'destructive',
    disabled,
  }),
};