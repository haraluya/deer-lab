'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import {
  Clock, User, Calendar, Download, Printer, Filter,
  ChevronDown, BarChart3, FileText, Users, TrendingUp
} from 'lucide-react';
import * as XLSX from 'xlsx';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { StandardStatsCard, StandardStats } from '@/components/StandardStatsCard';

interface TimeRecordsReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TimeRecord {
  id: string;
  workOrderId: string;
  workOrderNumber: string;
  workOrderStatus?: string;
  personnelId: string;
  personnelName: string;
  startDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  createdAt?: any;
}

interface Personnel {
  id: string;
  name: string;
  employeeId: string;
}

interface WorkOrder {
  id: string;
  code: string;
  status: string;
  productSnapshot?: {
    name: string;
    seriesName?: string;
  };
}

interface ReportData {
  timeRecords: TimeRecord[];
  totalHours: number;
  totalRecords: number;
  uniquePersonnel: number;
  uniqueWorkOrders: number;
  personnelSummary: { [key: string]: { name: string; hours: number; records: number } };
  workOrderSummary: { [key: string]: { code: string; hours: number; records: number; productName?: string } };
}

export function TimeRecordsReportDialog({ open, onOpenChange }: TimeRecordsReportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // 篩選條件
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState('all');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // 載入基礎資料
  const loadBasicData = useCallback(async () => {
    if (!db) return;

    try {
      // 載入人員資料
      const personnelSnapshot = await getDocs(collection(db, 'users'));
      const personnelList = personnelSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || '未知',
        employeeId: doc.data().employeeId || doc.id
      }));
      setPersonnel(personnelList);

      // 載入工單資料
      const workOrdersSnapshot = await getDocs(collection(db, 'workOrders'));
      const workOrdersList = workOrdersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          code: data.code || '',
          status: data.status || '',
          productSnapshot: data.productSnapshot
        };
      });
      setWorkOrders(workOrdersList);
    } catch (error) {
      console.error('載入基礎資料失敗:', error);
      toast.error('載入資料失敗');
    }
  }, []);

  // 載入工時記錄
  const loadTimeRecords = useCallback(async () => {
    if (!db) return;

    setLoading(true);
    try {
      // 建構查詢條件
      let constraints: any[] = [];

      // 日期篩選
      if (startDate) {
        constraints.push(where('startDate', '>=', startDate));
      }
      if (endDate) {
        constraints.push(where('startDate', '<=', endDate));
      }

      // 人員篩選
      if (selectedPersonnel !== 'all') {
        constraints.push(where('personnelId', '==', selectedPersonnel));
      }

      // 工單篩選
      if (selectedWorkOrder !== 'all') {
        constraints.push(where('workOrderId', '==', selectedWorkOrder));
      }

      // 建立查詢
      const timeEntriesQuery = constraints.length > 0
        ? query(collection(db, 'timeEntries'), ...constraints, orderBy('startDate', 'desc'))
        : query(collection(db, 'timeEntries'), orderBy('startDate', 'desc'));

      const snapshot = await getDocs(timeEntriesQuery);
      const timeRecords = snapshot.docs.map(doc => {
        const data = doc.data();
        const workOrder = workOrders.find(wo => wo.id === data.workOrderId);

        return {
          id: doc.id,
          workOrderId: data.workOrderId || '',
          workOrderNumber: data.workOrderNumber || workOrder?.code || '',
          workOrderStatus: workOrder?.status,
          personnelId: data.personnelId || '',
          personnelName: data.personnelName || '',
          startDate: data.startDate || '',
          startTime: data.startTime || '',
          endTime: data.endTime || '',
          duration: data.duration || 0,
          createdAt: data.createdAt
        };
      });

      // 狀態篩選（在客戶端處理）
      let filteredRecords = timeRecords;
      if (selectedStatus !== 'all') {
        filteredRecords = timeRecords.filter(record =>
          record.workOrderStatus === selectedStatus
        );
      }

      // 計算統計資料
      const totalHours = filteredRecords.reduce((sum, record) => sum + record.duration, 0);
      const totalRecords = filteredRecords.length;

      // 人員統計
      const personnelSummary: { [key: string]: { name: string; hours: number; records: number } } = {};
      filteredRecords.forEach(record => {
        if (!personnelSummary[record.personnelId]) {
          personnelSummary[record.personnelId] = {
            name: record.personnelName,
            hours: 0,
            records: 0
          };
        }
        personnelSummary[record.personnelId].hours += record.duration;
        personnelSummary[record.personnelId].records += 1;
      });

      // 工單統計
      const workOrderSummary: { [key: string]: { code: string; hours: number; records: number; productName?: string } } = {};
      filteredRecords.forEach(record => {
        if (!workOrderSummary[record.workOrderId]) {
          const workOrder = workOrders.find(wo => wo.id === record.workOrderId);
          workOrderSummary[record.workOrderId] = {
            code: record.workOrderNumber,
            hours: 0,
            records: 0,
            productName: workOrder?.productSnapshot?.name
          };
        }
        workOrderSummary[record.workOrderId].hours += record.duration;
        workOrderSummary[record.workOrderId].records += 1;
      });

      setReportData({
        timeRecords: filteredRecords,
        totalHours,
        totalRecords,
        uniquePersonnel: Object.keys(personnelSummary).length,
        uniqueWorkOrders: Object.keys(workOrderSummary).length,
        personnelSummary,
        workOrderSummary
      });

    } catch (error) {
      console.error('載入工時記錄失敗:', error);
      toast.error('載入工時記錄失敗');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedPersonnel, selectedWorkOrder, selectedStatus, workOrders]);

  // 初始化載入
  useEffect(() => {
    if (open) {
      // 設定預設日期（本月）
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);

      loadBasicData();
    }
  }, [open, loadBasicData]);

  // 當篩選條件改變時重新載入
  useEffect(() => {
    if (open && workOrders.length > 0) {
      loadTimeRecords();
    }
  }, [open, loadTimeRecords, workOrders.length]);

  // 格式化時間
  const formatDuration = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}小時${minutes > 0 ? `${minutes}分鐘` : ''}`;
  };

  // 匯出 Excel
  const handleExportExcel = () => {
    if (!reportData) return;

    try {
      // 建立工作簿
      const wb = XLSX.utils.book_new();

      // 總覽資料
      const summaryData = [
        ['工時統計報表'],
        [''],
        ['報表期間', `${startDate || '開始'} 至 ${endDate || '結束'}`],
        ['總工時', formatDuration(reportData.totalHours)],
        ['總記錄數', reportData.totalRecords],
        ['參與人員', reportData.uniquePersonnel],
        ['涉及工單', reportData.uniqueWorkOrders],
        ['']
      ];

      // 詳細記錄
      const detailHeaders = ['工單編號', '產品名稱', '人員', '工作日期', '開始時間', '結束時間', '工時(小時)', '狀態'];
      const detailData = reportData.timeRecords.map(record => {
        const workOrder = workOrders.find(wo => wo.id === record.workOrderId);
        return [
          record.workOrderNumber,
          workOrder?.productSnapshot?.name || '',
          record.personnelName,
          record.startDate,
          record.startTime,
          record.endTime,
          record.duration.toFixed(2),
          record.workOrderStatus || ''
        ];
      });

      // 人員統計
      const personnelHeaders = ['人員姓名', '總工時(小時)', '記錄數'];
      const personnelData = Object.values(reportData.personnelSummary).map(person => [
        person.name,
        person.hours.toFixed(2),
        person.records
      ]);

      // 工單統計
      const workOrderHeaders = ['工單編號', '產品名稱', '總工時(小時)', '記錄數'];
      const workOrderData = Object.values(reportData.workOrderSummary).map(wo => [
        wo.code,
        wo.productName || '',
        wo.hours.toFixed(2),
        wo.records
      ]);

      // 建立工作表
      const wsSummary = XLSX.utils.aoa_to_sheet([
        ...summaryData,
        [],
        detailHeaders,
        ...detailData
      ]);
      const wsPersonnel = XLSX.utils.aoa_to_sheet([personnelHeaders, ...personnelData]);
      const wsWorkOrder = XLSX.utils.aoa_to_sheet([workOrderHeaders, ...workOrderData]);

      // 加入工作表到工作簿
      XLSX.utils.book_append_sheet(wb, wsSummary, '詳細記錄');
      XLSX.utils.book_append_sheet(wb, wsPersonnel, '人員統計');
      XLSX.utils.book_append_sheet(wb, wsWorkOrder, '工單統計');

      // 產生檔案名稱
      const fileName = `工時報表_${startDate}_${endDate}.xlsx`;

      // 下載檔案
      XLSX.writeFile(wb, fileName);

      toast.success('報表匯出成功');
    } catch (error) {
      console.error('匯出失敗:', error);
      toast.error('匯出失敗');
    }
  };

  // 列印報表
  const handlePrint = () => {
    if (!reportData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('無法開啟列印視窗');
      return;
    }

    const printContent = generatePrintContent();
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // 產生列印內容
  const generatePrintContent = () => {
    if (!reportData) return '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>工時統計報表</title>
        <style>
          @media print {
            @page { size: A4; margin: 1cm; }
          }
          body { font-family: 'Microsoft JhengHei', Arial; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
          .summary-item { border: 1px solid #ddd; padding: 10px; text-align: center; }
          .summary-label { font-size: 12px; color: #666; }
          .summary-value { font-size: 18px; font-weight: bold; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f0f0f0; font-weight: bold; }
          .section-title { font-size: 18px; font-weight: bold; margin: 20px 0 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">工時統計報表</div>
          <div>報表期間：${startDate || '全部'} 至 ${endDate || '全部'}</div>
        </div>

        <div class="summary">
          <div class="summary-item">
            <div class="summary-label">總工時</div>
            <div class="summary-value">${formatDuration(reportData.totalHours)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">總記錄數</div>
            <div class="summary-value">${reportData.totalRecords}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">參與人員</div>
            <div class="summary-value">${reportData.uniquePersonnel}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">涉及工單</div>
            <div class="summary-value">${reportData.uniqueWorkOrders}</div>
          </div>
        </div>

        <div class="section-title">人員工時統計</div>
        <table>
          <thead>
            <tr>
              <th>人員姓名</th>
              <th>總工時</th>
              <th>記錄數</th>
            </tr>
          </thead>
          <tbody>
            ${Object.values(reportData.personnelSummary).map(person => `
              <tr>
                <td>${person.name}</td>
                <td>${formatDuration(person.hours)}</td>
                <td>${person.records}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">工單工時統計</div>
        <table>
          <thead>
            <tr>
              <th>工單編號</th>
              <th>產品名稱</th>
              <th>總工時</th>
              <th>記錄數</th>
            </tr>
          </thead>
          <tbody>
            ${Object.values(reportData.workOrderSummary).map(wo => `
              <tr>
                <td>${wo.code}</td>
                <td>${wo.productName || ''}</td>
                <td>${formatDuration(wo.hours)}</td>
                <td>${wo.records}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
  };

  // 統計卡片
  const statsCards: StandardStats[] = reportData ? [
    {
      title: '總工時',
      value: formatDuration(reportData.totalHours),
      subtitle: '累計工作時間',
      icon: <Clock className="h-4 w-4" />,
      color: 'blue'
    },
    {
      title: '工時記錄',
      value: reportData.totalRecords,
      subtitle: '筆記錄',
      icon: <FileText className="h-4 w-4" />,
      color: 'green'
    },
    {
      title: '參與人員',
      value: reportData.uniquePersonnel,
      subtitle: '位人員',
      icon: <Users className="h-4 w-4" />,
      color: 'purple'
    },
    {
      title: '涉及工單',
      value: reportData.uniqueWorkOrders,
      subtitle: '個工單',
      icon: <BarChart3 className="h-4 w-4" />,
      color: 'orange'
    }
  ] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="h-5 w-5" />
            工時統計報表
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 篩選條件 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                篩選條件
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>開始日期</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>結束日期</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>人員</Label>
                  <Select value={selectedPersonnel} onValueChange={setSelectedPersonnel}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇人員" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部人員</SelectItem>
                      {personnel.map(person => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name} ({person.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>工單</Label>
                  <Select value={selectedWorkOrder} onValueChange={setSelectedWorkOrder}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇工單" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部工單</SelectItem>
                      {workOrders.map(wo => (
                        <SelectItem key={wo.id} value={wo.id}>
                          {wo.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>工單狀態</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇狀態" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部狀態</SelectItem>
                      <SelectItem value="預報">預報</SelectItem>
                      <SelectItem value="進行">進行</SelectItem>
                      <SelectItem value="完工">完工</SelectItem>
                      <SelectItem value="入庫">入庫</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 統計資料 */}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : reportData ? (
            <>
              <StandardStatsCard stats={statsCards} />

              {/* 詳細資料標籤 */}
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="summary">總覽</TabsTrigger>
                  <TabsTrigger value="personnel">人員統計</TabsTrigger>
                  <TabsTrigger value="workorder">工單統計</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {reportData.timeRecords.map(record => {
                          const workOrder = workOrders.find(wo => wo.id === record.workOrderId);
                          return (
                            <div key={record.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <div className="font-medium">{record.workOrderNumber}</div>
                                <div className="text-sm text-gray-600">
                                  {workOrder?.productSnapshot?.name || '未知產品'}
                                </div>
                              </div>
                              <div className="text-sm text-gray-600">
                                {record.personnelName}
                              </div>
                              <div className="text-sm">
                                {record.startDate}
                              </div>
                              <Badge variant="outline">
                                {formatDuration(record.duration)}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="personnel" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        {Object.entries(reportData.personnelSummary)
                          .sort((a, b) => b[1].hours - a[1].hours)
                          .map(([id, data]) => (
                            <div key={id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div className="font-medium">{data.name}</div>
                              <div className="flex gap-4">
                                <Badge variant="outline" className="bg-blue-50">
                                  {formatDuration(data.hours)}
                                </Badge>
                                <Badge variant="outline" className="bg-green-50">
                                  {data.records} 筆記錄
                                </Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="workorder" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        {Object.entries(reportData.workOrderSummary)
                          .sort((a, b) => b[1].hours - a[1].hours)
                          .map(([id, data]) => (
                            <div key={id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div>
                                <div className="font-medium">{data.code}</div>
                                <div className="text-sm text-gray-600">{data.productName || '未知產品'}</div>
                              </div>
                              <div className="flex gap-4">
                                <Badge variant="outline" className="bg-blue-50">
                                  {formatDuration(data.hours)}
                                </Badge>
                                <Badge variant="outline" className="bg-green-50">
                                  {data.records} 筆記錄
                                </Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              關閉
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={!reportData || loading}
            >
              <Printer className="mr-2 h-4 w-4" />
              列印
            </Button>
            <Button
              onClick={handleExportExcel}
              disabled={!reportData || loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="mr-2 h-4 w-4" />
              匯出 Excel
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}