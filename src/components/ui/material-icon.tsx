import React from 'react';
import { cn } from '@/lib/utils';

interface MaterialIconProps {
  category: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function MaterialIcon({ category, className, size = 'md' }: MaterialIconProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const getIconColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      '原料': 'text-emerald-600',
      '包材': 'text-blue-600',
      '香精': 'text-pink-600',
      '添加劑': 'text-purple-600',
      '設備': 'text-slate-600',
      '工具': 'text-orange-600',
      '耗材': 'text-amber-600',
      '其他': 'text-indigo-600',
      '111': 'text-green-600',
      'A1': 'text-emerald-600',
      '222': 'text-orange-600',
      'B1': 'text-purple-600',
      'default': 'text-gray-600'
    };
    return colorMap[category] || colorMap.default;
  };

  const renderIcon = (category: string) => {
    const colorClass = getIconColor(category);
    
    switch (category) {
      case '原料':
        // 原料 - 使用穀物/種子圖案
        return (
          <svg className={cn(sizeClasses[size], colorClass)} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            <circle cx="8.5" cy="14.5" r="1.5"/>
            <circle cx="15.5" cy="14.5" r="1.5"/>
            <circle cx="12" cy="11" r="1.5"/>
          </svg>
        );
      case '包材':
        // 包材 - 使用包裝盒圖案
        return (
          <svg className={cn(sizeClasses[size], colorClass)} fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            <path d="M12 6l-3 2v8l3 2 3-2V8l-3-2z"/>
            <path d="M9 8h6v6H9z"/>
          </svg>
        );
      case '香精':
        // 香精 - 使用香水瓶圖案
        return (
          <svg className={cn(sizeClasses[size], colorClass)} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
          </svg>
        );
      case '添加劑':
        // 添加劑 - 使用化學試管圖案
        return (
          <svg className={cn(sizeClasses[size], colorClass)} fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            <path d="M9 7h6v2H9z"/>
            <path d="M9 11h6v2H9z"/>
            <path d="M9 15h6v2H9z"/>
            <circle cx="12" cy="9" r="1"/>
            <circle cx="12" cy="13" r="1"/>
            <circle cx="12" cy="17" r="1"/>
          </svg>
        );
      case '設備':
        // 設備 - 使用齒輪圖案
        return (
          <svg className={cn(sizeClasses[size], colorClass)} fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        );
      case '工具':
        // 工具 - 使用扳手圖案
        return (
          <svg className={cn(sizeClasses[size], colorClass)} fill="currentColor" viewBox="0 0 24 24">
            <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        );
      case '耗材':
        // 耗材 - 使用電池圖案
        return (
          <svg className={cn(sizeClasses[size], colorClass)} fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4zM13 18h-2v-2h2v2zm0-4h-2V9h2v5z"/>
            <path d="M9 7h6v2H9z"/>
            <path d="M9 11h6v2H9z"/>
            <path d="M9 15h6v2H9z"/>
          </svg>
        );
      case '其他':
        // 其他 - 使用立方體圖案
        return (
          <svg className={cn(sizeClasses[size], colorClass)} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5zM12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            <path d="M12 6c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
            <circle cx="12" cy="10" r="2"/>
          </svg>
        );
      // 數字分類使用特殊圖示
      case '111':
        // 111 - 使用原料相關圖案
        return (
          <svg className={cn(sizeClasses[size], colorClass)} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            <circle cx="8.5" cy="14.5" r="1.5"/>
            <circle cx="15.5" cy="14.5" r="1.5"/>
            <circle cx="12" cy="11" r="1.5"/>
          </svg>
        );
      case 'A1':
        // A1 - 使用包裝相關圖案
        return (
          <svg className={cn(sizeClasses[size], colorClass)} fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            <path d="M12 6l-3 2v8l3 2 3-2V8l-3-2z"/>
            <path d="M9 8h6v6H9z"/>
          </svg>
        );
      case '222':
        // 222 - 使用化學相關圖案
        return (
          <svg className={cn(sizeClasses[size], colorClass)} fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            <path d="M9 7h6v2H9z"/>
            <path d="M9 11h6v2H9z"/>
            <path d="M9 15h6v2H9z"/>
            <circle cx="12" cy="9" r="1"/>
            <circle cx="12" cy="13" r="1"/>
            <circle cx="12" cy="17" r="1"/>
          </svg>
        );
      case 'B1':
        // B1 - 使用工具相關圖案
        return (
          <svg className={cn(sizeClasses[size], colorClass)} fill="currentColor" viewBox="0 0 24 24">
            <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        );
      default:
        // 預設 - 使用通用物料圖案
        return (
          <svg className={cn(sizeClasses[size], colorClass)} fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"/>
            <path d="M12 6l-3 2v8l3 2 3-2V8l-3-2z"/>
            <path d="M9 8h6v6H9z"/>
          </svg>
        );
    }
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      {renderIcon(category)}
    </div>
  );
}
