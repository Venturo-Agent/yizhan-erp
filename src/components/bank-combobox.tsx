'use client'

/**
 * BankCombobox — 台灣銀行代號選擇器
 *
 * 用於三處 Combobox：
 *   - 公司銀行（settings/company）
 *   - 銀行帳戶（finance/settings BankAccountsSection）
 *   - 供應商（is_domestic=true 時走這個）
 *
 * 資料來源：ref_banks master（共用資料層）
 *
 * 顯示：「{bank_code} {bank_name}」例：「004 臺灣銀行」
 * 儲存：bank_code（三碼字串）
 *
 * 新增：有 shared_data.banks.write capability 時、下拉底部「+ 新增銀行」
 *       走 POST /api/banks（API 層守 capability）
 */

import * as React from 'react'
import useSWR from 'swr'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { FormDialog } from '@/components/dialog/form-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { dynamicFrom } from '@/lib/supabase/typed-client'
import { useMyCapabilities } from '@/lib/permissions'
import { logger } from '@/lib/utils/logger'
import { apiMutate } from '@/lib/swr/api-mutate'

const LABELS = {
  DIALOG_TITLE: '新增銀行（共用資料）',
  DIALOG_SUBTITLE: '中央銀行金融機構代號表、新增後全平台共用',
  SUBMIT: '新增',
  FIELD_BANK_CODE: '銀行代碼（3 碼數字）',
  FIELD_BANK_NAME: '銀行中文名',
  FIELD_ENGLISH_NAME: '英文名（選填）',
  PLACEHOLDER_BANK_CODE: '例：004',
  PLACEHOLDER_BANK_NAME: '例：臺灣銀行',
  PLACEHOLDER_ENGLISH_NAME: '例：Bank of Taiwan',
  ERROR_BANK_CODE: '銀行代碼必須為 3 碼數字',
  ERROR_BANK_NAME: '請填銀行中文名',
  ERROR_NETWORK: '網路錯誤、請稍後再試',
  ERROR_CREATE_FAIL: '新增失敗',
  CREATE_BUTTON_LABEL: '+ 新增銀行',
  EMPTY_WITH_CREATE: '找不到此銀行、可在下方新增',
  EMPTY_NO_CREATE: '找不到此銀行（請聯絡平台方補上）',
} as const

interface BankRef {
  bank_code: string
  bank_name: string
  english_name: string | null
  is_active: boolean
  display_order: number
}

interface BankComboboxProps {
  value: string
  onChange: (bankCode: string) => void
  onSelect?: (bank: BankRef | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  disablePortal?: boolean
}

async function fetchBanks(): Promise<BankRef[]> {
  const { data, error } = await dynamicFrom('ref_banks')
    .select('bank_code, bank_name, english_name, is_active, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    logger.error('[BankCombobox] failed to fetch ref_banks:', error)
    return []
  }
  return (data ?? []) as BankRef[]
}

export function BankCombobox({
  value,
  onChange,
  onSelect,
  placeholder = '選擇銀行（例：004 臺灣銀行）',
  className,
  disabled,
  disablePortal,
}: BankComboboxProps) {
  const { has } = useMyCapabilities()
  const canCreate = has('shared_data.banks.write')

  const { data: banks = [], isLoading, mutate } = useSWR<BankRef[]>('ref_banks', fetchBanks, {
    revalidateOnFocus: false,
    dedupingInterval: 60 * 60 * 1000, // 1 hour
  })

  const options: ComboboxOption<BankRef>[] = React.useMemo(
    () =>
      banks.map(b => ({
        value: b.bank_code,
        label: `${b.bank_code} ${b.bank_name}`,
        data: b,
      })),
    [banks]
  )

  // 新增 dialog state
  const [createOpen, setCreateOpen] = React.useState(false)
  const [bankCode, setBankCode] = React.useState('')
  const [bankName, setBankName] = React.useState('')
  const [englishName, setEnglishName] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const openCreateDialog = React.useCallback(async (searchText: string) => {
    // 用 searchText 預填 bank_name（user 在搜尋時打的字）
    setBankName(searchText.trim())
    setBankCode('')
    setEnglishName('')
    setErrorMsg(null)
    setCreateOpen(true)
    return null // Combobox 不直接 select、等 dialog 完成
  }, [])

  const submitCreate = async () => {
    const code = bankCode.trim()
    const name = bankName.trim()
    if (!/^\d{3}$/.test(code)) {
      setErrorMsg(LABELS.ERROR_BANK_CODE)
      return
    }
    if (!name) {
      setErrorMsg(LABELS.ERROR_BANK_NAME)
      return
    }
    setSubmitting(true)
    setErrorMsg(null)
    try {
      const res = await apiMutate('/api/banks', {
        method: 'POST',
        body: {
          bank_code: code,
          bank_name: name,
          english_name: englishName.trim() || null,
        },
        invalidate: ['ref_banks'],
      })
      if (!res.ok) {
        setErrorMsg(res.error || LABELS.ERROR_CREATE_FAIL)
        return
      }
      await mutate()
      onChange(code)
      onSelect?.({ bank_code: code, bank_name: name, english_name: englishName.trim() || null, is_active: true, display_order: 999 })
      setCreateOpen(false)
    } catch (err) {
      logger.error('[BankCombobox] create failed:', err)
      setErrorMsg(LABELS.ERROR_NETWORK)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Combobox<BankRef>
        value={value}
        onChange={onChange}
        onSelect={opt => onSelect?.(opt.data ?? null)}
        options={options}
        placeholder={isLoading ? '載入中...' : placeholder}
        emptyMessage={canCreate ? LABELS.EMPTY_WITH_CREATE : LABELS.EMPTY_NO_CREATE}
        className={className}
        disabled={disabled}
        disablePortal={disablePortal}
        onCreate={canCreate ? openCreateDialog : undefined}
        createLabel={LABELS.CREATE_BUTTON_LABEL}
      />
      {canCreate && (
        <FormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title={LABELS.DIALOG_TITLE}
          subtitle={LABELS.DIALOG_SUBTITLE}
          onSubmit={submitCreate}
          loading={submitting}
          submitLabel={LABELS.SUBMIT}
        >
          <div className='space-y-4'>
            <div>
              <Label htmlFor='bank-code'>{LABELS.FIELD_BANK_CODE}<span className='text-red-500'>*</span></Label>
              <Input
                id='bank-code'
                value={bankCode}
                onChange={e => setBankCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder={LABELS.PLACEHOLDER_BANK_CODE}
                maxLength={3}
              />
            </div>
            <div>
              <Label htmlFor='bank-name'>{LABELS.FIELD_BANK_NAME} <span className='text-red-500'>*</span></Label>
              <Input
                id='bank-name'
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                placeholder={LABELS.PLACEHOLDER_BANK_NAME}
              />
            </div>
            <div>
              <Label htmlFor='bank-name-en'>{LABELS.FIELD_ENGLISH_NAME}</Label>
              <Input
                id='bank-name-en'
                value={englishName}
                onChange={e => setEnglishName(e.target.value)}
                placeholder={LABELS.PLACEHOLDER_ENGLISH_NAME}
              />
            </div>
            {errorMsg && (
              <div className='text-sm text-red-600'>{errorMsg}</div>
            )}
          </div>
        </FormDialog>
      )}
    </>
  )
}
