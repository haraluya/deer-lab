'use client';

import React, { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// =============================================================================
// 類型定義
// =============================================================================

export interface StandardStats {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
  trend?: {
    direction: 'up' | 'down' | 'stable';
    value: string;
  };
  onClick?: () => void;
}

interface StandardStatsCardProps {
  stats: StandardStats[];
  isMobile?: boolean;
  className?: string;
}

// =============================================================================
// 顏色配置
// =============================================================================

const getColorClasses = (color?: string) => {
  const colorMap = {
    blue: {
      background: 'bg-blue-50/50',
      border: 'border-2 border-blue-300',
      iconBg: 'bg-blue-500',
      iconColor: 'text-white'
    },
    green: {
      background: 'bg-green-50/50',
      border: 'border-2 border-green-300',
      iconBg: 'bg-green-500',
      iconColor: 'text-white'
    },
    yellow: {
      background: 'bg-yellow-50/50',
      border: 'border-2 border-yellow-300',
      iconBg: 'bg-yellow-500',
      iconColor: 'text-white'
    },
    red: {
      background: 'bg-red-50/50',
      border: 'border-2 border-red-300',
      iconBg: 'bg-red-500',
      iconColor: 'text-white'
    },
    purple: {
      background: 'bg-purple-50/50',
      border: 'border-2 border-purple-300',
      iconBg: 'bg-purple-500',
      iconColor: 'text-white'
    },
    orange: {
      background: 'bg-orange-50/50',
      border: 'border-2 border-orange-300',
      iconBg: 'bg-orange-500',
      iconColor: 'text-white'
    },
  };
  
  return colorMap[color as keyof typeof colorMap] || {
    background: 'bg-gray-50/50',
    border: 'border-2 border-gray-300',
    iconBg: 'bg-gray-500',
    iconColor: 'text-white'
  };
};

// =============================================================================
// 主要元件
// =============================================================================

export const StandardStatsCard: React.FC<StandardStatsCardProps> = ({ 
  stats, 
  isMobile = false,
  className = ''
}) => {
  return (
    <div className={`w-full ${
      isMobile 
        ? 'px-2 mx-auto mb-3' 
        : 'mb-6'
    } ${className}`}>
      <div className={`grid w-full ${
        isMobile 
          ? 'grid-cols-2 gap-3' 
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'
      }`}>
        {stats.map((stat, index) => {
          const colors = getColorClasses(stat.color);
          
          return (
            <Card 
              key={index} 
              className={`
                relative overflow-hidden transition-all duration-200 rounded-lg
                ${colors.background} ${colors.border}
                ${stat.onClick ? 'cursor-pointer hover:shadow-md' : 'shadow-sm'}
                ${isMobile ? 'h-[100px]' : 'h-[120px]'}
              `}
              onClick={stat.onClick}
            >
              <div className={`${isMobile ? 'px-2 py-1' : 'px-3 py-2'} h-full`}>
                {/* 頂部：標題和圖標 */}
                <div className="flex items-center justify-between">
                  <h3 className={`font-medium text-gray-700 leading-tight ${
                    isMobile ? 'text-xs' : 'text-sm'
                  }`}>
                    {stat.title}
                  </h3>
                  {stat.icon && (
                    <div className={`${colors.iconBg} ${colors.iconColor} rounded-full flex-shrink-0 ${
                      isMobile ? 'w-6 h-6' : 'w-8 h-8'
                    } flex items-center justify-center`}>
                      <div className={isMobile ? 'text-xs' : 'text-sm'}>
                        {stat.icon}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 主要數值 - 緊接著標題 */}
                <div className={`font-bold text-gray-900 leading-tight ${
                  isMobile ? 'text-xl mt-1' : 'text-3xl mt-1'
                }`}>
                  {stat.value}
                </div>
                
                {/* 副標題 */}
                {stat.subtitle && (
                  <p className={`text-gray-500 leading-tight ${
                    isMobile ? 'text-xs' : 'text-sm'
                  }`}>
                    {stat.subtitle}
                  </p>
                )}

                {/* 趨勢資訊 */}
                {stat.trend && (
                  <div className={`flex items-center ${
                    stat.trend.direction === 'up' 
                      ? 'text-green-600' 
                      : stat.trend.direction === 'down' 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                  } ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    <span>{stat.trend.value}</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default StandardStatsCard;