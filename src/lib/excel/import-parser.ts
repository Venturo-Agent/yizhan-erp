/**
 * 通用 Excel/CSV 匯入解析器
 *
 * 支援 .xlsx 和 .csv 檔案讀取，回傳結構化資料
 * 提供欄位映射、自動標題偵測、模板下載
 */

import { logger } from '@/lib/utils/logger'

// ─── Types ───────────────────────────────────────────────

/** 欄位映射設定：Excel 中文標題 → DB 欄位名 */
export interface ColumnMapping {
  /** Excel 中的標題文字（中文） */
  header: string
  /** 資料庫欄位名（snake_case） */
  field: string
  /** 是否必填 */
  required?: boolean
  /** 欄寬（下載模板用） */
  width?: number
  /** 值轉換器 */
  transform?: (value: string) => string | null
}

/** 解析後的單列資料（含驗證結果） */
export interface ParsedRow<T = Record<string, string | null>> {
  /** 原始 Excel 行號（從 1 開始） */
  row_number: number
  /** 解析後的結構化資料 */
  data: T
  /** 欄位級別的錯誤（key = field name） */
  errors: Record<string, string>
  /** 列級別的警告訊息 */
  warnings: string[]
}

/** 匯入解析結果 */
interface ImportParseResult<T = Record<string, string | null>> {
  /** 成功解析的資料列 */
  rows: ParsedRow<T>[]
  /** 全域錯誤訊息（如檔案格式錯誤） */
  global_errors: string[]
  /** 識別到的標題行 */
  detected_headers: string[]
  /** 總列數（含空列） */
  total_rows: number
}

/** 驗證規則 */
interface ValidationRule {
  /** 驗證函式，回傳 null 表示通過，回傳字串表示錯誤訊息 */
  validate: (value: string | null, row: Record<string, string | null>) => string | null
}

/** 匯入設定 */
export interface ImportConfig<T = Record<string, string | null>> {
  /** 欄位映射設定 */
  columns: ColumnMapping[]
  /** 額外的驗證規則（key = field name） */
  validators?: Record<string, ValidationRule[]>
  /** 列級別的驗證（跨欄位檢查） */
  row_validator?: (row: T) => string[]
}

// ─── 解析函式 ────────────────────────────────────────────

/**
 * 解析 Excel 或 CSV 檔案
 */
export async function parseImportFile<T = Record<string, string | null>>(
  file: File,
  config: ImportConfig<T>
): Promise<ImportParseResult<T>> {
  const XLSX = await import('xlsx')

  const global_errors: string[] = []

  // 讀取檔案
  let workbook: ReturnType<typeof XLSX.read>
  try {
    const buffer = await file.arrayBuffer()
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  } catch (err) {
    logger.error('Excel 檔案讀取失敗', err)
    return {
      rows: [],
      global_errors: ['無法讀取檔案，請確認檔案格式為 .xlsx 或 .csv'],
      detected_headers: [],
      total_rows: 0,
    }
  }

  // 取第一個工作表
  const sheet_name = workbook.SheetNames[0]
  if (!sheet_name) {
    return {
      rows: [],
      global_errors: ['檔案中沒有工作表'],
      detected_headers: [],
      total_rows: 0,
    }
  }

  const worksheet = workbook.Sheets[sheet_name]
  if (!worksheet) {
    return {
      rows: [],
      global_errors: ['工作表為空'],
      detected_headers: [],
      total_rows: 0,
    }
  }

  // 轉成 JSON（每列是一個 string[] ）
  const raw_data: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  })

  if (raw_data.length === 0) {
    return {
      rows: [],
      global_errors: ['檔案沒有資料'],
      detected_headers: [],
      total_rows: 0,
    }
  }

  // 偵測標題行（找到第一行包含至少 2 個已知標題的列）
  const known_headers = config.columns.map(c => c.header.trim())
  let header_row_index = -1
  let detected_headers: string[] = []

  for (let i = 0; i < Math.min(raw_data.length, 10); i++) {
    const row = raw_data[i]
    if (!row) continue
    const cells = row.map(c => String(c ?? '').trim())
    const match_count = cells.filter(cell => known_headers.includes(cell)).length
    if (match_count >= 2) {
      header_row_index = i
      detected_headers = cells
      break
    }
  }

  if (header_row_index === -1) {
    // 若找不到，假設第一行就是標題
    const first_row = raw_data[0]
    if (first_row) {
      header_row_index = 0
      detected_headers = first_row.map(c => String(c ?? '').trim())
      global_errors.push('未偵測到已知標題行，已使用第一行作為標題')
    } else {
      return {
        rows: [],
        global_errors: ['無法偵測標題行'],
        detected_headers: [],
        total_rows: 0,
      }
    }
  }

  // 建立標題 → 欄位映射表
  const header_to_column = new Map<number, ColumnMapping>()
  for (const col_config of config.columns) {
    const col_index = detected_headers.indexOf(col_config.header.trim())
    if (col_index !== -1) {
      header_to_column.set(col_index, col_config)
    }
  }

  // 檢查必填欄位是否都找到
  const required_missing = config.columns
    .filter(c => c.required)
    .filter(c => !detected_headers.includes(c.header.trim()))
  if (required_missing.length > 0) {
    global_errors.push(`缺少必填欄位：${required_missing.map(c => c.header).join('、')}`)
  }

  // 解析資料列
  const data_rows = raw_data.slice(header_row_index + 1)
  const rows: ParsedRow<T>[] = []

  for (let i = 0; i < data_rows.length; i++) {
    const raw_row = data_rows[i]
    if (!raw_row) continue

    // 跳過全空列
    const cells = raw_row.map(c => String(c ?? '').trim())
    if (cells.every(c => c === '')) continue

    const row_data: Record<string, string | null> = {}
    const errors: Record<string, string> = {}
    const warnings: string[] = []

    // 映射欄位值
    for (const [col_index, col_config] of header_to_column.entries()) {
      let value: string | null = cells[col_index] || null

      // 套用值轉換器
      if (value && col_config.transform) {
        value = col_config.transform(value)
      }

      row_data[col_config.field] = value

      // 必填檢查
      if (col_config.required && !value) {
        errors[col_config.field] = `${col_config.header}為必填`
      }
    }

    // 額外驗證
    if (config.validators) {
      for (const [field, rules] of Object.entries(config.validators)) {
        for (const rule of rules) {
          const error = rule.validate(row_data[field] ?? null, row_data)
          if (error) {
            errors[field] = error
            break // 每個欄位只顯示第一個錯誤
          }
        }
      }
    }

    // 列級別驗證
    if (config.row_validator) {
      const row_warnings = config.row_validator(row_data as T)
      warnings.push(...row_warnings)
    }

    rows.push({
      row_number: header_row_index + 2 + i, // Excel 行號（1-based + 標題行）
      data: row_data as T,
      errors,
      warnings,
    })
  }

  return {
    rows,
    global_errors,
    detected_headers,
    total_rows: data_rows.length,
  }
}

// ─── 模板下載 ────────────────────────────────────────────

/**
 * 產生並下載匯入模板 Excel 檔案
 */
export async function downloadImportTemplate(
  columns: ColumnMapping[],
  filename: string,
  sheet_name: string = '匯入資料'
): Promise<void> {
  const XLSX = await import('xlsx')

  // 建立只有標題行的資料
  const headers = columns.map(c => c.header)
  const worksheet = XLSX.utils.aoa_to_sheet([headers])

  // 設定欄寬
  worksheet['!cols'] = columns.map(c => ({ wch: c.width ?? 15 }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheet_name)

  XLSX.writeFile(workbook, filename)
}

// ─── 通用驗證器 ──────────────────────────────────────────

/** Email 格式驗證 */
export const emailValidator: ValidationRule = {
  validate: value => {
    if (!value) return null
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return pattern.test(value) ? null : 'Email 格式不正確'
  },
}

/** 電話格式驗證（寬鬆：允許數字、+、-、空格、括號） */
export const phoneValidator: ValidationRule = {
  validate: value => {
    if (!value) return null
    const pattern = /^[+\d][\d\s\-()]{5,}$/
    return pattern.test(value) ? null : '電話格式不正確'
  },
}

/** 日期格式驗證（YYYY-MM-DD 或 YYYY/MM/DD） */
export const dateValidator: ValidationRule = {
  validate: value => {
    if (!value) return null
    // 嘗試解析日期
    const normalized = value.replace(/\//g, '-')
    const date = new Date(normalized)
    if (isNaN(date.getTime())) {
      return '日期格式不正確，請使用 YYYY-MM-DD 或 YYYY/MM/DD'
    }
    return null
  },
}

// ─── 工具函式 ────────────────────────────────────────────

/** 將日期值正規化為 YYYY-MM-DD 格式 */
export function normalizeDateValue(value: string): string | null {
  if (!value) return null
  const normalized = value.replace(/\//g, '-')
  const date = new Date(normalized)
  if (isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 性別值正規化 */
export function normalizeGenderValue(value: string): string | null {
  if (!value) return null
  const lower = value.toLowerCase().trim()
  if (['男', 'male', 'm', 'M'].includes(lower)) return '男'
  if (['女', 'female', 'f', 'F'].includes(lower)) return '女'
  return value
}
