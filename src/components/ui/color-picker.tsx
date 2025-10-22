// src/components/ui/color-picker.tsx
'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

export interface ColorOption {
  name: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  value: string;
}

export const PRESET_COLORS: ColorOption[] = [
  { name: '藍色', bgClass: 'bg-blue-100', textClass: 'text-blue-700', borderClass: 'border-blue-300', value: 'blue' },
  { name: '紫色', bgClass: 'bg-purple-100', textClass: 'text-purple-700', borderClass: 'border-purple-300', value: 'purple' },
  { name: '粉色', bgClass: 'bg-pink-100', textClass: 'text-pink-700', borderClass: 'border-pink-300', value: 'pink' },
  { name: '橙色', bgClass: 'bg-orange-100', textClass: 'text-orange-700', borderClass: 'border-orange-300', value: 'orange' },
  { name: '綠色', bgClass: 'bg-green-100', textClass: 'text-green-700', borderClass: 'border-green-300', value: 'green' },
  { name: '青色', bgClass: 'bg-cyan-100', textClass: 'text-cyan-700', borderClass: 'border-cyan-300', value: 'cyan' },
  { name: '靛藍', bgClass: 'bg-indigo-100', textClass: 'text-indigo-700', borderClass: 'border-indigo-300', value: 'indigo' },
  { name: '紅色', bgClass: 'bg-red-100', textClass: 'text-red-700', borderClass: 'border-red-300', value: 'red' },
  { name: '黃色', bgClass: 'bg-yellow-100', textClass: 'text-yellow-700', borderClass: 'border-yellow-300', value: 'yellow' },
  { name: '灰色', bgClass: 'bg-gray-100', textClass: 'text-gray-700', borderClass: 'border-gray-300', value: 'gray' },
];

// 根據顏色值獲取顏色選項
export function getColorOption(colorValue: string): ColorOption {
  return PRESET_COLORS.find(c => c.value === colorValue) || PRESET_COLORS[9]; // 默認灰色
}

// 隨機選擇一個顏色（用於新增系列時）
export function getRandomColor(): string {
  const randomIndex = Math.floor(Math.random() * PRESET_COLORS.length);
  return PRESET_COLORS[randomIndex].value;
}

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const selectedColor = getColorOption(value);

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-semibold text-gray-700">{label}</label>
      )}
      <div className="grid grid-cols-5 gap-2">
        {PRESET_COLORS.map((color) => {
          const isSelected = color.value === value;
          return (
            <button
              key={color.value}
              type="button"
              onClick={() => onChange(color.value)}
              className={`
                relative h-10 rounded-lg border-2 transition-all duration-200
                ${color.bgClass} ${color.borderClass}
                ${isSelected ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}
              `}
              title={color.name}
            >
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className={`h-5 w-5 ${color.textClass}`} />
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        已選擇：{selectedColor.name}
      </div>
    </div>
  );
}
