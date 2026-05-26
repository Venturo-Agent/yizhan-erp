'use client'

/**
 * TenantBasicInfoSection — 公司基本資料欄位區塊
 * (公司名稱 / 公司代號 / 統編 / 員工上限)
 */

import { Input } from '@/components/ui/input'
import { useTranslations } from 'next-intl'
import type { FormData } from './create-tenant-types'

interface Props {
  form: FormData
  setForm: React.Dispatch<React.SetStateAction<FormData>>
  codeError: string
  taxIdError: string
  onCodeChange: (value: string) => void
  onTaxIdChange: (value: string) => void
}

export function TenantBasicInfoSection({
  form,
  setForm,
  codeError,
  taxIdError,
  onCodeChange,
  onTaxIdChange,
}: Props) {
  const t = useTranslations('workspacesPage')
  return (
    <section className="space-y-3">
      <p className="text-sm text-morandi-secondary">{t('step1Desc')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-morandi-primary mb-1.5 block">
            {t('fieldName')} <span className="text-status-danger">{t('fieldNameRequired')}</span>
          </label>
          <Input
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t('fieldNamePlaceholder')}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-morandi-primary mb-1.5 block">
            {t('fieldCode')} <span className="text-status-danger">{t('fieldCodeRequired')}</span>
          </label>
          <Input
            value={form.code}
            onChange={e => onCodeChange(e.target.value)}
            placeholder={t('fieldCodePlaceholder')}
            className={`font-mono ${codeError ? 'border-status-danger' : ''}`}
          />
          {codeError && <p className="text-xs text-status-danger mt-1">{codeError}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-morandi-primary mb-1.5 block">
            {t('fieldTaxId')} <span className="text-status-danger">{t('fieldTaxIdRequired')}</span>
          </label>
          <Input
            value={form.taxId}
            onChange={e => onTaxIdChange(e.target.value)}
            placeholder={t('fieldTaxIdPlaceholder')}
            className={`font-mono ${taxIdError ? 'border-status-danger' : ''}`}
            maxLength={8}
          />
          {taxIdError ? (
            <p className="text-xs text-status-danger mt-1">{taxIdError}</p>
          ) : (
            <p className="text-xs text-morandi-muted mt-1">{t('fieldTaxIdHint')}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-morandi-primary mb-1.5 block">
            {t('fieldMaxEmployees')}
          </label>
          <Input
            type="number"
            min="1"
            value={form.maxEmployees}
            onChange={e => setForm(prev => ({ ...prev, maxEmployees: e.target.value }))}
            placeholder={t('fieldMaxEmployeesPlaceholder')}
          />
        </div>
      </div>
    </section>
  )
}
