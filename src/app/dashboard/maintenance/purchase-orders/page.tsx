'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Search, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useApiClient } from '@/hooks/useApiClient';

export default function PurchaseOrderMaintenancePage() {
  const apiClient = useApiClient();
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [fixResult, setFixResult] = useState<any>(null);

  // 掃描所有採購單
  const handleScanAll = async () => {
    setIsScanning(true);
    setScanResult(null);

    try {
      const result = await apiClient.call('scanAllPurchaseOrders', {});

      if (result.success) {
        setScanResult(result);
        toast.success(`掃描完成：發現 ${result.problematicCount} 個需要修復的採購單`);
      } else {
        toast.error(result.error?.message || '掃描失敗');
      }
    } catch (error) {
      console.error('掃描失敗:', error);
      toast.error('掃描失敗，請稍後再試');
    } finally {
      setIsScanning(false);
    }
  };

  // 修復特定採購單（dry run）
  const handleAnalyze = async () => {
    if (!purchaseOrderId.trim()) {
      toast.error('請輸入採購單 ID');
      return;
    }

    setIsFixing(true);
    setFixResult(null);

    try {
      const result = await apiClient.call('fixPurchaseOrderItemRefs', {
        purchaseOrderId: purchaseOrderId.trim(),
        dryRun: true
      });

      if (result.success) {
        setFixResult(result);
        if (result.needsFix === 0) {
          toast.success('此採購單無需修復');
        } else {
          toast.info(`分析完成：發現 ${result.needsFix} 個需要修復的項目`);
        }
      } else {
        toast.error(result.error?.message || '分析失敗');
      }
    } catch (error) {
      console.error('分析失敗:', error);
      toast.error('分析失敗，請稍後再試');
    } finally {
      setIsFixing(false);
    }
  };

  // 執行修復
  const handleFix = async () => {
    if (!purchaseOrderId.trim()) {
      toast.error('請輸入採購單 ID');
      return;
    }

    if (!confirm('確定要修復此採購單嗎？此操作會更新 Firestore 資料。')) {
      return;
    }

    setIsFixing(true);

    try {
      const result = await apiClient.call('fixPurchaseOrderItemRefs', {
        purchaseOrderId: purchaseOrderId.trim(),
        dryRun: false
      });

      if (result.success) {
        setFixResult(result);
        toast.success(`修復完成：已修復 ${result.needsFix} 個項目`);
      } else {
        toast.error(result.error?.message || '修復失敗');
      }
    } catch (error) {
      console.error('修復失敗:', error);
      toast.error('修復失敗，請稍後再試');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">採購單維護工具</h1>
        <p className="text-gray-600 mt-2">
          修復在 2025-11-17 之前建立的採購單，這些採購單可能有錯誤的 itemRef 指向
        </p>
      </div>

      {/* 掃描所有採購單 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            掃描所有採購單
          </CardTitle>
          <CardDescription>
            掃描最近 100 個採購單，找出需要修復的項目
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleScanAll}
            disabled={isScanning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isScanning ? '掃描中...' : '開始掃描'}
          </Button>

          {scanResult && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="font-semibold">掃描結果：</p>
                <p>掃描數量：{scanResult.scannedCount} 個採購單</p>
                <p>需要修復：{scanResult.problematicCount} 個採購單</p>
              </div>

              {scanResult.problematicPurchaseOrders?.length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold">有問題的採購單：</p>
                  {scanResult.problematicPurchaseOrders.map((po: any) => (
                    <div key={po.id} className="p-3 bg-yellow-50 rounded border border-yellow-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{po.code}</p>
                          <p className="text-sm text-gray-600">狀態: {po.status}</p>
                          <p className="text-sm text-gray-600">問題數量: {po.problemCount}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPurchaseOrderId(po.id);
                            toast.info(`已設定採購單 ID: ${po.id}`);
                          }}
                        >
                          選擇
                        </Button>
                      </div>
                      <div className="mt-2 text-sm">
                        {po.problems.map((problem: any, idx: number) => (
                          <div key={idx} className="text-xs text-gray-600">
                            • {problem.name} ({problem.code}) -
                            {problem.needsRefFix && ` 錯誤的 collection: ${problem.currentCollection} → ${problem.expectedCollection}`}
                            {problem.needsTypeField && ` 缺少 type 欄位`}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 修復特定採購單 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            修復特定採購單
          </CardTitle>
          <CardDescription>
            輸入採購單 ID，先分析後再執行修復
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="poId">採購單 ID</Label>
            <Input
              id="poId"
              value={purchaseOrderId}
              onChange={(e) => setPurchaseOrderId(e.target.value)}
              placeholder="例如: po_document_id"
              className="mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={isFixing}
              variant="outline"
            >
              {isFixing ? '分析中...' : '分析（不修改）'}
            </Button>
            <Button
              onClick={handleFix}
              disabled={isFixing}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isFixing ? '修復中...' : '執行修復'}
            </Button>
          </div>

          {fixResult && (
            <div className="mt-4 space-y-4">
              <div className={`p-4 rounded-lg ${fixResult.needsFix === 0 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <p className="font-semibold">{fixResult.message}</p>
                <p className="text-sm">採購單編號：{fixResult.purchaseOrderCode}</p>
                <p className="text-sm">總項目數：{fixResult.totalItems}</p>
                <p className="text-sm">需要修復：{fixResult.needsFix}</p>
                <p className="text-sm">模式：{fixResult.dryRun ? '分析模式（未修改資料）' : '修復模式（已更新資料）'}</p>
              </div>

              {fixResult.details?.length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold">項目詳情：</p>
                  {fixResult.details.map((detail: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded border ${
                        detail.status?.includes('✅')
                          ? 'bg-green-50 border-green-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{detail.name}</p>
                          <p className="text-sm text-gray-600">代碼: {detail.code}</p>
                          <p className="text-sm text-gray-600">單位: {detail.unit || '無'}</p>

                          {detail.status ? (
                            <p className="text-sm text-gray-600">{detail.status}</p>
                          ) : (
                            <>
                              {detail.needsTypeField && (
                                <p className="text-sm text-orange-600">⚠️  需要新增 type 欄位</p>
                              )}
                              {detail.needsRefFix && (
                                <p className="text-sm text-red-600">
                                  ❌ itemRef 錯誤: {detail.currentCollection} → {detail.expectedCollection}
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        {!detail.status?.includes('✅') ? (
                          <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
