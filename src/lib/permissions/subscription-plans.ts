/**
 * 訂閱方案定義
 *
 * William 2026-05-18 拍板：5 層方案（Lite / Standard / Advance / Premium / Custom）
 *
 * 設計原則：
 * - 方案只是「UI 套裝快捷」，真實授權由 workspace_features 決定
 * - 切換方案會自動配置 features state（前端 only）、儲存時才寫入 DB
 * - Advance 方案需選 2 個進階模組（合約 / 完整人資 / 會計）
 * - Custom = 手動管理、方案選擇不動 features
 */

export type PlanId = 'lite' | 'standard' | 'advance' | 'premium' | 'custom'

export type AdvancePickId = 'contracts' | 'hr_full' | 'accounting'

/**
 * 基本功能：任何方案都包含、不列入計費
 */
export const BASE_FEATURES: string[] = [
  'dashboard',
  'calendar',
  'todos',
  'settings',
  'hr',
  'database',
]

/**
 * 進階版 3選2 模組定義
 * - contracts → tours.contract
 * - hr_full → hr_salary_settlement + hr_bonus_settlement
 * - accounting → accounting
 */
export const ADVANCE_PICK_OPTIONS: Record<
  AdvancePickId,
  { name: string; icon: string; features: string[] }
> = {
  contracts: {
    name: '合約系統',
    icon: '📄',
    features: ['tours.contract'],
  },
  hr_full: {
    name: '完整人資',
    icon: '👥',
    features: ['hr_salary_settlement', 'hr_bonus_settlement'],
  },
  accounting: {
    name: '會計系統',
    icon: '🧾',
    features: ['accounting'],
  },
}

export interface PlanDefinition {
  id: PlanId
  name: string
  tagline: string
  colorClass: string
  description: string
  /** 除 BASE_FEATURES 之外的基礎功能 */
  baseFeatures: string[]
}

export const SUBSCRIPTION_PLANS: PlanDefinition[] = [
  {
    id: 'lite',
    name: '輕量版',
    tagline: 'Lite',
    colorClass: 'text-morandi-secondary bg-morandi-container/20',
    description: '旅遊團 + 訂單 + 基礎財務，適合剛起步的旅行社',
    baseFeatures: ['tours', 'orders', 'finance'],
  },
  {
    id: 'standard',
    name: '標準版',
    tagline: 'Standard',
    colorClass: 'text-morandi-primary bg-morandi-container/40',
    description: '輕量版全部功能 + 顧客管理，完整業務流程',
    baseFeatures: ['tours', 'orders', 'finance', 'customers'],
  },
  {
    id: 'advance',
    name: '進階版',
    tagline: 'Advance',
    colorClass: 'text-morandi-gold bg-morandi-gold/10',
    description: '標準版 + 選擇 2 個進階模組（合約 / 完整人資 / 會計）',
    baseFeatures: ['tours', 'orders', 'finance', 'customers'],
  },
  {
    id: 'premium',
    name: '旗艦版',
    tagline: 'Premium',
    colorClass: 'text-morandi-primary bg-morandi-gold/20',
    description: '全功能：標準版 + 合約系統 + 完整人資 + 會計系統 + AI Hub + Happy 機器人',
    baseFeatures: [
      'tours',
      'orders',
      'finance',
      'customers',
      'tours.contract',
      'hr_salary_settlement',
      'hr_bonus_settlement',
      'accounting',
      'ai_hub',
      'channels.happy',
    ],
  },
  {
    id: 'custom',
    name: '客製版',
    tagline: 'Custom',
    colorClass: 'text-morandi-muted bg-morandi-container/10',
    description: '手動管理各功能開關，不受方案限制',
    baseFeatures: [],
  },
]

/**
 * 依 id 取得方案定義
 */
export function getPlanById(id: PlanId): PlanDefinition {
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === id)
  if (!plan) {
    // fallback to custom（防止非法 id 炸）
    return SUBSCRIPTION_PLANS.find(p => p.id === 'custom')!
  }
  return plan
}

/**
 * 依方案 + 進階選項 取得應啟用的 feature code 列表
 *
 * @param planId 方案 id
 * @param advancePicks advance 方案時選的 2 個模組（其他方案不用傳）
 * @returns 所有應啟用的 feature code（包含 BASE_FEATURES）
 */
export function getFeaturesForPlan(planId: PlanId, advancePicks?: AdvancePickId[]): string[] {
  if (planId === 'custom') {
    // custom 不自動配置
    return []
  }

  const plan = getPlanById(planId)
  const features = new Set<string>([...BASE_FEATURES, ...plan.baseFeatures])

  if (planId === 'advance' && advancePicks) {
    for (const pickId of advancePicks) {
      const pick = ADVANCE_PICK_OPTIONS[pickId]
      if (pick) {
        pick.features.forEach(f => features.add(f))
      }
    }
  }

  return Array.from(features)
}

/**
 * 從目前已啟用的 feature 集合推測當前方案（盡力判斷、用於顯示）
 *
 * 判斷邏輯（從最高往下）：
 * 1. premium：包含全部 4 個進階 feature
 * 2. advance：包含 standard 基礎 + 至少 1 個進階 feature
 * 3. standard：包含 customers
 * 4. lite：包含 tours + orders + finance
 * 5. custom：其他
 */
export function detectCurrentPlan(enabledFeatures: string[]): PlanId {
  const featureSet = new Set(enabledFeatures)

  const hasAll = (codes: string[]) => codes.every(c => featureSet.has(c))

  const premiumPlan = getPlanById('premium')
  if (hasAll(premiumPlan.baseFeatures)) {
    return 'premium'
  }

  // advance：standard base + 至少 1 個 advance pick feature
  const advancePickFeatures = Object.values(ADVANCE_PICK_OPTIONS).flatMap(o => o.features)
  const standardBase = getPlanById('standard').baseFeatures
  if (hasAll(standardBase) && advancePickFeatures.some(f => featureSet.has(f))) {
    return 'advance'
  }

  if (featureSet.has('customers') && hasAll(['tours', 'orders', 'finance'])) {
    return 'standard'
  }

  if (hasAll(['tours', 'orders', 'finance'])) {
    return 'lite'
  }

  return 'custom'
}

/**
 * 從 workspace_features 列表推導目前勾選了哪些進階選項
 */
export function getAdvancePicksFromFeatures(
  features: { feature_code: string; enabled: boolean }[]
): AdvancePickId[] {
  const picks: AdvancePickId[] = []

  for (const [pickId, option] of Object.entries(ADVANCE_PICK_OPTIONS) as [
    AdvancePickId,
    { name: string; icon: string; features: string[] },
  ][]) {
    const allEnabled = option.features.every(f => {
      const found = features.find(wf => wf.feature_code === f)
      return found?.enabled === true
    })
    if (allEnabled) {
      picks.push(pickId)
    }
  }

  return picks
}
