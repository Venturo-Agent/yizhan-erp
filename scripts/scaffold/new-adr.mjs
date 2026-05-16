#!/usr/bin/env node
/**
 * scripts/scaffold/new-adr.mjs
 *
 * 新 ADR scaffolder — 自動編號 + kebab-case 標題 + 套既有 ADR 模板。
 *
 * 用法：
 *   node scripts/scaffold/new-adr.mjs "標題"               # dry-run（預設）
 *   node scripts/scaffold/new-adr.mjs "標題" --apply       # 真的建檔
 *   npm run scaffold:adr -- "標題"
 *   npm run scaffold:adr -- "標題" --apply
 *
 * 例：
 *   node scripts/scaffold/new-adr.mjs "API rate limiting strategy"
 *   → 產出 docs/adr/0006-api-rate-limiting-strategy.md
 *
 * 規則：
 *   - 編號 = 既有最高號 +1（從檔名 NNNN- 取）
 *   - 標題轉 kebab-case（保留中英文、空白 / 特殊字元 → -）
 *   - 套 0001-0005 既有模板（Status / Context / Decision / Consequences / Alternatives Considered / 待 William 拍板）
 *   - ADR 不過期、依 META-RULES 例外條款不加 frontmatter（ADR 是歷史決策紀錄）
 *   - 預設 dry-run、不污染 repo
 *   - 不覆蓋既有檔案（檢查衝突直接 abort）
 *
 * 紅線：
 *   - 不動 docs/adr/README.md（手動加 index）
 *   - 不 commit
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const ADR_DIR = path.join(PROJECT_ROOT, 'docs', 'adr');

// ---------- CLI ----------
const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const titleRaw = argv.filter((a) => !a.startsWith('--')).join(' ').trim();

if (!titleRaw) {
  console.error('Usage: node scripts/scaffold/new-adr.mjs "標題" [--apply]');
  console.error('  例: node scripts/scaffold/new-adr.mjs "API rate limiting strategy"');
  process.exit(1);
}

if (!fs.existsSync(ADR_DIR)) {
  console.error(`錯誤: ADR 目錄不存在: ${ADR_DIR}`);
  process.exit(1);
}

// ---------- 編號 + slug ----------
function getNextAdrNumber() {
  const entries = fs.readdirSync(ADR_DIR);
  let max = 0;
  for (const name of entries) {
    const m = name.match(/^(\d{4})-/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return String(max + 1).padStart(4, '0');
}

function toKebabCase(title) {
  return title
    .toLowerCase()
    .replace(/[\s_/\\]+/g, '-')
    .replace(/[^a-z0-9一-鿿-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const number = getNextAdrNumber();
const slug = toKebabCase(titleRaw);

if (!slug) {
  console.error(`錯誤: 標題 "${titleRaw}" 轉 kebab 後是空字串、請改個標題。`);
  process.exit(1);
}

const fileName = `${number}-${slug}.md`;
const filePath = path.join(ADR_DIR, fileName);
const today = new Date().toISOString().slice(0, 10);

// ---------- Template ----------
const template = `# ADR-${number}: ${titleRaw}

## Status
**Proposed**（等 William 拍板）

> 草擬日期：${today}

## Context

> 為什麼要做這個決定？問題是什麼？約束是什麼？
> - 現狀盤點（具體數字、不要抽象）
> - 痛點（具體事件、不要假設）
> - 約束（技術 / 業務 / 法規）

TODO: 補 context。

## Decision

> 我們決定怎麼做。具體、可驗證。
> - 直接寫「做什麼」、不寫「為什麼」（為什麼放 Context）
> - 有 code 用 code、有 schema 用 schema、不要散文

TODO: 補 decision。

## Consequences

> 這個決定讓什麼變容易、什麼變難？trade-off 名出來。

TODO: 補 consequences。

✅ **變容易**：
- TODO

⚠️ **變難**：
- TODO

## Alternatives Considered

> 我們考慮過哪些選項、為什麼沒選？每個選項列拒絕理由。

**A. TODO**
- ❌ 拒：TODO

**B. TODO**
- ❌ 拒：TODO

**C. 不動、保持現狀**
- ❌ 拒：TODO

## 待 William 拍板

- [ ] TODO: 拍板問題 1
- [ ] TODO: 拍板問題 2
- [ ] TODO: 拍板問題 3
`;

// ---------- Output ----------
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

console.log('');
console.log(cyan('━━━ Venturo ADR scaffolder ━━━'));
console.log(`  title     : ${green(titleRaw)}`);
console.log(`  number    : ${green(number)}`);
console.log(`  slug      : ${slug}`);
console.log(`  file      : ${path.relative(PROJECT_ROOT, filePath)}`);
console.log(`  mode      : ${apply ? red('--apply (write to disk)') : yellow('dry-run (no files written)')}`);
console.log('');

const exists = fs.existsSync(filePath);
console.log(cyan('Plan:'));
if (exists) {
  console.log(`  ${red('✗')} ${path.relative(PROJECT_ROOT, filePath)}  ${dim('(已存在、apply 會 abort)')}`);
} else {
  console.log(`  ${green('+')} ${path.relative(PROJECT_ROOT, filePath)}  ${dim(`(${template.split('\n').length} 行)`)}`);
}
console.log('');

if (apply) {
  if (exists) {
    console.log(red(`Abort: ${fileName} 已存在、不覆蓋。`));
    process.exit(2);
  }
  fs.writeFileSync(filePath, template, 'utf8');
  console.log(green(`✓ 已建 ${path.relative(PROJECT_ROOT, filePath)}`));
} else {
  console.log(dim('（dry-run、沒寫檔。加 --apply 真的建檔。）'));
}

// ---------- Next steps ----------
console.log('');
console.log(cyan('下一步（手動處理、scaffolder 不碰）：'));
console.log('');
console.log(`  ${yellow('1.')} ${cyan('Review 內容')}：`);
console.log(`       ${dim('-')} 補 Context（具體數字、痛點事件、約束）`);
console.log(`       ${dim('-')} 補 Decision（具體可驗證、有 code 用 code）`);
console.log(`       ${dim('-')} 補 Consequences（trade-off 名出來、不只列好處）`);
console.log(`       ${dim('-')} 補 Alternatives（至少 2 個替代方案 + 拒絕理由）`);
console.log('');
console.log(`  ${yellow('2.')} ${cyan('加進 ADR index')}：`);
console.log(`       ${dim('-')} 編輯 ${cyan('docs/adr/README.md')} 的「現有 ADR」表格`);
console.log(`       ${dim('-')} 加一行：| ${number} | [${titleRaw}](${fileName}) | Proposed | TODO: 對應 backlog |`);
console.log('');
console.log(`  ${yellow('3.')} ${cyan('寫待 William 拍板問題清單')}：`);
console.log(`       ${dim('-')} 列 3-5 個具體問題（不要抽象、要有選項）`);
console.log(`       ${dim('-')} 每個問題附「我傾向 X、因為 Y」、不要丟空白題給 William`);
console.log(`       ${dim('-')} 拍板後改 Status: Accepted、移除「待拍板」section`);
console.log('');
console.log(`  ${yellow('4.')} ${cyan('關聯')}：`);
console.log(`       ${dim('-')} 如果對應 refactor-backlog、在 README 表格補連結`);
console.log(`       ${dim('-')} 如果取代既有 ADR、原 ADR 改 Status: Superseded by ADR-${number}`);
console.log('');
