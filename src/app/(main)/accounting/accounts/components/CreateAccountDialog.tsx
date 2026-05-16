'use client'

import { useState, useEffect } from 'react'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { FormDialog } from '@/components/dialog'
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
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { translateDbError } from '@/lib/db-error-translate'

const PAGE_LABELS = {
  CODE_PLACEHOLDER: '例如：1100',
  NAME_PLACEHOLDER: '例如：銀行存款',
  PARENT_PLACEHOLDER: '選擇父科目（可不選）',
  DESCRIPTION_LABEL: '說明',
  DESCRIPTION_PLACEHOLDER: '科目說明（選填）',
  ENABLED_STATUS: '啟用狀態',
  WORKSPACE_NOT_FOUND: '無法取得 workspace_id',
  REQUIRED_FIELDS: '請填寫科目代號和名稱',
  CREATE_SUCCESS: '科目新增成功',
  CODE_DUPLICATE: '科目代號已存在',
  CREATE_FAILED_PREFIX: '新增失敗：',
  UNKNOWN_ERROR: '未知錯誤',
  DIALOG_TITLE_NEW: '新增會計科目',
  DIALOG_TITLE_SUB: (code: string, name: string) => `新增子科目（${code} ${name}）`,
  SUBMIT_LABEL: '確認新增',
  FIELD_CODE: '科目代號 *',
  FIELD_NAME: '科目名稱 *',
  FIELD_ACCOUNT_TYPE: '科目類型 *',
  FIELD_PARENT_OPTIONAL: '父科目（選填）',
  PARENT_NONE_OPTION: '不選擇（頂層科目）',
  PARENT_HINT: '選擇父科目後，新科目會顯示在該科目下方',
} as const

interface ParentAccount {
  id: string
  code: string
  name: string
  account_type: string
}

interface CreateAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  parentAccount?: { id: string; code: string; name: string; account_type: string } | null
  suggestedCode?: string
}

const accountTypes = [
  { value: 'asset', label: '資產' },
  { value: 'liability', label: '負債' },
  { value: 'equity', label: '權益' },
  { value: 'revenue', label: '收入' },
  { value: 'expense', label: '費用' },
  { value: 'cost', label: '成本' },
]

export function CreateAccountDialog({
  open,
  onOpenChange,
  onSuccess,
  parentAccount,
  suggestedCode,
}: CreateAccountDialogProps) {
  const { user } = useAuthStore()
  const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([])
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    account_type: 'asset',
    description: '',
    is_active: true,
    parent_id: '',
  })

  // 當有父科目時，自動填入
  useEffect(() => {
    if (open && parentAccount) {
      setFormData(prev => ({
        ...prev,
        code: suggestedCode || '',
        account_type: parentAccount.account_type,
        parent_id: parentAccount.id,
      }))
    } else if (open && !parentAccount) {
      setFormData({
        code: '',
        name: '',
        account_type: 'asset',
        description: '',
        is_active: true,
        parent_id: '',
      })
    }
  }, [open, parentAccount, suggestedCode])

  // 載入可作為父科目的科目（只有大類和中類）
  useEffect(() => {
    if (open && user?.workspace_id) {
      loadParentAccounts()
    }
  }, [open, user?.workspace_id])

  const loadParentAccounts = async () => {
    if (!user?.workspace_id) return

    const { data } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name, account_type')
      .eq('workspace_id', user.workspace_id)
      .order('code')

    // 過濾出可作為父科目的（大類、中類、明細）
    const filtered = (data || []).filter(d => d.code.length <= 4)
    setParentAccounts(filtered)
  }

  const doSubmit = async () => {
    if (!user?.workspace_id) {
      toast.error(PAGE_LABELS.WORKSPACE_NOT_FOUND)
      return
    }

    if (!formData.code || !formData.name) {
      toast.error(PAGE_LABELS.REQUIRED_FIELDS)
      return
    }

    const { error } = await supabase.from('chart_of_accounts').insert({
      workspace_id: user.workspace_id,
      code: formData.code,
      name: formData.name,
      account_type: formData.account_type,
      description: formData.description || null,
      is_active: formData.is_active,
      is_system_locked: false,
      parent_id: formData.parent_id || null,
    })

    if (error) throw error

    toast.success(PAGE_LABELS.CREATE_SUCCESS)
    onOpenChange(false)
    onSuccess()

    // 重置表單
    setFormData({
      code: '',
      name: '',
      account_type: 'asset',
      description: '',
      is_active: true,
      parent_id: '',
    })
  }

  const { isSubmitting, execute: handleSubmit } = useAsyncSubmit(doSubmit, {
    onError: (error) => {
      logger.error('新增科目失敗:', error)
      toast.error(translateDbError(error).message)
    },
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={parentAccount
        ? PAGE_LABELS.DIALOG_TITLE_SUB(parentAccount.code, parentAccount.name)
        : PAGE_LABELS.DIALOG_TITLE_NEW}
      onSubmit={handleSubmit}
      submitLabel={PAGE_LABELS.SUBMIT_LABEL}
      loading={isSubmitting}
      maxWidth="lg"
    >
          <div className="space-y-2">
            <Label htmlFor="code">{PAGE_LABELS.FIELD_CODE}</Label>
            <Input
              id="code"
              placeholder={PAGE_LABELS.CODE_PLACEHOLDER}
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
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
            <Label htmlFor="parent_id">{PAGE_LABELS.FIELD_PARENT_OPTIONAL}</Label>
            <Select
              value={formData.parent_id || 'none'}
              onValueChange={value =>
                setFormData({ ...formData, parent_id: value === 'none' ? '' : value })
              }
            >
              <SelectTrigger id="parent_id">
                <SelectValue placeholder={PAGE_LABELS.PARENT_PLACEHOLDER} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{PAGE_LABELS.PARENT_NONE_OPTION}</SelectItem>
                {parentAccounts
                  .filter(p => p.account_type === formData.account_type)
                  .map(parent => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {parent.code} {parent.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{PAGE_LABELS.PARENT_HINT}</p>
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
