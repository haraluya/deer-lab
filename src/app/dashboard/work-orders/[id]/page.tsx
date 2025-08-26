"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { ArrowLeft, Edit, Save, CheckCircle, AlertCircle, Clock, Package, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TimeTrackingDialog } from "./TimeTrackingDialog"

interface WorkOrderData {
  id: string
  code: string
  productSnapshot: {
    code: string
    name: string
    fragranceName: string
    nicotineMg: number
  }
  billOfMaterials: Array<{
    name: string
    code: string
    quantity: number
    unit: string
  }>
  targetQuantity: number
  actualQuantity: number
  status: string
  qcStatus: string
  createdAt: any
  createdByRef: any
}

const statusOptions = [
  { value: "未確認", label: "未確認", color: "bg-muted text-muted-foreground" },
  { value: "進行中", label: "進行中", color: "bg-primary/10 text-primary" },
  { value: "待完工確認", label: "待完工確認", color: "bg-warning/10 text-warning" },
  { value: "待品檢", label: "待品檢", color: "bg-orange-100 text-orange-800" },
  { value: "已完工", label: "已完工", color: "bg-success/10 text-success" },
  { value: "已入庫", label: "已入庫", color: "bg-purple-100 text-purple-800" },
  { value: "已取消", label: "已取消", color: "bg-destructive/10 text-destructive" }
]

const qcStatusOptions = [
  { value: "未檢驗", label: "未檢驗", color: "bg-muted text-muted-foreground" },
  { value: "檢驗中", label: "檢驗中", color: "bg-primary/10 text-primary" },
  { value: "檢驗通過", label: "檢驗通過", color: "bg-success/10 text-success" },
  { value: "檢驗失敗", label: "檢驗失敗", color: "bg-destructive/10 text-destructive" }
]

export default function WorkOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workOrderId = params.id as string

  const [workOrder, setWorkOrder] = useState<WorkOrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTimeTrackingOpen, setIsTimeTrackingOpen] = useState(false)
  const [editData, setEditData] = useState({
    status: "",
    qcStatus: "",
    actualQuantity: 0
  })

  useEffect(() => {
    const fetchWorkOrder = async () => {
      try {
        if (!db) {
          throw new Error("Firebase 未初始化")
        }
        const docRef = doc(db, "workOrders", workOrderId)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data() as WorkOrderData
          setWorkOrder({ ...data, id: docSnap.id })
          setEditData({
            status: data.status,
            qcStatus: data.qcStatus,
            actualQuantity: data.actualQuantity
          })
        } else {
          toast.error("工單不存在")
          router.push("/dashboard/work-orders")
        }
      } catch (error) {
        console.error("讀取工單資料失敗:", error)
        toast.error("讀取工單資料失敗")
      } finally {
        setLoading(false)
      }
    }

    fetchWorkOrder()
  }, [workOrderId, router])

  const handleSave = async () => {
    if (!workOrder) return

    setIsSaving(true)
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      const docRef = doc(db, "workOrders", workOrderId)
      await updateDoc(docRef, {
        status: editData.status,
        qcStatus: editData.qcStatus,
        actualQuantity: editData.actualQuantity,
        updatedAt: new Date()
      })

      setWorkOrder({
        ...workOrder,
        status: editData.status,
        qcStatus: editData.qcStatus,
        actualQuantity: editData.actualQuantity
      })
      
      setIsEditing(false)
      toast.success("工單更新成功")
    } catch (error) {
      console.error("更新工單失敗:", error)
      toast.error("更新工單失敗")
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status)
    return option?.color || "bg-muted text-muted-foreground"
  }

  const getQCStatusColor = (status: string) => {
    const option = qcStatusOptions.find(opt => opt.value === status)
    return option?.color || "bg-muted text-muted-foreground"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">載入中...</div>
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">工單不存在</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      {/* 頁面標題區域 */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.back()}
          className="hover:bg-primary/10 hover:border-primary/20"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-grow">
          <h1 className="text-3xl font-bold text-primary">
            工單詳情
          </h1>
          <p className="text-muted-foreground font-mono">{workOrder.code}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsTimeTrackingOpen(true)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Users className="h-4 w-4 mr-2" />
            工時追蹤
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Edit className="h-4 w-4 mr-2" />
            {isEditing ? "取消編輯" : "編輯"}
          </Button>
        </div>
      </div>

      {/* 工單基本資訊卡片 */}
      <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-background to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-white" />
            </div>
            工單基本資訊
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 產品名稱 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">產品名稱</p>
                <p className="text-lg font-semibold text-blue-800">{workOrder.productSnapshot.name}</p>
              </div>
            </div>

            {/* 產品代號 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">產品代號</p>
                <p className="text-lg font-semibold text-green-800">{workOrder.productSnapshot.code}</p>
              </div>
            </div>

            {/* 香精 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">香精</p>
                <p className="text-lg font-semibold text-purple-800">{workOrder.productSnapshot.fragranceName}</p>
              </div>
            </div>

            {/* 尼古丁濃度 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">尼古丁濃度</p>
                <p className="text-lg font-semibold text-orange-800">{workOrder.productSnapshot.nicotineMg} mg/ml</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 工單詳細資訊 */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg text-primary">工單狀態</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {isEditing ? (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="status">工單狀態</Label>
                    <Select value={editData.status} onValueChange={(value) => setEditData({...editData, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="qcStatus">品檢狀態</Label>
                    <Select value={editData.qcStatus} onValueChange={(value) => setEditData({...editData, qcStatus: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {qcStatusOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="actualQuantity">實際產量 (g)</Label>
                    <Input
                      type="number"
                      value={editData.actualQuantity}
                      onChange={(e) => setEditData({...editData, actualQuantity: Number(e.target.value)})}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleSave} disabled={isSaving} className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "儲存中..." : "儲存變更"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">工單狀態</Label>
                    <Badge className={getStatusColor(workOrder.status)}>
                      {workOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">品檢狀態</Label>
                    <Badge className={getQCStatusColor(workOrder.qcStatus)}>
                      {workOrder.qcStatus}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">目標產量</Label>
                    <p className="text-lg font-semibold">{workOrder.targetQuantity} g</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">實際產量</Label>
                    <p className="text-lg font-semibold">{workOrder.actualQuantity} g</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 物料清單 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                物料清單 (BOM)
              </CardTitle>
              <CardDescription>生產此工單所需的物料清單</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>物料代號</TableHead>
                    <TableHead>物料名稱</TableHead>
                    <TableHead className="text-right">需求量</TableHead>
                    <TableHead>單位</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrder.billOfMaterials.map((material, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{material.code}</TableCell>
                      <TableCell>{material.name}</TableCell>
                      <TableCell className="text-right font-medium">
                        {material.quantity.toFixed(3)}
                      </TableCell>
                      <TableCell>{material.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* 側邊欄 */}
        <div className="space-y-6">
          {/* 狀態卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">工單狀態</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(workOrder.status).replace('bg-', '').replace(' text-', '')}`}></div>
                <span className="font-medium">{workOrder.status}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getQCStatusColor(workOrder.qcStatus).replace('bg-', '').replace(' text-', '')}`}></div>
                <span className="font-medium">{workOrder.qcStatus}</span>
              </div>
            </CardContent>
          </Card>

          {/* 進度卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">生產進度</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">目標產量</span>
                  <span className="font-medium">{workOrder.targetQuantity} g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">實際產量</span>
                  <span className="font-medium">{workOrder.actualQuantity} g</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((workOrder.actualQuantity / workOrder.targetQuantity) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="text-center text-sm text-gray-500">
                  {Math.round((workOrder.actualQuantity / workOrder.targetQuantity) * 100)}% 完成
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 時間資訊 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">時間資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">建立時間</span>
                <span className="text-sm">
                  {workOrder.createdAt?.toDate?.()?.toLocaleString() || "未知"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 工時追蹤對話框 */}
      <TimeTrackingDialog
        isOpen={isTimeTrackingOpen}
        onOpenChange={setIsTimeTrackingOpen}
        workOrderId={workOrderId}
      />
    </div>
  )
}
