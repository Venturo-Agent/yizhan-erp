'use client'

/**
 * TenantPlanSection — 新增租戶時的訂閱方案選擇
 * 每張卡片只顯示該方案「新增」的功能（增量顯示），避免重複列表。
 */

import { useMemo } from 'react'
import { Check, Lock } from 'lucide-react'
import { ADVANCE_PICK_OPTIONS, getFeaturesForPlan } from '@/lib/permissions/subscription-plans'
import type { PlanId, AdvancePickId } from '@/lib/permissions/subscription-plans'

/**
 * 「其他可選功能」chip 對照表
 * 顯示文字 → workspace_features.feature_code
 * 方案已含的 chip 自動勾且鎖住、其他可現場 toggle
 */
const OPTIONAL_FEATURES: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'calendar', name: '行事曆' },
  { code: 'todos', name: '待辦事項' },
  { code: 'channels', name: '溝通頻道' },
  { code: 'esim', name: 'eSIM 管理' },
  { code: 'documents', name: '文件中心' },
  { code: 'tours.contract', name: '電子合約系統' },
]

interface PlanFeature {
  name: string
  note?: string
}

const PLAN_INCREMENTAL: Record<
  Exclude<PlanId, 'custom'>,
  { base?: string; features: PlanFeature[]; isPickTwo?: true }
> = {
  lite: {
    features: [
      { name: '旅遊團（含報價單）' },
      { name: '訂單管理' },
      { name: '財務系統（收款 / 請款 / 出納）' },
    ],
  },
  standard: {
    base: '輕量版',
    features: [
      { name: '顧客管理' },
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
      { name: '完整人資（薪資 + 獎金）' },
      { name: '會計系統' },
      { name: 'AI Hub' },
      { name: 'HAPPY 機器人' },
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

interface Props {
  subscriptionPlan: PlanId
  advancePicks: AdvancePickId[]
  optionalFeatures: string[]
  onPlanChange: (plan: PlanId) => void
  onAdvancePicksChange: (picks: AdvancePickId[]) => void
  onOptionalFeaturesChange: (features: string[]) => void
}

export function TenantPlanSection({
  subscriptionPlan,
  advancePicks,
  optionalFeatures,
  onPlanChange,
  onAdvancePicksChange,
  onOptionalFeaturesChange,
}: Props) {
  // 方案已含的 feature 集合（chip 勾選 + 鎖住的依據）
  const planFeatureSet = useMemo(
    () => new Set(getFeaturesForPlan(subscriptionPlan, advancePicks)),
    [subscriptionPlan, advancePicks]
  )

  const toggleOptional = (code: string) => {
    if (planFeatureSet.has(code)) return // 方案內含、不可取消
    if (optionalFeatures.includes(code)) {
      onOptionalFeaturesChange(optionalFeatures.filter(c => c !== code))
    } else {
      onOptionalFeaturesChange([...optionalFeatures, code])
    }
  }
  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-medium text-morandi-primary">訂閱方案 <span className="text-morandi-red">*</span></p>
        <p className="text-xs text-morandi-secondary mt-0.5">選擇後自動配置對應功能，建立後可在租戶詳情調整</p>
      </div>

      {/* 4 張方案卡片 */}
      <div className="grid grid-cols-4 gap-2">
        {PLAN_ORDER.map(planId => {
          const meta = PLAN_META[planId]
          const def = PLAN_INCREMENTAL[planId]
          const isSelected = subscriptionPlan === planId

          return (
            <button
              key={planId}
              type="button"
              onClick={() => onPlanChange(planId)}
              className={`flex flex-col gap-2 p-3.5 rounded-[16px] text-left transition-all ${
                isSelected
                  ? 'bg-morandi-gold/5 shadow-[rgba(180,160,120,0.3)_0px_6px_16px_-4px]'
                  : 'bg-morandi-cream-soft hover:bg-morandi-cream-warm hover:shadow-[rgba(180,160,120,0.15)_0px_4px_12px_-4px]'
              }`}
            >
              {/* 方案名稱 + tagline 並排，無 chip */}
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-morandi-primary">{meta.name}</span>
                  <span className={`text-[11px] ${meta.tagColor}`}>{meta.tagline}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-morandi-gold flex-shrink-0" />}
              </div>

              {/* 增量功能列表 */}
              <div className="space-y-1">
                {/* 包含上層方案 */}
                {def.base && (
                  <p className="text-[11px] text-morandi-secondary leading-tight">
                    包含{def.base}全部功能
                  </p>
                )}

                {/* 進階版：顯示 3選2 選項 */}
                {def.isPickTwo && (
                  <>
                    {(Object.values(ADVANCE_PICK_OPTIONS) as { name: string; icon: string }[]).map(opt => (
                      <div key={opt.name} className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-morandi-gold leading-none w-3 text-center">2/3</span>
                        <span className="text-[11px] text-morandi-gold leading-tight">{opt.name}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-morandi-secondary mt-0.5">從下方選擇 2 個</p>
                  </>
                )}

                {/* 該方案新增的功能 */}
                {def.features.map(f => (
                  <div key={f.name} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-morandi-green flex-shrink-0" />
                    <span className="text-[11px] text-morandi-primary leading-tight">
                      {f.name}
                      {f.note && <span className="text-morandi-secondary"> ({f.note})</span>}
                    </span>
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* 其他可選功能 */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-morandi-primary">其他可選功能</p>
        <p className="text-[11px] text-morandi-secondary">
          現場勾選要開通的功能。方案已含的會自動鎖住、建立後也可在租戶詳情調整。
        </p>
        <div className="flex flex-wrap gap-1.5">
          {OPTIONAL_FEATURES.map(({ code, name }) => {
            const inPlan = planFeatureSet.has(code)
            const checked = inPlan || optionalFeatures.includes(code)
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggleOptional(code)}
                disabled={inPlan}
                title={inPlan ? '方案已內含、無法取消' : checked ? '點擊取消' : '點擊開通'}
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-all ${
                  checked
                    ? inPlan
                      ? 'bg-morandi-gold/15 text-morandi-gold cursor-not-allowed'
                      : 'bg-morandi-gold/20 text-morandi-primary hover:bg-morandi-gold/30'
                    : 'bg-morandi-container/20 text-morandi-secondary hover:bg-morandi-container/40'
                }`}
              >
                {checked && (
                  inPlan
                    ? <Lock className="h-2.5 w-2.5" />
                    : <Check className="h-2.5 w-2.5" />
                )}
                {name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Advance 3選2 */}
      {subscriptionPlan === 'advance' && (
        // eslint-disable-next-line venturo/no-forbidden-classes
        <div className="p-3.5 rounded-[14px] border border-morandi-gold/30 bg-morandi-gold/5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm font-semibold text-morandi-primary">進階版 — 選擇 2 個模組</span>
            {advancePicks.length !== 2 && (
              <span className="text-xs text-morandi-red font-medium">請選擇 2 個</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(ADVANCE_PICK_OPTIONS) as [AdvancePickId, { name: string; icon: string }][]).map(
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
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-[10px] border transition-all text-left ${
                      isChecked
                        ? 'border-morandi-gold/60 bg-morandi-gold/15'
                        : isDisabled
                        ? 'border-morandi-border/30 bg-morandi-container/10 opacity-40 cursor-not-allowed'
                        : 'border-morandi-border/40 bg-white hover:border-morandi-gold/40 hover:bg-morandi-gold/5'
                    }`}
                  >
                    <span className="text-xs font-medium text-morandi-primary">{option.name}</span>
                    {isChecked && <Check className="ml-auto h-3.5 w-3.5 text-morandi-gold flex-shrink-0" />}
                  </button>
                )
              }
            )}
          </div>
        </div>
      )}

    </section>
  )
}
