'use client'

/**
 * 客戶匯入 — 預覽步驟
 *
 * 顯示解析後的資料列、全域錯誤、狀態欄位
 */

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, CheckSquare } from 'lucide-react'
import { EnhancedTable, type TableColumn } from '@/components/ui/enhanced-table'
import type { PreviewTableRow } from './useCustomerImport'

interface ImportCustomersPreviewStepProps {
  preview_data: PreviewTableRow[]
  global_errors: string[]
  parsed_rows_count: number
  error_count: number
  selected_file: File | null
}

export function ImportCustomersPreviewStep({
  preview_data,
  global_errors,
  parsed_rows_count,
  error_count,
  selected_file,
}: ImportCustomersPreviewStepProps) {
  const t = useTranslations('library')
  const table_columns: TableColumn<PreviewTableRow>[] = useMemo(
    () => [
      {
        key: 'row_number',
        label: t('customerImportColRow'),
        width: '60px',
        render: (value: unknown) => (
          <span className="text-xs text-morandi-secondary font-mono">{String(value)}</span>
        ),
      },
      {
        key: 'status',
        label: t('customerImportColStatus'),
        width: '80px',
        render: (_value: unknown, row: PreviewTableRow) => {
          if (row.status === 'error') {
            return (
              <span
                className="inline-flex items-center gap-1 text-xs text-morandi-red"
                title={Object.values(row.errors).join('\n')}
              >
                <AlertTriangle size={12} />
                {row.status_text}
              </span>
            )
          }
          if (row.status === 'warning') {
            return (
              <span
                className="inline-flex items-center gap-1 text-xs text-status-warning"
                title={row.warnings.join('\n')}
              >
                <AlertTriangle size={12} />
                {row.status_text}
              </span>
            )
          }
          return (
            <span className="inline-flex items-center gap-1 text-xs text-morandi-green">
              <CheckSquare size={12} />
              {row.status_text}
            </span>
          )
        },
      },
      {
        key: 'name',
        label: t('customerImportColName'),
        render: (_value: unknown, row: PreviewTableRow) => (
          <span
            className={`text-sm ${row.errors['name'] ? 'text-morandi-red font-medium' : 'text-morandi-primary'}`}
          >
            {row.name || '-'}
          </span>
        ),
      },
      {
        key: 'english_name',
        label: t('customerImportColEnglishName'),
        render: (_value: unknown, row: PreviewTableRow) => (
          <span className="text-xs text-morandi-secondary">{row.english_name || '-'}</span>
        ),
      },
      {
        key: 'phone',
        label: t('customerImportColPhone'),
        render: (_value: unknown, row: PreviewTableRow) => (
          <span
            className={`text-xs ${row.errors['phone'] ? 'text-morandi-red' : 'text-morandi-primary'}`}
          >
            {row.phone || '-'}
          </span>
        ),
      },
      {
        key: 'email',
        label: t('customerImportColEmail'),
        render: (_value: unknown, row: PreviewTableRow) => (
          <span
            className={`text-xs ${row.errors['email'] ? 'text-morandi-red' : 'text-morandi-primary'}`}
          >
            {row.email || '-'}
          </span>
        ),
      },
      {
        key: 'passport_number',
        label: t('customerImportColPassportNumber'),
        render: (_value: unknown, row: PreviewTableRow) => (
          <span className="text-xs font-mono text-morandi-primary">
            {row.passport_number || '-'}
          </span>
        ),
      },
      {
        key: 'passport_expiry',
        label: t('customerImportColPassportExpiry'),
        render: (_value: unknown, row: PreviewTableRow) => (
          <span
            className={`text-xs ${row.errors['passport_expiry'] ? 'text-morandi-red' : 'text-morandi-secondary'}`}
          >
            {row.passport_expiry || '-'}
          </span>
        ),
      },
      {
        key: 'birth_date',
        label: t('customerImportColBirthDate'),
        render: (_value: unknown, row: PreviewTableRow) => (
          <span
            className={`text-xs ${row.errors['birth_date'] ? 'text-morandi-red' : 'text-morandi-secondary'}`}
          >
            {row.birth_date || '-'}
          </span>
        ),
      },
      {
        key: 'gender',
        label: t('customerImportColGender'),
        render: (_value: unknown, row: PreviewTableRow) => (
          <span className="text-xs text-morandi-secondary">{row.gender || '-'}</span>
        ),
      },
    ],
    [t]
  )

  const previewSummary =
    error_count > 0
      ? t('customerImportPreviewSummaryError', {
          total: parsed_rows_count,
          errorCount: error_count,
        })
      : t('customerImportPreviewSummaryOk', { total: parsed_rows_count })

  return (
    <>
      {/* 全域錯誤 */}
      {global_errors.length > 0 && (
        <div className="bg-morandi-red/10 border border-morandi-red/30 rounded-lg p-3">
          {global_errors.map((err, i) => (
            <p key={i} className="text-sm text-morandi-red flex items-center gap-1">
              <AlertTriangle size={14} />
              {err}
            </p>
          ))}
        </div>
      )}

      {/* 摘要 */}
      <div className="flex items-center justify-between bg-morandi-container/10 rounded-lg px-4 py-2">
        <div className="text-sm text-morandi-primary">{previewSummary}</div>
        {selected_file && (
          <span className="text-xs text-morandi-secondary">
            {t('customerImportFileSelected', { name: selected_file.name })}
          </span>
        )}
      </div>

      {/* 預覽表格 */}
      <div className="flex-1 overflow-hidden border rounded-lg">
        <EnhancedTable
          columns={table_columns}
          data={preview_data}
          initialPageSize={20}
          rowClassName={(row: PreviewTableRow) =>
            row.status === 'error'
              ? 'bg-morandi-red/5'
              : row.status === 'warning'
                ? 'bg-status-warning/5'
                : ''
          }
        />
      </div>
    </>
  )
}
