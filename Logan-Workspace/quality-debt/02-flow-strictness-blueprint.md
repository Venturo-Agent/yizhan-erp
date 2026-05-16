---
title: 流程嚴謹維度藍圖 — 金流 race / transaction / audit log
created: 2026-05-15
owner: Logan
status: v0.1（active）
related: [[02-flow-strictness-findings]] [[README]]
---

# 流程嚴謹維度藍圖

## 規則

### R1 — 金流變動必加 recordApiAuditContext
- 所有改變金錢 / 狀態的 endpoint（POST / PUT / PATCH / DELETE）
- 在 admin client 建立後立刻 call `recordApiAuditContext(supabase, { actorId, reason, requestId? })`
- reason 用人類可讀格式（譬如 `「獎金結算（${tour_ids.length} 團、日期 ${date}）」`、不要 `「update operation」`）

### R2 — Critical state transition 用 SQL-level atomic filter
- 不要 application-level `if (row.status !== 'expected')` 後 update
- 改成 `.update(...).eq('status', 'expected')`、不符合就更新 0 row、用 return 確認
- 範例：
  ```ts
  const { data: updated } = await supabase
    .from('table')
    .update({ status: 'next' })
    .eq('id', id)
    .eq('status', 'expected') // ← atomic check-and-set
    .select('id')
    .single()
  if (!updated) return error('已被改動、請重新整理', 409)
  ```

### R3 — 多 step write 必加補償回滾
- 若 endpoint 含 2 step+ 的 write（insert PR + insert items + update status）
- 任一 step 失敗 → catch 內砍前面 step 建的
- 範例（salary submit）：
  ```ts
  if (itemsError) {
    await supabase.from('payment_requests').delete().eq('id', pr.id)
    return error(...)
  }
  ```

### R4 — 純預覽 / 試算 endpoint 不需要 audit log
- 路徑含 `preview-` / `-preview` / `estimate-` / `-estimate`
- 不改 DB、純算回傳值、加 audit log 沒意義
- 但仍需 capability 守門（R1 安全維度）

### R5 — Idempotency for retryable mutations
- 重要 mutation（譬如 settle / submit）支援同 request body 重發不會雙倍處理
- 做法：用 unique constraint（譬如 `(tour_id, employee_id)` 唯一）+ ON CONFLICT DO NOTHING
- bonus settle 已用 `(tour_id, employee_id, bonus_kind)` upsert key

## 流程（寫 critical financial endpoint 必走）

```
1. 守門：requireCapability / getApiContext（R1 安全）
  ↓
2. 取 admin client
  ↓
3. recordApiAuditContext(supabase, { actorId, reason })  ← R1
  ↓
4. validate body + check business preconditions
  ↓
5. atomic check-and-set update（R2）
  ↓
6. multi-step write 包 try / catch + 補償砍（R3）
  ↓
7. return 結果
```

## 工具索引

| 工具 | 檢查項 | 命令 |
|------|--------|------|
| audit:flow-strictness | recordApiAuditContext / admin_client / optimistic_lock / compensation_rollback | `npx tsx scripts/audit-flow-strictness.ts` |

## 第一輪深掃成果（2026-05-15）

### 已修
- 9 個金流 endpoint 加 recordApiAuditContext
  - disbursement: batch-create POST / [id] PATCH
  - hr/bonus-settlements: settle POST / write-pending POST
  - hr/salary-settlements: POST（建 batch）/ [id] DELETE / [id]/submit POST
  - payments: verify POST / reject POST

### 已升級
- audit:flow-strictness：排除 preview / estimate / 設定 CRUD

### 結果
- 必修 finding：10 → 0
- 建議 finding：44 → 15（剩下都是 false positive / 細粒度檢查工具改進）

## 下輪迭代計畫

### 短期
1. 寫 `audit:optimistic-lock-coverage` 工具、檢測 SQL-level filter
2. 走 5 條金流 flow 人工 review（請款 / 收款 / 出納 / 獎金 / 薪資）找漏洞

### 中期
1. 寫 `audit:idempotency-coverage`（mutation 有沒有 idempotency 保護）
2. 寫 `audit:transaction-wrapping`（多 step write 有沒有 RPC 包 BEGIN）

### 長期
- e2e race condition test（同時跑兩個 settle、確認只一個成功）
- 半夜 claude loop 看 audit diff、自動補 audit context
