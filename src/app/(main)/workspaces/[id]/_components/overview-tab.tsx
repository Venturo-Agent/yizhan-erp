'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { alert as showAlert } from '@/lib/ui/alert-dialog'
import { apiMutate } from '@/lib/swr/api-mutate'
import { Users, Check } from 'lucide-react'
import { ADVANCE_PICK_OPTIONS } from '@/lib/permissions/subscription-plans'
import type { PlanId, AdvancePickId } from '@/lib/permissions/subscription-plans'
import { QuotaHistorySection } from './QuotaHistorySection'

// ─── 方案卡增量顯示定義 ────────────────────────────────────────────────────────
interface PlanFeature { name: string; note?: string; code?: string; kind?: 'module' | 'tab' }

const PLAN_INCREMENTAL: Record<
  Exclude<PlanId, 'custom'>,
  { base?: string; features: PlanFeature[]; isPickTwo?: true }
> = {
  lite: {
    features: [
      { name: '旅遊團（含報價單）', code: 'tours',   kind: 'module' },
      { name: '訂單管理',           code: 'orders',  kind: 'module' },
      { name: '財務系統',           code: 'finance', kind: 'module' },
    ],
  },
  standard: {
    base: '輕量版',
    features: [
      { name: '顧客管理', code: 'customers', kind: 'module' },
      { name: '護照辨識', note: '需設定 API' },
    ],
  },
  advance: {
    base: '標準版',
    isPickTwo: true,
    features: [],
  },
  premium: {
    base: '標準版',
    features: [
      { name: '薪資結算',      code: 'hr_salary_settlement', kind: 'module' },
      { name: '獎金結算',      code: 'hr_bonus_settlement',  kind: 'module' },
      { name: '會計系統',      code: 'accounting',           kind: 'module' },
      { name: 'AI Hub',       code: 'ai_hub',               kind: 'module' },
      { name: 'HAPPY 機器人',  code: 'channels.happy',       kind: 'tab'    },
    ],
  },
}

const PLAN_META: Record<
  Exclude<PlanId, 'custom'>,
  { name: string; tagline: string; tagColor: string }
> = {
  lite:     { name: '輕量版', tagline: 'Lite',     tagColor: 'text-morandi-secondary/70' },
  standard: { name: '標準版', tagline: 'Standard', tagColor: 'text-morandi-primary/50'   },
  advance:  { name: '進階版', tagline: 'Advance',  tagColor: 'text-morandi-gold/80'       },
  premium:  { name: '旗艦版', tagline: 'Premium',  tagColor: 'text-morandi-gold'          },
}

const PLAN_ORDER: Exclude<PlanId, 'custom'>[] = ['lite', 'standard', 'advance', 'premium']

// 獨立可開關的功能（不隸屬方案、可單獨開關）
const OTHER_OPTIONAL_FEATURES: { code: string; name: string; note?: string; kind: 'module' | 'tab' }[] = [
  { code: 'calendar',       name: '行事曆',     kind: 'module' },
  { code: 'todos',          name: '待辦事項',    kind: 'module' },
  { code: 'channels',       name: '溝通頻道',    kind: 'module' },
  { code: 'esim',           name: 'eSIM 管理',   note: '開發中', kind: 'module' },
  { code: 'documents',      name: '文件中心',    kind: 'module' },
  { code: 'tours.contract', name: '電子合約系統', kind: 'tab'    },
]

// ─── Props ───────────────────────────────────────────────────────────────────

interface Workspace {
  id: string
  name: string
  code: string
  type: string
  is_active: boolean
  premium_enabled?: boolean
  admin_id?: string | null
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
  subscriptionPlan: PlanId
  advancePicks: AdvancePickId[]
  onToggleFeature: (featureCode: string) => void
  onToggleTabFeature: (moduleCode: string, tabCode: string, nextEnabled: boolean) => void
  onIsTabFeatureEnabled: (moduleCode: string, tabCode: string, category?: 'basic' | 'premium') => boolean
  onSetLeavePolicy: (val: 'calendar_year' | 'hire_anniversary') => void
  onSetPensionSystem: (val: 'old' | 'new' | 'mixed') => void
  onSaveHrPolicy: () => void
  onPlanChange: (planId: PlanId) => void
  onAdvancePicksChange: (picks: AdvancePickId[]) => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OverviewTab({
  workspace,
  workspaceId,
  features,
  employeeCount,
  adminName,
  leavePolicy,
  pensionSystem,
  savingHrPolicy,
  subscriptionPlan,
  advancePicks,
  onToggleFeature,
  onToggleTabFeature,
  onIsTabFeatureEnabled,
  onSetLeavePolicy,
  onSetPensionSystem,
  onSaveHrPolicy,
  onPlanChange,
  onAdvancePicksChange,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">

      {/* ── 訂閱方案 ── */}
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div className="rounded-[24px] overflow-hidden bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
        <div className="px-6 py-4 border-b border-morandi-gold/20 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-morandi-gold" />
          <h3 className="font-semibold text-morandi-primary">訂閱方案</h3>
          <span className="text-sm text-morandi-secondary">選擇方案後點「儲存」生效</span>
        </div>

        <div className="p-6 space-y-4">
          {/* 4 張方案卡片 */}
          <div className="grid grid-cols-4 gap-3">
            {PLAN_ORDER.map(planId => {
              const meta = PLAN_META[planId]
              const def = PLAN_INCREMENTAL[planId]
              const isSelected = subscriptionPlan === planId

              return (
                <button
                  key={planId}
                  type="button"
                  onClick={() => onPlanChange(planId)}
                  className={`flex flex-col gap-2 p-4 rounded-[20px] text-left transition-all ${
                    isSelected
                      ? 'bg-morandi-gold/5 shadow-[rgba(180,160,120,0.3)_0px_8px_20px_-4px]'
                      : 'bg-morandi-cream-soft hover:bg-morandi-cream-warm hover:shadow-[rgba(180,160,120,0.15)_0px_4px_12px_-4px]'
                  }`}
                >
                  {/* 方案名稱 + tagline 並排，無 chip */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold text-morandi-primary">{meta.name}</span>
                      <span className={`text-xs ${meta.tagColor}`}>{meta.tagline}</span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-semibold text-morandi-gold bg-morandi-gold/10 px-2 py-0.5 rounded-full">
                        使用中
                      </span>
                    )}
                  </div>

                  {/* 增量功能列表 */}
                  <div className="space-y-1.5">
                    {def.base && (
                      <p className="text-xs text-morandi-secondary leading-tight">
                        包含{def.base}全部功能
                      </p>
                    )}

                    {def.isPickTwo && (
                      <>
                        {(Object.values(ADVANCE_PICK_OPTIONS) as { name: string; icon: string }[]).map(opt => (
                          <div key={opt.name} className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-morandi-gold leading-none w-3 text-center">2/3</span>
                            <span className="text-xs text-morandi-gold leading-tight">{opt.name}</span>
                          </div>
                        ))}
                        <p className="text-[11px] text-morandi-secondary">從下方選擇 2 個</p>
                      </>
                    )}

                    {def.features.map(f => {
                      if (!f.code) {
                        return (
                          <div key={f.name} className="flex items-center gap-2">
                            <Check className="h-3 w-3 text-morandi-green flex-shrink-0" />
                            <span className="text-xs text-morandi-primary leading-tight">
                              {f.name}
                              {f.note && <span className="text-morandi-secondary"> ({f.note})</span>}
                            </span>
                          </div>
                        )
                      }
                      const featureEnabled = features.find(feat => feat.feature_code === f.code)?.enabled ?? false
                      return (
                        <div key={f.name} className="flex items-center justify-between gap-1.5">
                          <span className="text-xs text-morandi-primary leading-tight truncate">
                            {f.name}
                            {f.note && <span className="text-morandi-secondary"> ({f.note})</span>}
                          </span>
                          {/* eslint-disable-next-line venturo/no-forbidden-classes */}
                          <div onClick={e => e.stopPropagation()}>
                            <Switch
                              checked={featureEnabled}
                              onCheckedChange={next => {
                                if (f.kind === 'tab') {
                                  const [mod, ...rest] = f.code!.split('.')
                                  onToggleTabFeature(mod, rest.join('.'), next)
                                } else {
                                  onToggleFeature(f.code!)
                                }
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Advance 3選2 — 只在選了 advance 時顯示 */}
          {subscriptionPlan === 'advance' && (
            // eslint-disable-next-line venturo/no-forbidden-classes
            <div className="p-4 rounded-[16px] border border-morandi-gold/30 bg-morandi-gold/5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm font-semibold text-morandi-primary">進階版 — 選擇 2 個模組</span>
                  <span className="text-xs text-morandi-secondary ml-2">旗艦版包含全部 3 個</span>
                </div>
                {advancePicks.length !== 2 && (
                  <span className="text-xs text-morandi-red font-medium">請選擇 2 個</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(ADVANCE_PICK_OPTIONS) as [AdvancePickId, { name: string; icon: string; features: string[] }][]).map(
                  ([pickId, option]) => {
                    const isChecked = advancePicks.includes(pickId)
                    const isDisabled = !isChecked && advancePicks.length >= 2
                    return (
                      // eslint-disable-next-line venturo/no-forbidden-classes
                      <button
                        key={pickId}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (isChecked) {
                            onAdvancePicksChange(advancePicks.filter(p => p !== pickId))
                          } else if (advancePicks.length < 2) {
                            onAdvancePicksChange([...advancePicks, pickId])
                          }
                        }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-[12px] border transition-all text-left ${
                          isChecked
                            ? 'border-morandi-gold/60 bg-morandi-gold/15 text-morandi-primary'
                            : isDisabled
                            ? 'border-morandi-border/30 bg-morandi-container/10 opacity-40 cursor-not-allowed'
                            : 'border-morandi-border/40 bg-white hover:border-morandi-gold/40 hover:bg-morandi-gold/5'
                        }`}
                      >
                        <span className="text-sm font-medium">{option.name}</span>
                        {isChecked && <Check className="ml-auto h-4 w-4 text-morandi-gold" />}
                      </button>
                    )
                  }
                )}
              </div>
            </div>
          )}

          {/* 其他可選功能 */}
          <div>
            <p className="text-xs text-morandi-secondary mb-2">其他可選功能</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {OTHER_OPTIONAL_FEATURES.map(f => {
                const isEnabled = f.kind === 'tab'
                  ? onIsTabFeatureEnabled(...(f.code.split('.') as [string, string]))
                  : features.find(feat => feat.feature_code === f.code)?.enabled ?? false
                return (
                  // eslint-disable-next-line venturo/no-forbidden-classes
                  <div
                    key={f.code}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-[12px] bg-gradient-to-t from-morandi-cream-soft to-morandi-cream-warm shadow-[rgba(180,160,120,0.15)_0px_4px_12px_-4px]"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-medium text-morandi-primary truncate">{f.name}</span>
                      {f.note && <span className="text-[10px] text-morandi-secondary">{f.note}</span>}
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={next => {
                        if (f.kind === 'tab') {
                          const [mod, ...rest] = f.code.split('.')
                          onToggleTabFeature(mod, rest.join('.'), next)
                        } else {
                          onToggleFeature(f.code)
                        }
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ── 租戶資訊 ── */}
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div className="rounded-[24px] p-6 bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-morandi-secondary mb-1">公司名稱</div>
            <div className="font-semibold text-morandi-primary">{workspace.name}</div>
          </div>
          <div>
            <div className="text-sm text-morandi-secondary mb-1">公司代碼</div>
            <div className="font-semibold text-morandi-primary">{workspace.code}</div>
          </div>
          <div>
            <div className="text-sm text-morandi-secondary mb-1">狀態</div>
            <Badge className={workspace.is_active ? 'bg-morandi-green/20 text-morandi-green' : 'bg-morandi-secondary/20 text-morandi-secondary'}>
              {workspace.is_active ? '啟用中' : '已停用'}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── 系統主管 ── */}
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div className="rounded-[24px] p-6 bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-morandi-gold" />
            <h3 className="font-semibold text-morandi-primary">系統主管資訊</h3>
          </div>
          <span className="text-sm text-morandi-secondary">{employeeCount} 位員工</span>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-morandi-secondary mb-1">系統主管</div>
            <div className="font-semibold text-morandi-primary">{adminName || '未指定'}</div>
          </div>
          <div>
            <div className="text-sm text-morandi-secondary mb-1">帳號</div>
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
                const defaultPw = '12345678'
                try {
                  const res = await apiMutate<{ error?: string; message?: string }>(
                    '/api/auth/reset-employee-password',
                    { method: 'POST', body: { employee_id: workspace.admin_id, new_password: defaultPw } }
                  )
                  if (!res.ok) {
                    await showAlert(res.data?.error || res.error || '重設失敗', 'error')
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

      {/* ── 員工帳號配額紀錄 ── */}
      <QuotaHistorySection workspaceId={workspaceId} />

      {/* ── HR 政策 ── */}
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div className="rounded-[24px] overflow-hidden bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
        <div className="px-6 py-4 border-b border-morandi-gold/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-morandi-gold" />
            <h3 className="font-semibold text-morandi-primary">HR 政策</h3>
            <span className="text-sm text-morandi-secondary">特休 / 資遣費 計算依此設定</span>
          </div>
          <Button variant="soft-gold" size="sm" disabled={savingHrPolicy} onClick={onSaveHrPolicy} className="border-morandi-gold text-morandi-gold hover:bg-morandi-gold/10">
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
            <p className="text-xs text-morandi-secondary mt-1">勞基法第 38 條、公司全員工統一適用。</p>
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
            <p className="text-xs text-morandi-secondary mt-1">資遣試算預設用此制度、單筆可在資遣試算 dialog 內覆寫。</p>
          </div>
        </div>
      </div>

    </div>
  )
}
