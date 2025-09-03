"use client"

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, Clock } from 'lucide-react'

interface TimePickerProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function TimePicker({ 
  value = '', 
  onChange, 
  className, 
  placeholder = '選擇時間',
  disabled = false 
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hours, setHours] = useState(value ? parseInt(value.split(':')[0]) || 0 : 9)
  const [minutes, setMinutes] = useState(value ? parseInt(value.split(':')[1]) || 0 : 0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 當外部 value 改變時更新內部狀態
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number)
      setHours(h || 0)
      setMinutes(m || 0)
    }
  }, [value])

  // 點擊外部關閉下拉選單
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const formatTime = (h: number, m: number) => {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  const handleTimeChange = (newHours: number, newMinutes: number) => {
    const newH = Math.max(0, Math.min(23, newHours))
    const newM = Math.max(0, Math.min(59, newMinutes))
    
    setHours(newH)
    setMinutes(newM)
    
    if (onChange) {
      onChange(formatTime(newH, newM))
    }
  }

  const incrementHours = () => handleTimeChange((hours + 1) % 24, minutes)
  const decrementHours = () => handleTimeChange(hours === 0 ? 23 : hours - 1, minutes)
  const incrementMinutes = () => handleTimeChange(hours, (minutes + 1) % 60)
  const decrementMinutes = () => handleTimeChange(hours, minutes === 0 ? 59 : minutes - 1)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 觸發按鈕 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-lg">
            {value ? formatTime(hours, minutes) : placeholder}
          </span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* 時間選擇下拉選單 */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover p-4 shadow-md outline-none animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center justify-center gap-4">
            {/* 小時選擇器 */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={incrementHours}
                className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent hover:text-accent-foreground"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              
              <div className="flex flex-col items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value) || 0, minutes)}
                  className="w-12 h-12 text-center text-xl font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                />
                <span className="text-xs text-muted-foreground font-medium">時</span>
              </div>
              
              <button
                type="button"
                onClick={decrementHours}
                className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent hover:text-accent-foreground"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* 分隔符 */}
            <div className="text-2xl font-mono font-bold">:</div>

            {/* 分鐘選擇器 */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={incrementMinutes}
                className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent hover:text-accent-foreground"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              
              <div className="flex flex-col items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => handleTimeChange(hours, parseInt(e.target.value) || 0)}
                  className="w-12 h-12 text-center text-xl font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                />
                <span className="text-xs text-muted-foreground font-medium">分</span>
              </div>
              
              <button
                type="button"
                onClick={decrementMinutes}
                className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent hover:text-accent-foreground"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 快速選擇按鈕 */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                handleTimeChange(9, 0)
                setIsOpen(false)
              }}
              className="px-2 py-1 rounded border hover:bg-accent hover:text-accent-foreground"
            >
              09:00
            </button>
            <button
              type="button"
              onClick={() => {
                handleTimeChange(12, 0)
                setIsOpen(false)
              }}
              className="px-2 py-1 rounded border hover:bg-accent hover:text-accent-foreground"
            >
              12:00
            </button>
            <button
              type="button"
              onClick={() => {
                handleTimeChange(17, 0)
                setIsOpen(false)
              }}
              className="px-2 py-1 rounded border hover:bg-accent hover:text-accent-foreground"
            >
              17:00
            </button>
            <button
              type="button"
              onClick={() => {
                handleTimeChange(8, 0)
                setIsOpen(false)
              }}
              className="px-2 py-1 rounded border hover:bg-accent hover:text-accent-foreground"
            >
              08:00
            </button>
            <button
              type="button"
              onClick={() => {
                handleTimeChange(13, 0)
                setIsOpen(false)
              }}
              className="px-2 py-1 rounded border hover:bg-accent hover:text-accent-foreground"
            >
              13:00
            </button>
            <button
              type="button"
              onClick={() => {
                handleTimeChange(18, 0)
                setIsOpen(false)
              }}
              className="px-2 py-1 rounded border hover:bg-accent hover:text-accent-foreground"
            >
              18:00
            </button>
          </div>

          {/* 確認按鈕 */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              確認 ({formatTime(hours, minutes)})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}