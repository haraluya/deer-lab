// src/components/ui/multi-select.tsx
'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

export type OptionType = {
  label: string;
  value: string;
  category?: string;
  subCategory?: string;
  materialName?: string;
};

interface MultiSelectProps {
  options: OptionType[];
  selected: string[];
  onChange: (selected: string[]) => void;
  onAddNew?: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowCreate?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  onAddNew,
  placeholder = 'Select options...',
  className,
  allowCreate = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSelect = (value: string) => {
    setInputValue('');
    onChange([...selected, value]);
  };

  const handleCreateNew = () => {
    if (inputValue.trim() && onAddNew) {
      onAddNew(inputValue.trim());
      setInputValue('');
    }
  };

  const handleUnselect = (value: string) => {
    onChange(selected.filter((s) => s !== value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && inputValue === '' && selected.length > 0) {
      handleUnselect(selected[selected.length - 1]);
    }
    if (e.key === 'Enter' && inputValue.trim() && allowCreate && onAddNew) {
      e.preventDefault();
      handleCreateNew();
    }
  };

  const selectedOptions = options.filter(option => selected.includes(option.value));
  
  const selectableOptions = options.filter(option => {
    if (selected.includes(option.value)) return false;
    
    // 搜尋邏輯：搜尋物料名稱、主分類、細分分類
    if (!inputValue.trim()) return true;
    
    const searchTerm = inputValue.trim().toLowerCase();
    const materialName = (option.materialName || option.label).toLowerCase();
    const category = (option.category || '').toLowerCase();
    const subCategory = (option.subCategory || '').toLowerCase();
    const label = option.label.toLowerCase();
    
    // 搜尋邏輯：優先搜尋物料名稱，然後是分類
    return materialName.includes(searchTerm) || 
           category.includes(searchTerm) || 
           subCategory.includes(searchTerm) ||
           label.includes(searchTerm);
  }).sort((a, b) => {
    // 搜尋結果優先按照物料名稱排序
    const materialNameA = (a.materialName || a.label).toLowerCase();
    const materialNameB = (b.materialName || b.label).toLowerCase();
    return materialNameA.localeCompare(materialNameB, 'zh-TW');
  });

  return (
    <div className="overflow-visible bg-transparent">
      <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex gap-1 flex-wrap">
          {selectedOptions.map(({ value, label, category, subCategory, materialName }) => (
            <Badge key={value} variant="secondary" className="flex items-center gap-1">
              <span className="font-medium">{materialName || label}</span>
              {category && (
                <span className="px-1 py-0.5 text-xs rounded bg-blue-100 text-blue-800 font-medium">
                  {category}
                </span>
              )}
              {subCategory && (
                <span className="px-1 py-0.5 text-xs rounded bg-green-100 text-green-800 font-medium">
                  {subCategory}
                </span>
              )}
              <button
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUnselect(value);
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleUnselect(value)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              const value = e.target.value;
              setInputValue(value);
              // 當有輸入值時，自動打開下拉選單
              if (value.trim()) {
                setOpen(true);
              } else {
                setOpen(false);
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // 延遲關閉，讓用戶有時間點擊選項
              setTimeout(() => setOpen(false), 200);
            }}
            onFocus={() => {
              if (inputValue.trim()) {
                setOpen(true);
              }
            }}
            placeholder={placeholder}
            className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && (selectableOptions.length > 0 || (allowCreate && inputValue.trim())) ? (
          <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <div className="h-full overflow-auto">
              {selectableOptions.map(({ value, label, category, subCategory, materialName }) => (
                <div
                  key={value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleSelect(value)}
                  className="cursor-pointer px-2 py-3 hover:bg-accent hover:text-accent-foreground"
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="flex-1 font-medium">{materialName || label}</span>
                    {category && (
                      <span className="px-2 py-1 text-xs rounded-md bg-blue-100 text-blue-800 font-medium">
                        {category}
                      </span>
                    )}
                    {subCategory && (
                      <span className="px-2 py-1 text-xs rounded-md bg-green-100 text-green-800 font-medium">
                        {subCategory}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {allowCreate && inputValue.trim() && !selectableOptions.find(opt => opt.label.toLowerCase() === inputValue.toLowerCase()) && (
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={handleCreateNew}
                  className="cursor-pointer text-blue-600 px-2 py-3 hover:bg-accent hover:text-accent-foreground"
                >
                  新增 &quot;{inputValue.trim()}&quot;
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
