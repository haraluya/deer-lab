// src/app/dashboard/time-records/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import { useTimeRecordsCache } from '@/hooks/useTimeRecordsCache';
import { toast } from 'sonner';
import {
  Clock, User, Calendar, Factory, TrendingUp,
  Activity, Timer, Award, BarChart3, Filter,
  ChevronDown, ChevronUp, Zap, ChevronLeft, ChevronRight,
  Trash2, AlertCircle, FileBarChart
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { BUSINESS_CONFIG } from '@/config/business';
import { StandardStatsCard, StandardStats } from '@/components/StandardStatsCard';
import { TimeRecordsReportDialog } from '@/components/TimeRecordsReportDialog';

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
  const apiClient = useApiClient();

  // 🚀 使用工時記錄快取 Hook
  const {
    timeRecords: personalTimeEntries,
    loading: isLoading,
    error: timeRecordsError,
    loadTimeRecords,
    invalidateCache,
    isFromCache,
    cacheAge
  } = useTimeRecordsCache(appUser?.employeeId);

  const [filteredEntries, setFilteredEntries] = useState<any[]>([]);
  const [stats, setStats] = useState<PersonalTimeStats>({
    totalEntries: 0,
    totalHours: 0,
    monthlyHours: 0,
    totalWorkOrders: 0,
    avgHoursPerEntry: 0
  });
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  
  // 分頁狀態
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = BUSINESS_CONFIG.ui.pagination.itemsPerPage;
  
  // 清理功能狀態
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // 報表對話框狀態
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  // 🚀 使用快取版本的載入函數
  const loadPersonalTimeRecords = useCallback(async () => {
    if (!appUser?.employeeId) {
      console.warn('用戶未初始化或缺少 employeeId:', { appUser: !!appUser });
      return;
    }

    console.log('🚀 開始載入個人工時記錄 (使用快取機制)，當前用戶:', {
      uid: appUser.uid,
      name: appUser.name,
      employeeId: appUser.employeeId
    });

    try {
      await loadTimeRecords(appUser.employeeId);
    } catch (error) {
      console.error('載入個人工時記錄失敗:', error);
      toast.error(`載入個人工時記錄失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }, [appUser, loadTimeRecords]);
  
  // 載入個人工時記錄 (使用快取)
  useEffect(() => {
    console.log('useEffect 觸發，appUser 狀態:', {
      appUser: !!appUser,
      uid: appUser?.uid,
      name: appUser?.name,
      employeeId: appUser?.employeeId
    });

    if (appUser?.employeeId) {
      loadPersonalTimeRecords();
    } else {
      console.warn('appUser 或 appUser.employeeId 未準備就緒');
    }
  }, [appUser?.employeeId]); // 依賴 employeeId 而非 uid

  // 🚀 監聽工時記錄變化並重新計算統計資料
  useEffect(() => {
    if (personalTimeEntries.length > 0) {
      calculateStats(personalTimeEntries);
      calculateMonthlyStats(personalTimeEntries);
      console.log('📊 統計資料已重新計算:', {
        recordCount: personalTimeEntries.length,
        isFromCache,
        cacheAge: Math.floor(cacheAge / 1000)
      });
    }
  }, [personalTimeEntries, isFromCache, cacheAge]);

  // 篩選邏輯
  useEffect(() => {
    let filtered = personalTimeEntries;
    
    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.workOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    // 重置到第一頁
    setCurrentPage(1);
  }, [personalTimeEntries, searchTerm, monthFilter]);
  
  // 分頁邏輯
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + itemsPerPage);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const calculateStats = (entries: any[]) => {
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

  const calculateMonthlyStats = (entries: any[]) => {
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

  // 統計卡片資料
  const statsCards: StandardStats[] = [
    {
      title: '本月總工時',
      value: isLoading ? '-' : formatDuration(stats.monthlyHours),
      subtitle: '本月工作時間',
      icon: <Calendar className="h-4 w-4" />,
      color: 'green'
    },
    {
      title: '累計總工時',
      value: isLoading ? '-' : formatDuration(stats.totalHours),
      subtitle: '累計工作時間',
      icon: <Clock className="h-4 w-4" />,
      color: 'blue'
    },
    {
      title: '參與工單',
      value: isLoading ? '-' : stats.totalWorkOrders,
      subtitle: '個工單項目',
      icon: <Factory className="h-4 w-4" />,
      color: 'purple'
    },
    {
      title: '平均工時',
      value: isLoading ? '-' : formatDuration(stats.avgHoursPerEntry),
      subtitle: '每筆記錄平均',
      icon: <BarChart3 className="h-4 w-4" />,
      color: 'red'
    }
  ];

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

  // 清理無效工時記錄功能（僅管理員可用）
  const handleCleanupInvalidRecords = async () => {
    if (!appUser) return;
    
    // 這裡應該檢查用戶是否為管理員，暫時允許所有用戶使用
    const confirmed = window.confirm(
      '⚠️ 警告：此操作將永久刪除所有沒有對應工單的工時記錄。\n\n' +
      '這包括：\n' +
      '• 沒有工單ID的工時記錄\n' +
      '• 對應工單已被刪除的工時記錄\n\n' +
      '此操作無法復原，確定要繼續嗎？'
    );
    
    if (!confirmed) return;
    
    try {
      setIsCleaningUp(true);
      toast.info('開始清理無效工時記錄...');
      
      const result = await apiClient.call('cleanupInvalidTimeRecords', {});
      
      if (result.success && result.data) {
        // 根據API介面定義處理資料
        const data = result.data as any; // CleanupResponse格式
        
        let message = '清理完成';
        let deletedCount = 0;
        let checkedCount = 0;
        
        if ('deletedCount' in data) {
          deletedCount = data.deletedCount;
        }
        if ('summary' in data) {
          checkedCount = data.summary.totalRecordsChecked || 0;
          message = `清理完成：檢查了 ${checkedCount} 筆記錄，刪除了 ${deletedCount} 筆無效記錄`;
        } else if ('message' in data) {
          message = data.message;
          checkedCount = data.checkedCount || 0;
        }
        
        toast.success(message);
        console.log(`清理完成：檢查了 ${checkedCount} 筆記錄，刪除了 ${deletedCount} 筆無效記錄`);
        
        // 重新載入工時記錄 (清除快取)
        if (deletedCount > 0) {
          invalidateCache(); // 🚀 清除快取
          await loadPersonalTimeRecords();
        }
      } else {
        throw new Error('清理失敗');
      }
    } catch (error) {
      console.error('清理無效工時記錄失敗:', error);
      toast.error(`清理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setIsCleaningUp(false);
    }
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
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            工時統計
          </h1>
          <p className="text-gray-600 mt-2">
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
      <StandardStatsCard stats={statsCards} />

      {/* 功能按鈕 */}
      <Card>
        <CardContent className="pt-6">
          {/* 快取狀態顯示 */}
          {isFromCache && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="font-medium">⚡ 快取資料</span>
                <span className="text-blue-600">({Math.floor(cacheAge / 1000)}秒前載入)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    invalidateCache();
                    loadPersonalTimeRecords();
                  }}
                  className="ml-auto h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                >
                  重新載入
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {/* 統計報表按鈕 */}
            <Button
              variant="outline"
              onClick={() => setIsReportDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
            >
              <FileBarChart className="h-4 w-4 mr-1" />
              統計報表
            </Button>

            {/* 管理員清理功能 */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanupInvalidRecords}
              disabled={isCleaningUp}
              className="px-3 text-red-600 border-red-300 hover:bg-red-50"
              title="清理無效工時記錄（沒有對應工單的記錄）"
            >
              {isCleaningUp ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-1 animate-spin" />
                  清理中
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1" />
                  清理無效記錄
                </>
              )}
            </Button>
          </div>
          
          {/* 說明文字 */}
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">📋 工時記錄顯示規則</div>
                <div className="text-xs space-y-1">
                  <div>• 只顯示來自 <Badge variant="outline" className="bg-green-50 text-green-700 px-1 py-0 text-xs">完工</Badge> 或 <Badge variant="outline" className="bg-purple-50 text-purple-700 px-1 py-0 text-xs">已入庫</Badge> 狀態工單的工時記錄</div>
                  <div>• 「預報」和「進行中」工單的工時記錄不會顯示在個人統計中</div>
                  <div>• 清理功能會刪除沒有對應工單的測試記錄</div>
                </div>
              </div>
            </div>
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
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              共 {filteredEntries.length} 筆工時記錄 {totalPages > 0 && `• 第 ${currentPage} / ${totalPages} 頁`}
            </p>
            {filteredEntries.length > itemsPerPage && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-1 mx-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum > totalPages) return null;
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="h-8 w-8 p-0 text-xs"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
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
            <div className="space-y-4">
              {/* 桌面版緊湊表格 */}
              <div className="hidden lg:block">
                {/* 表格標題 */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-t-lg px-4 py-2">
                  <div className="grid grid-cols-12 gap-3 font-medium text-xs text-gray-700">
                    <div className="col-span-3 flex items-center gap-1">
                      <Factory className="h-3 w-3 text-blue-600" />
                      工單編號
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-green-600" />
                      日期
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-orange-600" />
                      時間
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <Timer className="h-3 w-3 text-purple-600" />
                      工時
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <Activity className="h-3 w-3 text-pink-600" />
                      狀態
                    </div>
                    <div className="col-span-1 text-center text-xs">
                      詳細
                    </div>
                  </div>
                </div>
                
                {/* 表格內容 */}
                <div className="border border-t-0 border-blue-200 rounded-b-lg overflow-hidden">
                  {paginatedEntries.map((entry, index) => (
                    <div 
                      key={entry.id} 
                      className={`grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-blue-50/50 transition-colors border-b last:border-b-0 ${
                        entry.status === 'locked' ? 'bg-gray-50/50' : 'bg-white'
                      }`}
                    >
                      {/* 工單編號 */}
                      <div className="col-span-3">
                        <Link 
                          href={`/dashboard/work-orders/${entry.workOrderId}`}
                          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors text-sm block"
                        >
                          {entry.workOrderNumber || '未設定工單號'}
                        </Link>
                        <div className="text-xs text-gray-400 mt-0.5">
                          #{entry.id.slice(-6)}
                        </div>
                      </div>
                      
                      {/* 工作日期 */}
                      <div className="col-span-2">
                        <div className="text-sm font-medium text-gray-800">
                          {new Date(entry.startDate).toLocaleDateString('zh-TW', {
                            month: 'numeric',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(entry.startDate).toLocaleDateString('zh-TW', {
                            weekday: 'short'
                          })}
                        </div>
                      </div>
                      
                      {/* 工作時間 */}
                      <div className="col-span-2">
                        <div className="text-sm font-medium text-gray-800">
                          {entry.startTime} - {entry.endTime}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(() => {
                            const start = new Date(`1970-01-01T${entry.startTime}`);
                            const end = new Date(`1970-01-01T${entry.endTime}`);
                            const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                            return `共 ${diffHours.toFixed(1)}h`;
                          })()} 
                        </div>
                      </div>
                      
                      {/* 總工時 */}
                      <div className="col-span-2">
                        <Badge 
                          variant="outline" 
                          className="bg-purple-50 text-purple-700 border-purple-300 text-xs px-2 py-1"
                        >
                          {formatDuration(entry.duration)}
                        </Badge>
                        {entry.overtimeHours && entry.overtimeHours > 0 && (
                          <div className="mt-1">
                            <Badge variant="secondary" className="text-xs bg-red-50 text-red-600 px-1 py-0.5">
                              加班 {entry.overtimeHours}h
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      {/* 狀態 */}
                      <div className="col-span-2">
                        <Badge 
                          variant={entry.status === 'locked' ? 'secondary' : 'default'}
                          className={`text-xs px-2 py-1 ${
                            entry.status === 'locked' 
                              ? 'bg-gray-100 text-gray-600' 
                              : 'bg-green-50 text-green-600'
                          }`}
                        >
                          {entry.status === 'locked' ? '🔒 已鎖定' : '✅ 正常'}
                        </Badge>
                      </div>
                      
                      {/* 展開按鈕 */}
                      <div className="col-span-1 flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(entry.id)}
                          className="h-6 w-6 p-0 hover:bg-blue-100"
                        >
                          {expandedEntries.has(entry.id) ? (
                            <ChevronUp className="h-3 w-3 text-blue-600" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-blue-600" />
                          )}
                        </Button>
                      </div>
                      
                      {/* 展開的詳細資訊 */}
                      {expandedEntries.has(entry.id) && (
                        <div className="col-span-12 mt-2 pt-3 border-t border-gray-200">
                          <div className="bg-gray-50 p-3 rounded text-sm">
                            <div className="grid grid-cols-3 gap-3 mb-2">
                              <div>
                                <span className="font-medium text-gray-600">建立時間：</span>
                                <div className="text-gray-800 mt-1">
                                  {entry.createdAt?.toDate?.()?.toLocaleString('zh-TW') || '未知'}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">員工：</span>
                                <div className="text-gray-800 mt-1">{entry.personnelName}</div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">記錄ID：</span>
                                <div className="text-gray-800 mt-1 font-mono text-xs">{entry.id}</div>
                              </div>
                            </div>
                            {entry.notes && (
                              <div className="pt-2 border-t border-gray-300">
                                <span className="font-medium text-gray-600">備註：</span>
                                <p className="mt-1 text-gray-800">{entry.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {paginatedEntries.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p>沒有找到符合條件的工時記錄</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 平板版簡化表格 */}
              <div className="hidden md:block lg:hidden">
                <div className="space-y-3">
                  {paginatedEntries.map((entry) => (
                    <Card key={entry.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <Link 
                              href={`/dashboard/work-orders/${entry.workOrderId}`}
                              className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors text-lg block mb-1"
                            >
                              {entry.workOrderNumber || '未設定工單號'}
                            </Link>
                            <div className="text-sm text-gray-600 mb-2">
                              {formatDate(entry.startDate)} • {entry.startTime} - {entry.endTime}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                                {formatDuration(entry.duration)}
                              </Badge>
                              <Badge 
                                variant={entry.status === 'locked' ? 'secondary' : 'default'}
                                className={entry.status === 'locked' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}
                              >
                                {entry.status === 'locked' ? '🔒 已鎖定' : '✅ 正常'}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(entry.id)}
                            className="ml-2"
                          >
                            {expandedEntries.has(entry.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        
                        {expandedEntries.has(entry.id) && entry.notes && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">工作備註：</span>
                              <p className="mt-1 text-gray-800 bg-gray-50 p-2 rounded">{entry.notes}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 手機版 */}
              <div className="md:hidden space-y-3">
                {paginatedEntries.map((entry) => (
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

              {/* 底部分頁 */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-6 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="px-3"
                  >
                    首頁
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex gap-1 mx-4">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      if (pageNum > totalPages) return null;
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-10 h-8 p-0 text-sm"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-2"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3"
                  >
                    末頁
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 工時統計報表對話框 */}
      <TimeRecordsReportDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
      />
    </div>
  );
}