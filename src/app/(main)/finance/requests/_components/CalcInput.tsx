'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * 支援算式的數字輸入元件
 * 可輸入 "1000+2000+3000"，blur 時自動計算為 6000
 * 全形符號（＋－＊／）自動轉半形
 */
export function CalcInput({
  value,
  onChange,
  className,
  placeholder,
  disabled,
}: {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}) {
  const [displayValue, setDisplayValue] = useState(value ? String(value) : '')
  const focusedRef = useRef(false)

  // 只在非聚焦時同步外部值（避免打字中被蓋掉）
  useEffect(() => {
    if (!focusedRef.current) {
      setDisplayValue(value ? String(value) : '')
    }
  }, [value])

  // 全形轉半形（數字 + 運算符號）
  const normalize = (str: string) =>
    str
      // 全形數字 → 半形
      .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      // 全形運算符 → 半形
      .replace(/＋/g, '+')
      .replace(/－/g, '-')
      .replace(/＊/g, '*')
      .replace(/×/g, '*')
      .replace(/／/g, '/')
      .replace(/÷/g, '/')
      // 全形小數點
      .replace(/．/g, '.')
      // 移除逗號（千分位）
      .replace(/，/g, '')
      .replace(/,/g, '')
      // 只保留數字和運算符
      .replace(/[^\d+\-*/.]/g, '')

  // 安全計算算式（只允許數字和 +-*/）
  const evaluate = (expr: string): number => {
    const normalized = normalize(expr)
    if (!normalized) return 0
    try {
      // 拆成加減項計算，避免 eval
      const result = normalized.split('+').reduce((sum, part) => {
        if (part.includes('-')) {
          const [first, ...rest] = part.split('-')
          return sum + (parseFloat(first) || 0) - rest.reduce((s, v) => s + (parseFloat(v) || 0), 0)
        }
        return sum + (parseFloat(part) || 0)
      }, 0)
      return Math.round(result * 100) / 100
    } catch {
      return parseFloat(normalized) || 0
    }
  }

  const handleBlur = () => {
    const result = evaluate(displayValue)
    setDisplayValue(result ? String(result) : '')
    onChange(result)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={e => {
        // IME 組字期間不 setState（用 browser 原生 isComposing、不自寫 ref 避免卡死）
        if (!(e.nativeEvent as InputEvent).isComposing) {
          setDisplayValue(e.target.value)
        }
      }}
      onCompositionEnd={e => {
        // 確認時立即 normalize 全形→半形、user 看到的就是半形數字
        setDisplayValue(normalize((e.target as HTMLInputElement).value))
      }}
      onFocus={() => {
        focusedRef.current = true
      }}
      onBlur={() => {
        focusedRef.current = false
        handleBlur()
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.stopPropagation()
          ;(e.target as HTMLInputElement).blur()
        }
      }}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
    />
  )
}
