#!/usr/bin/env tsx
/**
 * audit:spec-coverage — 模組 spec.md 覆蓋率檢查
 *
 * 掃 src/modules/*.ts、確認 Logan-Workspace/ 有對應 spec.md
 *
 * 命名規則（任一 match 算有 spec）：
 *   - Logan-Workspace/{module}.md
 *   - Logan-Workspace/{module}-spec.md
 *   - Logan-Workspace/{YYYY-MM-DD}-{module}-spec.md
 *   - Logan-Workspace/quality-debt/{...}{module}{...}.md
 */

import { readdirSync, statSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const MODULE_DIR = join(ROOT, 'src/modules')
const SPEC_DIR = join(ROOT, 'Logan-Workspace')

// 不檢查的「helper / 非業務」module
const HELPER_MODULES = ['_define', '_registry', 'helpers', 'README']

function listModules(): string[] {
  return readdirSync(MODULE_DIR)
    .filter(f => f.endsWith('.ts'))
    .map(f => f.replace(/\.ts$/, ''))
    .filter(name => !HELPER_MODULES.some(h => name.startsWith(h)))
}

function listSpecs(): string[] {
  const result: string[] = []
  function walk(dir: string) {
    try {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry)
        const st = statSync(p)
        if (st.isDirectory()) {
          walk(p)
        } else if (entry.endsWith('.md')) {
          result.push(p.toLowerCase())
        }
      }
    } catch {}
  }
  walk(SPEC_DIR)
  return result
}

// 模組 → spec 關鍵字 mapping（一個關鍵字 match 任一 spec 就算有）
const MODULE_KEYWORD_OVERRIDE: Record<string, string[]> = {
  hr_bonus_settlement: ['bonus-settlement', 'bonus_settlement'],
  hr_salary_settlement: ['salary-settlement', 'salary_settlement', 'hr-salary'],
  addon_data_attractions: ['addon-data-attractions', 'addon_data_attractions'],
  addon_data_hotels: ['addon-data-hotels', 'addon_data_hotels'],
  addon_data_restaurants: ['addon-data-restaurants', 'addon_data_restaurants'],
  platform_integrations: ['platform-integrations', 'platform_integrations'],
  tour_attributes: ['tour-attributes', 'tour_attributes'],
  messaging_inbox: ['messaging-inbox', 'messaging_inbox'],
  hr: ['hr-', 'employee', 'employees'],
  tours: ['tours', '旅遊', '出帳', '結團', '出納', 'disbursement'],
  orders: ['orders', '訂單'],
  finance: ['finance', '請款', '收款', '出納', 'payment', 'receipt'],
  accounting: ['accounting', '傳票', 'voucher', '會計'],
  channels: ['channels', '頻道', 'channel-system'],
  database: ['database', 'attractions', 'suppliers', 'customers'],
  customers: ['customer', '客戶'],
  shared_data_management: ['shared-data', 'shared_data', '共用資料'],
  facebook_bot: ['facebook'],
  instagram_bot: ['instagram'],
  line_bot: ['line-', 'line_'],
  ai_hub: ['ai-hub', 'ai_hub', 'ai-platform'],
}

function hasSpec(module: string, specs: string[]): boolean {
  const keywords = MODULE_KEYWORD_OVERRIDE[module] ?? [module]
  return keywords.some(kw => {
    const kwLower = kw.toLowerCase()
    return specs.some(s => s.includes(kwLower))
  })
}

function main() {
  const modules = listModules()
  const specs = listSpecs()

  const haveSpec: string[] = []
  const missingSpec: string[] = []

  for (const mod of modules) {
    if (hasSpec(mod, specs)) {
      haveSpec.push(mod)
    } else {
      missingSpec.push(mod)
    }
  }

  const ratio = (haveSpec.length / modules.length) * 100

  console.log('')
  console.log('═══ audit:spec-coverage — 模組 spec.md 覆蓋率 ═══')
  console.log('')
  console.log(`module 總數：${modules.length}`)
  console.log(`已有 spec：${haveSpec.length}`)
  console.log(`缺 spec：${missingSpec.length}`)
  console.log(`覆蓋率：${ratio.toFixed(1)}%`)
  console.log('')

  if (missingSpec.length === 0) {
    console.log('✅ 所有 module 都有對應 spec')
    return
  }

  console.log('━━ 缺 spec 的 module ━━')
  for (const mod of missingSpec) {
    console.log(`  ${mod}`)
  }
  console.log('')
  console.log('💡 補 spec 範本：Logan-Workspace/quality-debt/_spec-template.md')
}

main()
