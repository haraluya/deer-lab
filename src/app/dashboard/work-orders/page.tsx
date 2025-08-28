"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"

import { toast } from "sonner"
import { DataTable } from "./data-table"
import { columns } from "./columns"
import { WorkOrderColumn } from "./columns"
import { Button } from "@/components/ui/button"
import { Plus, Factory } from "lucide-react"

function WorkOrdersPageContent() {
  const router = useRouter()
  const [workOrders, setWorkOrders] = useState<WorkOrderColumn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadWorkOrders = async () => {
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
    }

    loadWorkOrders()
  }, [])

  return (
    <div className="container mx-auto py-10 work-orders-page">
      {/* 桌面版標題和按鈕 */}
      <div className="hidden lg:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            工單管理
          </h1>
          <p className="text-gray-600 mt-2">管理生產工單與進度追蹤</p>
        </div>
        <Button 
          onClick={() => router.push("/dashboard/work-orders/create")}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          建立新工單
        </Button>
      </div>

      {/* 手機版標題和按鈕 */}
      <div className="lg:hidden mb-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            工單管理
          </h1>
          <p className="text-gray-600 mt-1 text-sm">管理生產工單與進度追蹤</p>
        </div>
        <Button 
          onClick={() => router.push("/dashboard/work-orders/create")}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          建立新工單
        </Button>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">工單清單</h2>
            </div>
            <div className="text-sm text-gray-600">
              共 {workOrders.length} 個工單
            </div>
          </div>
        </div>
        
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
          <DataTable columns={columns} data={workOrders} />
        )}
      </div>
    </div>
  )
}


export default function WorkOrdersPage() {
  return (
    <WorkOrdersPageContent />
  );
}
