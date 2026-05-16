import * as React from 'react'

import { cn } from '@/lib/utils'
import { toHalfWidth, tryCalculateMath } from '@/lib/utils/text'

interface InputProps extends React.ComponentProps<'input'> {
  /**
   * 是否啟用數學計算（失焦時自動計算數學表達式）
   * @default true（數字類型輸入框）
   */
  enableMathCalculation?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      onChange,
      onKeyDown,
      onBlur,
      onCompositionStart,
      onCompositionEnd,
      enableMathCalculation,
      style,
      ...props
    },
    ref
  ) => {
    const isComposingRef = React.useRef(false)
    const justFinishedComposingRef = React.useRef(false)

    // 數字類型預設啟用數學計算
    const shouldCalculateMath = enableMathCalculation ?? (type === 'number' || type === 'text')

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!onChange) return

      // 如果正在使用輸入法，直接傳遞，不轉換
      if (isComposingRef.current) {
        onChange(e)
        return
      }

      // ⚠️ 如果剛結束輸入法，跳過這次 onChange（避免重複）
      if (justFinishedComposingRef.current) {
        justFinishedComposingRef.current = false
        return
      }

      // 非輸入法狀態，進行全形轉半形
      const convertedValue = toHalfWidth(e.target.value)
      if (convertedValue !== e.target.value) {
        const newEvent = {
          ...e,
          target: { ...e.target, value: convertedValue },
        } as React.ChangeEvent<HTMLInputElement>
        onChange(newEvent)
      } else {
        onChange(e)
      }
    }

    const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
      isComposingRef.current = false
      justFinishedComposingRef.current = true

      // 轉換全形到半形並立即觸發 onChange
      const convertedValue = toHalfWidth(e.currentTarget.value)
      if (onChange) {
        const syntheticEvent = {
          target: { value: convertedValue },
          currentTarget: { value: convertedValue },
        } as React.ChangeEvent<HTMLInputElement>
        onChange(syntheticEvent)
      }

      // 重置標記（延遲一點，確保下一次 input 事件被跳過）
      setTimeout(() => {
        justFinishedComposingRef.current = false
      }, 0)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // 🔥 核心：輸入法組合中按 Enter 時，阻止事件冒泡
      // 這樣可以防止表單提交或觸發其他 Enter 行為
      if (e.key === 'Enter' && isComposingRef.current) {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      // 先調用外部的 onKeyDown
      if (onKeyDown) {
        onKeyDown(e)
      }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // 失焦時進行數學計算（如果啟用）
      if (shouldCalculateMath && onChange && e.target.value) {
        const calculatedValue = tryCalculateMath(e.target.value)
        if (calculatedValue !== e.target.value) {
          const syntheticEvent = {
            ...e,
            target: { ...e.target, value: calculatedValue },
            currentTarget: { ...e.currentTarget, value: calculatedValue },
          } as React.ChangeEvent<HTMLInputElement>
          onChange(syntheticEvent)
        }
      }

      // 調用外部的 onBlur
      if (onBlur) {
        onBlur(e)
      }
    }

    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-card pr-3 pl-3 py-2 text-base font-medium file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground placeholder:font-normal focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-morandi-gold disabled:cursor-not-allowed disabled:bg-input-disabled-bg disabled:text-morandi-primary/85 read-only:bg-input-readonly-bg md:text-sm transition-colors',
          className
        )}
        style={style}
        ref={ref}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onCompositionStart={e => {
          isComposingRef.current = true
          // 調用外部的 onCompositionStart
          if (onCompositionStart) {
            onCompositionStart(e)
          }
        }}
        onCompositionEnd={e => {
          handleCompositionEnd(e)
          // 調用外部的 onCompositionEnd
          if (onCompositionEnd) {
            onCompositionEnd(e)
          }
        }}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

// 保留舊的 _Input 以防有其他地方使用
const _Input = Input

export { Input,  }
