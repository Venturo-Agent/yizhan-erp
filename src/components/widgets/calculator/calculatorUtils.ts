/**
 * 計算機工具函式
 */

/**
 * 執行基本運算
 */
export const calculate = (firstValue: number, secondValue: number, operation: string): number => {
  switch (operation) {
    case '+':
      return firstValue + secondValue
    case '-':
      return firstValue - secondValue
    case '×':
      return firstValue * secondValue
    case '÷':
      return firstValue / secondValue
    default:
      return secondValue
  }
}

/**
 * 安全的數學表達式解析器
 * 使用遞迴下降解析，不使用 eval
 */
class SafeMathParser {
  private pos = 0
  private expr = ''

  parse(expression: string): number {
    // 只允許數字、運算符號、小數點、括號
    this.expr = expression.replace(/[^0-9+\-*/().]/g, '')
    this.pos = 0

    if (!this.expr) return 0

    const result = this.parseExpression()
    return isNaN(result) ? 0 : result
  }

  private parseExpression(): number {
    let left = this.parseTerm()

    while (this.pos < this.expr.length) {
      const op = this.expr[this.pos]
      if (op !== '+' && op !== '-') break
      this.pos++
      const right = this.parseTerm()
      left = op === '+' ? left + right : left - right
    }

    return left
  }

  private parseTerm(): number {
    let left = this.parseFactor()

    while (this.pos < this.expr.length) {
      const op = this.expr[this.pos]
      if (op !== '*' && op !== '/') break
      this.pos++
      const right = this.parseFactor()
      left = op === '*' ? left * right : left / right
    }

    return left
  }

  private parseFactor(): number {
    // 處理負號
    if (this.expr[this.pos] === '-') {
      this.pos++
      return -this.parseFactor()
    }

    // 處理括號
    if (this.expr[this.pos] === '(') {
      this.pos++
      const result = this.parseExpression()
      if (this.expr[this.pos] === ')') this.pos++
      return result
    }

    // 解析數字
    let numStr = ''
    while (
      this.pos < this.expr.length &&
      ((this.expr[this.pos] >= '0' && this.expr[this.pos] <= '9') || this.expr[this.pos] === '.')
    ) {
      numStr += this.expr[this.pos]
      this.pos++
    }

    return parseFloat(numStr) || 0
  }
}

const safeMathParser = new SafeMathParser()

/**
 * 計算算式結果（安全版本，不使用 eval）
 */
export const evaluateExpression = (expr: string, fallback: number = 0): number => {
  try {
    // 將運算符號轉換為標準格式
    const normalized = expr.replace(/×/g, '*').replace(/÷/g, '/')

    const result = safeMathParser.parse(normalized)
    return isNaN(result) ? fallback : result
  } catch {
    return fallback
  }
}

/**
 * 處理貼上的文字：移除非數字/運算符號，轉換全形為半形
 */
export const processPastedText = (text: string): string => {
  return (
    text
      // 全形數字轉半形
      .replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
      // 全形運算符號轉半形
      .replace(/[＋－×＊÷／]/g, char => {
        const map: Record<string, string> = {
          '＋': '+',
          '－': '-',
          '×': '×',
          '＊': '×',
          '÷': '÷',
          '／': '÷',
        }
        return map[char] || char
      })
      // 全形小數點和等號轉半形
      .replace(/．/g, '.')
      .replace(/＝/g, '=')
      // 移除所有非數字、運算符號、小數點的字元（包括英文字母）
      .replace(/[^0-9+\-×*÷/.=]/g, '')
      // * 轉 ×, / 轉 ÷
      .replace(/\*/g, '×')
      .replace(/\//g, '÷')
  )
}

/**
 * 檢查是否為運算符號
 */
export const isOperator = (char: string): boolean => {
  return ['+', '-', '×', '÷'].includes(char)
}
