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
      background: 'bg-blue-50',
      border: 'border-l-4 border-blue-500',
      iconBg: 'bg-blue-500',
      iconColor: 'text-white'
    },
    green: {
      background: 'bg-green-50',
      border: 'border-l-4 border-green-500',
      iconBg: 'bg-green-500',
      iconColor: 'text-white'
    },
    yellow: {
      background: 'bg-yellow-50',
      border: 'border-l-4 border-yellow-500',
      iconBg: 'bg-yellow-500',
      iconColor: 'text-white'
    },
    red: {
      background: 'bg-red-50',
      border: 'border-l-4 border-red-500',
      iconBg: 'bg-red-500',
      iconColor: 'text-white'
    },
    purple: {
      background: 'bg-purple-50',
      border: 'border-l-4 border-purple-500',
      iconBg: 'bg-purple-500',
      iconColor: 'text-white'
    },
    orange: {
      background: 'bg-orange-50',
      border: 'border-l-4 border-orange-500',
      iconBg: 'bg-orange-500',
      iconColor: 'text-white'
    },
  };
  
  return colorMap[color as keyof typeof colorMap] || {
    background: 'bg-gray-50',
    border: 'border-l-4 border-gray-400',
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
        ? 'px-1 mx-auto mb-4' 
        : 'mb-6'
    } ${className}`}>
      <div className={`grid w-full ${
        isMobile 
          ? 'grid-cols-2 gap-3' 
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'
      }`}>
        {stats.map((stat, index) => {
          const colors = getColorClasses(stat.color);
          
          return (
            <Card 
              key={index} 
              className={`
                relative overflow-hidden transition-all duration-200 
                ${colors.background} ${colors.border}
                ${stat.onClick ? 'cursor-pointer hover:shadow-md' : 'shadow-sm'}
                ${isMobile ? 'min-h-[100px]' : 'min-h-[120px]'}
              `}
              onClick={stat.onClick}
            >
              <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${
                isMobile ? 'pb-2 pt-3 px-3' : 'pb-2 pt-4 px-4'
              }`}>
                <CardTitle className={`font-medium text-gray-600 leading-tight ${
                  isMobile ? 'text-sm' : 'text-base'
                }`}>
                  {stat.title}
                </CardTitle>
                {stat.icon && (
                  <div className={`${colors.iconBg} ${colors.iconColor} p-2 rounded-full flex-shrink-0 ${
                    isMobile ? 'w-8 h-8' : 'w-10 h-10'
                  } flex items-center justify-center`}>
                    <div className={isMobile ? 'text-sm' : 'text-base'}>
                      {stat.icon}
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className={`${
                isMobile ? 'pt-0 pb-3 px-3' : 'pt-0 pb-4 px-4'
              }`}>
                <div className={`font-bold text-gray-900 mb-1 leading-tight ${
                  isMobile ? 'text-xl' : 'text-2xl'
                }`}>
                  {stat.value}
                </div>
                {stat.subtitle && (
                  <p className={`text-gray-500 leading-tight ${
                    isMobile ? 'text-xs' : 'text-sm'
                  }`}>
                    {stat.subtitle}
                  </p>
                )}
                {stat.trend && (
                  <div className={`flex items-center mt-2 ${
                    stat.trend.direction === 'up' 
                      ? 'text-green-600' 
                      : stat.trend.direction === 'down' 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                  } ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    <span>{stat.trend.value}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default StandardStatsCard;