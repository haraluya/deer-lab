"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, orderBy, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

import { toast } from "sonner"
import { DataTable } from "./data-table"
import { columns } from "./columns"
import { WorkOrderColumn } from "./columns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Factory, Filter, Search, TrendingUp, Clock, CheckCircle, Package, AlertCircle } from "lucide-react"

function WorkOrdersPageContent() {
  const router = useRouter()
  const [workOrders, setWorkOrders] = useState<WorkOrderColumn[]>([])
  const [filteredWorkOrders, setFilteredWorkOrders] = useState<WorkOrderColumn[]>([])
  const [loading, setLoading] = useState(true)
  
  // 篩選狀態
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const loadWorkOrders = useCallback(async () => {
    setLoading(true)
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      
      const workOrdersQuery = query(
        collection(db, "workOrders"),
        orderBy("createdAt", "desc")
      )
      const querySnapshot = await getDocs(workOrdersQuery)
      
      const workOrdersList = querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          code: data.code || "",
          productName: data.productSnapshot?.name || "未知產品",
          seriesName: data.productSnapshot?.seriesName || "未指定",
          targetQuantity: data.targetQuantity || 0,
          status: data.status || "預報",
          createdAt: data.createdAt?.toDate?.()?.toLocaleDateString() || "未知日期"
        }
      }) as WorkOrderColumn[]
      
      setWorkOrders(workOrdersList)
    } catch (error) {
      console.error("讀取工單資料失敗:", error)
      toast.error("讀取工單資料失敗")
    } finally {
      setLoading(false)
    }
  }, [])

  // 篩選工單
  useEffect(() => {
    let filtered = workOrders

    // 狀態篩選
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    setFilteredWorkOrders(filtered)
  }, [workOrders, statusFilter])

  useEffect(() => {
    loadWorkOrders()
  }, [loadWorkOrders])

  const handleCreateWorkOrder = () => {
    router.push("/dashboard/work-orders/create")
  }

  // 計算統計數據
  const stats = useMemo(() => {
    const total = workOrders.length
    const forecast = workOrders.filter(w => w.status === '預報').length
    const inProgress = workOrders.filter(w => w.status === '進行').length
    const completed = workOrders.filter(w => w.status === '完工').length
    const warehoused = workOrders.filter(w => w.status === '入庫').length

    return { total, forecast, inProgress, completed, warehoused }
  }, [workOrders])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        {/* 頁面標題區域 */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                工單管理中心
              </h1>
              <p className="text-gray-700 mt-2 text-lg font-medium">專業的生產工單管理與進度追蹤系統</p>
            </div>
            <Button 
              onClick={handleCreateWorkOrder}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12 px-6 text-base font-semibold"
            >
              <Plus className="mr-2 h-5 w-5" />
              建立新工單
            </Button>
          </div>

          {/* 統計卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-blue-400 to-blue-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-100">總工單數</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Factory className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-400 to-red-500 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-100">預報中</p>
                    <p className="text-2xl font-bold text-white">{stats.forecast}</p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-400 to-green-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-100">進行中</p>
                    <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-400 to-emerald-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-100">已完工</p>
                    <p className="text-2xl font-bold text-white">{stats.completed}</p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-400 to-purple-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 col-span-2 lg:col-span-1">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-100">已入庫</p>
                    <p className="text-2xl font-bold text-white">{stats.warehoused}</p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 工單清單區域 */}
        <Card className="bg-gradient-to-br from-pink-50 to-purple-50 border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-t-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Factory className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">工單清單</CardTitle>
                  <p className="text-pink-100 text-sm">管理所有生產工單</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-pink-100">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">共 {filteredWorkOrders.length} 個工單</span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* 狀態篩選 */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">狀態篩選：</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                    className={`font-medium transition-all duration-200 ${
                      statusFilter === 'all' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg' 
                        : 'border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 bg-white'
                    }`}
                  >
                    全部 ({stats.total})
                  </Button>
                  <Button
                    variant={statusFilter === '預報' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('預報')}
                    className={`font-medium transition-all duration-200 ${
                      statusFilter === '預報' 
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg' 
                        : 'border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400 bg-white'
                    }`}
                  >
                    預報 ({stats.forecast})
                  </Button>
                  <Button
                    variant={statusFilter === '進行' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('進行')}
                    className={`font-medium transition-all duration-200 ${
                      statusFilter === '進行' 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg' 
                        : 'border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 bg-white'
                    }`}
                  >
                    進行 ({stats.inProgress})
                  </Button>
                  <Button
                    variant={statusFilter === '完工' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('完工')}
                    className={`font-medium transition-all duration-200 ${
                      statusFilter === '完工' 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg' 
                        : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 bg-white'
                    }`}
                  >
                    完工 ({stats.completed})
                  </Button>
                  <Button
                    variant={statusFilter === '入庫' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('入庫')}
                    className={`font-medium transition-all duration-200 ${
                      statusFilter === '入庫' 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg' 
                        : 'border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 bg-white'
                    }`}
                  >
                    入庫 ({stats.warehoused})
                  </Button>
                </div>
              </div>

              {/* 篩選結果提示 */}
              {statusFilter !== "all" && (
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-pink-600" />
                    <span className="text-sm text-pink-800 font-medium">
                      顯示 {statusFilter} 狀態的工單，共 {filteredWorkOrders.length} 個
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 工單表格 */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center justify-center">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-200 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                  <span className="mt-6 text-slate-600 font-medium text-lg">載入工單資料中...</span>
                  <p className="text-slate-500 text-sm mt-2">請稍候，正在從資料庫讀取資料</p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <DataTable columns={columns} data={filteredWorkOrders} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function WorkOrdersPage() {
  return (
    <WorkOrdersPageContent />
  );
}
