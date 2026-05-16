---
title: QDF Audit Tools Index
created: 2026-05-15
status: active
owner: Logan
---

# Audit Tools Index

當前 12 個 audit 工具完整索引。

## 既有（rounds 1 前已存在）

| 工具 | 用途 | 命令 |
|------|------|------|
| audit:rls | L1-L6 守門 / SSOT drift 檢查 | `npm run audit:rls` |
| audit:any-usage | any 類型偵測 | `npm run audit:any-usage` |
| audit:status | 狀態 SSOT 偏離 | `npm run audit:status` |
| audit:file-size | 檔 size 超限 | `npm run audit:file-size` |
| audit:code-quality | 上面四個 + type-check + lint | `npm run audit:code-quality` |

## QDF Loop 新建（rounds 1-38）

| 工具 | 用途 | 命令 |
|------|------|------|
| audit:capability | API endpoint 守門 | `npm run audit:capability` |
| audit:flow | 金流嚴謹度（race / audit log / 補償） | `npm run audit:flow` |
| audit:data | formatter / 日期散刻 | `npm run audit:data` |
| audit:ui | Dialog / Layout SSOT 覆蓋率 | `npm run audit:ui` |
| audit:spec | module spec.md 覆蓋率 | `npm run audit:spec` |
| audit:migration | migration Rollback 覆蓋 | `npm run audit:migration` |
| audit:naming | 業務術語混用 | `npm run audit:naming` |
| audit:secret | hardcoded secret 偵測 | `npm run audit:secret` |
| audit:console | src/ 內 console.* 偵測 | `npm run audit:console` |

## 整合命令

| 命令 | 跑哪些 |
|------|--------|
| `npm run audit:quality` | 全 9 個新 audit 工具串接 |
| `./scripts/nightly-audit.sh` | 跑 audit:quality + 寫 diff 進 `_audit-runs/{date}.md` |

## Current State（2026-05-16 02:18）

| Metric | Baseline | Final |
|--------|----------|-------|
| audit:capability 未守 | 32 | **0** |
| audit:flow 必修 | 10 | **0** |
| audit:data 散刻 | 14 | **0** |
| audit:spec 覆蓋 | 0% | **100%** |
| audit:migration recent | 76% | **100%** |
| audit:secret | ? | **0** |
| audit:console | ? | **0** |
| audit:ui Dialog | 53.8% | 55.0% |
| audit:naming | ? | 18 confused files（fp 多） |
| Unit test | 0 | **42 ✅** |

## 排程整合

對齊 `CI-INTEGRATION.md`：

| 場景 | 跑哪些 | 預期時間 |
|------|--------|----------|
| 本機 pre-commit | capability + data + spec | < 10s |
| CI PR | audit:quality + vitest + type-check | 2-3 min |
| 半夜 cron | `./scripts/nightly-audit.sh` | < 1 min |
| 手動全跑 | audit:quality | < 30s |

## 規則對齊

對齊以下 blueprint 文件：
- [01-safety-blueprint](./01-safety-blueprint.md)：R1-R5 安全規則
- [02-flow-strictness-blueprint](./02-flow-strictness-blueprint.md)：R1-R5 金流嚴謹
- [03-data-consistency-blueprint](./03-data-consistency-blueprint.md)：R1-R4 資料一致
- [07-ui-consistency-blueprint](./07-ui-consistency-blueprint.md)：R1-R5 UI 一致
- [MIGRATION-ROLLBACK-POLICY](./MIGRATION-ROLLBACK-POLICY.md)：R1-R5 migration 政策
- [CHECKLIST](./CHECKLIST.md)：PR / 新 feature 必檢查清單
