#!/usr/bin/env node
/**
 * Codemod: 把散刻的 <label className="block text-sm font-medium text-morandi-primary mb-X"> 改成 <FormLabel>
 *
 * 處理三種 pattern：
 * 1. <label className="...">XXX <span className="text-morandi-red">*</span></label>  → <FormLabel required>XXX</FormLabel>
 * 2. <label className="...">XXX</label>                                                → <FormLabel>XXX</FormLabel>
 * 3. <label htmlFor="x" className="...">XXX</label>                                    → <FormLabel htmlFor="x">XXX</FormLabel>
 *
 * 多行 JSX 也支援。
 *
 * 跑：node scripts/codemod-form-label.mjs <file1> <file2> ...
 */

import fs from 'node:fs'
import path from 'node:path'

const TARGET_CLASS_RE = /block\s+text-sm\s+font-medium\s+text-morandi-primary\s+mb-[12]/
const FORM_LABEL_IMPORT = "import { FormLabel } from '@/components/ui/form-label'"

function processFile(filepath) {
  let src = fs.readFileSync(filepath, 'utf8')
  const original = src
  let count = 0

  // 主要 regex：抓 <label ...className="...block text-sm font-medium text-morandi-primary mb-X..."...>內容</label>
  // dotAll flag 'g' + multiline 'm'、用 ([\s\S]*?) 匹配跨行
  // 注意：要排除已經是 <label htmlFor=... className=...> 多屬性的場景但仍處理它
  const labelRe = /<label\s+([^>]*?)className=("|')([^"']*?block\s+text-sm\s+font-medium\s+text-morandi-primary\s+mb-[12][^"']*?)\2([^>]*?)>([\s\S]*?)<\/label>/g

  src = src.replace(labelRe, (full, before, q1, klass, after, inner) => {
    // 萃取 htmlFor=... 屬性（如有）
    const propsRaw = (before + ' ' + after).trim()
    const htmlForMatch = propsRaw.match(/htmlFor=("|')([^"']+)\1/)
    const htmlForAttr = htmlForMatch ? ` htmlFor="${htmlForMatch[2]}"` : ''

    // 萃取 onClick / id / 其他屬性 — 為了保守只處理「除 className/htmlFor 外沒其他屬性」的情況
    const otherAttrs = propsRaw
      .replace(/htmlFor=("|')[^"']+\1/, '')
      .replace(/\s+/g, '')
    if (otherAttrs.length > 0) {
      // 有其他屬性、不動、跳過
      return full
    }

    // 判斷是否 required：inner **結尾**剛好是 <span className="text-morandi-red">*</span>
    // 嚴格匹配尾端、避免吃到 ternary 中間的紅星
    const trailingRequiredRe = /\s*<span\s+className=("|')[^"']*text-morandi-red[^"']*\1\s*>\s*\*\s*<\/span>\s*$/
    let isRequired = false
    let cleanInner = inner
    if (trailingRequiredRe.test(inner)) {
      isRequired = true
      cleanInner = inner.replace(trailingRequiredRe, '')
    } else if (/<span\s+className=("|')[^"']*text-morandi-red[^"']*\1\s*>\s*\*\s*<\/span>/.test(inner)) {
      // inner 中間有紅星但不在尾端 → 跳過、不動
      return full
    }

    // trim 前後空白（不破壞中間結構）
    cleanInner = cleanInner.trim()

    count++
    const requiredAttr = isRequired ? ' required' : ''
    return `<FormLabel${requiredAttr}${htmlForAttr}>${cleanInner}</FormLabel>`
  })

  if (count === 0) {
    return { filepath, count: 0 }
  }

  // 如果還沒 import FormLabel、補上
  if (!src.includes("from '@/components/ui/form-label'")) {
    // 插入在第一個 import 之後
    const importInsertRe = /^(import\s+[\s\S]+?from\s+['"][^'"]+['"];?\s*\n)/m
    if (importInsertRe.test(src)) {
      src = src.replace(importInsertRe, (m) => m + FORM_LABEL_IMPORT + '\n')
    } else {
      src = FORM_LABEL_IMPORT + '\n' + src
    }
  }

  if (src !== original) {
    fs.writeFileSync(filepath, src, 'utf8')
  }

  return { filepath, count }
}

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Usage: node scripts/codemod-form-label.mjs <file1> <file2> ...')
  process.exit(1)
}

let total = 0
for (const f of files) {
  const abs = path.resolve(f)
  if (!fs.existsSync(abs)) {
    console.error(`SKIP (not found): ${f}`)
    continue
  }
  const { count } = processFile(abs)
  if (count > 0) {
    console.log(`  ${count} replacements in ${f}`)
  }
  total += count
}
console.log(`\nTotal: ${total} replacements`)
