/**
 * CIS 工作流型別（漫途整合行銷專屬）
 *
 * 對應 vault: brain/wiki/companies/venturo/service/cis/
 * 對應 DB:    cis_clients, cis_visits（migration 20260503300000）
 */

import type { BaseEntity } from '@/data/core/types'

/**
 * CIS 客戶（漫途服務的旅行社）
 */
export interface CisClient extends BaseEntity {
  id: string
  workspace_id?: string | null
  code: string
  company_name: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  travel_types: string[]
  tags: string[]
  status: CisClientStatus
  notes?: string | null
  created_by?: string | null
  updated_by?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type CisClientStatus = 'lead' | 'active' | 'closed'

export const CIS_CLIENT_STATUS_OPTIONS: { value: CisClientStatus; label: string }[] = [
  { value: 'lead', label: '線索' },
  { value: 'active', label: '進行中' },
  { value: 'closed', label: '結案' },
]

/**
 * 旅遊類型 tag 候選（從 vault A 第三階段提取）
 */
export const CIS_TRAVEL_TYPE_OPTIONS = [
  '親子',
  '銀髮',
  '商務',
  '蜜月',
  '畢旅',
  '國內旅遊',
  '國外旅遊',
  '主題旅遊',
  '客製化',
] as const

/**
 * 拜訪紀錄
 */
export interface CisVisit extends BaseEntity {
  id: string
  workspace_id?: string | null
  client_id: string
  visited_at: string
  stage: CisVisitStage
  summary?: string | null
  brand_card: BrandCard
  audio_url?: string | null
  created_by?: string | null
  updated_by?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type CisVisitStage = 'discovery' | 'audit' | 'positioning' | 'design' | 'rollout'

export const CIS_VISIT_STAGE_OPTIONS: { value: CisVisitStage; label: string; description: string }[] = [
  { value: 'discovery', label: '① 發現訪談', description: '破冰、確認旅遊類型' },
  { value: 'audit', label: '② 現況稽核', description: '品牌現況、識別現有觸點' },
  { value: 'positioning', label: '③ 策略定位', description: '情感關鍵詞、價值主張' },
  { value: 'design', label: '④ 設計方向', description: '需求項目、預估報價' },
  { value: 'rollout', label: '⑤ 應用展開', description: '導入、教育、維護' },
]

/**
 * 品牌資料卡（vault A 第六章 schema）
 *
 * 五階段引導對話的結構化結果。
 * 每次拜訪可填一部分、後續拜訪累積補齊。
 */
export interface BrandCard {
  /** 旅遊類型（譬如：親子 / 國內 / 銀髮） */
  travel_types?: string[]
  /** 品牌關鍵詞（差異化、定位） */
  brand_keywords?: string[]
  /** 情感關鍵詞（溫暖 / 專業 / 冒險 etc） */
  emotional_keywords?: string[]
  /** 價值主張（一句話「對第一次來的客人說的話」） */
  value_proposition?: string
  /** 客戶接觸點（官網 / 報價單 / 行程手冊 etc） */
  touchpoints?: string[]
  /** 優先需求 */
  priority_needs?: {
    must_do?: string[]
    suggested?: string[]
    optional?: string[]
  }
  /** 視覺暗示 */
  visual_hints?: {
    color_tone?: string
    style?: string
  }
  /** 競爭差異描述 */
  differentiation?: string
}

export type CreateCisClientData = Omit<
  CisClient,
  'id' | 'created_at' | 'updated_at' | 'workspace_id' | 'code'
> & {
  /** 不傳則由 createEntityHook 自動生成 */
  code?: string
}

export type CreateCisVisitData = Omit<
  CisVisit,
  'id' | 'created_at' | 'updated_at' | 'workspace_id'
>

/**
 * CIS 衍生項目價目表
 * 對應 vault B 第四章「旅遊業 CIS 衍生項目清單」
 */
export interface CisPricingItem extends BaseEntity {
  id: string
  workspace_id?: string | null
  code: string
  category: CisPricingCategory
  name: string
  description?: string | null
  unit: string
  price_low?: number | null
  price_high?: number | null
  /** 從 brand_card.priority_needs 自動 match 的關鍵詞 */
  match_keywords: string[]
  sort_order: number
  is_active: boolean
  notes?: string | null
  created_by?: string | null
  updated_by?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type CisPricingCategory =
  | 'identity'
  | 'print'
  | 'digital'
  | 'physical'
  | 'uniform'
  | 'other'

export const CIS_PRICING_CATEGORY_OPTIONS: {
  value: CisPricingCategory
  label: string
}[] = [
  { value: 'identity', label: '識別' },
  { value: 'print', label: '印刷' },
  { value: 'digital', label: '數位' },
  { value: 'physical', label: '實體' },
  { value: 'uniform', label: '制服' },
  { value: 'other', label: '其他' },
]

export type CreateCisPricingItemData = Omit<
  CisPricingItem,
  'id' | 'created_at' | 'updated_at' | 'workspace_id' | 'code'
> & {
  code?: string
}

/**
 * 報價草案（運算結果、不存 DB）
 * 從 brand_card + cis_pricing_items 計算出來
 */
export interface CisQuoteDraft {
  must_do: CisQuoteLine[]
  suggested: CisQuoteLine[]
  optional: CisQuoteLine[]
  unmatched_needs: string[]
  total_low: number
  total_high: number
}

export interface CisQuoteLine {
  item: CisPricingItem
  matched_need: string
}
