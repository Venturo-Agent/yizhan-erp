'use client'

/**
 * 通用表單欄位包裝元件
 */

import { Label } from '@/components/ui/label'

interface FieldProps {
  label: string
  className?: string
  children: React.ReactNode
}

export function Field({ label, className, children }: FieldProps) {
  return (
    <div className={`grid gap-1.5 ${className || ''}`}>
      <Label className="text-xs text-morandi-primary">{label}</Label>
      {children}
    </div>
  )
}
