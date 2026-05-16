'use client'

import React, { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { formatTimeInput, fullWidthToHalf } from '@/lib/utils/format-time-input'
import { cn } from '@/lib/utils'

interface TimeInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value'
> {
  value: string
  onChange: (value: string) => void
}

/**
 * 時間輸入組件
 *
 * 功能：
 * 1. 全形轉半形 (０７：００ → 07:00)
 * 2. 自動加冒號 (0700 → 07:00)
 * 3. 失焦時格式化
 */
export function TimeInput({ value, onChange, className, ...props }: TimeInputProps) {
  const [internalValue, setInternalValue] = useState(value)

  // 當外部 value 變化時同步
  React.useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // 輸入時先轉換全形為半形
    const halfWidth = fullWidthToHalf(e.target.value)
    setInternalValue(halfWidth)
  }, [])

  const handleBlur = useCallback(() => {
    // 失焦時格式化時間
    const formatted = formatTimeInput(internalValue)
    setInternalValue(formatted)
    onChange(formatted)
  }, [internalValue, onChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Enter 時格式化
      if (e.key === 'Enter') {
        const formatted = formatTimeInput(internalValue)
        setInternalValue(formatted)
        onChange(formatted)
      }
    },
    [internalValue, onChange]
  )

  return (
    <Input
      {...props}
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={props.placeholder || '07:00'}
      className={cn('font-mono', className)}
    />
  )
}
