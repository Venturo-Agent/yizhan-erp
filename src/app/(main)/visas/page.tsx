'use client'

import React, { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { FormDialog } from '@/components/dialog/form-dialog'
import {
  useCustomerDocumentApplications,
  useDocumentTypes,
  useApplicationServiceTypes,
  createCustomerDocumentApplication,
  invalidateCustomerDocumentApplications,
  useCustomersSlim,
} from '@/data'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

type ApplicationStatus =
  | 'pending'
  | 'submitted'
  | 'collected'
  | 'rejected'
  | 'returned_to_customer'
  | string

const STATUS_LABELS: Record<string, string> = {
  pending: '待送件',
  submitted: '已送件',
  collected: '已領件',
  rejected: '已退件',
  returned_to_customer: '已歸還',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-morandi-gray-200 text-morandi-gray-700',
  submitted: 'bg-morandi-blue-100 text-morandi-blue-600',
  collected: 'bg-morandi-green-100 text-morandi-green-600',
  rejected: 'bg-morandi-red-100 text-morandi-red-600',
  returned_to_customer: 'bg-morandi-purple-100 text-morandi-purple-600',
}

interface ApplicationRow {
  id: string
  customer_document_id: string
  application_service_type_id: string
  status: ApplicationStatus
  standard_price: number | null
  actual_price: number | null
  fee_charged: number | null
  submitted_at: string | null
  collected_at: string | null
  rejected_at: string | null
  returned_to_customer_at: string | null
  supplier_id: string | null
  tour_id: string | null
  order_id: string | null
  notes: string | null
  created_at: string
  // join 來的
  customer_name?: string
  document_type_label?: string
  service_type_label?: string
  supplier_name?: string
}

const PAGE_LABELS = {
  TITLE: '簽證代辦',
  NEW_APPLICATION: '新增申辦',
  CREATE_SUCCESS: '申辦建立成功',
  CREATE_FAILED: '建立失敗',
  NO_APPLICATIONS: '尚無申辦記錄',
}

export default function VisasPage() {
  const t = useTranslations('visas')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [addFormData, setAddFormData] = useState({
    customer_document_id: '',
    application_service_type_id: '',
    supplier_id: '',
    notes: '',
  })

  const { items: applications } = useCustomerDocumentApplications()
  const { items: documentTypes } = useDocumentTypes()
  const { items: serviceTypes } = useApplicationServiceTypes()
  const { items: customersSlim } = useCustomersSlim()

  const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

  const columns: TableColumn<ApplicationRow>[] = [
    {
      key: 'customer_name',
      label: '客戶',
      render: (_val, row) => row.customer_name ?? '—',
    },
    {
      key: 'document_type_label',
      label: '證件',
      render: (_val, row) => row.document_type_label ?? '—',
    },
    {
      key: 'service_type_label',
      label: '服務',
      render: (_val, row) => row.service_type_label ?? '—',
    },
    {
      key: 'status',
      label: '狀態',
      render: (_val, row) => {
        const status = row.status ?? ''
        const label = STATUS_LABELS[status] ?? status
        const color = STATUS_COLORS[status] ?? 'bg-morandi-gray-100 text-morandi-gray-600'
        return (
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
          >
            {label}
          </span>
        )
      },
    },
    {
      key: 'standard_price',
      label: '代辦費',
      render: (_val, row) =>
        row.standard_price != null ? `$${row.standard_price.toLocaleString()}` : '—',
    },
    {
      key: 'fee_charged',
      label: '實收',
      render: (_val, row) =>
        row.fee_charged != null ? `$${row.fee_charged.toLocaleString()}` : '—',
    },
    {
      key: 'submitted_at',
      label: '送件日',
      render: (_val, row) => row.submitted_at ?? '—',
    },
    {
      key: 'collected_at',
      label: '領件日',
      render: (_val, row) => row.collected_at ?? '—',
    },
    {
      key: 'supplier_name',
      label: '代辦商',
      render: (_val, row) => row.supplier_name ?? '—',
    },
    {
      key: 'notes',
      label: '備註',
      render: (_val, row) =>
        row.notes ? (
          <span className="max-w-[200px] truncate" title={row.notes}>
            {row.notes}
          </span>
        ) : (
          '—'
        ),
    },
  ]

  const handleCreateApplication = useCallback(async () => {
    if (!addFormData.customer_document_id || !addFormData.application_service_type_id) {
      toast.error('請填寫必填欄位')
      return
    }
    setCreating(true)
    try {
      const { customer_document_id, application_service_type_id, supplier_id, notes } = addFormData
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (createCustomerDocumentApplication as (d: unknown) => Promise<unknown>)({
        customer_document_id,
        application_service_type_id,
        supplier_id: supplier_id || null,
        notes: notes || null,
        status: 'pending',
      })
      await invalidateCustomerDocumentApplications()
      toast.success(PAGE_LABELS.CREATE_SUCCESS)
      setIsAddDialogOpen(false)
      setAddFormData({ customer_document_id: '', application_service_type_id: '', supplier_id: '', notes: '' })
    } catch (err) {
      logger.error('建立申辦失敗:', err)
      toast.error(PAGE_LABELS.CREATE_FAILED)
    } finally {
      setCreating(false)
    }
  }, [addFormData])

  const filteredApplications = filterStatus
    ? applications.filter((a) => a.status === filterStatus)
    : applications

  // 組成完整 row（含 join 來的 label）
  const mappedApplications: ApplicationRow[] = filteredApplications.map((app) => {
    const serviceType = serviceTypes.find((s) => s.id === app.application_service_type_id)
    const docType = documentTypes.find((d) => d.id === serviceType?.document_type_id)
    return {
      ...app,
      document_type_label: docType?.label ?? '—',
      service_type_label: serviceType?.label ?? '—',
      supplier_name: app.supplier_id ?? '—',
    }
  })

  return (
    <ContentPageLayout title={PAGE_LABELS.TITLE}>
      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <select
          className="rounded-md border border-morandi-gray-300 bg-white px-3 py-1.5 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">全部狀態</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button
          variant="default"
          size="sm"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          {PAGE_LABELS.NEW_APPLICATION}
        </Button>
      </div>

      {/* List */}
      {mappedApplications.length === 0 ? (
        <div className="py-12 text-center text-sm text-morandi-gray-500">
          {PAGE_LABELS.NO_APPLICATIONS}
        </div>
      ) : (
        <EnhancedTable columns={columns} data={mappedApplications} />
      )}

      {/* Add Dialog */}
      <FormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title={PAGE_LABELS.NEW_APPLICATION}
        loading={creating}
        onSubmit={handleCreateApplication}
        submitLabel="建立"
      >
        {/* Customer document selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-morandi-gray-700">
            客戶證件 <span className="text-morandi-red-500">*</span>
          </label>
          <select
            className="w-full rounded-md border border-morandi-gray-300 px-3 py-2 text-sm"
            value={addFormData.customer_document_id}
            onChange={(e) =>
              setAddFormData((p) => ({ ...p, customer_document_id: e.target.value }))
            }
          >
            <option value="">選擇證件...</option>
            {/* TODO: populate from customer_documents entity with customer name */}
          </select>
        </div>

        {/* Service type selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-morandi-gray-700">
            服務類型 <span className="text-morandi-red-500">*</span>
          </label>
          <select
            className="w-full rounded-md border border-morandi-gray-300 px-3 py-2 text-sm"
            value={addFormData.application_service_type_id}
            onChange={(e) =>
              setAddFormData((p) => ({ ...p, application_service_type_id: e.target.value }))
            }
          >
            <option value="">選擇服務...</option>
            {serviceTypes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.label}
                {st.is_urgent ? ' [急件]' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-morandi-gray-700">備註</label>
          <textarea
            className="w-full rounded-md border border-morandi-gray-300 px-3 py-2 text-sm"
            rows={3}
            placeholder="選填"
            value={addFormData.notes}
            onChange={(e) =>
              setAddFormData((p) => ({ ...p, notes: e.target.value }))
            }
          />
        </div>
      </FormDialog>
    </ContentPageLayout>
  )
}