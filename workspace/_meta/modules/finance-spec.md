---
title: 財務（finance）— Spec
module: finance
status: active
owner: Logan
created: 2026-05-15
related: [[tours-spec]] [[orders-spec]] [[accounting-spec]]
---

# Finance Module Spec

> 財務 module 涵蓋三大功能：收款（payments）/ 請款（requests）/ 出納（treasury/disbursement）。所有金流操作的「執行端」、跟 tours / orders 連結、產傳票給 accounting。

## 1. Business Intent

- 收款：把進來的錢 record 下來、綁團 / 客戶
- 請款：要錢出去（給供應商 / 員工代墊）
- 出納：實際付出（從某銀行帳戶領 / 匯）

## 2. 核心 entity & schema

主要表：
- `public.receipts`（收款單）
- `public.payment_requests`（請款單）+ `payment_request_items`
- `public.disbursement_orders`（出納單）+ `disbursement_order_items`

關鍵欄位：
- 通用：workspace_id / created_by / status / amount
- 請款：request_category（'tour' / 'company'）/ expense_type（BNS / SAL / ENT / TRV ...）
- 出納：bank_account_id / total_fee / batch_uuid

## 3. 不變式

- I1：receipt.actual_amount > 0
- I2：payment_request.status 已 'confirmed' 不可改 amount
- I3：disbursement_order 已 'paid' 不可砍 items
- I4：出納單只能從 is_disbursement_eligible=true 的帳戶出
- I5：手續費分攤走 SSOT `distributeFees` helper、不准 inline

## 4. Acceptance Criteria

- [ ] 收款：建 receipt → pending_verify → 會計 confirm → confirmed
- [ ] 請款：建 PR → 加 items → submit → confirmed → 進出納
- [ ] 出納：勾選 pending PR → 選帳戶 → 填手續費 → 產 disbursement
- [ ] 手續費：average mode 整數平均最後吃尾 / unified mode 每筆固定收
- [ ] 公司 workspaces.transfer_fee_mode 決定分攤模式（不在 wizard 內選）

## 5. 反例

- ❌ 不准跳過 verify 直接把 receipt 改 confirmed
- ❌ 不准跨 workspace 操作（RLS 守 + capability 守）
- ❌ 不准 disbursement 砍 items 但 PR.status 不還原

## 6. 跨 module 依賴

| 依賴 module | 關係 |
|------------|------|
| tours | tour_id 綁團（PR / receipt） |
| orders | order_id（receipt 主要綁這個） |
| accounting | 自動產傳票 |
| hr_*_settlement | settle 後自動產 BNS / SAL request |

## 7. UI / Route

| Route | Layout |
|-------|--------|
| /finance/payments | ListPageLayout |
| /finance/requests | ListPageLayout |
| /finance/treasury/disbursement | ContentPageLayout（自製 + wizard） |
| /finance/reports | ContentPageLayout |
| /finance/settings | ContentPageLayout |

## 8. Capability

- 各 tab 獨立 capability（finance.payments.read|write / finance.requests.read|write / finance.disbursement.read|write 等）

## 9. Audit log

所有 mutation 必加 recordApiAuditContext。已實作於：
- batch-create / [id] PATCH（出納）
- verify / reject（收款）
- 結算（薪資 / 獎金）

## 10. 變更

| 日期 | 變更 |
|------|------|
| 2026-05-15 | 初版（QDF Round 12）涵蓋三大功能 |
