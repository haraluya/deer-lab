'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Droplets, DollarSign, AlertTriangle, Package } from 'lucide-react';

// 測試數據
const testStats = [
  {
    title: '總香精數',
    value: '92',
    subtitle: '所有香精',
    icon: <Droplets className="h-4 w-4" />,
    color: 'blue' as const
  },
  {
    title: '總價值',
    value: '$2024686.52',
    subtitle: '庫存總價值',
    icon: <DollarSign className="h-4 w-4" />,
    color: 'green' as const
  },
  {
    title: '低庫存香精',
    value: '0',
    subtitle: '需要補貨',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'red' as const
  },
  {
    title: '活躍香精',
    value: '0',
    subtitle: '正在使用中',
    icon: <Package className="h-4 w-4" />,
    color: 'purple' as const
  },
];

// 顏色配置
const getColorClasses = (color: string) => {
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
  };
  
  return colorMap[color as keyof typeof colorMap] || {
    background: 'bg-gray-50/50',
    border: 'border-2 border-gray-300',
    iconBg: 'bg-gray-500',
    iconColor: 'text-white'
  };
};

// 排版方案組件
const StatsLayout01 = ({ stats }: { stats: typeof testStats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {stats.map((stat, index) => {
      const colors = getColorClasses(stat.color);
      return (
        <Card key={index} className={`${colors.background} ${colors.border} shadow-sm h-[100px]`}>
          <div className="p-1 h-full">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-medium text-gray-700">{stat.title}</h3>
              <div className={`${colors.iconBg} ${colors.iconColor} rounded-full w-6 h-6 flex items-center justify-center`}>
                {stat.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <p className="text-xs text-gray-500">{stat.subtitle}</p>
          </div>
        </Card>
      );
    })}
  </div>
);

const StatsLayout02 = ({ stats }: { stats: typeof testStats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {stats.map((stat, index) => {
      const colors = getColorClasses(stat.color);
      return (
        <Card key={index} className={`${colors.background} ${colors.border} shadow-sm h-[110px]`}>
          <div className="p-2.5 h-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">{stat.title}</h3>
              <div className={`${colors.iconBg} ${colors.iconColor} rounded-full w-7 h-7 flex items-center justify-center`}>
                {stat.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <p className="text-xs text-gray-500">{stat.subtitle}</p>
          </div>
        </Card>
      );
    })}
  </div>
);

const StatsLayout03 = ({ stats }: { stats: typeof testStats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {stats.map((stat, index) => {
      const colors = getColorClasses(stat.color);
      return (
        <Card key={index} className={`${colors.background} ${colors.border} shadow-sm h-[120px]`}>
          <div className="p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">{stat.title}</h3>
              <div className={`${colors.iconBg} ${colors.iconColor} rounded-full w-8 h-8 flex items-center justify-center`}>
                {stat.icon}
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 text-center">{stat.value}</div>
            <p className="text-sm text-gray-500 text-center">{stat.subtitle}</p>
          </div>
        </Card>
      );
    })}
  </div>
);

const StatsLayout04 = ({ stats }: { stats: typeof testStats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {stats.map((stat, index) => {
      const colors = getColorClasses(stat.color);
      return (
        <Card key={index} className={`${colors.background} ${colors.border} shadow-sm h-[100px]`}>
          <div className="px-3 py-1 h-full">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-medium text-gray-700 leading-none">{stat.title}</h3>
              <div className={`${colors.iconBg} ${colors.iconColor} rounded-full w-7 h-7 flex items-center justify-center ml-2`}>
                {stat.icon}
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 leading-none mt-1">{stat.value}</div>
            <p className="text-xs text-gray-500 leading-none">{stat.subtitle}</p>
          </div>
        </Card>
      );
    })}
  </div>
);

const StatsLayout05 = ({ stats }: { stats: typeof testStats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {stats.map((stat, index) => {
      const colors = getColorClasses(stat.color);
      return (
        <Card key={index} className={`${colors.background} ${colors.border} shadow-sm h-[120px]`}>
          <div className="p-3 h-full flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/50">
              <h3 className="text-sm font-medium text-gray-700">{stat.title}</h3>
              <div className={`${colors.iconBg} ${colors.iconColor} rounded-full w-7 h-7 flex items-center justify-center`}>
                {stat.icon}
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
            </div>
            <div className="pt-2 border-t border-gray-200/50">
              <p className="text-xs text-gray-500 text-center">{stat.subtitle}</p>
            </div>
          </div>
        </Card>
      );
    })}
  </div>
);

const StatsLayout06 = ({ stats }: { stats: typeof testStats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {stats.map((stat, index) => {
      const colors = getColorClasses(stat.color);
      return (
        <Card key={index} className={`${colors.background} ${colors.border} shadow-sm h-[100px]`}>
          <div className="px-2 py-1.5 h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-gray-700 max-w-[120px] truncate">{stat.title}</h3>
              <div className={`${colors.iconBg} ${colors.iconColor} rounded-full w-6 h-6 flex items-center justify-center`}>
                {stat.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 leading-tight">{stat.value}</div>
            <p className="text-xs text-gray-500 leading-tight">{stat.subtitle}</p>
          </div>
        </Card>
      );
    })}
  </div>
);

const StatsLayout07 = ({ stats }: { stats: typeof testStats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {stats.map((stat, index) => {
      const colors = getColorClasses(stat.color);
      return (
        <Card key={index} className={`${colors.background} ${colors.border} shadow-sm h-[130px]`}>
          <div className="p-3 h-full">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-medium text-gray-700">{stat.title}</h3>
              <div className={`${colors.iconBg} ${colors.iconColor} rounded-full w-7 h-7 flex items-center justify-center`}>
                {stat.icon}
              </div>
            </div>
            <div className="text-4xl font-bold text-gray-900 leading-none my-2">{stat.value}</div>
            <p className="text-sm text-gray-500">{stat.subtitle}</p>
          </div>
        </Card>
      );
    })}
  </div>
);

const StatsLayout08 = ({ stats }: { stats: typeof testStats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {stats.map((stat, index) => {
      const colors = getColorClasses(stat.color);
      return (
        <Card key={index} className={`${colors.background} ${colors.border} shadow-sm h-[110px]`}>
          <div className="p-2 h-full">
            <div className="flex items-start">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-700 truncate">{stat.title}</h3>
                <div className="text-2xl font-bold text-gray-900 mt-1 leading-tight">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
              </div>
              <div className={`${colors.iconBg} ${colors.iconColor} rounded-full w-8 h-8 flex items-center justify-center ml-2 flex-shrink-0`}>
                {stat.icon}
              </div>
            </div>
          </div>
        </Card>
      );
    })}
  </div>
);

const StatsLayout09 = ({ stats }: { stats: typeof testStats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {stats.map((stat, index) => {
      const colors = getColorClasses(stat.color);
      return (
        <Card key={index} className={`${colors.background} ${colors.border} shadow-sm h-[115px]`}>
          <div className="px-4 py-3 h-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">{stat.title}</h3>
              <div className={`${colors.iconBg} ${colors.iconColor} rounded-lg w-9 h-9 flex items-center justify-center`}>
                {stat.icon}
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <p className="text-sm text-gray-600">{stat.subtitle}</p>
          </div>
        </Card>
      );
    })}
  </div>
);

const StatsLayout10 = ({ stats }: { stats: typeof testStats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {stats.map((stat, index) => {
      const colors = getColorClasses(stat.color);
      return (
        <Card key={index} className={`${colors.background} ${colors.border} shadow-sm h-[105px] hover:shadow-md transition-shadow`}>
          <div className="px-2.5 py-2 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 flex-1 truncate pr-2">{stat.title}</h3>
              <div className={`${colors.iconBg} ${colors.iconColor} rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0`}>
                {stat.icon}
              </div>
            </div>
            <div className="flex-1 flex items-center">
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </div>
            <p className="text-xs text-gray-500">{stat.subtitle}</p>
          </div>
        </Card>
      );
    })}
  </div>
);

const layouts = [
  { id: '01', name: '極簡式', component: StatsLayout01, description: '最小內邊距，緊湊間距，高度100px' },
  { id: '02', name: '舒適式', component: StatsLayout02, description: '適中內邊距，平衡間距，高度110px' },
  { id: '03', name: '垂直居中', component: StatsLayout03, description: '內容垂直居中，文字居中對齊，高度120px' },
  { id: '04', name: '上對齊式', component: StatsLayout04, description: '內容向上對齊，最小上邊距，高度100px' },
  { id: '05', name: '分層式', component: StatsLayout05, description: '三層結構，分隔線清晰，高度120px' },
  { id: '06', name: '緊密式', component: StatsLayout06, description: '去除margin，純padding控制，高度100px' },
  { id: '07', name: '大字型', component: StatsLayout07, description: '數值字體4xl，突出顯示，高度130px' },
  { id: '08', name: '水平優化', component: StatsLayout08, description: '水平佈局，圖標右對齊，高度110px' },
  { id: '09', name: '響應式', component: StatsLayout09, description: '桌面特殊優化，圓角圖標，高度115px' },
  { id: '10', name: '混合式', component: StatsLayout10, description: '綜合優化，完美平衡，高度105px' },
];

export default function TestStatsCards() {
  const [selectedLayout, setSelectedLayout] = useState('01');

  const SelectedComponent = layouts.find(layout => layout.id === selectedLayout)?.component || StatsLayout01;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">統計卡片排版測試</h1>
        <p className="text-gray-600">10種不同的統計卡片排版方案，選擇你最喜歡的設計</p>
      </div>

      {/* 選擇器 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">選擇排版方案</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {layouts.map((layout) => (
            <Button
              key={layout.id}
              variant={selectedLayout === layout.id ? "default" : "outline"}
              onClick={() => setSelectedLayout(layout.id)}
              className="flex flex-col h-auto p-3 text-left"
            >
              <span className="font-bold">方案 {layout.id}</span>
              <span className="text-xs">{layout.name}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* 當前方案資訊 */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
            {selectedLayout}
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">
              方案 {selectedLayout} - {layouts.find(l => l.id === selectedLayout)?.name}
            </h3>
            <p className="text-blue-700 text-sm">
              {layouts.find(l => l.id === selectedLayout)?.description}
            </p>
          </div>
        </div>
      </div>

      {/* 預覽區域 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-6">預覽效果</h2>
        <SelectedComponent stats={testStats} />
      </div>

      {/* 使用說明 */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="font-semibold mb-3">使用說明</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>• 點擊上方按鈕切換不同的排版方案</li>
          <li>• 每個方案都有獨特的內邊距、間距、對齊方式</li>
          <li>• 選定滿意的方案後，將編號告訴我即可應用到整個系統</li>
          <li>• 所有方案都支援響應式設計，在手機上也能正常顯示</li>
        </ul>
      </div>
    </div>
  );
}