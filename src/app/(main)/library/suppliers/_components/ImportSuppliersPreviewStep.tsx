'use client'

/**
 * 供應商匯入 — 預覽步驟
 *
 * 顯示解析後的資料列、全域錯誤、狀態欄位
 */

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, CheckSquare } from 'lucide-react'
import { EmptyValue } from '@/components/ui/empty-value'
import { EnhancedTable, type TableColumn } from '@/components/ui/enhanced-table'
import type { PreviewTableRow } from './useSupplierImport'

interface ImportSuppliersPreviewStepProps {
  preview_data: PreviewTableRow[]
  global_errors: string[]
  parsed_rows_count: number
  error_count: number
  selected_file: File | null
}

export function ImportSuppliersPreviewStep({
  preview_data,
  global_errors,
  parsed_rows_count,
  error_count,
  selected_file,
}: ImportSuppliersPreviewStepProps) {
  const t = useTranslations('library')

  const table_columns: TableColumn<PreviewTableRow>[] = useMemo(
    () => [
      {
        key: 'row_number',
        label: t('supplierImportColRow'),
        width: '60px',
        render: (value: unknown) => (
          <span className="text-xs text-morandi-secondary font-mono">{String(value)}</span>
        ),
      },
      {
        key: 'status',
        label: t('supplierImportColStatus'),
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
        label: t('supplierImportColName'),
        render: (_value: unknown, row: PreviewTableRow) => (
          <span
            className={`text-sm ${row.errors['name'] ? 'text-morandi-red font-medium' : 'text-morandi-primary'}`}
          >
            {row.name || <EmptyValue />}
          </span>
        ),
      },
      {
        key: 'english_name',
        label: t('supplierImportColEnglishName'),
        render: (_value: unknown, row: PreviewTableRow) => (
          <span className="text-xs text-morandi-secondary">
            {row.english_name || <EmptyValue />}
          </span>
        ),
      },
      {
        key: 'contact_person',
        label: t('supplierImportColContactPerson'),
        render: (_value: unknown, row: PreviewTableRow) => (
          <span className="text-xs text-morandi-primary">
            {row.contact_person || <EmptyValue />}
          </span>
        ),
      },
      {
        key: 'phone',
        label: t('supplierImportColPhone'),
        render: (_value: unknown, row: PreviewTableRow) => (
          <span
            className={`text-xs ${row.errors['phone'] ? 'text-morandi-red' : 'text-morandi-primary'}`}
          >
            {row.phone || <EmptyValue />}
          </span>
        ),
      },
      {
        key: 'email',
        label: t('supplierImportColEmail'),
        render: (_value: unknown, row: PreviewTableRow) => (
          <span
            className={`text-xs ${row.errors['email'] ? 'text-morandi-red' : 'text-morandi-primary'}`}
          >
            {row.email || <EmptyValue />}
          </span>
        ),
      },
      {
        key: 'type',
        label: t('supplierImportColType'),
        render: (_value: unknown, row: PreviewTableRow) => (
          <span className="text-xs text-morandi-secondary">{row.type || <EmptyValue />}</span>
        ),
      },
    ],
    [t]
  )

  const previewSummary =
    error_count > 0
      ? t('supplierImportPreviewSummaryError', {
          total: parsed_rows_count,
          errorCount: error_count,
        })
      : t('supplierImportPreviewSummaryOk', { total: parsed_rows_count })

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
            {t('supplierImportFileSelected', { name: selected_file.name })}
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
              ? 'bg-morandi-red/10'
              : row.status === 'warning'
                ? 'bg-status-warning-bg'
                : ''
          }
        />
      </div>
    </>
  )
}
