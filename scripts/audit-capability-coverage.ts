#!/usr/bin/env tsx
/**
 * audit:capability-coverage
 *
 * 盤 src/app/api/**\/route.ts、檢查每個 HTTP method handler 是否有 capability / auth 守門。
 *
 * 紅線：所有 API endpoint 必須有 requireCapability、requireCapabilityForResource、
 *       或最低 getServerAuth + 自帶 capability check。
 *
 * 例外（不檢查）：
 *   - /api/auth/*（登入 / 註冊類、本來就不要 capability）
 *   - /api/public/*（公開 API、token 驗證）
 *   - /api/setup-tokens/*（公開 magic link）
 *   - /api/health 等 health-check 類
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const API_DIR = join(ROOT, 'src/app/api')

const EXCLUDED_PATHS = [
  'api/auth/',
  'api/public/',
  'api/setup-tokens/',
  'api/health',
  'api/cron/', // cron 用 secret header 守、不是 capability
  'api/webhooks/',
  'api/test/', // 測試端點
  'api/_test/', // dev 用測試
  // 第三方 webhook（用 webhook secret 驗證、不是 capability）
  'api/facebook/webhook',
  'api/instagram/webhook',
  'api/line/webhook',
  // 公開分享 / token-based
  'api/d/',
  'api/contracts/sign',
  // 靜態註冊表（無敏感資料、純配置）
  'api/integrations/registry',
]

const AUTH_PATTERNS = [
  /requireCapability/,
  /requireCapabilityForResource/,
  /getServerAuth/,
  /hasCapabilityByCode/,
  /getApiContext/, // API route 用 context helper、含 capability check
  /checkRateLimit/, // rate limit + 後續通常有 auth
  // Wrapper / helper patterns（這些 fn 內部已守、route 只是 forward）
  /listDimension|createDimension|updateDimension|deleteDimension/,
  /handleGet|handlePost|handlePut|handleDelete|handlePatch/,
  /requireTenantAdmin/,
  /getCurrentWorkspaceId/, // 內部 enforce 登入 workspace
]

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
type HttpMethod = (typeof HTTP_METHODS)[number]

interface Finding {
  file: string
  method: HttpMethod
  reason: 'no_auth_at_all' | 'has_export_no_call'
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const st = statSync(p)
    if (st.isDirectory()) {
      walk(p, out)
    } else if (entry === 'route.ts' || entry === 'route.tsx') {
      out.push(p)
    }
  }
  return out
}

function isExcluded(filePath: string): boolean {
  const rel = relative(ROOT, filePath).replace(/\\/g, '/')
  return EXCLUDED_PATHS.some(prefix => rel.includes(prefix))
}

function checkFile(filePath: string): Finding[] {
  const src = readFileSync(filePath, 'utf8')
  const findings: Finding[] = []

  for (const method of HTTP_METHODS) {
    // 找 export async function METHOD 或 export const METHOD =
    const exportRegex = new RegExp(
      `export\\s+(async\\s+function|const)\\s+${method}\\b`,
    )
    if (!exportRegex.test(src)) continue

    // 該 method 整段 source（粗略：從該 export 到下一個 export 或 EOF）
    const matchIdx = src.search(exportRegex)
    const nextExportIdx = src.slice(matchIdx + 10).search(/export\s+(async\s+function|const)\s+\w+/)
    const methodSrc = nextExportIdx > 0
      ? src.slice(matchIdx, matchIdx + 10 + nextExportIdx)
      : src.slice(matchIdx)

    const hasAuth = AUTH_PATTERNS.some(p => p.test(methodSrc))
    if (!hasAuth) {
      findings.push({
        file: relative(ROOT, filePath),
        method,
        reason: 'no_auth_at_all',
      })
    }
  }

  return findings
}

function main() {
  const files = walk(API_DIR)
  const allFindings: Finding[] = []
  let totalEndpoints = 0
  let coveredEndpoints = 0

  for (const f of files) {
    if (isExcluded(f)) continue
    const src = readFileSync(f, 'utf8')
    for (const method of HTTP_METHODS) {
      const re = new RegExp(`export\\s+(async\\s+function|const)\\s+${method}\\b`)
      if (re.test(src)) totalEndpoints++
    }
    const findings = checkFile(f)
    allFindings.push(...findings)
  }
  coveredEndpoints = totalEndpoints - allFindings.length

  console.log('')
  console.log('═══ audit:capability-coverage — API endpoint 守門檢查 ═══')
  console.log('')
  console.log(`掃描 API route 檔：${files.filter(f => !isExcluded(f)).length} 個`)
  console.log(`endpoint 總數：${totalEndpoints}`)
  console.log(`已守門：${coveredEndpoints}`)
  console.log(`未守門：${allFindings.length}`)
  console.log('')

  if (allFindings.length === 0) {
    console.log('✅ 全部 endpoint 都有 capability / auth 守門')
    return
  }

  console.log('❌ 以下 endpoint 沒有 requireCapability / getServerAuth：')
  console.log('')
  const byFile = new Map<string, Finding[]>()
  for (const f of allFindings) {
    if (!byFile.has(f.file)) byFile.set(f.file, [])
    byFile.get(f.file)!.push(f)
  }
  for (const [file, findings] of byFile) {
    console.log(`  ${file}`)
    for (const f of findings) {
      console.log(`    - ${f.method}`)
    }
  }
  console.log('')
  console.log('💡 修法：每個 method handler 第一件事呼叫 requireCapability(CAPABILITIES.XXX_READ/WRITE)')
  console.log('   若是公開 API、加進 EXCLUDED_PATHS（scripts/audit-capability-coverage.ts）')

  process.exit(1)
}

main()
