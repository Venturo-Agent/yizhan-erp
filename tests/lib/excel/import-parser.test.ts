import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  emailValidator,
  phoneValidator,
  dateValidator,
  normalizeDateValue,
  normalizeGenderValue,
  parseImportFile,
  type ColumnMapping,
} from '@/lib/excel/import-parser'

// pure helper 測試（validators + normalizers）+ parseImportFile 用 mocked xlsx 跑 happy path。
// downloadImportTemplate 不測 — 純 IO（writeFile）、無回傳值可斷言。

// ─── xlsx mock ──────────────────────────────────────────
// 用 mutable stub 讓每個 test 換 sheet_to_json 行為。
const xlsxStub = {
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
    aoa_to_sheet: vi.fn(),
    book_new: vi.fn(),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}

vi.mock('xlsx', () => xlsxStub)

describe('import-parser pure helpers', () => {
  // ──────────────────────────────────────────────────────────
  // emailValidator
  // ──────────────────────────────────────────────────────────
  describe('emailValidator', () => {
    it('passes empty string (空值由 required 規則處理)', () => {
      expect(emailValidator.validate('', {})).toBeNull()
    })

    it('passes null (空值由 required 規則處理)', () => {
      expect(emailValidator.validate(null, {})).toBeNull()
    })

    it('passes a normal email', () => {
      expect(emailValidator.validate('alice@example.com', {})).toBeNull()
    })

    it('passes email with subdomain and plus tag', () => {
      expect(emailValidator.validate('alice+tag@mail.example.co.jp', {})).toBeNull()
    })

    it('rejects email without @', () => {
      expect(emailValidator.validate('alice.example.com', {})).toBe('Email 格式不正確')
    })

    it('rejects email without domain', () => {
      expect(emailValidator.validate('alice@', {})).toBe('Email 格式不正確')
    })

    it('rejects email with spaces', () => {
      expect(emailValidator.validate('alice @example.com', {})).toBe('Email 格式不正確')
    })

    it('rejects email without TLD', () => {
      expect(emailValidator.validate('alice@example', {})).toBe('Email 格式不正確')
    })
  })

  // ──────────────────────────────────────────────────────────
  // phoneValidator
  // ──────────────────────────────────────────────────────────
  describe('phoneValidator', () => {
    it('passes empty string', () => {
      expect(phoneValidator.validate('', {})).toBeNull()
    })

    it('passes null', () => {
      expect(phoneValidator.validate(null, {})).toBeNull()
    })

    it('passes a TW mobile (0912345678)', () => {
      expect(phoneValidator.validate('0912345678', {})).toBeNull()
    })

    it('passes a +886 international number', () => {
      expect(phoneValidator.validate('+886-912-345-678', {})).toBeNull()
    })

    it('passes a number with spaces and dashes', () => {
      expect(phoneValidator.validate('02 1234 5678', {})).toBeNull()
    })

    it('rejects number starting with "(" (pattern 限制第一碼為 +/數字)', () => {
      expect(phoneValidator.validate('(02) 1234-5678', {})).toBe('電話格式不正確')
    })

    it('rejects too-short number (< 6 chars after first digit)', () => {
      // pattern: ^[+\d][\d\s\-()]{5,}$ — 第一碼 + 至少 5 碼 = 至少 6 碼
      expect(phoneValidator.validate('1234', {})).toBe('電話格式不正確')
    })

    it('rejects letters', () => {
      expect(phoneValidator.validate('0912abc678', {})).toBe('電話格式不正確')
    })

    it('rejects starting with letter', () => {
      expect(phoneValidator.validate('a0912345678', {})).toBe('電話格式不正確')
    })
  })

  // ──────────────────────────────────────────────────────────
  // dateValidator
  // ──────────────────────────────────────────────────────────
  describe('dateValidator', () => {
    it('passes empty string', () => {
      expect(dateValidator.validate('', {})).toBeNull()
    })

    it('passes null', () => {
      expect(dateValidator.validate(null, {})).toBeNull()
    })

    it('passes YYYY-MM-DD', () => {
      expect(dateValidator.validate('2026-05-08', {})).toBeNull()
    })

    it('passes YYYY/MM/DD', () => {
      expect(dateValidator.validate('2026/05/08', {})).toBeNull()
    })

    it('rejects garbage string', () => {
      expect(dateValidator.validate('not-a-date', {})).toBe(
        '日期格式不正確，請使用 YYYY-MM-DD 或 YYYY/MM/DD'
      )
    })

    it('rejects clearly invalid value', () => {
      expect(dateValidator.validate('XXXX', {})).toBe(
        '日期格式不正確，請使用 YYYY-MM-DD 或 YYYY/MM/DD'
      )
    })
  })

  // ──────────────────────────────────────────────────────────
  // normalizeDateValue
  // ──────────────────────────────────────────────────────────
  describe('normalizeDateValue', () => {
    it('returns null for empty string', () => {
      expect(normalizeDateValue('')).toBeNull()
    })

    it('normalizes YYYY-MM-DD as-is', () => {
      expect(normalizeDateValue('2026-05-08')).toBe('2026-05-08')
    })

    it('normalizes YYYY/MM/DD to YYYY-MM-DD', () => {
      expect(normalizeDateValue('2026/05/08')).toBe('2026-05-08')
    })

    it('zero-pads single-digit month / day', () => {
      // new Date('2026-1-3') 在 V8 上會被解成 2026-01-03 local time
      expect(normalizeDateValue('2026/1/3')).toBe('2026-01-03')
    })

    it('returns null for invalid date string', () => {
      expect(normalizeDateValue('not-a-date')).toBeNull()
    })

    it('returns null for clearly invalid value', () => {
      expect(normalizeDateValue('XXXX')).toBeNull()
    })
  })

  // ──────────────────────────────────────────────────────────
  // normalizeGenderValue
  // ──────────────────────────────────────────────────────────
  describe('normalizeGenderValue', () => {
    it('returns null for empty string', () => {
      expect(normalizeGenderValue('')).toBeNull()
    })

    it('keeps 男 as 男', () => {
      expect(normalizeGenderValue('男')).toBe('男')
    })

    it('keeps 女 as 女', () => {
      expect(normalizeGenderValue('女')).toBe('女')
    })

    it('maps "male" to 男', () => {
      expect(normalizeGenderValue('male')).toBe('男')
    })

    it('maps "MALE" to 男 (大小寫不敏感)', () => {
      expect(normalizeGenderValue('MALE')).toBe('男')
    })

    it('maps "female" to 女', () => {
      expect(normalizeGenderValue('female')).toBe('女')
    })

    it('maps "FEMALE" to 女', () => {
      expect(normalizeGenderValue('FEMALE')).toBe('女')
    })

    it('maps "m" to 男', () => {
      expect(normalizeGenderValue('m')).toBe('男')
    })

    it('maps "f" to 女', () => {
      expect(normalizeGenderValue('f')).toBe('女')
    })

    it('trims whitespace before matching', () => {
      expect(normalizeGenderValue('  male  ')).toBe('男')
    })

    it('returns original value for unrecognized input', () => {
      expect(normalizeGenderValue('其他')).toBe('其他')
    })
  })
})

// ──────────────────────────────────────────────────────────
// parseImportFile（用 mocked xlsx 跑 happy path）
// ──────────────────────────────────────────────────────────
describe('parseImportFile (with mocked xlsx)', () => {
  // 建構假 File：jsdom 的 File 沒實作 arrayBuffer()、用最小 stub 即可
  // （xlsx 已被 mock、buffer 內容根本不會被讀）。
  const makeFakeFile = (): File => {
    const fake = {
      arrayBuffer: async () => new ArrayBuffer(8),
      name: 'test.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
    return fake as unknown as File
  }

  const columns: ColumnMapping[] = [
    { header: '姓名', field: 'name', required: true },
    { header: 'Email', field: 'email' },
    { header: '電話', field: 'phone' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // 預設 read() 回一個有一個 sheet 的 workbook
    xlsxStub.read.mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: { '!ref': 'A1:C2' } },
    })
  })

  it('parses a basic sheet with headers + 1 data row (happy path)', async () => {
    xlsxStub.utils.sheet_to_json.mockReturnValue([
      ['姓名', 'Email', '電話'],
      ['Alice', 'alice@example.com', '0912345678'],
    ])

    const result = await parseImportFile(makeFakeFile(), { columns })

    expect(result.global_errors).toEqual([])
    expect(result.detected_headers).toEqual(['姓名', 'Email', '電話'])
    expect(result.total_rows).toBe(1)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.data).toEqual({
      name: 'Alice',
      email: 'alice@example.com',
      phone: '0912345678',
    })
    expect(result.rows[0]?.errors).toEqual({})
    expect(result.rows[0]?.row_number).toBe(2) // header on row 1, data on row 2
  })

  it('parses multiple data rows', async () => {
    xlsxStub.utils.sheet_to_json.mockReturnValue([
      ['姓名', 'Email', '電話'],
      ['Alice', 'alice@example.com', '0912345678'],
      ['Bob', 'bob@example.com', '0922000111'],
    ])

    const result = await parseImportFile(makeFakeFile(), { columns })

    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]?.data.name).toBe('Alice')
    expect(result.rows[1]?.data.name).toBe('Bob')
    expect(result.rows[1]?.row_number).toBe(3)
  })

  it('skips fully empty rows', async () => {
    xlsxStub.utils.sheet_to_json.mockReturnValue([
      ['姓名', 'Email', '電話'],
      ['Alice', 'alice@example.com', '0912345678'],
      ['', '', ''],
      ['Bob', 'bob@example.com', '0922000111'],
    ])

    const result = await parseImportFile(makeFakeFile(), { columns })

    // 全空列被跳過、但 total_rows 仍是 raw_data 切掉 header 後的長度
    expect(result.rows).toHaveLength(2)
    expect(result.rows.map(r => r.data.name)).toEqual(['Alice', 'Bob'])
  })

  it('flags required field error when value is empty', async () => {
    xlsxStub.utils.sheet_to_json.mockReturnValue([
      ['姓名', 'Email', '電話'],
      ['', 'alice@example.com', '0912345678'],
    ])

    const result = await parseImportFile(makeFakeFile(), { columns })

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.errors).toHaveProperty('name')
    expect(result.rows[0]?.errors.name).toContain('姓名')
  })

  it('runs custom validator and records errors', async () => {
    xlsxStub.utils.sheet_to_json.mockReturnValue([
      ['姓名', 'Email', '電話'],
      ['Alice', 'not-an-email', '0912345678'],
    ])

    const result = await parseImportFile(makeFakeFile(), {
      columns,
      validators: { email: [emailValidator] },
    })

    expect(result.rows[0]?.errors.email).toBe('Email 格式不正確')
  })

  it('applies value transform before storing', async () => {
    const upperColumns: ColumnMapping[] = [
      { header: '姓名', field: 'name', required: true, transform: v => v.toUpperCase() },
      { header: 'Email', field: 'email' },
    ]
    xlsxStub.utils.sheet_to_json.mockReturnValue([
      ['姓名', 'Email'],
      ['alice', 'a@b.com'],
    ])

    const result = await parseImportFile(makeFakeFile(), { columns: upperColumns })

    expect(result.rows[0]?.data.name).toBe('ALICE')
  })

  it('runs row_validator and pushes warnings', async () => {
    xlsxStub.utils.sheet_to_json.mockReturnValue([
      ['姓名', 'Email', '電話'],
      ['Alice', 'alice@example.com', '0912345678'],
    ])

    const result = await parseImportFile(makeFakeFile(), {
      columns,
      row_validator: () => ['這是測試警告'],
    })

    expect(result.rows[0]?.warnings).toEqual(['這是測試警告'])
  })

  it('reports missing required headers as global error', async () => {
    xlsxStub.utils.sheet_to_json.mockReturnValue([
      ['Email', '電話'], // 缺「姓名」這個 required 欄位
      ['alice@example.com', '0912345678'],
    ])

    const result = await parseImportFile(makeFakeFile(), { columns })

    expect(result.global_errors.some(e => e.includes('姓名'))).toBe(true)
  })

  it('returns global_error when sheet has zero rows', async () => {
    xlsxStub.utils.sheet_to_json.mockReturnValue([])

    const result = await parseImportFile(makeFakeFile(), { columns })

    expect(result.rows).toEqual([])
    expect(result.global_errors).toContain('檔案沒有資料')
  })

  it('returns global_error when XLSX.read throws', async () => {
    xlsxStub.read.mockImplementation(() => {
      throw new Error('boom')
    })
    xlsxStub.utils.sheet_to_json.mockReturnValue([])

    const result = await parseImportFile(makeFakeFile(), { columns })

    expect(result.rows).toEqual([])
    expect(result.global_errors[0]).toContain('無法讀取檔案')
  })

  it('falls back to first row as header when no known headers match', async () => {
    xlsxStub.utils.sheet_to_json.mockReturnValue([
      ['完全不認識的欄', '另一個怪欄'],
      ['x', 'y'],
    ])

    const result = await parseImportFile(makeFakeFile(), { columns })

    // fallback 訊息 + 找不到必填欄位都會塞進 global_errors
    expect(result.global_errors.some(e => e.includes('未偵測到已知標題行'))).toBe(true)
  })
})
