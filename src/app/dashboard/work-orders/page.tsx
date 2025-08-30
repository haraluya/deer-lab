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
import { Plus, Factory, Filter, ChevronLeft, ChevronRight } from "lucide-react"


function WorkOrdersPageContent() {
  const router = useRouter()
  const [workOrders, setWorkOrders] = useState<WorkOrderColumn[]>([])
  const [filteredWorkOrders, setFilteredWorkOrders] = useState<WorkOrderColumn[]>([])
  const [loading, setLoading] = useState(true)
  
  // 篩選和分頁狀態
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  


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
    setCurrentPage(1) // 重置到第一頁
  }, [workOrders, statusFilter])

  // 分頁計算
  const paginatedWorkOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredWorkOrders.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredWorkOrders, currentPage, itemsPerPage])

  const totalPages = useMemo(() => {
    return Math.ceil(filteredWorkOrders.length / itemsPerPage)
  }, [filteredWorkOrders.length, itemsPerPage])

  useEffect(() => {
    loadWorkOrders()
  }, [loadWorkOrders])

  const handleCreateWorkOrder = () => {
    router.push("/dashboard/work-orders/create")
  }



  return (
    <div className="container mx-auto py-10 work-orders-page">
      {/* 頁面標題 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          工單管理
        </h1>
        <p className="text-gray-600 mt-2">管理生產工單與進度追蹤</p>
      </div>

      {/* 工單清單區域 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-blue-600" />
              <CardTitle>工單清單</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleCreateWorkOrder}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                建立新工單
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 狀態篩選 */}
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">狀態篩選：</span>
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              全部
            </Button>
            <Button
              variant={statusFilter === '預報' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('預報')}
              className={statusFilter === '預報' ? 'bg-orange-500 hover:bg-orange-600' : 'border-orange-200 text-orange-600 hover:bg-orange-50'}
            >
              預報
            </Button>
            <Button
              variant={statusFilter === '進行' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('進行')}
              className={statusFilter === '進行' ? 'bg-blue-500 hover:bg-blue-600' : 'border-blue-200 text-blue-600 hover:bg-blue-50'}
            >
              進行
            </Button>
            <Button
              variant={statusFilter === '完工' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('完工')}
              className={statusFilter === '完工' ? 'bg-green-500 hover:bg-green-600' : 'border-green-200 text-green-600 hover:bg-green-50'}
            >
              完工
            </Button>
            <Button
              variant={statusFilter === '入庫' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('入庫')}
              className={statusFilter === '入庫' ? 'bg-gray-600 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}
            >
              入庫
            </Button>
          </div>

          {/* 統計資訊 */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              共 {filteredWorkOrders.length} 個工單
              {statusFilter !== "all" && ` (${statusFilter}狀態)`}
            </div>
            <div className="text-sm text-gray-600">
              第 {currentPage} 頁，共 {totalPages} 頁
            </div>
          </div>

          {/* 工單表格 */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
                  <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                </div>
                <span className="mt-4 text-gray-600 font-medium">載入工單資料中...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <DataTable columns={columns} data={paginatedWorkOrders} />
              </div>

              {/* 分頁控制 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={currentPage === pageNum ? "bg-blue-600 hover:bg-blue-700" : "border-blue-200 text-blue-600 hover:bg-blue-50"}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>


    </div>
  )
}

export default function WorkOrdersPage() {
  return (
    <WorkOrdersPageContent />
  );
}
