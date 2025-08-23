"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { getFunctions, httpsCallable } from "firebase/functions"
import { collection, getDocs, DocumentReference } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { User, Lock, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

// 表單驗證 Schema
const formSchema = z.object({
  name: z.string().min(2, { message: "姓名至少需要 2 個字元" }),
  email: z.string().optional(),
  employeeId: z.string().min(1, { message: "員工編號為必填欄位" }),
  department: z.string().optional(),
  position: z.string().optional(),
  roleId: z.string({ required_error: "必須選擇一個角色" }),
  password: z.string().min(6, { message: "密碼至少需要 6 個字元" }).optional(),
  confirmPassword: z.string().optional(),
  status: z.enum(["active", "inactive"]),
}).refine((data) => {
  // 只有在有密碼時才檢查確認密碼
  if (data.password && data.password.length > 0 && data.password !== data.confirmPassword) {
    return false
  }
  return true
}, {
  message: "密碼確認不匹配",
  path: ["confirmPassword"],
})

type FormData = z.infer<typeof formSchema>

interface Role {
  id: string
  name: string
  permissions: string[]
}

interface PersonnelData {
  id: string
  name: string
  email: string
  employeeId: string
  department?: string
  position?: string
  roleRef?: DocumentReference
  status: string
}

interface PersonnelDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onPersonnelUpdate: () => void
  personnelData?: PersonnelData | null
}

export function PersonnelDialog({
  isOpen,
  onOpenChange,
  onPersonnelUpdate,
  personnelData
}: PersonnelDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [showPasswordFields, setShowPasswordFields] = useState(false)
  const isEditMode = !!personnelData

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      employeeId: "",
      department: "",
      position: "",
      roleId: "",
      password: "",
      confirmPassword: "",
      status: "active",
    },
  })

  // 載入角色資料
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const rolesSnapshot = await getDocs(collection(db, "roles"))
        const rolesList = rolesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Role[]
        setRoles(rolesList)
      } catch (error) {
        console.error("載入角色資料失敗:", error)
        toast.error("載入角色資料失敗")
      }
    }

    if (isOpen) {
      loadRoles()
    }
  }, [isOpen])

  // 當處於編輯模式時，用傳入的 personnelData 填充表單
  useEffect(() => {
    if (isOpen && personnelData) {
      form.reset({
        name: personnelData.name || "",
        email: personnelData.email || "",
        employeeId: personnelData.employeeId || "",
        department: personnelData.department || "",
        position: personnelData.position || "",
        roleId: personnelData.roleRef?.id || "",
        password: "",
        confirmPassword: "",
        status: (personnelData.status as "active" | "inactive") || "active",
      })
      setShowPasswordFields(false)
    } else if (isOpen && !personnelData) {
      form.reset({
        name: "",
        email: "",
        employeeId: "",
        department: "",
        position: "",
        roleId: "",
        password: "",
        confirmPassword: "",
        status: "active",
      })
      setShowPasswordFields(true)
    }
  }, [isOpen, personnelData, form])

  // 表單提交處理
  async function onSubmit(values: FormData) {
    setIsSubmitting(true)
    const toastId = toast.loading(isEditMode ? "正在更新人員..." : "正在新增人員...")
    
    try {
      const functions = getFunctions()
      const payload = {
        ...values,
        password: values.password || undefined, // 編輯時如果沒有輸入密碼就不更新
      }

      if (isEditMode && personnelData) {
        const updatePersonnel = httpsCallable(functions, "updatePersonnel")
        await updatePersonnel({ personnelId: personnelData.id, ...payload })
        toast.success(`人員 ${values.name} 已更新。`, { id: toastId })
      } else {
        const createPersonnel = httpsCallable(functions, "createPersonnel")
        await createPersonnel(payload)
        toast.success(`人員 ${values.name} 已建立。`, { id: toastId })
      }
      
      onPersonnelUpdate()
      onOpenChange(false)
    } catch (error) {
      console.error("Cloud Function 調用失敗:", error)
      const errorMessage = error instanceof Error ? error.message : "發生未知錯誤。"
      toast.error(errorMessage, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="personnel-dialog-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEditMode ? "編輯人員" : "新增人員"}
          </DialogTitle>
          <DialogDescription id="personnel-dialog-description">
            {isEditMode ? "修改人員資料和權限設定" : "建立新的人員帳號"}
          </DialogDescription>
        </DialogHeader>

                 <Form {...form}>
           <form 
             onSubmit={form.handleSubmit(onSubmit)} 
             className="space-y-6"
           >
            {/* 基本資料 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                基本資料
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名 *</FormLabel>
                      <FormControl>
                        <Input placeholder="請輸入姓名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>員工編號 *</FormLabel>
                      <FormControl>
                        <Input placeholder="請輸入員工編號" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>電子郵件</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="請輸入電子郵件（選填）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>部門</FormLabel>
                      <FormControl>
                        <Input placeholder="請輸入部門" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>職位</FormLabel>
                      <FormControl>
                        <Input placeholder="請輸入職位" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>狀態</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="選擇狀態" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">啟用</SelectItem>
                          <SelectItem value="inactive">停用</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 權限設定 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                權限設定
              </h3>
              
              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>角色 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="選擇角色" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            <div className="flex items-center gap-2">
                              <span>{role.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {role.permissions?.length || 0} 權限
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 密碼設定 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  密碼設定
                </h3>
                {isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordFields(!showPasswordFields)}
                  >
                    {showPasswordFields ? "隱藏密碼欄位" : "修改密碼"}
                  </Button>
                )}
              </div>
              
              {(!isEditMode || showPasswordFields) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>密碼 {isEditMode ? "" : "*"}</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder={isEditMode ? "留空表示不修改" : "請輸入密碼"} 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>確認密碼 {isEditMode ? "" : "*"}</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="請再次輸入密碼" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* 操作按鈕 */}
                         <div className="flex justify-end gap-2">
               <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                 取消
               </Button>
                               <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "處理中..." : (isEditMode ? "更新" : "新增")}
                </Button>
             </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
