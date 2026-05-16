import { describe, it, expect } from 'vitest'
import { TABLES, type TableName } from '@/lib/db/schemas'

/**
 * 業務 risk:
 *   TABLES 是「實體 → DB table 名」的 SSOT、被 Stores / hooks / data layer 大量引用。
 *   不小心改 key / 值 / 漏 export → 多處 silent 壞掉、TS 雖會擋但人為複製貼上仍會逃漏。
 *
 * 這份測試守的是「常數結構不變式」、不是業務邏輯。
 *   - 同一個 key 改值 = breaking
 *   - 兩個 key 對到同一個值 = 可疑（可能是複製貼上錯誤）
 *   - 值不能是 snake_case 以外格式（PostgreSQL convention）
 *
 * src/lib/db/ 沒有 pure function、僅有此 const + migrations(SQL)。
 * schemas-only 測試可以擋住「commit 時手滑改錯字」這類低成本但廣傳染的事故。
 */

describe('TABLES constant (DB table SSOT)', () => {
  describe('結構穩定性', () => {
    it('export 是 plain object', () => {
      expect(typeof TABLES).toBe('object')
      expect(TABLES).not.toBeNull()
      expect(Array.isArray(TABLES)).toBe(false)
    })

    it('至少包含核心業務表（regression guard）', () => {
      // 這幾張表掉了 → 多處 store 直接 build error
      // 列名單不是要鎖定全部、只鎖核心、避免新增表時得改測試
      const required: Array<keyof typeof TABLES> = [
        'EMPLOYEES',
        'TOURS',
        'ORDERS',
        'CUSTOMERS',
        'PAYMENT_REQUESTS',
        'DISBURSEMENT_ORDERS',
        'QUOTES',
        'COMPANIES',
        'JOURNAL_VOUCHERS',
        'JOURNAL_LINES',
      ]
      for (const key of required) {
        expect(TABLES[key]).toBeDefined()
        expect(typeof TABLES[key]).toBe('string')
      }
    })

    it('值都是非空 string', () => {
      const values = Object.values(TABLES)
      expect(values.length).toBeGreaterThan(0)
      for (const v of values) {
        expect(typeof v).toBe('string')
        expect(v.length).toBeGreaterThan(0)
      }
    })
  })

  describe('命名規範（PostgreSQL convention）', () => {
    it('值都是 snake_case（小寫 + 底線、無大寫、無連字號、無空白）', () => {
      const snakeCase = /^[a-z][a-z0-9_]*$/
      for (const [key, value] of Object.entries(TABLES)) {
        expect(value, `TABLES.${key} = "${value}" 不是 snake_case`).toMatch(snakeCase)
      }
    })

    it('table 名複數（大部分情況）— 不強制、但 spot check 核心表', () => {
      // 這裡只 spot check、不全部強制：有少數例外（如 calendar_events 已是複數）
      const pluralExpected = [
        TABLES.EMPLOYEES,
        TABLES.TOURS,
        TABLES.ORDERS,
        TABLES.CUSTOMERS,
        TABLES.QUOTES,
        TABLES.COMPANIES,
      ]
      for (const v of pluralExpected) {
        expect(v.endsWith('s')).toBe(true)
      }
    })
  })

  describe('唯一性（防複製貼上）', () => {
    it('沒有兩個 key 指到同一個 table（值唯一）', () => {
      const values = Object.values(TABLES)
      const unique = new Set(values)
      expect(unique.size).toBe(values.length)
    })

    it('key 都是 SCREAMING_SNAKE_CASE', () => {
      const screaming = /^[A-Z][A-Z0-9_]*$/
      for (const key of Object.keys(TABLES)) {
        expect(key).toMatch(screaming)
      }
    })
  })

  describe('特定值 lock-in（最容易被誤改）', () => {
    // 這幾張的值是 RLS policy / 多處 SQL hard-coded 引用、不能任意改名
    it('EMPLOYEES 一定是 "employees"', () => {
      expect(TABLES.EMPLOYEES).toBe('employees')
    })

    it('TOURS 一定是 "tours"', () => {
      expect(TABLES.TOURS).toBe('tours')
    })

    it('PAYMENT_REQUESTS 一定是 "payment_requests"', () => {
      expect(TABLES.PAYMENT_REQUESTS).toBe('payment_requests')
    })

    it('PAYMENT_REQUEST_ITEMS 一定是 "payment_request_items"', () => {
      expect(TABLES.PAYMENT_REQUEST_ITEMS).toBe('payment_request_items')
    })

    it('DISBURSEMENT_ORDERS 一定是 "disbursement_orders"', () => {
      expect(TABLES.DISBURSEMENT_ORDERS).toBe('disbursement_orders')
    })

    it('JOURNAL_VOUCHERS / JOURNAL_LINES 為會計 SSOT、不能改', () => {
      expect(TABLES.JOURNAL_VOUCHERS).toBe('journal_vouchers')
      expect(TABLES.JOURNAL_LINES).toBe('journal_lines')
    })
  })

  describe('TableName 型別', () => {
    it('TableName 是 TABLES values 的 union（型別層、執行期僅驗 round-trip）', () => {
      // 取一個 known value、應可賦值給 TableName 而 TS 不抱怨
      const t: TableName = TABLES.EMPLOYEES
      expect(t).toBe('employees')
    })
  })
})
