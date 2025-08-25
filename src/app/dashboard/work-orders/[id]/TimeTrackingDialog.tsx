"use client"

import { useState, useEffect } from "react"
import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { Clock, User, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Personnel {
  id: string
  name: string
  employeeId: string
}

interface TimeEntry {
  id: string
  personnelId: string
  personnelName: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  duration: number // 小時
  notes?: string
  createdAt: any
}

interface TimeTrackingDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  workOrderId: string
}

export function TimeTrackingDialog({ isOpen, onOpenChange, workOrderId }: TimeTrackingDialogProps) {
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [newEntry, setNewEntry] = useState({
    personnelId: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    notes: ""
  })

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
      const personnelSnapshot = await getDocs(collection(db, "personnel"))
      const personnelList = personnelSnapshot.docs.map(doc => ({
        id: doc.id,
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
        personnelId: newEntry.personnelId,
        personnelName: selectedPerson.name,
        startDate: newEntry.startDate,
        startTime: newEntry.startTime,
        endDate: newEntry.endDate,
        endTime: newEntry.endTime,
        duration,
        notes: newEntry.notes,
        createdAt: new Date()
      }

      await addDoc(collection(db!, "timeEntries"), timeEntryData)
      
      toast.success("工時記錄已新增")
      setNewEntry({
        personnelId: "",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        notes: ""
      })
      
      // 重新載入資料
      loadData()
    } catch (error) {
      console.error("新增工時記錄失敗:", error)
      toast.error("新增工時記錄失敗")
    } finally {
      setSaving(false)
    }
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">總工時記錄</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timeEntries.length}</div>
                <p className="text-xs text-muted-foreground">筆記錄</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">總工時</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatDuration(getTotalHours())}</div>
                <p className="text-xs text-muted-foreground">累計時間</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">人工工時</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatDuration(getTotalManHours())}</div>
                <p className="text-xs text-muted-foreground">總人工時</p>
              </CardContent>
            </Card>
          </div>

          {/* 新增工時記錄 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                新增工時記錄
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div>
                  <Label htmlFor="personnel">人員</Label>
                  <Select value={newEntry.personnelId} onValueChange={(value) => setNewEntry({...newEntry, personnelId: value})}>
                    <SelectTrigger>
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
                </div>

                <div>
                  <Label htmlFor="startDate">開始日期</Label>
                  <Input
                    type="date"
                    value={newEntry.startDate}
                    onChange={(e) => setNewEntry({...newEntry, startDate: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="startTime">開始時間</Label>
                  <Input
                    type="time"
                    value={newEntry.startTime}
                    onChange={(e) => setNewEntry({...newEntry, startTime: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">結束日期</Label>
                  <Input
                    type="date"
                    value={newEntry.endDate}
                    onChange={(e) => setNewEntry({...newEntry, endDate: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="endTime">結束時間</Label>
                  <Input
                    type="time"
                    value={newEntry.endTime}
                    onChange={(e) => setNewEntry({...newEntry, endTime: e.target.value})}
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={handleAddTimeEntry}
                    disabled={saving || !newEntry.personnelId || !newEntry.startDate || !newEntry.startTime || !newEntry.endDate || !newEntry.endTime}
                    className="w-full"
                  >
                    {saving ? "新增中..." : "新增記錄"}
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor="notes">備註</Label>
                <Input
                  placeholder="可選的備註說明"
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>

          {/* 工時記錄列表 */}
          <Card>
            <CardHeader>
              <CardTitle>工時記錄</CardTitle>
              <CardDescription>所有已記錄的工時資訊</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">載入中...</div>
              ) : timeEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  尚無工時記錄
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>人員</TableHead>
                      <TableHead>開始時間</TableHead>
                      <TableHead>結束時間</TableHead>
                      <TableHead>工時</TableHead>
                      <TableHead>備註</TableHead>
                      <TableHead>記錄時間</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{entry.personnelName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.startDate && entry.startTime ? 
                            `${entry.startDate} ${formatTime(entry.startTime)}` : 
                            formatTime(entry.startTime)
                          }
                        </TableCell>
                        <TableCell>
                          {entry.endDate && entry.endTime ? 
                            `${entry.endDate} ${formatTime(entry.endTime)}` : 
                            formatTime(entry.endTime)
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formatDuration(entry.duration)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.notes || "-"}
                        </TableCell>
                        <TableCell>
                          {entry.createdAt?.toDate?.()?.toLocaleString() || "未知"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
