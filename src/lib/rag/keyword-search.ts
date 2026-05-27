/**
 * RAG keyword-based retrieval（Phase 1、不接 embedding）
 *
 * 為什麼用 keyword 不用 vector search：
 *   embedding 要開 MiniMax embo-01 服務、要儲值。Phase 1 先用 keyword
 *   證明「資料庫接到 bot」的概念、Phase 2 再升級語意搜尋。
 *
 * 抽詞策略（hardcoded、不用 NLP）：
 *   - 地區 / 國家：直接 string includes
 *   - 客群：「親子 / 銀髮 / 蜜月 / 朋友」等對應 chunk_type + metadata
 *   - 季節：春櫻 / 夏 / 秋楓 / 冬雪 對應 metadata.season
 *   - 風格：美食 / 文化 / 海島 / 購物 對應 metadata.style
 *
 * 失敗策略：
 *   keyword 全 miss → 回空陣列、caller 不注入 RAG block、LLM 走純對話模式
 *   query 失敗 → 回空陣列、log warn、不擋 bot 對話
 *
 * Phase 2（之後升級）：
 *   - 加 embedding（embo-01）做 vector cosine search
 *   - hybrid：keyword 命中優先、vector 補抽象問法（「想去北陸」「帶小孩」）
 *   - 加 LLM rerank
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

const HANDLER = 'rag-keyword-search'

// ════════════════════════════════════════
// 關鍵字字典（後續可拉成 DB-driven、現在 hardcode）
// ════════════════════════════════════════

const REGION_KEYWORDS: Record<string, { country: string; region: string }> = {
  金澤: { country: '日本', region: '金澤' },
  沖繩: { country: '日本', region: '沖繩' },
  北海道: { country: '日本', region: '北海道' },
  名古屋: { country: '日本', region: '名古屋' },
  大阪: { country: '日本', region: '大阪' },
  東京: { country: '日本', region: '東京' },
  四國: { country: '日本', region: '四國' },
  曼谷: { country: '泰國', region: '曼谷' },
  蘇美島: { country: '泰國', region: '蘇美島' },
  蘇美: { country: '泰國', region: '蘇美島' },
  清邁: { country: '泰國', region: '清邁' },
}

const COUNTRY_KEYWORDS = ['日本', '日', '泰國', '泰']

const AUDIENCE_KEYWORDS: Record<string, { tag: string; chunkType: string }> = {
  親子: { tag: 'family_kids', chunkType: 'family_kids' },
  小孩: { tag: 'family_kids', chunkType: 'family_kids' },
  小朋友: { tag: 'family_kids', chunkType: 'family_kids' },
  兒童: { tag: 'family_kids', chunkType: 'family_kids' },
  銀髮: { tag: 'family_senior', chunkType: 'family_senior' },
  長輩: { tag: 'family_senior', chunkType: 'family_senior' },
  老人: { tag: 'family_senior', chunkType: 'family_senior' },
  父母: { tag: 'family_senior', chunkType: 'family_senior' },
  蜜月: { tag: 'couples', chunkType: '' },
  情侶: { tag: 'couples', chunkType: '' },
  朋友: { tag: 'friends', chunkType: '' },
  閨蜜: { tag: 'friends', chunkType: '' },
}

const SEASON_KEYWORDS: Record<string, string> = {
  春: 'spring',
  櫻: 'spring',
  櫻花: 'spring',
  夏: 'summer',
  秋: 'autumn',
  楓: 'autumn',
  冬: 'winter',
  雪: 'winter',
  溫泉: 'winter',
}

const STYLE_KEYWORDS: Record<string, string> = {
  美食: 'food',
  吃: 'food',
  文化: 'culture',
  傳統: 'culture',
  神社: 'culture',
  寺廟: 'culture',
  購物: 'shopping',
  海島: 'island',
  海灘: 'island',
  潛水: 'island',
  慢活: 'leisurely',
  悠閒: 'leisurely',
  都會: 'urban',
  夜生活: 'urban',
  自然: 'nature',
  森林: 'nature',
  山: 'nature',
}

// ════════════════════════════════════════
// 抽詞 + 搜尋
// ════════════════════════════════════════

export interface KnowledgeMatch {
  region: string
  country: string
  chunk_type: string
  content: string
}

interface ExtractedKeywords {
  regions: string[]
  countries: string[]
  audiences: { tag: string; chunkType: string }[]
  seasons: string[]
  styles: string[]
}

function extractKeywords(userText: string): ExtractedKeywords {
  const out: ExtractedKeywords = {
    regions: [],
    countries: [],
    audiences: [],
    seasons: [],
    styles: [],
  }

  for (const [kw, { region }] of Object.entries(REGION_KEYWORDS)) {
    if (userText.includes(kw)) out.regions.push(region)
  }
  for (const kw of COUNTRY_KEYWORDS) {
    if (userText.includes(kw)) {
      if (kw.includes('日')) out.countries.push('日本')
      if (kw.includes('泰')) out.countries.push('泰國')
    }
  }
  for (const [kw, val] of Object.entries(AUDIENCE_KEYWORDS)) {
    if (userText.includes(kw)) out.audiences.push(val)
  }
  for (const [kw, val] of Object.entries(SEASON_KEYWORDS)) {
    if (userText.includes(kw)) out.seasons.push(val)
  }
  for (const [kw, val] of Object.entries(STYLE_KEYWORDS)) {
    if (userText.includes(kw)) out.styles.push(val)
  }

  // dedup
  out.regions = [...new Set(out.regions)]
  out.countries = [...new Set(out.countries)]
  out.seasons = [...new Set(out.seasons)]
  out.styles = [...new Set(out.styles)]

  return out
}

interface ChunkRow {
  chunk_type: string
  content: string
  knowledge_documents: {
    region: string
    country: string
  } | null
}

export async function searchKnowledgeByKeywords(args: {
  workspaceId: string
  userText: string
  limit?: number
}): Promise<KnowledgeMatch[]> {
  const { workspaceId, userText, limit = 5 } = args
  const kw = extractKeywords(userText)

  // 全 miss → 不查、避免抓一堆雜訊塞 prompt
  const totalHits =
    kw.regions.length +
    kw.countries.length +
    kw.audiences.length +
    kw.seasons.length +
    kw.styles.length
  if (totalHits === 0) {
    return []
  }

  try {
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    // 組 query：join documents + chunks、依抽到的關鍵字篩
    let query = supabase
      .from('knowledge_chunks')
      .select(
        `
        chunk_type,
        content,
        knowledge_documents!inner (
          region,
          country
        )
      `
      )
      .eq('workspace_id', workspaceId)

    // 優先序：地區 > 國家 > 客群 chunk_type > 風格 metadata
    if (kw.regions.length > 0) {
      query = query.in('knowledge_documents.region', kw.regions)
    } else if (kw.countries.length > 0) {
      query = query.in('knowledge_documents.country', kw.countries)
    }

    if (kw.audiences.length > 0) {
      const chunkTypes = kw.audiences.map(a => a.chunkType).filter(Boolean)
      if (chunkTypes.length > 0) {
        // 命中具體 chunk_type 的時候、優先抓那種 chunk（譬如「親子」優先抓 family_kids）
        query = query.in('chunk_type', [...chunkTypes, 'positioning', 'core_experience'])
      }
    }

    const { data, error } = await query.limit(limit * 2)

    if (error) {
      logger.warn(`${HANDLER}: query failed`, { error: error.message, workspaceId })
      return []
    }

    if (!data || data.length === 0) {
      // 退一步：放寬條件、只用國家篩
      if (kw.countries.length > 0 && kw.regions.length === 0) {
        // 已是國家層級、確實沒結果
        return []
      }
      // 用地區但 0 結果（罕見）→ 改用國家試
      if (kw.regions.length > 0 && kw.countries.length === 0) {
        const inferredCountries: string[] = []
        for (const r of kw.regions) {
          const entry = Object.values(REGION_KEYWORDS).find(v => v.region === r)
          if (entry && !inferredCountries.includes(entry.country)) {
            inferredCountries.push(entry.country)
          }
        }
        if (inferredCountries.length > 0) {
          const { data: fallback } = await supabase
            .from('knowledge_chunks')
            .select('chunk_type, content, knowledge_documents!inner (region, country)')
            .eq('workspace_id', workspaceId)
            .in('knowledge_documents.country', inferredCountries)
            .limit(limit)
          if (fallback && fallback.length > 0) {
            return mapRows(fallback as unknown as ChunkRow[]).slice(0, limit)
          }
        }
      }
      return []
    }

    return mapRows(data as unknown as ChunkRow[]).slice(0, limit)
  } catch (err) {
    logger.error(`${HANDLER}: unexpected error`, err, { workspaceId })
    return []
  }
}

function mapRows(rows: ChunkRow[]): KnowledgeMatch[] {
  return rows
    .filter(r => r.knowledge_documents)
    .map(r => ({
      region: r.knowledge_documents!.region,
      country: r.knowledge_documents!.country,
      chunk_type: r.chunk_type,
      content: r.content,
    }))
}

// ════════════════════════════════════════
// 把搜尋結果組成 system prompt block
// ════════════════════════════════════════

const CHUNK_TYPE_LABEL: Record<string, string> = {
  positioning: '地區定位',
  audience_fit: '適合的客群',
  audience_unfit: '不適合的客群',
  core_experience: '核心體驗',
  family_kids: '親子注意事項',
  family_senior: '銀髮注意事項',
  instagram: '打卡亮點',
  food: '美食特色',
  duration: '建議天數',
  pairing: '建議搭配',
  season: '季節建議',
  culture: '文化背景',
}

export function buildRagBlock(matches: KnowledgeMatch[]): string | null {
  if (matches.length === 0) return null

  // 按地區分組、每地區內按 chunk_type 排
  const byRegion: Record<string, KnowledgeMatch[]> = {}
  for (const m of matches) {
    const key = `${m.country} / ${m.region}`
    if (!byRegion[key]) byRegion[key] = []
    byRegion[key].push(m)
  }

  const sections: string[] = []
  for (const [regionKey, items] of Object.entries(byRegion)) {
    sections.push(`### ${regionKey}`)
    for (const item of items) {
      const label = CHUNK_TYPE_LABEL[item.chunk_type] ?? item.chunk_type
      sections.push(`【${label}】\n${item.content}`)
    }
  }

  return `【知識庫 — 相關片段】\n你針對客戶問題、可以參考以下知識庫整理的地區資料、優先用這些內容回答（若內容不夠就誠實說「需要再幫您確認」、不要編造）：\n\n${sections.join('\n\n')}\n\n（以上資料為知識庫整理、若客戶問到的細節未涵蓋、請引導對話、不要硬掰）`
}
