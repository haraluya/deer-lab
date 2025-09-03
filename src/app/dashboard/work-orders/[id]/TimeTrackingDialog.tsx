"use client"

import { useState, useEffect } from "react"
import { collection, addDoc, getDocs, query, where, orderBy, doc, deleteDoc, updateDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { Personnel, TimeEntry as TimeEntryType } from "@/types"
import { Clock, User, Plus, Trash2, Edit2, Calendar, Save, X, ChevronDown, ChevronUp, Users, Timer, ClipboardList, Zap, AlertTriangle, HelpCircle, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Loader2 } from "lucide-react"

// 擴展 TimeEntry 類型以適應此對話框
interface LocalTimeEntry extends TimeEntryType {
  workOrderNumber?: string;
  startDateTime?: Timestamp;
  endDateTime?: Timestamp;
  overtimeHours?: number;
  status?: 'draft' | 'confirmed' | 'locked';
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
  const [timeEntries, setTimeEntries] = useState<LocalTimeEntry[]>([])
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
  
  const [editEntry, setEditEntry] = useState<LocalTimeEntry | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, workOrderId])

  const loadData = async (retryCount = 0) => {
    setLoading(true)
    try {
      if (!db) {
        throw new Error("Firebase 未初始化")
      }
      
      if (!workOrderId) {
        throw new Error("工單ID未提供")
      }
      
      console.log("開始載入工時申報資料，工單ID:", workOrderId)
      
      // 載入人員資料
      console.log("載入人員資料...")
      const personnelSnapshot = await getDocs(collection(db, "users"))
      const personnelList = personnelSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name || "未命名",
          employeeId: data.employeeId || "",
          ...data
        }
      }).filter(person => person.name && person.name !== "未命名") as Personnel[]
      
      console.log("人員資料載入成功，共", personnelList.length, "人")
      setPersonnel(personnelList)

      // 載入工時記錄 - 改為不依賴複合索引的查詢方式
      console.log("載入工時記錄...")
      try {
        // 先嘗試使用複合索引查詢
        const timeEntriesQuery = query(
          collection(db, "timeEntries"),
          where("workOrderId", "==", workOrderId),
          orderBy("createdAt", "desc")
        )
        const timeEntriesSnapshot = await getDocs(timeEntriesQuery)
        const timeEntriesList = timeEntriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LocalTimeEntry[]
        
        console.log("工時記錄載入成功，共", timeEntriesList.length, "筆記錄")
        setTimeEntries(timeEntriesList)
      } catch (indexError) {
        console.warn("複合索引查詢失敗，改用簡單查詢:", indexError)
        
        // 如果複合索引不存在，使用簡單查詢然後在客戶端排序
        const simpleQuery = query(
          collection(db, "timeEntries"),
          where("workOrderId", "==", workOrderId)
        )
        const timeEntriesSnapshot = await getDocs(simpleQuery)
        const timeEntriesList = timeEntriesSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .sort((a: any, b: any) => {
            const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0)
            const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0)
            return bTime.getTime() - aTime.getTime()
          }) as LocalTimeEntry[]
        
        console.log("簡化查詢成功，共", timeEntriesList.length, "筆記錄")
        setTimeEntries(timeEntriesList)
      }
      
      toast.success("工時資料載入完成")
    } catch (error: any) {
      console.error("載入資料失敗:", error)
      
      // 重試機制
      if (retryCount < 2 && !error.message?.includes("權限")) {
        console.log(`載入失敗，${2 - retryCount} 秒後重試...`)
        toast.loading("載入失敗，正在重試...")
        setTimeout(() => loadData(retryCount + 1), 2000)
        return
      }
      
      // 提供更詳細的錯誤信息
      let errorMessage = "載入資料失敗"
      if (error.code === 'permission-denied') {
        errorMessage = "權限不足，請檢查登入狀態"
      } else if (error.code === 'unavailable') {
        errorMessage = "網路連線問題，請檢查網路連線"
      } else if (error.message?.includes("索引")) {
        errorMessage = "資料庫索引問題，請聯絡系統管理員"
      } else if (error.message) {
        errorMessage = `載入失敗: ${error.message}`
      }
      
      toast.error(errorMessage)
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

      // 檢查批量新增是否有時間重疊
      const conflictPersonnel: string[] = []
      selectedPersonnel.forEach(personId => {
        const person = personnel.find(p => p.id === personId)
        if (person && checkTimeOverlap(personId, newEntry.startDate, newEntry.startTime, newEntry.endDate, newEntry.endTime)) {
          conflictPersonnel.push(person.name)
        }
      })

      if (conflictPersonnel.length > 0) {
        toast.error(`以下人員時間有重疊，無法新增：${conflictPersonnel.join(', ')}`)
        return
      }

      const duration = calculateDuration(newEntry.startDate, newEntry.startTime, newEntry.endDate, newEntry.endTime)
      if (duration <= 0) {
        toast.error("結束時間必須晚於開始時間")
        return
      }

      // 檢查超時工作提醒
      if (duration > 8) {
        const overtime = duration - 8
        toast.warning(`批量新增的工時超過8小時，每人將產生 ${overtime.toFixed(1)} 小時加班時數`)
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

      // 檢查時間重疊
      if (checkTimeOverlap(newEntry.personnelId, newEntry.startDate, newEntry.startTime, newEntry.endDate, newEntry.endTime)) {
        toast.error("此時間段與該人員的其他工時記錄重疊，請調整時間")
        return
      }

      // 檢查超時工作提醒
      if (duration > 8) {
        const overtime = duration - 8
        toast.warning(`工時超過8小時，將產生 ${overtime.toFixed(1)} 小時加班時數`)
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

  // 檢查時間重疊的函數
  const checkTimeOverlap = (personnelId: string, startDate: string, startTime: string, endDate: string, endTime: string, excludeId?: string): boolean => {
    const newStartDateTime = new Date(`${startDate}T${startTime}`)
    const newEndDateTime = new Date(`${endDate}T${endTime}`)
    
    return timeEntries.some(entry => {
      // 排除正在編輯的記錄
      if (excludeId && entry.id === excludeId) return false
      
      // 只檢查同一人員的記錄
      if (entry.personnelId !== personnelId) return false
      
      const existingStartDateTime = new Date(`${entry.startDate}T${entry.startTime}`)
      const existingEndDateTime = new Date(`${entry.endDate}T${entry.endTime}`)
      
      // 檢查時間範圍是否重疊
      return (newStartDateTime < existingEndDateTime) && (newEndDateTime > existingStartDateTime)
    })
  }

  const handleEditTimeEntry = async (entry: LocalTimeEntry) => {
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
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl sm:max-w-3xl max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto" aria-describedby="time-tracking-dialog-description">
          <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            工時申報 {workOrderNumber && `- ${workOrderNumber}`}
          </DialogTitle>
          <DialogDescription id="time-tracking-dialog-description">
            {isLocked ? "已入庫工單，工時記錄已鎖定" : "記錄工作時間，支援單一或批量新增模式"}
          </DialogDescription>
        </DialogHeader>

        {/* 操作說明提示 */}
        <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 font-semibold">
              {isLocked ? "🔒 工時記錄已鎖定" : "📝 工時申報使用說明"}
            </AlertTitle>
            <AlertDescription className="text-amber-700 text-sm">
              {isLocked ? (
                <div>工單已入庫，工時記錄已被鎖定無法修改。如需調整請聯繫系統管理員。</div>
              ) : (
                <div className="space-y-1">
                  <div>• <strong>單一模式</strong>：一次為一個人員新增工時記錄</div>
                  <div>• <strong>批量模式</strong>：一次為多個人員新增相同時間段的工時記錄</div>
                  <div>• <strong>自動計算</strong>：系統會自動計算總工時和加班時數（超過8小時）</div>
                  <div>• <strong>快速設定</strong>：使用預設按鈕快速設定常用時間（日班/夜班）</div>
                  <div>• <strong>即時編輯</strong>：工單入庫前可隨時編輯或刪除工時記錄</div>
                </div>
              )}
            </AlertDescription>
          </Alert>

        <div className="space-y-6">

          {/* 新增工時記錄 */}
          {!isLocked && (
            <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Plus className="h-4 w-4" />
                    新增工時記錄
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={batchMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBatchMode(!batchMode)}
                        className="gap-2"
                      >
                        <Users className="h-4 w-4" />
                        {batchMode ? "批量模式" : "單一模式"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {batchMode 
                          ? "批量模式：為多個人員新增相同時間段的工時記錄" 
                          : "單一模式：逐個新增每個人員的工時記錄"
                        }
                      </p>
                    </TooltipContent>
                  </Tooltip>
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
                          step="1"
                          className="text-lg font-mono bg-white border-2 border-green-300 focus:border-green-500 focus:ring-green-200 pl-12 text-black [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:text-black [&::-webkit-datetime-edit-text]:text-black [&::-webkit-datetime-edit-hour-field]:text-black [&::-webkit-datetime-edit-minute-field]:text-black [&::-webkit-datetime-edit-ampm-field]:hidden"
                          style={{ 
                            colorScheme: 'light', 
                            color: '#000000 !important',
                            WebkitTextFillColor: '#000000 !important',
                            opacity: 1
                          }}
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
                          step="1"
                          className="text-lg font-mono bg-white border-2 border-red-300 focus:border-red-500 focus:ring-red-200 pl-12 text-black [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:text-black [&::-webkit-datetime-edit-text]:text-black [&::-webkit-datetime-edit-hour-field]:text-black [&::-webkit-datetime-edit-minute-field]:text-black [&::-webkit-datetime-edit-ampm-field]:hidden"
                          style={{ 
                            colorScheme: 'light', 
                            color: '#000000 !important',
                            WebkitTextFillColor: '#000000 !important',
                            opacity: 1
                          }}
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
                                      step="1"
                                      className="h-8 text-xs text-black [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-datetime-edit]:text-black [&::-webkit-datetime-edit-text]:text-black [&::-webkit-datetime-edit-hour-field]:text-black [&::-webkit-datetime-edit-minute-field]:text-black [&::-webkit-datetime-edit-ampm-field]:hidden"
                                      style={{ 
                                        colorScheme: 'light', 
                                        color: '#000000 !important',
                                        WebkitTextFillColor: '#000000 !important',
                                        opacity: 1
                                      }}
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
                                      step="1"
                                      className="h-8 text-xs text-black [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-datetime-edit]:text-black [&::-webkit-datetime-edit-text]:text-black [&::-webkit-datetime-edit-hour-field]:text-black [&::-webkit-datetime-edit-minute-field]:text-black [&::-webkit-datetime-edit-ampm-field]:hidden"
                                      style={{ 
                                        colorScheme: 'light', 
                                        color: '#000000 !important',
                                        WebkitTextFillColor: '#000000 !important',
                                        opacity: 1
                                      }}
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
    </TooltipProvider>
  )
}
