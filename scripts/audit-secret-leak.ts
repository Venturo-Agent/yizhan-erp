#!/usr/bin/env tsx
/**
 * audit:secret-leak — 偵測 source code 內 hardcoded secret
 *
 * 對齊鐵律 #11：API / secret 走 SSOT `~/.config/venturo/secrets.env`、
 * 不在 code 內 hardcode、不在 .env 散落。
 *
 * 抓 pattern：
 *   - sk_live_xxx / sk_test_xxx（Stripe key）
 *   - sb_secret_xxx（Supabase secret）
 *   - postgresql://user:password@host
 *   - Bearer xxx（hardcoded）
 *   - Anthropic / OpenAI key（sk-ant- / sk-）
 *   - GitHub PAT（ghp_）
 *   - JWT-shaped tokens（eyJ...）
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const SCAN_DIRS = [
  join(ROOT, 'src'),
  join(ROOT, 'scripts'),
  join(ROOT, 'supabase'),
  join(ROOT, 'tests'),
]

const EXCLUDED = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /\.test\./,
  /\.spec\./,
  /supabase\/types\.ts$/,
  /\.lock$/,
  /package-lock\.json$/,
  /dist\//,
  /build\//,
  /scripts\/audit-secret-leak\.ts$/, // 自己（含 pattern 範例字串）
]

interface SecretPattern {
  name: string
  regex: RegExp
  severity: 'critical' | 'high' | 'medium'
}

const PATTERNS: SecretPattern[] = [
  {
    name: 'Stripe live key',
    regex: /sk_live_[a-zA-Z0-9]{16,}/,
    severity: 'critical',
  },
  {
    name: 'Stripe test key',
    regex: /sk_test_[a-zA-Z0-9]{16,}/,
    severity: 'high',
  },
  {
    name: 'Supabase service role JWT',
    regex: /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{50,}\.[A-Za-z0-9_-]{20,}/,
    severity: 'critical',
  },
  {
    name: 'Anthropic key',
    regex: /sk-ant-[a-zA-Z0-9_-]{40,}/,
    severity: 'critical',
  },
  {
    name: 'OpenAI key',
    regex: /sk-(?!ant-)[a-zA-Z0-9]{40,}/,
    severity: 'critical',
  },
  {
    name: 'GitHub PAT',
    regex: /ghp_[A-Za-z0-9]{20,}/,
    severity: 'critical',
  },
  {
    name: 'PostgreSQL URL with password',
    regex: /postgres(?:ql)?:\/\/[^:]+:[^@\s]+@[^/\s]+/,
    severity: 'critical',
  },
  {
    name: 'Generic hardcoded Bearer',
    regex: /['"`]Bearer\s+[A-Za-z0-9_\-.]{20,}['"`]/,
    severity: 'high',
  },
  {
    name: 'AWS key',
    regex: /AKIA[A-Z0-9]{16}/,
    severity: 'critical',
  },
]

interface Finding {
  file: string
  line: number
  pattern: string
  severity: string
  excerpt: string
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
    try {
      st = statSync(p)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      walk(p, out)
    } else if (entry.match(/\.(ts|tsx|js|jsx|mjs|cjs|sql|sh|md|json|yaml|yml|env)$/i)) {
      out.push(p)
    }
  }
  return out
}

function checkFile(filePath: string): Finding[] {
  let src: string
  try {
    src = readFileSync(filePath, 'utf8')
  } catch {
    return []
  }
  const findings: Finding[] = []
  const lines = src.split('\n')
  lines.forEach((line, idx) => {
    // 跳過 process.env 引用、placeholder、註解內提示
    if (/process\.env\.[A-Z_]+/.test(line)) return
    if (/<.*your.*>/i.test(line)) return
    if (/example|placeholder|YOUR_/.test(line)) return

    for (const p of PATTERNS) {
      if (p.regex.test(line)) {
        findings.push({
          file: relative(ROOT, filePath),
          line: idx + 1,
          pattern: p.name,
          severity: p.severity,
          excerpt: line.trim().slice(0, 100),
        })
      }
    }
  })
  return findings
}

function main() {
  const files: string[] = []
  for (const dir of SCAN_DIRS) walk(dir, files)

  const allFindings: Finding[] = []
  for (const f of files) {
    allFindings.push(...checkFile(f))
  }

  console.log('')
  console.log('═══ audit:secret-leak — code 內 hardcoded secret 偵測 ═══')
  console.log('')
  console.log(`掃描檔：${files.length}`)
  console.log(`finding 數：${allFindings.length}`)
  console.log('')

  if (allFindings.length === 0) {
    console.log('✅ 沒有 hardcoded secret')
    return
  }

  const critical = allFindings.filter(f => f.severity === 'critical')
  const high = allFindings.filter(f => f.severity === 'high')

  console.log(`Critical：${critical.length} 處`)
  console.log(`High：${high.length} 處`)
  console.log('')

  if (critical.length > 0) {
    console.log('━━ 🚨 Critical（必修、可能 leak）━━')
    for (const f of critical.slice(0, 20)) {
      console.log(`  ${f.file}:${f.line}  [${f.pattern}]`)
      console.log(`    ${f.excerpt}`)
    }
    if (critical.length > 20) {
      console.log(`  ... 還有 ${critical.length - 20} 個`)
    }
    console.log('')
  }

  if (high.length > 0) {
    console.log('━━ ⚠ High（建議檢查）━━')
    for (const f of high.slice(0, 10)) {
      console.log(`  ${f.file}:${f.line}  [${f.pattern}]`)
    }
    if (high.length > 10) {
      console.log(`  ... 還有 ${high.length - 10} 個`)
    }
    console.log('')
  }

  console.log('💡 修法：')
  console.log('   - 移到 ~/.config/venturo/secrets.env')
  console.log('   - source secrets.env 後用 process.env.XXX')
  console.log('   - 對齊鐵律 #11（API / secret 走 SSOT）')

  if (critical.length > 0) process.exit(1)
}

main()
