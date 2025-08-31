'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

import { Calendar, User, Package, TrendingUp, FileText, MessageSquare, List, Eye } from 'lucide-react';
import { InventoryRecord, getChangeReasonLabel, getItemTypeLabel, getItemDetailFromRecord } from '@/lib/inventoryRecords';

interface InventoryRecordDialogProps {
  record: InventoryRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onViewItemHistory?: (itemId: string, itemType: 'material' | 'fragrance') => void;
}

export function InventoryRecordDialog({ record, isOpen, onClose, onViewItemHistory }: InventoryRecordDialogProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'material' | 'fragrance' | null>(null);

  if (!record) return null;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getQuantityChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getQuantityChangeIcon = (change: number) => {
    if (change > 0) return '↗️';
    if (change < 0) return '↘️';
    return '→';
  };

  const handleViewItemHistory = (itemId: string, itemType: 'material' | 'fragrance') => {
    if (onViewItemHistory) {
      onViewItemHistory(itemId, itemType);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">
            庫存動作詳情
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 動作基本資訊卡片 */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                動作基本資訊
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">變動原因</label>
                  <div className="mt-1">
                    <Badge 
                      variant="outline" 
                      className={`text-sm ${
                        record.changeReason === 'purchase' ? 'border-green-200 text-green-700 bg-green-50' :
                        record.changeReason === 'workorder' ? 'border-orange-200 text-orange-700 bg-orange-50' :
                        record.changeReason === 'inventory_check' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                        'border-gray-200 text-gray-700 bg-gray-50'
                      }`}
                    >
                      {getChangeReasonLabel(record.changeReason)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">影響項目數量</label>
                  <div className="mt-1 text-2xl font-bold text-blue-600">
                    {record.details.length} 項
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 操作資訊卡片 */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                <User className="h-5 w-5 text-purple-500" />
                操作資訊
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">操作人員</label>
                  <div className="mt-1 text-sm bg-gray-50 px-3 py-2 rounded-md border">
                    {record.operatorName}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">操作時間</label>
                  <div className="mt-1 text-sm bg-gray-50 px-3 py-2 rounded-md border flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    {formatDate(record.changeDate)}
                  </div>
                </div>
              </div>

              {record.relatedDocumentId && (
                <div>
                  <label className="text-sm font-medium text-gray-600">相關文件</label>
                  <div className="mt-1 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm bg-blue-50 px-3 py-2 rounded-md border text-blue-700">
                      {record.relatedDocumentType || '相關文件'}: {record.relatedDocumentId}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 備註卡片 */}
          {record.remarks && (
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-orange-500" />
                  備註
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm bg-orange-50 px-4 py-3 rounded-md border border-orange-200 text-orange-800">
                  {record.remarks}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 明細清單卡片 */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                <List className="h-5 w-5 text-green-500" />
                影響項目明細 ({record.details.length} 項)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>類型</TableHead>
                      <TableHead>編號</TableHead>
                      <TableHead>名稱</TableHead>
                      <TableHead>變動數量</TableHead>
                      <TableHead>變動後數量</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {record.details.map((detail, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {getItemTypeLabel(detail.itemType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {detail.itemCode}
                        </TableCell>
                        <TableCell className="text-sm">
                          {detail.itemName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className={`font-bold ${getQuantityChangeColor(detail.quantityChange)}`}>
                              {getQuantityChangeIcon(detail.quantityChange)} {Math.abs(detail.quantityChange)}
                            </span>
                            <Badge 
                              variant={detail.quantityChange > 0 ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {detail.quantityChange > 0 ? '增加' : detail.quantityChange < 0 ? '減少' : '無變動'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-gray-800">
                          {detail.quantityAfter}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewItemHistory(detail.itemId, detail.itemType)}
                            className="text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            查看歷史
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 系統資訊 */}
          <Card className="border-l-4 border-l-gray-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-500" />
                系統資訊
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                建立時間：{formatDate(record.createdAt)}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
