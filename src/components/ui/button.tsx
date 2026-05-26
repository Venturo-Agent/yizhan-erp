import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // 主 CTA（拍板動作）：淡金漸層 tone-on-tone（hero 同款 135deg）+ 暖深棕字 + 淡 border
        // 規格：UI_DESIGN_DECISIONS §3、tokens 在 tokens.css 的 --btn-primary-*
        default:
          '[background:var(--btn-primary-bg)] [color:var(--btn-primary-fg)] [border-color:var(--btn-primary-border)] border font-semibold transition-[filter] hover:brightness-[.96] active:brightness-[.92]',
        // 危險動作：維持原樣、避免誤傷刪除類按鈕視覺強度
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        // Outline：加輕漸層底 + 金色邊、跟 default 搭配有層次
        outline:
          'border border-morandi-gold/30 bg-gradient-to-br from-background to-morandi-container/20 hover:from-morandi-gold/10 hover:to-morandi-gold/20 hover:border-morandi-gold/50 text-morandi-primary',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // Soft：柔和漸層、給次要/非主 CTA、跟 dashboard widget 按鈕同一套配方
        soft: 'bg-gradient-to-br from-card to-morandi-container/30 border border-morandi-gold/30 text-morandi-primary hover:from-morandi-gold/10 hover:to-morandi-gold/20 hover:border-morandi-gold/50 shadow-sm hover:shadow-md',
        // Morandi 色系常用組合（避免各檔案手寫 className）
        'morandi-gold':
          'text-morandi-gold border border-morandi-gold/50 hover:bg-morandi-gold/10 hover:border-morandi-gold',
        // Soft gold（一般次操作）：取消 / 編輯 / 套用 / 一般文字按鈕
        // 規範化：8% bg + 20% border、避免太搶 default 的拍板動作主視覺
        'soft-gold':
          'bg-morandi-gold/[0.08] text-morandi-primary border border-morandi-gold/20 hover:bg-morandi-gold/[0.14] hover:border-morandi-gold/35 transition-colors',
        'morandi-destructive':
          'text-status-danger border border-status-danger/30 hover:bg-status-danger/10',
        'morandi-destructive-ghost':
          'text-status-danger hover:text-status-danger hover:bg-status-danger/10',
        // Header 按鈕統一樣式：頁面右上角所有按鈕都用這個（漸層 + shadow + rounded-xl）
        // 配方來源：dashboard 「小工具設定」按鈕
        // SSOT 規則：主操作走 ResponsiveHeader 的 primaryAction、輔助按鈕走 headerActions escape hatch、視覺一致
        'header-outline':
          'bg-gradient-to-br from-card to-morandi-container/30 border border-morandi-gold/30 text-morandi-primary hover:from-morandi-gold/10 hover:to-morandi-gold/20 hover:border-morandi-gold/50 shadow-md hover:shadow-lg rounded-xl transition-all',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        xs: 'h-8 rounded-md px-2.5 text-sm',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
        iconSm: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button }
