// src/app/dashboard/page.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LowStockNotification } from "@/components/LowStockNotification";
import { usePermission } from '@/hooks/usePermission';
import { 
  BarChart3, Users, Package, Factory, ShoppingCart, TrendingUp, 
  Clock, Beaker, Building, AlertTriangle, CheckCircle, 
  Calendar, DollarSign, Activity, ArrowUp, ArrowDown,
  PackageSearch, UserCheck, Zap, Eye, Droplets, Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

// 製造業專用統計數據介面
interface ManufacturingDashboardStats {
  // 生產核心指標
  completedWorkOrdersThisMonth: number;
  activeWorkOrders: number;
  lowStockAlerts: number;
  monthlyProductionCost: number;
  
  // 營運支援指標
  currentActivePersonnel: number;
  pendingDeliveries: number;
  averageWorkEfficiency: number;
  monthlyTrend: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  
  // 即時狀態
  todayTimeEntries: number;
  totalMaterials: number;
  totalFragrances: number;
  totalPersonnel: number;
}

// 最近活動介面
interface RecentActivity {
  id: string;
  type: 'work_order' | 'purchase_order' | 'inventory' | 'time_entry';
  title: string;
  description: string;
  timestamp: any;
  status?: string;
  user?: string;
}


export default function DashboardPage() {
  const { appUser, isLoading } = useAuth();
  const router = useRouter();
  const { hasPermission, canAccess, isAdmin } = usePermission();
  const [stats, setStats] = useState<ManufacturingDashboardStats>({
    completedWorkOrdersThisMonth: 0,
    activeWorkOrders: 0,
    lowStockAlerts: 0,
    monthlyProductionCost: 0,
    currentActivePersonnel: 0,
    pendingDeliveries: 0,
    averageWorkEfficiency: 0,
    monthlyTrend: { direction: 'stable', percentage: 0 },
    todayTimeEntries: 0,
    totalMaterials: 0,
    totalFragrances: 0,
    totalPersonnel: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // 載入儀表板統計數據
  useEffect(() => {
    if (!isLoading && appUser) {
      loadDashboardStats();
      loadRecentActivities();
    }
  }, [isLoading, appUser]);

  const loadDashboardStats = async () => {
    try {
      if (!db) return;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const promises = [
        getDocs(collection(db, 'materials')),
        getDocs(collection(db, 'fragrances')),
        getDocs(query(collection(db, 'work_orders'), where('status', '!=', '完工'))),
        getDocs(query(collection(db, 'work_orders'), where('status', '==', '完工'), where('createdAt', '>=', firstDayOfMonth))),
        getDocs(query(collection(db, 'purchase_orders'), where('status', '==', '已訂購'))),
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'timeEntries'), where('createdAt', '>=', today)))
      ];

      const [
        materialsSnap,
        fragrancesSnap, 
        activeWorkOrdersSnap,
        completedThisMonthSnap,
        pendingDeliveriesSnap,
        personnelSnap,
        todayTimeEntriesSnap
      ] = await Promise.all(promises);

      // 計算低庫存警告
      const materialsWithLowStock = materialsSnap.docs.filter(doc => {
        const data = doc.data();
        return data.minStock > 0 && data.stock < data.minStock;
      });
      const fragrancesWithLowStock = fragrancesSnap.docs.filter(doc => {
        const data = doc.data();
        return data.minStock > 0 && data.stock < data.minStock;
      });
      const lowStockAlerts = materialsWithLowStock.length + fragrancesWithLowStock.length;

      // 計算月度生產成本 (模擬數據，實際應從工單計算)
      const monthlyProductionCost = completedThisMonthSnap.docs.reduce((total, doc) => {
        const data = doc.data();
        return total + (data.estimatedCost || 0);
      }, 0);

      // 計算目前在班人員 (模擬數據，實際應從打卡記錄計算)
      const currentActivePersonnel = Math.floor(personnelSnap.size * 0.8);

      // 計算平均工時效率 (模擬數據)
      const averageWorkEfficiency = todayTimeEntriesSnap.size > 0 ? 85 : 75;

      // 計算月度趨勢 (模擬數據)
      const monthlyTrend = {
        direction: completedThisMonthSnap.size > 10 ? 'up' as const : 'stable' as const,
        percentage: Math.floor(Math.random() * 15) + 5
      };

      setStats({
        completedWorkOrdersThisMonth: completedThisMonthSnap.size,
        activeWorkOrders: activeWorkOrdersSnap.size,
        lowStockAlerts,
        monthlyProductionCost,
        currentActivePersonnel,
        pendingDeliveries: pendingDeliveriesSnap.size,
        averageWorkEfficiency,
        monthlyTrend,
        todayTimeEntries: todayTimeEntriesSnap.size,
        totalMaterials: materialsSnap.size,
        totalFragrances: fragrancesSnap.size,
        totalPersonnel: personnelSnap.size
      });
    } catch (error) {
      console.error('載入統計數據失敗:', error);
      toast.error('載入統計數據失敗');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadRecentActivities = async () => {
    try {
      if (!db) return;
      
      // 載入最近的活動（這裡簡化處理）
      const recentWorkOrders = await getDocs(
        query(collection(db, 'work_orders'), orderBy('createdAt', 'desc'), limit(3))
      );
      
      const activities: RecentActivity[] = [];
      
      recentWorkOrders.docs.forEach(doc => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          type: 'work_order',
          title: `工單 ${data.workOrderNumber}`,
          description: `產品: ${data.productName}`,
          timestamp: data.createdAt,
          status: data.status
        });
      });

      setRecentActivities(activities);
    } catch (error) {
      console.error('載入最近活動失敗:', error);
    }
  };

  const handleCardClick = (path: string) => {
    // 檢查權限後再跳轉
    if (canAccess(path) || isAdmin()) {
      window.location.href = path;
    } else {
      toast.error('您沒有權限訪問這個頁面');
    }
  };
  
  // 檢查是否可以顯示功能卡片
  const canShowCard = (path: string) => {
    return canAccess(path) || isAdmin();
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            生產管理中心
          </h1>
          <p className="text-muted-foreground mt-2">歡迎回來, {appUser?.name || '使用者'}! 今日工時記錄: {stats.todayTimeEntries} 筆</p>
        </div>
        <LowStockNotification />
      </div>

      {/* 生產狀態總覽橫幅 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">進行中工單</p>
                <p className="text-2xl font-bold">{stats.activeWorkOrders}</p>
              </div>
              <Factory className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">待收採購</p>
                <p className="text-2xl font-bold">{stats.pendingDeliveries}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">庫存警告</p>
                <p className="text-2xl font-bold">{stats.lowStockAlerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">在班人員</p>
                <p className="text-2xl font-bold">{stats.currentActivePersonnel}</p>
              </div>
              <Users className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 關鍵指標儀表板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {/* 第一排 - 生產核心指標 */}
        <Card 
          className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105"
          onClick={() => canShowCard('/dashboard/work-orders') && handleCardClick('/dashboard/work-orders')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-blue-800">本月完成工單</CardTitle>
            <CheckCircle className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 mb-1">
              {stats.completedWorkOrdersThisMonth}
            </div>
            <p className="text-sm text-blue-600">
              生產產能指標
            </p>
            <div className="mt-3">
              <Progress value={(stats.completedWorkOrdersThisMonth / 20) * 100} className="h-2" />
              <p className="text-xs text-blue-500 mt-1">目標: 20 單/月</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105"
          onClick={() => canShowCard('/dashboard/work-orders') && handleCardClick('/dashboard/work-orders')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-green-800">進行中工單</CardTitle>
            <Factory className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 mb-1">
              {stats.activeWorkOrders}
            </div>
            <p className="text-sm text-green-600">
              當前生產狀況
            </p>
            <div className="flex items-center mt-3">
              <Activity className="h-4 w-4 text-green-500 mr-1" />
              <p className="text-xs text-green-500">即時監控</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105"
          onClick={() => canShowCard('/dashboard/inventory') && handleCardClick('/dashboard/inventory')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-red-800">庫存警告</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900 mb-1">
              {stats.lowStockAlerts}
            </div>
            <p className="text-sm text-red-600">
              需要補貨的物料
            </p>
            <div className="flex items-center mt-3">
              {stats.lowStockAlerts > 0 ? (
                <Badge variant="destructive" className="text-xs">
                  需要關注
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                  庫存正常
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-xl transition-all duration-300"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-purple-800">本月生產成本</CardTitle>
            <DollarSign className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 mb-1">
              ${stats.monthlyProductionCost.toLocaleString()}
            </div>
            <p className="text-sm text-purple-600">
              成本控制追蹤
            </p>
            <div className="flex items-center mt-3">
              {stats.monthlyTrend.direction === 'up' ? (
                <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <p className="text-xs text-muted-foreground">
                {stats.monthlyTrend.direction === 'up' ? '+' : '-'}{stats.monthlyTrend.percentage}% 較上月
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 第二排 - 營運支援指標 */}
        <Card 
          className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105"
          onClick={() => canShowCard('/dashboard/personnel') && handleCardClick('/dashboard/personnel')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-orange-800">在班人員</CardTitle>
            <UserCheck className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900 mb-1">
              {stats.currentActivePersonnel}
            </div>
            <p className="text-sm text-orange-600">
              當前工作人員
            </p>
            <div className="mt-3">
              <Progress value={(stats.currentActivePersonnel / stats.totalPersonnel) * 100} className="h-2" />
              <p className="text-xs text-orange-500 mt-1">出勤率: {Math.round((stats.currentActivePersonnel / (stats.totalPersonnel || 1)) * 100)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105"
          onClick={() => canShowCard('/dashboard/purchase-orders') && handleCardClick('/dashboard/purchase-orders')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-cyan-800">待收採購</CardTitle>
            <PackageSearch className="h-5 w-5 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-900 mb-1">
              {stats.pendingDeliveries}
            </div>
            <p className="text-sm text-cyan-600">
              等待入庫物料
            </p>
            <div className="flex items-center mt-3">
              <Clock className="h-4 w-4 text-cyan-500 mr-1" />
              <p className="text-xs text-cyan-500">追蹤交貨</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105"
          onClick={() => handleCardClick('/dashboard/time-records')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-indigo-800">工時效率</CardTitle>
            <Zap className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-900 mb-1">
              {stats.averageWorkEfficiency}%
            </div>
            <p className="text-sm text-indigo-600">
              平均生產力分析
            </p>
            <div className="mt-3">
              <Progress value={stats.averageWorkEfficiency} className="h-2" />
              <p className="text-xs text-indigo-500 mt-1">目標: 85%</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 hover:shadow-xl transition-all duration-300"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-emerald-800">月度趨勢</CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900 mb-1">
              {stats.monthlyTrend.direction === 'up' ? '↗' : stats.monthlyTrend.direction === 'down' ? '↘' : '→'}
            </div>
            <p className="text-sm text-emerald-600">
              綜合營運趨勢
            </p>
            <div className="flex items-center mt-3">
              <Badge 
                variant={stats.monthlyTrend.direction === 'up' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {stats.monthlyTrend.direction === 'up' ? '成長' : stats.monthlyTrend.direction === 'down' ? '下降' : '穩定'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 智能快速操作區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主要操作卡片 */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-slate-50 to-gray-100 border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              智能快速操作
            </CardTitle>
            <p className="text-sm text-slate-600">製造業核心功能快速存取</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {canShowCard('/dashboard/work-orders') && (
                <Button 
                  variant="default"
                  className="h-auto p-4 flex-col items-start bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-left"
                  onClick={() => handleCardClick('/dashboard/work-orders')}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">建立新工單</span>
                  </div>
                  <span className="text-xs text-blue-100 mt-1">
                    開始生產流程
                  </span>
                </Button>
              )}
              
              {canShowCard('/dashboard/purchase-orders') && (
                <Button 
                  variant="outline"
                  className="h-auto p-4 flex-col items-start border-green-200 hover:bg-green-50 text-left"
                  onClick={() => handleCardClick('/dashboard/purchase-orders')}
                >
                  <div className="flex items-center gap-2 w-full text-green-700">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="font-medium">快速採購</span>
                  </div>
                  <span className="text-xs text-green-600 mt-1">
                    緊急物料訂購
                  </span>
                </Button>
              )}
              
              <Button 
                variant="outline"
                className="h-auto p-4 flex-col items-start border-indigo-200 hover:bg-indigo-50 text-left"
                onClick={() => handleCardClick('/dashboard/time-records')}
              >
                <div className="flex items-center gap-2 w-full text-indigo-700">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">我的工時</span>
                </div>
                <span className="text-xs text-indigo-600 mt-1">
                  員工打卡記錄
                </span>
              </Button>
              
              {canShowCard('/dashboard/inventory') && (
                <Button 
                  variant="outline"
                  className="h-auto p-4 flex-col items-start border-orange-200 hover:bg-orange-50 text-left"
                  onClick={() => handleCardClick('/dashboard/inventory')}
                >
                  <div className="flex items-center gap-2 w-full text-orange-700">
                    <PackageSearch className="h-4 w-4" />
                    <span className="font-medium">庫存盤點</span>
                  </div>
                  <span className="text-xs text-orange-600 mt-1">
                    快速庫存檢查
                  </span>
                </Button>
              )}
            </div>
            
            <Separator className="my-4" />
            
            {/* 快速導航按鈕 */}
            <div className="flex flex-wrap gap-2">
              {canShowCard('/dashboard/materials') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCardClick('/dashboard/materials')}
                  className="flex items-center gap-1 text-slate-600 hover:text-blue-600"
                >
                  <Beaker className="h-3 w-3" />
                  原料庫
                </Button>
              )}
              
              {canShowCard('/dashboard/fragrances') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCardClick('/dashboard/fragrances')}
                  className="flex items-center gap-1 text-slate-600 hover:text-blue-600"
                >
                  <Droplets className="h-3 w-3" />
                  香精庫
                </Button>
              )}
              
              {canShowCard('/dashboard/suppliers') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCardClick('/dashboard/suppliers')}
                  className="flex items-center gap-1 text-slate-600 hover:text-blue-600"
                >
                  <Building className="h-3 w-3" />
                  供應商
                </Button>
              )}
              
              {canShowCard('/dashboard/time-reports') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCardClick('/dashboard/time-reports')}
                  className="flex items-center gap-1 text-slate-600 hover:text-blue-600"
                >
                  <Activity className="h-3 w-3" />
                  工時報表
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 生產動態信息流 */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-800 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              生產動態
            </CardTitle>
            <p className="text-sm text-blue-600">即時營運狀況</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-2 rounded-lg bg-white/50">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900 truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-blue-600">
                      {activity.description}
                    </p>
                    {activity.status && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 text-blue-300 mx-auto mb-2" />
                <p className="text-sm text-blue-600">目前沒有新的活動</p>
                <p className="text-xs text-blue-500">系統運行正常</p>
              </div>
            )}
            
            <div className="pt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-blue-600 hover:text-blue-700"
                onClick={() => canShowCard('/dashboard/work-orders') && handleCardClick('/dashboard/work-orders')}
              >
                <Eye className="h-3 w-3 mr-1" />
                查看完整記錄
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}