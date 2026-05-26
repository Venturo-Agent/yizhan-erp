#!/usr/bin/env tsx
/**
 * codegen-seed.ts — 從 src/modules/* 衍生 seed migration SQL template
 *
 * 跑：
 *   npm run codegen:seed                    # 印到 stdout
 *   npm run codegen:seed -- --module=tours  # 只印單一 module
 *   npm run codegen:seed > supabase/migrations-pending/seed.sql
 *
 * 用途：新 module 上線、用這個產生 seed SQL 模板、給 William review 後 apply。
 *
 * 衍生規則：
 * 1. workspace_features：對所有現存 workspace、enabled=true（用 ON CONFLICT DO UPDATE 安全 idempotent）
 * 2. role_capabilities：對 module.defaultRoles 列的 role、grant 所有衍生 capability
 *    （用 ON CONFLICT DO NOTHING 安全 idempotent）
 */

import { ALL_MODULES } from '../src/modules/_registry'
import { deriveCapabilityCodes } from '../src/modules/_define'

const argv = process.argv.slice(2)
const moduleFilter = argv.find(a => a.startsWith('--module='))?.split('=')[1]

const HEADER = `-- ─────────────────────────────────────────────────────────────────────────────
-- Seed migration template — 從 src/modules/* 自動衍生
-- 生成時間：${new Date().toISOString()}
-- 跑 npm run codegen:seed 重新生成
--
-- 用法：
--   1. 複製這份 SQL 到 supabase/migrations-pending/<timestamp>_seed_<module>.sql
--   2. William review 後 apply
--   3. 全 idempotent（ON CONFLICT）、可重跑、不會破壞已 seed 資料
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;
`

const FOOTER = `
COMMIT;
`

function genWorkspaceFeaturesInsert(moduleCode: string): string {
  return `-- 開通 ${moduleCode} feature 給所有 workspace
INSERT INTO workspace_features (workspace_id, feature_code, enabled)
SELECT id, '${moduleCode}', true
FROM workspaces
WHERE deleted_at IS NULL
ON CONFLICT (workspace_id, feature_code) DO UPDATE SET enabled = true;`
}

function genRoleCapabilitiesInserts(
  moduleCode: string,
  defaultRoles: readonly string[],
  capCodes: string[]
): string {
  if (defaultRoles.length === 0 || capCodes.length === 0) {
    return `-- ${moduleCode}: 無 defaultRoles 或無 capability、跳過 role_capabilities seed`
  }

  const lines: string[] = [`-- 給 default roles grant ${moduleCode} 所有 capability`]
  for (const role of defaultRoles) {
    lines.push(`-- role: ${role}`)
    const valueRows = capCodes.map(c => `  (r.id, '${c}')`).join(',\n')
    lines.push(`INSERT INTO role_capabilities (role_id, capability_code)
SELECT r.id, cap
FROM workspace_roles r
CROSS JOIN (VALUES
${capCodes.map(c => `  ('${c}')`).join(',\n')}
) AS caps(cap)
WHERE r.code = '${role}'
ON CONFLICT (role_id, capability_code) DO NOTHING;`)
  }
  return lines.join('\n')
}

function genModuleSeed(m: (typeof ALL_MODULES)[number]): string {
  const capCodes = deriveCapabilityCodes(m)
  const defaultRoles = m.defaultRoles ?? []

  const sections = [
    `\n-- ════════════════════════════════════════════════════════════════════`,
    `-- ${m.code} (${m.name})`,
    `-- category=${m.category}, exposedToHr=${m.exposedToHr ?? true}, capabilities=${capCodes.length}, defaultRoles=${defaultRoles.length}`,
    `-- ════════════════════════════════════════════════════════════════════`,
    '',
    genWorkspaceFeaturesInsert(m.code),
    '',
    genRoleCapabilitiesInserts(m.code, defaultRoles, capCodes),
  ]

  return sections.join('\n')
}

function main() {
  const modules = moduleFilter ? ALL_MODULES.filter(m => m.code === moduleFilter) : ALL_MODULES
  if (modules.length === 0) {
    console.error(`❌ 找不到 module: ${moduleFilter}`)
    console.error(`可用 module: ${ALL_MODULES.map(m => m.code).join(', ')}`)
    process.exit(1)
  }

  console.log(HEADER)
  for (const m of modules) {
    console.log(genModuleSeed(m))
  }
  console.log(FOOTER)
}

main()
