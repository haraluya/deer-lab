'use client';

import React from 'react';
import { UseFormReturn, FieldValues } from 'react-hook-form';
import { FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export interface NumberInputProps<T extends FieldValues> {
  field: any;
  form: UseFormReturn<T>;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  className?: string;
}

function NumberInput<T extends FieldValues>({
  field,
  form,
  placeholder = "0",
  disabled = false,
  min,
  max,
  step,
  decimals,
  className = '',
}: NumberInputProps<T>) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (value === '') {
      field.onChange('');
      return;
    }
    
    const numValue = Number(value);
    
    // 檢查數字有效性
    if (isNaN(numValue)) {
      return;
    }
    
    // 檢查範圍限制
    if (min !== undefined && numValue < min) {
      return;
    }
    
    if (max !== undefined && numValue > max) {
      return;
    }
    
    // 處理小數位數限制
    if (decimals !== undefined && decimals >= 0) {
      const parts = value.split('.');
      if (parts[1] && parts[1].length > decimals) {
        return;
      }
    }
    
    field.onChange(numValue);
  };

  return (
    <FormControl>
      <Input
        {...field}
        value={field.value === 0 ? '0' : field.value || ''}
        type="number"
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step || (decimals !== undefined && decimals > 0 ? Math.pow(10, -decimals) : 1)}
        onChange={handleChange}
        className={`border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${className}`}
      />
    </FormControl>
  );
}

export default NumberInput;