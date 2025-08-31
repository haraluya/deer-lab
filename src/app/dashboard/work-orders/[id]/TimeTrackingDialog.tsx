"use client"

import { useState, useEffect } from "react"
import { collection, addDoc, getDocs, query, where, orderBy, doc, deleteDoc, updateDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { Clock, User, Plus, Trash2, Edit2, Calendar, Save, X, ChevronDown, ChevronUp, Users, Timer, ClipboardList, Zap, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface Personnel {
  id: string
  name: string
  employeeId: string
}

interface TimeEntry {
  id: string
  workOrderId: string
  workOrderNumber?: string
  personnelId: string
  personnelName: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  startDateTime?: Timestamp
  endDateTime?: Timestamp
  duration: number // 小時
  overtimeHours?: number
  notes?: string
  status?: 'draft' | 'confirmed' | 'locked'
  createdAt: any
  updatedAt?: any
}

interface TimeTrackingDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  workOrderId: string
  workOrderNumber?: string
  isLocked?: boolean
}

export function TimeTrackingDialog({ isOpen, onOpenChange, workOrderId, workOrderNumber, isLocked = false }: TimeTrackingDialogProps) {
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  const [batchMode, setBatchMode] = useState(false)
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([])
  
  const [newEntry, setNewEntry] = useState({
    personnelId: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    notes: ""
  })
  
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, workOrderId])

  const loadData = async () => {
    setLoading(true)
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      
      // 載入人員資料
      const personnelSnapshot = await getDocs(collection(db, "users"))
      const personnelList = personnelSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        employeeId: doc.data().employeeId,
        ...doc.data()
      })) as Personnel[]
      setPersonnel(personnelList)

      // 載入工時記錄
      const timeEntriesQuery = query(
        collection(db, "timeEntries"),
        where("workOrderId", "==", workOrderId),
        orderBy("createdAt", "desc")
      )
      const timeEntriesSnapshot = await getDocs(timeEntriesQuery)
      const timeEntriesList = timeEntriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TimeEntry[]
      setTimeEntries(timeEntriesList)
    } catch (error) {
      console.error("載入資料失敗:", error)
      toast.error("載入資料失敗")
    } finally {
      setLoading(false)
    }
  }

  const calculateDuration = (startDate: string, startTime: string, endDate: string, endTime: string): number => {
    if (!startDate || !startTime || !endDate || !endTime) return 0
    
    const start = new Date(`${startDate}T${startTime}`)
    const end = new Date(`${endDate}T${endTime}`)
    
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60) // 轉換為小時
  }

  const handleAddTimeEntry = async () => {
    if (isLocked) {
      toast.error("工單已入庫，無法新增工時記錄")
      return
    }

    if (batchMode) {
      // 批量新增模式
      if (selectedPersonnel.length === 0 || !newEntry.startDate || !newEntry.startTime || !newEntry.endDate || !newEntry.endTime) {
        toast.error("請選擇人員並填寫完整時間資訊")
        return
      }

      const duration = calculateDuration(newEntry.startDate, newEntry.startTime, newEntry.endDate, newEntry.endTime)
      if (duration <= 0) {
        toast.error("結束時間必須晚於開始時間")
        return
      }

      setSaving(true)
      try {
        const promises = selectedPersonnel.map(async (personId) => {
          const person = personnel.find(p => p.id === personId)
          if (!person) return

          const timeEntryData = {
            workOrderId,
            workOrderNumber,
            personnelId: personId,
            personnelName: person.name,
            startDate: newEntry.startDate,
            startTime: newEntry.startTime,
            endDate: newEntry.endDate,
            endTime: newEntry.endTime,
            startDateTime: Timestamp.fromDate(new Date(`${newEntry.startDate}T${newEntry.startTime}`)),
            endDateTime: Timestamp.fromDate(new Date(`${newEntry.endDate}T${newEntry.endTime}`)),
            duration,
            overtimeHours: calculateOvertimeHours(duration),
            notes: newEntry.notes,
            status: 'draft' as const,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          }

          await addDoc(collection(db!, "timeEntries"), timeEntryData)
        })

        await Promise.all(promises)
        toast.success(`已批量新增 ${selectedPersonnel.length} 筆工時記錄`)
        setSelectedPersonnel([])
      } catch (error) {
        console.error("批量新增工時記錄失敗:", error)
        toast.error("批量新增工時記錄失敗")
      } finally {
        setSaving(false)
        loadData()
      }
    } else {
      // 單一新增模式
      if (!newEntry.personnelId || !newEntry.startDate || !newEntry.startTime || !newEntry.endDate || !newEntry.endTime) {
        toast.error("請填寫完整資訊")
        return
      }

      const duration = calculateDuration(newEntry.startDate, newEntry.startTime, newEntry.endDate, newEntry.endTime)
      if (duration <= 0) {
        toast.error("結束時間必須晚於開始時間")
        return
      }

      const selectedPerson = personnel.find(p => p.id === newEntry.personnelId)
      if (!selectedPerson) {
        toast.error("找不到指定人員")
        return
      }

      setSaving(true)
      try {
        const timeEntryData = {
          workOrderId,
          workOrderNumber,
          personnelId: newEntry.personnelId,
          personnelName: selectedPerson.name,
          startDate: newEntry.startDate,
          startTime: newEntry.startTime,
          endDate: newEntry.endDate,
          endTime: newEntry.endTime,
          startDateTime: Timestamp.fromDate(new Date(`${newEntry.startDate}T${newEntry.startTime}`)),
          endDateTime: Timestamp.fromDate(new Date(`${newEntry.endDate}T${newEntry.endTime}`)),
          duration,
          overtimeHours: calculateOvertimeHours(duration),
          notes: newEntry.notes,
          status: 'draft' as const,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        }

        await addDoc(collection(db!, "timeEntries"), timeEntryData)
        toast.success("工時記錄已新增")
      } catch (error) {
        console.error("新增工時記錄失敗:", error)
        toast.error("新增工時記錄失敗")
      } finally {
        setSaving(false)
        loadData()
      }
    }

    // 重置表單
    setNewEntry({
      personnelId: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      notes: ""
    })
  }

  const calculateOvertimeHours = (totalHours: number): number => {
    // 超過 8 小時算加班
    return Math.max(0, totalHours - 8)
  }

  const handleEditTimeEntry = async (entry: TimeEntry) => {
    if (isLocked) {
      toast.error("工單已入庫，無法編輯工時記錄")
      return
    }
    setEditingId(entry.id)
    setEditEntry({
      ...entry,
      startDate: entry.startDate,
      startTime: entry.startTime,
      endDate: entry.endDate,
      endTime: entry.endTime
    })
  }

  const handleSaveEdit = async () => {
    if (!editEntry || !editingId) return

    const duration = calculateDuration(editEntry.startDate, editEntry.startTime, editEntry.endDate, editEntry.endTime)
    if (duration <= 0) {
      toast.error("結束時間必須晚於開始時間")
      return
    }

    setSaving(true)
    try {
      await updateDoc(doc(db!, "timeEntries", editingId), {
        startDate: editEntry.startDate,
        startTime: editEntry.startTime,
        endDate: editEntry.endDate,
        endTime: editEntry.endTime,
        startDateTime: Timestamp.fromDate(new Date(`${editEntry.startDate}T${editEntry.startTime}`)),
        endDateTime: Timestamp.fromDate(new Date(`${editEntry.endDate}T${editEntry.endTime}`)),
        duration,
        overtimeHours: calculateOvertimeHours(duration),
        notes: editEntry.notes,
        updatedAt: Timestamp.now()
      })

      toast.success("工時記錄已更新")
      setEditingId(null)
      setEditEntry(null)
      loadData()
    } catch (error) {
      console.error("更新工時記錄失敗:", error)
      toast.error("更新工時記錄失敗")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTimeEntry = async (id: string) => {
    if (isLocked) {
      toast.error("工單已入庫，無法刪除工時記錄")
      return
    }

    if (!confirm("確定要刪除這筆工時記錄嗎？")) return

    try {
      await deleteDoc(doc(db!, "timeEntries", id))
      toast.success("工時記錄已刪除")
      loadData()
    } catch (error) {
      console.error("刪除工時記錄失敗:", error)
      toast.error("刪除工時記錄失敗")
    }
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedEntries)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedEntries(newExpanded)
  }

  const getTotalHours = () => {
    return timeEntries.reduce((total, entry) => total + entry.duration, 0)
  }

  const getTotalManHours = () => {
    return timeEntries.reduce((total, entry) => total + entry.duration, 0)
  }

  const formatTime = (time: string) => {
    return time.substring(0, 5) // 只顯示 HH:MM
  }

  const formatDuration = (hours: number) => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}小時${minutes > 0 ? `${minutes}分鐘` : ''}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="time-tracking-dialog-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            工時追蹤
          </DialogTitle>
          <DialogDescription id="time-tracking-dialog-description">
            記錄工單的工時資訊，包含人員、時間段和備註
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 統計資訊 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-blue-800">總記錄數</CardTitle>
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <ClipboardList className="h-4 w-4 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900 mb-1">{timeEntries.length}</div>
                <p className="text-xs text-blue-600 font-medium">筆工時記錄</p>
              </CardContent>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-600/10 pointer-events-none" />
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-100 border-2 border-emerald-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-emerald-800">總工時</CardTitle>
                  <div className="p-2 bg-emerald-500 rounded-lg">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-900 mb-1">{formatDuration(getTotalHours())}</div>
                <p className="text-xs text-emerald-600 font-medium">累計工作時間</p>
              </CardContent>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-emerald-600/10 pointer-events-none" />
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-violet-100 border-2 border-purple-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-purple-800">人工總時</CardTitle>
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-900 mb-1">{formatDuration(getTotalManHours())}</div>
                <p className="text-xs text-purple-600 font-medium">總人工工時</p>
              </CardContent>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-purple-600/10 pointer-events-none" />
            </Card>
          </div>

          {/* 新增工時記錄 */}
          {!isLocked && (
            <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Plus className="h-4 w-4" />
                    新增工時記錄
                  </CardTitle>
                  <Button
                    variant={batchMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBatchMode(!batchMode)}
                    className="gap-2"
                  >
                    <Users className="h-4 w-4" />
                    {batchMode ? "批量模式" : "單一模式"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 人員選擇 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    {batchMode ? "選擇多個人員" : "選擇人員"}
                  </Label>
                  {batchMode ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {personnel.map((person) => (
                        <label
                          key={person.id}
                          className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-blue-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPersonnel.includes(person.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPersonnel([...selectedPersonnel, person.id])
                              } else {
                                setSelectedPersonnel(selectedPersonnel.filter(id => id !== person.id))
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm">
                            {person.name}
                            <span className="text-xs text-gray-500 ml-1">({person.employeeId})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <Select value={newEntry.personnelId} onValueChange={(value) => setNewEntry({...newEntry, personnelId: value})}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="選擇人員" />
                      </SelectTrigger>
                      <SelectContent>
                        {personnel.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.name} ({person.employeeId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* 工作日期 */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    工作日期
                  </Label>
                  <Input
                    type="date"
                    value={newEntry.startDate}
                    onChange={(e) => setNewEntry({
                      ...newEntry, 
                      startDate: e.target.value,
                      endDate: e.target.value // 預設結束日期為同一天
                    })}
                    className="bg-white border-2 border-blue-200 focus:border-blue-500 focus:ring-blue-200"
                  />
                </div>

                {/* 時間輸入區 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 開始時間 */}
                  <div className="space-y-4 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-green-800">上班時間</h3>
                        <p className="text-xs text-green-600">設定開始工作時間</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-green-700">時間 (24小時制)</Label>
                      <div className="relative">
                        <Input
                          type="time"
                          value={newEntry.startTime}
                          onChange={(e) => setNewEntry({...newEntry, startTime: e.target.value})}
                          className="text-lg font-mono bg-white border-2 border-green-300 focus:border-green-500 focus:ring-green-200 pl-12 text-gray-900 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:text-gray-900 [&::-webkit-datetime-edit-text]:text-gray-900 [&::-webkit-datetime-edit-hour-field]:text-gray-900 [&::-webkit-datetime-edit-minute-field]:text-gray-900 [color:black] dark:[color-scheme:dark]"
                          style={{ colorScheme: 'light', color: 'black' }}
                          placeholder="09:00"
                        />
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                      </div>
                      <p className="text-xs text-green-600 bg-green-100 p-2 rounded">
                        格式：HH:MM (例如：09:30, 14:00)
                      </p>
                    </div>
                  </div>

                  {/* 結束時間 */}
                  <div className="space-y-4 p-6 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border-2 border-red-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500 rounded-lg">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-red-800">下班時間</h3>
                        <p className="text-xs text-red-600">設定結束工作時間</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-red-700">時間 (24小時制)</Label>
                      <div className="relative">
                        <Input
                          type="time"
                          value={newEntry.endTime}
                          onChange={(e) => setNewEntry({
                            ...newEntry, 
                            endTime: e.target.value,
                            endDate: newEntry.startDate // 自動同步結束日期
                          })}
                          className="text-lg font-mono bg-white border-2 border-red-300 focus:border-red-500 focus:ring-red-200 pl-12 text-gray-900 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:text-gray-900 [&::-webkit-datetime-edit-text]:text-gray-900 [&::-webkit-datetime-edit-hour-field]:text-gray-900 [&::-webkit-datetime-edit-minute-field]:text-gray-900 [color:black] dark:[color-scheme:dark]"
                          style={{ colorScheme: 'light', color: 'black' }}
                          placeholder="18:00"
                        />
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500" />
                      </div>
                      <p className="text-xs text-red-600 bg-red-100 p-2 rounded">
                        格式：HH:MM (例如：17:30, 18:00)
                      </p>
                    </div>
                  </div>
                </div>

                {/* 備註 */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Edit2 className="h-4 w-4 text-purple-600" />
                    備註說明
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="輸入工作內容或特殊註意事項..."
                      value={newEntry.notes}
                      onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                      className="bg-gradient-to-r from-white to-purple-50 border-2 border-purple-200 focus:border-purple-500 focus:ring-purple-200 pl-10"
                    />
                    <Edit2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-500" />
                  </div>
                </div>

                {/* 快速時間設定 */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-600" />
                    快速設定
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewEntry({...newEntry, startTime: '09:00', endTime: '18:00'})}
                      className="gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100"
                    >
                      <Clock className="h-3 w-3" />
                      日班 9-6
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewEntry({...newEntry, startTime: '08:00', endTime: '17:00'})}
                      className="gap-2 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:from-green-100 hover:to-emerald-100"
                    >
                      <Clock className="h-3 w-3" />
                      早班 8-5
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewEntry({...newEntry, startTime: '14:00', endTime: '22:00'})}
                      className="gap-2 bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 hover:from-purple-100 hover:to-violet-100"
                    >
                      <Clock className="h-3 w-3" />
                      晚班 2-10
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewEntry({...newEntry, startTime: '09:00', endTime: '13:00'})}
                      className="gap-2 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 hover:from-orange-100 hover:to-amber-100"
                    >
                      <Clock className="h-3 w-3" />
                      上半日
                    </Button>
                  </div>
                </div>

                {/* 動態計算工時 */}
                {newEntry.startDate && newEntry.startTime && newEntry.endDate && newEntry.endTime && (
                  <div className="p-6 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-xl border-2 border-orange-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500 rounded-lg">
                          <Timer className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-orange-900">工時計算</h3>
                          <p className="text-xs text-orange-600">自動計算工作時間</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-orange-900">
                          {formatDuration(calculateDuration(newEntry.startDate, newEntry.startTime, newEntry.endDate, newEntry.endTime))}
                        </div>
                        <p className="text-xs text-orange-600">總工時</p>
                      </div>
                    </div>
                    
                    {calculateOvertimeHours(calculateDuration(newEntry.startDate, newEntry.startTime, newEntry.endDate, newEntry.endTime)) > 0 && (
                      <div className="flex items-center justify-between p-3 bg-red-100 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-800">加班時数：</span>
                        </div>
                        <div className="text-lg font-bold text-red-800">
                          {formatDuration(calculateOvertimeHours(calculateDuration(newEntry.startDate, newEntry.startTime, newEntry.endDate, newEntry.endTime)))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 新增按鈕 */}
                <Button 
                  onClick={handleAddTimeEntry}
                  disabled={saving || (batchMode ? selectedPersonnel.length === 0 : !newEntry.personnelId) || !newEntry.startDate || !newEntry.startTime || !newEntry.endDate || !newEntry.endTime}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  size="lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      新增中...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      {batchMode ? `批量新增 ${selectedPersonnel.length} 筆記錄` : "新增工時記錄"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 工時記錄列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                工時記錄
              </CardTitle>
              <CardDescription>
                所有已記錄的工時資訊 {isLocked && <Badge variant="destructive" className="ml-2">已鎖定</Badge>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : timeEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>尚無工時記錄</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* 桌面版表格 */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">人員</TableHead>
                          <TableHead>開始時間</TableHead>
                          <TableHead>結束時間</TableHead>
                          <TableHead>工時</TableHead>
                          <TableHead>加班</TableHead>
                          <TableHead>備註</TableHead>
                          {!isLocked && <TableHead className="text-right">操作</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timeEntries.map((entry) => (
                          <TableRow key={entry.id} className="hover:bg-gray-50">
                            {editingId === entry.id ? (
                              <>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{entry.personnelName}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Input
                                      type="date"
                                      value={editEntry?.startDate}
                                      onChange={(e) => setEditEntry({...editEntry!, startDate: e.target.value})}
                                      className="h-8 text-xs"
                                    />
                                    <Input
                                      type="time"
                                      value={editEntry?.startTime}
                                      onChange={(e) => setEditEntry({...editEntry!, startTime: e.target.value})}
                                      className="h-8 text-xs text-gray-900 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-datetime-edit]:text-gray-900 [&::-webkit-datetime-edit-text]:text-gray-900 [&::-webkit-datetime-edit-hour-field]:text-gray-900 [&::-webkit-datetime-edit-minute-field]:text-gray-900 [color:black]"
                                      style={{ colorScheme: 'light', color: 'black' }}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Input
                                      type="date"
                                      value={editEntry?.endDate}
                                      onChange={(e) => setEditEntry({...editEntry!, endDate: e.target.value})}
                                      className="h-8 text-xs"
                                    />
                                    <Input
                                      type="time"
                                      value={editEntry?.endTime}
                                      onChange={(e) => setEditEntry({...editEntry!, endTime: e.target.value})}
                                      className="h-8 text-xs text-gray-900 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-datetime-edit]:text-gray-900 [&::-webkit-datetime-edit-text]:text-gray-900 [&::-webkit-datetime-edit-hour-field]:text-gray-900 [&::-webkit-datetime-edit-minute-field]:text-gray-900 [color:black]"
                                      style={{ colorScheme: 'light', color: 'black' }}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell colSpan={2}>
                                  <Input
                                    value={editEntry?.notes || ''}
                                    onChange={(e) => setEditEntry({...editEntry!, notes: e.target.value})}
                                    placeholder="備註"
                                    className="h-8 text-xs"
                                  />
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right">
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleSaveEdit}
                                      disabled={saving}
                                    >
                                      <Save className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingId(null)
                                        setEditEntry(null)
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{entry.personnelName}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {entry.startDate} {formatTime(entry.startTime)}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {entry.endDate} {formatTime(entry.endTime)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-blue-50">
                                    {formatDuration(entry.duration)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {entry.overtimeHours && entry.overtimeHours > 0 ? (
                                    <Badge variant="destructive" className="bg-red-50 text-red-700">
                                      {formatDuration(entry.overtimeHours)}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {entry.notes || "-"}
                                </TableCell>
                                {!isLocked && (
                                  <TableCell className="text-right">
                                    <div className="flex gap-1 justify-end">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditTimeEntry(entry)}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteTimeEntry(entry.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* 手機版卡片 */}
                  <div className="md:hidden space-y-3">
                    {timeEntries.map((entry) => (
                      <Card key={entry.id} className="overflow-hidden">
                        <div
                          className="p-4 cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleExpanded(entry.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{entry.personnelName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-blue-50">
                                {formatDuration(entry.duration)}
                              </Badge>
                              {expandedEntries.has(entry.id) ? (
                                <ChevronUp className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </div>
                          
                          {expandedEntries.has(entry.id) && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">開始：</span>
                                <span>{entry.startDate} {formatTime(entry.startTime)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">結束：</span>
                                <span>{entry.endDate} {formatTime(entry.endTime)}</span>
                              </div>
                              {entry.overtimeHours && entry.overtimeHours > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">加班：</span>
                                  <Badge variant="destructive" className="bg-red-50 text-red-700">
                                    {formatDuration(entry.overtimeHours)}
                                  </Badge>
                                </div>
                              )}
                              {entry.notes && (
                                <div className="text-sm">
                                  <span className="text-gray-600">備註：</span>
                                  <p className="mt-1 text-gray-800">{entry.notes}</p>
                                </div>
                              )}
                              {!isLocked && (
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEditTimeEntry(entry)
                                    }}
                                    className="flex-1"
                                  >
                                    <Edit2 className="h-4 w-4 mr-1" />
                                    編輯
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteTimeEntry(entry.id)
                                    }}
                                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    刪除
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
