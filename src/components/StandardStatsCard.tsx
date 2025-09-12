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
        ? 'px-4 mx-auto mb-4' 
        : 'px-6 mb-8'
    } ${className}`}>
      <div className={`grid w-full max-w-5xl mx-auto ${
        isMobile 
          ? 'grid-cols-2 gap-2' 
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'
      }`}>
        {stats.map((stat, index) => {
          const colors = getColorClasses(stat.color);
          
          return (
            <Card 
              key={index} 
              className={`
                relative overflow-hidden transition-all duration-200 rounded-lg p-0
                ${colors.background} ${colors.border}
                ${stat.onClick ? 'cursor-pointer hover:shadow-md' : 'shadow-sm'}
                ${isMobile ? 'h-[95px]' : 'h-[115px]'}
              `}
              onClick={stat.onClick}
            >
              <div className={`${isMobile ? 'px-2 py-2' : 'px-4 py-4'} h-full flex flex-col justify-center`}>
                {/* 頂部：標題和圖標 */}
                <div className={`flex items-center justify-between ${isMobile ? 'mb-1.5' : 'mb-3'}`}>
                  <h3 className={`font-semibold text-gray-700 ${
                    isMobile ? 'text-xs' : 'text-sm'
                  }`}>
                    {stat.title}
                  </h3>
                  {stat.icon && (
                    <div className={`${colors.iconBg} ${colors.iconColor} rounded-lg ${
                      isMobile ? 'w-7 h-7' : 'w-9 h-9'
                    } flex items-center justify-center`}>
                      <div className={isMobile ? 'text-xs' : 'text-sm'}>
                        {stat.icon}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 主要數值 */}
                <div className={`font-bold text-gray-900 ${isMobile ? 'mb-1' : 'mb-2'} leading-none ${
                  isMobile ? 'text-2xl' : 'text-3xl'
                }`}>
                  {stat.value}
                </div>
                
                {/* 副標題 */}
                {stat.subtitle && (
                  <p className={`text-gray-600 leading-tight ${
                    isMobile ? 'text-xs' : 'text-sm'
                  }`}>
                    {stat.subtitle}
                  </p>
                )}

                {/* 趨勢資訊 */}
                {stat.trend && (
                  <div className={`flex items-center mt-1 ${
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