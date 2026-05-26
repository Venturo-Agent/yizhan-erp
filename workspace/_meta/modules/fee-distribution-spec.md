---
title: 出納單手續費分攤（fee-distribution）— Spec
module: finance (sub-spec)
status: active
owner: Logan
created: 2026-05-15
related: [[finance-spec]] [[2026-05-15-出納單完整重構-spec]]
---

# Fee Distribution Spec

> 出納單手續費分攤 SSOT helper。

## Source

- `src/lib/disbursement/fee-distribution.ts`
- `src/lib/disbursement/__tests__/fee-distribution.test.ts`（11 unit tests）

## Modes

對齊 workspaces.transfer_fee_mode：

### average mode

- 銀行實扣 N 元、平均分給「跨行」品項
- strategy `'equal'`：整數平均、最後一筆吃尾數（15/10 = 9×1 + 1×6）
- strategy `'proportional'`：按金額比例

### unified mode

- 公司向每筆收 `unified_amount_per_item`（譬如 30）
- 不分同行 / 跨行、所有 item 都收
- bank_actual_fee 是「銀行實扣」、寫 disbursement_orders.total_fee
- overflow = `total_collected - bank_actual_fee`（公司賺差）

## Public API

```ts
import { distributeFees, type FeeMode } from '@/lib/disbursement/fee-distribution'

const result = distributeFees({
  mode: 'average', // or 'unified'
  bank_actual_fee: 15,
  unified_amount_per_item: 30, // unified mode 才用
  items: [
    { id: 'a', amount: 1000, is_cross_bank: true },
    { id: 'b', amount: 2000, is_cross_bank: false },
  ],
  average_strategy: 'equal', // or 'proportional'
})
// result.per_item_fees: Map<itemId, fee>
// result.total_collected: 公司實收總額
// result.overflow: unified mode 公司賺差
```

## 不變式

- I1：average mode 只分給 cross_bank=true 的 item
- I2：unified mode 不管 cross_bank、所有 item 都收 unified_amount
- I3：integer 平均最後一筆吃尾數確保 sum = bank_actual_fee
- I4：純函式、無 DB 副作用
- I5：0 items / 全同行 / 0 fee 都不 throw、回 empty Map（QDF R55 邊界 case 覆蓋）
- I6：unified 公司虧（unified_amount × N < bank_actual_fee）也不 throw、overflow 變負數（純算、由 caller / 傳票處理）

## Caller

- `src/app/api/disbursement/batch-create/route.ts` 已 swap 用 helper

## 變更

| 日期       | 變更                                                 |
| ---------- | ---------------------------------------------------- |
| 2026-05-15 | 抽出 helper + 11 tests + batch-create swap（QDF R4） |
| 2026-05-15 | spec 文檔（QDF R32）                                 |
