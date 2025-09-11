'use client';

import React from 'react';
import { UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export interface TextInputProps<T extends FieldValues> {
  field: any;
  form: UseFormReturn<T>;
  placeholder?: string;
  disabled?: boolean;
  type?: 'text' | 'email' | 'password' | 'url';
  maxLength?: number;
  autoComplete?: string;
  className?: string;
}

function TextInput<T extends FieldValues>({
  field,
  form,
  placeholder,
  disabled = false,
  type = 'text',
  maxLength,
  autoComplete,
  className = '',
}: TextInputProps<T>) {
  return (
    <FormControl>
      <Input
        {...field}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        autoComplete={autoComplete}
        className={`border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${className}`}
      />
    </FormControl>
  );
}

export default TextInput;