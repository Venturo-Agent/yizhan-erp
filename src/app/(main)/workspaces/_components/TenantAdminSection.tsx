'use client'

/**
 * TenantAdminSection — 管理員員工設定區塊
 */

import { Input } from '@/components/ui/input'
import { useTranslations } from 'next-intl'
import type { FormData } from './create-tenant-types'

interface Props {
  form: FormData
  setForm: React.Dispatch<React.SetStateAction<FormData>>
}

export function TenantAdminSection({ form, setForm }: Props) {
  const t = useTranslations('workspacesPage')
  return (
    <section className="space-y-3 pt-3 border-t border-morandi-container/40">
      <div>
        <h3 className="text-sm font-semibold text-morandi-primary">{t('step2Title')}</h3>
        <p className="text-xs text-morandi-muted">{t('step2Desc')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-morandi-primary mb-1.5 block">
            {t('fieldAdminName')}{' '}
            <span className="text-morandi-red">{t('fieldAdminNameRequired')}</span>
          </label>
          <Input
            value={form.adminName}
            onChange={e => setForm(prev => ({ ...prev, adminName: e.target.value }))}
            placeholder={t('fieldAdminNamePlaceholder')}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-morandi-primary mb-1.5 block">
            {t('fieldEmail')}{' '}
            <span className="text-morandi-red">{t('fieldEmailRequired')}</span>
          </label>
          <Input
            type="email"
            value={form.adminEmail}
            onChange={e => setForm(prev => ({ ...prev, adminEmail: e.target.value }))}
            placeholder={t('fieldEmailPlaceholder')}
          />
          <p className="text-xs text-morandi-muted mt-1">{t('fieldEmailHint')}</p>
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-medium text-morandi-primary mb-1.5 block">
            {t('fieldPassword')}
          </label>
          {/* 預設密碼跟 server 端 DEFAULT_ADMIN_PASSWORD 對齊（src/app/api/tenants/create/route.ts:73）。
              William 2026-05-10 拍板固定 '12345678'、不再用 {code}-{taxId} 公式。 */}
          <div className="rounded-md bg-morandi-container/20 px-3 py-2 font-mono text-sm text-morandi-primary">
            12345678
          </div>
          <p className="text-xs text-morandi-muted mt-1">{t('fieldPasswordHint')}</p>
        </div>
      </div>
    </section>
  )
}
