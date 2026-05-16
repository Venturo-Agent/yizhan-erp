/**
 * <FormLabel /> — 表單欄位標籤 SSOT
 *
 * 規格：
 *   - block label
 *   - text-sm font-medium text-morandi-primary
 *   - mb-2（跟 FormField 內部 space-y 對齊）
 *   - required → 後面加紅星 *
 *
 * 跟 ui/label.tsx (Label) 的差別：
 *   - Label = Radix-style 通用 label（不一定 block、適合 inline 場景）
 *   - FormLabel = 表單塊狀標籤（block + mb-2、適合 stacked form layout）
 *
 * 用法：
 *   <FormLabel htmlFor="name">姓名</FormLabel>
 *   <FormLabel required htmlFor="email">Email</FormLabel>
 */
import * as React from 'react'
import { cn } from '@/lib/utils'

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** 必填標記 → 後面加紅星 */
  required?: boolean
  /** 已過時：保留以容納舊 callsite，請改用 className 客製 */
  className?: string
  children: React.ReactNode
}

export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ required, className, children, ...rest }, ref) => {
    return (
      <label
        ref={ref}
        className={cn('block text-sm font-medium text-morandi-primary mb-2', className)}
        {...rest}
      >
        {children}
        {required && <span className="ml-0.5 text-morandi-red">*</span>}
      </label>
    )
  }
)
FormLabel.displayName = 'FormLabel'
