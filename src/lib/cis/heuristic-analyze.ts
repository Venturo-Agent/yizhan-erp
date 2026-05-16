/**
 * 啟發式品牌分析（fallback when LLM not configured）
 *
 * 不是 LLM、純規則、做兩件事：
 *   1. 從 summary 抓「高頻情感詞 / 品牌詞」當 brand_keywords / emotional_keywords
 *   2. 把第一個句子當 value_proposition
 *
 * 真實 LLM 接 /api/cis/analyze handler、回同樣的 BrandCard shape、UI 不用改。
 */

import type { BrandCard } from '@/types/cis.types'

const EMOTIONAL_LEXICON = [
  '溫暖', '安心', '放心', '貼心', '親切', '熱情', '專業', '尊榮',
  '冒險', '自由', '冷靜', '輕鬆', '療癒', '驚喜', '感動', '期待',
  '信任', '可靠', '家庭感', '幸福', '優雅', '在地', '深度', '正宗',
  '快樂', '開心', '舒適', '安全', '便利', '彈性',
]

const BRAND_LEXICON = [
  '親子', '銀髮', '商務', '蜜月', '畢旅', '客製', '深度', '頂級',
  '精品', '奢華', '經濟', '高 CP', '高cp', '輕旅行', '小團',
  '一價全包', '半自助', '自由行', '主題旅遊', '宗教', '美食',
  '攝影', '健行', '潛水', '滑雪', '郵輪', '鐵道',
]

const TOUCHPOINT_LEXICON = [
  '官網', '網站', '報價單', '確認單', '行程手冊', '社群', 'FB', 'Facebook',
  'IG', 'Instagram', 'LINE', 'line', '小紅書', 'YouTube',
  '門市', '實體', '電話', 'EDM', 'email', '電子報',
]

const NEED_PRIORITY_HINTS = {
  must_do: ['必做', '一定要', '優先', '最急', '最重要', '先做'],
  suggested: ['建議', '應該', '希望', '想要', '可以做'],
  optional: ['可選', '之後', '未來', '長期', '有空'],
}

function pickKeywords(text: string, lexicon: string[], max = 5): string[] {
  const found = new Set<string>()
  for (const k of lexicon) {
    if (text.includes(k)) found.add(k)
    if (found.size >= max) break
  }
  return Array.from(found)
}

function firstSentence(text: string): string {
  const m = text.match(/^[^。！？.!?\n]{4,80}[。！？.!?]?/)
  return m ? m[0].trim().replace(/[。！？.!?]$/, '') : ''
}

function categorizeNeeds(text: string): {
  must_do: string[]
  suggested: string[]
  optional: string[]
} {
  // 找出「逗號 / 頓號」分隔的物品 chips、按 priority hint 上下文分類
  const items = text
    .split(/[\n,，、；;]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 2 && s.length <= 24)

  const must_do: string[] = []
  const suggested: string[] = []
  const optional: string[] = []

  for (const item of items) {
    if (NEED_PRIORITY_HINTS.must_do.some(h => item.includes(h))) {
      must_do.push(item.replace(/必做|一定要|優先|最急|最重要|先做/g, '').trim())
    } else if (NEED_PRIORITY_HINTS.suggested.some(h => item.includes(h))) {
      suggested.push(item.replace(/建議|應該|希望|想要|可以做/g, '').trim())
    } else if (NEED_PRIORITY_HINTS.optional.some(h => item.includes(h))) {
      optional.push(item.replace(/可選|之後|未來|長期|有空/g, '').trim())
    }
  }

  return {
    must_do: must_do.filter(Boolean).slice(0, 5),
    suggested: suggested.filter(Boolean).slice(0, 5),
    optional: optional.filter(Boolean).slice(0, 5),
  }
}

export function heuristicAnalyze(summary: string): BrandCard {
  const text = summary || ''
  const needs = categorizeNeeds(text)

  return {
    brand_keywords: pickKeywords(text, BRAND_LEXICON, 5),
    emotional_keywords: pickKeywords(text, EMOTIONAL_LEXICON, 5),
    value_proposition: firstSentence(text),
    touchpoints: pickKeywords(text, TOUCHPOINT_LEXICON, 5),
    differentiation: '',
    priority_needs: needs,
    visual_hints: {},
  }
}
