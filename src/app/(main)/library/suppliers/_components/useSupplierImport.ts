'use client'

/**
 * 供應商匯入邏輯 hook
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
  type ColumnMapping,
  type ImportConfig,
  type ParsedRow,
} from '@/lib/excel/import-parser'
import { createSupplier, useSuppliersSlim } from '@/data'
import type { Supplier, SupplierType } from '@/types/supplier.types'

// ─── Types ───────────────────────────────────────────────

export interface SupplierImportRow {
  name: string | null
  english_name: string | null
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  type: string | null
  notes: string | null
}

export interface PreviewTableRow {
  id: string
  row_number: number
  status: 'ok' | 'error' | 'warning' | 'duplicate'
  status_text: string
  name: string
  english_name: string
  contact_person: string
  phone: string
  email: string
  address: string
  type: string
  notes: string
  errors: Record<string, string>
  warnings: string[]
}

// ─── Supplier type mapping ───────────────────────────────

const SUPPLIER_TYPE_MAP: Record<string, SupplierType> = {
  飯店: 'hotel',
  餐廳: 'restaurant',
  交通: 'transport',
  景點: 'attraction',
  導遊: 'guide',
  旅行社: 'agency',
  票務: 'ticketing',
  其他: 'other',
  hotel: 'hotel',
  restaurant: 'restaurant',
  transport: 'transport',
  attraction: 'attraction',
  guide: 'guide',
  agency: 'agency',
  ticketing: 'ticketing',
  other: 'other',
}

function normalizeSupplierType(value: string): string | null {
  if (!value) return null
  return SUPPLIER_TYPE_MAP[value.trim()] ?? 'other'
}

// ─── Config ──────────────────────────────────────────────

export const SUPPLIER_COLUMNS: ColumnMapping[] = [
  { header: '公司名稱', field: 'name', required: true, width: 20 },
  { header: '英文名稱', field: 'english_name', width: 20 },
  { header: '聯繫人', field: 'contact_person', width: 12 },
  { header: '電話', field: 'phone', width: 15 },
  { header: 'Email', field: 'email', width: 25 },
  { header: '地址', field: 'address', width: 30 },
  { header: '類別', field: 'type', width: 10, transform: normalizeSupplierType },
  { header: '備註', field: 'notes', width: 30 },
]

const IMPORT_CONFIG: ImportConfig<SupplierImportRow> = {
  columns: SUPPLIER_COLUMNS,
  validators: {
    email: [emailValidator],
    phone: [phoneValidator],
  },
}

// ─── Hook ────────────────────────────────────────────────

export function useSupplierImport(onClose: () => void) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [parsed_rows, setParsedRows] = useState<ParsedRow<SupplierImportRow>[]>([])
  const [global_errors, setGlobalErrors] = useState<string[]>([])
  const [selected_file, setSelectedFile] = useState<File | null>(null)
  const [is_importing, setIsImporting] = useState(false)
  const file_input_ref = useRef<HTMLInputElement>(null)

  const { items: existing_suppliers } = useSuppliersSlim({ all: true })

  const resetState = useCallback(() => {
    setStep('upload')
    setParsedRows([])
    setGlobalErrors([])
    setSelectedFile(null)
    setIsImporting(false)
  }, [])

  const checkDuplicates = useCallback(
    (rows: ParsedRow<SupplierImportRow>[]): ParsedRow<SupplierImportRow>[] => {
      return rows.map(row => {
        const warnings = [...row.warnings]
        const name = row.data.name

        if (name) {
          const dup = existing_suppliers.find((s: Supplier) => s.name === name)
          if (dup) warnings.push(`供應商名稱「${name}」已存在`)
        }

        return { ...row, warnings }
      })
    },
    [existing_suppliers]
  )

  const handleFileParse = useCallback(
    async (file: File) => {
      setSelectedFile(file)
      try {
        const result = await parseImportFile<SupplierImportRow>(file, IMPORT_CONFIG)
        setGlobalErrors(result.global_errors)
        const rows_with_dup_check = checkDuplicates(result.rows)
        setParsedRows(rows_with_dup_check)
        setStep('preview')
      } catch (err) {
        logger.error('供應商匯入解析失敗', err)
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
    await downloadImportTemplate(SUPPLIER_COLUMNS, '供應商匯入模板.xlsx', '供應商資料')
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
          await createSupplier({
            name: row.data.name || '',
            english_name: row.data.english_name || null,
            contact_person: row.data.contact_person || null,
            phone: row.data.phone || null,
            email: row.data.email || null,
            address: row.data.address || null,
            supplier_type_code: (row.data.type as SupplierType) || 'other',
            notes: row.data.notes || null,
          })
          success_count++
        } catch (err) {
          logger.error(`匯入第 ${row.row_number} 列供應商失敗`, err)
        }
      }

      if (success_count === valid_rows.length) {
        toast.success(`成功匯入 ${success_count} 家供應商`)
      } else {
        toast.warning(`匯入完成：${success_count}/${valid_rows.length} 筆成功`)
      }
      onClose()
    } catch (err) {
      logger.error('供應商批次匯入失敗', err)
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
        contact_person: row.data.contact_person || '',
        phone: row.data.phone || '',
        email: row.data.email || '',
        address: row.data.address || '',
        type: row.data.type || '',
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
