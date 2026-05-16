---
title: QDF CI 整合 spec
created: 2026-05-15
status: spec / 待 W 拍板實作
---

# QDF → CI Integration

## 目的

把 `npm run audit:quality` 整合進 CI / pre-commit、確保每次 push 不會降回歸品質基線。

## 三段防線

### 1. Pre-commit hook（本機快檢）
- 只跑「快」audit：capability + data-consistency + spec + ui
- migration / flow 較重、留 CI 跑
- 工具：husky + lint-staged

```json
// package.json
"husky": {
  "hooks": {
    "pre-commit": "npm run audit:capability && npm run audit:data && npm run audit:spec"
  }
}
```

### 2. CI pre-merge（必過閘門）
- 跑 `npm run audit:quality` 全套
- 跑 unit test：`npx vitest run src/lib/hr src/lib/disbursement`
- 跑 type-check：`npm run type-check`
- 失敗則擋 merge

```yaml
# .github/workflows/quality-debt.yml
name: Quality Debt Check
on: [pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run audit:quality
      - run: npx vitest run
      - run: npm run type-check
```

### 3. 半夜 CronCreate（持續迭代）
- 每天凌晨 3:07 跑 `npm run audit:quality`
- 寫 diff 進 `Logan-Workspace/quality-debt/_audit-runs/{date}.md`
- 跟前一天比、退步通報 telegram
- 進步通報 W 累積成果

```ts
// Schedule code（要在 Claude session 內設）
CronCreate({
  cron: '7 3 * * *',
  recurring: true,
  durable: true,
  prompt: '/loop quality-debt-cron — 跑 audit:quality + 寫 diff + telegram 通報',
})
```

## Baseline 保護機制

每個 audit 工具的 baseline 值：
- audit:capability：未守門 = 0（不可退步）
- audit:flow-strictness：必修 finding = 0（不可退步）
- audit:data-consistency：散刻 = 0（不可退步）
- audit:spec：100%（不可退步）
- audit:migration-rollback recent：100%（不可退步）

UI 跟全 migration coverage 是長期改善 metric、不擋 merge：
- audit:ui Dialog：≥ 55%（目標 70%）
- audit:migration 全：≥ 8.5%（目標 50%）

## 部分跑 vs 全跑

| 場景 | 跑哪些 | 預期時間 |
|------|--------|----------|
| Pre-commit | capability + data + spec | < 10s |
| CI PR | audit:quality + vitest + type-check | 2-3 min |
| 半夜 cron | audit:quality + diff + telegram | < 1 min |
| Manual `npm run audit:quality` | 全 6 工具 | < 30s |

## 失敗 → Recovery 流程

1. CI 紅 → check 是哪個 audit 退步
2. 如果是「新代碼引入」→ 拒絕 merge、要求修
3. 如果是「audit 工具誤判」→ 升級 audit（加 EXCLUDED / fix pattern）
4. 如果是 baseline 變更（譬如 spec coverage 規則改）→ 寫 PR 同時更新 baseline doc

## 未實作的 reserved 工具

- audit:naming-consistency（業務術語檢查）
- audit:transaction-wrapping（多 step write 包 BEGIN）
- audit:idempotency-coverage（mutation 重發保護）
- audit:i18n-coverage（中文字串 hardcode 偵測、為國際化準備）
