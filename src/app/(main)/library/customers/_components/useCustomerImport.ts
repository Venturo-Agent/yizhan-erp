'use client'

/**
 * 客戶匯入邏輯 hook
 *
 * 管理：檔案解析 / 重複檢查 / 逐列匯入 / 狀態重置
 */

import { useState, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import {
  parseImportFile,
  downloadImportTemplate,
  emailValidator,
  phoneValidator,
  dateValidator,
  normalizeDateValue,
  normalizeGenderValue,
  type ColumnMapping,
  type ImportConfig,
  type ParsedRow,
} from '@/lib/excel/import-parser'
import { createCustomer, useCustomers } from '@/data'
import type { Customer } from '@/types/customer.types'

const CUSTOMER_LOGGER = {
  IMPORT_PARSE_FAILED: 'Customer import parsing failed',
  IMPORT_BATCH_FAILED: 'Customer batch import failed',
}

// ─── Types ───────────────────────────────────────────────

export interface CustomerImportRow {
  name: string | null
  english_name: string | null
  phone: string | null
  email: string | null
  passport_number: string | null
  passport_expiry: string | null
  birth_date: string | null
  gender: string | null
  notes: string | null
}

export interface PreviewTableRow {
  id: string
  row_number: number
  status: 'ok' | 'error' | 'warning' | 'duplicate'
  status_text: string
  name: string
  english_name: string
  phone: string
  email: string
  passport_number: string
  passport_expiry: string
  birth_date: string
  gender: string
  notes: string
  errors: Record<string, string>
  warnings: string[]
}

// ─── Config ──────────────────────────────────────────────

export const CUSTOMER_COLUMNS: ColumnMapping[] = [
  { header: '姓名', field: 'name', required: true, width: 12 },
  { header: '英文姓名', field: 'english_name', width: 20 },
  { header: '電話', field: 'phone', width: 15 },
  { header: 'Email', field: 'email', width: 25 },
  { header: '護照號碼', field: 'passport_number', width: 15 },
  {
    header: '護照效期',
    field: 'passport_expiry',
    width: 15,
    transform: normalizeDateValue,
  },
  { header: '出生日期', field: 'birth_date', width: 15, transform: normalizeDateValue },
  { header: '性別', field: 'gender', width: 8, transform: normalizeGenderValue },
  { header: '備註', field: 'notes', width: 30 },
]

const IMPORT_CONFIG: ImportConfig<CustomerImportRow> = {
  columns: CUSTOMER_COLUMNS,
  validators: {
    email: [emailValidator],
    phone: [phoneValidator],
    passport_expiry: [dateValidator],
    birth_date: [dateValidator],
  },
}

// ─── Hook ────────────────────────────────────────────────

export function useCustomerImport(onClose: () => void) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [parsed_rows, setParsedRows] = useState<ParsedRow<CustomerImportRow>[]>([])
  const [global_errors, setGlobalErrors] = useState<string[]>([])
  const [selected_file, setSelectedFile] = useState<File | null>(null)
  const [is_importing, setIsImporting] = useState(false)
  const file_input_ref = useRef<HTMLInputElement>(null)

  const { items: existing_customers } = useCustomers()

  const resetState = useCallback(() => {
    setStep('upload')
    setParsedRows([])
    setGlobalErrors([])
    setSelectedFile(null)
    setIsImporting(false)
  }, [])

  const checkDuplicates = useCallback(
    (rows: ParsedRow<CustomerImportRow>[]): ParsedRow<CustomerImportRow>[] => {
      return rows.map(row => {
        const warnings = [...row.warnings]
        const passport = row.data.passport_number
        const phone = row.data.phone

        if (passport) {
          const dup = existing_customers.find((c: Customer) => c.passport_number === passport)
          if (dup) warnings.push(`護照號碼 ${passport} 已存在`)
        }

        if (phone) {
          const dup = existing_customers.find((c: Customer) => c.phone === phone)
          if (dup) warnings.push(`電話 ${phone} 已存在`)
        }

        return { ...row, warnings }
      })
    },
    [existing_customers]
  )

  const handleFileParse = useCallback(
    async (file: File) => {
      setSelectedFile(file)
      try {
        const result = await parseImportFile<CustomerImportRow>(file, IMPORT_CONFIG)
        setGlobalErrors(result.global_errors)
        const rows_with_dup_check = checkDuplicates(result.rows)
        setParsedRows(rows_with_dup_check)
        setStep('preview')
      } catch (err) {
        logger.error(CUSTOMER_LOGGER.IMPORT_PARSE_FAILED, err)
        toast.error('檔案解析失敗')
      }
    },
    [checkDuplicates]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) void handleFileParse(file)
      if (e.target) e.target.value = ''
    },
    [handleFileParse]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) void handleFileParse(file)
    },
    [handleFileParse]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDownloadTemplate = useCallback(async () => {
    await downloadImportTemplate(CUSTOMER_COLUMNS, '顧客匯入模板.xlsx', '顧客資料')
  }, [])

  const handleImport = useCallback(async () => {
    const valid_rows = parsed_rows.filter(r => Object.keys(r.errors).length === 0)
    if (valid_rows.length === 0) {
      toast.error('沒有可匯入的資料')
      return
    }

    setIsImporting(true)
    let success_count = 0

    try {
      for (const row of valid_rows) {
        try {
          await createCustomer({
            name: row.data.name || '',
            english_name: row.data.english_name || undefined,
            phone: row.data.phone || '',
            email: row.data.email || undefined,
            passport_number: row.data.passport_number || undefined,
            passport_expiry: row.data.passport_expiry || null,
            birth_date: row.data.birth_date || null,
            gender: row.data.gender || undefined,
            notes: row.data.notes || undefined,
            member_type: 'member',
            is_vip: false,
            is_active: true,
            verification_status: 'unverified',
          })
          success_count++
        } catch (err) {
          logger.error(`匯入第 ${row.row_number} 列失敗`, err)
        }
      }

      if (success_count === valid_rows.length) {
        toast.success(`成功匯入 ${success_count} 位顧客`)
      } else {
        toast.warning(`匯入完成：${success_count}/${valid_rows.length} 筆成功`)
      }
      onClose()
    } catch (err) {
      logger.error(CUSTOMER_LOGGER.IMPORT_BATCH_FAILED, err)
      toast.error('匯入失敗，請稍後再試')
    } finally {
      setIsImporting(false)
    }
  }, [parsed_rows, onClose])

  const preview_data: PreviewTableRow[] = useMemo(() => {
    return parsed_rows.map((row, idx) => {
      const has_errors = Object.keys(row.errors).length > 0
      const has_warnings = row.warnings.length > 0
      let status: PreviewTableRow['status'] = 'ok'
      let status_text = '正常'
      if (has_errors) {
        status = 'error'
        status_text = '有錯誤'
      } else if (has_warnings) {
        status = 'warning'
        status_text = '可能重複'
      }

      return {
        id: String(idx),
        row_number: row.row_number,
        status,
        status_text,
        name: row.data.name || '',
        english_name: row.data.english_name || '',
        phone: row.data.phone || '',
        email: row.data.email || '',
        passport_number: row.data.passport_number || '',
        passport_expiry: row.data.passport_expiry || '',
        birth_date: row.data.birth_date || '',
        gender: row.data.gender || '',
        notes: row.data.notes || '',
        errors: row.errors,
        warnings: row.warnings,
      }
    })
  }, [parsed_rows])

  const error_count = useMemo(
    () => parsed_rows.filter(r => Object.keys(r.errors).length > 0).length,
    [parsed_rows]
  )

  const valid_count = useMemo(
    () => parsed_rows.filter(r => Object.keys(r.errors).length === 0).length,
    [parsed_rows]
  )

  return {
    step,
    parsed_rows,
    global_errors,
    selected_file,
    is_importing,
    file_input_ref,
    preview_data,
    error_count,
    valid_count,
    resetState,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleDownloadTemplate,
    handleImport,
  }
}
