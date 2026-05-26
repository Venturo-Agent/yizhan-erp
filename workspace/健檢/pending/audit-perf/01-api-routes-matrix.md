# 01 — API Route 響應時間矩陣

**資料時點**：2026-05-23 12:34
**資料來源**：grep + Read `src/app/api/**/route.ts`
**範圍**：151 個 API route（全部 route.ts、不含 helpers）

## 摘要

- 全站共 **151 個 API route**（route.ts 計數、原 brief 講 108 是舊數字）
- **104 個** 走 `requireCapability`（佔 68%）、**9 個** 走 `getApiContext`、**51 個** 直接 call `getServerAuth`
- **71 個** 寫入 route call `recordApiAuditContext`、**99 個** 用 admin client（service_role）
- DB call 最肥前 5：**`/line/webhook`（18）、`/accounting/period-closing`（14）、`/accounting/opening-balances`（11）、`/accounting/receipts/[id]/refund`（11）、`/hr/bonus-settlements/settle`（10）**
- **共病**：每個 `requireCapability` route 都隱含 **1 GoTrue auth call + 2 個 DB call（employees + role_capabilities）** = 3 round trips、再加 route 自己的 sequential DB call
- **outlier**：**6 個 route** 還散刻 `error.message` return（紅線：應走 `dbErrorResponse`）；**22 個** 已對齊 `dbErrorResponse`

## DB call 分佈

| 桶                          | 數量 | 佔比 |
| --------------------------- | ---- | ---- |
| 肥（≥5 sequential DB call） | 33   | 21%  |
| 中（2-4）                   | 58   | 38%  |
| 輕（<2）                    | 60   | 39%  |

> 「round trips」= auth 成本 + DB call + audit；
> `requireCapability` 算 3 個（1 GoTrue + employees + role_capabilities）、`getApiContext` 算 3、`getServerAuth` 算 2、無守門算 0。

## Top 20 最肥（sequential DB call 排序）

| #   | 路徑                                 | Method              | DB call | RPC | 估 round trips | 守門          | 中央 error 翻譯 | 備註          |
| --- | ------------------------------------ | ------------------- | ------- | --- | -------------- | ------------- | --------------- | ------------- |
| 1   | `/line/webhook`                      | GET,POST            | 18      | 0   | 19             | (public)      | ✗errMsg×1       | errMsg,public |
| 2   | `/accounting/period-closing`         | POST                | 14      | 0   | 19             | requireCap    | —               | audit         |
| 3   | `/accounting/opening-balances`       | GET,POST            | 11      | 0   | 16             | requireCap    | —               | audit         |
| 4   | `/accounting/receipts/[id]/refund`   | POST                | 11      | 0   | 16             | requireCap    | —               | audit         |
| 5   | `/hr/bonus-settlements/settle`       | POST                | 10      | 0   | 15             | requireCap    | —               | audit         |
| 6   | `/ocr/passport/batch-reprocess`      | GET,POST            | 10      | 0   | 15             | requireCap    | ✗errMsg×2       | audit,errMsg  |
| 7   | `/public/invoices/[token]`           | GET                 | 10      | 0   | 11             | (public)      | —               | public        |
| 8   | `/accounting/vouchers/[id]/reverse`  | POST                | 9       | 0   | 14             | requireCap    | —               | audit         |
| 9   | `/contracts/create`                  | POST                | 9       | 0   | 14             | requireCap    | —               | audit         |
| 10  | `/hr/salary-settlements/[id]/submit` | POST                | 9       | 0   | 14             | requireCap    | —               | audit         |
| 11  | `/hr/salary-settlements`             | GET,POST            | 8       | 0   | 13             | requireCap    | —               | audit         |
| 12  | `/ai/health`                         | GET                 | 8       | 0   | 12             | requireCap    | —               |               |
| 13  | `/workspaces/[id]/ai-health`         | GET                 | 8       | 0   | 12             | requireCap    | —               |               |
| 14  | `/workspaces/[id]`                   | DELETE,GET,PATCH    | 8       | 0   | 11             | getServerAuth | ✗errMsg×1       | audit,errMsg  |
| 15  | `/public/invoices/[token]/pay`       | POST                | 8       | 0   | 9              | (public)      | —               | public        |
| 16  | `/channels/dm`                       | POST                | 7       | 0   | 12             | requireCap    | ✓dbErr          | audit         |
| 17  | `/auth/validate-login`               | POST                | 7       | 1   | 11             | requireCap    | ✗errMsg×1       | 1rpc,errMsg   |
| 18  | `/public/registration`               | POST                | 7       | 0   | 9              | (public)      | ✓dbErr          | audit,public  |
| 19  | `/bank-accounts`                     | DELETE,GET,POST,PUT | 6       | 0   | 11             | requireCap    | —               | audit         |
| 20  | `/roles/[roleId]/tab-permissions`    | GET,PUT             | 6       | 0   | 11             | requireCap    | ✓dbErr          | audit         |

## 共通 pattern 發現（量化）

### Pattern 1：每個 API 內隱含的「重複 auth chain」

`requireCapability` 一次 call 拆解：

```
requireCapability(capCode)
  └─ getServerAuth()
       ├─ supabase.auth.getUser()                # 1 × GoTrue HTTP call（30-80ms）
       └─ employees SELECT（user_metadata 沒時）  # 1 × DB call
  └─ hasCapabilityByCode(employeeId, code)
       ├─ employees SELECT role_id              # 1 × DB call
       └─ role_capabilities SELECT              # 1 × DB call
```

- 共 **104 個 route** 每次請求都跑這 4 個 round trip（auth + 3 DB）、跟 route 自己的 DB call 加起來才是總成本
- 注意：`getServerAuth` 跟 `hasCapabilityByCode` 各自查 `employees` 表一次 — **同一張表查兩次**（明顯可合併）
- 若改走 `getApiContext`（合併版）→ 只需 1 auth + 1 employees + 1 caps（parallel）= 同 latency 下省 1 個 DB call

### Pattern 2：手動 workspace 隔離（admin client 繞 RLS 的代價）

- **99 個 route**（65%）用 `getSupabaseAdminClient()`（service_role、繞 RLS）
- 每個 admin client route **必須手動驗 workspace_id**（因為繞 RLS）、通常多 1-2 個 SELECT 確認 ownership
- 譬如 `/api/channels/messages` POST：admin client + memberCheck SELECT = 1 額外 round trip（紅線 H 強制要求）

### Pattern 3：寫入 route 必跑 audit context

- **71 個 route** call `recordApiAuditContext` → 1 × RPC（`set_audit_context`、~2.5ms）
- audit context **應該是免費的**（純 session GUC、不該打 DB）、目前 implementation 走 RPC、每次 +1 round trip

### Pattern 4：每張新 route 都重複「auth → admin client → from('xxx') → from('yyy') 串接」

- 33 個 route（21%）有 ≥5 個 sequential DB call、絕大多數是「先查 parent → 查 child → 查 join → audit → INSERT」的串接 pattern
- 全站 151 個 route.ts、只有 **9 個** 用 `Promise.all` 做 parallel（6%）— 其餘都是 `await` 一個接一個串
- 改 parallel 化是低風險 leverage、每串 5 個 DB call 從 5×5ms = 25ms 降到 ~5ms

### Pattern 5：requireCapability 包了 dynamic import

```ts
// require-capability.ts:39
const { hasCapabilityByCode } = await import('@/app/api/lib/check-capability')
```

- 每次 request 動態 import 一次、Next.js 應該有 module cache、但 cold start 是真實 cost
- 改 static import 風險很低、收益看 V8 module cache hit rate

## Outlier（沒走中央 module / 紅線違反）

### 還散刻 `error.message` 的 6 個 route

（理想應走 `dbErrorResponse`、紅線 6 SSOT、避免洩漏 DB 內部訊息）

**spot check 後分類**：

- **真 client-facing**：`/tenants/create:286`、`/workspaces/[id]:214`（return JSON 給 client、有洩 DB 訊息風險）
- **logger / error reporting**：`/auth/validate-login:214`（log only）、`/health/detailed:79,120`（health check 內 message 欄位、設計如此）、`/line/webhook:719`（webhook log）、`/ocr/passport/batch-reprocess:124,182`（batch result 收集每筆 error）
- 真實要修的只有 2 個（tenants/workspaces 那兩處）、其他算合理使用

| 路徑                            | 出現次數 |
| ------------------------------- | -------- |
| `/health/detailed`              | 2        |
| `/ocr/passport/batch-reprocess` | 2        |
| `/auth/validate-login`          | 1        |
| `/line/webhook`                 | 1        |
| `/tenants/create`               | 1        |
| `/workspaces/[id]`              | 1        |

### Admin client 寫入 route 但沒 call `recordApiAuditContext` 的 23 個

（紅線：所有 admin client 寫入應該設 audit context、留 trace；漸進 migration 中）

| 路徑                                              | Methods          |
| ------------------------------------------------- | ---------------- |
| `/auth/sync-employee`                             | POST             |
| `/auth/validate-login`                            | POST             |
| `/contracts/sign`                                 | POST             |
| `/customer-document-applications/[id]`            | DELETE,GET,PATCH |
| `/disbursement/preview-fees`                      | POST             |
| `/document-types`                                 | GET,POST         |
| `/facebook/setup/validate-credentials`            | POST             |
| `/facebook/webhook`                               | GET,POST         |
| `/instagram/setup/validate-credentials`           | POST             |
| `/instagram/webhook`                              | GET,POST         |
| `/line/admin/refresh-group-profiles`              | POST             |
| `/line/postback-templates`                        | GET,POST         |
| `/line/postback-templates/[id]`                   | DELETE,PATCH     |
| `/line/setup/validate-credentials`                | POST             |
| `/line/webhook`                                   | GET,POST         |
| `/messaging/conversations/[id]/memory/regenerate` | POST             |
| `/messaging/conversations/[id]/retrospective`     | POST             |
| `/public/invoices/[token]/pay`                    | POST             |
| `/setup-tokens/[token]`                           | GET,PUT          |
| `/setup/status`                                   | GET,POST         |
| `/supplier-pricing`                               | GET,POST         |
| `/workspaces/[id]/employee-quota`                 | GET,PATCH        |
| `/workspaces/[id]/happy-persona`                  | GET,PUT          |

## 全部 matrix（151 個 route、依路徑字典序）

欄位：

- **DB**：`.from(...)` + `.rpc(...)` 出現次數（每個算 1 個 sequential round trip）
- **RT**：估總 round trips（auth 成本 + DB call + audit）
- **守門**：`requireCap` / `getApiCtx` / `getServerAuth` / `(direct)` / `(public)`
- **err**：`✓dbErr`（有用 dbErrorResponse）/ `✗errMsg×N`（散刻 error.message）/ `—`（兩者皆無）
- **adm**：✓ = 用 service_role admin client（繞 RLS、需手動 workspace 隔離）
- **aud**：✓ = call recordApiAuditContext

| 路徑                                                     | M                   | DB  | RPC | RT  | 守門          | err | adm | aud | 行數 |
| -------------------------------------------------------- | ------------------- | --- | --- | --- | ------------- | --- | --- | --- | ---- |
| `/_test/sentry-check`                                    | GET                 | 0   | 0   | 0   | (none)        | —   | —   | —   | 30   |
| `/accounting/opening-balances`                           | GET,POST            | 11  | 0   | 16  | requireCap    | —   | —   | ✓   | 290  |
| `/accounting/period-closing`                             | POST                | 14  | 0   | 19  | requireCap    | —   | —   | ✓   | 374  |
| `/accounting/receipts/[id]/refund`                       | POST                | 11  | 0   | 16  | requireCap    | —   | —   | ✓   | 296  |
| `/accounting/vouchers/[id]/reverse`                      | POST                | 9   | 0   | 14  | requireCap    | —   | —   | ✓   | 153  |
| `/accounting/vouchers/auto-create`                       | POST                | 1   | 0   | 6   | requireCap    | —   | ✓   | ✓   | 102  |
| `/accounting/vouchers/create`                            | POST                | 5   | 0   | 10  | requireCap    | —   | —   | ✓   | 167  |
| `/ai/health`                                             | GET                 | 8   | 0   | 12  | requireCap    | —   | ✓   | —   | 237  |
| `/ai/retrospective/aggregate`                            | POST                | 0   | 0   | 4   | requireCap    | —   | —   | —   | 59   |
| `/ai/retrospective/topics`                               | GET                 | 1   | 0   | 5   | requireCap    | —   | —   | —   | 65   |
| `/ai/retrospective/topics/[id]`                          | PATCH               | 1   | 0   | 5   | requireCap    | —   | —   | —   | 68   |
| `/airports`                                              | POST                | 1   | 0   | 4   | getServerAuth | —   | ✓   | ✓   | 71   |
| `/amadeus-totp`                                          | DELETE              | 1   | 0   | 4   | getServerAuth | —   | ✓   | ✓   | 47   |
| `/amadeus-totp/current`                                  | GET                 | 1   | 0   | 3   | getServerAuth | —   | ✓   | —   | 53   |
| `/amadeus-totp/setup`                                    | POST                | 1   | 0   | 4   | getServerAuth | —   | ✓   | ✓   | 70   |
| `/auth/change-password`                                  | POST                | 2   | 0   | 5   | getServerAuth | —   | ✓   | ✓   | 132  |
| `/auth/layout-context`                                   | GET                 | 2   | 0   | 6   | requireCap    | —   | —   | —   | 51   |
| `/auth/logout`                                           | POST                | 0   | 0   | 4   | requireCap    | —   | —   | —   | 37   |
| `/auth/reset-employee-password`                          | POST                | 1   | 0   | 4   | getServerAuth | —   | ✓   | ✓   | 108  |
| `/auth/sync-employee`                                    | POST                | 2   | 0   | 6   | requireCap    | —   | ✓   | —   | 131  |
| `/auth/validate-login`                                   | POST                | 7   | 1   | 11  | requireCap    | ✗×1 | ✓   | —   | 221  |
| `/bank-accounts`                                         | DELETE,GET,POST,PUT | 6   | 0   | 11  | requireCap    | —   | —   | ✓   | 201  |
| `/banks`                                                 | POST                | 1   | 0   | 4   | getServerAuth | —   | ✓   | ✓   | 68   |
| `/branches`                                              | GET,POST            | 2   | 0   | 7   | requireCap    | ✓   | —   | ✓   | 75   |
| `/channels/dm`                                           | POST                | 7   | 0   | 12  | requireCap    | ✓   | ✓   | ✓   | 130  |
| `/channels/messages`                                     | POST                | 2   | 0   | 7   | requireCap    | ✓   | ✓   | ✓   | 98   |
| `/channels/messages/[id]/revoke`                         | POST                | 2   | 0   | 7   | requireCap    | ✓   | ✓   | ✓   | 72   |
| `/contracts/[id]/pdf`                                    | GET                 | 1   | 0   | 5   | requireCap    | —   | —   | —   | 287  |
| `/contracts/create`                                      | POST                | 9   | 0   | 14  | requireCap    | —   | —   | ✓   | 245  |
| `/contracts/list`                                        | GET                 | 1   | 0   | 5   | requireCap    | —   | —   | —   | 34   |
| `/contracts/members`                                     | GET                 | 1   | 0   | 5   | requireCap    | —   | —   | —   | 47   |
| `/contracts/paper-sign`                                  | POST                | 1   | 0   | 6   | requireCap    | —   | —   | ✓   | 54   |
| `/contracts/sign`                                        | POST                | 2   | 0   | 6   | requireCap    | —   | ✓   | —   | 105  |
| `/countries`                                             | POST                | 1   | 0   | 4   | getServerAuth | —   | ✓   | ✓   | 66   |
| `/cron/line-flush`                                       | GET                 | 2   | 0   | 3   | (public)      | —   | ✓   | —   | 115  |
| `/cron/process-tasks`                                    | GET,POST            | 0   | 0   | 0   | (public)      | —   | —   | —   | 39   |
| `/customer-document-applications`                        | GET,POST            | 2   | 0   | 7   | requireCap    | —   | ✓   | ✓   | 82   |
| `/customer-document-applications/[id]`                   | DELETE,GET,PATCH    | 4   | 0   | 8   | requireCap    | —   | ✓   | —   | 117  |
| `/d/[code]`                                              | GET                 | 3   | 0   | 7   | requireCap    | —   | ✓   | —   | 69   |
| `/disbursement/[id]`                                     | PATCH               | 5   | 0   | 9   | getApiCtx     | —   | ✓   | ✓   | 322  |
| `/disbursement/batch-create`                             | POST                | 6   | 0   | 10  | getApiCtx     | —   | ✓   | ✓   | 518  |
| `/disbursement/preview-fees`                             | POST                | 1   | 0   | 4   | getApiCtx     | —   | ✓   | —   | 217  |
| `/document-types`                                        | GET,POST            | 2   | 0   | 6   | requireCap    | —   | ✓   | —   | 69   |
| `/employees/[id]`                                        | DELETE,PATCH        | 4   | 0   | 9   | requireCap    | —   | ✓   | ✓   | 269  |
| `/employees/[id]/eligibilities`                          | GET,PUT             | 3   | 0   | 8   | requireCap    | ✓   | ✓   | ✓   | 107  |
| `/employees/by-ref/[ref]`                                | GET                 | 2   | 0   | 6   | requireCap    | —   | ✓   | —   | 57   |
| `/employees/create`                                      | POST                | 5   | 0   | 10  | requireCap    | —   | ✓   | ✓   | 170  |
| `/facebook/setup/provision`                              | POST                | 1   | 0   | 6   | requireCap    | —   | ✓   | ✓   | 87   |
| `/facebook/setup/validate-credentials`                   | POST                | 1   | 0   | 5   | requireCap    | —   | ✓   | —   | 77   |
| `/facebook/webhook`                                      | GET,POST            | 0   | 0   | 1   | (public)      | —   | ✓   | —   | 389  |
| `/fetch-image`                                           | POST                | 0   | 0   | 2   | getServerAuth | —   | —   | —   | 108  |
| `/finance/accounting-subjects`                           | DELETE,GET,POST,PUT | 5   | 0   | 10  | requireCap    | ✓   | —   | ✓   | 158  |
| `/finance/expense-categories`                            | DELETE,GET,POST,PUT | 5   | 0   | 10  | requireCap    | ✓   | —   | ✓   | 189  |
| `/finance/payment-methods`                               | DELETE,GET,POST,PUT | 4   | 0   | 9   | requireCap    | —   | —   | ✓   | 186  |
| `/health`                                                | GET                 | 1   | 0   | 5   | requireCap    | —   | ✓   | —   | 60   |
| `/health/db`                                             | GET                 | 3   | 0   | 7   | requireCap    | —   | ✓   | —   | 104  |
| `/health/detailed`                                       | GET                 | 1   | 0   | 5   | requireCap    | ✗×2 | ✓   | —   | 140  |
| `/hr/bonus-settlements/[tourId]`                         | GET                 | 2   | 0   | 6   | requireCap    | —   | ✓   | —   | 65   |
| `/hr/bonus-settlements/pending-tours`                    | GET                 | 4   | 0   | 8   | requireCap    | —   | ✓   | —   | 97   |
| `/hr/bonus-settlements/settle`                           | POST                | 10  | 0   | 15  | requireCap    | —   | ✓   | ✓   | 236  |
| `/hr/bonus-settlements/write-pending`                    | POST                | 1   | 0   | 6   | requireCap    | —   | ✓   | ✓   | 81   |
| `/hr/salary-settlements`                                 | GET,POST            | 8   | 0   | 13  | requireCap    | —   | ✓   | ✓   | 316  |
| `/hr/salary-settlements/[id]`                            | DELETE,GET          | 4   | 0   | 9   | requireCap    | —   | ✓   | ✓   | 118  |
| `/hr/salary-settlements/[id]/submit`                     | POST                | 9   | 0   | 14  | requireCap    | —   | ✓   | ✓   | 209  |
| `/instagram/setup/lookup-from-fb`                        | GET                 | 1   | 0   | 5   | requireCap    | —   | ✓   | —   | 150  |
| `/instagram/setup/provision`                             | POST                | 1   | 0   | 6   | requireCap    | —   | ✓   | ✓   | 79   |
| `/instagram/setup/validate-credentials`                  | POST                | 1   | 0   | 5   | requireCap    | —   | ✓   | —   | 64   |
| `/instagram/webhook`                                     | GET,POST            | 0   | 0   | 1   | (public)      | —   | ✓   | —   | 334  |
| `/integrations/audit-trail`                              | GET                 | 1   | 0   | 4   | getApiCtx     | —   | ✓   | —   | 93   |
| `/integrations/registry`                                 | GET                 | 0   | 0   | 0   | (none)        | —   | —   | —   | 28   |
| `/integrations/usage`                                    | GET                 | 0   | 0   | 3   | getApiCtx     | —   | ✓   | —   | 96   |
| `/invoice-batches`                                       | GET                 | 5   | 0   | 7   | getServerAuth | —   | ✓   | —   | 157  |
| `/invoices`                                              | POST                | 4   | 0   | 7   | getServerAuth | ✓   | ✓   | ✓   | 167  |
| `/itineraries/[id]`                                      | GET                 | 6   | 0   | 10  | requireCap    | —   | ✓   | —   | 285  |
| `/itineraries/by-tour/[tourId]`                          | GET                 | 1   | 0   | 5   | requireCap    | —   | ✓   | —   | 44   |
| `/job-roles/selector-fields`                             | GET,POST            | 4   | 0   | 9   | requireCap    | —   | —   | ✓   | 128  |
| `/job-roles/selector-fields/[fieldId]`                   | DELETE,PUT          | 4   | 0   | 9   | requireCap    | —   | —   | ✓   | 120  |
| `/line/admin/refresh-group-profiles`                     | POST                | 0   | 0   | 4   | requireCap    | —   | ✓   | —   | 185  |
| `/line/conversations`                                    | GET                 | 4   | 0   | 8   | requireCap    | ✓   | ✓   | —   | 104  |
| `/line/conversations/[lineUserId]`                       | GET                 | 1   | 0   | 5   | requireCap    | ✓   | ✓   | —   | 64   |
| `/line/conversations/[lineUserId]/bind-customer`         | POST                | 2   | 0   | 7   | requireCap    | —   | ✓   | ✓   | 108  |
| `/line/conversations/[lineUserId]/customer-orders`       | GET                 | 3   | 0   | 7   | requireCap    | —   | ✓   | —   | 163  |
| `/line/conversations/[lineUserId]/messages`              | POST                | 2   | 0   | 7   | requireCap    | —   | ✓   | ✓   | 114  |
| `/line/conversations/[lineUserId]/pause`                 | GET,POST            | 2   | 0   | 7   | requireCap    | —   | ✓   | ✓   | 110  |
| `/line/postback-templates`                               | GET,POST            | 2   | 0   | 6   | requireCap    | —   | ✓   | —   | 90   |
| `/line/postback-templates/[id]`                          | DELETE,PATCH        | 2   | 0   | 6   | requireCap    | —   | ✓   | —   | 92   |
| `/line/setup/provision`                                  | POST                | 1   | 0   | 6   | requireCap    | —   | ✓   | ✓   | 91   |
| `/line/setup/status`                                     | GET                 | 1   | 0   | 5   | requireCap    | —   | ✓   | —   | 62   |
| `/line/setup/validate-credentials`                       | POST                | 1   | 0   | 5   | requireCap    | —   | ✓   | —   | 79   |
| `/line/webhook`                                          | GET,POST            | 18  | 0   | 19  | (public)      | ✗×1 | ✓   | —   | 838  |
| `/log-error`                                             | POST                | 0   | 0   | 2   | getServerAuth | —   | —   | —   | 40   |
| `/marketing/website/[code]`                              | PUT                 | 2   | 0   | 7   | requireCap    | ✓   | ✓   | ✓   | 148  |
| `/marketing/website/rebuild`                             | POST                | 0   | 0   | 4   | requireCap    | —   | —   | —   | 107  |
| `/messaging/conversations`                               | GET                 | 2   | 0   | 6   | requireCap    | —   | —   | —   | 121  |
| `/messaging/conversations/[id]`                          | PATCH               | 0   | 0   | 5   | requireCap    | ✓   | —   | ✓   | 143  |
| `/messaging/conversations/[id]/avatar`                   | POST                | 2   | 0   | 6   | requireCap    | —   | —   | —   | 99   |
| `/messaging/conversations/[id]/memory`                   | DELETE,GET,PATCH    | 3   | 0   | 7   | requireCap    | —   | —   | —   | 180  |
| `/messaging/conversations/[id]/memory/regenerate`        | POST                | 1   | 0   | 5   | requireCap    | —   | ✓   | —   | 73   |
| `/messaging/conversations/[id]/messages`                 | GET                 | 2   | 0   | 6   | requireCap    | ✓   | —   | —   | 99   |
| `/messaging/conversations/[id]/notes`                    | GET,POST            | 2   | 0   | 6   | requireCap    | —   | —   | —   | 108  |
| `/messaging/conversations/[id]/reply`                    | POST                | 0   | 0   | 5   | requireCap    | —   | —   | ✓   | 72   |
| `/messaging/conversations/[id]/retrospective`            | POST                | 3   | 0   | 7   | requireCap    | —   | ✓   | —   | 199  |
| `/messaging/conversations/[id]/retrospectives`           | GET                 | 1   | 0   | 5   | requireCap    | —   | —   | —   | 54   |
| `/messaging/conversations/[id]/retrospectives/[retroId]` | DELETE,PATCH        | 1   | 0   | 5   | requireCap    | —   | —   | —   | 106  |
| `/ocr/passport`                                          | POST                | 1   | 0   | 6   | requireCap    | —   | ✓   | ✓   | 170  |
| `/ocr/passport/batch-reprocess`                          | GET,POST            | 10  | 0   | 15  | requireCap    | ✗×2 | ✓   | ✓   | 364  |
| `/organization/branches`                                 | DELETE,GET,POST,PUT | 0   | 0   | 0   | (none)        | —   | —   | —   | 19   |
| `/organization/brands`                                   | DELETE,GET,POST,PUT | 0   | 0   | 0   | (none)        | —   | —   | —   | 19   |
| `/payments/[id]/reject`                                  | POST                | 2   | 0   | 7   | requireCap    | —   | ✓   | ✓   | 123  |
| `/payments/[id]/verify`                                  | POST                | 2   | 0   | 7   | requireCap    | —   | ✓   | ✓   | 111  |
| `/permissions/features`                                  | GET,PUT             | 4   | 0   | 9   | requireCap    | —   | ✓   | ✓   | 141  |
| `/pexels/search`                                         | GET                 | 0   | 0   | 2   | getServerAuth | —   | —   | —   | 83   |
| `/public/invoices/[token]`                               | GET                 | 10  | 0   | 11  | (public)      | —   | ✓   | —   | 286  |
| `/public/invoices/[token]/pay`                           | POST                | 8   | 0   | 9   | (public)      | —   | ✓   | —   | 288  |
| `/public/registration`                                   | POST                | 7   | 0   | 9   | (public)      | ✓   | ✓   | ✓   | 350  |
| `/public/tour/[code]`                                    | GET                 | 2   | 0   | 3   | (public)      | —   | ✓   | —   | 112  |
| `/public/tour/[code]/display-canvas`                     | GET                 | 2   | 0   | 3   | (public)      | —   | ✓   | —   | 112  |
| `/public/tours`                                          | GET                 | 2   | 0   | 3   | (public)      | —   | ✓   | —   | 120  |
| `/roles`                                                 | GET,POST            | 3   | 0   | 8   | requireCap    | ✓   | —   | ✓   | 89   |
| `/roles/[roleId]`                                        | DELETE              | 2   | 0   | 7   | requireCap    | —   | —   | ✓   | 52   |
| `/roles/[roleId]/eligibility-defaults`                   | GET                 | 3   | 0   | 7   | requireCap    | ✓   | ✓   | —   | 66   |
| `/roles/[roleId]/tab-permissions`                        | GET,PUT             | 6   | 0   | 11  | requireCap    | ✓   | —   | ✓   | 182  |
| `/settings/env`                                          | GET                 | 1   | 0   | 5   | requireCap    | —   | ✓   | —   | 191  |
| `/setup-tokens`                                          | POST                | 0   | 0   | 4   | getApiCtx     | —   | ✓   | ✓   | 112  |
| `/setup-tokens/[token]`                                  | GET,PUT             | 0   | 0   | 1   | (direct)      | —   | ✓   | —   | 215  |
| `/setup/status`                                          | GET,POST            | 5   | 0   | 7   | getServerAuth | ✓   | ✓   | —   | 106  |
| `/shared-data/attractions/ai-polish`                     | POST                | 0   | 0   | 5   | requireCap    | —   | —   | ✓   | 69   |
| `/shared-data/insurance-grades`                          | GET,POST            | 2   | 0   | 7   | requireCap    | —   | ✓   | ✓   | 102  |
| `/storage/upload`                                        | DELETE,POST         | 5   | 0   | 8   | getServerAuth | —   | ✓   | ✓   | 194  |
| `/supplier-pricing`                                      | GET,POST            | 3   | 0   | 7   | requireCap    | —   | ✓   | —   | 84   |
| `/tenants/create`                                        | POST                | 3   | 0   | 8   | requireCap    | ✗×1 | ✓   | ✓   | 293  |
| `/todo-columns`                                          | DELETE,GET,POST,PUT | 6   | 0   | 11  | requireCap    | ✓   | —   | ✓   | 136  |
| `/tours/[code]/ai-assist`                                | POST                | 0   | 0   | 4   | requireCap    | —   | —   | —   | 207  |
| `/tours/[code]/display-canvas`                           | GET,PUT             | 3   | 0   | 8   | requireCap    | —   | —   | ✓   | 203  |
| `/tours/[code]/display-canvas/publish`                   | POST                | 3   | 0   | 8   | requireCap    | —   | —   | ✓   | 128  |
| `/tours/[code]/display-canvas/unpublish`                 | POST                | 2   | 0   | 7   | requireCap    | —   | —   | ✓   | 88   |
| `/unsplash/search`                                       | GET                 | 0   | 0   | 2   | getServerAuth | —   | —   | —   | 88   |
| `/users/[userId]/role`                                   | GET                 | 3   | 0   | 7   | requireCap    | —   | —   | —   | 77   |
| `/workspace-integrations`                                | GET,PUT             | 0   | 0   | 4   | getApiCtx     | ✓   | ✓   | ✓   | 262  |
| `/workspaces`                                            | GET                 | 4   | 0   | 6   | getServerAuth | —   | ✓   | —   | 113  |
| `/workspaces/[id]`                                       | DELETE,GET,PATCH    | 8   | 0   | 11  | getServerAuth | ✗×1 | ✓   | ✓   | 290  |
| `/workspaces/[id]/ai-health`                             | GET                 | 8   | 0   | 12  | requireCap    | —   | ✓   | —   | 298  |
| `/workspaces/[id]/ai-settings`                           | DELETE,GET,PUT      | 3   | 0   | 6   | getServerAuth | —   | ✓   | ✓   | 297  |
| `/workspaces/[id]/ai-settings/status`                    | GET                 | 1   | 0   | 3   | getServerAuth | —   | ✓   | —   | 80   |
| `/workspaces/[id]/ai-settings/validate`                  | POST                | 0   | 0   | 2   | getServerAuth | —   | —   | —   | 93   |
| `/workspaces/[id]/billing`                               | GET,POST            | 3   | 0   | 6   | getServerAuth | —   | ✓   | ✓   | 200  |
| `/workspaces/[id]/company-settings`                      | PATCH               | 6   | 0   | 11  | requireCap    | —   | ✓   | ✓   | 183  |
| `/workspaces/[id]/employee-quota`                        | GET,PATCH           | 5   | 0   | 7   | getServerAuth | —   | ✓   | —   | 184  |
| `/workspaces/[id]/happy-agent`                           | GET,PUT             | 2   | 0   | 7   | requireCap    | ✓   | ✓   | ✓   | 107  |
| `/workspaces/[id]/happy-persona`                         | GET,PUT             | 2   | 0   | 6   | requireCap    | —   | ✓   | —   | 120  |
| `/workspaces/[id]/hr-policy`                             | PATCH               | 1   | 0   | 4   | getServerAuth | ✓   | ✓   | ✓   | 84   |

## 全站 round trip 加總估算

- **全站總 sequential DB call**：442（純 `.from()` + `.rpc()`、不算 auth chain 重複查 employees）
  - 其中 `.from()`：441、`.rpc()`：1
- **隱含 auth chain 額外 round trips**：≈ 496（1 GoTrue + 1-2 DB × 守門 route 數）
- **audit context RPC**：71（每個寫入 route 1 個 RPC）
- **每個 user request 平均 round trips**（粗算）：≈ 6 個

**潛在優化 ROI 順序**：

1. **合併 auth chain**（紅線 H 允許）→ `requireCapability` 改吃 cached layout-context → 省 2 DB call × 104 個 route = ~200 個重複查省掉
2. **`error.message` → `dbErrorResponse`** → 6 個 outlier、低風險立即可改
3. **sequential `.from()` 串接 → `Promise.all`** → top 20 最肥 route 每個平均省 4×5ms = 20ms latency
4. **audit context 改 GUC（不走 RPC）** → 71 個寫入 route 每個省 2.5ms

---

## 對應 brief 的哪一節

- 對應任務 1（API route 響應時間矩陣）
- 印證 brief § 2 量化：「每個 API 內串 5-6 次 sequential DB call + 1 次外部 Auth 驗證」 — 實測「平均 ~3.4 DB call + auth chain 3 RT + 多數寫入 +1 audit RPC」
- top 5 最肥跟 brief 預期一致（會計 / 結算 / 退款類 route 都過 9 個 DB call）
- 紅線 F / G 對齊現況：99 個 route 用 admin client、是「繞 RLS 換手動 workspace 隔離」的代價、印證需要 SSOT helper（不是每個 caller 自己寫 memberCheck）
