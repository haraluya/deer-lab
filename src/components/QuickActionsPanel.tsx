'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Command, 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { 
  Package, 
  FlaskConical, 
  Clipboard, 
  ShoppingCart, 
  Users, 
  Building2,
  Calculator,
  FileText,
  Settings,
  Search,
  Plus,
  RotateCcw,
  Zap,
  Clock,
  TrendingUp,
  BarChart3,
} from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useAppStore } from '@/stores/appStore'
import { Badge } from '@/components/ui/badge'

// 快捷操作類型定義
interface QuickAction {
  id: string
  label: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  category: 'navigation' | 'create' | 'tools' | 'recent'
  keywords: string[]
  shortcut?: string
  badge?: string | number
}

// 快捷操作面板組件
export function QuickActionsPanel() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  
  // Store hooks
  const { quickActions, addRecentAction } = useUIStore()
  const { shortcuts } = useAppStore()
  
  // 鍵盤快捷鍵監聽
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // 執行動作並記錄到最近操作
  const executeAction = (action: QuickAction) => {
    action.action()
    addRecentAction({
      id: action.id,
      label: action.label,
      action: action.action
    })
    setOpen(false)
  }

  // 定義所有快捷操作
  const quickActionsList: QuickAction[] = [
    // 導航操作
    {
      id: 'nav-dashboard',
      label: '工作台',
      description: '回到主要儀表板',
      icon: BarChart3,
      action: () => router.push('/dashboard'),
      category: 'navigation',
      keywords: ['dashboard', 'home', '首頁', '工作台', '儀表板'],
      shortcut: 'Alt+D',
    },
    {
      id: 'nav-inventory',
      label: '庫存監控',
      description: '查看和管理庫存',
      icon: Package,
      action: () => router.push('/dashboard/inventory'),
      category: 'navigation',
      keywords: ['inventory', '庫存', '物料', '監控'],
      shortcut: shortcuts.customShortcuts['ctrl+shift+i'] ? 'Ctrl+Shift+I' : undefined,
    },
    {
      id: 'nav-materials',
      label: '原料庫',
      description: '管理原料物料',
      icon: Package,
      action: () => router.push('/dashboard/materials'),
      category: 'navigation',
      keywords: ['materials', '原料', '物料', '材料'],
      shortcut: shortcuts.customShortcuts['ctrl+shift+m'] ? 'Ctrl+Shift+M' : undefined,
    },
    {
      id: 'nav-fragrances',
      label: '配方庫',
      description: '管理香精配方',
      icon: FlaskConical,
      action: () => router.push('/dashboard/fragrances'),
      category: 'navigation',
      keywords: ['fragrances', '香精', '配方', '調香'],
      shortcut: shortcuts.customShortcuts['ctrl+shift+f'] ? 'Ctrl+Shift+F' : undefined,
    },
    {
      id: 'nav-work-orders',
      label: '生產工單',
      description: '管理生產工單',
      icon: Clipboard,
      action: () => router.push('/dashboard/work-orders'),
      category: 'navigation',
      keywords: ['work orders', '工單', '生產', '製造'],
      shortcut: shortcuts.customShortcuts['ctrl+shift+w'] ? 'Ctrl+Shift+W' : undefined,
    },
    {
      id: 'nav-purchase-orders',
      label: '採購訂單',
      description: '管理採購和訂單',
      icon: ShoppingCart,
      action: () => router.push('/dashboard/purchase-orders'),
      category: 'navigation',
      keywords: ['purchase', '採購', '訂單', '進貨'],
      shortcut: shortcuts.customShortcuts['ctrl+shift+p'] ? 'Ctrl+Shift+P' : undefined,
    },
    {
      id: 'nav-personnel',
      label: '成員管理',
      description: '管理團隊成員',
      icon: Users,
      action: () => router.push('/dashboard/personnel'),
      category: 'navigation',
      keywords: ['personnel', '人員', '成員', '團隊'],
    },
    {
      id: 'nav-suppliers',
      label: '供應商',
      description: '管理供應商資訊',
      icon: Building2,
      action: () => router.push('/dashboard/suppliers'),
      category: 'navigation',
      keywords: ['suppliers', '供應商', '廠商'],
    },

    // 創建操作
    {
      id: 'create-work-order',
      label: '新增工單',
      description: '建立新的生產工單',
      icon: Plus,
      action: () => router.push('/dashboard/work-orders/create'),
      category: 'create',
      keywords: ['create', 'new', '新增', '建立', '工單'],
    },
    {
      id: 'create-purchase-order',
      label: '新增採購單',
      description: '建立新的採購訂單',
      icon: Plus,
      action: () => router.push('/dashboard/purchase-orders?action=create'),
      category: 'create',
      keywords: ['create', 'purchase', '新增', '採購'],
    },

    // 工具操作
    {
      id: 'tool-production-calc',
      label: '生產計算機',
      description: '計算生產需求',
      icon: Calculator,
      action: () => router.push('/dashboard/production-calculator'),
      category: 'tools',
      keywords: ['calculator', '計算', '計算機', '生產'],
    },
    {
      id: 'tool-cost-analysis',
      label: '成本分析',
      description: '分析成本和利潤',
      icon: TrendingUp,
      action: () => router.push('/dashboard/cost-management'),
      category: 'tools',
      keywords: ['cost', '成本', '分析', '利潤'],
    },
    {
      id: 'tool-time-reports',
      label: '工時報表',
      description: '查看工時統計報表',
      icon: Clock,
      action: () => router.push('/dashboard/time-reports'),
      category: 'tools',
      keywords: ['time', '工時', '報表', '統計'],
    },
    {
      id: 'tool-inventory-records',
      label: '庫存歷史',
      description: '查看庫存變動記錄',
      icon: FileText,
      action: () => router.push('/dashboard/inventory-records'),
      category: 'tools',
      keywords: ['records', '記錄', '歷史', '庫存'],
    },

    // 系統操作
    {
      id: 'refresh-data',
      label: '刷新資料',
      description: '重新載入所有資料',
      icon: RotateCcw,
      action: () => window.location.reload(),
      category: 'tools',
      keywords: ['refresh', '刷新', '重新載入', '更新'],
    },
  ]

  // 根據搜尋詞過濾操作
  const filteredActions = quickActionsList.filter(action => {
    if (!search) return true
    
    const searchLower = search.toLowerCase()
    return (
      action.label.toLowerCase().includes(searchLower) ||
      action.description?.toLowerCase().includes(searchLower) ||
      action.keywords.some(keyword => keyword.toLowerCase().includes(searchLower))
    )
  })

  // 按類別分組
  const groupedActions = {
    recent: quickActions.recentActions.slice(0, 5),
    navigation: filteredActions.filter(action => action.category === 'navigation'),
    create: filteredActions.filter(action => action.category === 'create'),
    tools: filteredActions.filter(action => action.category === 'tools'),
  }

  return (
    <>
      {/* 觸發按鈕 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 md:h-14 md:w-14"
        title="快捷操作 (Ctrl+K)"
      >
        <Zap className="h-5 w-5 md:h-6 md:w-6" />
      </button>

      {/* 快捷操作對話框 */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="搜尋功能或輸入指令..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList className="max-h-[400px] md:max-h-[500px]">
          <CommandEmpty>找不到相關功能</CommandEmpty>
          
          {/* 最近操作 */}
          {groupedActions.recent.length > 0 && (
            <>
              <CommandGroup heading="最近操作">
                {groupedActions.recent.map((action) => (
                  <CommandItem
                    key={action.id}
                    onSelect={() => {
                      action.action()
                      setOpen(false)
                    }}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{action.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(action.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* 導航操作 */}
          {groupedActions.navigation.length > 0 && (
            <>
              <CommandGroup heading="頁面導航">
                {groupedActions.navigation.map((action) => (
                  <CommandItem
                    key={action.id}
                    onSelect={() => executeAction(action)}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <action.icon className="h-4 w-4 text-blue-500" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{action.label}</span>
                        {action.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {action.badge}
                          </Badge>
                        )}
                      </div>
                      {action.description && (
                        <div className="text-xs text-muted-foreground">
                          {action.description}
                        </div>
                      )}
                    </div>
                    {action.shortcut && (
                      <Badge variant="outline" className="text-xs">
                        {action.shortcut}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* 創建操作 */}
          {groupedActions.create.length > 0 && (
            <>
              <CommandGroup heading="快速創建">
                {groupedActions.create.map((action) => (
                  <CommandItem
                    key={action.id}
                    onSelect={() => executeAction(action)}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <action.icon className="h-4 w-4 text-green-500" />
                    <div className="flex-1">
                      <div className="font-medium">{action.label}</div>
                      {action.description && (
                        <div className="text-xs text-muted-foreground">
                          {action.description}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* 工具操作 */}
          {groupedActions.tools.length > 0 && (
            <CommandGroup heading="工具和報表">
              {groupedActions.tools.map((action) => (
                <CommandItem
                  key={action.id}
                  onSelect={() => executeAction(action)}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <action.icon className="h-4 w-4 text-purple-500" />
                  <div className="flex-1">
                    <div className="font-medium">{action.label}</div>
                    {action.description && (
                      <div className="text-xs text-muted-foreground">
                        {action.description}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}

export default QuickActionsPanel