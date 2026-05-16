---
title: bug 移交 — PR detail 明細欄位全不見
created: 2026-05-15
resolved: 2026-05-15（Max 同 session 內修完、移交取消）
owner: Max（venturo-aierp 男僕）
status: ✅ resolved
priority: high（user 看不到明細、業務阻塞）
related: [[2026-05-15-出納單完整重構-spec]]
---

## 結論（2026-05-15 收尾）

**Root cause**：`payment_request_items_select` RLS policy 走 `scope_visible('payment_requests', pr.id)` 嚴格規則、但 `payment_requests_select` 是寬鬆 workspace 規則。
結果 user 看得到 PR 但撈不到 items。

**修法**：migration `20260515240000_fix_payment_request_items_select_rls.sql`
- items SELECT policy 改成對齊 parent PR（workspace 一致即可）
- UPDATE / INSERT / DELETE 不動、維持 scope_visible 嚴格（紅線 D 守住）

**驗證**：William reload 後 3 筆 PR detail（KIX261223A-I01 / I02、BKK260325A-I01-FORK-1）都看得到 items。

下面是當時 handoff 草稿、保留作為脈絡。

---

# Bug：PR detail dialog 明細欄位全不見

## William 原話（5/15 03:01）

> 「我剛點進去發現底下的明細欄位、包括付款方式、類別、供應商、項目描述、單價、數量、小計、全部都不見了。」

## 場景

- William 在 **Corner workspace（角落旅行社）**（語音輸入講「Kona」）
- 點某筆請款單列表 row、開 `AddRequestDialog` 在 editingRequest mode
- Dialog 底下「項目明細」整個區域空白、看不到 items

## 已驗的 DB 真實狀況（service_role 直撈）

PR `BKK260325A-I01`（William 提到的「EKK260325A」、語音輸入錯）：
- `id`: `b9a99d75-e31e-47a6-b3e0-9b2384c7b6bb`
- `status`: `confirmed`（→ 2026-05-15 新 label「待付款」）
- `disbursement_order_id`: NULL（**注意**：confirmed + 沒綁定出納單是 invalid state、又一筆孤兒）
- `workspace_id`: `a89335d4-85f1-492b-83c7-2476ab7c5d81`（Corner）

對應 `payment_request_items` 表 3 筆完整資料：
| description | unit_price | quantity | subtotal | category | supplier_name |
|---|---|---|---|---|---|
| 03/25 台北曼谷來回機票 1 張 | 18361 | 1 | 18361 | 交通 | 長榮航空 |
| 03/26 台北曼谷來回機票 1 張 | 14487 | 1 | 14487 | 交通 | 長榮航空 |
| 機位改票費 | 6787 | 1 | 6787 | 交通 | 長榮航空 |

**結論**：資料完整、明細在 DB、是 **UI render 端壞了**。

## 已 audit 的 code

### 入口
- `src/app/(main)/finance/requests/page.tsx` line 117 `handleRowClick` → `setSelectedRequest(request)`
- 觸發 line 154 `<AddRequestDialog editingRequest={selectedRequest} />`

### Items 來源（AddRequestDialog）
- line 200：`const { items: dbRequestItems } = usePaymentRequestItems({ all: true })`
- line 377-405：`dbEditableItems` filter `item.request_id === currentRequestId`
- line 415：sync 到 `localItems`
- line 1118：`<EditableRequestItemList items={isEditMode ? localItems : requestItems} disabled={isEditMode && !canEdit} />`

### canEdit 邏輯
- line 216：`const canEdit = isEditMode ? !readOnly && currentRequest?.status === 'pending' : true`
- 對 BKK260325A-I01 (status=confirmed)：canEdit=false、disabled=true
- 但 **disabled 不該讓 items 不 render**、只該讓欄位變唯讀

## 可能 root cause（待 Cursor 排查）

### Hypothesis 1：entity hook workspace filter 把 items 過濾掉
- `usePaymentRequestItems` 走 `createEntityHook` workspaceScoped=true（line 170 `WORKSPACE_SCOPED_TABLES`）
- 自動套 `workspace_id = current_user_workspace`
- 但 items workspace_id 跟 PR 同（Corner、`a89335d4...`）、user 也在 Corner、不應該被擋
- **驗證方法**：在 dev console 印 `dbRequestItems.length` 跟 `dbRequestItems.filter(i => i.request_id === currentRequestId).length`

### Hypothesis 2：entity hook select 字串缺欄位 → 整 query 失敗 → items 為空
- `payment-request-items.ts` line 19-20：
  ```
  'id,request_id,item_number,category,supplier_id,supplier_name,description,quantity,unit_price,subtotal,amount,sort_order,workspace_id,created_at,created_by,updated_at,updated_by,notes'
  ```
- 看起來欄位都對齊 DB（5/11 schema 修過、unit_price 改名完）
- 但 `AddRequestDialog` line 387 用了 `payment_method_id`、line 395 用了 `unit_price`、line 397 用了 `confirmation_item_id`、line 400 用 `advanced_by` — 這些**不在 entity hook select**、結果 undefined
- 注意 entity hook 註解（line 18）：「下游 component 引用這些欄位會 undefined、需個別清理（不在本 fix scope）」
- **可能影響**：undefined 不會讓 items 不 render、只是欄位空、待驗

### Hypothesis 3：RLS 擋 items（user role 不對）
- payment_request_items RLS 走 `setup_workspace_scoped_rls`、跟 PR 同
- user 在 Corner workspace、應該能讀 Corner 的 items
- **驗證**：service_role 跟 user-token 撈同樣 PR、看結果差異

### Hypothesis 4：tab 切到 'company' / 'batch' 不是 'tour'
- AddRequestDialog 三個 tab：`tour` / `batch` / `company`
- BKK260325A-I01 是團體請款（看 `tour_name`）、應該在 `tour` tab
- 但 dialog 開時的 active tab 是哪個？line 198 `useResetOnTabChange(activeTab, resetForm, !isEditMode)`
- 對 isEditMode、可能 tab 沒切對、看不到 `<TabsContent value="tour">` 底下的 EditableRequestItemList

## 建議調查順序

1. **dev console 印**：reload BKK260325A-I01 detail、Console log:
   - `dbRequestItems.length`（應 ≥ 3）
   - `currentRequestId`（應該是 `b9a99d75-e31e-47a6-b3e0-9b2384c7b6bb`）
   - `localItems.length`（應 = 3）
   - `activeTab`（應是 'tour'）
2. 如果上面數字都對 → CSS 問題、看 DevTools elements 是不是被 height 0 / display none 擋住
3. 如果數字不對 → 對應 hypothesis 1/2/4 debug

## 跟我這 session 做的事的關係

我 5/15 02:00-03:00 動的東西：
- ✅ `lib/notifications/system-notify.ts` 新檔（不影響 PR detail）
- ✅ `workspaces` 表加 3 欄結帳設定（不影響 PR detail）
- ✅ `settings/company/page.tsx` UI 重組（不影響 PR detail）
- ✅ `CreateDisbursementWizardDialog.tsx` wizard 重做（不影響 PR detail）
- ✅ DB `UPDATE payment_requests SET status='paid' WHERE code LIKE 'IMP-%' AND status='confirmed' AND disbursement_order_id IS NULL`（1408 筆、不影響 Corner workspace 的 BKK 那筆）
- ✅ DB `UPDATE payment_requests SET status='paid' WHERE status IN ('billed', 'approved')`（3 筆 billed 改 paid、不在 BKK 那筆）
- ✅ `status-tone-map.ts` payment_request label 改 3 狀態
- ✅ `requests/_types.ts` statusLabels / statusColors 改 paid
- ✅ `requests/page.tsx` statusOrder 加 paid
- ✅ `requests/_hooks/useRequestTable.tsx` type 改 paid

這些**都不該動到 items 顯示邏輯**。所以 bug 應該是**這 session 之前就存在**、只是 William 今天才注意到。

## 也可能要動的（待調查確認）

如果 bug 是 entity hook select 缺欄位、需要：
- `payment-request-items.ts` line 19-20 加 `payment_method_id, custom_request_date, confirmation_item_id, advanced_by, advanced_by_name` 到 select 字串
- 但這些欄位可能 5/11 schema 已砍、要 DB confirm 才能加

## 跟 Phase 3-6 的關係

這 bug 屬於「Phase 0 之前」、阻塞所有後續 Phase（user 看不到 items 就沒法勾、沒法剔除）。建議先修這個再進 Phase 3。

## 補充：請款單 status 流程 SSOT（2026-05-15 William 拍板）

| DB 值 | UI label | 觸發 |
|---|---|---|
| `pending` | 未付款 | 新建請款單 |
| `confirmed` | 待付款 | 進出納單儲存（disbursement_order_id 綁定）|
| `paid` | 已付款 | 款項實際匯出（含舊 `billed` / `approved` 一律歸這） |

**已廢的 status**（不要在 code 再 hardcode）：
- `billed` → 已批次 UPDATE 進 paid
- `approved` → 已批次 UPDATE 進 paid

注意 `disbursement-order.service.ts` 還有 `linkRequestToOrder(requestId, order.id, 'billed')` 跟 `updatePaymentRequestStatus(requestId, 'billed')` — 是 5/14 之前的舊 service、可能 5/14 batch-create route 重構後已停用、要確認後決定要不要砍。

## 給接手 session 的 onboard

新 session 進 venturo-aierp、先讀：
1. `~/.claude/CLAUDE.md`（11 條鐵律）
2. `~/.claude/INFRASTRUCTURE.md`（連線方式：Mac 走 Pooler `aws-1-ap-southeast-1.pooler.supabase.com:5432` + `postgres.aawrgygqgemgqssflfrx`）
3. `Logan-Workspace/CLAUDE.md`（人格 SOP）
4. **這份卡**
5. `Logan-Workspace/2026-05-15-出納單完整重構-spec.md`（6 個 Phase 切分）

Phase 1 + 2 已做完、Phase 3-6 + 這 bug 待接手。
