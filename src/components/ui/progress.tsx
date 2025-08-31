'use client'

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    showPercentage?: boolean
    size?: 'sm' | 'md' | 'lg'
    variant?: 'default' | 'success' | 'warning' | 'error'
  }
>(({ className, value, showPercentage = false, size = 'md', variant = 'default', ...props }, ref) => (
  <div className="relative w-full">
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-full bg-secondary",
        size === 'sm' && "h-2",
        size === 'md' && "h-3",
        size === 'lg' && "h-4",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-all duration-300 ease-in-out",
          variant === 'default' && "bg-gradient-to-r from-blue-500 to-blue-600",
          variant === 'success' && "bg-gradient-to-r from-green-500 to-green-600",
          variant === 'warning' && "bg-gradient-to-r from-yellow-500 to-orange-500",
          variant === 'error' && "bg-gradient-to-r from-red-500 to-red-600"
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
    {showPercentage && (
      <div className={cn(
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-medium text-white drop-shadow-sm",
        size === 'sm' && "text-[10px]",
        size === 'lg' && "text-sm"
      )}>
        {Math.round(value || 0)}%
      </div>
    )}
  </div>
))
Progress.displayName = ProgressPrimitive.Root.displayName

// 環形進度條
const CircularProgress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: number
    size?: number
    strokeWidth?: number
    showPercentage?: boolean
    variant?: 'default' | 'success' | 'warning' | 'error'
  }
>(({ className, value, size = 40, strokeWidth = 4, showPercentage = true, variant = 'default', ...props }, ref) => {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (value / 100) * circumference

  const getColor = () => {
    switch (variant) {
      case 'success': return 'text-green-500'
      case 'warning': return 'text-yellow-500'  
      case 'error': return 'text-red-500'
      default: return 'text-blue-500'
    }
  }

  return (
    <div 
      ref={ref}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* 背景圓 */}
        <circle
          className="text-gray-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* 進度圓 */}
        <circle
          className={cn("transition-all duration-300 ease-in-out", getColor())}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-700">
            {Math.round(value)}%
          </span>
        </div>
      )}
    </div>
  )
})
CircularProgress.displayName = "CircularProgress"

export { Progress, CircularProgress }