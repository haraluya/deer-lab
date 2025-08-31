// src/app/dashboard/time-reports/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, where, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { TimeEntry as TimeEntryType } from '@/types';
import { 
  Clock, Users, Factory, Calendar, Filter, Search, 
  ChevronDown, ChevronUp, FileText, BarChart3, TrendingUp,
  Activity, Timer, AlertCircle, CheckCircle, Eye
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// 擴展 TimeEntry 類型以適應此頁面
interface LocalTimeEntry extends TimeEntryType {
  workOrderNumber: string;
  overtimeHours?: number;
  status?: 'draft' | 'confirmed' | 'locked';
}

interface WorkOrderSummary {
  workOrderId: string;
  workOrderNumber: string;
  productName?: string;
  totalHours: number;
  totalOvertime: number;
  personnelCount: number;
  timeEntries: LocalTimeEntry[];
  status: string;
  completedAt?: Timestamp;
}

interface TimeReportStats {
  totalWorkOrders: number;
  totalHours: number;
  totalOvertime: number;
  activePersonnel: number;
  avgHoursPerOrder: number;
}

export default function TimeReportsPage() {
  const [workOrderSummaries, setWorkOrderSummaries] = useState<WorkOrderSummary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<WorkOrderSummary[]>([]);
  const [stats, setStats] = useState<TimeReportStats>({
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
    loadTimeReports();
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

  const loadTimeReports = async () => {
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
      })) as LocalTimeEntry[];

      // 載入工單資訊
      const workOrderIds = [...new Set(timeEntries.map(entry => entry.workOrderId))];
      const workOrdersData: { [key: string]: { number: string; productName?: string; status: string } } = {};

      await Promise.all(workOrderIds.map(async (workOrderId) => {
        try {
          if (!db) return;
          const workOrderDoc = await getDoc(doc(db, 'workOrders', workOrderId));
          if (workOrderDoc.exists()) {
            const data = workOrderDoc.data();
            workOrdersData[workOrderId] = {
              number: data.code || workOrderId,
              productName: data.productSnapshot?.name,
              status: data.status || '未知'
            };
          } else {
            workOrdersData[workOrderId] = {
              number: workOrderId,
              status: '已刪除'
            };
          }
        } catch (error) {
          console.error(`載入工單 ${workOrderId} 失敗:`, error);
          workOrdersData[workOrderId] = {
            number: workOrderId,
            status: '載入失敗'
          };
        }
      }));

      // 按工單分組
      const orderGroups: { [key: string]: WorkOrderSummary } = {};
      
      timeEntries.forEach(entry => {
        const workOrderInfo = workOrdersData[entry.workOrderId];
        
        if (!orderGroups[entry.workOrderId]) {
          orderGroups[entry.workOrderId] = {
            workOrderId: entry.workOrderId,
            workOrderNumber: workOrderInfo?.number || entry.workOrderNumber || entry.workOrderId,
            productName: workOrderInfo?.productName,
            totalHours: 0,
            totalOvertime: 0,
            personnelCount: 0,
            timeEntries: [],
            status: workOrderInfo?.status || '未知'
          };
        }

        orderGroups[entry.workOrderId].timeEntries.push(entry);
        orderGroups[entry.workOrderId].totalHours += entry.duration;
        orderGroups[entry.workOrderId].totalOvertime += entry.overtimeHours || 0;
      });

      // 計算人員數量
      Object.values(orderGroups).forEach(order => {
        const uniquePersonnel = new Set(order.timeEntries.map(entry => entry.personnelId));
        order.personnelCount = uniquePersonnel.size;
      });

      const summaries = Object.values(orderGroups).sort((a, b) => 
        b.workOrderNumber.localeCompare(a.workOrderNumber)
      );

      setWorkOrderSummaries(summaries);

      // 計算統計資料
      calculateStats(summaries, timeEntries);

    } catch (error) {
      console.error('載入工時報表失敗:', error);
      toast.error('載入工時報表失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (summaries: WorkOrderSummary[], entries: LocalTimeEntry[]) => {
    const totalHours = summaries.reduce((sum, order) => sum + order.totalHours, 0);
    const totalOvertime = summaries.reduce((sum, order) => sum + order.totalOvertime, 0);
    const allPersonnel = new Set(entries.map(entry => entry.personnelId));

    setStats({
      totalWorkOrders: summaries.length,
      totalHours,
      totalOvertime,
      activePersonnel: allPersonnel.size,
      avgHoursPerOrder: summaries.length > 0 ? totalHours / summaries.length : 0
    });
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

  const openDetailDialog = (order: WorkOrderSummary) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const formatDuration = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}小時${minutes > 0 ? `${minutes}分鐘` : ''}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '預報': return 'bg-orange-100 text-orange-800';
      case '進行': return 'bg-blue-100 text-blue-800';
      case '完工': return 'bg-green-100 text-green-800';
      case '入庫': return 'bg-purple-100 text-purple-800';
      case '已刪除': return 'bg-gray-100 text-gray-800';
      case '載入失敗': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            工時報表
          </h1>
          <p className="text-gray-600 mt-1">
            所有工單的工時申報記錄統計分析
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          最後更新：{new Date().toLocaleTimeString('zh-TW')}
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-blue-800">總工單數</CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg">
                <Factory className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mb-2" />
            ) : (
              <div className="text-3xl font-bold text-blue-900 mb-1">{stats.totalWorkOrders}</div>
            )}
            <p className="text-xs text-blue-600 font-medium">個工單項目</p>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-600/10 pointer-events-none" />
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-100 border-2 border-emerald-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-emerald-800">總工時</CardTitle>
              <div className="p-2 bg-emerald-500 rounded-lg">
                <Clock className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24 mb-2" />
            ) : (
              <div className="text-3xl font-bold text-emerald-900 mb-1">{formatDuration(stats.totalHours)}</div>
            )}
            <p className="text-xs text-emerald-600 font-medium">全部工單總計</p>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-emerald-600/10 pointer-events-none" />
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-100 border-2 border-orange-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-orange-800">加班時數</CardTitle>
              <div className="p-2 bg-orange-500 rounded-lg">
                <AlertCircle className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mb-2" />
            ) : (
              <div className="text-3xl font-bold text-orange-900 mb-1">{formatDuration(stats.totalOvertime)}</div>
            )}
            <p className="text-xs text-orange-600 font-medium">總加班時間</p>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-orange-600/10 pointer-events-none" />
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-violet-100 border-2 border-purple-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-purple-800">活躍人員</CardTitle>
              <div className="p-2 bg-purple-500 rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12 mb-2" />
            ) : (
              <div className="text-3xl font-bold text-purple-900 mb-1">{stats.activePersonnel}</div>
            )}
            <p className="text-xs text-purple-600 font-medium">參與工時申報</p>
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
              <div className="text-3xl font-bold text-pink-900 mb-1">{formatDuration(stats.avgHoursPerOrder)}</div>
            )}
            <p className="text-xs text-pink-600 font-medium">每工單平均</p>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-pink-600/10 pointer-events-none" />
        </Card>
      </div>

      {/* 搜尋和篩選 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜尋工單號碼、產品名稱或人員姓名..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="篩選狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="預報">預報</SelectItem>
                <SelectItem value="進行">進行中</SelectItem>
                <SelectItem value="完工">完工</SelectItem>
                <SelectItem value="入庫">已入庫</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 工單工時列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            工單工時統計
          </CardTitle>
          <p className="text-sm text-gray-600">
            共 {filteredSummaries.length} 個工單，{filteredSummaries.reduce((sum, order) => sum + order.timeEntries.length, 0)} 筆工時記錄
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredSummaries.length === 0 ? (
            <div className="text-center py-12">
              <Factory className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">尚無工時記錄</p>
              <p className="text-sm text-gray-400 mt-1">工單開始申報工時後，統計將會顯示在這裡</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 桌面版表格 */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-blue-600 to-indigo-600">
                      <TableHead className="text-white font-bold">工單號碼</TableHead>
                      <TableHead className="text-white font-bold">產品名稱</TableHead>
                      <TableHead className="text-white font-bold">總工時</TableHead>
                      <TableHead className="text-white font-bold">加班時數</TableHead>
                      <TableHead className="text-white font-bold">參與人數</TableHead>
                      <TableHead className="text-white font-bold">狀態</TableHead>
                      <TableHead className="text-white font-bold text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSummaries.map((order) => (
                      <TableRow key={order.workOrderId} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium text-blue-600">
                            {order.workOrderNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {order.productName || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {formatDuration(order.totalHours)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.totalOvertime > 0 ? (
                            <Badge variant="destructive" className="bg-red-50 text-red-700">
                              {formatDuration(order.totalOvertime)}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{order.personnelCount} 人</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDetailDialog(order)}
                              title="查看詳細工時記錄"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleExpanded(order.workOrderId)}
                            >
                              {expandedOrders.has(order.workOrderId) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 手機版卡片 */}
              <div className="md:hidden space-y-3">
                {filteredSummaries.map((order) => (
                  <Card key={order.workOrderId} className="overflow-hidden">
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleExpanded(order.workOrderId)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-blue-600">
                          {order.workOrderNumber}
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {order.productName || '未指定產品'}
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {formatDuration(order.totalHours)}
                          </Badge>
                          {order.totalOvertime > 0 && (
                            <Badge variant="destructive" className="bg-red-50 text-red-700">
                              加班 {formatDuration(order.totalOvertime)}
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {order.personnelCount} 人參與
                          </Badge>
                        </div>
                        {expandedOrders.has(order.workOrderId) ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    
                    {expandedOrders.has(order.workOrderId) && (
                      <div className="border-t bg-gray-50 p-4">
                        <div className="text-sm font-medium mb-2">工時記錄明細</div>
                        <div className="space-y-2">
                          {order.timeEntries.slice(0, 3).map((entry) => (
                            <div key={entry.id} className="flex justify-between text-sm">
                              <span>{entry.personnelName}</span>
                              <span>{formatDate(entry.startDate)} - {formatDuration(entry.duration)}</span>
                            </div>
                          ))}
                          {order.timeEntries.length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
                              還有 {order.timeEntries.length - 3} 筆記錄...
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailDialog(order);
                          }}
                          className="w-full mt-3"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          查看完整記錄
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 詳細記錄對話框 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedOrder?.workOrderNumber} - 工時記錄詳情
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* 工單基本信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">工單資訊</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">工單號碼</div>
                      <div className="font-medium">{selectedOrder.workOrderNumber}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">產品名稱</div>
                      <div className="font-medium">{selectedOrder.productName || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">總工時</div>
                      <div className="font-medium">{formatDuration(selectedOrder.totalHours)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">參與人數</div>
                      <div className="font-medium">{selectedOrder.personnelCount} 人</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 工時記錄列表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">工時記錄明細</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedOrder.timeEntries.map((entry) => (
                      <div key={entry.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium">{entry.personnelName}</div>
                          <Badge variant={entry.status === 'locked' ? 'secondary' : 'default'}>
                            {entry.status === 'locked' ? '已鎖定' : '正常'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">工作日期：</span>
                            <span>{formatDate(entry.startDate)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">工作時間：</span>
                            <span>{entry.startTime} - {entry.endTime}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">總工時：</span>
                            <span className="font-medium text-green-600">{formatDuration(entry.duration)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">加班：</span>
                            <span className="font-medium text-orange-600">
                              {entry.overtimeHours && entry.overtimeHours > 0 ? formatDuration(entry.overtimeHours) : '-'}
                            </span>
                          </div>
                        </div>
                        {entry.notes && (
                          <div className="mt-2 text-sm">
                            <span className="text-gray-600">備註：</span>
                            <span className="ml-2">{entry.notes}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}