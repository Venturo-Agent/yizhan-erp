import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SpinnerSize = 'sm' | 'md' | 'lg'

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  /**
   * 視覺尺寸：
   * - sm = 14px（按鈕內、表格 inline）
   * - md = 20px（一般 loading）
   * - lg = 28px（整頁 / panel loading）
   */
  size?: SpinnerSize
}

const sizeClass: Record<SpinnerSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
}

/**
 * Spinner — 全站 loading icon SSOT。
 *
 * 直接散刻 `<Loader2 className="animate-spin ..." />` 已被 codemod 收攏到這裡。
 * 預設色 text-morandi-secondary、外部可用 `className` 覆寫色 / 邊距。
 */
export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ size = 'md', className, ...props }, ref) => (
    <Loader2
      ref={ref}
      className={cn(sizeClass[size], 'animate-spin text-morandi-secondary', className)}
      aria-hidden="true"
      {...props}
    />
  )
)
Spinner.displayName = 'Spinner'
