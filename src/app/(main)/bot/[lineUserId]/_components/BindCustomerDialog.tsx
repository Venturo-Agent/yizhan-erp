'use client'

/**
 * BindCustomerDialog
 *
 * 把當前 LINE 對話綁定到一個客戶。
 *
 * - 用 Combobox 從當前 workspace 的客戶列表選擇（label = `name (phone)`）
 * - 確認後 POST /api/line/conversations/{lineUserId}/bind-customer { customer_id }
 * - 防連點：disabled={loading}
 *
 * 2026-05-16 QDF R43：遷移到 FormDialog SSOT
 */

import { useMemo, useState } from 'react'
import { FormDialog } from '@/components/dialog/form-dialog'
import { Button } from '@/components/ui/button'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { useCustomersSlim } from '@/data'
import { toast } from 'sonner'
import { Link2 } from 'lucide-react'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'

interface BindCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lineUserId: string
  /** 綁定成功後 callback、用來 revalidate 父層資料 */
  onBound: () => void
}

export function BindCustomerDialog({
  open,
  onOpenChange,
  lineUserId,
  onBound,
}: BindCustomerDialogProps) {
  const [selectedId, setSelectedId] = useState('')

  const { items: customers } = useCustomersSlim({ all: true })

  const options = useMemo<ComboboxOption[]>(() => {
    return (customers ?? [])
      .filter(c => c.is_active !== false)
      .map(c => ({
        value: c.id,
        label: c.phone ? `${c.name}（${c.phone}）` : c.name,
      }))
  }, [customers])

  const { isSubmitting: submitting, execute: handleSubmit } = useAsyncSubmit(
    async () => {
      if (!selectedId) {
        toast.error('請選擇客戶')
        return
      }
      const res = await fetch(
        `/api/line/conversations/${encodeURIComponent(lineUserId)}/bind-customer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_id: selectedId }),
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || '綁定失敗')
      }
      toast.success('已綁定客戶')
      onBound()
      onOpenChange(false)
      setSelectedId('')
    },
    { onError: () => toast.error('操作失敗，請稍後再試') }
  )

  const customFooter = (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
        取消
      </Button>
      <Button
        variant="soft-gold"
        onClick={handleSubmit}
        disabled={submitting || !selectedId}
      >
        {submitting ? '綁定中...' : '綁定'}
      </Button>
    </div>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={next => {
        if (!submitting) onOpenChange(next)
      }}
      title={
        <span className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-morandi-gold" />
          綁定到客戶
        </span>
      }
      maxWidth="md"
      footer={customFooter}
      loading={submitting}
    >
      <div className="space-y-4 py-2">
        <div>
          <label className="text-sm text-morandi-secondary mb-1 block">
            選擇客戶（搜尋姓名或電話）
          </label>
          <Combobox
            value={selectedId}
            onChange={setSelectedId}
            options={options}
            placeholder="輸入姓名 / 電話搜尋..."
            emptyMessage="沒有符合的客戶"
            disablePortal
          />
        </div>

        <p className="text-xs text-morandi-muted">
          綁定後、本對話會關聯到該客戶、可在右側看歷史訂單。之後仍可解綁。
        </p>
      </div>
    </FormDialog>
  )
}
