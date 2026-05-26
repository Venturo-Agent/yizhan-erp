---
title: 客戶（customers）— Spec
module: customers
status: active
owner: Logan
created: 2026-05-15
related: [[orders-spec]] [[tours-spec]]
---

# Customers Module Spec

> 客戶是 ERP 內最頂層的「買方」實體、訂單 / 收款 / 通訊 / 帳單都掛在客戶上。客戶不分「散客 / 同業」、type 用 field 區分。

## 1. Business Intent

- **解決痛點**：客戶資料一處維護、訂單 / 收款 / 通訊都關聯
- **使用者**：業務 / 客服 / 財務 / OP
- **互動**：orders / channels（LINE / FB / IG 對話）/ messaging_inbox

## 2. 核心 entity & schema

主要表：`public.customers`

- `id` UUID PK
- `code` TEXT UNIQUE
- `name` / `phone` / `email`
- `type` ENUM: `retail` / `peer`（散客 / 同業）
- `birthday` / `id_number`
- `workspace_id`

## 3. 不變式

- I1：customer.code 全 workspace 內 unique
- I2：phone / id_number 不可重複（同 workspace）
- I3：type 一旦設、不可改（會影響報價邏輯）
- I4：客戶有未結 order 時不可砍

## 4. Acceptance Criteria

- [ ] 建客戶必填 name + phone
- [ ] 客戶搜尋走 phone / email / name / code 模糊
- [ ] 散客 / 同業在報價時走不同 logic
- [ ] LINE bot 自動綁定到 customers（透過 line_user_id）

## 5. 反例

- ❌ 不准 hardcode customer 內「VIP」flag、所有 segmentation 走 tag / 衍生欄
- ❌ 不准砍客戶後 receipt 變孤兒（用軟刪除 + cascade）

## 6. 跨 module 依賴

| 依賴 module     | 關係                                                |
| --------------- | --------------------------------------------------- |
| orders          | order.customer_id                                   |
| channels        | channels 對話綁 customer_id（透過 line_user_id 等） |
| messaging_inbox | inbox 內訊息綁客戶                                  |

## 7. Capability

- `database.customers.read` / `database.customers.write`

## 10. 變更

| 日期       | 變更                 |
| ---------- | -------------------- |
| 2026-05-15 | 初版（QDF Round 11） |
