'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, orderBy, updateDoc, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TimeEntry } from '@/types';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/context/AuthContext';
import { StandardDataListPage, StandardColumn, StandardAction, QuickFilter } from '@/components/StandardDataListPage';
import { StandardStats } from '@/components/StandardStatsCard';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import {
  Clock, Users, Factory, TrendingUp, Calendar, CheckCircle2, AlertCircle,
  FileSpreadsheet, Filter, ChevronDown, Eye, ExternalLink, DollarSign,
  UserCheck, CalendarCheck, X, Check, FileBarChart, ClipboardList, Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// 擴展的工時記錄類型（包含工單狀態）
interface TimeEntryExtended extends TimeEntry {
  workOrderStatus?: string;
}

// 人員統計資訊
interface PersonnelSummary {
  id: string;
  name: string;
  totalHours: number;
  recordCount: number;
  settledCount: number;
  unsettledCount: number;
}

export default function TimeManagementPage() {
  const router = useRouter();
  const { appUser } = useAuth();
  const { hasPermission } = usePermission();

  // 權限檢查
  const canSettle = hasPermission('admin.full');

  // 狀態管理
  const [timeRecords, setTimeRecords] = useState<TimeEntryExtended[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<TimeEntryExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [stocktakeMode] = useState(false);
  const [stocktakeUpdates] = useState<Record<string, number>>({});

  // 全選功能
  const isAllSelected = useMemo(() => {
    return filteredRecords.length > 0 && selectedRecords.length === filteredRecords.length;
  }, [filteredRecords, selectedRecords]);

  const isPartiallySelected = useMemo(() => {
    return selectedRecords.length > 0 && selectedRecords.length < filteredRecords.length;
  }, [filteredRecords, selectedRecords]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredRecords.map(record => record.id));
    }
  };

  // 日期篩選
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateFilter, setDateFilter] = useState<'thisMonth' | 'lastMonth' | 'oneMonth' | 'custom'>('oneMonth');

  // 人員篩選
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
  const [personnelList, setPersonnelList] = useState<{ id: string; name: string }[]>([]);

  // 快速篩選狀態
  const [quickFilters, setQuickFilters] = useState<{
    settled?: boolean;
  }>({});

  // 結算對話框
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [settlementSummary, setSettlementSummary] = useState<PersonnelSummary[]>([]);

  // 初始化日期（預設一個月）
  useEffect(() => {
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    if (dateFilter === 'thisMonth') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (dateFilter === 'lastMonth') {
      const lastMonth = subMonths(now, 1);
      setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
    } else if (dateFilter === 'oneMonth') {
      setStartDate(format(oneMonthAgo, 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    }
  }, [dateFilter]);

  // 初始化設定為一個月
  useEffect(() => {
    setDateFilter('oneMonth');
  }, []);

  // 載入工時記錄
  const loadTimeRecords = useCallback(async () => {
    if (!db) return;

    setIsLoading(true);
    try {
      // 建立查詢條件
      const constraints: any[] = [orderBy('startDate', 'desc')];

      // 只載入完工狀態的工時
      if (startDate) {
        constraints.push(where('startDate', '>=', startDate));
      }
      if (endDate) {
        constraints.push(where('startDate', '<=', endDate));
      }

      // 查詢工時記錄
      const timeEntriesQuery = query(collection(db, 'timeEntries'), ...constraints);
      const snapshot = await getDocs(timeEntriesQuery);

      // 載入工單資訊以獲取狀態和產品資訊
      const workOrderIds = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.workOrderId) workOrderIds.add(data.workOrderId);
      });

      const workOrderInfo = new Map<string, {
        status: string;
        productName?: string;
        seriesName?: string;
      }>();

      await Promise.all(
        Array.from(workOrderIds).map(async (workOrderId) => {
          try {
            if (!db) return;
            const workOrderDoc = await getDocs(query(
              collection(db, 'workOrders'),
              where('__name__', '==', workOrderId)
            ));
            if (!workOrderDoc.empty) {
              const data = workOrderDoc.docs[0].data();

              // 獲取產品系列名稱
              let seriesName = '';
              if (data.productSnapshot?.seriesRef?.id) {
                try {
                  if (!db) return;
                  const seriesDoc = await getDocs(query(
                    collection(db, 'productSeries'),
                    where('__name__', '==', data.productSnapshot.seriesRef.id)
                  ));
                  if (!seriesDoc.empty) {
                    seriesName = seriesDoc.docs[0].data().name || '';
                  }
                } catch (error) {
                  console.error(`載入產品系列 ${data.productSnapshot.seriesRef.id} 失敗:`, error);
                }
              }

              workOrderInfo.set(workOrderId, {
                status: data.status || '未知',
                productName: data.productSnapshot?.name,
                seriesName
              });
            }
          } catch (error) {
            console.error(`載入工單 ${workOrderId} 失敗:`, error);
          }
        })
      );

      // 處理資料
      const records: TimeEntryExtended[] = snapshot.docs
        .map(doc => {
          const data = doc.data();
          const orderInfo = workOrderInfo.get(data.workOrderId);

          // 組合產品名稱（系列名 + 產品名）
          let fullProductName = data.productName || orderInfo?.productName || '';
          if (orderInfo?.seriesName && fullProductName) {
            fullProductName = `${orderInfo.seriesName} - ${fullProductName}`;
          } else if (orderInfo?.seriesName) {
            fullProductName = orderInfo.seriesName;
          }

          return {
            id: doc.id,
            ...data,
            workOrderStatus: orderInfo?.status || '未知',
            productName: fullProductName,
            isSettled: data.isSettled || false, // 確保有預設值
            createdAt: data.createdAt || Timestamp.now(),
            updatedAt: data.updatedAt || Timestamp.now()
          } as TimeEntryExtended;
        })
        // 只顯示完工狀態的工時
        .filter(record => record.workOrderStatus === '完工' || record.workOrderStatus === '入庫');

      setTimeRecords(records);

      // 提取人員清單
      const personnel = new Map<string, string>();
      records.forEach(record => {
        if (record.personnelId && record.personnelName) {
          personnel.set(record.personnelId, record.personnelName);
        }
      });

      setPersonnelList(Array.from(personnel.entries()).map(([id, name]) => ({ id, name })));

    } catch (error) {
      console.error('載入工時記錄失敗:', error);
      toast.error('載入工時記錄失敗');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  // 載入資料
  useEffect(() => {
    loadTimeRecords();
  }, [loadTimeRecords]);

  // 篩選記錄
  useEffect(() => {
    let filtered = [...timeRecords];

    // 人員篩選
    if (selectedPersonnel.length > 0) {
      filtered = filtered.filter(record => selectedPersonnel.includes(record.personnelId));
    }

    // 快速篩選
    if (quickFilters.settled !== undefined) {
      filtered = filtered.filter(record => record.isSettled === quickFilters.settled);
    }

    // 搜尋篩選
    if (searchValue) {
      const search = searchValue.toLowerCase();
      filtered = filtered.filter(record =>
        record.personnelName?.toLowerCase().includes(search) ||
        record.workOrderNumber?.toLowerCase().includes(search) ||
        record.productName?.toLowerCase().includes(search)
      );
    }

    setFilteredRecords(filtered);
  }, [timeRecords, selectedPersonnel, searchValue, quickFilters]);

  // 計算統計資料
  const stats = useMemo(() => {
    const totalHours = filteredRecords.reduce((sum, record) => sum + (record.duration || 0), 0);
    const uniquePersonnel = new Set(filteredRecords.map(r => r.personnelId)).size;
    const uniqueWorkOrders = new Set(filteredRecords.map(r => r.workOrderId)).size;
    const avgHoursPerOrder = uniqueWorkOrders > 0 ? totalHours / uniqueWorkOrders : 0;

    return {
      totalHours,
      uniquePersonnel,
      uniqueWorkOrders,
      avgHoursPerOrder
    };
  }, [filteredRecords]);

  // 格式化時間
  const formatDuration = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}小時${minutes > 0 ? `${minutes}分鐘` : ''}`;
  };

  // 格式化日期並顯示星期
  const formatDateWithWeekday = (dateString: string) => {
    const date = new Date(dateString);
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[date.getDay()];
    return {
      date: dateString,
      weekday: `(${weekday})`
    };
  };

  // 開始結算
  const handleStartSettlement = () => {
    if (selectedRecords.length === 0) {
      toast.error('請選擇要結算的工時記錄');
      return;
    }

    // 計算人員統計
    const personnelMap = new Map<string, PersonnelSummary>();

    selectedRecords.forEach(recordId => {
      const record = filteredRecords.find(r => r.id === recordId);
      if (!record) return;

      const key = record.personnelId;
      if (!personnelMap.has(key)) {
        personnelMap.set(key, {
          id: key,
          name: record.personnelName || '未知',
          totalHours: 0,
          recordCount: 0,
          settledCount: 0,
          unsettledCount: 0
        });
      }

      const summary = personnelMap.get(key)!;
      summary.totalHours += record.duration || 0;
      summary.recordCount += 1;

      if (record.isSettled) {
        summary.settledCount += 1;
      } else {
        summary.unsettledCount += 1;
      }
    });

    setSettlementSummary(Array.from(personnelMap.values()));
    setShowSettlementDialog(true);
  };

  // 切換單個工時記錄的結算狀態
  const handleToggleSettlement = async (record: TimeEntryExtended) => {
    if (!db || !appUser || !canSettle) return;

    try {
      const docRef = doc(db, 'timeEntries', record.id);
      const now = Timestamp.now();

      if (record.isSettled) {
        // 取消結算
        await updateDoc(docRef, {
          isSettled: false,
          settledAt: null,
          settledBy: null,
          settledByName: null,
          settlementBatch: null,
          updatedAt: now
        });
        toast.success('已取消結算');
      } else {
        // 確認結算
        const settlementBatch = `SINGLE-${Date.now()}`;
        await updateDoc(docRef, {
          isSettled: true,
          settledAt: now,
          settledBy: appUser.uid,
          settledByName: appUser.name || '系統管理員',
          settlementBatch,
          updatedAt: now
        });
        toast.success('已確認結算');
      }

      // 重新載入資料
      loadTimeRecords();
      setShowSettlementEditDialog(false);
    } catch (error) {
      console.error('切換結算狀態失敗:', error);
      toast.error('操作失敗，請稍後再試');
    }
  };

  // 確認結算
  const handleConfirmSettlement = async () => {
    if (!db || !appUser) return;

    try {
      const batch = writeBatch(db);
      const settlementBatch = `BATCH-${Date.now()}`;
      const now = Timestamp.now();

      selectedRecords.forEach(recordId => {
        const record = filteredRecords.find(r => r.id === recordId);
        if (record && !record.isSettled && db) {
          const docRef = doc(db, 'timeEntries', recordId);
          batch.update(docRef, {
            isSettled: true,
            settledAt: now,
            settledBy: appUser.uid,
            settledByName: appUser.name || '系統管理員',
            settlementBatch,
            updatedAt: now
          });
        }
      });

      await batch.commit();

      toast.success(`成功結算 ${selectedRecords.length} 筆工時記錄`);
      setShowSettlementDialog(false);
      setSelectedRecords([]);
      loadTimeRecords();

    } catch (error) {
      console.error('結算失敗:', error);
      toast.error('結算失敗，請稍後再試');
    }
  };

  // 匯出Excel（支援班表格式）
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      toast.error('沒有資料可以匯出');
      return;
    }

    try {
      // 準備明細資料
      const exportData = filteredRecords.map(record => {
        const { date, weekday } = formatDateWithWeekday(record.startDate);
        return {
          '工作日期': `${date} ${weekday}`,
          '人員名稱': record.personnelName,
          '工單號碼': record.workOrderNumber || record.workOrderCode || '',
          '產品名稱': record.productName || '',
          '開始時間': record.startTime,
          '結束時間': record.endTime,
          '總工時(小時)': record.duration?.toFixed(2) || '0',
          '結算狀態': record.isSettled ? '已結算' : '未結算',
          '結算時間': record.isSettled && record.settledAt
            ? format(record.settledAt.toDate(), 'yyyy-MM-dd HH:mm')
            : ''
        };
      });

      // 建立班表格式資料（按人員分組，按日期排列）
      const scheduleData: any[] = [];
      const personnelGroup = new Map<string, TimeEntryExtended[]>();

      // 按人員分組
      filteredRecords.forEach(record => {
        if (!personnelGroup.has(record.personnelId)) {
          personnelGroup.set(record.personnelId, []);
        }
        personnelGroup.get(record.personnelId)!.push(record);
      });

      // 建立班表標題
      scheduleData.push(['班表 - 工時記錄']);
      scheduleData.push(['期間', `${startDate} 至 ${endDate}`]);
      scheduleData.push([]);

      // 為每個人員建立班表
      personnelGroup.forEach((records, personnelId) => {
        const personnelName = records[0]?.personnelName || '未知';
        const sortedRecords = records.sort((a, b) => a.startDate.localeCompare(b.startDate));

        scheduleData.push([`${personnelName} 班表`]);
        scheduleData.push(['日期', '星期', '開始時間', '結束時間', '工時', '工單', '產品', '狀態']);

        let totalHours = 0;
        sortedRecords.forEach(record => {
          const { date, weekday } = formatDateWithWeekday(record.startDate);
          totalHours += record.duration || 0;

          scheduleData.push([
            date,
            weekday,
            record.startTime,
            record.endTime,
            `${record.duration?.toFixed(2) || '0'}小時`,
            record.workOrderNumber || '',
            record.productName || '',
            record.isSettled ? '已結算' : '待結算'
          ]);
        });

        scheduleData.push(['總計', '', '', '', `${totalHours.toFixed(2)}小時`, '', '', '']);
        scheduleData.push([]);
      });

      // 人員統計
      const personnelStats = new Map<string, { name: string; hours: number; count: number }>();
      filteredRecords.forEach(record => {
        const key = record.personnelId;
        if (!personnelStats.has(key)) {
          personnelStats.set(key, {
            name: record.personnelName || '未知',
            hours: 0,
            count: 0
          });
        }
        const stat = personnelStats.get(key)!;
        stat.hours += record.duration || 0;
        stat.count += 1;
      });

      const statsData = Array.from(personnelStats.values()).map(stat => ({
        '人員名稱': stat.name,
        '總工時(小時)': stat.hours.toFixed(2),
        '記錄筆數': stat.count,
        '平均工時': (stat.hours / stat.count).toFixed(2)
      }));

      // 建立工作簿
      const wb = XLSX.utils.book_new();

      // 加入工時明細表
      const ws1 = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws1, '工時明細');

      // 加入班表
      const ws2 = XLSX.utils.aoa_to_sheet(scheduleData);
      XLSX.utils.book_append_sheet(wb, ws2, '班表');

      // 加入人員統計表
      const ws3 = XLSX.utils.json_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, ws3, '人員統計');

      // 產生檔名
      const personnelPart = selectedPersonnel.length > 0
        ? `_${selectedPersonnel.map(id => personnelList.find(p => p.id === id)?.name).filter(Boolean).join('、')}`
        : '';
      const fileName = `工時記錄${personnelPart}_${startDate}_${endDate}.xlsx`;

      // 下載檔案
      XLSX.writeFile(wb, fileName);
      toast.success('匯出成功（包含班表格式）');

    } catch (error) {
      console.error('匯出失敗:', error);
      toast.error('匯出失敗');
    }
  };

  // 快速篩選標籤
  const quickFilterTags: QuickFilter[] = useMemo(() => {
    const filters: QuickFilter[] = [];

    // 不顯示日期篩選標籤，避免與篩選器重複

    // 不顯示結算狀態篩選標籤，避免與按鈕重複

    // 人員篩選
    selectedPersonnel.forEach(personnelId => {
      const personnel = personnelList.find(p => p.id === personnelId);
      if (personnel) {
        filters.push({
          key: `personnel-${personnelId}`,
          label: personnel.name,
          value: personnelId,
          color: 'orange'
        });
      }
    });

    return filters;
  }, [dateFilter, startDate, endDate, selectedPersonnel, personnelList, quickFilters]);

  // 移除快速篩選
  const handleRemoveQuickFilter = (filter: QuickFilter) => {
    if (filter.key === 'date') {
      setDateFilter('oneMonth');
    } else if (filter.key === 'settled') {
      setQuickFilters(prev => ({ ...prev, settled: undefined }));
    } else if (filter.key.startsWith('personnel-')) {
      const personnelId = filter.value;
      setSelectedPersonnel(prev => prev.filter(id => id !== personnelId));
    }
  };

  // 表格欄位定義
  const columns: StandardColumn<TimeEntryExtended>[] = [
    {
      key: 'select',
      title: '',
      render: (_, record) => (
        <div
          className="flex items-center justify-center w-full h-full cursor-pointer hover:bg-gray-50 rounded p-1"
          onClick={(e) => {
            e.stopPropagation();
            const checked = !selectedRecords.includes(record.id);
            if (checked) {
              setSelectedRecords(prev => [...prev, record.id]);
            } else {
              setSelectedRecords(prev => prev.filter(id => id !== record.id));
            }
          }}
        >
          <Checkbox
            checked={selectedRecords.includes(record.id)}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedRecords(prev => [...prev, record.id]);
              } else {
                setSelectedRecords(prev => prev.filter(id => id !== record.id));
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ),
      width: 50,
      fixed: 'left'
    },
    {
      key: 'startDate',
      title: '工作時間',
      sortable: true,
      render: (_, record) => {
        const { date, weekday } = formatDateWithWeekday(record.startDate);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="font-medium">{date}</span>
              <span className="text-blue-600 font-medium">{weekday}</span>
            </div>
            <div className="text-sm text-blue-500">
              {record.startTime} - {record.endTime}
            </div>
          </div>
        );
      },
      priority: 5
    },
    {
      key: 'personnelName',
      title: '人員名稱',
      sortable: true,
      searchable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-base">{value}</span>
        </div>
      ),
      priority: 5
    },
    {
      key: 'duration',
      title: '總工時',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-green-600" />
          <span className="font-medium text-green-600">
            {formatDuration(value || 0)}
          </span>
        </div>
      ),
      priority: 4
    },
    {
      key: 'isSettled',
      title: '結算狀態',
      render: (value, record) => (
        <div className="flex items-center gap-2">
          <Badge
            variant={value ? 'default' : 'secondary'}
            className="cursor-pointer hover:bg-opacity-80 transition-all"
          >
            {value ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                已結算
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                待結算
              </>
            )}
          </Badge>
          {canSettle && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-blue-100"
              onClick={(e) => {
                e.stopPropagation();
                setEditingTimeEntry(record);
                setShowSettlementEditDialog(true);
              }}
            >
              <Edit className="h-3 w-3 text-blue-600" />
            </Button>
          )}
        </div>
      ),
      priority: 4
    },
    {
      key: 'workOrderNumber',
      title: '工單號碼',
      searchable: true,
      render: (value, record) => (
        <Button
          variant="link"
          size="sm"
          className="p-0 h-auto font-medium text-blue-600"
          onClick={() => router.push(`/dashboard/work-orders/${record.workOrderId}`)}
        >
          {value || record.workOrderCode || '未知'}
          <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      ),
      priority: 3
    },
    {
      key: 'productName',
      title: '產品名稱',
      searchable: true,
      render: (value, record) => {
        // 解析產品名稱和系列名稱
        const fullProductName = value || '';
        let productName = fullProductName;
        let seriesName = '';

        // 如果包含 " - "，分割系列名和產品名
        if (fullProductName.includes(' - ')) {
          const parts = fullProductName.split(' - ');
          seriesName = parts[0];
          productName = parts.slice(1).join(' - ');
        }

        return (
          <div className="space-y-1">
            <div className="font-medium text-gray-900">
              {productName || '未知產品'}
            </div>
            {seriesName && (
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full inline-block">
                {seriesName}
              </div>
            )}
          </div>
        );
      },
      priority: 2
    },
  ];

  // 工時詳情對話框狀態
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = useState<TimeEntryExtended | null>(null);

  // 結算編輯對話框狀態
  const [showSettlementEditDialog, setShowSettlementEditDialog] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntryExtended | null>(null);

  // 操作按鈕（移除，改為整列點擊）
  const actions: StandardAction<TimeEntryExtended>[] = [];

  // 統計卡片
  const statsCards: StandardStats[] = [
    {
      title: '本月總工時',
      value: formatDuration(stats.totalHours),
      subtitle: '累計工作時間',
      icon: <Clock className="h-4 w-4" />,
      color: 'blue'
    },
    {
      title: '本月參與人數',
      value: stats.uniquePersonnel,
      subtitle: '參與工時申報',
      icon: <Users className="h-4 w-4" />,
      color: 'green'
    },
    {
      title: '本月總工單',
      value: stats.uniqueWorkOrders,
      subtitle: '涉及工單數量',
      icon: <Factory className="h-4 w-4" />,
      color: 'orange'
    },
    {
      title: '平均工時',
      value: formatDuration(stats.avgHoursPerOrder),
      subtitle: '每工單平均',
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'purple'
    }
  ];

  return (
    <div className="container mx-auto">
      {/* 頁面標題 - 統一設計樣式 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            工時報表
          </h1>
          <p className="text-gray-600 mt-2">工時申報記錄管理與結算</p>
        </div>
        <div className="flex items-center gap-2">
          <FileBarChart className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      <StandardDataListPage<TimeEntryExtended>
        data={filteredRecords}
        columns={columns}
        actions={actions}
        stats={statsCards}
        quickFilters={quickFilterTags}
        searchable={false}
        loading={isLoading}
        selectable={false}
        viewModes={[]}
        defaultViewMode="table"
        onRowClick={(record) => {
          setSelectedTimeEntry(record);
          setShowDetailDialog(true);
        }}
        cardClassName="hover:shadow-lg transition-shadow"
        renderCard={(record) => (
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-lg">{record.personnelName}</div>
                    <div className="text-sm text-gray-500">{record.startDate}</div>
                  </div>
                  <Badge variant={record.isSettled ? 'default' : 'secondary'}>
                    {record.isSettled ? '已結算' : '待結算'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">工時：</span>
                    <span className="font-medium ml-1">{formatDuration(record.duration || 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">時間：</span>
                    <span className="ml-1">{record.startTime} - {record.endTime}</span>
                  </div>
                </div>
                {record.workOrderNumber && (
                  <div className="pt-2 border-t">
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-sm"
                      onClick={() => router.push(`/dashboard/work-orders/${record.workOrderId}`)}
                    >
                      工單：{record.workOrderNumber}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        renderToolbarExtra={() => (
          <div className="space-y-4 mb-4">
            {/* 日期範圍和人員篩選 - 同一排 */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg border">
              {/* 日期篩選 */}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-blue-600" />
                <Label className="text-sm font-medium text-gray-700">日期範圍：</Label>
                <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="選擇日期" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oneMonth">一個月內</SelectItem>
                    <SelectItem value="thisMonth">本月</SelectItem>
                    <SelectItem value="lastMonth">上月</SelectItem>
                    <SelectItem value="custom">自訂</SelectItem>
                  </SelectContent>
                </Select>

                {dateFilter === 'custom' && (
                  <>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-[140px]"
                    />
                    <span className="text-gray-500">至</span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-[140px]"
                    />
                  </>
                )}
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* 人員篩選 */}
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-green-600" />
                <Label className="text-sm font-medium text-gray-700">人員篩選：</Label>
                <Select
                  value={selectedPersonnel.length === 0 ? 'all' : 'selected'}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setSelectedPersonnel([]);
                    }
                  }}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue>
                      {selectedPersonnel.length === 0
                        ? '全部人員'
                        : `已選 ${selectedPersonnel.length} 人`
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部人員</SelectItem>
                    <Separator className="my-1" />
                    {personnelList.map(personnel => (
                      <div key={personnel.id} className="flex items-center space-x-2 p-2 hover:bg-gray-100">
                        <Checkbox
                          checked={selectedPersonnel.includes(personnel.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPersonnel(prev => [...prev, personnel.id]);
                            } else {
                              setSelectedPersonnel(prev => prev.filter(id => id !== personnel.id));
                            }
                          }}
                        />
                        <span className="text-sm">{personnel.name}</span>
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 快速篩選和操作按鈕 */}
            <div className="flex flex-wrap items-center gap-3">
              {/* 全選功能 */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">
                  全選 ({selectedRecords.length}/{filteredRecords.length})
                </span>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-2">
                <Button
                  variant={quickFilters.settled === false ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setQuickFilters(prev => ({
                    ...prev,
                    settled: prev.settled === false ? undefined : false
                  }))}
                  className="h-8"
                >
                  未結算
                </Button>
                <Button
                  variant={quickFilters.settled === true ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setQuickFilters(prev => ({
                    ...prev,
                    settled: prev.settled === true ? undefined : true
                  }))}
                  className="h-8"
                >
                  已結算
                </Button>
              </div>

              {/* 操作按鈕 */}
              <Button
                onClick={handleExportExcel}
                variant="outline"
                className="bg-green-50 hover:bg-green-100 text-green-700"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                匯出Excel
              </Button>

              {selectedRecords.length > 0 && canSettle && (
                <Button
                  onClick={handleStartSettlement}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  結算工時 ({selectedRecords.length})
                </Button>
              )}
            </div>
          </div>
        )}
      />

      {/* 結算對話框 - 美化設計 */}
      <Dialog open={showSettlementDialog} onOpenChange={setShowSettlementDialog}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="pb-6 border-b border-gray-200">
            <DialogTitle className="flex items-center gap-4 text-2xl">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold">
                  工時結算確認
                </div>
                <div className="text-sm text-gray-600 font-normal mt-1">
                  請確認以下工時記錄的結算資訊
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 人員統計 */}
            <Card className="shadow-lg border-l-4 border-l-blue-500">
              <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-lg text-blue-800">
                  <Users className="h-5 w-5" />
                  勾選人員各自統計時數
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-3">
                  {settlementSummary.map(personnel => (
                    <div key={personnel.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-white to-blue-50 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className="font-bold text-lg text-gray-800">{personnel.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 uppercase tracking-wide">總工時</div>
                          <div className="font-bold text-lg text-green-600">
                            {formatDuration(personnel.totalHours)}
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 px-3 py-1 font-semibold">
                          {personnel.unsettledCount} 筆待結算
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 工時記錄列表 */}
            <Card className="shadow-lg border-l-4 border-l-green-500">
              <CardHeader className="pb-4 bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-lg text-green-800">
                  <Clock className="h-5 w-5" />
                  勾選所有工時列表
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {selectedRecords.map(recordId => {
                    const record = filteredRecords.find(r => r.id === recordId);
                    if (!record) return null;

                    const { date, weekday } = formatDateWithWeekday(record.startDate);

                    return (
                      <div key={recordId} className="flex justify-between items-center p-4 border border-gray-200 rounded-xl bg-gradient-to-r from-white to-gray-50 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-gray-100 rounded-full">
                            <Calendar className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-800">{date}</span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">{weekday}</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {record.startTime} - {record.endTime}
                            </div>
                          </div>
                          <div className="font-bold text-lg text-gray-800">{record.personnelName}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="font-bold text-lg text-green-600">
                              {formatDuration(record.duration || 0)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {record.workOrderNumber}
                            </div>
                          </div>
                          <Badge
                            variant={record.isSettled ? 'default' : 'secondary'}
                            className={`px-3 py-1 font-semibold ${
                              record.isSettled
                                ? 'bg-green-100 text-green-800 border-green-300'
                                : 'bg-orange-100 text-orange-800 border-orange-300'
                            }`}
                          >
                            {record.isSettled ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                已結算
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-4 w-4 mr-1" />
                                待結算
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 結算統計摘要 */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 border-blue-300 shadow-lg">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div className="p-4 bg-white rounded-xl shadow-sm">
                    <div className="flex justify-center mb-2">
                      <ClipboardList className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="text-blue-600 text-sm font-semibold uppercase tracking-wide">總記錄數</div>
                    <div className="text-2xl font-bold text-blue-800 mt-1">{selectedRecords.length}</div>
                  </div>
                  <div className="p-4 bg-white rounded-xl shadow-sm">
                    <div className="flex justify-center mb-2">
                      <Clock className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="text-green-600 text-sm font-semibold uppercase tracking-wide">總工時</div>
                    <div className="text-2xl font-bold text-green-800 mt-1">
                      {formatDuration(
                        settlementSummary.reduce((sum, p) => sum + p.totalHours, 0)
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-xl shadow-sm">
                    <div className="flex justify-center mb-2">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="text-purple-600 text-sm font-semibold uppercase tracking-wide">涉及人員</div>
                    <div className="text-2xl font-bold text-purple-800 mt-1">{settlementSummary.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setShowSettlementDialog(false)}
              className="w-full sm:w-auto px-6 py-3"
            >
              <X className="h-4 w-4 mr-2" />
              取消
            </Button>
            <Button
              onClick={handleConfirmSettlement}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-3 shadow-lg"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              確認結算
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 工時詳情對話框 - 重新設計 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b border-gray-200 flex-shrink-0">
            <DialogTitle className="flex items-center gap-4 text-2xl">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold">
                  工時記錄詳情
                </div>
                <div className="text-sm text-gray-600 font-normal mt-1">
                  查看完整的工時記錄資訊與相關詳細資料
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedTimeEntry && (
            <div className="flex-1 overflow-y-auto">
              {/* 桌面版佈局 - 重新設計 */}
              <div className="hidden md:block p-6">
                {/* 歸一卡片設計 - 不分列 */}
                <div className="space-y-6">
                    {/* 人員與時間資訊 */}
                    <Card className="shadow-lg border-l-4 border-l-blue-500 hover:shadow-xl transition-shadow">
                      <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-blue-25 rounded-t-lg">
                        <CardTitle className="flex items-center gap-3 text-xl text-blue-800">
                          <Users className="h-6 w-6" />
                          人員資訊
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-5">
                        <div>
                          <Label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">人員名稱</Label>
                          <div className="flex items-center gap-3 mt-3">
                            <div className="p-3 bg-blue-100 rounded-full">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="font-bold text-xl text-gray-800">{selectedTimeEntry.personnelName}</span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">工作日期</Label>
                          <div className="flex items-center gap-3 mt-3">
                            {(() => {
                              const { date, weekday } = formatDateWithWeekday(selectedTimeEntry.startDate);
                              return (
                                <div className="flex items-center gap-3">
                                  <Calendar className="h-5 w-5 text-blue-600" />
                                  <span className="font-semibold text-lg text-gray-800">{date}</span>
                                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">{weekday}</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">工作時間</Label>
                          <div className="flex items-center gap-3 mt-3">
                            <Clock className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-blue-600 text-xl">
                              {selectedTimeEntry.startTime} - {selectedTimeEntry.endTime}
                            </span>
                          </div>
                        </div>
                        <div className="p-5 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
                          <Label className="text-sm font-semibold text-green-700 uppercase tracking-wide">總工時</Label>
                          <div className="flex items-center gap-3 mt-2">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                            <span className="font-bold text-2xl text-green-600">
                              {formatDuration(selectedTimeEntry.duration || 0)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 結算狀態 */}
                    <Card className="shadow-lg border-l-4 border-l-purple-500 hover:shadow-xl transition-shadow">
                      <CardHeader className="pb-4 bg-gradient-to-r from-purple-50 to-purple-25 rounded-t-lg">
                        <CardTitle className="flex items-center gap-3 text-xl text-purple-800">
                          <DollarSign className="h-6 w-6" />
                          結算狀態
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-5">
                        <div>
                          <Label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">結算狀態</Label>
                          <div className="mt-3">
                            <Badge
                              variant={selectedTimeEntry.isSettled ? 'default' : 'secondary'}
                              className={`text-base px-4 py-2 font-semibold ${
                                selectedTimeEntry.isSettled
                                  ? 'bg-green-100 text-green-800 border-green-300'
                                  : 'bg-orange-100 text-orange-800 border-orange-300'
                              }`}
                            >
                              {selectedTimeEntry.isSettled ? (
                                <>
                                  <CheckCircle2 className="h-5 w-5 mr-2" />
                                  已結算
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-5 w-5 mr-2" />
                                  待結算
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                        {selectedTimeEntry.isSettled && (
                          <>
                            {selectedTimeEntry.settledAt && (
                              <div>
                                <Label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">結算時間</Label>
                                <div className="text-sm mt-2 p-3 bg-gray-50 rounded-lg font-medium">
                                  {format(selectedTimeEntry.settledAt.toDate(), 'yyyy-MM-dd HH:mm')}
                                </div>
                              </div>
                            )}
                            {selectedTimeEntry.settledByName && (
                              <div>
                                <Label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">結算人員</Label>
                                <div className="text-sm mt-2 p-3 bg-gray-50 rounded-lg font-medium">
                                  {selectedTimeEntry.settledByName}
                                </div>
                              </div>
                            )}
                            {selectedTimeEntry.settlementBatch && (
                              <div>
                                <Label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">結算批次</Label>
                                <div className="text-xs font-mono text-gray-600 mt-2 p-3 bg-gray-100 rounded-lg break-all">
                                  {selectedTimeEntry.settlementBatch}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  {/* 工單資訊 */}
                  <Card className="shadow-lg border-l-4 border-l-orange-500 hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-4 bg-gradient-to-r from-orange-50 to-orange-25 rounded-t-lg">
                      <CardTitle className="flex items-center gap-3 text-xl text-orange-800">
                        <Factory className="h-6 w-6" />
                        工單資訊
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-5">
                      <div>
                        <Label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">工單號碼</Label>
                        <div className="mt-3">
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto font-bold text-blue-600 hover:text-blue-800 text-lg underline decoration-2 underline-offset-4"
                            onClick={() => {
                              setShowDetailDialog(false);
                              router.push(`/dashboard/work-orders/${selectedTimeEntry.workOrderId}`);
                            }}
                          >
                            {selectedTimeEntry.workOrderNumber || selectedTimeEntry.workOrderCode || '未知'}
                            <ExternalLink className="ml-2 h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                      {selectedTimeEntry.productName && (
                        <div>
                          <Label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">產品名稱</Label>
                          <div className="font-semibold text-gray-800 mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            {selectedTimeEntry.productName}
                          </div>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">工單狀態</Label>
                        <div className="mt-3">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 px-4 py-2 text-base font-semibold">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {selectedTimeEntry.workOrderStatus || '未知'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* 手機版佈局 */}
              <div className="md:hidden space-y-4">
                {/* 人員與時間 */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3 bg-blue-50">
                    <CardTitle className="flex items-center gap-2 text-blue-800">
                      <Users className="h-5 w-5" />
                      人員資訊
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="font-bold text-xl text-gray-800">{selectedTimeEntry.personnelName}</div>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        {(() => {
                          const { date, weekday } = formatDateWithWeekday(selectedTimeEntry.startDate);
                          return (
                            <>
                              <span className="font-medium">{date}</span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{weekday}</span>
                            </>
                          );
                        })()}
                      </div>
                      <div className="mt-2 text-blue-600 font-semibold">
                        {selectedTimeEntry.startTime} - {selectedTimeEntry.endTime}
                      </div>
                      <div className="mt-3 p-3 bg-green-100 rounded-lg">
                        <div className="font-bold text-xl text-green-600">
                          {formatDuration(selectedTimeEntry.duration || 0)}
                        </div>
                        <div className="text-sm text-green-700">總工時</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 工單資訊 */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3 bg-orange-50">
                    <CardTitle className="flex items-center gap-2 text-orange-800">
                      <Factory className="h-5 w-5" />
                      工單資訊
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">工單號碼</Label>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto font-semibold text-blue-600 text-base block mt-1"
                        onClick={() => {
                          setShowDetailDialog(false);
                          router.push(`/dashboard/work-orders/${selectedTimeEntry.workOrderId}`);
                        }}
                      >
                        {selectedTimeEntry.workOrderNumber || selectedTimeEntry.workOrderCode || '未知'}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                    {selectedTimeEntry.productName && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">產品名稱</Label>
                        <div className="font-medium mt-1 p-2 bg-gray-50 rounded">
                          {selectedTimeEntry.productName}
                        </div>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium text-gray-500">工單狀態</Label>
                      <div className="mt-1">
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {selectedTimeEntry.workOrderStatus || '未知'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 結算狀態 */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3 bg-purple-50">
                    <CardTitle className="flex items-center gap-2 text-purple-800">
                      <DollarSign className="h-5 w-5" />
                      結算狀態
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-center p-3 rounded-lg">
                      <Badge
                        variant={selectedTimeEntry.isSettled ? 'default' : 'secondary'}
                        className={`text-sm px-4 py-2 ${
                          selectedTimeEntry.isSettled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {selectedTimeEntry.isSettled ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            已結算
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 mr-1" />
                            待結算
                          </>
                        )}
                      </Badge>
                    </div>
                    {selectedTimeEntry.isSettled && (
                      <div className="space-y-2 text-sm">
                        {selectedTimeEntry.settledAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">結算時間：</span>
                            <span>{format(selectedTimeEntry.settledAt.toDate(), 'yyyy-MM-dd HH:mm')}</span>
                          </div>
                        )}
                        {selectedTimeEntry.settledByName && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">結算人員：</span>
                            <span>{selectedTimeEntry.settledByName}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowDetailDialog(false)}
              className="w-full md:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 結算編輯對話框 */}
      <Dialog open={showSettlementEditDialog} onOpenChange={setShowSettlementEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              編輯結算狀態
            </DialogTitle>
            <DialogDescription>
              修改工時記錄的結算狀態
            </DialogDescription>
          </DialogHeader>

          {editingTimeEntry && (
            <div className="space-y-4">
              {/* 工時記錄資訊 */}
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">人員：</span>
                      <span className="font-medium">{editingTimeEntry.personnelName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">日期：</span>
                      <span className="font-medium">{editingTimeEntry.startDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">工時：</span>
                      <span className="font-medium">{formatDuration(editingTimeEntry.duration || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 當前結算狀態 */}
              <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="text-sm text-gray-600 mb-2">當前狀態</div>
                <Badge
                  variant={editingTimeEntry.isSettled ? 'default' : 'secondary'}
                  className="text-base px-4 py-2"
                >
                  {editingTimeEntry.isSettled ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      已結算
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      待結算
                    </>
                  )}
                </Badge>
              </div>

              {/* 操作說明 */}
              <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                {editingTimeEntry.isSettled ? (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    <span>點擊「取消結算」將移除此工時記錄的結算狀態</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>點擊「確認結算」將標記此工時記錄為已結算</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSettlementEditDialog(false)}
            >
              取消
            </Button>
            {editingTimeEntry && (
              <Button
                onClick={() => handleToggleSettlement(editingTimeEntry)}
                className={editingTimeEntry.isSettled
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
                }
              >
                {editingTimeEntry.isSettled ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    取消結算
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    確認結算
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}