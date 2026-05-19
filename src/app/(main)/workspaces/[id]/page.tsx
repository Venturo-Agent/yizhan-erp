'use client'

/**
 * 租戶詳情頁面
 *
 * tabs：
 *   - 總覽（overview）：基本資料 + 系統主管 + 基本功能 + 付費加購（既有）
 *   - AI 設定（ai_settings）：per-workspace AI 行為（prompt / data_sources / response_mode）
 *   - 費用紀錄（billing）：訂閱方案 + 歷史付款紀錄
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { toast } from 'sonner'
import { COMMON_MESSAGES } from '@/constants/messages'
import { Building2, Save, Sparkles, Plug, LayoutDashboard, Wallet, PackagePlus, Activity } from 'lucide-react'
import { ModuleLoading } from '@/components/module-loading'
import { invalidateFeatureCache } from '@/lib/permissions/hooks'
import { FEATURES } from '@/lib/permissions'
import { AiSettingsTab } from './_components/ai-settings-tab'
import { AiHealthTab } from './_components/ai-health-tab'
import { BillingTab } from './_components/billing-tab'
import { IntegrationsTab } from './_components/integrations-tab'
import { AddonsTab } from './_components/addons-tab'
import { OverviewTab } from './_components/overview-tab'
import { apiMutate } from '@/lib/swr/api-mutate'
import {
  getFeaturesForPlan,
  getAdvancePicksFromFeatures,
} from '@/lib/permissions/subscription-plans'
import type { PlanId, AdvancePickId } from '@/lib/permissions/subscription-plans'

const TAB_VALUES = {
  OVERVIEW: 'overview',
  AI_SETTINGS: 'ai_settings',
  AI_HEALTH: 'ai_health',
  INTEGRATIONS: 'integrations',
  ADDONS: 'addons',
  BILLING: 'billing',
} as const

type TabValue = (typeof TAB_VALUES)[keyof typeof TAB_VALUES]

const TABS = [
  { value: TAB_VALUES.OVERVIEW, label: '總覽', icon: LayoutDashboard },
  { value: TAB_VALUES.AI_SETTINGS, label: 'AI 設定', icon: Sparkles },
  { value: TAB_VALUES.AI_HEALTH, label: 'AI 健康度', icon: Activity },
  { value: TAB_VALUES.INTEGRATIONS, label: 'API 整合', icon: Plug },
  { value: TAB_VALUES.ADDONS, label: '附加服務', icon: PackagePlus },
  { value: TAB_VALUES.BILLING, label: '費用紀錄', icon: Wallet },
]

interface Workspace {
  id: string
  name: string
  code: string
  type: string
  is_active: boolean
  premium_enabled?: boolean
  premium_expires_at?: string
  default_password?: string | null
  admin_id?: string | null
  admin_employee_number?: string | null
  subscription_plan?: PlanId | null
}

interface WorkspaceFeature {
  feature_code: string
  enabled: boolean
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabValue>(TAB_VALUES.OVERVIEW)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [features, setFeatures] = useState<WorkspaceFeature[]>([])
  const [premiumEnabled, setPremiumEnabled] = useState(false)
  const [leavePolicy, setLeavePolicy] = useState<'calendar_year' | 'hire_anniversary'>(
    'hire_anniversary'
  )
  const [pensionSystem, setPensionSystem] = useState<'old' | 'new' | 'mixed'>('new')
  const [savingHrPolicy, setSavingHrPolicy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employeeCount, setEmployeeCount] = useState(0)
  const [adminName, setAdminName] = useState<string | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState<PlanId>('custom')
  const [advancePicks, setAdvancePicks] = useState<AdvancePickId[]>([])

  // 載入資料（總覽 tab 用）
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // 取得租戶資料（API 會回傳員工人數與系統主管資訊，透過 service_client 繞過 RLS）
      const wsRes = await fetch(`/api/workspaces/${id}`)
      if (!wsRes.ok) {
        toast.error('找不到租戶')
        router.push('/workspaces')
        return
      }
      const ws = await wsRes.json()
      setWorkspace(ws)
      setPremiumEnabled(ws.premium_enabled ?? false)
      setEmployeeCount(ws.employee_count ?? 0)
      setAdminName(ws.admin_name ?? null)
      if (ws.leave_policy && ['calendar_year', 'hire_anniversary'].includes(ws.leave_policy)) {
        setLeavePolicy(ws.leave_policy)
      }
      if (ws.pension_system && ['old', 'new', 'mixed'].includes(ws.pension_system)) {
        setPensionSystem(ws.pension_system)
      }
      const validPlans: PlanId[] = ['lite', 'standard', 'advance', 'premium', 'custom']
      if (ws.subscription_plan && validPlans.includes(ws.subscription_plan)) {
        setSubscriptionPlan(ws.subscription_plan)
      }

      // 取得功能權限
      const featuresRes = await fetch(`/api/permissions/features?workspace_id=${id}`)
      const featuresData: WorkspaceFeature[] = featuresRes.ok ? await featuresRes.json() : []

      // 初始化功能列表（module 級 + tab 級、tab 級 code 格式為 `{module}.{tab}`）
      // 2026-05-15 fix: 用 Map 去重、避免 channels.happy 之類 sub-feature 同時在
      // FEATURES.ts 跟 DB tabFeatures 重複、害 PUT upsert ON CONFLICT 違反 unique constraint 500。
      const featureMap = new Map<string, boolean>(
        featuresData.map(f => [f.feature_code, f.enabled])
      )
      const allFeatureMap = new Map<string, boolean>()
      // 先放 FEATURES（module + subFeature 都在 FEATURES.ts、用 DB enabled 值或預設 false）
      FEATURES.forEach(f => allFeatureMap.set(f.code, featureMap.get(f.code) ?? false))
      // 再補 DB 有但 FEATURES.ts 沒列的（tab 級的 code 如 database.archive / hr.roles）
      featuresData
        .filter(f => f.feature_code.includes('.') && !allFeatureMap.has(f.feature_code))
        .forEach(f => allFeatureMap.set(f.feature_code, f.enabled))
      const resolvedFeatures = Array.from(allFeatureMap.entries()).map(([code, enabled]) => ({
        feature_code: code,
        enabled,
      }))
      setFeatures(resolvedFeatures)
      // 從 features 推導進階選項（Advance 方案）
      setAdvancePicks(getAdvancePicksFromFeatures(resolvedFeatures))

      setLoading(false)
    }

    fetchData()
  }, [id, router])

  // 切換功能
  const toggleFeature = (featureCode: string) => {
    setFeatures(prev =>
      prev.map(f => (f.feature_code === featureCode ? { ...f, enabled: !f.enabled } : f))
    )
  }

  // 切換 tab 級功能（`{module}.{tab}` 格式）
  const toggleTabFeature = (moduleCode: string, tabCode: string, nextEnabled: boolean) => {
    const key = `${moduleCode}.${tabCode}`
    setFeatures(prev => {
      const existing = prev.find(f => f.feature_code === key)
      if (existing) {
        return prev.map(f => (f.feature_code === key ? { ...f, enabled: nextEnabled } : f))
      }
      return [...prev, { feature_code: key, enabled: nextEnabled }]
    })
  }

  // 查詢 tab 啟用狀態（給 Modal 用）
  const isTabFeatureEnabled = (
    moduleCode: string,
    tabCode: string,
    category?: 'basic' | 'premium'
  ): boolean => {
    const key = `${moduleCode}.${tabCode}`
    const feature = features.find(f => f.feature_code === key)
    if (category === 'premium') return feature?.enabled === true
    return feature?.enabled !== false
  }

  // 切換訂閱方案（只更新 state、不立即 API call）
  const handlePlanChange = (planId: PlanId) => {
    setSubscriptionPlan(planId)
    if (planId === 'custom') {
      // custom 不自動配置 features
      return
    }
    const featuresToEnable = getFeaturesForPlan(
      planId,
      planId === 'advance' ? advancePicks : undefined
    )
    setFeatures(prev =>
      prev.map(f => ({
        ...f,
        enabled: featuresToEnable.includes(f.feature_code),
      }))
    )
  }

  // 切換進階選項（advance 方案）
  const handleAdvancePicksChange = (picks: AdvancePickId[]) => {
    setAdvancePicks(picks)
    // 同步更新 features（仍在 advance 方案下）
    const featuresToEnable = getFeaturesForPlan('advance', picks)
    setFeatures(prev =>
      prev.map(f => ({
        ...f,
        enabled: featuresToEnable.includes(f.feature_code),
      }))
    )
  }

  // 儲存（只在總覽 tab 顯示按鈕、用 features 寫入 + subscription_plan PATCH）
  const handleSave = async () => {
    setSaving(true)

    try {
      const res = await apiMutate('/api/permissions/features', {
        method: 'PUT',
        body: {
          workspace_id: id,
          features,
          premium_enabled: premiumEnabled,
        },
        invalidate: [`/api/permissions/features?workspace_id=${id}`],
      })

      if (!res.ok) {
        toast.error('儲存失敗', { description: res.error || `HTTP ${res.status}` })
        return
      }

      // 同步更新訂閱方案
      const planRes = await apiMutate(`/api/workspaces/${id}`, {
        method: 'PATCH',
        body: { subscription_plan: subscriptionPlan },
        invalidate: [`/api/workspaces/${id}`],
      })
      if (!planRes.ok) {
        toast.error('方案儲存失敗', { description: planRes.error || `HTTP ${planRes.status}` })
        return
      }

      // 清 feature cache、讓其他頁面立即看到最新狀態（合約 tab 等）
      invalidateFeatureCache()
      toast.success('已儲存')
    } catch {
      toast.error('儲存失敗', { description: '請稍後再試' })
    } finally {
      setSaving(false)
    }
  }

  // 儲存 HR 政策（特休 + 資遣費制度）— 獨立 endpoint
  const handleSaveHrPolicy = async () => {
    setSavingHrPolicy(true)
    try {
      const res = await apiMutate(`/api/workspaces/${id}/hr-policy`, {
        method: 'PATCH',
        body: {
          leave_policy: leavePolicy,
          pension_system: pensionSystem,
        },
        invalidate: [`/api/workspaces/${id}`],
      })
      if (!res.ok) {
        toast.error('儲存 HR 政策失敗', { description: res.error || `HTTP ${res.status}` })
        return
      }
      toast.success('HR 政策已儲存')
    } catch {
      toast.error('儲存失敗', { description: '請稍後再試' })
    } finally {
      setSavingHrPolicy(false)
    }
  }

  if (loading) {
    return (
      <ContentPageLayout title={COMMON_MESSAGES.LOADING} icon={Building2}>
        <ModuleLoading />
      </ContentPageLayout>
    )
  }

  // primaryAction 在「總覽」+「附加服務」tab 顯示「儲存」（兩者都動 features state、共用 handleSave）
  // AI / Billing tab 各自有獨立儲存按鈕
  const primaryAction =
    activeTab === TAB_VALUES.OVERVIEW || activeTab === TAB_VALUES.ADDONS
      ? {
          label: saving ? '儲存中...' : '儲存',
          icon: Save,
          onClick: handleSave,
          disabled: saving,
        }
      : undefined

  return (
    <ContentPageLayout
      title={workspace?.name || '租戶詳情'}
      icon={Building2}
      breadcrumb={[
        { label: '租戶管理', href: '/workspaces' },
        { label: workspace?.name || '詳情', href: `/workspaces/${id}` },
      ]}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={value => setActiveTab(value as TabValue)}
      primaryAction={primaryAction}
    >
      {activeTab === TAB_VALUES.OVERVIEW && workspace && (
        <OverviewTab
          workspace={workspace}
          workspaceId={id}
          features={features}
          employeeCount={employeeCount}
          adminName={adminName}
          leavePolicy={leavePolicy}
          pensionSystem={pensionSystem}
          savingHrPolicy={savingHrPolicy}
          subscriptionPlan={subscriptionPlan}
          advancePicks={advancePicks}
          onToggleFeature={toggleFeature}
          onToggleTabFeature={toggleTabFeature}
          onIsTabFeatureEnabled={isTabFeatureEnabled}
          onSetLeavePolicy={setLeavePolicy}
          onSetPensionSystem={setPensionSystem}
          onSaveHrPolicy={handleSaveHrPolicy}
          onPlanChange={handlePlanChange}
          onAdvancePicksChange={handleAdvancePicksChange}
        />
      )}

      {activeTab === TAB_VALUES.AI_SETTINGS && (
        <AiSettingsTab
          workspaceId={id}
        />
      )}

      {activeTab === TAB_VALUES.AI_HEALTH && <AiHealthTab workspaceId={id} />}

      {activeTab === TAB_VALUES.INTEGRATIONS && <IntegrationsTab workspaceId={id} />}

      {activeTab === TAB_VALUES.ADDONS && (
        <AddonsTab
          features={features}
          onToggle={(code, enabled) => {
            setFeatures(prev => {
              const idx = prev.findIndex(f => f.feature_code === code)
              if (idx >= 0) {
                const next = [...prev]
                next[idx] = { ...next[idx], enabled }
                return next
              }
              return [...prev, { feature_code: code, enabled }]
            })
          }}
        />
      )}

      {activeTab === TAB_VALUES.BILLING && <BillingTab workspaceId={id} />}
    </ContentPageLayout>
  )
}
