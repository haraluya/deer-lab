"use client"

import { useState, useEffect } from "react"
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { Personnel } from "@/types"
import { Clock, User, Plus, Users, Timer, Zap, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TimePicker } from "@/components/ui/time-picker"
import { Loader2, AlertTriangle } from "lucide-react"

interface TimeTrackingDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  workOrderId: string
  workOrderNumber?: string
  isLocked?: boolean
}

export function TimeTrackingDialog({ isOpen, onOpenChange, workOrderId, workOrderNumber, isLocked = false }: TimeTrackingDialogProps) {
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([])
  
  const [newEntry, setNewEntry] = useState({
    personnelId: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: ""
  })

  useEffect(() => {
    if (isOpen) {
      loadPersonnel()
    }
  }, [isOpen, workOrderId])

  const loadPersonnel = async () => {
    if (!db) return
    
    try {
      setLoading(true)
      const personnelSnapshot = await getDocs(collection(db!, "personnel"))
      const personnelList: Personnel[] = personnelSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Personnel[]
      
      setPersonnel(personnelList)
    } catch (error) {
      console.error("載入人員失敗:", error)
      toast.error("載入人員失敗")
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

  const calculateOvertimeHours = (totalHours: number): number => {
    return Math.max(0, totalHours - 8)
  }

  const formatDuration = (hours: number): string => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}小時${minutes > 0 ? `${minutes}分鐘` : ''}`
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

      try {
        setSaving(true)
        const duration = calculateDuration(newEntry.startDate, newEntry.startTime, newEntry.endDate, newEntry.endTime)
        
        // 為每個選中的人員新增記錄
        const promises = selectedPersonnel.map(async (personId) => {
          const person = personnel.find(p => p.id === personId)
          if (!person) return

          const timeEntryData = {
            workOrderId,
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
            status: 'draft' as const,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          }

          return addDoc(collection(db!, 'timeEntries'), timeEntryData)
        })

        await Promise.all(promises)
        toast.success(`已批量新增 ${selectedPersonnel.length} 筆工時記錄`)
        
        // 重置表單
        setNewEntry({
          personnelId: "",
          startDate: "",
          startTime: "",
          endDate: "",
          endTime: ""
        })
        setSelectedPersonnel([])
        
      } catch (error) {
        console.error("批量新增工時記錄失敗:", error)
        toast.error("批量新增工時記錄失敗")
      } finally {
        setSaving(false)
      }
    } else {
      // 單一新增模式
      if (!newEntry.personnelId || !newEntry.startDate || !newEntry.startTime || !newEntry.endDate || !newEntry.endTime) {
        toast.error("請填寫完整的工時資訊")
        return
      }

      try {
        setSaving(true)
        const duration = calculateDuration(newEntry.startDate, newEntry.startTime, newEntry.endDate, newEntry.endTime)
        const selectedPerson = personnel.find(p => p.id === newEntry.personnelId)

        if (!selectedPerson) {
          toast.error("找不到選擇的人員")
          return
        }

        const timeEntryData = {
          workOrderId,
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
          status: 'draft' as const,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        }

        await addDoc(collection(db!, 'timeEntries'), timeEntryData)
        toast.success("工時記錄已新增")
        
        // 重置表單
        setNewEntry({
          personnelId: "",
          startDate: "",
          startTime: "",
          endDate: "",
          endTime: ""
        })
        
      } catch (error) {
        console.error("新增工時記錄失敗:", error)
        toast.error("新增工時記錄失敗")
      } finally {
        setSaving(false)
      }
    }
  }

  const setQuickTime = (startTime: string, endTime: string) => {
    const today = new Date().toISOString().split('T')[0]
    setNewEntry({
      ...newEntry,
      startDate: today,
      endDate: today,
      startTime,
      endTime
    })
  }

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md sm:max-w-lg max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto" aria-describedby="time-tracking-dialog-description">
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
                </div>
              )}
            </AlertDescription>
          </Alert>

        <div className="space-y-6">
          {/* 新增工時記錄 */}
          {!isLocked && (
            <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-blue-800 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    新增工時記錄
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={batchMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setBatchMode(!batchMode)
                          setSelectedPersonnel([])
                          setNewEntry({
                            personnelId: "",
                            startDate: "",
                            startTime: "",
                            endDate: "",
                            endTime: ""
                          })
                        }}
                        className="flex items-center gap-2"
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
                {batchMode ? (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-blue-800">選擇人員（可多選）</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {personnel.map((person) => (
                        <label key={person.id} className="flex items-center space-x-2 cursor-pointer">
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
                            className="rounded"
                          />
                          <span className="text-sm">{person.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-blue-800">選擇人員</Label>
                    <Select 
                      value={newEntry.personnelId} 
                      onValueChange={(value) => setNewEntry({...newEntry, personnelId: value})}
                    >
                      <SelectTrigger className="bg-gradient-to-r from-white to-blue-50 border-2 border-blue-200">
                        <SelectValue placeholder="選擇人員" />
                      </SelectTrigger>
                      <SelectContent>
                        {personnel.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {person.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 工作日期 */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    工作日期
                  </Label>
                  <Input
                    type="date"
                    value={newEntry.startDate}
                    onChange={(e) => setNewEntry({
                      ...newEntry, 
                      startDate: e.target.value,
                      endDate: e.target.value // 自動同步結束日期
                    })}
                    className="bg-gradient-to-r from-white to-blue-50 border-2 border-blue-200 focus:border-blue-500 focus:ring-blue-200"
                  />
                </div>

                {/* 時間設定 */}
                <div className="grid grid-cols-2 gap-4">
                  {/* 上班時間 */}
                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Timer className="h-5 w-5 text-green-600" />
                      <div>
                        <h3 className="text-lg font-bold text-green-800">上班時間</h3>
                        <p className="text-xs text-green-600">設定開始工作時間</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-green-700">時間 (24小時制)</Label>
                      <TimePicker
                        value={newEntry.startTime}
                        onChange={(value) => setNewEntry({...newEntry, startTime: value})}
                        className="text-lg font-mono bg-white border-2 border-green-300 focus:border-green-500 focus:ring-green-200"
                        placeholder="選擇開始時間"
                      />
                      <div className="text-xs text-green-600 bg-green-100 p-2 rounded">
                        點擊選擇時間，格式：HH:MM (例如：09:30, 14:00)
                      </div>
                    </div>
                  </div>

                  {/* 下班時間 */}
                  <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-lg border-2 border-red-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Timer className="h-5 w-5 text-red-600" />
                      <div>
                        <h3 className="text-lg font-bold text-red-800">下班時間</h3>
                        <p className="text-xs text-red-600">設定結束工作時間</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-red-700">時間 (24小時制)</Label>
                      <TimePicker
                        value={newEntry.endTime}
                        onChange={(value) => setNewEntry({
                          ...newEntry, 
                          endTime: value,
                          endDate: newEntry.startDate // 自動同步結束日期
                        })}
                        className="text-lg font-mono bg-white border-2 border-red-300 focus:border-red-500 focus:ring-red-200"
                        placeholder="選擇結束時間"
                      />
                      <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
                        點擊選擇時間，格式：HH:MM (例如：17:30, 18:00)
                      </div>
                    </div>
                  </div>
                </div>

                {/* 快速時間設定 */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-600" />
                    快速時間設定
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickTime("08:00", "17:00")}
                      className="flex-1 text-xs"
                    >
                      日班 (08:00-17:00)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickTime("20:00", "05:00")}
                      className="flex-1 text-xs"
                    >
                      夜班 (20:00-05:00)
                    </Button>
                  </div>
                </div>

                {/* 工時計算 */}
                {newEntry.startDate && newEntry.startTime && newEntry.endDate && newEntry.endTime && (
                  <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-700">預計工時</span>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-orange-900">
                          {formatDuration(calculateDuration(newEntry.startDate, newEntry.startTime, newEntry.endDate, newEntry.endTime))}
                        </div>
                        <p className="text-xs text-orange-600">總工時</p>
                      </div>
                    </div>
                    
                    {calculateOvertimeHours(calculateDuration(newEntry.startDate, newEntry.startTime, newEntry.endDate, newEntry.endTime)) > 0 && (
                      <div className="flex items-center justify-between p-3 bg-red-100 rounded-lg border border-red-200 mt-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-700">加班時數</span>
                        </div>
                        <div className="text-xl font-bold text-red-800">
                          {formatDuration(calculateOvertimeHours(calculateDuration(newEntry.startDate, newEntry.startTime, newEntry.endDate, newEntry.endTime)))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 新增按鈕 */}
                <Button 
                  onClick={handleAddTimeEntry}
                  disabled={saving || (!batchMode && !newEntry.personnelId) || (batchMode && selectedPersonnel.length === 0)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      處理中...
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
        </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}