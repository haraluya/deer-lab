// src/app/dashboard/page.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LowStockNotification } from "@/components/LowStockNotification";
import { 
  BarChart3, Users, Package, Factory, ShoppingCart, TrendingUp, 
  Clock, Beaker, Building, AlertTriangle, CheckCircle, 
  Calendar, DollarSign, Activity, ArrowUp, ArrowDown,
  PackageSearch, UserCheck, Zap, Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

// 統計數據介面
interface DashboardStats {
  totalMaterials: number;
  totalFragrances: number;
  activeWorkOrders: number;
  pendingPurchaseOrders: number;
  lowStockItems: number;
  totalPersonnel: number;
  todayTimeEntries: number;
  thisMonthWorkOrders: number;
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
  const [stats, setStats] = useState<DashboardStats>({
    totalMaterials: 0,
    totalFragrances: 0,
    activeWorkOrders: 0,
    pendingPurchaseOrders: 0,
    lowStockItems: 0,
    totalPersonnel: 0,
    todayTimeEntries: 0,
    thisMonthWorkOrders: 0
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
      
      const promises = [
        getDocs(collection(db, 'materials')),
        getDocs(collection(db, 'fragrances')),
        getDocs(query(collection(db, 'work_orders'), where('status', '!=', 'completed'))),
        getDocs(query(collection(db, 'purchase_orders'), where('status', '==', 'pending'))),
        getDocs(collection(db, 'users')),
      ];

      const [
        materialsSnap,
        fragrancesSnap, 
        workOrdersSnap,
        purchaseOrdersSnap,
        personnelSnap
      ] = await Promise.all(promises);

      // 計算今日工時記錄
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimeEntries = await getDocs(
        query(
          collection(db, 'timeEntries'),
          where('createdAt', '>=', today)
        )
      );

      // 計算本月工單數
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const thisMonthWorkOrders = await getDocs(
        query(
          collection(db, 'work_orders'),
          where('createdAt', '>=', firstDayOfMonth)
        )
      );

      // 計算低庫存項目 (這裡需要實際的庫存邏輯)
      let lowStockCount = 0;
      const materialsWithLowStock = materialsSnap.docs.filter(doc => {
        const data = doc.data();
        return data.minStock > 0 && data.stock < data.minStock;
      });
      const fragrancesWithLowStock = fragrancesSnap.docs.filter(doc => {
        const data = doc.data();
        return data.minStock > 0 && data.stock < data.minStock;
      });
      lowStockCount = materialsWithLowStock.length + fragrancesWithLowStock.length;

      setStats({
        totalMaterials: materialsSnap.size,
        totalFragrances: fragrancesSnap.size,
        activeWorkOrders: workOrdersSnap.size,
        pendingPurchaseOrders: purchaseOrdersSnap.size,
        lowStockItems: lowStockCount,
        totalPersonnel: personnelSnap.size,
        todayTimeEntries: todayTimeEntries.size,
        thisMonthWorkOrders: thisMonthWorkOrders.size
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
    window.location.href = path;
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            系統總覽
          </h1>
          <p className="text-muted-foreground mt-2">歡迎回來, {appUser?.name || '使用者'}!</p>
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
      <Card className="bg-gradient-to-r from-background to-muted/50 border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            點擊上方卡片可快速訪問對應的管理功能。這裡是未來放置儀表板卡片和圖表的地方，您可以快速訪問常用功能。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}