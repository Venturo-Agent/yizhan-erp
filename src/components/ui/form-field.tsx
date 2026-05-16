import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from './label'
import { FieldError } from './field-error'

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string | string[]
  children: React.ReactNode
  className?: string
  labelClassName?: string
}

/**
 * 表單欄位包裝組件
 * 整合 Label（含必填標記）、表單控件、錯誤訊息顯示
 */
export function FormField({
  label,
  required,
  error,
  children,
  className,
  labelClassName,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label required={required} className={labelClassName}>
        {label}
      </Label>
      {children}
      <FieldError error={error} />
    </div>
  )
}
