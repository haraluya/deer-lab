'use client';

import React from 'react';
import { UseFormReturn, FieldValues } from 'react-hook-form';
import { FormControl } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface SelectOption {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  description?: string;
}

export interface SelectInputProps<T extends FieldValues> {
  field: any;
  form: UseFormReturn<T>;
  placeholder?: string;
  disabled?: boolean;
  options: SelectOption[];
  allowClear?: boolean;
  className?: string;
}

function SelectInput<T extends FieldValues>({
  field,
  form,
  placeholder = "請選擇...",
  disabled = false,
  options,
  allowClear = false,
  className = '',
}: SelectInputProps<T>) {
  return (
    <FormControl>
      <Select
        onValueChange={field.onChange}
        value={field.value || ""}
        disabled={disabled}
      >
        <SelectTrigger className={`border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${className}`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {/* 清除選項 */}
          {allowClear && field.value && (
            <SelectItem value="" className="text-gray-500">
              清除選擇
            </SelectItem>
          )}
          
          {/* 選項列表 */}
          {options.map((option) => (
            <SelectItem
              key={String(option.value)}
              value={String(option.value)}
              disabled={option.disabled}
              className="flex items-center"
            >
              <div className="flex items-center gap-2 w-full">
                {option.icon && (
                  <div className="w-4 h-4 flex items-center justify-center">
                    {option.icon}
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-500">{option.description}</div>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
          
          {/* 空狀態 */}
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              暫無選項
            </div>
          )}
        </SelectContent>
      </Select>
    </FormControl>
  );
}

export default SelectInput;