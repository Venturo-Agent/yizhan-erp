/**
 * Capability Sync Script
 *
 * 從 src/lib/permissions/module-tabs.ts 的 MODULES 註冊讀取、
 * 自動同步 DB 端的：
 *   1. role_capabilities — 平台主管 / workspace admin role 自動掛全套
 *   2. workspace_features — 每個租戶 + 每個 module/tab 的開通狀態
 *
 * 不做：
 *   - RLS policy 變更（用獨立 migration 跑、避免一個 script 太大）
 *   - 自動刪 capability code（保留歷史、人工 review）
 *
 * 跑法：
 *   npx tsx scripts/sync-capabilities.ts
 *
 * 設計：
 *   MODULES 是 SSOT、改 MODULES + 跑 sync = 自動連動。
 *   守門腳本（check-standards.sh）會檢查「MODULES 改了但沒 sync」。
 */

import { createClient } from '@supabase/supabase-js'
import { MODULES } from '../src/lib/permissions/module-tabs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ 缺 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

/**
 * 從 MODULES 計算所有 capability codes。
 * 每個 module 至少有 .read / .write、tab 同樣分 read / write。
 * Eligibility tab（isEligibility=true）只有 .write（勾寫入）。
 */
function computeAllCapabilityCodes(): Set<string> {
  const codes = new Set<string>()

  for (const m of MODULES) {
    // module 級 read / write
    codes.add(`${m.code}.read`)
    codes.add(`${m.code}.write`)

    for (const tab of m.tabs) {
      if (tab.isEligibility) {
        // 下拉資格 tab：只有 .write（勾寫入 = 出現在下拉）
        codes.add(`${m.code}.${tab.code}.write`)
      } else {
        codes.add(`${m.code}.${tab.code}.read`)
        codes.add(`${m.code}.${tab.code}.write`)
      }
    }
  }

  // 平台級 capability（不在 MODULES、手動列、跟 N-M02 對齊）
  codes.add('platform.is_admin')
  codes.add('platform.tenants.read')
  codes.add('platform.tenants.write')

  return codes
}

async function syncRoleCapabilities(allCodes: Set<string>) {
  console.log('=== Sync role_capabilities ===')

  // 找所有 admin role（is_admin=true）
  const { data: adminRoles, error } = await supabase
    .from('workspace_roles')
    .select('id, name, workspace_id, workspaces:workspace_id(code)')
    .eq('is_admin', true)

  if (error || !adminRoles) {
    console.error('❌ 讀取 admin roles 失敗:', error)
    return
  }

  let inserted = 0
  let skipped = 0

  for (const role of adminRoles) {
    const workspaceCode = (role.workspaces as { code: string } | null)?.code || 'UNKNOWN'

    // VENTURO（平台）只掛 platform.* capability
    // 其他租戶 admin 掛全部「業務」capability（不含 platform.*）
    const targetCodes =
      workspaceCode === 'VENTURO'
        ? Array.from(allCodes).filter(c => c.startsWith('platform.'))
        : Array.from(allCodes).filter(c => !c.startsWith('platform.'))

    // 查現有的 capability、避免重複 INSERT
    const { data: existing } = await supabase
      .from('role_capabilities')
      .select('capability_code')
      .eq('role_id', role.id)

    const existingSet = new Set((existing || []).map(r => r.capability_code))

    const toInsert = targetCodes
      .filter(c => !existingSet.has(c))
      .map(c => ({ role_id: role.id, capability_code: c, enabled: true }))

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from('role_capabilities').insert(toInsert)
      if (insErr) {
        console.error(`❌ INSERT 進 ${workspaceCode}/${role.name} 失敗:`, insErr)
        continue
      }
      inserted += toInsert.length
      console.log(`  ✅ ${workspaceCode}/${role.name}: 新增 ${toInsert.length} 個`)
    } else {
      skipped++
      console.log(`  ⏭ ${workspaceCode}/${role.name}: 已齊全、跳過`)
    }
  }

  console.log(`📊 role_capabilities: 新增 ${inserted} 筆、跳過 ${skipped} 個 role`)
}

async function syncWorkspaceFeatures() {
  console.log('=== Sync workspace_features ===')

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, code, type')
    .neq('code', 'VENTURO') // VENTURO 平台不需要 workspace_features

  if (!workspaces) return

  // 計算所有 feature codes（從 MODULES）
  // 格式：'{module}' (module 級開關) 或 '{module}.{tab}' (tab 級開關)
  const featureCodes = new Set<string>()
  for (const m of MODULES) {
    featureCodes.add(m.code)
    for (const tab of m.tabs) {
      if (!tab.isEligibility) {
        featureCodes.add(`${m.code}.${tab.code}`)
      }
    }
  }

  let inserted = 0

  for (const ws of workspaces) {
    const { data: existing } = await supabase
      .from('workspace_features')
      .select('feature_code')
      .eq('workspace_id', ws.id)

    const existingSet = new Set((existing || []).map(r => r.feature_code))

    const toInsert = Array.from(featureCodes)
      .filter(c => !existingSet.has(c))
      .map(c => {
        // premium tab 預設關、basic 預設開
        const tabDef = MODULES.flatMap(m =>
          m.tabs.map(t => ({ code: `${m.code}.${t.code}`, category: t.category }))
        ).find(t => t.code === c)
        const enabled = tabDef?.category === 'premium' ? false : true
        return { workspace_id: ws.id, feature_code: c, enabled }
      })

    if (toInsert.length > 0) {
      const { error } = await supabase.from('workspace_features').insert(toInsert)
      if (error) {
        console.error(`❌ INSERT 進 ${ws.code} 失敗:`, error)
        continue
      }
      inserted += toInsert.length
      console.log(`  ✅ ${ws.code}: 新增 ${toInsert.length} 個 feature`)
    }
  }

  console.log(`📊 workspace_features: 新增 ${inserted} 筆`)
}

async function main() {
  console.log('🔄 Capability Sync 開始\n')

  const allCodes = computeAllCapabilityCodes()
  console.log(`從 MODULES 計算出 ${allCodes.size} 個 capability codes\n`)

  await syncRoleCapabilities(allCodes)
  console.log('')
  await syncWorkspaceFeatures()
  console.log('\n✅ Sync 完成')
}

main().catch(err => {
  console.error('❌ Sync 失敗:', err)
  process.exit(1)
})
