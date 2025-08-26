"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { getFunctions, httpsCallable } from "firebase/functions"
import { collection, getDocs, DocumentReference } from "firebase/firestore"
import { db } from "@/lib/firebase"

import { useAuth } from "@/context/AuthContext"
import { toast } from "sonner"
import { User, Lock, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

// 角色介面
interface Role {
  id: string;
  name: string;
  description?: string;
}

// 表單驗證 Schema
const formSchema = z.object({
  name: z.string().min(2, { message: "姓名至少需要 2 個字元" }),
  employeeId: z.string().min(1, { message: "員工編號為必填欄位" }),
  phone: z.string().min(1, { message: "電話為必填欄位" }),
  role: z.string({ required_error: "必須選擇一個角色" }),
  password: z.string().optional(),
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

// 移除重複的 Role 介面定義

interface PersonnelData {
  id: string
  name: string
  employeeId: string
  phone: string
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

  const { appUser, isLoading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  const [showPasswordFields, setShowPasswordFields] = useState(false)
  const isEditMode = !!personnelData



  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      employeeId: "",
      phone: "",
      role: "",
      password: "",
      confirmPassword: "",
      status: "active",
    },
  })

  // 載入角色資料
  const loadRoles = useCallback(async () => {
    setIsLoadingRoles(true);
    try {
      if (!db) {
        throw new Error("Firebase 未初始化");
      }
      const rolesCollectionRef = collection(db, 'roles');
      const rolesSnapshot = await getDocs(rolesCollectionRef);
      const rolesData = rolesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || '未知角色',
        description: doc.data().description
      }));
      setRoles(rolesData);
      console.log('✅ 角色資料載入成功:', rolesData);
    } catch (error) {
      console.error("載入角色資料失敗:", error);
      toast.error("載入角色資料失敗，請重新整理頁面");
    } finally {
      setIsLoadingRoles(false);
    }
  }, []);

  // 當對話框開啟時載入角色資料
  useEffect(() => {
    if (isOpen) {
      loadRoles();
    }
  }, [isOpen, loadRoles]);

  // 當對話框開啟時，重置表單
  useEffect(() => {
    if (isOpen) {
      if (personnelData) {
        // Edit mode: populate form with existing data
        const formData = {
          name: personnelData.name || "",
          employeeId: personnelData.employeeId || "",
          phone: personnelData.phone || "",
          role: personnelData.roleRef?.id || "",
          password: "", // Always reset password fields to empty in edit mode
          confirmPassword: "",
          status: (personnelData.status as "active" | "inactive") || "active",
        };
        console.log('📝 載入編輯資料:', formData);
        form.reset(formData);
      } else {
        // Add mode: reset to clean defaults
        const defaultData = {
          name: "",
          employeeId: "",
          phone: "",
          role: "",
          password: "",
          confirmPassword: "",
          status: "active" as const,
        };
        console.log('📝 重置為新增模式:', defaultData);
        form.reset(defaultData);
      }
    }
  }, [isOpen, personnelData, form])

  const onSubmit = async (data: FormData) => {
    // 新增模式下的額外驗證
    if (!isEditMode && (!data.password || data.password.length < 6)) {
      toast.error("新增人員時密碼為必填欄位，且至少需要 6 個字元")
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading(isEditMode ? "正在更新人員資料..." : "正在建立新人員...")

    try {
      const functions = getFunctions()
      
      console.log('🔧 準備調用 Firebase Functions...')
      console.log('📋 提交資料:', data)
      console.log('🎭 模式:', isEditMode ? '編輯' : '新增')
      
      if (isEditMode && personnelData) {
        console.log('📝 調用 updatePersonnel...')
        const updatePersonnel = httpsCallable(functions, 'updatePersonnel')
        
        // 準備更新資料，確保欄位名稱正確
        const updateData = {
          personnelId: personnelData.id, // 確保傳遞人員 ID
          name: data.name,
          employeeId: data.employeeId,
          phone: data.phone,
          roleId: data.role, // 將 role 映射為 roleId
          password: data.password || "", // 如果沒有密碼則傳空字串
          status: data.status,
        };
        
        console.log('📤 更新資料:', updateData);
        const result = await updatePersonnel(updateData)
        console.log('✅ updatePersonnel 成功:', result.data)
        toast.success("人員資料更新成功", { id: toastId })
      } else {
        console.log('📝 調用 createPersonnel...')
        const createPersonnel = httpsCallable(functions, 'createPersonnel')
        
        // 準備建立資料，確保欄位名稱正確
        const createData = {
          name: data.name,
          employeeId: data.employeeId,
          phone: data.phone,
          roleId: data.role, // 將 role 映射為 roleId
          password: data.password,
          status: data.status,
        };
        
        console.log('📤 建立資料:', createData);
        const result = await createPersonnel(createData)
        console.log('✅ createPersonnel 成功:', result.data)
        toast.success("人員建立成功", { id: toastId })
      }
      
      onPersonnelUpdate()
      onOpenChange(false)
    } catch (error: any) {
      console.error("操作失敗:", error)
      
      let errorMessage = "操作失敗，請稍後再試。"
      if (error?.code === 'functions/unavailable') {
        errorMessage = "服務暫時不可用，請稍後再試。"
      } else if (error?.code === 'functions/permission-denied') {
        errorMessage = "權限不足，無法執行此操作。"
      } else if (error?.code === 'functions/unauthenticated') {
        errorMessage = "請重新登入後再試。"
      } else if (error?.code === 'functions/invalid-argument') {
        errorMessage = "輸入資料有誤，請檢查後再試。"
      } else if (error?.code === 'functions/not-found') {
        errorMessage = "找不到指定的資料。"
      } else if (error?.code === 'functions/already-exists') {
        errorMessage = "資料已存在，請使用其他資料。"
      } else if (error?.code === 'functions/resource-exhausted') {
        errorMessage = "系統資源不足，請稍後再試。"
      } else if (error?.code === 'functions/failed-precondition') {
        errorMessage = "操作條件不滿足，請檢查資料後再試。"
      } else if (error?.code === 'functions/aborted') {
        errorMessage = "操作被中止，請稍後再試。"
      } else if (error?.code === 'functions/out-of-range') {
        errorMessage = "輸入資料超出範圍，請檢查後再試。"
      } else if (error?.code === 'functions/unimplemented') {
        errorMessage = "此功能尚未實作。"
      } else if (error?.code === 'functions/internal') {
        errorMessage = "系統內部錯誤，請稍後再試。"
      } else if (error?.code === 'functions/data-loss') {
        errorMessage = "資料遺失，請重新輸入。"
      } else if (error?.code === 'functions/unknown') {
        errorMessage = "發生未知錯誤，請稍後再試。"
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 如果正在載入，顯示載入狀態
  if (isLoading || isLoadingRoles) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl" aria-describedby="loading-dialog-description">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p id="loading-dialog-description" className="text-gray-600">正在載入資料...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
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
            {isEditMode ? "修改人員資料" : "建立新的人員帳號"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className="space-y-6"
          >
            {/* 基本資料 */}
            <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-800">
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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-red-600 font-semibold">電話 *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="請輸入電話號碼" 
                          {...field} 
                          className="border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>角色 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingRoles}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingRoles ? "載入中..." : "選擇角色"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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



            {/* 密碼設定 */}
            <div className="space-y-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-green-800">
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
                 className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
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
