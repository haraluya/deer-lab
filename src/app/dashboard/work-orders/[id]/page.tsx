"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc, updateDoc, collection, getDocs, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { 
  ArrowLeft, Edit, Save, CheckCircle, AlertCircle, Clock, Package, Users, 
  Droplets, Calculator, MessageSquare, Calendar, User, Plus, X, Loader2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

interface WorkOrderData {
  id: string
  code: string
  productSnapshot: {
    code: string
    name: string
    seriesName?: string
    fragranceName: string
    fragranceCode: string
    nicotineMg: number
  }
  billOfMaterials: Array<{
    id: string
    name: string
    code: string
    type: 'fragrance' | 'material'
    quantity: number
    unit: string
    ratio?: number
    isCalculated: boolean
  }>
  targetQuantity: number
  actualQuantity: number
  status: string
  qcStatus: string
  createdAt: any
  createdByRef: any
  createdByName?: string
  notes?: string
  timeRecords?: Array<{
    id: string
    personnelId: string
    personnelName: string
    workDate: string
    startTime: string
    endTime: string
    hours: number
    minutes: number
    totalMinutes: number
  }>
}

interface Personnel {
  id: string
  name: string
  employeeId: string
}

const statusOptions = [
  { value: "未確認", label: "未確認", color: "bg-gray-100 text-gray-800" },
  { value: "進行中", label: "進行中", color: "bg-blue-100 text-blue-800" },
  { value: "待完工確認", label: "待完工確認", color: "bg-yellow-100 text-yellow-800" },
  { value: "待品檢", label: "待品檢", color: "bg-orange-100 text-orange-800" },
  { value: "已完工", label: "已完工", color: "bg-green-100 text-green-800" },
  { value: "已入庫", label: "已入庫", color: "bg-purple-100 text-purple-800" },
  { value: "已取消", label: "已取消", color: "bg-red-100 text-red-800" }
]

const qcStatusOptions = [
  { value: "未檢驗", label: "未檢驗", color: "bg-gray-100 text-gray-800" },
  { value: "檢驗中", label: "檢驗中", color: "bg-blue-100 text-blue-800" },
  { value: "檢驗通過", label: "檢驗通過", color: "bg-green-100 text-green-800" },
  { value: "檢驗失敗", label: "檢驗失敗", color: "bg-red-100 text-red-800" }
]

export default function WorkOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workOrderId = params.id as string

  const [workOrder, setWorkOrder] = useState<WorkOrderData | null>(null)
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAddTimeRecordOpen, setIsAddTimeRecordOpen] = useState(false)
  const [editData, setEditData] = useState({
    status: "",
    qcStatus: "",
    actualQuantity: 0,
    targetQuantity: 0,
    notes: ""
  })
  const [newTimeRecord, setNewTimeRecord] = useState({
    personnelId: "",
    workDate: "",
    startTime: "",
    endTime: ""
  })

  // 載入工單資料
  const fetchWorkOrder = useCallback(async () => {
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
          actualQuantity: data.actualQuantity,
          targetQuantity: data.targetQuantity,
          notes: data.notes || ""
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
  }, [workOrderId, router])

  // 載入人員資料
  const fetchPersonnel = useCallback(async () => {
    try {
      if (!db) return
      
      // 從 users 集合載入人員資料
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const personnelList = usersSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((person: any) => person.status === 'active') // 只顯示啟用狀態的人員
        .map((person: any) => ({
          id: person.id,
          name: person.name,
          employeeId: person.employeeId,
        })) as Personnel[]
      
      setPersonnel(personnelList)
    } catch (error) {
      console.error("載入人員資料失敗:", error)
    }
  }, [])

  useEffect(() => {
    fetchWorkOrder()
    fetchPersonnel()
  }, [fetchWorkOrder, fetchPersonnel])

  // 初始化新增工時紀錄表單
  useEffect(() => {
    if (isAddTimeRecordOpen) {
      const today = new Date().toISOString().split('T')[0]
      setNewTimeRecord({
        personnelId: "",
        workDate: today, // 預設今天
        startTime: "",
        endTime: ""
      })
    }
  }, [isAddTimeRecordOpen])

  // 儲存編輯資料
  const handleSave = async () => {
    if (!workOrder || !db) return

    setIsSaving(true)
    try {
      const docRef = doc(db, "workOrders", workOrderId)
      await updateDoc(docRef, {
        status: editData.status,
        qcStatus: editData.qcStatus,
        actualQuantity: editData.actualQuantity,
        targetQuantity: editData.targetQuantity,
        notes: editData.notes,
        updatedAt: Timestamp.now()
      })

      setWorkOrder(prev => prev ? {
        ...prev,
        status: editData.status,
        qcStatus: editData.qcStatus,
        actualQuantity: editData.actualQuantity,
        targetQuantity: editData.targetQuantity,
        notes: editData.notes
      } : null)

      setIsEditing(false)
      toast.success("工單資料已更新")
    } catch (error) {
      console.error("更新工單失敗:", error)
      toast.error("更新工單失敗")
    } finally {
      setIsSaving(false)
    }
  }

  // 新增工時紀錄
  const handleAddTimeRecord = async () => {
    if (!newTimeRecord.personnelId || !newTimeRecord.workDate || !newTimeRecord.startTime || !newTimeRecord.endTime) {
      toast.error("請填寫完整的工時資訊")
      return
    }

    if (!db) {
      toast.error("資料庫連線錯誤")
      return
    }

    try {
      // 驗證時間格式
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(newTimeRecord.startTime) || !timeRegex.test(newTimeRecord.endTime)) {
        toast.error("請輸入正確的時間格式 (HH:MM)")
        return
      }

      // 計算工時
      const startDateTime = new Date(`${newTimeRecord.workDate}T${newTimeRecord.startTime}`)
      const endDateTime = new Date(`${newTimeRecord.workDate}T${newTimeRecord.endTime}`)
      
      if (endDateTime <= startDateTime) {
        toast.error("結束時間必須晚於開始時間")
        return
      }

      const diffMs = endDateTime.getTime() - startDateTime.getTime()
      const totalMinutes = Math.floor(diffMs / (1000 * 60))
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60

      const selectedPersonnel = personnel.find(p => p.id === newTimeRecord.personnelId)
      if (!selectedPersonnel) {
        toast.error("找不到指定人員")
        return
      }

      const timeRecord = {
        personnelId: newTimeRecord.personnelId,
        personnelName: selectedPersonnel.name,
        workDate: newTimeRecord.workDate,
        startTime: newTimeRecord.startTime,
        endTime: newTimeRecord.endTime,
        hours,
        minutes,
        totalMinutes,
        createdAt: Timestamp.now()
      }

      // 儲存到資料庫
      await addDoc(collection(db, 'workOrderTimeRecords'), {
        workOrderId: workOrderId,
        ...timeRecord
      })

      // 更新本地狀態
      setWorkOrder(prev => prev ? {
        ...prev,
        timeRecords: [...(prev.timeRecords || []), { id: Date.now().toString(), ...timeRecord }]
      } : null)

      // 重置表單
      setNewTimeRecord({
        personnelId: "",
        workDate: new Date().toISOString().split('T')[0], // 重置為今天
        startTime: "",
        endTime: ""
      })
      setIsAddTimeRecordOpen(false)
      toast.success("工時紀錄已新增")
    } catch (error) {
      console.error("新增工時紀錄失敗:", error)
      toast.error("新增工時紀錄失敗")
    }
  }

  // 計算總人工小時
  const totalWorkHours = workOrder?.timeRecords?.reduce((total, record) => {
    return total + record.totalMinutes
  }, 0) || 0

  const totalHours = Math.floor(totalWorkHours / 60)
  const totalMinutes = totalWorkHours % 60

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">載入工單資料中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <p className="text-red-600 mb-4">工單不存在</p>
          <Button onClick={() => router.push("/dashboard/work-orders")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回工單列表
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      {/* 頁面標題 */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.back()}
          className="hover:bg-blue-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-grow">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            工單詳情
          </h1>
          <p className="text-gray-600 font-mono">{workOrder.code}</p>
        </div>
      </div>

      {/* 工單基本資料 */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <Package className="h-5 w-5" />
            工單基本資料
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-white rounded-lg border">
              <div className="text-sm text-gray-600 mb-1">生產產品名稱</div>
              <div className="font-semibold text-blue-800">{workOrder.productSnapshot.name}</div>
              <div className="text-xs text-gray-500">{workOrder.productSnapshot.seriesName}</div>
            </div>
            
            <div className="text-center p-4 bg-white rounded-lg border">
              <div className="text-sm text-gray-600 mb-1">使用香精</div>
              <div className="font-semibold text-pink-800">{workOrder.productSnapshot.fragranceName}</div>
              <div className="text-xs text-gray-500">{workOrder.productSnapshot.fragranceCode}</div>
            </div>
            
            <div className="text-center p-4 bg-white rounded-lg border">
              <div className="text-sm text-gray-600 mb-1">尼古丁濃度</div>
              <div className="font-semibold text-orange-800">{workOrder.productSnapshot.nicotineMg} mg</div>
            </div>
            
            <div className="text-center p-4 bg-white rounded-lg border">
              <div className="text-sm text-gray-600 mb-1">工單狀態</div>
              <Badge className={statusOptions.find(s => s.value === workOrder.status)?.color}>
                {workOrder.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 工單詳細資料 */}
      <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            工單詳細資料
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm text-gray-600">目前工單狀態</Label>
              {isEditing ? (
                <Select value={editData.status} onValueChange={(value) => setEditData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="mt-1">
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
              ) : (
                <div className="mt-1">
                  <Badge className={statusOptions.find(s => s.value === workOrder.status)?.color}>
                    {workOrder.status}
                  </Badge>
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm text-gray-600">生產產品名稱</Label>
              <div className="mt-1 font-medium text-gray-900">{workOrder.productSnapshot.name}</div>
            </div>

            <div>
              <Label className="text-sm text-gray-600">產品系列</Label>
              <div className="mt-1 font-medium text-gray-900">{workOrder.productSnapshot.seriesName || '未指定'}</div>
            </div>

            <div>
              <Label className="text-sm text-gray-600">目標產量 (KG)</Label>
              {isEditing && workOrder.status !== '已完工' && workOrder.status !== '已入庫' ? (
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={editData.targetQuantity}
                  onChange={(e) => setEditData(prev => ({ ...prev, targetQuantity: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 font-medium text-gray-900">{workOrder.targetQuantity} KG</div>
              )}
            </div>
          </div>

          {/* 編輯按鈕 */}
          <div className="mt-4 flex justify-end">
            {isEditing ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  取消
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      儲存中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      儲存
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Edit className="mr-2 h-4 w-4" />
                編輯
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 香精物料清單 (BOM表) */}
      <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="text-purple-800 flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            香精物料清單 (BOM表)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>物料名稱</TableHead>
                  <TableHead>代號</TableHead>
                  <TableHead>類型</TableHead>
                  <TableHead>比例</TableHead>
                  <TableHead>需求數量</TableHead>
                  <TableHead>單位</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrder.billOfMaterials.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-mono text-sm">{item.code}</TableCell>
                    <TableCell>
                      <Badge variant={item.type === 'fragrance' ? 'default' : 'secondary'}>
                        {item.type === 'fragrance' ? '香精' : '物料'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.isCalculated && item.ratio ? `${item.ratio}%` : '-'}
                    </TableCell>
                    <TableCell className="font-medium">{item.quantity.toFixed(3)}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 工時申報 */}
      <Card className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              工時申報
            </CardTitle>
            <Button
              onClick={() => setIsAddTimeRecordOpen(true)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              新增工時紀錄
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 總人工小時統計 */}
          <div className="mb-6 p-4 bg-white rounded-lg border">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">總人工小時</div>
              <div className="text-2xl font-bold text-orange-600">
                {totalHours} 小時 {totalMinutes} 分鐘
              </div>
              <div className="text-xs text-gray-500">共 {workOrder.timeRecords?.length || 0} 筆紀錄</div>
            </div>
          </div>

          {/* 工時紀錄列表 */}
          {workOrder.timeRecords && workOrder.timeRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>人員</TableHead>
                    <TableHead>工作日期</TableHead>
                    <TableHead>開始時間</TableHead>
                    <TableHead>結束時間</TableHead>
                    <TableHead>工時小計</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrder.timeRecords.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{record.personnelName}</TableCell>
                      <TableCell>{record.workDate}</TableCell>
                      <TableCell>{record.startTime}</TableCell>
                      <TableCell>{record.endTime}</TableCell>
                      <TableCell className="font-medium">
                        {record.hours} 小時 {record.minutes} 分鐘
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>尚無工時紀錄</p>
              <p className="text-sm">點擊上方按鈕新增工時紀錄</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 留言欄位 */}
      <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            留言
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={editData.notes}
              onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="輸入留言內容..."
              className="min-h-[100px]"
            />
          ) : (
            <div className="min-h-[100px] bg-white rounded-lg border p-4">
              {workOrder.notes ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{workOrder.notes}</p>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">暫無留言</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新增工時紀錄對話框 */}
      <Dialog open={isAddTimeRecordOpen} onOpenChange={setIsAddTimeRecordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增工時紀錄</DialogTitle>
            <DialogDescription>
              請填寫工時紀錄的詳細資訊
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="personnel">選擇人員</Label>
              <Select value={newTimeRecord.personnelId} onValueChange={(value) => setNewTimeRecord(prev => ({ ...prev, personnelId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="請選擇人員" />
                </SelectTrigger>
                <SelectContent>
                  {personnel.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name} ({person.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="workDate">工作日期</Label>
              <Input
                id="workDate"
                type="date"
                value={newTimeRecord.workDate}
                onChange={(e) => setNewTimeRecord(prev => ({ ...prev, workDate: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">開始時間 (24小時制)</Label>
                <div className="flex gap-2 mt-1">
                  <Select 
                    value={newTimeRecord.startTime.split(':')[0] || ''} 
                    onValueChange={(hour) => {
                      const currentMinute = newTimeRecord.startTime.split(':')[1] || '00'
                      setNewTimeRecord(prev => ({ 
                        ...prev, 
                        startTime: `${hour.padStart(2, '0')}:${currentMinute}` 
                      }))
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="時" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="flex items-center text-gray-500">:</span>
                  <Select 
                    value={newTimeRecord.startTime.split(':')[1] || ''} 
                    onValueChange={(minute) => {
                      const currentHour = newTimeRecord.startTime.split(':')[0] || '00'
                      setNewTimeRecord(prev => ({ 
                        ...prev, 
                        startTime: `${currentHour}:${minute.padStart(2, '0')}` 
                      }))
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="分" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 60 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-gray-500 mt-1">格式：HH:MM (例如：09:30, 14:00)</p>
              </div>
              <div>
                <Label htmlFor="endTime">結束時間 (24小時制)</Label>
                <div className="flex gap-2 mt-1">
                  <Select 
                    value={newTimeRecord.endTime.split(':')[0] || ''} 
                    onValueChange={(hour) => {
                      const currentMinute = newTimeRecord.endTime.split(':')[1] || '00'
                      setNewTimeRecord(prev => ({ 
                        ...prev, 
                        endTime: `${hour.padStart(2, '0')}:${currentMinute}` 
                      }))
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="時" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="flex items-center text-gray-500">:</span>
                  <Select 
                    value={newTimeRecord.endTime.split(':')[1] || ''} 
                    onValueChange={(minute) => {
                      const currentHour = newTimeRecord.endTime.split(':')[0] || '00'
                      setNewTimeRecord(prev => ({ 
                        ...prev, 
                        endTime: `${currentHour}:${minute.padStart(2, '0')}` 
                      }))
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="分" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 60 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-gray-500 mt-1">格式：HH:MM (例如：17:30, 18:00)</p>
              </div>
            </div>

            {/* 預覽工時計算 */}
            {newTimeRecord.startTime && newTimeRecord.endTime && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-1">工時預覽：</div>
                  <div>開始：{newTimeRecord.startTime}</div>
                  <div>結束：{newTimeRecord.endTime}</div>
                  {(() => {
                    try {
                      const startDateTime = new Date(`${newTimeRecord.workDate}T${newTimeRecord.startTime}`)
                      const endDateTime = new Date(`${newTimeRecord.workDate}T${newTimeRecord.endTime}`)
                      if (endDateTime > startDateTime) {
                        const diffMs = endDateTime.getTime() - startDateTime.getTime()
                        const totalMinutes = Math.floor(diffMs / (1000 * 60))
                        const hours = Math.floor(totalMinutes / 60)
                        const minutes = totalMinutes % 60
                        return (
                          <div className="font-semibold text-green-700 mt-1">
                            工時：{hours} 小時 {minutes} 分鐘
                          </div>
                        )
                      } else {
                        return <div className="text-red-600 mt-1">⚠️ 結束時間必須晚於開始時間</div>
                      }
                    } catch (error) {
                      return <div className="text-red-600 mt-1">⚠️ 時間格式錯誤</div>
                    }
                  })()}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTimeRecordOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleAddTimeRecord} 
              className="bg-orange-600 hover:bg-orange-700"
              disabled={!newTimeRecord.personnelId || !newTimeRecord.workDate || !newTimeRecord.startTime || !newTimeRecord.endTime}
            >
              <Plus className="mr-2 h-4 w-4" />
              新增紀錄
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
