/**
 * 台灣身分證 / 統一證號（ARC 新式）驗證
 *
 * 規則：
 * - 台灣身分證：A123456789（1 字母 + 9 數字、第 2 位 1=男 2=女）
 *   checksum 演算法：字母轉 2 位數 → 取個位 ×9 + 十位 ×1 → 加上 8 位數字（各乘 8/7/6/5/4/3/2/1）→ 加上 checksum →
 *   合計 mod 10 = 0
 * - 統一證號（新式 ARC、外籍居留）：A823456789（第 2 位是 8 或 9、其他規則同上、字母仍可換算）
 * - 統一證號（舊式）：AB12345678（兩字母 + 8 數字、字母轉碼算法略不同、暫不實作 strict checksum）
 *
 * Reference: https://www.ris.gov.tw/app/portal/2121
 */

// 字母對應的 2 位數（A=10、B=11、... Z=33）
const LETTER_VALUE: Record<string, number> = {
  A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17,
  J: 18, K: 19, L: 20, M: 21, N: 22, P: 23, Q: 24, R: 25,
  S: 26, T: 27, U: 28, V: 29, X: 30, Y: 31, W: 32, Z: 33,
  I: 34, O: 35,
}

const WEIGHTS = [1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1] // 11 個權重 (letter 拆 2 位 + 9 數字)

export type NationalIdKind =
  | 'twId' // 台灣本國人身分證
  | 'arcNew' // 統一證號（新式 ARC、外籍）
  | 'arcOld' // 舊式 ARC AB12345678
  | 'invalid' // 格式不符
  | 'empty' // 空

export interface NationalIdValidation {
  kind: NationalIdKind
  /** checksum 是否正確（empty/invalid 為 null）*/
  checksumOk: boolean | null
  /** 給 UI 顯示的訊息 */
  message: string
}

const FMT_TW = /^[A-Z][12][0-9]{8}$/ // 台灣身分證
const FMT_ARC_NEW = /^[A-Z][89][0-9]{8}$/ // 統一證號新式
const FMT_ARC_OLD = /^[A-Z][A-D][0-9]{8}$/ // 舊式 ARC（兩字母）

function calcChecksum(id: string): boolean {
  const firstLetter = id[0]
  const letterCode = LETTER_VALUE[firstLetter]
  if (letterCode === undefined) return false

  // 字母 2 位數 + 後面 9 個字（共 11 位）
  const tens = Math.floor(letterCode / 10)
  const ones = letterCode % 10
  const digits = [tens, ones, ...id.slice(1).split('').map(Number)]

  if (digits.some(d => Number.isNaN(d))) return false

  const sum = digits.reduce((acc, d, i) => acc + d * WEIGHTS[i], 0)
  return sum % 10 === 0
}

export function validateNationalId(rawValue: string | null | undefined): NationalIdValidation {
  const v = (rawValue ?? '').trim().toUpperCase()

  if (!v) {
    return { kind: 'empty', checksumOk: null, message: '' }
  }

  if (FMT_TW.test(v)) {
    const ok = calcChecksum(v)
    return {
      kind: 'twId',
      checksumOk: ok,
      message: ok ? '台灣身分證（格式正確）' : '⚠ 身分證號 checksum 不符、請確認',
    }
  }

  if (FMT_ARC_NEW.test(v)) {
    const ok = calcChecksum(v)
    return {
      kind: 'arcNew',
      checksumOk: ok,
      message: ok
        ? '統一證號（在台外籍居留）'
        : '⚠ 統一證號 checksum 不符、請確認',
    }
  }

  if (FMT_ARC_OLD.test(v)) {
    return {
      kind: 'arcOld',
      // 舊式 ARC checksum 算法不同、暫不 strict 驗
      checksumOk: null,
      message: '舊式居留證號（建議改填新式統一證號或護照）',
    }
  }

  return {
    kind: 'invalid',
    checksumOk: null,
    message: '不是台灣身分證或居留證、是否要改填護照號碼？',
  }
}
