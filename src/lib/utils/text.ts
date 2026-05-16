/**
 * 全形轉半形工具函數
 * 自動將全形字符（數字、英文、符號）轉換為半形
 */

/**
 * 將全形字符轉換為半形
 * 只轉換數字、英文字母和部分符號，保留全形標點符號（，。？！「」『』：【】等）
 * @param str 輸入字串
 * @returns 轉換後的半形字串
 */
export function toHalfWidth(str: string): string {
  if (!str) return str

  return (
    str
      // 只轉換全形數字 ０-９ (0xFF10-0xFF19) → 0-9
      .replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
      // 只轉換全形大寫英文 Ａ-Ｚ (0xFF21-0xFF3A) → A-Z
      .replace(/[Ａ-Ｚ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
      // 只轉換全形小寫英文 ａ-ｚ (0xFF41-0xFF5A) → a-z
      .replace(/[ａ-ｚ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
      // 全形空格轉半形空格
      .replace(/　/g, ' ')
      // 全形運算符號轉半形（用於數學計算）
      .replace(/＋/g, '+')
      .replace(/－/g, '-')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/＊/g, '*')
      .replace(/（/g, '(')
      .replace(/）/g, ')')
      .replace(/％/g, '%')
      .replace(/＝/g, '=')
  )
}

/**
 * 嘗試計算數學表達式
 * 支援 +, -, *, /, () 和百分比
 * @param str 輸入字串
 * @returns 計算結果或原字串（如果不是有效表達式）
 */
export function tryCalculateMath(str: string): string {
  if (!str || typeof str !== 'string') return str

  // 先轉換全形
  const normalized = toHalfWidth(str.trim())

  // 檢查是否是純數學表達式（只包含數字、運算符、空格、小數點、括號）
  // 排除只有單一數字的情況
  const mathPattern = /^[\d\s+\-*/().%]+$/
  if (!mathPattern.test(normalized)) return str

  // 檢查是否包含運算符（確保是表達式而非單純數字）
  const hasOperator = /[+\-*/]/.test(normalized.replace(/^-/, '')) // 排除開頭的負號

  if (!hasOperator) return str

  try {
    // 處理百分比：將 % 轉換為 /100
    const withPercent = normalized.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)')

    // 安全的數學計算（使用 Function 而非 eval）
    // 只允許數字和基本運算符
    const sanitized = withPercent.replace(/[^0-9+\-*/().]/g, '')

    if (!sanitized) return str

    // 使用 Function 進行計算
    const result = new Function(`return (${sanitized})`)()

    // 驗證結果是有效數字
    if (typeof result === 'number' && isFinite(result) && !isNaN(result)) {
      // 保留最多 2 位小數，移除尾部的 0
      const formatted = parseFloat(result.toFixed(2)).toString()
      return formatted
    }
  } catch {
    // 計算失敗，返回原字串
  }

  return str
}

/**
 * React Input onChange 事件包裝器
 * 自動將全形轉換為半形
 */
function _withHalfWidthConversion<T extends HTMLInputElement | HTMLTextAreaElement>(
  originalOnChange?: React.ChangeEventHandler<T>
): React.ChangeEventHandler<T> {
  return e => {
    // ✅ 修正：不直接修改 e.target.value，而是在 onChange 中傳遞轉換後的值
    // 這樣可以避免中文輸入時的重複問題

    if (!originalOnChange) return

    // 轉換為半形
    const convertedValue = toHalfWidth(e.target.value)

    // 如果值有改變，創建新的 event 物件傳遞轉換後的值
    if (convertedValue !== e.target.value) {
      // 創建新的 event，保留原始 event 的所有屬性
      const newEvent = {
        ...e,
        target: {
          ...e.target,
          value: convertedValue,
        },
      } as React.ChangeEvent<T>

      originalOnChange(newEvent)
    } else {
      // 值沒變，直接傳遞原始 event
      originalOnChange(e)
    }
  }
}
