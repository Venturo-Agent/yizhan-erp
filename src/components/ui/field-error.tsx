import * as React from 'react'
import { cn } from '@/lib/utils'

interface FieldErrorProps {
  error?: string | string[]
  className?: string
}

/**
 * 表單欄位錯誤顯示組件
 * 支援單一錯誤訊息或多個錯誤訊息陣列
 */
export function FieldError({ error, className }: FieldErrorProps) {
  if (!error) return null

  const errors = Array.isArray(error) ? error : [error]

  if (errors.length === 0) return null

  return (
    <div className={cn('mt-1.5 space-y-1', className)}>
      {errors.map((err, index) => (
        <p key={index} className="text-xs text-morandi-red" role="alert">
          {err}
        </p>
      ))}
    </div>
  )
}
