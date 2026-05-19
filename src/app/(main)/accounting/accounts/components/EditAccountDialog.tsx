'use client'

import { Trash2, X } from 'lucide-react'

import { useState, useEffect } from 'react'
import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { updateChartOfAccount, deleteChartOfAccount } from '@/data'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { confirm } from '@/lib/ui/alert-dialog'
import { translateDbError } from '@/lib/db-error-translate'

const PAGE_LABELS = {
  EDIT_ACCOUNT_TITLE: '編輯會計科目',
  CODE_PLACEHOLDER: '例如：1100',
  NAME_PLACEHOLDER: '例如：銀行存款',
  DESCRIPTION_LABEL: '說明',
  DESCRIPTION_PLACEHOLDER: '科目說明（選填）',
  ENABLED_STATUS: '啟用狀態',
  REQUIRED_FIELDS: '請填寫科目代號和名稱',
  UPDATE_SUCCESS: '科目更新成功',
  CODE_DUPLICATE: '科目代號已存在',
  UPDATE_FAILED_PREFIX: '更新失敗：',
  UNKNOWN_ERROR: '未知錯誤',
  SYSTEM_LOCKED_DELETE: '系統科目無法刪除',
  DELETE_SUCCESS: '科目已刪除',
  DELETE_IN_USE: '此科目已被使用，無法刪除',
  DELETE_FAILED_PREFIX: '刪除失敗：',
  SYSTEM_ACCOUNT_NOTICE: '⚠️ 系統科目：僅可修改名稱和說明，不可刪除',
  FIELD_CODE: '科目代號 *',
  FIELD_NAME: '科目名稱 *',
  FIELD_ACCOUNT_TYPE: '科目類型 *',
} as const

interface Account {
  id: string
  code: string
  name: string
  account_type: string
  description: string | null
  is_active: boolean
  is_system_locked: boolean
}

interface EditAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  account: Account | null
}

const accountTypes = [
  { value: 'asset', label: '資產' },
  { value: 'liability', label: '負債' },
  { value: 'equity', label: '權益' },
  { value: 'revenue', label: '收入' },
  { value: 'expense', label: '費用' },
  { value: 'cost', label: '成本' },
]

export function EditAccountDialog({
  open,
  onOpenChange,
  onSuccess,
  account,
}: EditAccountDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    account_type: 'asset',
    description: '',
    is_active: true,
  })

  useEffect(() => {
    if (account) {
      setFormData({
        code: account.code,
        name: account.name,
        account_type: account.account_type,
        description: account.description || '',
        is_active: account.is_active,
      })
    }
  }, [account])

  const handleSubmit = async () => {
    if (!account) return

    if (!formData.code || !formData.name) {
      toast.error(PAGE_LABELS.REQUIRED_FIELDS)
      return
    }

    setIsSubmitting(true)

    try {
      await updateChartOfAccount(account.id, {
        code: formData.code,
        name: formData.name,
        account_type: formData.account_type,
        description: formData.description || null,
        is_active: formData.is_active,
      })

      toast.success(PAGE_LABELS.UPDATE_SUCCESS)
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      logger.error('更新科目失敗:', error)
      toast.error(translateDbError(error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!account) return

    if (account.is_system_locked) {
      toast.error(PAGE_LABELS.SYSTEM_LOCKED_DELETE)
      return
    }

    const ok = await confirm(
      `確定要刪除科目「${account.code} ${account.name}」嗎？此操作無法復原！`,
      { title: '刪除科目', type: 'warning', confirmText: '確定刪除', cancelText: '取消' }
    )

    if (!ok) return

    setIsSubmitting(true)

    try {
      await deleteChartOfAccount(account.id)

      toast.success(PAGE_LABELS.DELETE_SUCCESS)
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      logger.error('刪除科目失敗:', error)
      toast.error(translateDbError(error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!account) return null

  const customFooter = (
    <div className="flex justify-between gap-3 w-full">
      <Button
        type="button"
        variant="destructive"
        onClick={handleDelete}
        disabled={isSubmitting || account.is_system_locked}
      >
        <Trash2 className="h-4 w-4 mr-1" />
        刪除
      </Button>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="soft-gold"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          <X className="h-4 w-4 mr-1" />
          取消
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '更新中...' : '確認更新'}
        </Button>
      </div>
    </div>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={PAGE_LABELS.EDIT_ACCOUNT_TITLE}
      onSubmit={handleSubmit}
      loading={isSubmitting}
      footer={customFooter}
      maxWidth="lg"
    >
          {account.is_system_locked && (
            <div className="p-3 bg-morandi-gold/10 text-morandi-primary rounded-md text-sm">
              {PAGE_LABELS.SYSTEM_ACCOUNT_NOTICE}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="code">{PAGE_LABELS.FIELD_CODE}</Label>
            <Input
              id="code"
              placeholder={PAGE_LABELS.CODE_PLACEHOLDER}
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              disabled={account.is_system_locked}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{PAGE_LABELS.FIELD_NAME}</Label>
            <Input
              id="name"
              placeholder={PAGE_LABELS.NAME_PLACEHOLDER}
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_type">{PAGE_LABELS.FIELD_ACCOUNT_TYPE}</Label>
            <Select
              value={formData.account_type}
              onValueChange={value => setFormData({ ...formData, account_type: value })}
              disabled={account.is_system_locked}
            >
              <SelectTrigger id="account_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{PAGE_LABELS.DESCRIPTION_LABEL}</Label>
            <Textarea
              id="description"
              placeholder={PAGE_LABELS.DESCRIPTION_PLACEHOLDER}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">{PAGE_LABELS.ENABLED_STATUS}</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
            />
          </div>

    </FormDialog>
  )
}
