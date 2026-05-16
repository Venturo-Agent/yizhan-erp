#!/usr/bin/env tsx
/**
 * audit:dialog-button-order — Dialog footer 按鈕順序檢查
 *
 * 對齊 07-ui-consistency-blueprint.md R4：
 *   - 取消（左、次要 variant）
 *   - 主操作（右、實心 / soft-gold variant）
 *
 * 抓 anti-pattern：
 *   - 「確認」/「儲存」/「送出」在左、「取消」在右
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const SCAN_DIR = join(ROOT, 'src/app/(main)')

const EXCLUDED = [/__tests__/, /\.test\./, /\.spec\./]

const PRIMARY_TEXTS = ['確認', '儲存', '送出', '建立', '新增', '提交', '完成']
const CANCEL_TEXTS = ['取消', '關閉', '返回']

interface Finding {
  file: string
  line: number
  excerpt: string
}

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[]
  try { entries = readdirSync(dir) } catch { return out }
  for (const entry of entries) {
    const p = join(dir, entry)
    if (EXCLUDED.some(re => re.test(p))) continue
    let st
    try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) walk(p, out)
    else if (entry.endsWith('.tsx')) out.push(p)
  }
  return out
}

function checkFile(filePath: string): Finding[] {
  const src = readFileSync(filePath, 'utf8')
  const findings: Finding[] = []

  // 找 footer 區段（粗略：抓 `flex.*justify.*end` 內或 DialogFooter 內）
  // 簡單做：找連續兩個 Button、看順序
  // 排除：button content 內含 `{` JSX 表達式（譬如三元式、handler 字串、跨行）
  const buttonGroupRegex = /<Button[^>]*>([^<{]+)<\/Button>\s*<Button[^>]*>([^<{]+)<\/Button>/g

  let m: RegExpExecArray | null
  while ((m = buttonGroupRegex.exec(src)) !== null) {
    const text1 = m[1].trim()
    const text2 = m[2].trim()
    // 跳過 button text 太長（可能是錯誤抓多行）
    if (text1.length > 30 || text2.length > 30) continue
    // 抓「主操作在左、取消在右」反例
    const firstIsPrimary = PRIMARY_TEXTS.some(t => text1.includes(t))
    const secondIsCancel = CANCEL_TEXTS.some(t => text2.includes(t))
    if (firstIsPrimary && secondIsCancel) {
      const lineNum = src.substring(0, m.index).split('\n').length
      findings.push({
        file: relative(ROOT, filePath),
        line: lineNum,
        excerpt: `${text1} | ${text2}（應反過來：取消左、${text1}右）`,
      })
    }
  }

  return findings
}

function main() {
  const files = walk(SCAN_DIR)
  const allFindings: Finding[] = []
  for (const f of files) {
    allFindings.push(...checkFile(f))
  }

  console.log('')
  console.log('═══ audit:dialog-button-order — Dialog footer 按鈕順序檢查 ═══')
  console.log('')
  console.log(`掃描檔：${files.length}`)
  console.log(`finding 數：${allFindings.length}`)
  console.log('')

  if (allFindings.length === 0) {
    console.log('✅ 所有 dialog footer 按鈕順序正確（取消左、主操作右）')
    return
  }

  console.log('━━ Finding ━━')
  for (const f of allFindings) {
    console.log(`  ${f.file}:${f.line}`)
    console.log(`    ${f.excerpt}`)
  }
  console.log('')
  console.log('💡 修法：對齊 07-ui-consistency-blueprint.md R4：取消（左、outline）/ 主操作（右、實心）')
}

main()
