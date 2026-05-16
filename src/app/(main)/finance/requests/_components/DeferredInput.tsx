'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * IME 友善的文字輸入元件
 * 使用 local state 避免注音輸入時因 parent re-render 導致的延遲
 * 僅在 blur 或 IME composition 結束時同步回 parent
 */
export function DeferredInput({
  value,
  onChange,
  className,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}) {
  const [localValue, setLocalValue] = useState(value)
  const composingRef = useRef(false)

  // 當外部 value 改變時同步（例如重設表單）
  useEffect(() => {
    if (!composingRef.current) {
      setLocalValue(value)
    }
  }, [value])

  return (
    <input
      type="text"
      value={localValue}
      onChange={e => {
        setLocalValue(e.target.value)
        // 非 IME 組字中，即時同步
        if (!composingRef.current) {
          onChange(e.target.value)
        }
      }}
      onCompositionStart={() => {
        composingRef.current = true
      }}
      onCompositionEnd={e => {
        composingRef.current = false
        onChange((e.target as HTMLInputElement).value)
      }}
      onBlur={() => {
        if (localValue !== value) {
          onChange(localValue)
        }
      }}
      disabled={disabled}
      className={className}
    />
  )
}
