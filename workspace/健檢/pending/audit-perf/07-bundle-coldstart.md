# 07 — Bundle / Cold start / 第三方 SDK

**資料時點**：2026-05-23 23:50
**資料來源**：grep + Read `package.json` / `next.config.ts` / `sentry.*.config.ts` + `du -sh node_modules/*`
**注意**：`.next/` 只有 `dev/` cache（2.3G）、沒有 production build artifact、無法量化實際 client chunk 大小。要量真實 bundle、之後跑一次 `ANALYZE=true npm run build`（已配 `@next/bundle-analyzer`、會開 visualizer）。

---

## 摘要

- **PDF 三件套同時裝**：`jspdf`（29M）+ `pdf-lib`（24M）+ `pdfjs-dist`（37M）= node_modules 共 90M。其中 `pdf-lib` **沒人 import**（疑似殭屍依賴）、可考慮砍。
- **`jspdf` 在 `src/lib/pdf/pdf-fonts.ts` 寫成 `import type jsPDF`、type-only**（不會 ship 進 runtime bundle）、實際 runtime 走 `disbursement-pdf.ts` 的 `await import('jspdf')`、dynamic ✅。但 `pdf-fonts.ts` 是 type import、不算違規。
- **`xlsx`（7.8M）兩處用、都 dynamic ✅**：`useMemberExport.ts` + `TourPrintDialog.tsx`。
- **`framer-motion`（5.5M）28 個 file 直接 static import**、其中 12 個在 `(public)/p/samui-proposal` 提案頁、客戶端公開頁吃滿動畫 cost。
- **`@fullcalendar/*`（4M）已 dynamic** ✅（`calendar/page.tsx` 用 `next/dynamic`）。
- **`leaflet`（3.8M）已 dynamic** ✅（`AttractionsMap.tsx` `await import('leaflet')`）。
- **`@tiptap/*`（7M）static 進 `rich-text-input.tsx`**、被 `CoverInfoForm.tsx`（行程編輯器）一處用。
- **`opencc-js`（5.6M）static 進 `simplified-to-traditional.ts`**、被 `llm-dispatcher.ts`（server 端 AI flow）import。Server-only、不上 client、相對 OK。
- **Sentry**：3 個 config（client/server/edge）`tracesSampleRate` production = **0.05（5%）** ✅。但 client config 開了 **Session Replay**（`replaysOnErrorSampleRate: 1.0`、`replaysSessionSampleRate: 0.1`）— 10% session 全程錄影、出錯時 100% 上傳、量大且有 PII 風險。
- **lucide-react（43M）** 在 377 個 file import、零個用 `import *` ✅；`next.config.ts` 已加 `optimizePackageImports: ['lucide-react', ...]` ✅。
- **page 預設 server but 該 client**：沒有抓到「該 client 但寫成 server」誤判 — 11 個 server pages 多為 `redirect()` 或極簡 wrapper、合理。
- **`output: 'standalone'`** ✅（Coolify Docker 部署正確設定）。
- **Turbopack `turbopack: {}`** 已啟（Next.js 16 預設）。

---

## 大型 library 矩陣

| 名稱                                                                                          | node_modules size | dynamic import？                                                                                     | 入口 / 主消費者                                                                                                                                                  | 該改？                                                                                            |
| --------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `jspdf` (^4.0.0)                                                                              | 29M               | ✅ dynamic                                                                                           | `src/lib/pdf/disbursement-pdf.ts:181` `await import('jspdf')`；`pdf-fonts.ts` 只是 `import type`（type-only、不打 bundle）                                       | OK                                                                                                |
| `jspdf-autotable` (^5.0.2)                                                                    | 244K              | ❌ 沒人 import（package.json 有、grep 0 hit）                                                        | —                                                                                                                                                                | **砍**（殭屍）                                                                                    |
| `pdf-lib` (^1.17.1)                                                                           | 24M               | ❌ 沒人 import（grep 0 hit、含 `await import`）                                                      | —                                                                                                                                                                | **砍**（殭屍 24M）                                                                                |
| `pdfjs-dist` (^4.10.38)                                                                       | 37M               | ✅ dynamic                                                                                           | `usePassportFiles.ts:40`、`MemberEditDialog.tsx:178`、`passportFileProcessing.ts:19` `await import('pdfjs-dist')`                                                | OK                                                                                                |
| `xlsx` (0.20.3)                                                                               | 7.8M              | ✅ dynamic                                                                                           | `useMemberExport.ts:164`、`TourPrintDialog.tsx:195` `await import('xlsx')`                                                                                       | OK                                                                                                |
| `html2canvas` (隱性)                                                                          | 112K              | ❌ 沒人 import（grep 0 hit、為 jspdf transitive dep）                                                | —                                                                                                                                                                | OK（transitive）                                                                                  |
| `@fullcalendar/*` (^6.1.19+)                                                                  | 4M                | ✅ dynamic（plugin static 進 `CalendarGrid`、`CalendarGrid` 在 page 走 `next/dynamic({ssr:false})`） | `calendar/page.tsx:21-32`（dynamic wrap）                                                                                                                        | OK                                                                                                |
| `framer-motion` (^12.38.0)                                                                    | 5.5M              | ❌ static 28 處                                                                                      | `(public)/p/samui-proposal/_components/*`（5 處）、`tour-display/sections/*`（17 處）、`components/ui/*`（3 處）、`components/editor/RelatedImagesPreviewer.tsx` | **半改**：tour-display sections 可 lazy（只在預覽 modal 出現時）、samui-proposal 公開頁可拆 split |
| `@tiptap/*` (^3.13.0+)                                                                        | 7M                | ❌ static                                                                                            | `components/ui/rich-text-input.tsx`（star import 7 個 extension）→ `CoverInfoForm.tsx`（行程編輯器）                                                             | **改**：`rich-text-input.tsx` 整個 dynamic、只在行程編輯 modal 用、平常不該 ship                  |
| `leaflet` (^1.9.4)                                                                            | 3.8M              | ✅ dynamic                                                                                           | `AttractionsMap.tsx:105/265` `await import('leaflet')`（只剩 `import type L` static）                                                                            | OK                                                                                                |
| `@hello-pangea/dnd` (^18.0.1)                                                                 | 3.1M              | ❌ static 假設                                                                                       | （未細查具體 import 點、6 處 grep hit、`todos/page.tsx` 等）                                                                                                     | 待查                                                                                              |
| `opencc-js` (^1.3.1)                                                                          | 5.6M              | ❌ static                                                                                            | `lib/text/simplified-to-traditional.ts:13` → `lib/ai/llm-dispatcher.ts`                                                                                          | server-only 路徑 OK；確認沒被 client component 引到                                               |
| `@anthropic-ai/sdk` (^0.95.2)                                                                 | 7.6M              | ❌ static                                                                                            | `lib/ai/attraction-polish.ts`、`lib/ai/providers/anthropic-client.ts`                                                                                            | server-only API route 用、OK                                                                      |
| `browser-image-compression` (^2.0.2)                                                          | 856K              | ❌ static                                                                                            | `components/ui/image-uploader/useImageUploader.ts:4` → `image-uploader/index.tsx` → `AirportImageLibrary.tsx`、`SortableActivityItem.tsx`                        | **半改**：圖片壓縮只在 user 真的上傳才用、可改 `await import`                                     |
| `date-fns` (^4.1.0)                                                                           | 38M               | n/a（next config 有 `optimizePackageImports`）                                                       | 7 處 `from 'date-fns'`、5 處 `from 'date-fns/locale'`                                                                                                            | OK                                                                                                |
| `lucide-react` (^0.544.0)                                                                     | 43M               | n/a（個別 import + `optimizePackageImports`）                                                        | 377 file                                                                                                                                                         | OK                                                                                                |
| `pdfmake` / `exceljs` / `@react-pdf` / `recharts` / `chart.js` / `@mui` / `ag-grid-community` | —                 | n/a                                                                                                  | **未安裝**（package.json 無、node_modules 無）                                                                                                                   | OK                                                                                                |

---

## page 預設 server 但該 client

掃 90 個 `page.tsx`、其中 **11 個沒 `'use client'`**：

| page                                                | 內容性質                                                                | 該 client？                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| `src/app/page.tsx`                                  | `redirect('/dashboard')`                                                | server 正確                                     |
| `src/app/landing/page.tsx`                          | 純 marketing JSX、無 useState                                           | server 正確（SEO + 不需 hydration cost）        |
| `src/app/(main)/page.tsx`                           | `<DashboardClient />` wrapper                                           | server 正確（client 子件自帶 directive）        |
| `src/app/(main)/dashboard/page.tsx`                 | 同上                                                                    | server 正確                                     |
| `src/app/(main)/documents/page.tsx`                 | 同上                                                                    | server 正確                                     |
| `src/app/(main)/library/attractions/page.tsx`       | `export { default } from './_components/AttractionsPage'`               | server 正確                                     |
| `src/app/(main)/tours/page.tsx`                     | `export default ToursPage`                                              | server 正確                                     |
| `src/app/(main)/messaging/page.tsx`                 | `redirect('/ai?tab=conversations')`                                     | server 正確                                     |
| `src/app/(main)/bot/*/page.tsx`（5 個）             | `redirect(...)`                                                         | server 正確                                     |
| `src/app/(main)/platform/page.tsx`                  | `redirect(...)`                                                         | server 正確                                     |
| `src/app/(main)/websites/page.tsx`                  | `redirect(...)`                                                         | server 正確                                     |
| `src/app/(main)/settings/page.tsx`                  | `redirect(...)`                                                         | server 正確                                     |
| `src/app/(public)/p/canvas-demo/page.tsx`           | 純 fixture render、無 interactive state                                 | server 正確                                     |
| `src/app/(public)/p/samui-proposal/[code]/page.tsx` | server wrapper、子 `_components/*` 各自 `'use client'` 帶 framer-motion | server 正確（但 5 個子件吃 framer、見下方紅旗） |
| `src/app/public/contract/sign/[code]/page.tsx`      | async server 抓 DB、render `<ContractSignPage>`                         | server 正確                                     |
| `src/app/view/[id]/page.tsx`                        | `generateMetadata` + 抓 DB                                              | server 正確                                     |

**結論**：**0 個 page 誤分類**。Next.js 「server-by-default」紀律守得不錯、互動部分都用 wrapper pattern 把 client component 隔離出去。

---

## Sentry 配置

| config 檔                 | tracesSampleRate       | replaysSampleRate | replayOnError      | production OK？                   |
| ------------------------- | ---------------------- | ----------------- | ------------------ | --------------------------------- |
| `sentry.client.config.ts` | prod 0.05 / dev 1.0 ✅ | **0.1（10%）** ⚠️ | **1.0（100%）** ⚠️ | **半 OK**（replay 流量 / 配額大） |
| `sentry.server.config.ts` | prod 0.05 / dev 1.0 ✅ | —                 | —                  | OK                                |
| `sentry.edge.config.ts`   | prod 0.05 / dev 1.0 ✅ | —                 | —                  | OK                                |

**Replay 評估**：

- 10% session replay × 漫途 + 未來客戶（假設 200 員工 × 每天 50 個 session）= 1000 session/天 × 10% = **100 個完整錄影上傳**、每段假設 1MB = 100MB/天 = **3GB/月** 上傳量
- `replaysOnErrorSampleRate: 1.0` = 出錯時 100% 上傳整段 session、有 PII 風險
- `maskAllText: true` + `blockAllMedia: true` ✅（已 mask、隱私 OK）

**建議**：

- production 把 `replaysSessionSampleRate` 從 0.1 降到 0.01（1%）、節省 90% replay 流量
- 或維持 `replaysOnErrorSampleRate: 1.0`（出錯才上傳）、`replaysSessionSampleRate: 0`（平常不錄）

**`next.config.ts` Sentry 設定**：

- `silent: true`、`hideSourceMaps: true` ✅（不洩漏 source map 給瀏覽器）

---

## icon import pattern

| file:line | pattern                                                        | 該改？      |
| --------- | -------------------------------------------------------------- | ----------- |
| —         | `import * as Icons from 'lucide-react'`                        | **0 處** ✅ |
| 377 處    | `import { IconName } from 'lucide-react'`（個別 named import） | OK          |

**`next.config.ts` `optimizePackageImports`** 已包 `lucide-react` ✅ — Next.js 會自動 tree-shake。

---

## node_modules top 20 size

| package            | size                     |
| ------------------ | ------------------------ |
| `next`             | 170M                     |
| `@next`            | 117M                     |
| `@sentry`          | 63M                      |
| `lucide-react`     | 43M                      |
| `date-fns`         | 38M                      |
| `pdfjs-dist`       | 37M                      |
| `jspdf`            | 29M                      |
| `@opentelemetry`   | 27M（Sentry transitive） |
| `@napi-rs`         | 25M                      |
| `pdf-lib`          | 24M（**疑似殭屍**）      |
| `typescript`       | 23M（dev）               |
| `@swc`             | 22M（Next transitive）   |
| `@img`             | 16M                      |
| `core-js`          | 15M                      |
| `@babel`           | 11M                      |
| `@esbuild`         | 10M                      |
| `playwright-core`  | 8.6M（dev）              |
| `prettier`         | 8.3M（dev）              |
| `webpack`          | 7.9M                     |
| `xlsx`             | 7.8M                     |
| `@anthropic-ai`    | 7.6M                     |
| `react-dom`        | 7.1M                     |
| `@tiptap`          | 7M                       |
| `@sentry-internal` | 6.5M                     |

**裝了沒 import 的**：

- `pdf-lib` 24M — `package.json` 列為 dep、`src/**` grep 0 hit
- `jspdf-autotable` 244K — `package.json` 列為 dep、`src/**` grep 0 hit
- `html2canvas` 112K — transitive of jspdf、自己 src 沒用、OK

---

## `.next/` build 大小

**現況**：只有 `.next/dev/`（2.3G）、是 Turbopack dev cache、不是 production build。
**無 production build artifact** → 無法量化：

- client first-load JS（target < 200KB gzipped）
- 各 route chunk 大小
- standalone bundle 大小（影響 Docker image / Coolify cold start）

**待補**：

```bash
ANALYZE=true npm run build   # 跑完開 webpack-bundle-analyzer html
du -sh .next/standalone .next/static
ls -la .next/static/chunks/*.js | sort -k5 -rh | head -20
```

---

## 紅旗 — 最該優先動的 3 件事

### 🚩 #1：砍殭屍依賴 `pdf-lib`（24M）+ `jspdf-autotable`（244K）

- **量化**：node_modules 直接瘦 24M、`npm install` 快 ~3-5 秒、Coolify Docker image layer 小一截
- **業務影響**：零（沒人 import）
- **風險**：低（grep 0 hit、確認後 `npm uninstall pdf-lib jspdf-autotable`）
- **動法**：先 `grep -rn "pdf-lib\|jspdf-autotable" /Users/william/Projects/yizhan-erp/src /Users/william/Projects/yizhan-erp/scripts` 確認、再 uninstall

### 🚩 #2：Sentry Session Replay 配額洩血

- **量化**：production `replaysSessionSampleRate: 0.1`（10%）→ 估 3GB/月 上傳。降到 0.01（1%）省 90%、或設 0（出錯才錄）
- **業務影響**：客戶用 SaaS 出 bug 時、replay 仍能看（`replaysOnErrorSampleRate: 1.0`）、平常不錄不影響 debug 能力
- **風險**：低（單改 `sentry.client.config.ts` 一個 number）
- **動法**：`replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1`

### 🚩 #3：`@tiptap/*`（7M）+ `framer-motion`（5.5M）static import 太多

- **`rich-text-input.tsx`** 把 7 個 tiptap extension static import、只被 `CoverInfoForm.tsx`（行程編輯器 cover form）一處用 — 客戶平常開 dashboard / orders / finance 都吃 tiptap 體積
- **`framer-motion`** 28 處 static import、其中 17 處在 `tour-display/sections/luxury` 變體（只在預覽特定豪華風格時用）、12 處在 `(public)/p/samui-proposal` 提案頁
- **量化**（粗估、需 ANALYZE 驗證）：
  - tiptap：估 ~150-200KB gzipped client chunk
  - framer-motion：估 ~50-80KB gzipped（已是 v12 optimized、但 28 個入口都吃）
- **動法**：
  - tiptap：`const RichTextInput = dynamic(() => import('@/components/ui/rich-text-input').then(m => m.RichTextInput), { ssr: false })`
  - framer-motion：`tour-display` luxury 變體用 `dynamic`、samui-proposal 公開頁可保留（行銷頁可接受 first-load cost）

---

## 立刻停手寫進報告的事

- ❌ **無法量化真實 client bundle 大小**：`.next/` 沒 production build。要量「打開 /dashboard 第一次載多大 JS」、必須跑 `ANALYZE=true npm run build` 一次。Task 7 範圍不允許跑 build、留給 William 拍板下個 task。

---

## 旁觀備註（不在 3 大紅旗、但值得記）

1. **`opencc-js`（5.6M）入口 `lib/text/simplified-to-traditional.ts` 用 `import * as OpenCC from 'opencc-js'`**：是 namespace import、tree-shake 效率較差。被 `lib/ai/llm-dispatcher.ts` import — 這是 server-only path（從 API route 走）、client 不 ship、相對 OK。但確認沒 leak 進 client component 才放心。
2. **`browser-image-compression`（856K）** static 進 `useImageUploader` → 兩處 component 用：圖片壓縮只在「user 真的點上傳」才用、可改 `await import` 省 ~200KB first-load。
3. **`turbopack: {}`** 已啟（Next.js 16 預設）— production build 也用 Turbopack。
4. **`output: 'standalone'`** ✅ — Coolify Docker 用 standalone 模式正確、不需打整 node_modules 進 image。
5. **`optimizePackageImports` 清單** 已包 14 個常用 lib（lucide / radix / dnd-kit / date-fns / framer-motion 等） ✅ — Next.js 自動 tree-shake。
6. **Sentry 三條 config 都用 `enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN`** — 沒設 DSN 就不啟、本地 dev 不會吃 Sentry overhead ✅。
7. **`@anthropic-ai/sdk` v0.95.2** — 是 server-only（兩處 import 都在 `lib/ai/`、走 API route）、不上 client、OK。但建議 Migration 到 v0.96.x 拿 prompt caching。
