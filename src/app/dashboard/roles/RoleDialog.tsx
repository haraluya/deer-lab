"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { getFunctions, httpsCallable } from "firebase/functions"
import { toast } from "sonner"
import { Shield, CheckSquare, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

// 表單驗證 Schema
const formSchema = z.object({
  name: z.string().min(2, { message: "角色名稱至少需要 2 個字元" }),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, { message: "至少需要選擇一個權限" }),
})

type FormData = z.infer<typeof formSchema>

// 預定義的權限分類
const PERMISSION_CATEGORIES = [
  {
    id: 'system',
    name: '系統管理',
    permissions: [
      { id: 'dashboard:view', label: '查看系統總覽' },
      { id: 'personnel:view', label: '查看人員管理' },
      { id: 'personnel:create', label: '新增人員' },
      { id: 'personnel:edit', label: '編輯人員' },
      { id: 'personnel:delete', label: '刪除人員' },
      { id: 'roles:view', label: '查看角色管理' },
      { id: 'roles:create', label: '新增角色' },
      { id: 'roles:edit', label: '編輯角色' },
      { id: 'roles:delete', label: '刪除角色' },
    ]
  },
  {
    id: 'masterdata',
    name: '基礎資料管理',
    permissions: [
      { id: 'materials:view', label: '查看物料管理' },
      { id: 'materials:create', label: '新增物料' },
      { id: 'materials:edit', label: '編輯物料' },
      { id: 'materials:delete', label: '刪除物料' },
      { id: 'fragrances:view', label: '查看香精管理' },
      { id: 'fragrances:create', label: '新增香精' },
      { id: 'fragrances:edit', label: '編輯香精' },
      { id: 'fragrances:delete', label: '刪除香精' },
      { id: 'products:view', label: '查看產品管理' },
      { id: 'products:create', label: '新增產品' },
      { id: 'products:edit', label: '編輯產品' },
      { id: 'products:delete', label: '刪除產品' },
    ]
  },
  {
    id: 'production',
    name: '生產作業管理',
    permissions: [
      { id: 'workorders:view', label: '查看工單管理' },
      { id: 'workorders:create', label: '新增工單' },
      { id: 'workorders:edit', label: '編輯工單' },
      { id: 'workorders:delete', label: '刪除工單' },
      { id: 'inventory:view', label: '查看庫存管理' },
      { id: 'inventory:adjust', label: '調整庫存' },
      { id: 'purchase:view', label: '查看採購管理' },
      { id: 'purchase:create', label: '新增採購單' },
      { id: 'purchase:edit', label: '編輯採購單' },
      { id: 'purchase:receive', label: '確認入庫' },
    ]
  },
  {
    id: 'analytics',
    name: '數據分析',
    permissions: [
      { id: 'reports:view', label: '查看報表分析' },
      { id: 'cost:view', label: '查看成本管理' },
    ]
  }
]

// 預設角色模板
const ROLE_TEMPLATES = [
  {
    name: '系統管理員',
    description: '擁有系統所有權限，可進行完整的管理操作',
    permissions: PERMISSION_CATEGORIES.flatMap(category => 
      category.permissions.map(permission => permission.id)
    )
  },
  {
    name: '生產領班',
    description: '負責生產作業管理，可查看報表但無法修改系統設定',
    permissions: [
      'dashboard:view',
      'workorders:view', 'workorders:create', 'workorders:edit',
      'inventory:view', 'inventory:adjust',
      'purchase:view', 'purchase:create', 'purchase:edit', 'purchase:receive',
      'materials:view', 'fragrances:view', 'products:view',
      'reports:view', 'cost:view'
    ]
  },
  {
    name: '計時人員',
    description: '僅可查看工單和記錄工時，權限最為有限',
    permissions: [
      'dashboard:view',
      'workorders:view',
      'inventory:view'
    ]
  }
]

interface RoleData {
  id: string
  name: string
  description?: string
  permissions: string[]
}

interface RoleDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onRoleUpdate: () => void
  roleData?: RoleData | null
}

export function RoleDialog({
  isOpen,
  onOpenChange,
  onRoleUpdate,
  roleData
}: RoleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const isEditMode = !!roleData

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      permissions: [],
    },
  })

  // 當處於編輯模式時，用傳入的 roleData 填充表單
  useEffect(() => {
    if (isOpen && roleData) {
      form.reset({
        name: roleData.name || "",
        description: roleData.description || "",
        permissions: roleData.permissions || [],
      })
      setSelectedTemplate("")
    } else if (isOpen && !roleData) {
      form.reset({
        name: "",
        description: "",
        permissions: [],
      })
      setSelectedTemplate("")
    }
  }, [isOpen, roleData, form])

  // 處理模板選擇
  const handleTemplateSelect = (templateName: string) => {
    const template = ROLE_TEMPLATES.find(t => t.name === templateName)
    if (template) {
      form.setValue("name", template.name)
      form.setValue("description", template.description)
      form.setValue("permissions", template.permissions)
      setSelectedTemplate(templateName)
    }
  }

  // 處理分類全選
  const handleCategorySelect = (categoryId: string, checked: boolean) => {
    const category = PERMISSION_CATEGORIES.find(c => c.id === categoryId)
    if (!category) return

    const currentPermissions = form.getValues("permissions")
    const categoryPermissions = category.permissions.map(p => p.id)

    if (checked) {
      // 添加分類下所有權限
      const newPermissions = [...new Set([...currentPermissions, ...categoryPermissions])]
      form.setValue("permissions", newPermissions)
    } else {
      // 移除分類下所有權限
      const newPermissions = currentPermissions.filter(p => !categoryPermissions.includes(p))
      form.setValue("permissions", newPermissions)
    }
  }

  // 檢查分類是否全選
  const isCategorySelected = (categoryId: string) => {
    const category = PERMISSION_CATEGORIES.find(c => c.id === categoryId)
    if (!category) return false

    const currentPermissions = form.getValues("permissions")
    const categoryPermissions = category.permissions.map(p => p.id)
    
    return categoryPermissions.every(p => currentPermissions.includes(p))
  }

  // 檢查分類是否部分選中
  const isCategoryIndeterminate = (categoryId: string) => {
    const category = PERMISSION_CATEGORIES.find(c => c.id === categoryId)
    if (!category) return false

    const currentPermissions = form.getValues("permissions")
    const categoryPermissions = category.permissions.map(p => p.id)
    
    const selectedCount = categoryPermissions.filter(p => currentPermissions.includes(p)).length
    return selectedCount > 0 && selectedCount < categoryPermissions.length
  }

  // 表單提交處理
  async function onSubmit(values: FormData) {
    setIsSubmitting(true)
    const toastId = toast.loading(isEditMode ? "正在更新角色..." : "正在新增角色...")
    
    try {
      const functions = getFunctions()
      const payload = {
        ...values,
      }

      if (isEditMode && roleData) {
        const updateRole = httpsCallable(functions, "updateRole")
        await updateRole({ roleId: roleData.id, ...payload })
        toast.success(`角色 ${values.name} 已更新。`, { id: toastId })
      } else {
        const createRole = httpsCallable(functions, "createRole")
        await createRole(payload)
        toast.success(`角色 ${values.name} 已建立。`, { id: toastId })
      }
      
      onRoleUpdate()
      onOpenChange(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "發生未知錯誤。"
      toast.error(errorMessage, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="role-dialog-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {isEditMode ? "編輯角色" : "新增角色"}
          </DialogTitle>
          <DialogDescription id="role-dialog-description">
            {isEditMode ? "修改角色資料和權限設定" : "建立新的角色並設定權限"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本資料 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                基本資料
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>角色名稱 *</FormLabel>
                      <FormControl>
                        <Input placeholder="請輸入角色名稱" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>角色描述</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="請輸入角色描述（選填）" 
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 角色模板 */}
            {!isEditMode && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  快速選擇模板
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {ROLE_TEMPLATES.map((template) => (
                    <Button
                      key={template.name}
                      type="button"
                      variant={selectedTemplate === template.name ? "default" : "outline"}
                      className="h-auto p-4 flex flex-col items-start gap-2"
                      onClick={() => handleTemplateSelect(template.name)}
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-muted-foreground text-left">
                        {template.description}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* 權限設定 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                權限設定 *
              </h3>
              
              <FormField
                control={form.control}
                name="permissions"
                render={() => (
                  <FormItem>
                    <div className="space-y-6">
                      {PERMISSION_CATEGORIES.map((category) => (
                        <div key={category.id} className="border rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-3">
                                                         <FormControl>
                               <Checkbox
                                 checked={isCategorySelected(category.id)}
                                 onCheckedChange={(checked) => {
                                   handleCategorySelect(category.id, checked as boolean)
                                 }}
                               />
                             </FormControl>
                            <FormLabel className="text-base font-medium cursor-pointer">
                              {category.name}
                            </FormLabel>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                            {category.permissions.map((permission) => (
                              <FormField
                                key={permission.id}
                                control={form.control}
                                name="permissions"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={permission.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(permission.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, permission.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== permission.id
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm font-normal cursor-pointer">
                                        {permission.label}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 操作按鈕 */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "處理中..." : (isEditMode ? "更新" : "新增")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
