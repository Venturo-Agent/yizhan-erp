---
title: 品質債深掃 #1 安全 — finding 報告
created: 2026-05-15
owner: Logan
status: in-progress
---

# 安全 / 紅線品質債 finding（2026-05-15）

## 掃描範圍

工具：
- audit:rls（L1-L6 6 層守門檢查）
- audit:any-usage
- audit:status
- audit:capability-coverage（新建、scripts/audit-capability-coverage.ts）

## audit:rls finding

### ✗ 紅線 error
- **orders.code 4 處 caller**：
  - ✅ 已修 `src/app/(main)/library/customers/[id]/page.tsx`（OrderRow + select + columns key 改 order_number）
  - ✅ 已修 `src/lib/ai/context-builder.ts`（OrderRow + select + 顯示 改 order_number）
  - ⚠️ False positive 2 處（tours.code 不算砍欄位、tours 表還有 code）：
    - `src/app/api/public/invoices/[token]/route.ts:148` — tours.code OK
    - `src/lib/ai/context-builder.ts:58` — tours.code OK

### ⚠ warning
- **API return error.message 2 處**：
  - ✅ 已修 `src/app/api/setup/status/route.ts:99` → dbErrorResponse
  - ✅ 已修 `src/app/api/workspaces/[id]/hr-policy/route.ts:70` → dbErrorResponse

- **features.ts / capabilities.ts SSOT drift**：
  - features.ts 多 `channels.happy`（modules/ 沒）
  - capabilities.ts 多 17 個（含 channels.manage / facebook_bot.* / finance.advance_payment.write 等）
  - module-tabs.ts 缺 4 個 module（facebook_bot / instagram_bot / line_bot / messaging_inbox）
  - **修法**：跑 `npm run codegen:permissions` 重新衍生、或把 modules/ 補對應 defineModule
  - **優先級**：中（不爆炸但 SSOT 規範破壞）

- **60 處 'as any'**：
  - 來源：salary_settlements / bonus_pending 等新表還沒 typegen
  - **修法**：跑 `supabase gen types typescript` 重新生 types
  - **優先級**：低（功能 OK、純型別風險）

## audit:any-usage finding

**82 處 any 類型使用**（含上述 60 處 `as any`）。

**優先級**：低、跟 typegen 一起補完。

## audit:status finding

✅ 全綠、無狀態 SSOT 偏離。

## audit:file-size finding

**136 個檔超 500 行**、其中：
- `src/lib/supabase/types.ts` 9389 行（typegen 產的、不算）
- `src/types/tour.types.ts` 657 行（可拆）
- 其他 134 個（pages / components）

**優先級**：中、拆分時順手做、不急拆。

## audit:capability-coverage finding（新工具）

掃 100 個 API route 檔、147 個 endpoint、**32 個未守門**：

### 必修（紅線 #9「沒有特權」相關、寫操作沒守 capability）

- `src/app/api/disbursement/batch-create/route.ts` POST — 出納單建立！必死守
- `src/app/api/disbursement/[id]/route.ts` PATCH — 出納單編輯
- `src/app/api/disbursement/preview-fees/route.ts` POST
- `src/app/api/permissions/features/route.ts` PUT — **權限改動！絕對必修**
- `src/app/api/organization/branches/route.ts` GET/POST/PUT/DELETE — 組織 CRUD
- `src/app/api/organization/brands/route.ts` GET/POST/PUT/DELETE
- `src/app/api/organization/departments/route.ts` GET/POST/PUT/DELETE
- `src/app/api/branches/route.ts` GET
- `src/app/api/departments/route.ts` GET
- `src/app/api/workspace-integrations/route.ts` PUT
- `src/app/api/roles/route.ts` GET
- `src/app/api/roles/[roleId]/tab-permissions/route.ts` GET

### 應加進 EXCLUDED（合理例外）

- `src/app/api/_test/sentry-check/route.ts` GET — 測試端點
- `src/app/api/facebook/webhook/route.ts` GET/POST — webhook secret 守
- `src/app/api/instagram/webhook/route.ts` GET/POST — webhook secret 守
- `src/app/api/line/webhook/route.ts` POST — webhook secret 守
- `src/app/api/contracts/sign/route.ts` POST — 公開簽約 link、token 驗證
- `src/app/api/d/[code]/route.ts` GET — 公開分享 link、code 驗證
- `src/app/api/integrations/audit-trail/route.ts` GET — 看內部實作（可能用其他 guard）
- `src/app/api/integrations/registry/route.ts` GET
- `src/app/api/integrations/usage/route.ts` GET

### 待 audit 工具改進

- 工具看 `getServerAuth` 也算「有守」、但 getServerAuth 不等於有 capability check（只是登入）
- 應該分兩級：「有 auth 但沒 capability」是 yellow、「完全沒 auth」是 red
- 列入下次 audit 工具升級

## 行動計劃

### 立即做（紅線、上線前必修）
1. `/api/permissions/features` PUT — 加 requireCapability(CAPABILITIES.PERMISSIONS_WRITE)
2. `/api/disbursement/batch-create` POST — 加 requireCapability(CAPABILITIES.FINANCE_DISBURSE_WRITE)
3. `/api/disbursement/[id]` PATCH + preview-fees POST — 同上
4. `/api/organization/branches/brands/departments` — 加 requireCapability
5. `/api/workspace-integrations` PUT — 加 requireCapability

### 短期做（一天內）
6. webhook / 公開 API → 加進 EXCLUDED + 註解原因
7. SSOT drift 跑 codegen:permissions
8. typegen regen 處理 60 處 as any

### 中期做（一週內）
9. audit 工具升級：getServerAuth 跟 requireCapability 分級
10. file-size 大檔拆分

## 不在這次掃的維度
2 流程嚴謹 / 3 資料一致 / 5 效能 / 6 文檔 / 7 測試 — 等這維度結束再進下一個。
