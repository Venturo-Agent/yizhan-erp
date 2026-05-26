#!/usr/bin/env node
/**
 * 讀旅遊知識庫 xlsx → 直接 upsert 進 knowledge_documents + knowledge_chunks
 *
 * 為什麼用 tsx 不用 python：
 *   yizhan-erp 已裝 xlsx + @supabase/supabase-js、不用額外裝 python 套件
 *   走 Supabase admin client（service_role）跟 app 內部寫法一致、不直連 psql
 *
 * 用法：
 *   source ~/.config/venturo/secrets.env
 *   npx tsx scripts/rag/load-knowledge.ts <xlsx_path> [--workspace <uuid>]
 *
 * 可重跑：所有 upsert 走 onConflict 條件、資料更新時重跑即可
 */

import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import path from 'node:path'

const DEFAULT_WORKSPACE = 'a89335d4-85f1-492b-83c7-2476ab7c5d81' // 漫途 CORNER

const FIELD_MAP: Record<string, { target: 'document' | 'chunk'; key: string }> = {
  地區名稱: { target: 'document', key: 'title' },
  地區定位標語: { target: 'document', key: 'positioning' },
  適合什麼風格的客人: { target: 'chunk', key: 'audience_fit' },
  不適合什麼客人: { target: 'chunk', key: 'audience_unfit' },
  核心體驗項目: { target: 'chunk', key: 'core_experience' },
  親子族群注意事項: { target: 'chunk', key: 'family_kids' },
  銀髮族群注意事項: { target: 'chunk', key: 'family_senior' },
  網美打卡族群亮點: { target: 'chunk', key: 'instagram' },
  美食特色: { target: 'chunk', key: 'food' },
  建議天數: { target: 'chunk', key: 'duration' },
  建議搭配地區: { target: 'chunk', key: 'pairing' },
  季節建議與避開時段: { target: 'chunk', key: 'season' },
  獨特文化背景: { target: 'chunk', key: 'culture' },
}

const JAPAN_REGIONS = [
  '金澤',
  '沖繩',
  '北海道',
  '名古屋',
  '大阪',
  '東京',
  '四國',
  'Kanazawa',
  'Okinawa',
  'Hokkaido',
  'Nagoya',
  'Osaka',
  'Tokyo',
  'Shikoku',
]
const THAI_REGIONS = ['曼谷', '蘇美島', '清邁', 'Bangkok', 'Samui', 'Chiang Mai']

function detectCountry(sheetName: string): string {
  if (JAPAN_REGIONS.some(r => sheetName.includes(r))) return '日本'
  if (THAI_REGIONS.some(r => sheetName.includes(r))) return '泰國'
  return '未分類'
}

function parseRegionName(title: string): { region: string; regionEn: string | null } {
  const m = title.trim().match(/^([^（(]+)[（(]([^）)]+)[）)]/)
  if (m) return { region: m[1].trim(), regionEn: m[2].trim() }
  return { region: title.trim(), regionEn: null }
}

const AUDIENCE_KEYWORDS: Record<string, string[]> = {
  family_kids: ['親子', '兒童', '幼童', '小孩', '帶小孩', '寶寶', '主題樂園'],
  family_senior: ['銀髮', '長輩', '老人', '高齡', '行動不便', '醫療'],
  couples: ['情侶', '蜜月', '浪漫', '夜景', '兩人'],
  friends: ['閨蜜', '朋友', '姐妹', '青年'],
  solo: ['獨旅', '一個人', '單人'],
}
const STYLE_KEYWORDS: Record<string, string[]> = {
  leisurely: ['慢活', '悠閒', '靜謐', '療癒', '緩慢'],
  food: ['美食', '海鮮丼', '料理', '必吃', '名物', '餐廳'],
  culture: ['文化', '傳統', '歷史', '神社', '寺廟', '工藝', '茶道'],
  nature: ['自然', '森林', '山', '海', '湖', '溫泉', '花海'],
  shopping: ['購物', '百貨', '免稅', 'outlet', 'Outlet'],
  island: ['海島', '潛水', '海灘', '碧海'],
  urban: ['都會', '繁華', '夜生活', '酒吧'],
}
const SEASON_KEYWORDS: Record<string, string[]> = {
  spring: ['春', '櫻花', '4月', '5月'],
  summer: ['夏', '7月', '8月', '海島'],
  autumn: ['秋', '楓', '10月', '11月'],
  winter: ['冬', '雪', '12月', '1月', '2月', '溫泉'],
}

function detectTags(content: string, kwMap: Record<string, string[]>): string[] {
  return Object.entries(kwMap)
    .filter(([_, kws]) => kws.some(k => content.includes(k)))
    .map(([t]) => t)
}

function buildMetadata(chunkType: string, content: string): Record<string, string[]> {
  const md: Record<string, string[]> = {}
  if (chunkType === 'family_kids') md.audience = ['family_kids']
  if (chunkType === 'family_senior') md.audience = ['family_senior']
  if (chunkType === 'instagram') md.style = ['photo']

  const aud = detectTags(content, AUDIENCE_KEYWORDS)
  const sty = detectTags(content, STYLE_KEYWORDS)
  const ssn = detectTags(content, SEASON_KEYWORDS)
  if (aud.length) md.audience = [...new Set([...(md.audience ?? []), ...aud])].sort()
  if (sty.length) md.style = [...new Set([...(md.style ?? []), ...sty])].sort()
  if (ssn.length) md.season = ssn

  return md
}

async function main() {
  const args = process.argv.slice(2)
  const xlsxPath = args.find(a => !a.startsWith('--'))
  if (!xlsxPath) {
    console.error('Usage: tsx scripts/rag/load-knowledge.ts <xlsx_path> [--workspace <uuid>]')
    process.exit(1)
  }
  const wsIdx = args.indexOf('--workspace')
  const workspaceId = wsIdx >= 0 ? args[wsIdx + 1] : DEFAULT_WORKSPACE

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SERVICE_ROLE_KEY')
    console.error('Did you `source ~/.config/venturo/secrets.env`?')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  console.log(`📖 Reading: ${xlsxPath}`)
  const wb = XLSX.readFile(xlsxPath)
  console.log(`   Sheets: ${wb.SheetNames.length}`)

  let totalDocs = 0
  let totalChunks = 0

  for (const sheetName of wb.SheetNames) {
    if (sheetName.startsWith('📋')) continue

    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<[string, string]>(ws, { header: 1 })

    const fields: Record<string, string> = {}
    for (const r of rows) {
      if (!r || r.length < 2) continue
      const k = String(r[0] ?? '').trim()
      const v = String(r[1] ?? '').trim()
      if (!k || !v || k === '資料欄位') continue
      fields[k] = v
    }

    const country = detectCountry(sheetName)
    const title = fields['地區名稱'] ?? sheetName
    const { region, regionEn } = parseRegionName(title)
    const positioning = fields['地區定位標語'] ?? ''

    // 1. Upsert document
    const { data: doc, error: docErr } = await supabase
      .from('knowledge_documents')
      .upsert(
        {
          workspace_id: workspaceId,
          country,
          region,
          region_en: regionEn,
          title,
          positioning,
          source_file: path.basename(xlsxPath),
          source_version: 'v1.0',
          metadata: {},
        },
        { onConflict: 'workspace_id,country,region' }
      )
      .select('id')
      .single()

    if (docErr || !doc) {
      console.error(`  ❌ ${region}: doc upsert failed —`, docErr?.message)
      continue
    }
    totalDocs++

    // 2. Upsert chunks
    const chunkRows = Object.entries(FIELD_MAP)
      .filter(([_, m]) => m.target === 'chunk')
      .map(([fieldLabel, { key: chunkType }]) => {
        const content = fields[fieldLabel]?.trim()
        if (!content) return null
        return {
          document_id: doc.id,
          workspace_id: workspaceId,
          chunk_type: chunkType,
          content,
          metadata: buildMetadata(chunkType, content),
        }
      })
      .filter(Boolean) as Array<{
      document_id: string
      workspace_id: string
      chunk_type: string
      content: string
      metadata: Record<string, string[]>
    }>

    if (chunkRows.length > 0) {
      const { error: chunkErr } = await supabase
        .from('knowledge_chunks')
        .upsert(chunkRows, { onConflict: 'document_id,chunk_type' })

      if (chunkErr) {
        console.error(`  ⚠️  ${region}: chunks upsert failed —`, chunkErr.message)
      } else {
        totalChunks += chunkRows.length
        console.log(`  ✅ ${country} / ${region} — 1 doc + ${chunkRows.length} chunks`)
      }
    }
  }

  console.log()
  console.log(`📊 Done. Documents: ${totalDocs}, Chunks: ${totalChunks}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
