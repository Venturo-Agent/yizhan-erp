---
title: 品質債深掃 #6 測試覆蓋 — finding 報告
created: 2026-05-15
owner: Logan
status: 淺盤、深做留下次
---

# 測試覆蓋 finding（2026-05-15）

## Baseline

### Critical service unit test
- `src/lib/hr/__tests__/`：**不存在**
- `src/lib/finance/__tests__/`：**不存在**
- `src/lib/disbursement/__tests__/`：**不存在**

Critical service（金流 / 計算 / 結算）**0% unit test 覆蓋**。

### E2E 測試
（未確認、應該有 playwright 但沒跑覆蓋）

### 影響
- 改動 critical service（譬如 leave-severance-calculator / fee-distribution）沒測試保護
- 回歸風險高

## 高優先要測的 service

### P0 — 計算邏輯（純函式、最好測）
- `src/lib/hr/leave-severance-calculator.ts`
  - calcAnnualLeave（特休天數計算）
  - calcSeverance（資遣費新舊跨制）
  - calcYearsOfService / calcAvgMonthlyWage
- 預估：寫 unit test 半天、20 個 test case

### P1 — 結算 service（含 DB 副作用、要 mock）
- `src/app/api/hr/bonus-settlements/settle/route.ts`
  - 結算成功 / 部分失敗補償回滾 / race condition 防護
- `src/app/api/hr/salary-settlements/[id]/submit/route.ts`
  - 同上
- 預估：寫 integration test 一天（每 case 用 supabase test instance）

### P2 — 出納單 service
- batch-create 內 fork_payment_request_for_partial_billing
- fee distribution（average vs unified）

## 下輪深做

### Phase 1：純函式 unit test（半天）
1. 建 `src/lib/hr/__tests__/leave-severance-calculator.test.ts`
2. 涵蓋 20 個 case：邊界 / 跨制 / 0 年資 / >30 年

### Phase 2：結算 integration test（一天）
1. supabase test instance（local）
2. 寫 bonus settle / salary submit 4 個 critical case：
   - happy path
   - 缺資料退 404
   - race condition（先 settle 後再 settle 同團）
   - 補償回滾驗證

### Phase 3：核心 flow E2E smoke（半天）
1. 登入 → 建請款單 → 出納 → 確認
2. 結團 → 寫 bonus_pending → settle → 看 PR 產出
3. 建薪資 batch → submit → 看 PR 產出

### Phase 4：CI 整合
- GitHub Action：每 push 跑 unit + smoke、PR 阻擋失敗 merge
