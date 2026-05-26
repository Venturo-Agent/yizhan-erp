/**
 * IME-aware Input 組件
 * 解決中文輸入法（注音、拼音等）的組字問題
 *
 * 問題：React 的 onChange 會在輸入法組字期間觸發，導致注音符號被當作文字送出
 * 解決：使用 Composition Events 延遲更新，等組字完成才觸發 onChange
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

interface InputIMEProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
}

/**
 * 支援中文輸入法的 Input 組件
 * 使用方式與標準 Input 相同，但 onChange 會等組字完成才觸發
 */
const InputIME = React.forwardRef<HTMLInputElement, InputIMEProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [isComposing, setIsComposing] = React.useState(false)
    const [localValue, setLocalValue] = React.useState(value || '')

    // 同步外部 value 變化
    React.useEffect(() => {
      if (value !== undefined && !isComposing) {
        setLocalValue(value)
      }
    }, [value, isComposing])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value

      // 立即更新本地狀態（顯示在畫面上）
      setLocalValue(newValue)

      // 只在不是輸入法組字時才觸發 onChange
      if (!isComposing && onChange) {
        onChange(newValue)
      }
    }

    const handleCompositionStart = () => {
      setIsComposing(true)
    }

    const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
      setIsComposing(false)

      // 組字完成後觸發 onChange
      const finalValue = (e.target as HTMLInputElement).value
      if (onChange) {
        onChange(finalValue)
      }
    }

    return (
      <input
        ref={ref}
        value={localValue}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-morandi-gold disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          className
        )}
        {...props}
      />
    )
  }
)

InputIME.displayName = 'InputIME'

export { InputIME }

// 預設匯出，方便使用
