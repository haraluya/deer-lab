'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus, Package, FlaskConical, Clock, RefreshCw, Eye } from 'lucide-react';
import { getItemInventoryHistory, InventoryRecord, getChangeReasonLabel, getItemDetailFromRecord } from '@/lib/inventoryRecords';
import { InventoryRecordDialog } from './InventoryRecordDialog';

interface InventoryHistorySectionProps {
  itemId: string;
  itemType: 'material' | 'fragrance';
  itemCode: string;
  itemName: string;
  currentStock: number;
}

// 用於顯示的歷史記錄介面
interface HistoryDisplayRecord {
  id: string;
  changeDate: Date;
  changeReason: string;
  quantityChange: number;
  quantityAfter: number;
  operatorName: string;
  remarks?: string;
  relatedDocumentId?: string;
  relatedDocumentType?: string;
  originalRecord: InventoryRecord; // 保留原始記錄用於詳情顯示
}

export function InventoryHistorySection({ 
  itemId, 
  itemType, 
  itemCode, 
  itemName, 
  currentStock 
}: InventoryHistorySectionProps) {
  const [history, setHistory] = useState<HistoryDisplayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<InventoryRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const records = await getItemInventoryHistory(itemId, itemType, 20);
      
      // 轉換為顯示格式，從動作紀錄中提取特定物料的明細
      const displayRecords: HistoryDisplayRecord[] = records.map(record => {
        const detail = getItemDetailFromRecord(record, itemId, itemType);
        if (!detail) return null;
        
        return {
          id: record.id!,
          changeDate: record.changeDate,
          changeReason: record.changeReason,
          quantityChange: detail.quantityChange,
          quantityAfter: detail.quantityAfter,
          operatorName: record.operatorName,
          remarks: record.remarks,
          relatedDocumentId: record.relatedDocumentId,
          relatedDocumentType: record.relatedDocumentType,
          originalRecord: record
        };
      }).filter(Boolean) as HistoryDisplayRecord[];
      
      setHistory(displayRecords);
    } catch (error) {
      console.error('載入庫存歷史失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [itemId, itemType]);

  useEffect(() => {
    loadHistory();
  }, [itemId, itemType, loadHistory]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getQuantityChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getQuantityChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const handleRecordClick = (record: HistoryDisplayRecord) => {
    setSelectedRecord(record.originalRecord);
    setIsDialogOpen(true);
  };

  const getItemTypeIcon = () => {
    return itemType === 'material' ? (
      <Package className="h-5 w-5 text-blue-500" />
    ) : (
      <FlaskConical className="h-5 w-5 text-purple-500" />
    );
  };

  const getItemTypeLabel = () => {
    return itemType === 'material' ? '物料' : '香精';
  };

  return (
    <>
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
            {getItemTypeIcon()}
            庫存歷史
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 當前庫存摘要 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm font-medium text-blue-700">當前庫存</div>
              <div className="text-2xl font-bold text-blue-900">{currentStock}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm font-medium text-green-700">總增加</div>
              <div className="text-2xl font-bold text-green-900">
                {history
                  .filter(r => r.quantityChange > 0)
                  .reduce((sum, r) => sum + r.quantityChange, 0)
                }
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="text-sm font-medium text-red-700">總消耗</div>
              <div className="text-2xl font-bold text-red-900">
                {Math.abs(history
                  .filter(r => r.quantityChange < 0)
                  .reduce((sum, r) => sum + r.quantityChange, 0)
                )}
              </div>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              顯示最近 {history.length} 筆庫存變動記錄
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              disabled={loading}
              className="hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              重新整理
            </Button>
          </div>

          {/* 庫存歷史表格 */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin border-t-blue-500"></div>
                <span className="text-sm text-gray-500">載入中...</span>
              </div>
            </div>
          ) : history.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableHead className="text-left font-semibold text-gray-700">變動時間</TableHead>
                    <TableHead className="text-left font-semibold text-gray-700">變動原因</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">變動數量</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">變動後數量</TableHead>
                    <TableHead className="text-left font-semibold text-gray-700">操作人員</TableHead>
                    <TableHead className="text-left font-semibold text-gray-700">備註</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((record) => (
                    <TableRow key={record.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <TableCell className="text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {formatDate(record.changeDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            record.changeReason === 'purchase' ? 'border-green-200 text-green-700 bg-green-50' :
                            record.changeReason === 'workorder' ? 'border-orange-200 text-orange-700 bg-orange-50' :
                            record.changeReason === 'inventory_check' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                            'border-gray-200 text-gray-700 bg-gray-50'
                          }`}
                        >
                          {getChangeReasonLabel(record.changeReason)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {getQuantityChangeIcon(record.quantityChange)}
                          <span className={`font-semibold ${getQuantityChangeColor(record.quantityChange)}`}>
                            {record.quantityChange > 0 ? '+' : ''}{record.quantityChange}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-gray-800">
                          {record.quantityAfter}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {record.operatorName}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate" title={record.remarks}>
                        {record.remarks || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRecordClick(record)}
                          className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📊</div>
              <div className="text-gray-500 font-medium text-lg mb-2">尚無庫存變動記錄</div>
              <div className="text-gray-400">此{itemType === 'material' ? '物料' : '香精'}尚未有任何庫存變動</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 庫存紀錄詳情對話框 */}
      <InventoryRecordDialog
        record={selectedRecord}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedRecord(null);
        }}
      />
    </>
  );
}
