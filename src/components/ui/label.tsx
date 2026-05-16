import * as React from 'react'
import { cn } from '@/lib/utils'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** 是否為必填欄位，當為 true 時顯示紅色 * 號 */
  required?: boolean
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-morandi-red">*</span>}
    </label>
  )
)
Label.displayName = 'Label'

export { Label }

