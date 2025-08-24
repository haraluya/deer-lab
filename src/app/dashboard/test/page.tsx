"use client"

import { useState } from "react"
import { collection, addDoc, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AuthWrapper } from '@/components/AuthWrapper'
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TestTube, Database, Loader2 } from "lucide-react"

function TestPageContent() {
  const [testing, setTesting] = useState(false)

  const testWorkOrderCreation = async () => {
    setTesting(true)
    try {
      // 建立測試工單
      const testWorkOrder = {
        code: "WO-TEST-001",
        productSnapshot: {
          code: "TEST-PROD",
          name: "測試產品",
          fragranceName: "測試香精",
          nicotineMg: 3
        },
        billOfMaterials: [
          {
            materialId: "test-material-1",
            materialCode: "MAT-001",
            materialName: "測試物料1",
            quantity: 100,
            unit: "g"
          }
        ],
        targetQuantity: 1000,
        actualQuantity: 0,
        status: "未確認",
        qcStatus: "未檢驗",
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const docRef = await addDoc(collection(db, "workOrders"), testWorkOrder)
      toast.success(`測試工單建立成功，ID: ${docRef.id}`)
      
      // 讀取所有工單
      const querySnapshot = await getDocs(collection(db, "workOrders"))
      toast.success(`總共有 ${querySnapshot.size} 個工單`)
      
    } catch (error) {
      console.error("測試失敗:", error)
      toast.error("測試失敗")
    } finally {
      setTesting(false)
    }
  }

  const testInventoryAdjustment = async () => {
    setTesting(true)
    try {
      // 建立測試物料
      const testMaterial = {
        code: "TEST-MAT",
        name: "測試物料",
        currentStock: 100,
        minStock: 50,
        maxStock: 200,
        unit: "g",
        status: "active"
      }

      const docRef = await addDoc(collection(db, "materials"), testMaterial)
      toast.success(`測試物料建立成功，ID: ${docRef.id}`)
      
    } catch (error) {
      console.error("測試失敗:", error)
      toast.error("測試失敗")
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            功能測試頁面
          </h1>
          <p className="text-gray-600 mt-2">測試系統各項功能是否正常運作</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold text-blue-700">工單功能測試</CardTitle>
            <TestTube className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-600 mb-4">
              測試工單建立和查詢功能
            </p>
            <Button 
              onClick={testWorkOrderCreation}
              disabled={testing}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  測試中...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  測試工單建立
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold text-green-700">庫存功能測試</CardTitle>
            <Database className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-600 mb-4">
              測試庫存調整和物料管理功能
            </p>
            <Button 
              onClick={testInventoryAdjustment}
              disabled={testing}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  測試中...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  測試庫存調整
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


export default function TestPage() {
  return (
    <AuthWrapper>
      <TestPageContent />
    </AuthWrapper>
  );
}
