'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, AlertCircle, CheckCircle, FlaskConical } from 'lucide-react';

interface FragranceRatioProblem {
  code: string;
  name: string;
  percentage: number;
  currentPgRatio: number;
  correctPgRatio: number;
  pgDiff: number;
  currentVgRatio: number;
  correctVgRatio: number;
  vgDiff: number;
  total: number;
  correctTotal: number;
}

interface DiagnoseResult {
  success: boolean;
  totalFragrances: number;
  problematicCount: number;
  correctCount: number;
  problematicFragrances: FragranceRatioProblem[];
  correctFragrances: any[];
  message: string;
}

interface FixResult {
  success: boolean;
  fixedCount: number;
  fixDetails: any[];
  message: string;
}

export default function FragranceFixPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [diagnoseResult, setDiagnoseResult] = useState<DiagnoseResult | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);

  const handleDiagnose = async () => {
    if (!functions) {
      toast.error('Firebase 未初始化');
      return;
    }
    
    setIsLoading(true);
    try {
      const diagnoseFunction = httpsCallable(functions, 'diagnoseFragranceRatios');
      const result = await diagnoseFunction();
      
      const data = result.data as DiagnoseResult;
      setDiagnoseResult(data);
      
      toast.success(data.message);
    } catch (error: any) {
      console.error('診斷香精比例失敗:', error);
      toast.error(error.message || '診斷香精比例時發生錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFix = async () => {
    if (!functions) {
      toast.error('Firebase 未初始化');
      return;
    }
    
    if (!diagnoseResult || diagnoseResult.problematicCount === 0) {
      toast.warning('請先進行診斷，且需要有問題的香精才能執行修正');
      return;
    }

    setIsLoading(true);
    try {
      const fixFunction = httpsCallable(functions, 'fixAllFragranceRatios');
      const result = await fixFunction();
      
      const data = result.data as FixResult;
      setFixResult(data);
      
      toast.success(data.message);
      
      // 修正完成後重新診斷
      setTimeout(() => {
        handleDiagnose();
      }, 1000);
      
    } catch (error: any) {
      console.error('修正香精比例失敗:', error);
      toast.error(error.message || '修正香精比例時發生錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      {/* 標題 */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-grow">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            香精比例修正工具
          </h1>
          <p className="text-gray-600 mt-2">批量診斷和修正所有香精的 PG/VG 比例</p>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-4 mb-8">
        <Button 
          onClick={handleDiagnose}
          disabled={isLoading}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <AlertCircle className="mr-2 h-4 w-4" />
          )}
          診斷香精比例
        </Button>
        
        <Button 
          onClick={handleFix}
          disabled={isLoading || !diagnoseResult || diagnoseResult.problematicCount === 0}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          修正所有問題比例
        </Button>
      </div>

      {/* 診斷結果統計 */}
      {diagnoseResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-600">總香精數量</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {diagnoseResult.totalFragrances}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-red-600">比例錯誤</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">
                {diagnoseResult.problematicCount}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-green-600">比例正確</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {diagnoseResult.correctCount}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 修正結果 */}
      {fixResult && (
        <Card className="mb-8 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              修正完成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700">
              {fixResult.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 問題香精列表 */}
      {diagnoseResult && diagnoseResult.problematicFragrances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              比例錯誤的香精 ({diagnoseResult.problematicCount} 個)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>香精代號</TableHead>
                  <TableHead>香精名稱</TableHead>
                  <TableHead>香精%</TableHead>
                  <TableHead>目前PG%</TableHead>
                  <TableHead>正確PG%</TableHead>
                  <TableHead>目前VG%</TableHead>
                  <TableHead>正確VG%</TableHead>
                  <TableHead>目前總計</TableHead>
                  <TableHead>正確總計</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diagnoseResult.problematicFragrances.map((fragrance) => (
                  <TableRow key={fragrance.code}>
                    <TableCell className="font-mono">{fragrance.code}</TableCell>
                    <TableCell>{fragrance.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {fragrance.percentage}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        {fragrance.currentPgRatio}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {fragrance.correctPgRatio}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        {fragrance.currentVgRatio}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {fragrance.correctVgRatio}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        {fragrance.total.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {fragrance.correctTotal}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 正確香精列表 */}
      {diagnoseResult && diagnoseResult.correctFragrances.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              比例正確的香精 ({diagnoseResult.correctCount} 個)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {diagnoseResult.correctFragrances.slice(0, 9).map((fragrance) => (
                <div key={fragrance.code} className="p-3 border border-green-200 rounded-lg bg-green-50">
                  <div className="font-medium text-green-800">{fragrance.name}</div>
                  <div className="text-sm text-green-600 font-mono">{fragrance.code}</div>
                  <div className="text-xs text-green-600 mt-1">
                    香精:{fragrance.percentage}% | PG:{fragrance.pgRatio}% | VG:{fragrance.vgRatio}%
                  </div>
                </div>
              ))}
              {diagnoseResult.correctFragrances.length > 9 && (
                <div className="p-3 border border-green-200 rounded-lg bg-green-50 flex items-center justify-center">
                  <div className="text-green-600 text-sm">
                    還有 {diagnoseResult.correctFragrances.length - 9} 個...
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 使用說明 */}
      <Card className="mt-8 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">使用說明</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 text-sm space-y-2">
          <p>1. <strong>診斷香精比例</strong>：掃描所有香精，找出 PG/VG 比例錯誤的香精</p>
          <p>2. <strong>修正所有問題比例</strong>：批量修正所有比例錯誤的香精</p>
          <p>3. <strong>計算規則</strong>：香精 ≤ 60% 時，PG+香精=60%、VG=40%；香精 &gt; 60% 時，PG=0%、VG=100%-香精</p>
          <p>4. 修正後會自動重新診斷以確認結果</p>
        </CardContent>
      </Card>
    </div>
  );
}