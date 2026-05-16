/**
 * 報價草案計算邏輯
 *
 * 從多次拜訪累積的 BrandCard.priority_needs 對應到 cis_pricing_items。
 * Match 規則：
 *   1. 完全包含（need 字串包含 item.name 或 item.code）
 *   2. 關鍵詞 match（item.match_keywords 任一個出現在 need）
 *   3. 找不到 → 進 unmatched_needs
 */

import type {
  BrandCard,
  CisPricingItem,
  CisQuoteDraft,
  CisQuoteLine,
  CisVisit,
} from '@/types/cis.types'

function matchItem(need: string, items: CisPricingItem[]): CisPricingItem | null {
  const lower = need.toLowerCase()
  // Pass 1: 名稱直接包含
  for (const item of items) {
    if (!item.is_active) continue
    if (item.name && lower.includes(item.name.toLowerCase())) return item
  }
  // Pass 2: code 包含
  for (const item of items) {
    if (!item.is_active) continue
    if (item.code && lower.includes(item.code.toLowerCase())) return item
  }
  // Pass 3: keyword
  for (const item of items) {
    if (!item.is_active) continue
    for (const k of item.match_keywords || []) {
      if (k && lower.includes(k.toLowerCase())) return item
    }
  }
  return null
}

function mergeNeeds(visits: CisVisit[]): {
  must_do: string[]
  suggested: string[]
  optional: string[]
} {
  const out = {
    must_do: new Set<string>(),
    suggested: new Set<string>(),
    optional: new Set<string>(),
  }
  for (const v of visits) {
    const n = (v.brand_card as BrandCard | undefined)?.priority_needs
    if (!n) continue
    n.must_do?.forEach(x => x.trim() && out.must_do.add(x.trim()))
    n.suggested?.forEach(x => x.trim() && out.suggested.add(x.trim()))
    n.optional?.forEach(x => x.trim() && out.optional.add(x.trim()))
  }
  return {
    must_do: Array.from(out.must_do),
    suggested: Array.from(out.suggested),
    optional: Array.from(out.optional),
  }
}

export function buildQuoteDraft(
  visits: CisVisit[],
  pricingItems: CisPricingItem[]
): CisQuoteDraft {
  const merged = mergeNeeds(visits)
  const unmatched: string[] = []

  const matchBucket = (needs: string[]): CisQuoteLine[] => {
    const lines: CisQuoteLine[] = []
    for (const need of needs) {
      const item = matchItem(need, pricingItems)
      if (item) {
        lines.push({ item, matched_need: need })
      } else {
        unmatched.push(need)
      }
    }
    return lines
  }

  const must_do = matchBucket(merged.must_do)
  const suggested = matchBucket(merged.suggested)
  const optional = matchBucket(merged.optional)

  // 計算必做項目的金額區間
  const sumLow = must_do.reduce((s, l) => s + (Number(l.item.price_low) || 0), 0)
  const sumHigh = must_do.reduce((s, l) => s + (Number(l.item.price_high) || 0), 0)

  return {
    must_do,
    suggested,
    optional,
    unmatched_needs: Array.from(new Set(unmatched)),
    total_low: sumLow,
    total_high: sumHigh,
  }
}

export function formatTwd(n: number): string {
  if (!n) return 'NT$ 0'
  return `NT$ ${Math.round(n).toLocaleString('zh-TW')}`
}
