---
title: 安全維度藍圖 — Capability / RLS / 紅線守門
created: 2026-05-15
owner: Logan
status: v0.1（active）
related: [[01-safety-findings]] [[README]]
---

# 安全維度藍圖

## 規則（之後新增 / 改 code 都遵守）

### R1 — 每個 API endpoint 都要有守門
- 寫操作（POST / PUT / PATCH / DELETE）：必須 `requireCapability(CAPABILITIES.XXX_WRITE)` 或 `getApiContext({ capabilityCode })`
- 讀操作（GET）：最低 `getServerAuth()` 確認登入、RLS 自動過濾資料
- 例外：第三方 webhook（用 webhook secret 驗證）/ 公開分享 link / 純靜態註冊表
- **不可例外**：權限改動 endpoint、組織改動 endpoint、金流 endpoint

### R2 — Capability 命名規範
- `{module}.{action}` 或 `{module}.{tab}.{action}` 兩種粒度
- action 只有 `read` / `write` 兩種、不要 `manage` / `admin` / `delete`
- 改動既有 cap 名 → 同步改 codegen + 同步改 caller（避免 SSOT drift）

### R3 — 沒有特權 / 沒有 admin bypass（鐵律 #9）
- 不准 `if (isAdmin)` / `if (user.is_admin)` / `if (role === 'admin')` short-circuit
- 不准 hardcode workspace 判斷
- 所有訪問控制走三道閘門：workspace_features + role_capabilities + RLS

### R4 — Error 訊息走 dbErrorResponse
- 不准 `return NextResponse.json({ error: error.message }, ...)` 直接吐 DB error
- 必須走 `dbErrorResponse(error)` 或 `translateDbError(error)` 包裝
- 理由：DB error 可能含 schema 細節 / 表名 / 列名、洩露架構

### R5 — 不可逆 schema 變動寫進 `_pending_review/`
- `DROP TABLE` / `DROP COLUMN with data` / `ALTER COLUMN type` silent truncate → 不要直接 apply
- 寫進 `supabase/migrations/_pending_review/`、等 W 拍板再搬正常 migrations/

## 流程（新增功能 / 改 code 時遵守）

```
寫 API endpoint
  ↓
1. 先決定 capability code（既有的還是新建？新建 → 加 capabilities.ts + 跑 codegen:permissions）
  ↓
2. handler 第一行：requireCapability(CAPABILITIES.X) 或 getApiContext({ capabilityCode })
  ↓
3. error handling 走 dbErrorResponse / translateDbError
  ↓
4. migration 寫進 supabase/migrations/（risky 的進 _pending_review/）
  ↓
5. push 前跑：
   - npm run audit:rls
   - npx tsx scripts/audit-capability-coverage.ts
   - npm run type-check
  ↓
6. 全綠才 merge
```

## 工具索引

| 工具 | 檢查項 | 命令 |
|------|--------|------|
| audit:rls | L1-L6 守門 / SSOT drift / 紅線違反 | `npm run audit:rls` |
| audit:capability-coverage | 每個 API endpoint 守門狀況 | `npx tsx scripts/audit-capability-coverage.ts` |

### audit:capability-coverage AUTH_PATTERNS（白名單、之後新增 helper 要更新）

- `requireCapability` / `requireCapabilityForResource`
- `getServerAuth` / `hasCapabilityByCode`
- `getApiContext` （context helper、含 capability check）
- `checkRateLimit` （rate limit + 通常後續有 auth）
- `listDimension|createDimension|updateDimension|deleteDimension` （organization 共用 helper）
- `handleGet|handlePost|handlePut|handleDelete|handlePatch` （wrapper pattern）
- `requireTenantAdmin` （workspace-integrations 用）
- `getCurrentWorkspaceId` （內部 enforce 登入 workspace）

### EXCLUDED_PATHS（合理例外、不檢查）

- `api/auth/` / `api/public/` / `api/setup-tokens/`
- `api/health` / `api/cron/` / `api/webhooks/`
- `api/_test/` / `api/test/`
- `api/facebook/webhook` / `api/instagram/webhook` / `api/line/webhook`
- `api/d/` / `api/contracts/sign`
- `api/integrations/registry`

## 第一輪深掃成果（2026-05-15）

### 已修
- 4 處 `orders.code` caller（schema 已砍欄位、會炸 42703）
  - `src/app/(main)/library/customers/[id]/page.tsx`
  - `src/lib/ai/context-builder.ts`
- 2 處 API return `error.message` → `dbErrorResponse`
  - `src/app/api/setup/status/route.ts`
  - `src/app/api/workspaces/[id]/hr-policy/route.ts`
- 3 處 GET endpoint 加 `getServerAuth`
  - `/api/branches` / `/api/departments` / `/api/roles/[roleId]/tab-permissions`

### 新建
- `scripts/audit-capability-coverage.ts`（138 endpoint 全綠）

### 結果
- audit:capability-coverage：32 → 0（全綠）
- audit:rls：1 error → 0、13 warn → 13 warn（剩下都是 SSOT drift + as any、待 typegen 處理）

## 下輪迭代計畫

### 短期（一週內）
1. 跑 `npm run codegen:permissions` 解 features.ts / capabilities.ts / module-tabs.ts SSOT drift
2. `supabase gen types typescript` regen typegen、減少 60 處 `as any`
3. audit:capability-coverage 升級：getServerAuth 跟 requireCapability 分級（有 auth 但無 capability 列 yellow）

### 中期（一個月內）
1. 加 audit:cap-naming-consistency（檢查 cap 命名規範）
2. 加 audit:migration-safety（檢查 migration 有沒有 rollback / 不可逆變動）
3. CronCreate 排程每天跑 audit、產 diff

### 長期（loop 全自動）
- 半夜 claude loop 自動 fix 小違規（譬如新 endpoint 缺 requireCapability、AI 補上 + PR）
- 大違規（紅線違反）寫 issue + 通知
