---
title: 會計（accounting）— Spec
module: accounting
status: active
owner: Logan
created: 2026-05-15
---

# Accounting Module Spec

> 自動從業務 module（finance / hr settle / tours close）衍生會計傳票、不靠人手 key。

## Business Intent

- 自動產傳票（receipt / payment_request / disbursement_order 觸發）
- 會計科目 / 憑證管理
- 期末結轉 / 報表（試算 / 損益 / 資產負債）

## Schema

- `journal_vouchers`：傳票 header（source_type / source_id 追溯來源）
- `journal_lines`：分錄（借 / 貸）
- `chart_of_accounts`：科目表
- `expense_categories`：費用類別 → 對應沖銷科目

## 不變式

- I1：傳票借 = 貸（balance must zero）
- I2：voucher.status='posted' 不可改、要走 reversal
- I3：source_id 唯一映射（一個 receipt 一張傳票）
- I4：紅線 D 不開後門、不准手動改 journal_lines amounts

## Acceptance Criteria

- 收款 confirmed → 自動產正向傳票
- 收款退款 → 自動產反向傳票
- 出納 paid → 自動產傳票（按供應商分組、含手續費）
- 期末結轉走 stored procedure

## 反例

- ❌ 不准 frontend 直接 INSERT journal_vouchers / journal_lines
- ❌ 不准跳過 auto-create-voucher 自己刻傳票邏輯

## 跨依賴

receipts / payment_requests / disbursement_orders → 都觸發 auto-create-voucher

## Capability

`accounting.vouchers.read|write` / `accounting.accounts.read|write` / etc.

## 變更

| 日期 | 變更 |
|------|------|
| 2026-05-15 | 初版（QDF R14） |
