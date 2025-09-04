// src/app/dashboard/time-records/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { 
  Clock, User, Calendar, Factory, TrendingUp, 
  Activity, Timer, Award, BarChart3, Filter,
  ChevronDown, ChevronUp, Zap
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

// 介面定義
interface TimeEntry {
  id: string;
  workOrderId: string;
  workOrderNumber: string;
  personnelId: string;
  personnelName: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  duration: number; // 小時
  overtimeHours?: number;
  notes?: string;
  status?: 'draft' | 'confirmed' | 'locked';
  createdAt: any;
  updatedAt?: any;
}

interface PersonalTimeStats {
  totalEntries: number;
  totalHours: number;
  monthlyHours: number;
  totalWorkOrders: number;
  avgHoursPerEntry: number;
}

interface MonthlyStats {
  month: string;
  hours: number;
  entries: number;
  overtime: number;
}

export default function PersonalTimeRecordsPage() {
  const { appUser } = useAuth();
  const [personalTimeEntries, setPersonalTimeEntries] = useState<TimeEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<TimeEntry[]>([]);
  const [stats, setStats] = useState<PersonalTimeStats>({
    totalEntries: 0,
    totalHours: 0,
    monthlyHours: 0,
    totalWorkOrders: 0,
    avgHoursPerEntry: 0
  });
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  // 載入個人工時記錄
  useEffect(() => {
    if (appUser) {
      loadPersonalTimeRecords();
    }
  }, [appUser]);

  // 篩選邏輯
  useEffect(() => {
    let filtered = personalTimeEntries;
    
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.workOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (monthFilter !== 'all') {
      filtered = filtered.filter(entry => {
        const entryMonth = new Date(entry.startDate).toISOString().slice(0, 7); // YYYY-MM
        return entryMonth === monthFilter;
      });
    }
    
    setFilteredEntries(filtered);
  }, [personalTimeEntries, searchTerm, monthFilter]);

  const loadPersonalTimeRecords = async () => {
    try {
      if (!db || !appUser) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      // 載入當前用戶的工時記錄，使用用戶ID（在users集合中的文檔ID）
      const timeEntriesQuery = query(
        collection(db, 'timeEntries'),
        where('personnelId', '==', appUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const timeEntriesSnapshot = await getDocs(timeEntriesQuery);
      const timeEntries = timeEntriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TimeEntry[];

      setPersonalTimeEntries(timeEntries);

      // 計算統計資料
      calculateStats(timeEntries);
      calculateMonthlyStats(timeEntries);

    } catch (error) {
      console.error('載入個人工時記錄失敗:', error);
      toast.error(`載入個人工時記錄失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (entries: TimeEntry[]) => {
    const totalHours = entries.reduce((sum, entry) => sum + entry.duration, 0);
    const uniqueWorkOrders = new Set(entries.map(entry => entry.workOrderId)).size;

    // 計算本月工時
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyHours = entries
      .filter(entry => new Date(entry.startDate).toISOString().slice(0, 7) === currentMonth)
      .reduce((sum, entry) => sum + entry.duration, 0);

    setStats({
      totalEntries: entries.length,
      totalHours,
      monthlyHours,
      totalWorkOrders: uniqueWorkOrders,
      avgHoursPerEntry: entries.length > 0 ? totalHours / entries.length : 0
    });
  };

  const calculateMonthlyStats = (entries: TimeEntry[]) => {
    const monthlyData: { [key: string]: MonthlyStats } = {};

    entries.forEach(entry => {
      const month = new Date(entry.startDate).toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          hours: 0,
          entries: 0,
          overtime: 0
        };
      }
      monthlyData[month].hours += entry.duration;
      monthlyData[month].entries += 1;
      monthlyData[month].overtime += entry.overtimeHours || 0;
    });

    const sortedMonthly = Object.values(monthlyData).sort((a, b) => b.month.localeCompare(a.month));
    setMonthlyStats(sortedMonthly);
  };

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const formatDuration = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}小時${minutes > 0 ? `${minutes}分鐘` : ''}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatMonthDisplay = (monthString: string) => {
    const [year, month] = monthString.split('-');
    return `${year}年${parseInt(month)}月`;
  };

  if (!appUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">請先登入查看個人工時統計</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題和用戶資訊 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            工時統計
          </h1>
          <p className="text-gray-600 mt-1">
            {appUser?.name} ({appUser?.employeeId}) 的工時記錄總覽
          </p>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-8 w-8 p-2 bg-blue-100 rounded-lg text-blue-600" />
          <div className="text-sm">
            <div className="font-medium">{appUser?.name}</div>
            <div className="text-gray-500">工號: {appUser?.employeeId}</div>
          </div>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-100 border-2 border-emerald-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-emerald-800">本月總工時</CardTitle>
              <div className="p-2 bg-emerald-500 rounded-lg">
                <Calendar className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24 mb-2" />
            ) : (
              <div className="text-3xl font-bold text-emerald-900 mb-1">{formatDuration(stats.monthlyHours)}</div>
            )}
            <p className="text-xs text-emerald-600 font-medium">本月工作時間</p>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-emerald-600/10 pointer-events-none" />
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-blue-800">累計總工時</CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg">
                <Clock className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24 mb-2" />
            ) : (
              <div className="text-3xl font-bold text-blue-900 mb-1">{formatDuration(stats.totalHours)}</div>
            )}
            <p className="text-xs text-blue-600 font-medium">累計工作時間</p>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-600/10 pointer-events-none" />
        </Card>


        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-violet-100 border-2 border-purple-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-purple-800">參與工單</CardTitle>
              <div className="p-2 bg-purple-500 rounded-lg">
                <Factory className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12 mb-2" />
            ) : (
              <div className="text-3xl font-bold text-purple-900 mb-1">{stats.totalWorkOrders}</div>
            )}
            <p className="text-xs text-purple-600 font-medium">個工單項目</p>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-purple-600/10 pointer-events-none" />
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-pink-50 to-rose-100 border-2 border-pink-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-pink-800">平均工時</CardTitle>
              <div className="p-2 bg-pink-500 rounded-lg">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mb-2" />
            ) : (
              <div className="text-3xl font-bold text-pink-900 mb-1">{formatDuration(stats.avgHoursPerEntry)}</div>
            )}
            <p className="text-xs text-pink-600 font-medium">每筆記錄平均</p>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-pink-600/10 pointer-events-none" />
        </Card>
      </div>

      {/* 搜尋和篩選 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="搜尋工單號碼或備註..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="選擇月份" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部月份</SelectItem>
                {monthlyStats.map(stat => (
                  <SelectItem key={stat.month} value={stat.month}>
                    {formatMonthDisplay(stat.month)} ({stat.entries}筆)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 工時記錄列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            我的工時記錄
          </CardTitle>
          <p className="text-sm text-gray-600">
            共 {filteredEntries.length} 筆工時記錄
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">尚無工時記錄</p>
              <p className="text-sm text-gray-400 mt-1">開始工作並申報工時後，記錄將會顯示在這裡</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 桌面版 */}
              <div className="hidden md:block">
                <div className="grid grid-cols-10 gap-4 py-3 px-4 bg-gray-50 rounded-lg font-medium text-sm text-gray-700">
                  <div className="col-span-2">工單號碼</div>
                  <div className="col-span-2">工作日期</div>
                  <div className="col-span-2">工作時間</div>
                  <div className="col-span-2">總工時</div>
                  <div className="col-span-2">狀態</div>
                </div>
                {filteredEntries.map((entry) => (
                  <Card key={entry.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-10 gap-4 items-center">
                        <div className="col-span-2">
                          <Link 
                            href={`/dashboard/work-orders/${entry.workOrderId}`}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          >
                            {entry.workOrderNumber}
                          </Link>
                        </div>
                        <div className="col-span-2">
                          <div className="text-sm">
                            {formatDate(entry.startDate)}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-sm">
                            {entry.startTime} - {entry.endTime}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {formatDuration(entry.duration)}
                          </Badge>
                        </div>
                        <div className="col-span-2">
                          <div className="flex items-center justify-between">
                            <Badge variant={entry.status === 'locked' ? 'secondary' : 'default'}>
                              {entry.status === 'locked' ? '已鎖定' : '正常'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(entry.id)}
                            >
                              {expandedEntries.has(entry.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      {expandedEntries.has(entry.id) && entry.notes && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">備註：</span>
                            <span className="ml-2">{entry.notes}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 手機版 */}
              <div className="md:hidden space-y-3">
                {filteredEntries.map((entry) => (
                  <Card key={entry.id} className="p-4">
                    <div 
                      className="cursor-pointer"
                      onClick={() => toggleExpanded(entry.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <Link 
                          href={`/dashboard/work-orders/${entry.workOrderId}`}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                          {entry.workOrderNumber}
                        </Link>
                        <Badge variant={entry.status === 'locked' ? 'secondary' : 'default'}>
                          {entry.status === 'locked' ? '已鎖定' : '正常'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {formatDate(entry.startDate)}
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {formatDuration(entry.duration)}
                          </Badge>
                        </div>
                        {expandedEntries.has(entry.id) ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    
                    {expandedEntries.has(entry.id) && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">工作時間：</span>
                          <span>{entry.startTime} - {entry.endTime}</span>
                        </div>
                        {entry.notes && (
                          <div className="text-sm">
                            <span className="text-gray-600">備註：</span>
                            <p className="mt-1 text-gray-800">{entry.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}