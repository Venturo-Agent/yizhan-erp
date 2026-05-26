'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { Save, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { SettingsTabs } from '../components/SettingsTabs'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { CAPABILITIES, useCapabilities } from '@/lib/permissions'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { TourAttributesSection } from './tour-features-section'
import { OrganizationSection } from './_components/OrganizationSection'
import { CompanyInfoCard } from './_components/CompanyInfoCard'
import { BonusPolicySection } from './_components/BonusPolicySection'
import { ModuleLoading } from '@/components/module-loading'
import { type CompanyFormData, type BankAccountOption, INITIAL_FORM } from './types'
import { invalidateWorkspaceSettings } from '@/hooks/useWorkspaceSettings'
import type { BonusCalculationOrder } from '@/app/(main)/tours/_services/profit-calculation.service'
import { BonusSettingType } from '@/types/bonus.types'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function CompanySettingsPage() {
  const t = useTranslations('settingsPage')
  const { user } = useAuthStore()
  const { can } = useCapabilities()
  const [form, setForm] = useState<CompanyFormData>(INITIAL_FORM)
  const [loading, setLoading] = useState(true)
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([])
  const [bonusCalculationOrder, setBonusCalculationOrder] =
    useState<BonusCalculationOrder>('independent')
  // 結帳稅率（公司預設、從 workspace_bonus_defaults PROFIT_TAX row 抓）
  const [initialTaxRate, setInitialTaxRate] = useState<number | null>(null)
  const workspaceId = user?.workspace_id

  // 載入 bank_accounts、供「統一收付差額入賬帳戶」selector 用
  useEffect(() => {
    if (!workspaceId) return
    void (async () => {
      const { data } = await supabase
        .from('bank_accounts')
        .select('id, name, bank_name')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
      setBankAccounts(Array.isArray(data) ? (data as unknown as BankAccountOption[]) : [])
    })()
  }, [workspaceId])

  const loadCompanyData = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select(
          'name, description, logo_url, logo_scale, logo_offset_x, logo_offset_y, legal_name, subtitle, address, phone, fax, email, website, tax_id, bank_code, bank_name, bank_branch, bank_account, bank_account_name, company_seal_url, personal_seal_url, invoice_seal_image_url, contract_seal_image_url, default_billing_day_of_week, transfer_fee_mode, transfer_fee_unified_amount, transfer_fee_overflow_account_id, bonus_calculation_order, finance_centralized'
        )
        .eq('id', workspaceId)
        .single()

      if (error) throw error
      if (data) {
        const d = data as unknown as Record<string, string | number | null>
        setForm({
          name: (d.name as string) ?? '',
          description: (d.description as string) ?? '',
          logo_url: (d.logo_url as string) ?? '',
          legal_name: (d.legal_name as string) ?? '',
          subtitle: (d.subtitle as string) ?? '',
          address: (d.address as string) ?? '',
          phone: (d.phone as string) ?? '',
          fax: (d.fax as string) ?? '',
          email: (d.email as string) ?? '',
          website: (d.website as string) ?? '',
          tax_id: (d.tax_id as string) ?? '',
          bank_code: (d.bank_code as string) ?? '',
          bank_name: (d.bank_name as string) ?? '',
          bank_branch: (d.bank_branch as string) ?? '',
          bank_account: (d.bank_account as string) ?? '',
          bank_account_name: (d.bank_account_name as string) ?? '',
          company_seal_url: (d.company_seal_url as string) ?? '',
          personal_seal_url: (d.personal_seal_url as string) ?? '',
          invoice_seal_image_url: (d.invoice_seal_image_url as string) ?? '',
          contract_seal_image_url: (d.contract_seal_image_url as string) ?? '',
          default_billing_day_of_week:
            typeof d.default_billing_day_of_week === 'number'
              ? d.default_billing_day_of_week
              : null,
          transfer_fee_mode: d.transfer_fee_mode === 'unified' ? 'unified' : 'average',
          transfer_fee_unified_amount:
            typeof d.transfer_fee_unified_amount === 'number'
              ? d.transfer_fee_unified_amount
              : d.transfer_fee_unified_amount != null
                ? Number(d.transfer_fee_unified_amount)
                : null,
          transfer_fee_overflow_account_id: (d.transfer_fee_overflow_account_id as string) ?? null,
          finance_centralized: Boolean(d.finance_centralized),
          logo_scale:
            typeof d.logo_scale === 'number'
              ? d.logo_scale
              : d.logo_scale != null
                ? Number(d.logo_scale)
                : 1.0,
          logo_offset_x: typeof d.logo_offset_x === 'number' ? d.logo_offset_x : 0,
          logo_offset_y: typeof d.logo_offset_y === 'number' ? d.logo_offset_y : 0,
        })
        const ord = d.bonus_calculation_order as string | null
        setBonusCalculationOrder(ord === 'op_first' || ord === 'sales_first' ? ord : 'independent')
      }

      // 載入結帳稅率（workspace_bonus_defaults PROFIT_TAX row）
      const { data: taxData } = await supabase
        .from('workspace_bonus_defaults')
        .select('bonus')
        .eq('workspace_id', workspaceId)
        .eq('type', BonusSettingType.PROFIT_TAX)
        .maybeSingle()
      if (taxData) {
        const tax = taxData as unknown as { bonus: number | string }
        setInitialTaxRate(typeof tax.bonus === 'number' ? tax.bonus : Number(tax.bonus))
      } else {
        setInitialTaxRate(null)
      }
    } catch (error) {
      logger.error(t('companyLoadFailed'), error)
      toast.error(t('companyLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadCompanyData()
  }, [loadCompanyData])

  // 載入完成後，如果 URL 有 hash 就滾動到目標欄位並高亮
  useEffect(() => {
    if (loading) return
    if (typeof window === 'undefined') return
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const timer = setTimeout(() => {
      const el = document.getElementById(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('ring-4', 'ring-morandi-gold', 'ring-offset-2', 'rounded-lg')
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-morandi-gold', 'ring-offset-2', 'rounded-lg')
        }, 3000)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [loading])

  const { isSubmitting: saving, execute: handleSave } = useAsyncSubmit(
    async () => {
      if (!workspaceId) return
      const { name: _name, ...updateData } = form
      const { error } = await supabase
        .from('workspaces')
        .update(updateData as Record<string, unknown>)
        .eq('id', workspaceId)
      if (error) throw error
      invalidateWorkspaceSettings(workspaceId)
      toast.success(t('companySaveSuccess'))
    },
    {
      onError: error => {
        logger.error(t('companySaveFailed'), error)
        toast.error(t('companySaveFailed'))
      },
    }
  )

  const updateField = <K extends keyof CompanyFormData>(field: K, value: CompanyFormData[K]) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // 權限檢查
  if (!can(CAPABILITIES.SETTINGS_MANAGE_COMPANY)) {
    return (
      <ContentPageLayout title={t('companyTitle')}>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-status-danger mb-4" />
            <p className="text-morandi-secondary">{t('companyNoPermission')}</p>
          </Card>
        </div>
      </ContentPageLayout>
    )
  }

  if (!workspaceId) {
    return (
      <ContentPageLayout title={t('companyTitle')}>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-morandi-secondary mb-4" />
            <p className="text-morandi-secondary">{t('companyNoWorkspace')}</p>
          </Card>
        </div>
      </ContentPageLayout>
    )
  }

  if (loading) {
    return (
      <ContentPageLayout title={t('companyTitle')}>
        <ModuleLoading />
      </ContentPageLayout>
    )
  }

  return (
    <ContentPageLayout
      title={t('companyTitle')}
      headerActions={<SettingsTabs />}
      primaryAction={{
        label: saving ? t('companySaving') : t('companySave'),
        icon: Save,
        onClick: handleSave,
        disabled: saving,
      }}
      contentClassName="flex-1 overflow-y-auto min-h-0 flex flex-col"
    >
      <div className="relative space-y-6">
        {/* 公司資料卡（基本 + 聯絡 + Logo + 結帳設定 + 印章） */}
        <CompanyInfoCard
          form={form}
          workspaceId={workspaceId}
          bankAccounts={bankAccounts}
          updateField={updateField}
          initialTaxRate={initialTaxRate}
        />

        {/* 2026-05-21 William 拍板：儲存按鈕移到主標題區 primaryAction、不再放頁內、跟 finance/settings 一致 */}

        {/* 財務政策 — 集團出帳 toggle */}
        <Card className="rounded-xl shadow-sm border border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-base font-semibold text-morandi-primary">集團出帳</p>
              <p className="text-sm text-morandi-secondary mt-1">
                勾選後、會計可看跨分公司的請款 / 出納 / 收據 /
                發票（適合總公司集中處理）。關閉則每個分公司只看自己的 finance。
              </p>
            </div>
            <Switch
              checked={form.finance_centralized}
              onCheckedChange={v => updateField('finance_centralized', v)}
              aria-label="集團出帳"
            />
          </div>
        </Card>

        {/* 獎金政策（計算順序） */}
        <BonusPolicySection workspaceId={workspaceId} initialOrder={bonusCalculationOrder} />

        {/* 旅行屬性功能設定（僅有 tour_attributes 功能的租戶顯示） */}
        <TourAttributesSection workspaceId={workspaceId} />

        {/* 組織管理（品牌 / 分公司 / 部門 三維） */}
        <OrganizationSection />
      </div>
    </ContentPageLayout>
  )
}
