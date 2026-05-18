---
title: QDF Status Dashboard
created: 2026-05-16
status: 自動更新 by nightly-audit.sh
owner: Logan
---

# 🎯 QDF Status Dashboard

> 一頁看完 yizhan-erp 品質債整體狀態。
> 最新指標：跑 `npm run audit:quality` 或看 `_audit-runs/{today}.md`。

## ⚪ 紅綠燈

| Metric | Status | Value | Target |
|--------|:------:|-------|--------|
| 🔒 API 守門（capability） | 🟢 | 138 / 138 | 全綠 ✅ |
| 💰 金流 audit log（必修） | 🟢 | 0 finding | 0 |
| 📅 日期 / 金額散刻 | 🟢 | 0 finding | 0 |
| 📚 Module spec | 🟢 | 100% (28/28) | 100% |
| 🔄 Migration recent rollback | 🟢 | 100% (21/21) | 100% |
| 🧪 Unit tests | 🟢 | 60 tests pass | 全綠 |
| 🧪 Critical service test | 🟢 | 100% (3/3) | 100% |
| 🔐 Hardcoded secret | 🟢 | 0 | 0 |
| 🖨 src/ console.* | 🟢 | 0 | 0 |
| 🆔 Hardcoded UUID | 🟡 | 3 處 SYSTEM_BOT_ROLE | 0 |
| 🎨 UI Dialog SSOT | 🟡 | 56.3% | ≥ 70% |
| 🎨 UI Layout SSOT | 🟡 | 70.3% | ≥ 80% |
| 🔄 全 migration rollback | 🟠 | 8.5% (64/750) | ≥ 50% |

## 🛠 14 個 audit 工具

```
既有 5：       rls / any-usage / status / file-size / code-quality
QDF 新建 9：   capability / flow / data / ui / spec / migration /
              naming / secret / console / hardcoded-id / tests / env
```

統合命令：`npm run audit:quality`（跑全 9 個 QDF audit）

## 🧪 Unit Tests（60 tests）

| File | Tests | Coverage |
|------|-------|----------|
| `src/lib/hr/__tests__/leave-severance-calculator.test.ts` | 31 | 特休 / 資遣 / 平均工資 |
| `src/lib/disbursement/__tests__/fee-distribution.test.ts` | 11 | average / unified 分攤 |
| `src/lib/finance/__tests__/type-guards.test.ts` | 18 | tour/company/salary 判定 |

## 📚 文檔（Logan-Workspace/quality-debt/）

- `README.md` — QDF 框架說明
- `CHECKLIST.md` — PR / 新 feature 必檢清單
- `AUDIT-TOOLS-INDEX.md` — 全 14 audit 工具索引
- `CI-INTEGRATION.md` — pre-commit / CI / cron 整合
- `MIGRATION-ROLLBACK-POLICY.md` — migration 政策
- `STATUS-DASHBOARD.md` — 本檔
- `_spec-template.md` — 10 段 module spec 範本
- `01-safety-{findings,blueprint}.md` — 安全維度
- `01-safety-findings-v2-hardcoded-id.md` — UUID 紅線
- `02-flow-strictness-{findings,blueprint}.md` — 金流嚴謹
- `03-data-consistency-{findings,blueprint}.md` — 資料一致
- `04-perf-findings.md` — 效能
- `05-docs-findings.md` — 文檔
- `06-tests-findings.md` — 測試
- `07-ui-consistency-{findings,blueprint}.md` — UI 一致
- `_audit-runs/` — 每日 audit snapshot（2026-05-15 baseline + 05-15 final + 05-16）
- `_fix-logs/` — 每日修補日誌

## 🗂 Module Specs（28 / 28、100%）

| 大類 | Modules |
|------|---------|
| 核心業務 | tours / orders / customers / finance / hr / accounting |
| 結算 | hr-bonus-settlement / hr-salary-settlement / leave-severance / fee-distribution |
| 整合 | facebook-bot / instagram-bot / line-bot / messaging-inbox |
| 設定 | settings / workspaces / dashboard / cis |
| 衍生 | calendar / channels / database / todos / office / tour-attributes |
| Addon | addon-data-attractions / hotels / restaurants |
| Platform | platform-integrations |

## ⏰ 自動化（半夜 Loop）

| 觸發 | 動作 |
|------|------|
| OS cron `7 3 * * *` | `./scripts/nightly-audit.sh` → 寫 `_audit-runs/{date}.md` |
| CronCreate `3fdbd3c2` | session 內每天 03:07 跑 + 退步 telegram 通報 |

## 📈 累積 Loop 進度（Rounds 1-44）

| 階段 | Rounds | 重點 |
|------|--------|------|
| 第一輪深掃 | 1-21 | 7 維度全掃 + 5 audit 工具 + 28 spec |
| 工具擴充 | 22-30 | 5 module spec + migration policy + spec coverage 100% |
| 自動化 | 31-38 | nightly-audit / CronCreate / CHECKLIST / index |
| Hardcoded UUID | 39-40 | audit:hardcoded-id + CORNER_WORKSPACE_ID 走 env |
| Test 補齊 | 41-42 | type-guards 18 tests / critical service 100% test |
| UI 遷移 | 43 | BindCustomerDialog → FormDialog（SSOT +1.3%） |
| Env 工具 | 44 | audit:env-vars + INFRASTRUCTURE.md 對齊 |

## 🎯 下一階段（之後 round）

剩 yellow / orange 指標：

1. **🆔 SYSTEM_BOT_ROLE_ID lookup refactor**（3 處、需 schema）
2. **🎨 UI Dialog SSOT 推到 70%**（剩 ~22 個 dialog 待遷）
3. **🎨 UI Layout SSOT 推到 80%**（剩 5 個 page 待遷）
4. **🔄 全 migration rollback 推到 50%**（補 ~25 個 critical migration）
5. **🧪 補 payroll-engine / settle / submit unit test**
6. **🔧 audit:i18n / audit:transaction / audit:idempotency**
