---
title: 品質債深掃 #2 流程嚴謹 — finding 報告
created: 2026-05-15
owner: Logan
status: in-progress
---

# 流程嚴謹品質債 finding（2026-05-15）

## 掃描範圍

工具：
- audit:flow-strictness（新建、scripts/audit-flow-strictness.ts）

檢查項：
1. admin_client：用 getSupabaseAdminClient（繞 RLS、後端自守）
2. optimistic_lock：SQL-level `.eq('status', expected)` filter（atomic check-and-set）
3. compensation_rollback：多 step insert / update 失敗時補償砍前面建的
4. audit_context：recordApiAuditContext 留 audit log

範圍：critical financial endpoint（path 含 payment / receipt / disbursement / bonus / salary / settle / submit / confirm / close / approve / void / finance）

排除：preview / estimate / 設定 CRUD（accounting-subjects / expense-categories / payment-methods）

## 第一輪 baseline

- critical endpoint 檔：16 個
- finding 數：20 個
- 必修 (must)：10 個（全部是缺 recordApiAuditContext）
- 建議 (should)：44 個

## 第一輪修補

### 補 recordApiAuditContext（10 個 → 0）
- ✅ `src/app/api/disbursement/batch-create/route.ts` [POST]
- ✅ `src/app/api/disbursement/[id]/route.ts` [PATCH]
- ✅ `src/app/api/hr/bonus-settlements/settle/route.ts` [POST]
- ✅ `src/app/api/hr/bonus-settlements/write-pending/route.ts` [POST]
- ✅ `src/app/api/hr/salary-settlements/route.ts` [POST]
- ✅ `src/app/api/hr/salary-settlements/[id]/route.ts` [DELETE]
- ✅ `src/app/api/hr/salary-settlements/[id]/submit/route.ts` [POST]
- ✅ `src/app/api/payments/[id]/verify/route.ts` [POST]
- ✅ `src/app/api/payments/[id]/reject/route.ts` [POST]
- ⏭️ `src/app/api/disbursement/preview-fees/route.ts` [POST]：純預覽、不改 DB、加進 EXCLUDED

### Audit 工具升級
- 排除 `preview-` / `-preview` / `estimate-` / `-estimate`
- 排除設定 CRUD：`finance/accounting-subjects` / `finance/expense-categories` / `finance/payment-methods`

## 第二輪 baseline（修後）

- 必修：0
- 建議：15（剩下都是 should level）

## 留下輪（建議級、不阻 ship）

### Optimistic lock false positive
大部分 critical endpoint 用 application-level check（先 select 再 if status !==）、不是 SQL-level `.eq('status', expected)` filter。

範例（disbursement [id] PATCH）：
```ts
if (order.status !== 'pending') {
  return NextResponse.json({ error: '已出帳的出納單不能編輯' }, { status: 400 })
}
// ... 然後做 update
```

理論上 select 跟 update 之間 status 可能被其他請求改、有 race condition。

但實務上：
- 用 admin client 已避免 RLS race
- update 內加 `.eq('status', 'pending')` 才是真 atomic check-and-set

**改進方向（之後做、不阻 ship）**：
- 寫 `audit:optimistic-lock-coverage` 工具更精準檢測（找 `.update(...).eq('status', ...)` pattern）
- 對 race-sensitive endpoint 補 atomic filter

### Compensation rollback false positive
audit pattern 抓 `.delete().eq(...pr.id)` 等明確補償 pattern、漏抓很多 try/catch 內隱含補償。

**改進方向**：
- 改用 AST 分析（看 try/catch 內有沒有 DELETE 對應前面 INSERT 的表）
- 或寫整 endpoint 走過一次的 e2e race test

### Audit 工具未涵蓋
- migration safety（drop column 有沒有 _pending_review）
- transaction wrapping（多 step write 有沒有用 RPC 包 BEGIN）
- idempotency（同 request 重發會不會重複處理）

## 不在這次掃的維度
- 資料一致性（formatter / 命名）
- 介面一致性（dialog / page layout）
- 效能（slow query / N+1）
- 文檔 / 測試
