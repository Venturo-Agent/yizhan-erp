---
tags: [logan, spec, handoff, disbursement, ui]
status: pending
phase: 3 of 5
parent: [[2026-05-14-出納單品項級重構-spec]]
estimated: 3-4 hr
priority: high
created: 2026-05-14
---

# Phase 3 UI Handoff — 新增出納單多步驟 wizard

## 背景

「出納單品項級重構」5 phase 計畫、目前狀態：

| Phase | 內容 | 狀態 |
|---|---|---|
| 1 | Schema + fork function | ✅ commit `e2d724b`、prod 已 apply |
| 2 | preview-fees API | ✅ commit `68f2e26`、prod 已 apply |
| 3 | **新增出納多步驟 wizard UI** | ⏳ **本卡** |
| 4 | bank_fee trigger | ✅ commit `8395bd9`、prod 已 apply |
| 5 | 報表 view (UNION 新舊 link) | ✅ commit `239f3c3`、prod 已 apply |

Phase 1/2/4/5 完成、後端就緒。**Phase 3 是純前端 wizard 改造**、需要 fresh context 做、不要在累積很多上下文的長 session 做。

---

## 需求總覽（William 2026-05-14 拍板）

舊版：新增出納單 = 勾「請款單」級 → 一張請款單一筆 disbursement link
新版：新增出納單 = 勾「請款單**品項**」級、按公司出帳帳戶比對銀行算手續費

新增 dialog 改成多步驟 wizard：

```
Step 1: 選公司出帳帳戶（如「合庫」）→ from_bank_account_id
Step 2: 勾選 payment_request_items（顯示同行 ✓ / 跨行 ⚠️ badge）
Step 3: 提示框「同行 X 筆 0 元 / 跨行 Y 筆、填總手續費」
Step 4: 確認 → 加入「預覽暫存」（frontend state、不寫 DB）
Step 5: 切換帳戶（國泰）、勾剩下、循環 Step 2-4
Step 6: 全部分完 → 「預覽出納單」
Step 7: 預覽按帳戶分組 + 底部總表
Step 8: 確認 → 一次儲存所有 disbursement_orders + items
```

---

## 5 Q 拍板回顧（Phase 3 設計關鍵）

| 問題 | 拍板 |
|---|---|
| 請款單能不能拆 | **可以**（fork 新請款單、原單留剩下、業務語意「最終同 status」） |
| 手續費歸誰 | **回對應 tour**（Phase 4 trigger 已實作） |
| bank_code 比對寬鬆 / 嚴格 | **嚴格**（不做集團對應、bank_code 不同就跨行） |
| Frontend state | **預覽暫存放 React state、不寫 DB**、Step 7 確認才一次寫入 |
| 跨人 race condition | **DB UNIQUE constraint 防呆**（Phase 1 已 `uniq_payment_request_item_in_disbursement`） |

---

## 動工檔案清單

### 主檔（必動）

```
src/app/(main)/finance/treasury/_disbursement/_components/
├── CreateDisbursementDialog.tsx       ← 改成 wizard（多 step）
└── create-dialog/
    ├── DisbursementItemList.tsx       ← 改 list source：payment_requests → payment_request_items
    ├── BankAccountSelector.tsx        ← 【新】Step 1 帳戶選擇
    ├── ItemPickerWithBankBadge.tsx    ← 【新】Step 2 品項勾選 + 同行/跨行 badge
    ├── FeePromptCard.tsx              ← 【新】Step 3 手續費提示框 + input
    └── PreviewByAccount.tsx           ← 【新】Step 7 按帳戶分組預覽
```

### 後端 API（需新增 1 個）

```
src/app/api/disbursement/
├── preview-fees/route.ts              ✅ 已建（Phase 2）
└── batch-create/route.ts              ← 【新】Step 8 一次寫入多張 disbursement_orders + items
```

### 不動

- Phase 1 schema（已 prod）
- Phase 4 trigger（已 prod）
- 編輯 / 取消 / 刪除出納單功能（先不重構、舊資料舊邏輯走原 link）

---

## State Machine 設計

```typescript
type WizardStep = 'select-bank' | 'pick-items' | 'fill-fee' | 'preview-all'

interface PendingBatch {
  batch_id: string         // frontend uuid、不存 DB
  from_bank_account_id: string
  from_bank_name: string   // display
  items: Array<{
    payment_request_item_id: string
    description: string
    amount: number
    supplier_name: string
    is_cross_bank: boolean
    fee_share: number      // 該品項分攤的手續費（user 在 Step 3 填總額後平均 or 按比例）
  }>
  total_fee: number        // user 在 Step 3 填的「該帳戶總手續費」
}

interface WizardState {
  step: WizardStep
  current_batch: PendingBatch | null  // 編輯中的這批
  staged_batches: PendingBatch[]      // 已加入預覽暫存的多批
  available_items: PaymentRequestItem[]  // 全部未出帳品項（從哪些 batch 排除已選的）
}
```

關鍵：**`staged_batches` 內所有 `payment_request_item_id` 不能重複**（Phase 1 UNIQUE constraint 防呆、但 frontend 也擋）

---

## 詳細 step 流程

### Step 1: select-bank
- 顯示公司 bank_accounts 下拉
- 選完進 Step 2

### Step 2: pick-items
- 列表 source：`payment_request_items where billed_at IS NULL AND id NOT IN (staged_batches 已選的)`
- 每行 column：
  - 勾選 checkbox
  - 品項描述
  - 金額
  - 供應商 + 供應商銀行（bank_name）
  - 同行/跨行 badge（綠 ✓ / 黃 ⚠️）
  - tour 名 + 請款單號
- 勾完按「下一步」進 Step 3

### Step 3: fill-fee
- 呼叫 `POST /api/disbursement/preview-fees`
  - body: `{ from_bank_account_id, payment_request_item_ids }`
- 顯示提示框：
  ```
  同行 X 筆、合計 NT$ XXX、手續費 0 元
  跨行 Y 筆、合計 NT$ YYY、需填寫總手續費
  ```
- input：「該帳戶總手續費」（user 填）
- 「加入預覽暫存」button → 把 current_batch push 進 staged_batches、回 Step 1（換帳戶繼續）或進 Step 4

### Step 4: preview-all
- 按 `from_bank_account_id` 分組顯示 `staged_batches`
- 每組顯示：帳戶名 + 該批 items + 該批總額 + 該批總手續費
- 底部總表：總筆數 / 總金額 / 總手續費
- 「確認儲存」button → call `POST /api/disbursement/batch-create`

---

## 新 API: batch-create

```
POST /api/disbursement/batch-create
Body: {
  batches: Array<{
    from_bank_account_id: string
    payment_request_item_ids: string[]
    total_fee: number
    fee_distribution: 'equal' | 'proportional'  // 平均 or 按金額比例
  }>
}

行為（in transaction）：
  - 建 batch_uuid（同 batch 內所有 disbursement 共用）
  - For each batch：
    1. 判斷哪些 request_id 是「全部出帳」、哪些是「partial」
    2. partial 的 → call fork_payment_request_for_partial_billing
    3. INSERT disbursement_orders（含 total_fee、bank_account_id、batch_uuid）
    4. INSERT disbursement_order_items（含 amount snapshot、supplier_bank_code、fee_amount、has_cross_bank_fee）
    5. UPDATE 對應 payment_requests.status = 'billing' or 'billed'

  Response: { batch_uuid, disbursement_order_ids: string[] }

Capability: finance.disbursements.write
```

---

## 風險與處理

| 風險 | 處理 |
|---|---|
| 用 React state 暫存、refresh / 關 dialog 會丟 | 加 `unsaved changes` 確認框、按 ESC / 關閉時詢問 |
| 多人同時開 dialog 勾同一品項 | DB UNIQUE constraint 擋（Phase 1 已加）、batch-create response 失敗時、UI 提示「品項已被其他出納單使用、請重新整理」 |
| 手續費分攤算法 | 預設「按金額比例」、UI 可切「平均分攤」、最終存 `disbursement_order_items.fee_amount` |
| fork 後原請款單影響 list | list 重新 fetch、fork 過的單 status 會變、user 不會看到混亂 |

---

## 測試 checklist

```
- [ ] Step 1 選帳戶 → list 顯示對的品項
- [ ] Step 2 勾品項 → badge 顯示對的同行/跨行（不同 bank_code 都跨行）
- [ ] Step 3 填手續費 → preview-fees API 算對筆數金額
- [ ] Step 4 加入暫存 → 該品項從 Step 2 list 消失（不能重複勾）
- [ ] 換帳戶 → 重複 Step 2-3、不影響之前的 batch
- [ ] Step 5 預覽 → 按帳戶分組對、總額對、總手續費對
- [ ] Step 6 確認 → DB 寫入：disbursement_orders + disbursement_order_items + 對應 fork
- [ ] partial 勾選（一張請款單只勾部分品項）→ fork 後原單剩下品項
- [ ] disbursement.status 改 'paid' → Phase 4 trigger 自動建手續費請款單到對應 tour
- [ ] v_disbursement_full view 看得到新出納單（link_mode='item'）
```

---

## 給下次 Logan session 的開場 prompt

```
讀 Logan-Workspace 內「出納單品項級重構 Phase 3 UI handoff」卡。

Phase 1/2/4/5 已完成上 prod、現在只剩 Phase 3 多步驟 wizard UI。
照卡內檔案清單動工、預估 3-4 hr。
動工前先驗證 Phase 4 trigger 已 prod（psql 連 hosted Supabase 查 trg_disbursement_paid_generate_bank_fee）。
```

---

## 相關卡

- [[2026-05-14-出納單品項級重構-spec]] — 原始 spec 5Q 拍板細節
- [[2026-05-14-RBAC-ABAC-架構-handoff]] — 同 session 拍板的權限大改、E/F/G handoff
