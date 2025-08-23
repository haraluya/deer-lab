// src/app/dashboard/page.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { LowStockNotification } from "@/components/LowStockNotification";
import { BarChart3, Users, Package, Factory, ShoppingCart, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { appUser } = useAuth();
  const router = useRouter();

  const handleCardClick = (path: string) => {
    router.push(path);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            系統總覽
          </h1>
          <p className="text-gray-600 mt-2">歡迎回來, {appUser?.name}!</p>
        </div>
        <LowStockNotification />
      </div>

      {/* 統計摘要卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card 
          className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105"
          onClick={() => handleCardClick('/dashboard/work-orders')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">工單管理</CardTitle>
            <Factory className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              生產工單
            </div>
            <p className="text-xs text-blue-600 mt-1">
              管理生產流程
            </p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105"
          onClick={() => handleCardClick('/dashboard/inventory')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">庫存管理</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              物料庫存
            </div>
            <p className="text-xs text-green-600 mt-1">
              監控庫存狀況
            </p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105"
          onClick={() => handleCardClick('/dashboard/purchase-orders')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">採購管理</CardTitle>
            <ShoppingCart className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              採購訂單
            </div>
            <p className="text-xs text-purple-600 mt-1">
              管理供應商訂單
            </p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105"
          onClick={() => handleCardClick('/dashboard/personnel')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">人員管理</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              員工資料
            </div>
            <p className="text-xs text-orange-600 mt-1">
              管理人員資訊
            </p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105"
          onClick={() => handleCardClick('/dashboard/reports')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">報表分析</CardTitle>
            <BarChart3 className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              數據分析
            </div>
            <p className="text-xs text-red-600 mt-1">
              查看統計報表
            </p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105"
          onClick={() => handleCardClick('/dashboard/cost-management')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-teal-700">成本管理</CardTitle>
            <TrendingUp className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-900">
              成本分析
            </div>
            <p className="text-xs text-teal-600 mt-1">
              監控成本狀況
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 快速操作區域 */}
      <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            點擊上方卡片可快速訪問對應的管理功能。這裡是未來放置儀表板卡片和圖表的地方，您可以快速訪問常用功能。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}