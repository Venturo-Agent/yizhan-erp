'use client'

import { useState, useCallback, useEffect } from 'react'

/**
 * 安全算式求值（shunting-yard）— 不用 eval / new Function。
 * 2026-05-25：SEC-007 Strict CSP 移除 unsafe-eval、原本的 new Function 被 CSP 擋、
 * 害請款單/單價/報價單算式全失效。改純解析、資安(CSP) 與算式功能兩全。
 * 只處理 + - * /、括號、一元負號（如 5*-3）；輸入已由 caller 限定字元集。
 */
function evaluateArithmetic(expr: string): number | null {
  const tokens = expr.match(/\d+\.?\d*|\.\d+|[+\-*/()]/g)
  if (!tokens) return null

  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, 'u-': 3 }
  const output: (number | string)[] = [] // RPN
  const ops: string[] = []
  let prev: 'num' | 'op' | 'lparen' | null = null

  for (const tk of tokens) {
    if (/^[\d.]/.test(tk)) {
      const n = Number(tk)
      if (!isFinite(n)) return null
      output.push(n)
      prev = 'num'
    } else if (tk === '(') {
      ops.push(tk)
      prev = 'lparen'
    } else if (tk === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') output.push(ops.pop() as string)
      if (!ops.length) return null
      ops.pop() // 去掉 '('
      prev = 'num'
    } else {
      // 開頭 / 運算符後 / 左括號後的 + - 視為一元
      if (tk === '+' && (prev === null || prev === 'op' || prev === 'lparen')) {
        prev = 'op'
        continue // 一元正號無作用
      }
      const op = tk === '-' && (prev === null || prev === 'op' || prev === 'lparen') ? 'u-' : tk
      while (
        ops.length &&
        ops[ops.length - 1] !== '(' &&
        (prec[ops[ops.length - 1]] > prec[op] ||
          (prec[ops[ops.length - 1]] === prec[op] && op !== 'u-'))
      ) {
        output.push(ops.pop() as string)
      }
      ops.push(op)
      prev = 'op'
    }
  }
  while (ops.length) {
    const op = ops.pop() as string
    if (op === '(') return null
    output.push(op)
  }

  const stack: number[] = []
  for (const t of output) {
    if (typeof t === 'number') {
      stack.push(t)
    } else if (t === 'u-') {
      const a = stack.pop()
      if (a === undefined) return null
      stack.push(-a)
    } else {
      const b = stack.pop()
      const a = stack.pop()
      if (a === undefined || b === undefined) return null
      if (t === '+') stack.push(a + b)
      else if (t === '-') stack.push(a - b)
      else if (t === '*') stack.push(a * b)
      else if (t === '/') {
        if (b === 0) return null
        stack.push(a / b)
      } else return null
    }
  }
  if (stack.length !== 1) return null
  return isFinite(stack[0]) ? stack[0] : null
}

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

  // 2026-05-25：改用 evaluateArithmetic（純解析、不用 new Function）、避開 Strict CSP 封鎖 eval
  const result = evaluateArithmetic(cleaned)
  if (result === null || typeof result !== 'number' || !isFinite(result)) {
    return null
  }
  return result
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
