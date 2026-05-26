#!/usr/bin/env tsx
/**
 * audit:stale-refs
 *
 * 掃描 .next/dev/types/validator.ts（如果存在）中的 stale import 引用。
 * validator.ts 是 Next.js dev server 自動生成的類型驗證器，
 * 當 source file 被刪除或搬遷時它不會自動更新，導致假的 module not found。
 *
 * 這次踩坑：OPENCLAW 看 validator.ts 引用 /cis/ page 就以為 page 存在，
 * 實際 page 早已被砍、只剩 .next cache 殘留。
 *
 * 用法：npm run audit:stale-refs
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const VALIDATOR_PATH = path.join(ROOT, '.next/dev/types/validator.ts')

interface StaleRef {
  importedPath: string // 相對引用路徑 like '../../../src/app/(main)/cis/page.js'
  absolutePath: string // 轉換後的絕對路徑
  line: number
}

function resolveValidatorImport(base: string, rel: string): string | null {
  // 移除前面的 ../../
  const depth = (rel.match(/\.\.\//g) || []).length
  const file = rel
    .replace(/^\.\.\//, '')
    .replace(/\.js$/, '.tsx')
    .replace(/\.ts$/, '.tsx')

  // 從 base 目錄往上 depth 層、再找 src/...
  const baseDir = path.dirname(base)
  let abs = baseDir
  for (let i = 0; i < depth; i++) {
    abs = path.dirname(abs)
  }
  abs = path.join(abs, 'src', file.replace(/^\.\.\/\.\.\/src\//, ''))
  return abs
}

function audit(): { staleRefs: StaleRef[]; validatorExists: boolean } {
  if (!fs.existsSync(VALIDATOR_PATH)) {
    console.log('✅ .next/dev/types/validator.ts 不存在（從未被建立或已清空）- 無 stale ref 問題')
    return { staleRefs: [], validatorExists: false }
  }

  const content = fs.readFileSync(VALIDATOR_PATH, 'utf8')
  const lines = content.split('\n')
  const staleRefs: StaleRef[] = []

  // 匹配格式：import ... from '../../../src/...'（單引號或雙引號）
  const importRe = /import\s+\*\s+as\s+\w+\s+from\s+['"]([^'"]+)['"]/g

  let match: RegExpExecArray | null
  while ((match = importRe.exec(content)) !== null) {
    const importedPath = match[1]
    if (!importedPath.includes('/src/') && !importedPath.includes('/app/')) continue

    // 找行號
    const line = lines.slice(0, match.index).join('\n').split('\n').length

    const absolutePath = resolveValidatorImport(VALIDATOR_PATH, importedPath)
    if (!absolutePath) continue

    if (!fs.existsSync(absolutePath)) {
      staleRefs.push({ importedPath, absolutePath, line })
    }
  }

  return { staleRefs, validatorExists: true }
}

function main() {
  const { staleRefs, validatorExists } = audit()

  console.log('')
  console.log('🔍 audit:stale-refs — stale import checker')
  console.log('==========================================')

  if (!validatorExists) {
    console.log('✅ validator.ts 不存在，無 stale ref 問題')
    process.exit(0)
  }

  if (staleRefs.length === 0) {
    console.log('✅ 所有 validator.ts 引用都指向存在的檔案')
    process.exit(0)
  }

  console.log(`⚠️  發現 ${staleRefs.length} 個 stale reference：`)
  console.log('')
  for (const ref of staleRefs) {
    console.log(`  line ${ref.line}:`)
    console.log(`    import from: ${ref.importedPath}`)
    console.log(`    → 檔案不存在: ${ref.absolutePath}`)
    console.log('')
    console.log(`    建議：rm -rf .next/dev/types`)
    console.log('')
  }

  console.log('==========================================')
  console.log('💡 這些是 .next/dev/types/validator.ts 的殘留引用，')
  console.log('   source 檔已不存在但 validator cache 沒更新。')
  console.log('   執行 npm run dev 或 rm -rf .next/dev/types 可清除。')
  console.log('')

  process.exit(1)
}

main()
