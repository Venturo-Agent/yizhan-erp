# 全盤網站路由 Deep Audit Charter — 2026-05-21

> 派工人：William（透過 Claude Opus 4.7 中介、老闆角色）
> 承辦：OPENCLAW（agent: main、人格 Max）
> 任務性質：**對 67 個 page.tsx 全部做「對方式」9 項深度 audit**
> 緊急程度：HIGH（6/1 第一付費客戶、剩 10 天）

---

## 為什麼

William 拍板：finance/settings 9 項清單方法論變健檢規範、立刻對全網站跑一次。
預估會找出 30-50 件類似 grandfather 漏網（其中 5-10 件 P0 critical 資安洞）。

---

## 必讀（避免重複勞動 / 避免 false positive）

1. **`workspace/健檢/decided/audit-methodology.md`** — 方法論完整版（9 項必查、嚴重度標籤、輸出格式）
2. `~/Projects/yizhan-erp/CLAUDE.md` — 紅線 0-H、特別新加紅線 H
3. `workspace/健檢/pending/finance-settings-9-issues-tracker.md` — finance/settings 已修紀錄、別重複報
4. `workspace/_meta/architecture/2026-05-20-swr-realtime-page-audit-pass2-complaint.md` — shared-data 紅線 G **是 false positive**、不要列

---

## 任務範圍

### 67 個 page.tsx（從 src/app/(main)/\*\*/page.tsx）

```bash
find src/app/\(main\) -name "page.tsx" -maxdepth 4
```

掃完整 list、扣已凍（travel-invoice / mobile app 測試框架）。

### 對每個 route、按 audit-methodology.md 第 3 章 9 項查

A. 資安（3 項）：A1 RLS workspace_id、A2 API session、A3 無字串拼接
B. 資料（2 項）：B1 schema 無冗餘、B2 migration 真有跑
C. 抽象層（2 項）：C1 entity hook、C2 apiMutate
D. 效能 + UX（2 項）：D1 Promise.all 並行、D2 載入失敗 toast

---

## 產出

### 主檔

`workspace/健檢/reports/full-route-deep-audit-2026-05-21.md`

格式：

```markdown
# 全網站路由深度 Audit — 2026-05-21

## 救護車式總覽

- 共掃 N 個 route
- 找到 M 個問題（🔥 P0_critical / ⚠️ P0_medium / 🐛 bug / 🧱 quality）
- 最痛 module：[列出來]

## 各 route 詳細

（按 module 分組、每個 route 列 9 項清單）

### finance/settings/page.tsx

（已修、引用 finance-settings-9-issues-tracker.md、不重複列）

### accounting/vouchers/page.tsx

🔥 #1 RLS 散刻 / API 信 client / ...
（按 audit-methodology.md 第 2 章範本）

### tours/page.tsx

（每條都列、即使全 ✅ 也標）

...

## P0/P1/P2 排序總結
```

### 心得

`workspace/_meta/architecture/PASS5-LEARNINGS-2026-05-21.md`

---

## 紅線

- ❌ 不准動 src/ / migrations/
- ❌ 不准 push / apply migration
- ✅ MCP SELECT-only 查 DB schema / policies OK
- ✅ commit 完成：`audit(routes-deep): 67 route 深度 audit 完成 — 2026-05-21`

---

## 品質要求

1. **不重複報 finance/settings**（已修紀錄在 tracker、引用即可）
2. **不再犯 shared-data 紅線 G false positive**（已在 Pass 2 complaint 確認、不該重列）
3. **每條附證據**（file:line / DB query / grep 結果）
4. **嚴重度標對**：🔥 P0 critical（資安洞）/ ⚠️ medium / 🐛 bug / 🧱 quality
5. **業務白話描述**：每條 "現象" 要寫 user-facing impact

---

## 預估時間

- 67 routes × 3-5 分鐘 = 4-5 小時
- 4 hr timeout 夠

---

## 開工指令

第一個 message 看到「**FULL-AUDIT-START**」 = 正式開工。
回我「收到、開始 67 routes deep audit」就行。

---

_建立：2026-05-21 by Claude Opus、為 6/1 deadline 全盤淬體掃描_
