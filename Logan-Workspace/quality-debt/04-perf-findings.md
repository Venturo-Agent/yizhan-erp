---
title: 品質債深掃 #4 效能 — finding 報告
created: 2026-05-15
owner: Logan
status: 淺盤、深做留下次
---

# 效能 finding（2026-05-15）

## 掃描範圍

工具：
- grep N+1 pattern（`.map(async / forEach(async`）
- audit:file-size（既有）

未跑（缺工具 / 環境）：
- supabase slow query log（要 DB 連線）
- bundle analyzer（要安裝）
- core web vitals（要 production traffic）

## Baseline

### N+1 pattern
- 全 repo 只 1 處：`src/app/(main)/workspaces/[id]/_components/integrations-tab.tsx:128`
- 評估：integrations-tab 看每個 integration 詳細狀態、N 個 integration 多 N 個 fetch、N 通常 < 5、影響小

### 大檔（影響 bundle）
audit:file-size 找出 136 個檔超 500 行、其中：
- `src/lib/supabase/types.ts` 9389 行（typegen 產的）
- 其他 component / page 134 個（多 600-1500 行）

## 下輪深做（要工具配置）

### Phase 1：建立基線
1. supabase slow query log：抓過去 7 天前 20 慢 query
2. bundle analyzer：跑 `npm run build` + `@next/bundle-analyzer`、列各 route bundle size
3. lighthouse CI：每天跑 dashboard / list / detail 三個 representative page

### Phase 2：N+1 + cache
1. 寫 audit:n-plus-one：偵測 `.map(async => fetch)` 跟 `for of` 內 query
2. 整理 SWR / React Query usage、找重複 fetch

### Phase 3：DB index
1. 列 audit 從 supabase 拿 explain analyze、找慢 query
2. 必要時加 index

### Phase 4：bundle
1. 拆大 page（136 個檔）
2. 動態 import 重元件（譬如 EditorJS / chart libs）
