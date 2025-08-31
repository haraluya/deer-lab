'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Clock, Calendar as CalendarIcon, TrendingUp, Award, AlertCircle, Download, Filter, User, UserCheck, Building, Briefcase } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface User {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  roleName: string;
  status: string;
  department?: string;
  avatar?: string;
}

interface WorkOrder {
  id: string;
  productName: string;
  productCode: string;
  quantity: number;
  status: string;
  createdAt: string;
  assignedTo?: string[];
}

interface TimeEntry {
  id: string;
  workOrderId: string;
  userId: string;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
  breakTime: number;
  totalHours: number;
  overtime: number;
  notes?: string;
  workOrder?: WorkOrder;
}

interface MonthlyStats {
  totalHours: number;
  overtime: number;
  workDays: number;
  avgHoursPerDay: number;
  completedOrders: number;
}

const MONTHS = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

export default function PersonnelTimesheet() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchUserData();
    fetchTimeEntries();
  }, [userId, selectedMonth]);

  const fetchUserData = async () => {
    try {
      if (!db) {
        console.error('Firestore is not initialized');
        return;
      }
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setUser({ id: userDoc.id, ...userDoc.data() } as User);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchTimeEntries = async () => {
    setLoading(true);
    try {
      if (!db) {
        console.error('Firestore is not initialized');
        setLoading(false);
        return;
      }

      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      
      const timeEntriesQuery = query(
        collection(db, 'timeEntries'),
        where('personnelId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(timeEntriesQuery);
      const entries: TimeEntry[] = [];
      
      // 獲取相關的工單資料
      const workOrderIds = new Set<string>();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // 使用 startDate 而不是 date，並且檢查是否在選定月份內
        const entryDate = data.startDate ? parseISO(data.startDate) : null;
        
        if (entryDate && isWithinInterval(entryDate, { start: monthStart, end: monthEnd })) {
          entries.push({
            id: doc.id,
            workOrderId: data.workOrderId,
            userId: data.personnelId,
            userName: data.personnelName,
            date: data.startDate,
            startTime: data.startTime,
            endTime: data.endTime,
            breakTime: 0, // 暫時設為 0，如果需要可以後續加入
            totalHours: data.duration || 0,
            overtime: data.overtimeHours || 0,
            notes: data.notes
          } as TimeEntry);
          
          if (data.workOrderId) {
            workOrderIds.add(data.workOrderId);
          }
        }
      });

      // 批量獲取工單資料
      if (workOrderIds.size > 0 && db) {
        const workOrdersQuery = query(
          collection(db, 'work_orders'),
          where('__name__', 'in', Array.from(workOrderIds))
        );
        const workOrdersSnapshot = await getDocs(workOrdersQuery);
        const workOrdersMap = new Map<string, WorkOrder>();
        
        workOrdersSnapshot.forEach((doc) => {
          workOrdersMap.set(doc.id, {
            id: doc.id,
            ...doc.data()
          } as WorkOrder);
        });

        // 將工單資料附加到時間條目
        entries.forEach((entry) => {
          if (entry.workOrderId && workOrdersMap.has(entry.workOrderId)) {
            entry.workOrder = workOrdersMap.get(entry.workOrderId);
          }
        });
      }

      setTimeEntries(entries);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthlyStats = useMemo<MonthlyStats>(() => {
    const stats = {
      totalHours: 0,
      overtime: 0,
      workDays: 0,
      avgHoursPerDay: 0,
      completedOrders: 0
    };

    const uniqueDates = new Set<string>();
    const completedOrderIds = new Set<string>();

    timeEntries.forEach((entry) => {
      stats.totalHours += entry.totalHours;
      stats.overtime += entry.overtime;
      uniqueDates.add(entry.date);
      
      if (entry.workOrder?.status === 'completed') {
        completedOrderIds.add(entry.workOrderId);
      }
    });

    stats.workDays = uniqueDates.size;
    stats.avgHoursPerDay = stats.workDays > 0 ? stats.totalHours / stats.workDays : 0;
    stats.completedOrders = completedOrderIds.size;

    return stats;
  }, [timeEntries]);

  const filteredEntries = useMemo(() => {
    return timeEntries.filter((entry) => {
      const matchesSearch = !searchQuery || 
        entry.workOrder?.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.workOrder?.productCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.notes?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || entry.workOrder?.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [timeEntries, searchQuery, statusFilter]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* 頁面標題和返回按鈕 */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full font-bold text-lg">
              {user.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-600">員工編號: {user.employeeId}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
            {user.status === 'active' ? '在職' : '離職'}
          </Badge>
          <Badge variant="outline">{user.roleName}</Badge>
        </div>
      </div>

      {/* 用戶資訊卡片 */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">職位</p>
                <p className="font-medium">{user.roleName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">部門</p>
                <p className="font-medium">{user.department || '未設定'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">狀態</p>
                <p className="font-medium">{user.status === 'active' ? '在職' : '離職'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">員工編號</p>
                <p className="font-medium">{user.employeeId}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">月度概覽</TabsTrigger>
          <TabsTrigger value="detailed">詳細記錄</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* 月份選擇器 */}
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {format(selectedMonth, 'yyyy年MM月', { locale: zhTW })} 工時統計
            </h2>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  選擇月份
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedMonth}
                  onSelect={(date) => date && setSelectedMonth(date)}
                  locale={zhTW}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 統計卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  總工時
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthlyStats.totalHours.toFixed(1)}h</div>
                <p className="text-xs text-blue-100">本月累計</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  加班時數
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthlyStats.overtime.toFixed(1)}h</div>
                <p className="text-xs text-orange-100">超時工作</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  出勤天數
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthlyStats.workDays}</div>
                <p className="text-xs text-green-100">工作日數</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  平均日工時
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthlyStats.avgHoursPerDay.toFixed(1)}h</div>
                <p className="text-xs text-purple-100">每日平均</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  完成工單
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthlyStats.completedOrders}</div>
                <p className="text-xs text-indigo-100">已完成</p>
              </CardContent>
            </Card>
          </div>

          {/* 月度工時分布圖表區域 */}
          <Card>
            <CardHeader>
              <CardTitle>本月工時分布</CardTitle>
            </CardHeader>
            <CardContent>
              {timeEntries.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">本月無工時記錄</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 簡化的工時分布顯示 */}
                  {Array.from(new Set(timeEntries.map(e => e.date))).sort().map(date => {
                    const dayEntries = timeEntries.filter(e => e.date === date);
                    const dayTotal = dayEntries.reduce((sum, e) => sum + e.totalHours, 0);
                    const dayOvertime = dayEntries.reduce((sum, e) => sum + e.overtime, 0);
                    
                    return (
                      <div key={date} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-medium text-sm">
                            {format(parseISO(date), 'MM/dd (E)', { locale: zhTW })}
                          </p>
                          <Badge variant={dayOvertime > 0 ? "destructive" : "default"} className="text-xs">
                            {dayTotal.toFixed(1)}h
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600">
                          {dayEntries.length} 個工單
                          {dayOvertime > 0 && ` • 加班 ${dayOvertime.toFixed(1)}h`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          {/* 篩選和搜尋 */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="搜尋工單、產品或備註..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="pending">進行中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                匯出
              </Button>
            </div>
          </div>

          {/* 詳細工時記錄表格 */}
          <Card>
            <CardHeader>
              <CardTitle>詳細工時記錄</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">載入中...</p>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {timeEntries.length === 0 ? '本月無工時記錄' : '無符合條件的記錄'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 桌面版表格 */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">日期</th>
                          <th className="text-left p-3">工單</th>
                          <th className="text-left p-3">產品</th>
                          <th className="text-left p-3">時間</th>
                          <th className="text-left p-3">工時</th>
                          <th className="text-left p-3">加班</th>
                          <th className="text-left p-3">狀態</th>
                          <th className="text-left p-3">備註</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEntries.map((entry) => (
                          <tr key={entry.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              {format(parseISO(entry.date), 'MM/dd (E)', { locale: zhTW })}
                            </td>
                            <td className="p-3">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                {entry.workOrder?.productCode || entry.workOrderId.slice(-6)}
                              </span>
                            </td>
                            <td className="p-3">
                              {entry.workOrder?.productName || '未知產品'}
                            </td>
                            <td className="p-3 text-xs text-gray-600">
                              {entry.startTime} - {entry.endTime}
                            </td>
                            <td className="p-3">
                              <Badge variant="secondary">
                                {entry.totalHours.toFixed(1)}h
                              </Badge>
                            </td>
                            <td className="p-3">
                              {entry.overtime > 0 ? (
                                <Badge variant="destructive">
                                  {entry.overtime.toFixed(1)}h
                                </Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              <Badge 
                                variant={
                                  entry.workOrder?.status === 'completed' ? 'default' :
                                  entry.workOrder?.status === 'pending' ? 'secondary' :
                                  'outline'
                                }
                              >
                                {entry.workOrder?.status === 'completed' ? '已完成' :
                                 entry.workOrder?.status === 'pending' ? '進行中' :
                                 '未知'}
                              </Badge>
                            </td>
                            <td className="p-3 text-xs text-gray-600 max-w-[100px] truncate">
                              {entry.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 手機版卡片 */}
                  <div className="md:hidden space-y-3">
                    {filteredEntries.map((entry) => (
                      <Card key={entry.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium">
                                {entry.workOrder?.productName || '未知產品'}
                              </p>
                              <p className="text-sm text-gray-600">
                                {format(parseISO(entry.date), 'MM/dd (E)', { locale: zhTW })}
                              </p>
                            </div>
                            <Badge 
                              variant={
                                entry.workOrder?.status === 'completed' ? 'default' :
                                entry.workOrder?.status === 'pending' ? 'secondary' :
                                'outline'
                              }
                            >
                              {entry.workOrder?.status === 'completed' ? '已完成' :
                               entry.workOrder?.status === 'pending' ? '進行中' :
                               '未知'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-600">工作時間</p>
                              <p>{entry.startTime} - {entry.endTime}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">總工時</p>
                              <div className="flex gap-2">
                                <Badge variant="secondary">
                                  {entry.totalHours.toFixed(1)}h
                                </Badge>
                                {entry.overtime > 0 && (
                                  <Badge variant="destructive">
                                    +{entry.overtime.toFixed(1)}h
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {entry.notes && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs text-gray-600">備註</p>
                              <p className="text-sm">{entry.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}