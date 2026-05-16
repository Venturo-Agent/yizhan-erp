'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { evaluateExpression } from '@/components/widgets/calculator/calculatorUtils'

export function CalculatorWidget() {
  const t = useTranslations('dashboard')
  const [inputValue, setInputValue] = useState('')
  const [sequentialMode, setSequentialMode] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 清理輸入：移除中文、轉換全形為半形、移除空白
  const cleanInput = (text: string): string => {
    let result = text

    // 移除中文字符
    result = result.replace(/[\u4e00-\u9fa5]/g, '')

    // 轉換全形數字為半形
    result = result.replace(/[\uff10-\uff19]/g, char =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0)
    )

    // 轉換全形符號為半形
    result = result.replace(/[\uff0b\uff0d\uff0a\uff0f\uff08\uff09\uff0e]/g, char => {
      const fullToHalf: Record<string, string> = {
        '＋': '+',
        '－': '-',
        '＊': '*',
        '／': '/',
        '（': '(',
        '）': ')',
        '．': '.',
      }
      return fullToHalf[char] || char
    })

    // 移除所有空白
    result = result.replace(/\s/g, '')

    // 只保留數字、運算符號、小數點、括號
    result = result.replace(/[^0-9+\-*/.()]/g, '')

    return result
  }

  // 順序計算（從左到右）
  const calculateSequential = (expression: string): number => {
    // 移除括號（順序計算不支援括號）
    const expr = expression.replace(/[()]/g, '')

    // 拆分數字和運算符號
    const tokens: (number | string)[] = []
    let currentNumber = ''

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i]
      if ((char >= '0' && char <= '9') || char === '.') {
        currentNumber += char
      } else if (['+', '-', '*', '/'].includes(char)) {
        // 處理負號：如果是第一個字符或前一個是運算符號，視為負號
        if (char === '-' && (i === 0 || ['+', '-', '*', '/'].includes(expr[i - 1]))) {
          currentNumber += char
        } else {
          if (currentNumber) {
            tokens.push(parseFloat(currentNumber))
            currentNumber = ''
          }
          tokens.push(char)
        }
      }
    }
    if (currentNumber) {
      tokens.push(parseFloat(currentNumber))
    }

    // 從左到右計算
    if (tokens.length === 0) return 0
    let result = tokens[0] as number
    for (let i = 1; i < tokens.length; i += 2) {
      const operator = tokens[i] as string
      const nextNum = tokens[i + 1] as number

      if (operator === '+') result += nextNum
      else if (operator === '-') result -= nextNum
      else if (operator === '*') result *= nextNum
      else if (operator === '/') result /= nextNum
    }

    return result
  }

  // 即時計算結果
  const calculateResult = (): string => {
    if (!inputValue.trim()) return '0'

    try {
      const sanitized = inputValue.replace(/[^0-9+\-*/.()]/g, '')
      if (!sanitized) return '0'

      // 檢查是否只有運算符號，沒有數字
      if (!/\d/.test(sanitized)) {
        return '0'
      }

      // 檢查是否以運算符號開頭或結尾（除了負號）
      if (/[+*\/]$/.test(sanitized)) {
        return inputValue // 顯示原始輸入
      }

      let calculationResult: number

      if (sequentialMode) {
        // 順序計算模式
        calculationResult = calculateSequential(sanitized)
      } else {
        // 數學優先模式（使用安全的解析器，不使用 Function/eval）
        calculationResult = evaluateExpression(sanitized, NaN)
      }

      if (typeof calculationResult === 'number' && !isNaN(calculationResult)) {
        // 格式化數字，最多顯示 8 位小數
        return parseFloat(calculationResult.toFixed(8)).toString()
      }
      return inputValue
    } catch {
      // 如果計算失敗，返回原始輸入而不是「錯誤」
      return inputValue
    }
  }

  // 處理輸入變更
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = cleanInput(e.target.value)
    setInputValue(cleaned)
  }

  // 處理貼上事件
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    const cleaned = cleanInput(pastedText)
    setInputValue(cleaned)
  }

  // 處理按鍵事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const result = calculateResult()
      setInputValue(result)
    } else if (e.key === 'Escape') {
      setInputValue('')
    }
  }

  // 快速插入按鈕點擊
  const handleButtonClick = (value: string) => {
    if (value === '=') {
      const result = calculateResult()
      setInputValue(result)
    } else if (value === 'C') {
      setInputValue('')
    } else {
      setInputValue(prev => prev + value)
    }
  }

  const displayResult = calculateResult()

  return (
    <div className="h-full">
      <div className="h-full rounded-2xl border border-border/70 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:border-border/80 bg-gradient-to-br from-morandi-container/30 via-card to-morandi-gold/5">
        <div className="p-4 space-y-3 h-full flex flex-col overflow-y-auto">
          {/* Header with Icon */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <div
                className={cn(
                  'rounded-full p-2 text-white shadow-sm shadow-black/10',
                  'bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60',
                  'ring-1 ring-border/50'
                )}
              >
                <Calculator className="w-4 h-4 drop-shadow-sm" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-morandi-primary leading-tight tracking-wide">
                  {t('calculator')}
                </p>
                <p className="text-xs text-morandi-secondary/90 mt-1 leading-relaxed">
                  {t('calculatorDescription')}
                </p>
              </div>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={sequentialMode}
                onChange={e => setSequentialMode(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-morandi-gold/30 text-morandi-gold focus:ring-morandi-gold/20 cursor-pointer"
              />
              <span className="text-xs text-morandi-secondary/90 group-hover:text-morandi-primary transition-colors font-medium">
                {t('sequentialMode')}
              </span>
            </label>
          </div>

          {/* Display Area — 算式 + 結果同一行、自動填滿剩餘高度 */}
          <div
            className="rounded-xl bg-card/70 p-3 shadow-md border border-border/40 cursor-text flex items-center gap-3 flex-1 min-h-[48px]"
            onClick={() => inputRef.current?.focus()}
          >
            {/* 算式輸入（左、小字灰色） */}
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              value={inputValue}
              onChange={handleInputChange}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              className="flex-1 min-w-0 bg-transparent border-none outline-none font-mono text-sm text-morandi-secondary/80 placeholder:text-morandi-muted/40 font-medium"
              placeholder={t('inputExpression')}
            />
            {/* 即時結果（右、大字黑色） */}
            <div className="text-right text-2xl font-bold text-morandi-primary font-mono tracking-tight shrink-0">
              {displayResult}
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="grid grid-cols-4 gap-1 flex-shrink-0">
            {['7', '8', '9', '/'].map(btn => (
              <Button
                key={btn}
                variant="soft-gold"
                size="sm"
                onClick={() => handleButtonClick(btn)}
                className="h-8 text-xs font-bold bg-gradient-to-br from-card to-morandi-container/30 border border-morandi-gold/30 text-morandi-primary hover:from-morandi-gold/10 hover:to-morandi-gold/20 hover:border-morandi-gold/50 shadow-sm hover:shadow-md transition-all rounded-xl"
              >
                {btn}
              </Button>
            ))}
            {['4', '5', '6', '*'].map(btn => (
              <Button
                key={btn}
                variant="soft-gold"
                size="sm"
                onClick={() => handleButtonClick(btn)}
                className="h-8 text-xs font-bold bg-gradient-to-br from-card to-morandi-container/30 border border-morandi-gold/30 text-morandi-primary hover:from-morandi-gold/10 hover:to-morandi-gold/20 hover:border-morandi-gold/50 shadow-sm hover:shadow-md transition-all rounded-xl"
              >
                {btn}
              </Button>
            ))}
            {['1', '2', '3', '-'].map(btn => (
              <Button
                key={btn}
                variant="soft-gold"
                size="sm"
                onClick={() => handleButtonClick(btn)}
                className="h-8 text-xs font-bold bg-gradient-to-br from-card to-morandi-container/30 border border-morandi-gold/30 text-morandi-primary hover:from-morandi-gold/10 hover:to-morandi-gold/20 hover:border-morandi-gold/50 shadow-sm hover:shadow-md transition-all rounded-xl"
              >
                {btn}
              </Button>
            ))}
            {['0', '.', '(', ')'].map(btn => (
              <Button
                key={btn}
                variant="soft-gold"
                size="sm"
                onClick={() => handleButtonClick(btn)}
                className="h-8 text-xs font-bold bg-gradient-to-br from-card to-morandi-container/30 border border-morandi-gold/30 text-morandi-primary hover:from-morandi-gold/10 hover:to-morandi-gold/20 hover:border-morandi-gold/50 shadow-sm hover:shadow-md transition-all rounded-xl"
              >
                {btn}
              </Button>
            ))}
            <Button
              variant="soft-gold"
              size="sm"
              onClick={() => handleButtonClick('+')}
              className="h-8 text-xs font-bold bg-gradient-to-br from-card to-morandi-container/30 border border-morandi-gold/30 text-morandi-primary hover:from-morandi-gold/10 hover:to-morandi-gold/20 hover:border-morandi-gold/50 shadow-sm hover:shadow-md transition-all rounded-xl"
            >
              +
            </Button>
            <Button variant="soft-gold"
              size="sm"
              onClick={() => handleButtonClick('=')}
 className="h-8 text-xs font-bold transition-all rounded-xl"
            >
              =
            </Button>
            <Button
              variant="soft-gold"
              size="sm"
              onClick={() => handleButtonClick('C')}
              className="h-8 text-xs font-semibold col-span-2 bg-gradient-to-br from-card to-morandi-container/30 border border-morandi-gold/30 text-morandi-primary hover:from-status-danger-bg hover:to-status-danger-bg hover:text-status-danger hover:border-status-danger shadow-sm hover:shadow-md transition-all rounded-xl"
            >
              {t('clear')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
