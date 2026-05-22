#!/usr/bin/env node
/**
 * yizhan-erp HAPPY 知識庫 indexer
 *
 * Phase 0（2026-05-22 William 拍板）：把系統文件 index 進 knowledge_documents + knowledge_chunks、
 * 讓 HAPPY 之後查 RAG 回答員工系統問題（「怎麼請款」「怎麼新增 HR」「為什麼看不到 X」等）。
 *
 * 「業務資料」（30 tours / 50 orders 等）仍走 src/lib/channels/happy-erp-context.ts 直接塞 prompt。
 * 「系統文件」（CLAUDE.md / module specs / 健檢 reports）走 RAG（本檔）。
 *
 * 跑：
 *   node scripts/index-erp-knowledge.mjs
 *   （需要 source ~/.config/venturo/secrets.env 取 SUPABASE_SERVICE_ROLE_KEY）
 *
 * launchd 每天 02:00 自動跑：~/Library/LaunchAgents/com.venturo.yizhan-erp-happy-index.plist
 *
 * 設計：
 *   1. 從 repo 抓 source files（CLAUDE.md / workspace/_meta/modules/ / workspace/健檢/reports/ / etc）
 *   2. 每個 source → 1 個 knowledge_document（用 source_file 當 unique key 做 upsert）
 *   3. content 按 markdown ## section 切 chunks（每 chunk 500-2000 char）
 *   4. UPSERT knowledge_chunks（先 delete 該 document 的舊 chunks、再 insert 新的）
 *   5. metadata.source='erp-system' 標籤、跟既有「旅遊知識庫」分流
 *   6. workspace_id = PLATFORM_WORKSPACE_ID（漫途 workspace、跨租戶共用）
 *
 * 不做（Phase 1+ 才做）：
 *   - embeddings（先用 PostgreSQL full-text search + ILIKE）
 *   - external embed widget
 *   - auto-popup trigger
 */

import { createClient } from '@supabase/supabase-js'
import { readFile, readdir, stat } from 'node:fs/promises'
import { join, basename, relative } from 'node:path'

const REPO_ROOT = process.env.REPO_ROOT || '/Users/william/Projects/yizhan-erp'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PLATFORM_WORKSPACE_ID = process.env.PLATFORM_WORKSPACE_ID

if (!SUPABASE_URL || !SERVICE_KEY || !PLATFORM_WORKSPACE_ID) {
  console.error('❌ 缺 env：source ~/.config/venturo/secrets.env')
  console.error(`SUPABASE_URL=${SUPABASE_URL ? '✓' : '✗'}`)
  console.error(`SERVICE_KEY=${SERVICE_KEY ? '✓' : '✗'}`)
  console.error(`PLATFORM_WORKSPACE_ID=${PLATFORM_WORKSPACE_ID ? '✓' : '✗'}`)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ── Sources to index ──
// 系統文件清單（curated、不是全部 markdown）
const SOURCE_PATTERNS = [
  // 憲法
  'CLAUDE.md',
  // SOP
  'workspace/_meta/architecture/2026-05-13-建表-SOP.md',
  'workspace/_meta/architecture/2026-05-14-新租戶-onboarding-seed-SOP.md',
  // 健檢框架
  'workspace/健檢/SPEC.md',
  'workspace/健檢/checklist.md',
  'workspace/健檢/decided/audit-methodology.md',
  'workspace/健檢/decided/ratchet-baseline.md',
  'workspace/健檢/reports/架構層面健檢.md',
  'workspace/健檢/reports/資安層面健檢.md',
  'workspace/健檢/reports/效能層面健檢.md',
  'workspace/健檢/reports/開發品管健檢.md',
  'workspace/健檢/reports/清理層面健檢.md',
  'workspace/健檢/reports/26-modules-x-5-dimensions-matrix.md',
  'workspace/健檢/DELIVERABLE-2026-05-20.md',
]

// Module specs（自動掃描）
async function getModuleSpecs() {
  const dir = join(REPO_ROOT, 'workspace/_meta/modules')
  try {
    const entries = await readdir(dir)
    return entries
      .filter(f => f.endsWith('-spec.md'))
      .map(f => `workspace/_meta/modules/${f}`)
  } catch {
    return []
  }
}

// User-facing how-to docs（2026-05-22 加、給 HAPPY 答 ERP 客戶問題用）
async function getUserGuideDocs() {
  const dir = join(REPO_ROOT, 'workspace/docs/user-guide')
  try {
    const entries = await readdir(dir)
    return entries
      .filter(f => f.endsWith('.md'))
      .map(f => `workspace/docs/user-guide/${f}`)
  } catch {
    return []
  }
}

// ── Chunking ──
function chunkMarkdown(text, maxChars = 2000) {
  // 按 ## section 切
  const sections = text.split(/\n(?=##\s)/)
  const chunks = []
  for (const section of sections) {
    if (section.length <= maxChars) {
      chunks.push(section.trim())
    } else {
      // 再按 paragraph 切
      const paragraphs = section.split(/\n\n+/)
      let buf = ''
      for (const p of paragraphs) {
        if ((buf + '\n\n' + p).length > maxChars && buf) {
          chunks.push(buf.trim())
          buf = p
        } else {
          buf = buf ? buf + '\n\n' + p : p
        }
      }
      if (buf) chunks.push(buf.trim())
    }
  }
  return chunks.filter(c => c.length > 50) // 太短的 skip
}

// ── 從 source_file 抓 doc metadata ──
// 注意：table unique constraint = (workspace_id, country, region)
// 所以 region 必須 unique per source；用 source_file path 當 region key
function getDocMetadata(sourceFile) {
  const fname = basename(sourceFile, '.md')
  // 用 source_file 當 region（保證 unique）
  const region = `erp:${sourceFile}`

  if (sourceFile === 'CLAUDE.md') {
    return { title: '專案憲法 CLAUDE.md', region, positioning: 'red-lines' }
  }
  if (sourceFile.includes('architecture/')) {
    return { title: `架構 SOP: ${fname}`, region, positioning: 'sop' }
  }
  if (sourceFile.includes('健檢/reports/')) {
    return { title: `健檢報告: ${fname}`, region, positioning: 'audit' }
  }
  if (sourceFile.includes('健檢/decided/')) {
    return { title: `已拍板: ${fname}`, region, positioning: 'decision' }
  }
  if (sourceFile.includes('健檢/')) {
    return { title: `健檢: ${fname}`, region, positioning: 'framework' }
  }
  if (sourceFile.includes('modules/')) {
    const moduleName = fname.replace('-spec', '')
    return { title: `模組規格: ${moduleName}`, region, positioning: 'module' }
  }
  if (sourceFile.includes('user-guide/')) {
    return { title: `操作指引: ${fname}`, region, positioning: 'how-to' }
  }
  return { title: fname, region, positioning: 'general' }
}

// ── Main ──
async function indexSource(sourcePath) {
  const fullPath = join(REPO_ROOT, sourcePath)
  let content
  try {
    content = await readFile(fullPath, 'utf-8')
  } catch (err) {
    console.warn(`⚠️ skip ${sourcePath}: ${err.message}`)
    return { skipped: true }
  }

  const meta = getDocMetadata(sourcePath)
  const sourceFileKey = sourcePath // 用作 upsert key

  // 1. Upsert document (查既有、若無則 insert)
  const { data: existingDoc } = await supabase
    .from('knowledge_documents')
    .select('id')
    .eq('workspace_id', PLATFORM_WORKSPACE_ID)
    .eq('source_file', sourceFileKey)
    .maybeSingle()

  let docId
  if (existingDoc) {
    docId = existingDoc.id
    await supabase
      .from('knowledge_documents')
      .update({
        title: meta.title,
        positioning: meta.positioning,
        region: meta.region,
        country: 'TW',
        source_version: new Date().toISOString().split('T')[0],
        metadata: { source: 'erp-system', file_size: content.length },
      })
      .eq('id', docId)
  } else {
    const { data: newDoc, error: docErr } = await supabase
      .from('knowledge_documents')
      .insert({
        workspace_id: PLATFORM_WORKSPACE_ID,
        title: meta.title,
        positioning: meta.positioning,
        region: meta.region,
        country: 'TW',
        source_file: sourceFileKey,
        source_version: new Date().toISOString().split('T')[0],
        metadata: { source: 'erp-system', file_size: content.length },
      })
      .select('id')
      .single()
    if (docErr) {
      console.error(`❌ insert doc ${sourcePath}: ${docErr.message}`)
      return { error: docErr.message }
    }
    docId = newDoc.id
  }

  // 2. 刪舊 chunks
  await supabase.from('knowledge_chunks').delete().eq('document_id', docId)

  // 3. Chunk + insert
  // 注意：knowledge_chunks 有 UNIQUE (document_id, chunk_type)、所以每 chunk 用獨立 type 名
  const chunks = chunkMarkdown(content)
  const rows = chunks.map((chunk, i) => ({
    workspace_id: PLATFORM_WORKSPACE_ID,
    document_id: docId,
    chunk_type: `text_${String(i).padStart(3, '0')}`,
    content: chunk,
    metadata: {
      source: 'erp-system',
      source_file: sourceFileKey,
      chunk_index: i,
      total_chunks: chunks.length,
    },
  }))

  if (rows.length > 0) {
    // 批次 insert
    const { error: chunkErr } = await supabase.from('knowledge_chunks').insert(rows)
    if (chunkErr) {
      console.error(`❌ insert chunks ${sourcePath}: ${chunkErr.message}`)
      return { error: chunkErr.message }
    }
  }

  return { docId, chunks: rows.length, size: content.length }
}

async function main() {
  console.log('🤖 HAPPY 知識庫 indexer 開始')
  console.log(`Repo: ${REPO_ROOT}`)
  console.log(`Workspace: ${PLATFORM_WORKSPACE_ID}`)
  console.log('')

  const moduleSpecs = await getModuleSpecs()
  const userGuides = await getUserGuideDocs()
  const allSources = [...SOURCE_PATTERNS, ...moduleSpecs, ...userGuides]

  console.log(`📚 共 ${allSources.length} 個 source files 要 index`)
  console.log('')

  let success = 0
  let totalChunks = 0
  let failed = 0
  let skipped = 0

  for (const src of allSources) {
    const result = await indexSource(src)
    if (result.error) {
      console.log(`❌ ${src}: ${result.error}`)
      failed++
    } else if (result.skipped) {
      console.log(`⚠️  ${src}: skipped`)
      skipped++
    } else {
      console.log(`✅ ${src}: ${result.chunks} chunks (${result.size} bytes)`)
      success++
      totalChunks += result.chunks
    }
  }

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ 成功: ${success}`)
  console.log(`⚠️  skip: ${skipped}`)
  console.log(`❌ 失敗: ${failed}`)
  console.log(`📊 總 chunks: ${totalChunks}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(err => {
  console.error('❌ Fatal:', err)
  process.exit(1)
})
