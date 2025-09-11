'use client';

import React from 'react';
import { UseFormReturn, FieldValues } from 'react-hook-form';
import { FormControl } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

export interface TextareaInputProps<T extends FieldValues> {
  field: any;
  form: UseFormReturn<T>;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  showCharCount?: boolean;
  resizable?: boolean;
  className?: string;
}

function TextareaInput<T extends FieldValues>({
  field,
  form,
  placeholder,
  disabled = false,
  rows = 4,
  maxLength,
  showCharCount = false,
  resizable = false,
  className = '',
}: TextareaInputProps<T>) {
  const charCount = field.value?.length || 0;
  
  return (
    <div className="space-y-1">
      <FormControl>
        <Textarea
          {...field}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          className={`border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${
            resizable ? 'resize-y' : 'resize-none'
          } ${className}`}
        />
      </FormControl>
      
      {/* 字數統計 */}
      {(showCharCount || maxLength) && (
        <div className="flex justify-between text-xs text-gray-500">
          <div>
            {showCharCount && (
              <span>
                {charCount} {maxLength && `/ ${maxLength}`} 字元
              </span>
            )}
          </div>
          {maxLength && charCount > maxLength * 0.9 && (
            <div className={charCount >= maxLength ? 'text-red-500' : 'text-yellow-500'}>
              {charCount >= maxLength ? '已達字數上限' : '接近字數上限'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TextareaInput;