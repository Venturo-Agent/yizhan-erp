'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { alert as showAlert } from '@/lib/ui/alert-dialog'
import { apiMutate } from '@/lib/swr/api-mutate'
import { Settings2, Sparkles, Users } from 'lucide-react'
import { FormDialog } from '@/components/dialog'
import {
  MODULES,
  getBasicFeatures,
  getPremiumFeatures,
  getEnterpriseFeatures,
} from '@/lib/permissions'

const PAGE_LABELS = {
  COMPANY_NAME: '公司名稱',
  COMPANY_CODE: '公司代碼',
  TYPE: '類型',
  STATUS: '狀態',
  SYSTEM_ADMIN_INFO: '系統主管資訊',
  SYSTEM_ADMIN: '系統主管',
  ACCOUNT: '帳號',
  CORE_PLAN: '核心方案',
  MONTHLY_INCLUDED: '月費包含',
  PAID_ADDONS: '付費加購',
  ENABLED_AS_NEEDED: '按需求開通',
} as const

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
}

interface WorkspaceFeature {
  feature_code: string
  enabled: boolean
}

interface OverviewTabProps {
  workspace: Workspace
  workspaceId: string
  features: WorkspaceFeature[]
  employeeCount: number
  adminName: string | null
  leavePolicy: 'calendar_year' | 'hire_anniversary'
  pensionSystem: 'old' | 'new' | 'mixed'
  savingHrPolicy: boolean
  onToggleFeature: (featureCode: string) => void
  onToggleTabFeature: (moduleCode: string, tabCode: string, nextEnabled: boolean) => void
  onIsTabFeatureEnabled: (moduleCode: string, tabCode: string, category?: 'basic' | 'premium') => boolean
  onSetLeavePolicy: (val: 'calendar_year' | 'hire_anniversary') => void
  onSetPensionSystem: (val: 'old' | 'new' | 'mixed') => void
  onSaveHrPolicy: () => void
}

export function OverviewTab({
  workspace,
  workspaceId,
  features,
  employeeCount,
  adminName,
  leavePolicy,
  pensionSystem,
  savingHrPolicy,
  onToggleFeature,
  onToggleTabFeature,
  onIsTabFeatureEnabled,
  onSetLeavePolicy,
  onSetPensionSystem,
  onSaveHrPolicy,
}: OverviewTabProps) {
  const [tabModalModuleCode, setTabModalModuleCode] = useState<string | null>(null)

  // 2026-05-15 William 拍板：拿掉 INTERNAL_FEATURES hardcode、跟鐵律 #9「沒有特權」對齊。
  const INTERNAL_FEATURES = new Set<string>([])

  // 1. 付費的整個模組（會計、頻道等）
  const premiumModules = [...getPremiumFeatures(), ...getEnterpriseFeatures()]
    .filter(f => !INTERNAL_FEATURES.has(f.code))
    .map(f => ({
      code: f.code,
      name: f.name,
      subtitle: f.description,
      kind: 'module' as const,
    }))

  // 2. 免費模組裡的付費 tab（合約、展示行程、未來加進來的）
  const premiumTabAddons = MODULES.flatMap(m =>
    m.tabs
      .filter(t => t.category === 'premium' && !t.isEligibility)
      .map(t => ({
        code: `${m.code}.${t.code}`,
        name: t.name,
        subtitle: `屬於 ${m.name}`,
        kind: 'tab' as const,
      }))
  )

  const allAddons = [...premiumModules, ...premiumTabAddons]

  // 檢查模組是否有可控制的「基本」分頁
  const hasManageableTabs = (moduleCode: string): boolean => {
    const mod = MODULES.find(m => m.code === moduleCode)
    return !!mod && mod.tabs.some(t => !t.isEligibility && t.category !== 'premium')
  }

  const activeTabModule = tabModalModuleCode
    ? MODULES.find(m => m.code === tabModalModuleCode)
    : null

  return (
    <div className="space-y-6">
      {/* 租戶資訊卡片 */}
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div
        className="rounded-[24px] p-6 bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]"
      >
        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-morandi-secondary mb-1">{PAGE_LABELS.COMPANY_NAME}</div>
            <div className="font-semibold text-morandi-primary">{workspace.name}</div>
          </div>
          <div>
            <div className="text-sm text-morandi-secondary mb-1">{PAGE_LABELS.COMPANY_CODE}</div>
            <div className="font-semibold text-morandi-primary">{workspace.code}</div>
          </div>
          <div>
            <div className="text-sm text-morandi-secondary mb-1">{PAGE_LABELS.TYPE}</div>
            <Badge variant="outline" className="font-medium">
              {workspace.type}
            </Badge>
          </div>
          <div>
            <div className="text-sm text-morandi-secondary mb-1">{PAGE_LABELS.STATUS}</div>
            <Badge
              className={
                workspace.is_active
                  ? 'bg-morandi-green/20 text-morandi-green'
                  : 'bg-morandi-secondary/20 text-morandi-secondary'
              }
            >
              {workspace.is_active ? '啟用中' : '已停用'}
            </Badge>
          </div>
        </div>
      </div>

      {/* 系統主管卡片 */}
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div
        className="rounded-[24px] p-6 bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-morandi-gold" />
            <h3 className="font-semibold text-morandi-primary">{PAGE_LABELS.SYSTEM_ADMIN_INFO}</h3>
          </div>
          <span className="text-sm text-morandi-secondary">{employeeCount} 位員工</span>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-morandi-secondary mb-1">{PAGE_LABELS.SYSTEM_ADMIN}</div>
            <div className="font-semibold text-morandi-primary">{adminName || '未指定'}</div>
          </div>
          <div>
            <div className="text-sm text-morandi-secondary mb-1">{PAGE_LABELS.ACCOUNT}</div>
            <div className="font-semibold text-morandi-primary">{workspace.code}-E001</div>
          </div>
          <div className="flex items-end">
            <Button
              variant="soft-gold"
              size="sm"
              className="border-morandi-gold text-morandi-gold hover:bg-morandi-gold/10"
              onClick={async () => {
                if (!workspace.admin_id) {
                  await showAlert('找不到此租戶的負責人', 'error')
                  return
                }
                // 預設密碼跟 server 端 DEFAULT_ADMIN_PASSWORD 對齊
                // William 2026-05-10 拍板：固定 '12345678'
                const defaultPw = '12345678'
                try {
                  const res = await apiMutate<{ error?: string; message?: string }>(
                    '/api/auth/reset-employee-password',
                    {
                      method: 'POST',
                      body: {
                        employee_id: workspace.admin_id,
                        new_password: defaultPw,
                      },
                    }
                  )
                  if (!res.ok) {
                    await showAlert(res.data?.error || res.data?.message || res.error || '重設失敗', 'error')
                    return
                  }
                  await showAlert(
                    `已重設系統主管「${adminName || ''}」的密碼為\n\n${defaultPw}\n\n請通知該系統主管使用此密碼登入、並盡快修改。`,
                    'success'
                  )
                } catch {
                  await showAlert('重設失敗、請稍後再試', 'error')
                }
              }}
            >
              重設密碼
            </Button>
          </div>
        </div>
      </div>

      {/* HR 政策卡片（特休 + 資遣費制度） */}
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div
        className="rounded-[24px] overflow-hidden bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]"
      >
        <div className="px-6 py-4 border-b border-morandi-gold/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-morandi-gold"></div>
            <h3 className="font-semibold text-morandi-primary">HR 政策</h3>
            <span className="text-sm text-morandi-secondary">特休 / 資遣費 計算依此設定</span>
          </div>
          <Button
            variant="soft-gold"
            size="sm"
            disabled={savingHrPolicy}
            onClick={onSaveHrPolicy}
            className="border-morandi-gold text-morandi-gold hover:bg-morandi-gold/10"
          >
            {savingHrPolicy ? '儲存中...' : '儲存 HR 政策'}
          </Button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-morandi-secondary block mb-2">特休制度</label>
            <select
              value={leavePolicy}
              onChange={e => onSetLeavePolicy(e.target.value as 'calendar_year' | 'hire_anniversary')}
              className="w-full h-10 px-3 rounded-md border border-morandi-border bg-white text-sm"
            >
              <option value="hire_anniversary">週年制（以到職日週年計）</option>
              <option value="calendar_year">年度制（曆年 1/1 重算）</option>
            </select>
            <p className="text-xs text-morandi-secondary mt-1">
              勞基法第 38 條、公司全員工統一適用。
            </p>
          </div>
          <div>
            <label className="text-sm text-morandi-secondary block mb-2">資遣費制度</label>
            <select
              value={pensionSystem}
              onChange={e => onSetPensionSystem(e.target.value as 'old' | 'new' | 'mixed')}
              className="w-full h-10 px-3 rounded-md border border-morandi-border bg-white text-sm"
            >
              <option value="new">新制（勞退條例第 12 條、1 年 0.5 月、上限 6 月）</option>
              <option value="old">舊制（勞基法第 17 條、1 年 1 月、無上限）</option>
              <option value="mixed">跨制（2005/7/1 前舊制 + 之後新制）</option>
            </select>
            <p className="text-xs text-morandi-secondary mt-1">
              資遣試算預設用此制度、單筆可在資遣試算 dialog 內覆寫。
            </p>
          </div>
        </div>
      </div>

      {/* 基本功能卡片 */}
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div
        className="rounded-[24px] overflow-hidden bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]"
      >
        <div className="px-6 py-4 border-b border-morandi-gold/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-morandi-green"></div>
            <h3 className="font-semibold text-morandi-primary">{PAGE_LABELS.CORE_PLAN}</h3>
            <span className="text-sm text-morandi-secondary">{PAGE_LABELS.MONTHLY_INCLUDED}</span>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {getBasicFeatures().map(feature => {
              const current = features.find(f => f.feature_code === feature.code)
              const isEnabled = current?.enabled ?? false
              const showTabs = hasManageableTabs(feature.code)

              return (
                // eslint-disable-next-line venturo/no-forbidden-classes
                <div
                  key={feature.code}
                  className="flex items-center justify-between px-4 py-3 rounded-[16px] transition-all hover:shadow-sm bg-gradient-to-t from-morandi-cream-soft to-morandi-cream-warm shadow-[rgba(180,160,120,0.3)_0px_8px_20px_-4px]"
                >
                  <span className="text-sm font-medium text-morandi-primary">{feature.name}</span>
                  <div className="flex items-center gap-2">
                    {showTabs && (
                      <button
                        type="button"
                        onClick={() => setTabModalModuleCode(feature.code)}
                        title="管理分頁"
                        className="p-1 rounded hover:bg-morandi-gold/10 text-morandi-secondary hover:text-morandi-gold"
                      >
                        <Settings2 className="h-4 w-4" />
                      </button>
                    )}
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => onToggleFeature(feature.code)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 付費加購卡片 */}
      <div
        className="rounded-[24px] overflow-hidden bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]"
      >
        <div className="px-6 py-4 border-b border-morandi-gold/20">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-morandi-gold" />
            <h3 className="font-semibold text-morandi-primary">{PAGE_LABELS.PAID_ADDONS}</h3>
            <span className="text-sm text-morandi-secondary">{PAGE_LABELS.ENABLED_AS_NEEDED}</span>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {allAddons.map(addon => {
              const current = features.find(f => f.feature_code === addon.code)
              const isEnabled = current?.enabled ?? false

              return (
                // eslint-disable-next-line venturo/no-forbidden-classes
                <div
                  key={addon.code}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-[16px] transition-all hover:shadow-sm bg-gradient-to-t from-morandi-cream-soft to-morandi-cream-warm shadow-[rgba(180,160,120,0.3)_0px_8px_20px_-4px]"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium text-morandi-primary truncate">
                      {addon.name}
                    </span>
                    {addon.subtitle && (
                      <span className="text-xs text-morandi-secondary truncate">
                        {addon.subtitle}
                      </span>
                    )}
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={next => {
                      if (addon.kind === 'module') {
                        onToggleFeature(addon.code)
                      } else {
                        // tab 級：addon.code 已是 `{module}.{tab}` 格式
                        const [moduleCode, ...tabParts] = addon.code.split('.')
                        onToggleTabFeature(moduleCode, tabParts.join('.'), next)
                      }
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 管理分頁 Modal */}
      <FormDialog
        open={!!tabModalModuleCode}
        onOpenChange={open => !open && setTabModalModuleCode(null)}
        title={`${activeTabModule?.name} — 管理分頁`}
        subtitle="勾選這家租戶能使用的基本分頁、付費加購項目請到「付費加購」區塊開通"
        showFooter={false}
        loading={false}
        maxWidth="2xl"
      >
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto py-2">
          {activeTabModule?.tabs
            .filter(tab => !tab.isEligibility && tab.category !== 'premium')
            .map(tab => {
              const checked = onIsTabFeatureEnabled(activeTabModule.code, tab.code, tab.category)
              return (
                // eslint-disable-next-line venturo/no-forbidden-classes
                <div
                  key={tab.code}
                  className="flex items-center justify-between px-4 py-3 rounded-[16px] transition-all hover:shadow-sm bg-gradient-to-t from-morandi-cream-soft to-morandi-cream-warm shadow-[rgba(180,160,120,0.3)_0px_8px_20px_-4px]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-morandi-primary truncate">
                      {tab.name}
                    </span>
                  </div>
                  <Switch
                    checked={checked}
                    onCheckedChange={next =>
                      onToggleTabFeature(activeTabModule.code, tab.code, next)
                    }
                  />
                </div>
              )
            })}
        </div>
        <div className="flex justify-end pt-4 border-t border-border">
          <Button
            variant="soft-gold"
            onClick={() => setTabModalModuleCode(null)}
            className="border-morandi-gold text-morandi-gold hover:bg-morandi-gold/10"
          >
            關閉
          </Button>
        </div>
      </FormDialog>
    </div>
  )
}
