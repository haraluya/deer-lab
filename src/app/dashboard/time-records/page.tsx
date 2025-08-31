// src/app/dashboard/time-records/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, where, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { 
  Clock, Users, Factory, Calendar, User, Filter, Search, 
  ChevronDown, ChevronUp, FileText, Download, TrendingUp,
  Activity, Timer, AlertCircle, CheckCircle, Eye, BarChart3
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

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

interface WorkOrderSummary {
  workOrderId: string;
  workOrderNumber: string;
  productName?: string;
  totalHours: number;
  totalOvertime: number;
  personnelCount: number;
  timeEntries: TimeEntry[];
  status: string;
  completedAt?: any;
}

interface TimeRecordStats {
  totalWorkOrders: number;
  totalHours: number;
  totalOvertime: number;
  activePersonnel: number;
  avgHoursPerOrder: number;
}

export default function TimeRecordsPage() {
  const [workOrderSummaries, setWorkOrderSummaries] = useState<WorkOrderSummary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<WorkOrderSummary[]>([]);
  const [stats, setStats] = useState<TimeRecordStats>({
    totalWorkOrders: 0,
    totalHours: 0,
    totalOvertime: 0,
    activePersonnel: 0,
    avgHoursPerOrder: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<WorkOrderSummary | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 載入資料
  useEffect(() => {
    loadTimeRecords();
  }, []);

  // 篩選邏輯
  useEffect(() => {
    let filtered = workOrderSummaries;
    
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.workOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.timeEntries.some(entry => 
          entry.personnelName.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    setFilteredSummaries(filtered);
  }, [workOrderSummaries, searchTerm, statusFilter]);

  const loadTimeRecords = async () => {
    try {
      if (!db) return;
      setIsLoading(true);

      // 載入工時記錄
      const timeEntriesQuery = query(
        collection(db, 'timeEntries'),
        orderBy('createdAt', 'desc')
      );
      const timeEntriesSnapshot = await getDocs(timeEntriesQuery);
      const timeEntries = timeEntriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TimeEntry[];

      // 按工單分組
      const orderGroups: { [key: string]: WorkOrderSummary } = {};
      
      for (const entry of timeEntries) {
        const workOrderId = entry.workOrderId;
        
        if (!orderGroups[workOrderId]) {
          // 獲取工單資訊
          let workOrderData: any = {};
          try {
            const workOrderDoc = await getDoc(doc(db, 'work_orders', workOrderId));
            if (workOrderDoc.exists()) {
              workOrderData = workOrderDoc.data();
            }
          } catch (error) {
            console.warn('無法載入工單資訊:', workOrderId);
          }

          orderGroups[workOrderId] = {
            workOrderId,
            workOrderNumber: entry.workOrderNumber || workOrderData.workOrderNumber || workOrderId,
            productName: workOrderData.productName || '未知產品',
            totalHours: 0,
            totalOvertime: 0,
            personnelCount: 0,
            timeEntries: [],
            status: workOrderData.status || 'active',
            completedAt: workOrderData.completedAt
          };
        }
        
        orderGroups[workOrderId].timeEntries.push(entry);
        orderGroups[workOrderId].totalHours += entry.duration || 0;
        orderGroups[workOrderId].totalOvertime += entry.overtimeHours || 0;
      }

      // 計算人員數量
      Object.values(orderGroups).forEach(order => {
        const uniquePersonnel = new Set(order.timeEntries.map(e => e.personnelId));
        order.personnelCount = uniquePersonnel.size;
      });

      const summaries = Object.values(orderGroups);
      setWorkOrderSummaries(summaries);

      // 計算統計
      const totalPersonnel = new Set(timeEntries.map(e => e.personnelId)).size;
      const newStats: TimeRecordStats = {
        totalWorkOrders: summaries.length,
        totalHours: summaries.reduce((sum, order) => sum + order.totalHours, 0),
        totalOvertime: summaries.reduce((sum, order) => sum + order.totalOvertime, 0),
        activePersonnel: totalPersonnel,
        avgHoursPerOrder: summaries.length > 0 
          ? summaries.reduce((sum, order) => sum + order.totalHours, 0) / summaries.length 
          : 0
      };
      setStats(newStats);

    } catch (error) {
      console.error('載入工時記錄失敗:', error);
      toast.error('載入工時記錄失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (hours: number): string => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes === 0) return `${wholeHours}小時`;
    return `${wholeHours}小時${minutes}分`;
  };

  const formatDateTime = (date: string, time: string): string => {
    return `${date} ${time.substring(0, 5)}`;
  };

  const toggleExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const handleViewDetail = (order: WorkOrderSummary) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  return (
    <div className="container mx-auto py-6">
      {/* 標題區 */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            工時統計
          </h1>
          <p className="text-gray-600 mt-2 text-lg">查看所有工單的工時記錄與統計分析</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            匯出報表
          </Button>
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            分析圖表
          </Button>
        </div>
      </div>

      {/* 統計卡片區 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-blue-800">工單總數</CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg">
                <Factory className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-blue-900">{stats.totalWorkOrders}</div>
              <p className="text-xs text-blue-600 font-medium">個工單記錄</p>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-600/10 pointer-events-none" />
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-green-800">總工時</CardTitle>
              <div className="p-2 bg-green-500 rounded-lg">
                <Clock className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-green-900">{formatDuration(stats.totalHours)}</div>
              <p className="text-xs text-green-600 font-medium">累積工作時間</p>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-green-600/10 pointer-events-none" />
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-100 border-2 border-orange-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-orange-800">加班工時</CardTitle>
              <div className="p-2 bg-orange-500 rounded-lg">
                <Timer className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-orange-900">{formatDuration(stats.totalOvertime)}</div>
              <p className="text-xs text-orange-600 font-medium">超時工作時間</p>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-orange-600/10 pointer-events-none" />
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-violet-100 border-2 border-purple-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-purple-800">參與人員</CardTitle>
              <div className="p-2 bg-purple-500 rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-purple-900">{stats.activePersonnel}</div>
              <p className="text-xs text-purple-600 font-medium">位活躍成員</p>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-purple-600/10 pointer-events-none" />
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-teal-50 to-cyan-100 border-2 border-teal-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-teal-800">平均工時</CardTitle>
              <div className="p-2 bg-teal-500 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-teal-900">{formatDuration(stats.avgHoursPerOrder)}</div>
              <p className="text-xs text-teal-600 font-medium">每工單平均</p>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-teal-600/10 pointer-events-none" />
        </Card>
      </div>

      {/* 搜尋和篩選區 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            搜尋與篩選
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">搜尋工單</label>
              <div className="relative">
                <Input
                  placeholder="工單編號、產品名稱、人員姓名..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-2 border-gray-200 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">工單狀態</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white border-2 border-gray-200 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="active">進行中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {(searchTerm || statusFilter !== 'all') && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                顯示 {filteredSummaries.length} 個工單，共 {workOrderSummaries.length} 個
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                清除篩選
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 工單列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            工單工時記錄
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="w-10 h-10 border-4 border-blue-200 rounded-full animate-spin"></div>
                <div className="absolute top-0 left-0 w-10 h-10 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <span className="mt-3 text-sm text-gray-600 font-medium">載入中...</span>
            </div>
          ) : filteredSummaries.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? '找不到符合條件的工單記錄'
                  : '尚無工時記錄'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSummaries.map((order) => (
                <Card key={order.workOrderId} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg">
                          <Factory className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{order.workOrderNumber}</h3>
                          <p className="text-sm text-gray-600">{order.productName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={order.status === 'completed' ? 'default' : 'secondary'}
                          className={order.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                          }
                        >
                          {order.status === 'completed' ? '已完成' : '進行中'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(order.workOrderId)}
                        >
                          {expandedOrders.has(order.workOrderId) ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          }
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">總工時</p>
                          <p className="font-semibold">{formatDuration(order.totalHours)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">加班時間</p>
                          <p className="font-semibold">{formatDuration(order.totalOvertime)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">參與人員</p>
                          <p className="font-semibold">{order.personnelCount} 位</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">記錄數量</p>
                          <p className="font-semibold">{order.timeEntries.length} 筆</p>
                        </div>
                      </div>
                    </div>
                    
                    {expandedOrders.has(order.workOrderId) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead className="font-semibold">人員</TableHead>
                                <TableHead className="font-semibold">開始時間</TableHead>
                                <TableHead className="font-semibold">結束時間</TableHead>
                                <TableHead className="font-semibold">工時</TableHead>
                                <TableHead className="font-semibold">加班</TableHead>
                                <TableHead className="font-semibold">備註</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {order.timeEntries.map((entry) => (
                                <TableRow key={entry.id} className="hover:bg-gray-50">
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-gray-400" />
                                      <span className="font-medium">{entry.personnelName}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {formatDateTime(entry.startDate, entry.startTime)}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {formatDateTime(entry.endDate, entry.endTime)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-blue-50">
                                      {formatDuration(entry.duration)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {entry.overtimeHours && entry.overtimeHours > 0 ? (
                                      <Badge variant="destructive" className="bg-orange-50 text-orange-700">
                                        {formatDuration(entry.overtimeHours)}
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                                    {entry.notes || '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 詳細檢視對話框 */}
      {selectedOrder && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                工單詳細工時 - {selectedOrder.workOrderNumber}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* 工單基本資訊 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">工單資訊</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">工單編號</label>
                      <p className="text-lg font-semibold">{selectedOrder.workOrderNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">產品名稱</label>
                      <p className="text-lg font-semibold">{selectedOrder.productName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">總工時</label>
                      <p className="text-lg font-semibold text-blue-600">{formatDuration(selectedOrder.totalHours)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">參與人員</label>
                      <p className="text-lg font-semibold text-green-600">{selectedOrder.personnelCount} 位</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 詳細工時記錄 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">詳細工時記錄</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>人員姓名</TableHead>
                        <TableHead>開始時間</TableHead>
                        <TableHead>結束時間</TableHead>
                        <TableHead>工作時數</TableHead>
                        <TableHead>加班時數</TableHead>
                        <TableHead>備註</TableHead>
                        <TableHead>記錄時間</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.timeEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{entry.personnelName}</TableCell>
                          <TableCell>{formatDateTime(entry.startDate, entry.startTime)}</TableCell>
                          <TableCell>{formatDateTime(entry.endDate, entry.endTime)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50">
                              {formatDuration(entry.duration)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {entry.overtimeHours && entry.overtimeHours > 0 ? (
                              <Badge variant="destructive" className="bg-orange-50 text-orange-700">
                                {formatDuration(entry.overtimeHours)}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">無</span>
                            )}
                          </TableCell>
                          <TableCell>{entry.notes || '-'}</TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {entry.createdAt?.toDate?.()?.toLocaleDateString() || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}