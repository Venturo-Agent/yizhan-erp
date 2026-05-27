'use client'

import { useState } from 'react'
import { Building2, Landmark, Stamp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BankCombobox } from '@/components/bank-combobox'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { ImageUploadField, LogoHeaderPreview } from './ImageUploadField'
import { invalidateWorkspaceSettings } from '@/hooks/useWorkspaceSettings'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import type { CompanyFormData, BankAccountOption } from '../types'

// Radix Select 不允許 SelectItem value=""，用此哨兵值代表「不指定 / 請選擇」（送出時對應 null）
const SELECT_NONE = '__none__'

const PAGE_LABELS = {
  WEEKDAY_SUNDAY: '週日',
  WEEKDAY_MONDAY: '週一',
  WEEKDAY_TUESDAY: '週二',
  WEEKDAY_WEDNESDAY: '週三',
  WEEKDAY_THURSDAY: '週四',
  WEEKDAY_FRIDAY: '週五',
  WEEKDAY_SATURDAY: '週六',
} as const

interface CompanyInfoCardProps {
  form: CompanyFormData
  workspaceId: string
  bankAccounts: BankAccountOption[]
  updateField: <K extends keyof CompanyFormData>(field: K, value: CompanyFormData[K]) => void
  /** 公司預設稅率（%）— 從 workspace_bonus_defaults 抓 PROFIT_TAX row 帶入 */
  initialTaxRate: number | null
}

export function CompanyInfoCard({
  form,
  workspaceId,
  bankAccounts,
  updateField,
  initialTaxRate,
}: CompanyInfoCardProps) {
  const t = useTranslations('settingsPage')

  // 結帳稅率 local state（從 workspace_bonus_defaults PROFIT_TAX row 來、auto-save）
  const [taxRate, setTaxRate] = useState<string>(
    initialTaxRate !== null ? String(initialTaxRate) : ''
  )
  const [savingTax, setSavingTax] = useState(false)

  // Logo 位置 + 大小 auto-save(滑桿放開觸發 PATCH)
  const [savingLogoLayout, setSavingLogoLayout] = useState(false)
  const handleLogoLayoutCommit = async () => {
    if (savingLogoLayout) return
    setSavingLogoLayout(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/company-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo_scale: Number(form.logo_scale.toFixed(2)),
          logo_offset_x: Math.round(form.logo_offset_x),
          logo_offset_y: Math.round(form.logo_offset_y),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: '儲存失敗' }))
        throw new Error(j.error || '儲存失敗')
      }
      invalidateWorkspaceSettings(workspaceId)
    } catch (err) {
      logger.error('儲存 logo 位置失敗', err)
      toast.error('儲存失敗、請重試')
    } finally {
      setSavingLogoLayout(false)
    }
  }

  // transfer_fee_mode radio auto-save（修跟 BonusPolicy 不一致的 UX bug）
  const [savingMode, setSavingMode] = useState(false)
  const handleTransferFeeModeChange = async (mode: 'average' | 'unified') => {
    if (savingMode) return
    const previous = form.transfer_fee_mode
    updateField('transfer_fee_mode', mode)
    setSavingMode(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/company-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transfer_fee_mode: mode }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: '儲存失敗' }))
        throw new Error(j.error || '儲存失敗')
      }
      invalidateWorkspaceSettings(workspaceId)
      toast.success('匯款手續費模式已儲存')
    } catch (err) {
      logger.error('儲存匯款手續費模式失敗', err)
      toast.error('儲存失敗、請重試')
      updateField('transfer_fee_mode', previous)
    } finally {
      setSavingMode(false)
    }
  }

  // 結帳稅率 auto-save（onBlur 觸發、走 API route）
  const handleTaxRateBlur = async () => {
    const trimmed = taxRate.trim()
    const parsed = trimmed === '' ? null : Number(trimmed)
    if (trimmed !== '' && (Number.isNaN(parsed) || parsed! < 0 || parsed! > 100)) {
      toast.error('稅率請填 0-100 之間的數字')
      return
    }
    if (parsed === initialTaxRate) return // 沒變、不存
    setSavingTax(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/company-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profit_tax_rate: parsed }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: '儲存失敗' }))
        throw new Error(j.error || '儲存失敗')
      }
      toast.success('結帳稅率已儲存')
    } catch (err) {
      logger.error('儲存結帳稅率失敗', err)
      toast.error('儲存失敗、請重試')
    } finally {
      setSavingTax(false)
    }
  }
  return (
    <Card className="rounded-xl shadow-sm border border-border p-6">
      {/* 卡 1 Header：公司資料 */}
      <div className="flex items-center gap-3 mb-5">
        <Building2 className="h-5 w-5 text-morandi-gold" />
        <h2 className="text-base font-semibold">公司資料</h2>
      </div>

      {/* 基本資料 + 聯絡資訊 + Logo + 描述 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
        <div>
          <Label className="text-sm font-medium text-morandi-primary">{t('companyName')}</Label>
          <Input value={form.name} disabled className="mt-1.5 bg-morandi-container/30" />
        </div>
        <div id="field-tax_id" className="scroll-mt-24">
          <Label className="text-sm font-medium text-morandi-primary">{t('companyTaxId')}</Label>
          <Input
            value={form.tax_id}
            onChange={e => updateField('tax_id', e.target.value)}
            placeholder={t('companyTaxIdPlaceholder')}
            className="mt-1.5"
            maxLength={8}
          />
        </div>
        <div id="field-legal_name" className="scroll-mt-24">
          <Label className="text-sm font-medium text-morandi-primary">
            {t('companyLegalName')}
          </Label>
          <Input
            value={form.legal_name}
            onChange={e => updateField('legal_name', e.target.value)}
            placeholder={t('companyLegalNamePlaceholder')}
            className="mt-1.5"
          />
        </div>
        <div className="md:col-span-3">
          <Label className="text-sm font-medium text-morandi-primary">
            {t('companySubtitleLabel')}
          </Label>
          <Input
            value={form.subtitle}
            onChange={e => updateField('subtitle', e.target.value)}
            placeholder={t('companySubtitlePlaceholder')}
            className="mt-1.5"
          />
        </div>
        <div id="field-address" className="md:col-span-2 scroll-mt-24">
          <Label className="text-sm font-medium text-morandi-primary">{t('companyAddress')}</Label>
          <Input
            value={form.address}
            onChange={e => updateField('address', e.target.value)}
            placeholder={t('companyAddressPlaceholder')}
            className="mt-1.5"
          />
        </div>
        <div id="field-phone" className="scroll-mt-24">
          <Label className="text-sm font-medium text-morandi-primary">{t('companyPhone')}</Label>
          <Input
            value={form.phone}
            onChange={e => updateField('phone', e.target.value)}
            placeholder={t('companyPhonePlaceholder')}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-morandi-primary">{t('companyFax')}</Label>
          <Input
            value={form.fax}
            onChange={e => updateField('fax', e.target.value)}
            placeholder={t('companyFaxPlaceholder')}
            className="mt-1.5"
          />
        </div>
        <div id="field-email" className="scroll-mt-24">
          <Label className="text-sm font-medium text-morandi-primary">{t('companyEmail')}</Label>
          <Input
            type="email"
            value={form.email}
            onChange={e => updateField('email', e.target.value)}
            placeholder={t('companyEmailPlaceholder')}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-morandi-primary">{t('companyWebsite')}</Label>
          <Input
            value={form.website}
            onChange={e => updateField('website', e.target.value)}
            placeholder={t('companyWebsitePlaceholder')}
            className="mt-1.5"
          />
        </div>
        <div
          id="field-logo_url"
          className="md:col-span-3 scroll-mt-24 pt-4 border-t border-border/40"
        >
          {/* 並排 layout:左欄上傳框、右欄編輯器(只有 logo 上傳後才顯示) */}
          {form.logo_url ? (
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-start">
              <ImageUploadField
                label={t('companyLogo')}
                hint={t('companyLogoHint')}
                value={form.logo_url}
                onChange={url => updateField('logo_url', url)}
                fieldName="logo"
                workspaceId={workspaceId}
              />
              <LogoHeaderPreview
                logoUrl={form.logo_url}
                scale={form.logo_scale}
                offsetX={form.logo_offset_x}
                offsetY={form.logo_offset_y}
                onScaleChange={v => updateField('logo_scale', v)}
                onOffsetXChange={v => updateField('logo_offset_x', v)}
                onOffsetYChange={v => updateField('logo_offset_y', v)}
                onCommit={handleLogoLayoutCommit}
                saving={savingLogoLayout}
              />
            </div>
          ) : (
            <ImageUploadField
              label={t('companyLogo')}
              hint={t('companyLogoHint')}
              value={form.logo_url}
              onChange={url => updateField('logo_url', url)}
              fieldName="logo"
              workspaceId={workspaceId}
            />
          )}
        </div>
        <div className="md:col-span-3">
          <Label className="text-sm font-medium text-morandi-primary">
            {t('companyDescription')}
          </Label>
          <Textarea
            value={form.description}
            onChange={e => updateField('description', e.target.value)}
            placeholder={t('companyDescriptionPlaceholder')}
            className="mt-1.5"
            rows={2}
          />
        </div>
      </div>

      {/* 結帳設定（border-t 分區） */}
      <div className="pt-6 mt-6 border-t border-border">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Landmark className="h-5 w-5 text-morandi-gold" />
            <h2 className="text-base font-semibold">結帳設定</h2>
          </div>
          <span className="text-xs text-morandi-muted">未來支援多帳戶切換（不同部門收帳）</span>
        </div>

        {/* 銀行資訊（報價單顯示） */}
        <div className="space-y-2 mb-6">
          <p className="text-xs font-semibold text-morandi-secondary uppercase tracking-wide">
            銀行資訊（報價單顯示）
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium text-morandi-primary">
                {t('companyBankName')}
              </Label>
              <div className="mt-1.5">
                <BankCombobox
                  value={form.bank_code}
                  onChange={code => updateField('bank_code', code)}
                  onSelect={ref => {
                    updateField('bank_name', ref?.bank_name ?? '')
                  }}
                  placeholder={t('companyBankNamePlaceholder')}
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-morandi-primary">
                {t('companyBankBranch')}
              </Label>
              <Input
                value={form.bank_branch}
                onChange={e => updateField('bank_branch', e.target.value)}
                placeholder={t('companyBankBranchPlaceholder')}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-morandi-primary">
                {t('companyBankAccount')}
              </Label>
              <Input
                value={form.bank_account}
                onChange={e => updateField('bank_account', e.target.value)}
                placeholder={t('companyBankAccountPlaceholder')}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-morandi-primary">
                {t('companyBankAccountName')}
              </Label>
              <Input
                value={form.bank_account_name}
                onChange={e => updateField('bank_account_name', e.target.value)}
                placeholder={t('companyBankAccountNamePlaceholder')}
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        {/* 結帳設定（實際結帳行為） */}
        <div className="space-y-4 mb-6 pt-4 border-t border-border/40">
          <p className="text-xs font-semibold text-morandi-secondary uppercase tracking-wide">
            結帳設定
          </p>

          {/* 預設出帳日期 */}
          <div id="field-default_billing_day_of_week" className="scroll-mt-24 max-w-xs">
            <Label className="text-sm font-medium text-morandi-primary">預設出帳日期</Label>
            <Select
              value={
                form.default_billing_day_of_week === null ||
                form.default_billing_day_of_week === undefined
                  ? SELECT_NONE
                  : String(form.default_billing_day_of_week)
              }
              onValueChange={v =>
                updateField('default_billing_day_of_week', v === SELECT_NONE ? null : Number(v))
              }
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>不指定（不區分正常/特殊出帳）</SelectItem>
                <SelectItem value="0">{PAGE_LABELS.WEEKDAY_SUNDAY}</SelectItem>
                <SelectItem value="1">{PAGE_LABELS.WEEKDAY_MONDAY}</SelectItem>
                <SelectItem value="2">{PAGE_LABELS.WEEKDAY_TUESDAY}</SelectItem>
                <SelectItem value="3">{PAGE_LABELS.WEEKDAY_WEDNESDAY}</SelectItem>
                <SelectItem value="4">{PAGE_LABELS.WEEKDAY_THURSDAY}</SelectItem>
                <SelectItem value="5">{PAGE_LABELS.WEEKDAY_FRIDAY}</SelectItem>
                <SelectItem value="6">{PAGE_LABELS.WEEKDAY_SATURDAY}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-morandi-muted mt-1">
              {form.default_billing_day_of_week === null
                ? '未指定：請款 dialog 不區分正常 / 特殊出帳、所有日期視為一般請款'
                : '請款 dialog 在出帳日期當天提交視為「正常出帳」、其他日期視為「特殊出帳」；剔除請款單時、預設下次出帳日會落在這一天'}
            </p>
          </div>

          {/* 匯款手續費設定 */}
          <div className="space-y-3 pt-3 border-t border-border/30">
            <Label className="text-sm font-medium text-morandi-primary">匯款手續費分攤模式</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Average mode */}
              <label
                className={`flex flex-col gap-1 p-3 border rounded cursor-pointer transition ${
                  form.transfer_fee_mode === 'average'
                    ? 'border-morandi-gold bg-morandi-gold/10'
                    : 'border-border hover:bg-morandi-container/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="transfer_fee_mode"
                    value="average"
                    checked={form.transfer_fee_mode === 'average'}
                    onChange={() => handleTransferFeeModeChange('average')}
                    disabled={savingMode}
                    className="accent-morandi-gold"
                  />
                  <span className="font-medium text-sm">平均分配</span>
                  <span className="text-xs text-morandi-secondary">（公司不賺不虧）</span>
                </div>
                <p className="text-xs text-morandi-muted ml-6">
                  實際手續費平均分到每筆請款、餘額（除不盡）由最後一筆吃。譬如 15 元 / 10 筆 = 9 筆
                  1 元 + 1 筆 6 元。
                </p>
              </label>

              {/* Unified mode */}
              <label
                className={`flex flex-col gap-1 p-3 border rounded cursor-pointer transition ${
                  form.transfer_fee_mode === 'unified'
                    ? 'border-morandi-gold bg-morandi-gold/10'
                    : 'border-border hover:bg-morandi-container/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="transfer_fee_mode"
                    value="unified"
                    checked={form.transfer_fee_mode === 'unified'}
                    onChange={() => handleTransferFeeModeChange('unified')}
                    disabled={savingMode}
                    className="accent-morandi-gold"
                  />
                  <span className="font-medium text-sm">統一收付</span>
                  <span className="text-xs text-morandi-secondary">（公司賺手續費差價）</span>
                </div>
                <p className="text-xs text-morandi-muted ml-6">
                  每筆固定收公司設定的金額、差額（公司收 - 銀行實扣）另開收款單回到指定帳戶。
                </p>
              </label>
            </div>

            {/* Unified mode 額外設定 */}
            {form.transfer_fee_mode === 'unified' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 pl-3 border-l-2 border-morandi-gold/40">
                <div>
                  <Label className="text-sm font-medium text-morandi-primary">
                    每筆固定收取金額
                  </Label>
                  <Input
                    type="number"
                    value={form.transfer_fee_unified_amount ?? ''}
                    onChange={e => {
                      const v = e.target.value
                      updateField('transfer_fee_unified_amount', v === '' ? null : Number(v) || 0)
                    }}
                    placeholder="例如 30"
                    min={0}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-morandi-muted mt-1">
                    譬如設 30、10 筆請款公司收 300、銀行實扣 15、差額 285 進入下方帳戶。
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-morandi-primary">差額入賬帳戶</Label>
                  <Select
                    value={form.transfer_fee_overflow_account_id ?? SELECT_NONE}
                    onValueChange={v =>
                      updateField('transfer_fee_overflow_account_id', v === SELECT_NONE ? null : v)
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="請選擇..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECT_NONE}>請選擇...</SelectItem>
                      {bankAccounts.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                          {b.bank_name ? `（${b.bank_name}）` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-morandi-muted mt-1">
                    差額收款單會自動入到這個 bank_account（公司收入）。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 結帳稅率（公司預設、auto-save、開團獎金結算時自動帶入）*/}
          <div className="pt-3 border-t border-border/30 max-w-md">
            <Label className="text-sm font-medium text-morandi-primary">結帳稅率（%）</Label>
            <Input
              type="number"
              value={taxRate}
              onChange={e => setTaxRate(e.target.value)}
              onBlur={handleTaxRateBlur}
              placeholder="例如 10（空白 = 不扣稅）"
              min={0}
              max={100}
              step="0.01"
              disabled={savingTax}
              className="mt-1.5"
            />
            <p className="text-xs text-morandi-muted mt-1">
              利潤（總收入 − 總支出）的此百分比 = 稅金。
              新團獎金結算自動帶入此預設、該團可個別調整不影響別團。
            </p>
          </div>
        </div>

        {/* 公司印章 */}
        <div className="space-y-3 pt-4 border-t border-border/40">
          <div className="flex items-center gap-2">
            <Stamp className="h-4 w-4 text-morandi-gold" />
            <h3 className="text-base font-semibold">公司印章（PNG 透明背景）</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div id="field-company_seal_url" className="scroll-mt-24">
              <ImageUploadField
                label="大章（公司章）"
                hint=""
                value={form.company_seal_url}
                onChange={url => updateField('company_seal_url', url)}
                fieldName="company-seal"
                workspaceId={workspaceId}
              />
            </div>
            <div id="field-personal_seal_url" className="scroll-mt-24">
              <ImageUploadField
                label="小章（負責人章）"
                hint=""
                value={form.personal_seal_url}
                onChange={url => updateField('personal_seal_url', url)}
                fieldName="personal-seal"
                workspaceId={workspaceId}
              />
            </div>
            <div id="field-invoice_seal_image_url" className="scroll-mt-24">
              <ImageUploadField
                label={t('companyInvoiceSealImage')}
                hint=""
                value={form.invoice_seal_image_url}
                onChange={url => updateField('invoice_seal_image_url', url)}
                fieldName="invoice-seal"
                workspaceId={workspaceId}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
