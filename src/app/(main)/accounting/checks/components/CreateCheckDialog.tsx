'use client'

import { useState } from 'react'
import { FormDialog } from '@/components/dialog'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createCheck } from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { translateDbError } from '@/lib/db-error-translate'

const PAGE_LABELS = {
  CHECK_NUMBER_PLACEHOLDER: '例如：CH20260319001',
  PAYEE_PLACEHOLDER: '例如：供應商名稱',
  MEMO_LABEL: '備註',
  MEMO_PLACEHOLDER: '票據備註（選填）',
  WORKSPACE_NOT_FOUND: '無法取得 workspace_id',
  REQUIRED_FIELDS: '請填寫所有必填欄位',
  INVALID_AMOUNT: '請輸入有效金額',
  CREATE_SUCCESS: '票據新增成功',
  CHECK_NUMBER_DUPLICATE: '票據號碼已存在',
  CREATE_FAILED_PREFIX: '新增失敗：',
  UNKNOWN_ERROR: '未知錯誤',
  DIALOG_TITLE: '新增票據/支票',
  SUBMIT_LABEL: '確認新增',
  FIELD_CHECK_NUMBER: '票據號碼 *',
  FIELD_AMOUNT: '金額 *',
  FIELD_CHECK_DATE: '開票日期 *',
  FIELD_DUE_DATE: '到期日 *',
  FIELD_PAYEE: '受款人 *',
} as const

interface CreateCheckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateCheckDialog({ open, onOpenChange, onSuccess }: CreateCheckDialogProps) {
  const { user } = useAuthStore()
  const [formData, setFormData] = useState({
    check_number: '',
    check_date: new Date().toISOString().split('T')[0],
    due_date: '',
    amount: '',
    payee_name: '',
    memo: '',
  })

  const doSubmit = async () => {
    if (!user?.workspace_id) {
      toast.error(PAGE_LABELS.WORKSPACE_NOT_FOUND)
      return
    }

    if (
      !formData.check_number ||
      !formData.check_date ||
      !formData.due_date ||
      !formData.amount ||
      !formData.payee_name
    ) {
      toast.error(PAGE_LABELS.REQUIRED_FIELDS)
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error(PAGE_LABELS.INVALID_AMOUNT)
      return
    }

    // 5/24：改走 createCheck entity hook（自動失效快取、新增即現）
    await createCheck({
      workspace_id: user.workspace_id,
      check_number: formData.check_number,
      check_date: formData.check_date,
      due_date: formData.due_date,
      amount,
      payee_name: formData.payee_name,
      status: 'pending',
      memo: formData.memo || null,
    } as Parameters<typeof createCheck>[0])

    toast.success(PAGE_LABELS.CREATE_SUCCESS)
    onOpenChange(false)
    onSuccess()

    // 重置表單
    setFormData({
      check_number: '',
      check_date: new Date().toISOString().split('T')[0],
      due_date: '',
      amount: '',
      payee_name: '',
      memo: '',
    })
  }

  const { isSubmitting, execute: handleSubmit } = useAsyncSubmit(doSubmit, {
    onError: (error) => {
      logger.error('新增票據失敗:', error)
      toast.error(translateDbError(error).message)
    },
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={PAGE_LABELS.DIALOG_TITLE}
      onSubmit={handleSubmit}
      submitLabel={PAGE_LABELS.SUBMIT_LABEL}
      loading={isSubmitting}
      maxWidth="lg"
    >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check_number">{PAGE_LABELS.FIELD_CHECK_NUMBER}</Label>
              <Input
                id="check_number"
                placeholder={PAGE_LABELS.CHECK_NUMBER_PLACEHOLDER}
                value={formData.check_number}
                onChange={e => setFormData({ ...formData, check_number: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">{PAGE_LABELS.FIELD_AMOUNT}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check_date">{PAGE_LABELS.FIELD_CHECK_DATE}</Label>
              <DatePicker
                value={formData.check_date}
                onChange={v => setFormData({ ...formData, check_date: v })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">{PAGE_LABELS.FIELD_DUE_DATE}</Label>
              <DatePicker
                value={formData.due_date}
                onChange={v => setFormData({ ...formData, due_date: v })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payee_name">{PAGE_LABELS.FIELD_PAYEE}</Label>
            <Input
              id="payee_name"
              placeholder={PAGE_LABELS.PAYEE_PLACEHOLDER}
              value={formData.payee_name}
              onChange={e => setFormData({ ...formData, payee_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">{PAGE_LABELS.MEMO_LABEL}</Label>
            <Textarea
              id="memo"
              placeholder={PAGE_LABELS.MEMO_PLACEHOLDER}
              value={formData.memo}
              onChange={e => setFormData({ ...formData, memo: e.target.value })}
              rows={3}
            />
          </div>

    </FormDialog>
  )
}
