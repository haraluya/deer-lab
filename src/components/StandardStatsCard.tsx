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
                ${isMobile ? 'h-[90px] min-w-[120px]' : 'h-[110px] max-w-[240px]'}
              `}
              onClick={stat.onClick}
            >
              <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${
                isMobile ? 'pb-1 pt-2 px-3' : 'pb-1 pt-3 px-4'
              }`}>
                <CardTitle className={`font-medium text-gray-700 leading-tight ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}>
                  {stat.title}
                </CardTitle>
                {stat.icon && (
                  <div className={`${colors.iconBg} ${colors.iconColor} rounded-full flex-shrink-0 ${
                    isMobile ? 'w-6 h-6 p-1' : 'w-8 h-8 p-1.5'
                  } flex items-center justify-center`}>
                    <div className={isMobile ? 'text-xs' : 'text-sm'}>
                      {stat.icon}
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className={`${
                isMobile ? 'pt-0 pb-2 px-3' : 'pt-0 pb-3 px-4'
              }`}>
                <div className={`font-bold text-gray-900 mb-1 leading-tight ${
                  isMobile ? 'text-lg' : 'text-xl'
                }`}>
                  {stat.value}
                </div>
                {stat.subtitle && (
                  <p className={`text-gray-500 leading-tight ${
                    isMobile ? 'text-xs' : 'text-xs'
                  }`}>
                    {stat.subtitle}
                  </p>
                )}
                {stat.trend && (
                  <div className={`flex items-center mt-1 ${
                    stat.trend.direction === 'up' 
                      ? 'text-green-600' 
                      : stat.trend.direction === 'down' 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                  } ${isMobile ? 'text-xs' : 'text-xs'}`}>
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