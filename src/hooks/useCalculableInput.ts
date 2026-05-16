'use client'

import { useState, useCallback, useEffect } from 'react'

/**
 * 安全地計算數學表達式
 * 支援 +, -, *, /, 括號
 */
export function calculateExpression(expression: string): number | null {
  // 移除空白
  const cleaned = expression.replace(/\s/g, '')

  // 空值
  if (!cleaned) return null

  // 只允許數字、運算符、小數點、括號
  if (!/^[\d+\-*/().]+$/.test(cleaned)) {
    return null
  }

  // 檢查括號是否配對
  let parenCount = 0
  for (const char of cleaned) {
    if (char === '(') parenCount++
    if (char === ')') parenCount--
    if (parenCount < 0) return null
  }
  if (parenCount !== 0) return null

  // 防止危險的模式（如連續運算符，但允許負數如 5*-3）
  if (/[+*/]{2,}|--/.test(cleaned)) {
    return null
  }

  try {
    // 使用 Function 而非 eval，更安全

    const result = new Function(`return (${cleaned})`)()

    if (typeof result !== 'number' || !isFinite(result)) {
      return null
    }

    return result
  } catch {
    return null
  }
}

interface UseCalculableInputOptions {
  /** 是否允許小數，預設 false */
  allowDecimal?: boolean
  /** 小數位數，預設 0 */
  decimalPlaces?: number
}

interface UseCalculableInputReturn {
  /** 顯示的值（可能是表達式） */
  displayValue: string
  /** 是否正在編輯表達式 */
  isExpression: boolean
  /** 處理輸入變更 */
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** 處理按鍵（Enter 計算） */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  /** 處理失焦（自動計算） */
  handleBlur: () => void
  /** 手動設定顯示值 */
  setDisplayValue: (value: string) => void
}

/**
 * 可計算輸入框的 Hook
 *
 * @example
 * const { displayValue, handleChange, handleKeyDown, handleBlur, isExpression } = useCalculableInput(
 *   item.unit_price,
 *   (val) => handleUpdateItem(categoryId, item.id, 'unit_price', val)
 * )
 *
 * <input
 *   value={displayValue}
 *   onChange={handleChange}
 *   onKeyDown={handleKeyDown}
 *   onBlur={handleBlur}
 *   className={isExpression ? 'bg-status-warning-bg' : ''}
 * />
 */
function _useCalculableInput(
  value: number | null | undefined,
  onChange: (value: number | null) => void,
  options: UseCalculableInputOptions = {}
): UseCalculableInputReturn {
  const { allowDecimal = false, decimalPlaces = 0 } = options

  const [displayValue, setDisplayValue] = useState<string>(value != null ? String(value) : '')
  const [isExpression, setIsExpression] = useState(false)

  // 當外部 value 改變且不在編輯表達式時，更新顯示
  useEffect(() => {
    if (!isExpression) {
      setDisplayValue(value != null ? String(value) : '')
    }
  }, [value, isExpression])

  // 格式化數字
  const formatNumber = useCallback(
    (num: number): number => {
      if (allowDecimal) {
        return Math.round(num * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces)
      }
      return Math.round(num)
    },
    [allowDecimal, decimalPlaces]
  )

  // 計算並更新值
  const calculate = useCallback(() => {
    const trimmed = displayValue.trim()

    // 空值
    if (!trimmed) {
      onChange(null)
      setIsExpression(false)
      return
    }

    // 檢查是否包含運算符（是表達式）
    // 排除開頭的負號
    const hasOperator = /[+\-*/]/.test(trimmed.slice(1))

    if (hasOperator) {
      // 嘗試計算
      const result = calculateExpression(trimmed)
      if (result !== null) {
        const finalValue = formatNumber(result)
        onChange(finalValue)
        setDisplayValue(String(finalValue))
      }
      // 如果計算失敗，保持原本的表達式讓使用者修正
    } else {
      // 純數字
      const num = parseFloat(trimmed)
      if (!isNaN(num)) {
        const finalValue = formatNumber(num)
        onChange(finalValue)
        setDisplayValue(String(finalValue))
      }
    }

    setIsExpression(false)
  }, [displayValue, onChange, formatNumber])

  // 處理輸入變更
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setDisplayValue(newValue)

      // 檢查是否為表達式（排除開頭的負號）
      const hasOperator = /[+\-*/]/.test(newValue.slice(1))
      setIsExpression(hasOperator)

      // 如果是純數字，即時更新
      if (!hasOperator) {
        const num = parseFloat(newValue)
        if (!isNaN(num)) {
          onChange(num)
        } else if (newValue === '' || newValue === '-') {
          // 空值或正在輸入負數，不更新
        }
      }
    },
    [onChange]
  )

  // 處理按鍵
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        calculate()
      }
    },
    [calculate]
  )

  // 處理失焦
  const handleBlur = useCallback(() => {
    calculate()
  }, [calculate])

  return {
    displayValue,
    isExpression,
    handleChange,
    handleKeyDown,
    handleBlur,
    setDisplayValue,
  }
}
