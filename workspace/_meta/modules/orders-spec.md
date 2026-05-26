---
title: 訂單（orders）— Spec
module: orders
status: active
owner: Logan
created: 2026-05-15
related: [[tours-spec]] [[customers-spec]]
---

# Orders Module Spec

> 訂單代表「客戶向公司買團 / 商品」的合約、是 tours 與 customers 之間的橋。一張訂單對應 1 個團、N 個團員、含付款條件 / 旅客資料 / 報價金額。

## 1. Business Intent

- **解決痛點**：把客戶要參加的團變成可追蹤的銷售紀錄
- **使用者**：業務 / OP / 財務
- **互動**：tours（綁團）/ customers（綁客戶）/ receipts（收款）/ travelers（旅客明細）

## 2. 核心 entity & schema

主要表：`public.orders`

- `id` UUID PK
- `order_number` TEXT UNIQUE（譬如 `ORD-260311-001`）
- `customer_id` FK
- `tour_id` FK
- `status` ENUM: `pending` / `confirmed` / `cancelled`
- `payment_status` ENUM: `unpaid` / `partial` / `paid` / `refunded`
- `total_amount`
- `workspace_id` FK

子表：

- `order_travelers`（旅客明細）
- `receipts`（收款、order_id FK）

子模組（tab）：

- `orders.list` / `orders.create` / `orders.edit` / `orders.payments` / `orders.travelers`

## 3. 不變式（Invariants）

- I1：order.order_number 全 workspace 內 unique
- I2：order.status='cancelled' 後不可改 status / 不可加 traveler
- I3：order.payment_status='paid' 後不可砍 order
- I4：order 對應的 receipts 總和 = order.total_amount 才能 paid
- I5：order.workspace_id 一旦設、不可改

## 4. Acceptance Criteria

- [ ] AC1：建新 order 必須綁 customer + tour
- [ ] AC2：order.total_amount 可後改、但 cancelled 後不可
- [ ] AC3：旅客明細可後加、cancelled 後不可
- [ ] AC4：收款流程：建 receipt → confirm → 累計 paid 達 total_amount → order.payment_status='paid'
- [ ] AC5：orders.write capability 才能新建 / 編輯

## 5. 反例

- ❌ 不准 hardcode order_number 規則（譬如「ORD-YYYYMM-NNN」固定）— 走 codegen RPC 拿
- ❌ 不准跳過 receipt 直接改 order.payment_status
- ❌ 不准 order 砍掉但 receipt 留著（用軟刪除）

## 6. 跨 module 依賴

| 依賴 module      | 關係              | 注意                       |
| ---------------- | ----------------- | -------------------------- |
| tours            | order.tour_id     | 結團前不能 cancel order    |
| customers        | order.customer_id | 客戶刪除前要先處理 order   |
| finance.receipts | receipt.order_id  | 收款累計算 payment_status  |
| accounting       | 自動產傳票        | order confirmed → 應收帳款 |

## 7. UI / Route 對應

| Route          | Layout            |
| -------------- | ----------------- |
| /orders        | ListPageLayout    |
| /orders/[code] | ContentPageLayout |
| /orders/new    | ContentPageLayout |

## 8. Capability

- 讀：`orders.read` / 各 tab `orders.{tab}.read`
- 寫：`orders.write` / 各 tab `orders.{tab}.write`

## 9. Audit log policy

必加 recordApiAuditContext：

- 建 order / cancel order / 改 payment_status
- 加 / 砍 traveler

## 10. 變更歷史

| 日期       | 變更                 | 對應      |
| ---------- | -------------------- | --------- |
| 2026-05-15 | 初版（QDF Round 10） | this file |
