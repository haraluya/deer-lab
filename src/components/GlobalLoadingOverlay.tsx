'use client'

import React from 'react'
import { useUIStore, useGlobalLoading, useActiveProgressIndicators } from '@/stores/uiStore'
import { Progress, CircularProgress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// 全域載入覆蓋層
export function GlobalLoadingOverlay() {
  const globalLoading = useGlobalLoading()
  const activeProgressIndicators = useActiveProgressIndicators()
  
  // 如果沒有全域載入且沒有活躍的進度指示器，不顯示覆蓋層
  if (!globalLoading.isLoading && Object.keys(activeProgressIndicators).length === 0) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-xl">
        <CardContent className="p-6">
          {/* 全域載入 */}
          {globalLoading.isLoading && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                {typeof globalLoading.progress === 'number' ? (
                  <CircularProgress 
                    value={globalLoading.progress}
                    size={60}
                    strokeWidth={4}
                    showPercentage={true}
                  />
                ) : (
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  載入中...
                </h3>
                {globalLoading.message && (
                  <p className="text-sm text-gray-600">
                    {globalLoading.message}
                  </p>
                )}
                
                {typeof globalLoading.progress === 'number' && (
                  <div className="space-y-1">
                    <Progress 
                      value={globalLoading.progress} 
                      variant="default"
                      size="md"
                    />
                    <p className="text-xs text-gray-500">
                      {Math.round(globalLoading.progress)}% 完成
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 進度指示器組件
export function ProgressIndicators() {
  const activeProgressIndicators = useActiveProgressIndicators()
  
  if (Object.keys(activeProgressIndicators).length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 space-y-2 max-w-sm">
      {Object.entries(activeProgressIndicators).map(([key, indicator]) => (
        <ProgressIndicatorCard 
          key={key} 
          indicator={indicator} 
          onClose={() => {
            // 這裡可以添加關閉邏輯
          }}
        />
      ))}
    </div>
  )
}

interface ProgressIndicatorCardProps {
  indicator: {
    isVisible: boolean
    progress: number
    message: string
    type: 'determinate' | 'indeterminate'
  }
  onClose?: () => void
}

function ProgressIndicatorCard({ indicator, onClose }: ProgressIndicatorCardProps) {
  if (!indicator.isVisible) return null

  const getIcon = () => {
    if (indicator.progress >= 100) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else if (indicator.progress < 0) {
      return <XCircle className="h-4 w-4 text-red-500" />
    } else if (indicator.type === 'indeterminate') {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    } else {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />
    }
  }

  const getVariant = () => {
    if (indicator.progress >= 100) return 'success'
    if (indicator.progress < 0) return 'error'
    return 'default'
  }

  return (
    <Card className="shadow-lg border-l-4 border-l-blue-500 bg-white/95 backdrop-blur-sm">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-sm font-medium text-gray-900 flex-1">
            {indicator.message}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              ×
            </button>
          )}
        </div>
        
        {indicator.type === 'determinate' && (
          <div className="space-y-1">
            <Progress 
              value={Math.max(0, Math.min(100, indicator.progress))}
              variant={getVariant()}
              size="sm"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{Math.round(indicator.progress)}%</span>
              <span>
                {indicator.progress >= 100 ? '完成' : 
                 indicator.progress < 0 ? '失敗' : '進行中'}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// 簡單的載入指示器組件
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
}

export function LoadingSpinner({ size = 'md', message, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-blue-500", sizeClasses[size])} />
      {message && (
        <span className="text-sm text-gray-600">
          {message}
        </span>
      )}
    </div>
  )
}

// 操作成功的動畫組件
export function SuccessAnimation({ message = '操作成功!' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-green-600">
      <CheckCircle className="h-5 w-5" />
      <span className="font-medium">{message}</span>
    </div>
  )
}

// 操作失敗的動畫組件
export function ErrorAnimation({ message = '操作失敗' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-red-600">
      <XCircle className="h-5 w-5" />
      <span className="font-medium">{message}</span>
    </div>
  )
}

// 骨架載入組件
interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({ 
  className, 
  variant = 'rectangular', 
  animation = 'pulse' 
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-gray-200 rounded",
        variant === 'text' && "h-4 w-full rounded-md",
        variant === 'circular' && "rounded-full",
        variant === 'rectangular' && "rounded-md",
        animation === 'pulse' && "animate-pulse",
        animation === 'wave' && "bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_2s_infinite]",
        className
      )}
    />
  )
}

// 批量操作進度組件
interface BatchOperationProgressProps {
  total: number
  completed: number
  failed: number
  currentOperation?: string
  onCancel?: () => void
}

export function BatchOperationProgress({ 
  total, 
  completed, 
  failed, 
  currentOperation,
  onCancel 
}: BatchOperationProgressProps) {
  const progress = (completed + failed) / total * 100
  const successRate = completed / (completed + failed) * 100 || 0

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">批量操作進度</h3>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              取消
            </button>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>整體進度</span>
            <span>{completed + failed} / {total}</span>
          </div>
          <Progress value={progress} variant="default" size="md" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-green-600">
            <span className="font-medium">成功: </span>
            <span>{completed}</span>
          </div>
          <div className="text-red-600">
            <span className="font-medium">失敗: </span>
            <span>{failed}</span>
          </div>
        </div>
        
        {completed > 0 && (
          <div className="text-xs text-gray-500">
            成功率: {Math.round(successRate)}%
          </div>
        )}
        
        {currentOperation && (
          <div className="text-sm text-blue-600 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{currentOperation}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default GlobalLoadingOverlay