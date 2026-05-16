---
title: 合併 CreateDisbursementWizardDialog + EditDisbursementDialog spec
created: 2026-05-15
owner: Max（起草）→ 待接手 session 開工
status: spec ready（code 未動）
priority: high（William 拍板、venturo 慣例新增/編輯共用 dialog）
related: [[2026-05-15-出納單完整重構-spec]]
---

# 合併出納單新增/編輯 dialog

## 為什麼

William 2026-05-15 拍板：venturo 系統慣例「新增 + 編輯共用同一個 dialog」、現在兩個 dialog 並存（CreateDisbursementWizardDialog 779 行 / EditDisbursementDialog 461 行）違反原則、UX 不一致。

對比兩邊 UX：
| | 新增（wizard） | 編輯（EditDialog） |
|---|---|---|
| 帳戶選擇 | 3 個按鈕（主要/備用/現金） | dropdown |
| 流程 | 多 step（main → fill-fee → preview） | 單頁 |
| 多 batch | 支援暫存多帳戶 | 不支援 |
| 手續費 | fill-fee step 內填 | 上方 input |
| 分攤方式 | fill-fee step 內選 | 上方 dropdown |
| 列表 | 純未付款 | 未付款 + 該單已 link |
| Dialog size | h-94vh / max-w-98vw | h-85vh / max-w-95vw |

## 範圍

### 動的檔
- `src/app/(main)/finance/treasury/_disbursement/_components/CreateDisbursementWizardDialog.tsx`
  - 加 `editingOrder?: DisbursementOrder | null` prop
  - 加 editing 模式邏輯（load existing / 預勾 / single-batch submit）
- `src/app/(main)/finance/treasury/_disbursement/_components/DisbursementPage.tsx`
  - 砍 `import { EditDisbursementDialog }`
  - 砍 `{editingOrder ? <EditDis...> : <CreateDis...>}`、統一走 wizard 並傳 editingOrder
- 砍 `EditDisbursementDialog.tsx` 整檔（461 行）
- 砍 `_components/index.ts` 內 `EditDisbursementDialog` export

### 不動
- API routes：既有 POST `/api/disbursement/batch-create` 跟 PATCH `/api/disbursement/{id}` 都保留
- 其他 dialog（DetailDialog / PrintDialog 等）

## 詳細設計

### Wizard 兩種 mode

**Mode A：新增（既有行為、editingOrder == null）**
- multi-batch staging（chip 顯示已加入 batch）
- main step → 點帳戶 button → fill-fee step → 加入 staged → 回 main
- 點「預覽 & 儲存」→ preview-all step → POST batch-create

**Mode B：編輯（editingOrder != null、新加）**
- single batch only（編輯就一張單、不能 multi-batch）
- main step UI 簡化：
  - 預先勾選該 order 已 link 的 items
  - currentBank 自動設成 `editingOrder.bank_account_id`（高亮對應 button）
  - 點別的帳戶 button = 切換 bank（**不**進 fill-fee step、留在 main）
  - header 額外露：總手續費 input + 分攤方式 dropdown（取代「預覽 & 儲存」位置）
  - header「取消 + 儲存變更」按鈕
- submit → PATCH `/api/disbursement/{id}`

### State 變更

```ts
// 新增 props
interface CreateDisbursementWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editingOrder?: DisbursementOrder | null  // 新加
}

// 既有 state 沿用（editing 模式重新解釋）：
- pickedItemIds: editing 時 init = linked items
- currentBank: editing 時自動 set from order.bank_account_id
- currentFee + feeDistribution: editing 時 load from order
- stagedBatches: editing 時不用、保留 default []
```

### Load logic 改

useEffect 載入時：
- 既有：bank_accounts + items + lockedDoiRows
- 新加（editing）：linkedDoiRows for `editingOrder.id`

```ts
// filter 邏輯：
- !editingOrder（新增）：pending + !linked + !lockedInDoi（既有）
- editingOrder（編輯）：
    isInCurrentLinked
    || (pending + !lockedInOtherDoi + (!linkedOldStyle || linkedOldStyle === editingOrder.id))
```

editing 載入後額外做：
```ts
setPickedItemIds(rowsInCurrentLinked.map(r => r.id))
const matchedBankIdx = bankAccounts.findIndex(b => b.id === editingOrder.bank_account_id)
if (matchedBankIdx >= 0) setCurrentBank(bankAccounts[matchedBankIdx])
setCurrentFee(Number(editingOrder.total_fee ?? 0))
setFeeDistribution(editingOrder.fee_distribution ?? 'proportional')
setDisbursementDate(editingOrder.disbursement_date ?? '')
setPaymentMethodId(editingOrder.payment_method_id ?? '')
```

### handleSelectBank 行為

```ts
const handleSelectBank = (bankId: string) => {
  if (pickedItemIds.length === 0) {
    void alert('請先勾選要從這個帳戶付款的請款品項', 'warning')
    return
  }
  const bank = bankAccounts.find(b => b.id === bankId)
  if (!bank) return
  setCurrentBank(bank)
  if (!editingOrder) {
    // 新增：切到 fill-fee step
    setCurrentFee(0)
    setStep('fill-fee')
  }
  // editing：留在 main step、currentBank 已切換、不切 step
}
```

### handleSubmit 分支

```ts
if (editingOrder) {
  // editing：PATCH
  await apiPatch(`/api/disbursement/${editingOrder.id}`, {
    disbursement_date: disbursementDate,
    payment_method_id: paymentMethodId,
    from_bank_account_id: currentBank?.id,
    total_fee: currentFee,
    fee_distribution: feeDistribution,
    item_ids: pickedItemIds,
  })
} else {
  // 既有 batch-create（保留不動）
}
```

### Edit mode UI 條件渲染

```tsx
// DialogTitle
{editingOrder
  ? `編輯出納單 ${editingOrder.order_number}`
  : '新增出納單(品項級)'}

// header 右側：
{editingOrder ? (
  <>
    {/* editing：直接顯示帳戶按鈕（active 高亮）+ 手續費 + 分攤 */}
    {ACCOUNT_BUTTON_LABELS.map((label, idx) => {
      const bank = bankAccounts[idx]
      const isActive = bank?.id === currentBank?.id
      return (
        <Button
          key={label}
          variant={isActive ? 'default' : 'soft-gold'}
          size="sm"
          onClick={() => bank && handleSelectBank(bank.id)}
          disabled={!bank}
        >
          {label}
        </Button>
      )
    })}
    <Input
      type="number"
      value={currentFee}
      onChange={e => setCurrentFee(Number(e.target.value) || 0)}
      placeholder="手續費"
      className="w-24"
    />
    <Select value={feeDistribution} onValueChange={v => setFeeDistribution(v as 'equal' | 'proportional')}>
      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="proportional">按金額比例</SelectItem>
        <SelectItem value="equal">平均分攤</SelectItem>
      </SelectContent>
    </Select>
    <Button variant="soft-gold" size="sm" onClick={() => handleClose(false)}>取消</Button>
    <Button variant="soft-gold" size="sm" onClick={handleSubmit} disabled={isSubmitting}>儲存變更</Button>
  </>
) : (
  <>
    {/* 新增：既有 5 按鈕（main step 才顯示） */}
    {step === 'main' && (
      <>...既有 main step buttons...</>
    )}
  </>
)}
```

### resetAll 修改

editing 模式 reset 不該砍掉 editingOrder 的 state（dialog 關閉 reset、但下次再開 editingOrder 時要 reload）。可走 `useEffect [open, editingOrder?.id]` 重 init。

## Step-by-step 開工順序（共 10 step）

⬜ **Step 1**：DisbursementPage 改、editingOrder 統一傳進 wizard
  - 砍 `import { EditDisbursementDialog }`
  - 砍 ternary `{editingOrder ? <EditDis...> : <CreateDis...>}`、改成單一 `<CreateDisbursementWizardDialog ... editingOrder={editingOrder} />`

⬜ **Step 2**：Wizard `CreateDisbursementWizardDialogProps` 加 `editingOrder?: DisbursementOrder | null`

⬜ **Step 3**：Wizard load useEffect 加 linkedDoiRows 撈取 + filter 對 editing

⬜ **Step 4**：editing 載入後、setPickedItemIds + setCurrentBank + setCurrentFee 等 init state

⬜ **Step 5**：handleSelectBank editing 不切 fill-fee step（保留 main）

⬜ **Step 6**：UI conditional render — DialogTitle / header 右側 / footer 三個地方

⬜ **Step 7**：handleSubmit editing 分支 PATCH

⬜ **Step 8**：resetAll 處理 editing reset（不擦 editingOrder、依賴 prop changes）

⬜ **Step 9**：砍 EditDisbursementDialog.tsx + index.ts 內 export

⬜ **Step 10**：type-check + lint + 動手測試（新增 / 編輯 / 取消 / 切帳戶 / 已付款不可進）

## 紅線檢核

| 紅線 | 對齊 |
|---|---|
| D 不開後門 | editing 時、已付款（paid）order 不可進編輯（DisbursementPage 既有 guard：line 184「已付款不能編輯」狀態守門需 confirm） |
| 不刪資料 | EditDisbursementDialog 純 UI、不影響 DB |
| L4 狀態守門 | API route 既有 `if (order.status !== 'pending') return 400` |
| L5 RLS | 既有 admin client 走、不動 RLS |
| #4 寫 memory 紀錄前列關鍵字 | 不適用、這是 spec 卡不是 memory |

## 已 apply 到 production 的 schema（之前 session）

不是這份 spec 的、但 fresh session 要知道：
- ✅ `workspaces` 加 transfer_fee_mode / transfer_fee_unified_amount / transfer_fee_overflow_account_id（5/15）
- ✅ `payment_request_items.supplier_id` 加 FK → suppliers(id)（5/15）
- ✅ `payment_request_items.advanced_by` / `advanced_by_name`（5/13 migration 補跑、5/15）
- ✅ `payment_request_items_select` RLS 改寬鬆（5/15）
- ✅ `fork_payment_request_for_partial_billing` RPC 修 total_amount 同步（5/15）
- ✅ 1408 筆 IMP- 改 paid、4 筆 total_amount 對齊、3 筆 billed→paid（5/15 資料修復）

## 之前 session 待辦（不阻塞合併 dialog、但要 follow-up）

1. **員工銀行欄位 schema**：employees 表加 bank_code / bank_account / bank_account_name、給「代墊人對方銀行」用
2. **wizard 顯示代墊人**：advanced_by 欄位已加、但 wizard query 沒抓、列表沒顯示「付款對象（代墊人）」+「對方銀行 = 員工帳號」
3. **舊出納單列印預覽撈不到 items**：DO260319-001 之類 5/14 之前 PR 整張 linked 機制、新 disbursement_order_items 撈不到、需要兼容

## 接手 session onboard 順序

1. read `~/.claude/CLAUDE.md` 11 條鐵律
2. read `~/.claude/INFRASTRUCTURE.md`（Mac 連線走 Pooler `aws-1-ap-southeast-1.pooler.supabase.com:5432` + `postgres.aawrgygqgemgqssflfrx`）
3. read `~/Projects/venturo-aierp/CLAUDE.md`（宅邸規範）
4. read 這份 spec
5. read `Logan-Workspace/2026-05-15-出納單完整重構-spec.md`（脈絡）
6. read `Logan-Workspace/2026-05-15-bug-PR-detail-明細不見-handoff.md`（明細 RLS 已修）
7. 開動 Step 1

## Max session 收尾紀錄（2026-05-15 04:00-04:50）

Max 這 session 動了：
- ✅ Phase 1（通知抽象層 `lib/notifications/system-notify.ts`）
- ✅ Phase 2（結帳設定 schema + UI 重組）
- ✅ DB 資料修復：1408 IMP→paid、3 billed→paid、4 total_amount 對齊、2 supplier orphan→null
- ✅ DB schema 補：transfer_fee_* 3 欄、supplier_id FK、advanced_by（漏跑 migration 補）
- ✅ RLS：payment_request_items SELECT 對齊 parent PR
- ✅ fork RPC 修 total_amount 同步
- ✅ 全站 PR status label 改 3 狀態（pending=未付款 / confirmed=待付款 / paid=已付款）
- ✅ Wizard UI：列表加狀態欄位、3 按鈕、dialog 加大、說明條砍、stepLabel 砍、按鈕搬到 header
- ✅ BKK260325A-I01-FORK-1 rename → BKK260325A-I02
- ✅ 出納單列表分類 column 砍
- ✅ 訂單成員列表：眼睛砍、編輯改詳情、操作欄純 icon
- ✅ 顧客頁 actions 欄加詳情按鈕

⚠️ Max 中間有一次 Python script regex 沒抓乾淨、把 wizard JSX 結構弄壞、後來補回。接手 session 動 wizard 時別用 Python script regex 砍 JSX、用 Edit tool 才穩。

⚠️ Cursor session 那邊也在動 sidebar.tsx（不可動）。
