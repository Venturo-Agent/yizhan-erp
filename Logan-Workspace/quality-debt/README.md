---
title: Quality Debt Framework（QDF）— venturo-aierp 品質債管理框架
created: 2026-05-15
updated: 2026-05-16
owner: Logan
status: v0.2（active、47 rounds loop 累積）
---

# QDF — Quality Debt Framework

> 一頁看狀態：[STATUS-DASHBOARD.md](./STATUS-DASHBOARD.md)
> PR 必檢清單：[CHECKLIST.md](./CHECKLIST.md)
> 14 個 audit 工具索引：[AUDIT-TOOLS-INDEX.md](./AUDIT-TOOLS-INDEX.md)
> CI 整合：[CI-INTEGRATION.md](./CI-INTEGRATION.md)
> Migration 政策：[MIGRATION-ROLLBACK-POLICY.md](./MIGRATION-ROLLBACK-POLICY.md)
> Spec 範本：[_spec-template.md](./_spec-template.md)
> **⚠ 框架侷限**：[LIMITATIONS.md](./LIMITATIONS.md)（10 條盲點 / 風險、誠實 self-review）
> **🔗 跨檔同步清單**：[SYNC-ANCHORS.md](./SYNC-ANCHORS.md)（左改右沒改痛點、A-H 8 大類場景）

## 為什麼

技術債只看 code、不看用戶體驗 / 一致性 / 嚴謹度。
品質債 = 技術債 ∪ UX 一致性 ∪ 流程嚴謹 ∪ 資料一致 ∪ 安全 ∪ 效能 ∪ 文檔 ∪ 測試。

William 2026-05-15 拍板：「不只技術債、是品質債」、「先建框架 + 第一次優化 + Loop 持續迭代」。

## 7 維度（2026-05-16 update）

| # | 維度 | 工具 | finding | blueprint |
|---|------|------|---------|-----------|
| 1 | 安全 / 紅線 | audit:rls / audit:capability / audit:secret / audit:hardcoded-id | [01-safety-findings.md](./01-safety-findings.md) + [v2](./01-safety-findings-v2-hardcoded-id.md) | [01-safety-blueprint.md](./01-safety-blueprint.md) |
| 2 | 流程嚴謹 | audit:flow | [02-flow-strictness-findings.md](./02-flow-strictness-findings.md) | [02-flow-strictness-blueprint.md](./02-flow-strictness-blueprint.md) |
| 3 | 資料一致 | audit:data / audit:naming / audit:env | [03-data-consistency-findings.md](./03-data-consistency-findings.md) | [03-data-consistency-blueprint.md](./03-data-consistency-blueprint.md) |
| 4 | 效能 | （待建：slow query / bundle） | [04-perf-findings.md](./04-perf-findings.md) | 待 |
| 5 | 文檔 / 可追溯 | audit:spec / audit:migration | [05-docs-findings.md](./05-docs-findings.md) | 待 |
| 6 | 測試覆蓋 | audit:tests | [06-tests-findings.md](./06-tests-findings.md) | 待 |
| 7 | 介面一致性 | audit:ui / audit:console | [07-ui-consistency-findings.md](./07-ui-consistency-findings.md) | [07-ui-consistency-blueprint.md](./07-ui-consistency-blueprint.md) |

## 深掃 SOP（每個維度都跑一次）

1. **跑既有 audit**：列現有工具能抓什麼
2. **寫新 audit**：補既有沒涵蓋的（譬如 capability-coverage）
3. **升級 audit**：減 false positive（譬如識別 getApiContext / handlePut / Dimension helpers）
4. **紙本研究 finding**：每條判斷紅線 / 假警 / 例外
5. **動手修紅線 + 寫 fix-log**
6. **標未修的**（待下輪 / 等開會）
7. **寫該維度藍圖**（規則 + 流程 + 工具索引 + 未來迭代）

## 目錄結構

```
quality-debt/
├── README.md（本檔）
├── _audit-runs/
│   └── {date}-{dim}.md（每次 audit 快照、進度比對用）
├── 0X-{dim}-findings.md（每維度 finding 報告）
├── 0X-{dim}-blueprint.md（每維度藍圖、規則 + 規範）
└── _fix-logs/
    └── {date}.md（每次修補日誌、前 N → 後 M）
```

## Loop 機制

**短期（手動）**：
- 每次深掃一個維度 → 產 finding → 修一輪 → 寫 fix-log → 進下個維度
- 每天早上 / 晚上跑一次 audit、產 diff

**中期（半自動、一週後）**：
- CronCreate 排程：每天凌晨 3 點跑 `npm run audit:quality:all`
- 結果寫 `_audit-runs/{date}.md`
- 進度跟 baseline 比較、退步 / 進步用 telegram 通報

**長期（全自動、開會討論時定）**：
- 半夜 claude loop 看 audit diff、小違規自動 fix PR、大違規寫 issue
- 對齊 W 提的「半夜自動化 loop 修復」

## 已建工具索引

完整 14 個工具見 [AUDIT-TOOLS-INDEX.md](./AUDIT-TOOLS-INDEX.md)。

一指令跑全套：`npm run audit:quality`

排程：每天凌晨 03:07 跑 `./scripts/nightly-audit.sh`、寫進 `_audit-runs/{date}.md`

## 規範對齊

所有 finding / fix 對齊：
- 鐵律 #8 不刪 William 檔案 / 資料
- 鐵律 #9 沒有特權、沒有 admin bypass
- venturo-aierp 6 層架構（L1-L6）
- L4 狀態守門紅線 D「不開後門」
