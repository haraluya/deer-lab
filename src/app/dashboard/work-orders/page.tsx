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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Factory, Calculator, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { RecipeCalculatorDialog } from "./RecipeCalculatorDialog"

function WorkOrdersPageContent() {
  const router = useRouter()
  const [workOrders, setWorkOrders] = useState<WorkOrderColumn[]>([])
  const [filteredWorkOrders, setFilteredWorkOrders] = useState<WorkOrderColumn[]>([])
  const [loading, setLoading] = useState(true)
  
  // 篩選和分頁狀態
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // 配方計算機對話框狀態
  const [isRecipeCalculatorOpen, setIsRecipeCalculatorOpen] = useState(false)

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
          status: data.status || "未確認",
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

    // 搜尋篩選
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.productName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredWorkOrders(filtered)
    setCurrentPage(1) // 重置到第一頁
  }, [workOrders, statusFilter, searchTerm])

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

  const handleRecipeCalculator = () => {
    setIsRecipeCalculatorOpen(true)
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
                onClick={handleRecipeCalculator}
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Calculator className="mr-2 h-4 w-4" />
                配方計算機
              </Button>
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
          {/* 篩選和搜尋區域 */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">狀態篩選：</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="未確認">未確認</SelectItem>
                  <SelectItem value="進行中">進行中</SelectItem>
                  <SelectItem value="待完工確認">待完工確認</SelectItem>
                  <SelectItem value="待品檢">待品檢</SelectItem>
                  <SelectItem value="已完工">已完工</SelectItem>
                  <SelectItem value="已入庫">已入庫</SelectItem>
                  <SelectItem value="已取消">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜尋工單號碼或產品名稱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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

      {/* 配方計算機對話框 */}
      <RecipeCalculatorDialog
        isOpen={isRecipeCalculatorOpen}
        onOpenChange={setIsRecipeCalculatorOpen}
        onWorkOrderCreated={loadWorkOrders}
      />
    </div>
  )
}

export default function WorkOrdersPage() {
  return (
    <WorkOrdersPageContent />
  );
}
