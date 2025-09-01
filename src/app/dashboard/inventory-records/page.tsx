"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { toast } from "sonner"
import { DataTable } from "./data-table"
import { createColumns, InventoryRecordColumn } from "./columns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePermission } from '@/hooks/usePermission'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ClipboardList, 
  Filter, 
  Search, 
  TrendingUp, 
  Package, 
  FlaskConical,
  Plus,
  Minus,
  RefreshCw,
  Eye,
  Shield
} from "lucide-react"
import { 
  getInventoryRecords, 
  InventoryRecord, 
  InventoryRecordQueryParams,
  getChangeReasonLabel,
  getItemTypeLabel
} from "@/lib/inventoryRecords"
import { InventoryRecordDialog } from "@/components/InventoryRecordDialog"

function InventoryRecordsPageContent() {
  const { appUser } = useAuth()
  const [records, setRecords] = useState<InventoryRecordColumn[]>([])
  const [filteredRecords, setFilteredRecords] = useState<InventoryRecordColumn[]>([])
  const [loading, setLoading] = useState(true)
  
  // 篩選狀態
  const [filters, setFilters] = useState<InventoryRecordQueryParams>({
    pageSize: 10
  })
  
  // 對話框狀態
  const [selectedRecord, setSelectedRecord] = useState<InventoryRecord | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // 權限檢查
  const { hasPermission, isAdmin } = usePermission();
  const canViewInventoryRecords = hasPermission('inventoryRecords.view') || hasPermission('inventoryRecords:view');
  
  // 統計數據
  const stats = useCallback(() => {
    const total = records.length
    const purchase = records.filter(r => r.changeReason === 'purchase').length
    const workorder = records.filter(r => r.changeReason === 'workorder').length
    const inventoryCheck = records.filter(r => r.changeReason === 'inventory_check').length
    const manualAdjustment = records.filter(r => r.changeReason === 'manual_adjustment').length
    
    // 計算物料和香精數量（從details中統計）
    let materials = 0
    let fragrances = 0
    records.forEach(record => {
      record.details.forEach(detail => {
        if (detail.itemType === 'material') {
          materials++
        } else if (detail.itemType === 'fragrance') {
          fragrances++
        }
      })
    })

    return { total, purchase, workorder, inventoryCheck, manualAdjustment, materials, fragrances }
  }, [records])

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getInventoryRecords(filters)
      setRecords(result.records)
      setFilteredRecords(result.records)
    } catch (error) {
      console.error('載入庫存紀錄失敗:', error)
      toast.error('載入庫存紀錄失敗')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  // 篩選功能
  const applyFilters = useCallback(() => {
    let filtered = records

    // 搜尋篩選
    if (filters.remarks) {
      filtered = filtered.filter(r => 
        (r.remarks && r.remarks.toLowerCase().includes(filters.remarks!.toLowerCase())) ||
        (r.operatorName && r.operatorName.toLowerCase().includes(filters.remarks!.toLowerCase()))
      )
    }

    // 原因篩選
    if (filters.changeReason) {
      filtered = filtered.filter(r => r.changeReason === filters.changeReason)
    }

    setFilteredRecords(filtered)
  }, [records, filters])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const handleFilterChange = (key: keyof InventoryRecordQueryParams, value: string | null | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({ pageSize: 10 })
  }

  const handleRecordClick = (record: InventoryRecord) => {
    setSelectedRecord(record)
    setIsDialogOpen(true)
  }

  // 創建表格欄位定義，傳入點擊處理函數
  const columns = createColumns(handleRecordClick)

  const currentStats = stats()

  // 權限保護：如果沒有查看權限，顯示無權限頁面
  if (!canViewInventoryRecords && !isAdmin()) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="max-w-2xl mx-auto">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            您沒有權限查看庫存歷史頁面。請聯繫系統管理員獲取相關權限。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        {/* 頁面標題區域 */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                庫存紀錄中心
              </h1>
              <p className="text-gray-600 mt-2 text-lg font-medium">完整的庫存變動追蹤與審計系統</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={loadRecords}
                className="hover:bg-white/80 backdrop-blur-sm transition-all duration-200"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                重新整理
              </Button>
            </div>
          </div>

          {/* 統計卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  總紀錄
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">{currentStats.total}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  採購購入
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">{currentStats.purchase}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                  <Minus className="h-4 w-4" />
                  工單領料
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900">{currentStats.workorder}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  庫存盤點
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">{currentStats.inventoryCheck}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  直接修改
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900">{currentStats.manualAdjustment}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  物料
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">{currentStats.materials}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-pink-700 flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  香精
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-pink-900">{currentStats.fragrances}</div>
              </CardContent>
            </Card>
          </div>

          {/* 篩選區域 */}
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-600" />
                篩選條件
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="search" className="text-sm font-medium text-gray-700">搜尋</Label>
                  <Input
                    id="search"
                    placeholder="備註、操作人員..."
                    value={filters.remarks || ''}
                    onChange={(e) => handleFilterChange('remarks', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="changeReason" className="text-sm font-medium text-gray-700">變動原因</Label>
                  <Select
                    value={filters.changeReason || 'all'}
                    onValueChange={(value) => handleFilterChange('changeReason', value === 'all' ? undefined : value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="選擇原因" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部原因</SelectItem>
                      <SelectItem value="purchase">採購購入</SelectItem>
                      <SelectItem value="workorder">工單領料</SelectItem>
                      <SelectItem value="inventory_check">庫存盤點</SelectItem>
                      <SelectItem value="manual_adjustment">直接修改</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full hover:bg-gray-50 transition-all duration-200"
                  >
                    清除篩選
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 庫存紀錄表格 */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-200 rounded-full animate-spin"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
              </div>
              <span className="mt-6 text-gray-600 font-medium text-lg">載入庫存紀錄中...</span>
              <p className="text-gray-500 text-sm mt-2">請稍候，正在從資料庫讀取資料</p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm">
            <DataTable 
              columns={columns} 
              data={filteredRecords} 
              onRowClick={handleRecordClick}
            />
          </div>
        )}
      </div>

      {/* 庫存紀錄詳情對話框 */}
      <InventoryRecordDialog
        record={selectedRecord}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setSelectedRecord(null)
        }}
      />
    </div>
  )
}

export default function InventoryRecordsPage() {
  return (
    <InventoryRecordsPageContent />
  )
}
