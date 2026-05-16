#!/usr/bin/env tsx
/**
 * audit:ui-consistency — UI SSOT 使用率盤點
 *
 * 統計各種 SSOT 元件的使用率：
 *   - FormDialog / ConfirmDialog vs 直接 Dialog
 *   - ListPageLayout / ContentPageLayout vs 自製 layout
 *
 * 純盤點、不 flag specific finding（finding 太多會 noise）
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const SCAN_DIR = join(ROOT, 'src/app/(main)')

const EXCLUDED = [
  /\.test\.tsx?$/,
  /\.spec\.tsx?$/,
  /__tests__/,
  /Print/,
  // 純顯示型 dialog 是合理例外、不適合走 FormDialog（無 submit）
  // 對齊 07-ui-blueprint R1：detail / display 型可用 raw Dialog
  /Detail.*Dialog\.tsx$/,
  /.*Dialog.*Detail\.tsx$/,
  /MoreEvents.*\.tsx$/,
  /BirthdayList.*\.tsx$/,
  /.*Preview.*Dialog\.tsx$/,
  // 大型 workspace dialog 合理例外（2026-05-17 拍板、見 07-ui-consistency-findings.md）
  // 95vw×90vh、多 tab、自訂 header/footer，不適合 FormDialog
  /finance\/payments\/_components\/AddReceiptDialog\.tsx$/,
  /finance\/requests\/_components\/AddRequestDialog\.tsx$/,
]

interface Stat {
  ssotUsage: number      // 使用 SSOT 元件的 file 數
  rawUsage: number       // 直接用底層 ui 元件的 file 數
  total: number
  ssotFiles: string[]    // 用 SSOT 的檔
  rawFiles: string[]     // 沒用 SSOT 的檔
}

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    const p = join(dir, entry)
    if (EXCLUDED.some(re => re.test(p))) continue
    let st
    try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) {
      walk(p, out)
    } else if (entry.endsWith('.tsx')) {
      out.push(p)
    }
  }
  return out
}

function analyze(): { dialog: Stat; layout: Stat } {
  const files = walk(SCAN_DIR)

  const dialog: Stat = { ssotUsage: 0, rawUsage: 0, total: 0, ssotFiles: [], rawFiles: [] }
  const layout: Stat = { ssotUsage: 0, rawUsage: 0, total: 0, ssotFiles: [], rawFiles: [] }

  for (const f of files) {
    const src = readFileSync(f, 'utf8')

    // Dialog detection
    const usesAnyDialog = /<Dialog\b|FormDialog|ConfirmDialog|ManagedDialog/.test(src)
    if (usesAnyDialog) {
      dialog.total++
      const usesSsot = /FormDialog|ConfirmDialog|ManagedDialog/.test(src)
      const usesRaw = /import.*Dialog.*from\s+['"]@\/components\/ui\/dialog['"]/.test(src) &&
                      !/import.*Dialog.*from\s+['"]@\/components\/dialog['"]/.test(src)
      if (usesSsot && !usesRaw) {
        dialog.ssotUsage++
        dialog.ssotFiles.push(relative(ROOT, f))
      } else if (usesRaw) {
        dialog.rawUsage++
        dialog.rawFiles.push(relative(ROOT, f))
      }
    }

    // Layout detection
    const usesLayout = /<ListPageLayout|<ContentPageLayout|<MainLayout|export default function.*Page\b/.test(src)
    const isPage = /\bpage\.tsx$/.test(f)
    if (isPage) {
      layout.total++
      const usesSsot = /<ListPageLayout|<ContentPageLayout/.test(src)
      if (usesSsot) {
        layout.ssotUsage++
        layout.ssotFiles.push(relative(ROOT, f))
      } else {
        layout.rawUsage++
        layout.rawFiles.push(relative(ROOT, f))
      }
    }
  }

  return { dialog, layout }
}

function main() {
  const { dialog, layout } = analyze()

  console.log('')
  console.log('═══ audit:ui-consistency — UI SSOT 使用率盤點 ═══')
  console.log('')
  console.log('━━ Dialog 使用率 ━━')
  console.log(`  總計 dialog 使用檔：${dialog.total}`)
  console.log(`  ✅ 走 SSOT（FormDialog / ConfirmDialog / ManagedDialog）：${dialog.ssotUsage}`)
  console.log(`  ⚠ 直接用 ui/dialog：${dialog.rawUsage}`)
  if (dialog.total > 0) {
    const ratio = ((dialog.ssotUsage / dialog.total) * 100).toFixed(1)
    console.log(`  SSOT 覆蓋率：${ratio}%`)
  }
  console.log('')
  if (dialog.rawFiles.length > 0) {
    console.log('  ⚠ 沒走 SSOT 的 file（top 10）：')
    dialog.rawFiles.slice(0, 10).forEach(f => console.log(`    ${f}`))
    if (dialog.rawFiles.length > 10) {
      console.log(`    ... 還有 ${dialog.rawFiles.length - 10} 個`)
    }
  }

  console.log('')
  console.log('━━ Page Layout 使用率 ━━')
  console.log(`  總計 page.tsx：${layout.total}`)
  console.log(`  ✅ 走 SSOT（ListPageLayout / ContentPageLayout）：${layout.ssotUsage}`)
  console.log(`  ⚠ 自製 layout：${layout.rawUsage}`)
  if (layout.total > 0) {
    const ratio = ((layout.ssotUsage / layout.total) * 100).toFixed(1)
    console.log(`  SSOT 覆蓋率：${ratio}%`)
  }
  console.log('')
  if (layout.rawFiles.length > 0) {
    console.log('  ⚠ 沒走 SSOT 的 page（top 10）：')
    layout.rawFiles.slice(0, 10).forEach(f => console.log(`    ${f}`))
    if (layout.rawFiles.length > 10) {
      console.log(`    ... 還有 ${layout.rawFiles.length - 10} 個`)
    }
  }
  console.log('')
  console.log('💡 SSOT 元件：')
  console.log('   - Dialog → @/components/dialog (FormDialog / ConfirmDialog / ManagedDialog)')
  console.log('   - Layout → @/components/layout (ListPageLayout / ContentPageLayout)')
}

main()
