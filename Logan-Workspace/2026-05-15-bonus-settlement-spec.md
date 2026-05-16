---
title: 獎金結算系統 — 業務流程重構 spec
date: 2026-05-15
author: William（業務）+ Logan（技術整理）
status: draft / 待 William review
---

# 獎金結算系統 spec

## 背景

### 舊流程（不要了）
旅遊團獎金設定 → 選日期 → 選獎金 → 點「結團」 → **系統自動產請款單**

問題：
- 「結團」這個動作混雜兩件事（改狀態 + 產財務文件）
- 沒有「主管核對」階段、獎金錯了難改
- 日期選擇沒必要（William 拍板）

### 新流程（William 2026-05-15 拍板、08:21 補充修正）

```
旅遊團獎金設定（不選日期）
  ↓
點「結團」→ 既有 ClosingReportDialog 開（HTML 預覽）
  ↓
主管在結案報告內看「收支 + 獎金」、需要可改獎金
  ↓
列印 = 確認結團（既有邏輯）：tours.status='closed' + 寫 bonus_pending
  ↓ ⚠️ 拿掉舊邏輯「自動產獎金請款」（既有 generateBonusPaymentRequest service）
獎金 pending（待結算、status='pending'）
  ↓ 主管後續還想改？在結案報告頁可改（直到 settled）
  ↓
HR 介面「獎金結算」按鈕 → 列出所有 pending bonus → 勾選 → 批次結算
  ↓
產出請款單（一張多項目、items = 每員工獎金）
```

關鍵：
- **「結團」≠「產請款」**（拿掉 generateBonusPaymentRequest）
- **「主管核對」用既有 ClosingReportDialog**、紙本只是印出來簽名、不是線下勾選
- **獎金可修改**：直到「獎金結算」批次產出請款前都可改
- **「結算」是批次操作**、產一張請款單包多項目
- 結帳單 PDF / 紙本流程 → **不需做、用既有 ClosingReportDialog 列印即可**

## DB Schema 變動

### bonus_pending 表（新建、或既有 bonus 表加欄位）

```sql
CREATE TABLE bonus_pending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  tour_id UUID NOT NULL REFERENCES tours(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT,
  -- 狀態
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
  settled_at TIMESTAMPTZ,
  settled_in_payment_request_id UUID REFERENCES payment_requests(id),
  -- audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID
);

CREATE INDEX idx_bonus_pending_status ON bonus_pending(workspace_id, status);
CREATE INDEX idx_bonus_pending_tour ON bonus_pending(tour_id);
CREATE INDEX idx_bonus_pending_settled_in ON bonus_pending(settled_in_payment_request_id) WHERE settled_in_payment_request_id IS NOT NULL;
```

注意：實際看 venturo-aierp 已有的 bonus / 獎金表、決定是新建還是 alter 加欄位。

### tours 表

- 既有 `status` 欄位確認有 `'closed'` 值
- 「結團」=`UPDATE tours SET status='closed'`、不再 trigger 自動產請款

### payment_requests 表（既有、不動 schema）

- 結算 API 寫入 → 新請款單、reason='獎金結算'
- payment_request_items 對應每員工獎金

## API 變動

### 既有需要改

1. **`/api/tours/[id]/close` 或結團 API**
- 拿掉「自動產請款」邏輯
- 只 update tours.status = 'closed'
- 同時把 tour 內所有獎金寫進 `bonus_pending` table、status=pending

2. **`/api/tours/[id]/bonuses` 獎金設定 API**
- 拿掉日期參數
- 接受 [{employee_id, amount, reason}]
- 寫進 bonus_pending（如果 tour 還沒結團、是 draft 狀態）
- 或者結團前獎金存 tour 內、結團時才寫 bonus_pending

### 新建

3. **`GET /api/hr/bonus-settlements/pending`**
- 列所有 status='pending' 的 bonus_pending
- 按團 / 按員工分組
- 提供「產生結帳單」用

4. **`POST /api/hr/bonus-settlements/generate-statement`**
- 接受 bonus_id 陣列
- 產 PDF 結帳單（給線下核對印用）
- 不動 DB 狀態

5. **`POST /api/hr/bonus-settlements/settle`**
- 接受 bonus_id 陣列（已線下核對通過的）
- transaction 內：
  - SELECT FOR UPDATE 拿這些 bonus row、WHERE status='pending'
  - 建一張 payment_request、reason='獎金結算 yyyy/mm/dd'
  - 建 payment_request_items、每員工一個 item
  - UPDATE bonus_pending SET status='settled', settled_at=now(), settled_in_payment_request_id={new id}
  - COMMIT
- 撞擊保護：FOR UPDATE + status='pending' 過濾、重複按拿不到 row、拒絕

## UI 變動

### 1. 旅遊團總覽 / 獎金設定 tab

- **拿掉日期選擇器**（路徑：`src/app/(main)/tours/[code]/_components/獎金 tab` — 實際位置待定位）
- 直接列「員工 + 獎金金額 + 原因」可編輯
- 「結團」按鈕：
  - 點 → 確認 dialog「結團後獎金不可改、確認嗎？」
  - 確認後：tours.status='closed' + 寫進 bonus_pending（pending 狀態）
  - 不再 trigger 自動產請款
- 結團後獎金鎖死（看 spec、目前傾向不能改、跟 William 確認）

### 2. HR 介面新增按鈕

- 路徑：`/hr` 或 `/hr/[新 sub-route]`
- 兩個新按鈕：
  - 「獎金結算」→ navigate `/hr/bonus-settlement`
  - 「薪資結算」→ navigate `/hr/salary-settlement`（先 placeholder、不實作）

### 3. 新頁面 /hr/bonus-settlement

- 列所有 pending bonus、按團分組（每團一張卡、卡內列員工 + 金額）
- 每筆 bonus 一個 checkbox（線下核對前先全勾、或讓使用者選）
- 兩個 action：
  - **「產生結帳單」**：選中的 bonus → 產 PDF / 列印頁、給線下核對
  - **「結算選中」**：選中的 bonus → call settle API → 產請款單
- 結算成功跳 toast「已結算、共 N 筆、產出請款單 #XXX」
- 完成後該 bonus 從列表消失（status=settled、不再列）

### 4. 結帳單 PDF 模板

- 設計版型（橫式、印出來方便手簽）
- 內容：團號 + 員工 + 金額 + 原因 + 勾選欄
- 簽核欄（主管簽名 / 日期）

## 撞擊防範（race condition）

### 場景

1. 同一 bonus 被結算兩次
2. 兩個 admin 同時拿同一批 bonus 結算
3. 結算到一半 server crash

### 解法（PostgreSQL 標準）

```sql
BEGIN;

-- 拿 row、鎖住、且狀態檢查
SELECT id FROM bonus_pending
WHERE id = ANY($1::uuid[]) AND status = 'pending'
FOR UPDATE;

-- 寫請款單
INSERT INTO payment_requests (...) RETURNING id INTO new_pr_id;
INSERT INTO payment_request_items (...) SELECT ... FROM bonus_pending WHERE id = ANY($1);

-- 標記 bonus 已結算
UPDATE bonus_pending
SET status='settled', settled_at=now(), settled_in_payment_request_id=new_pr_id
WHERE id = ANY($1) AND status='pending';

COMMIT;
```

`FOR UPDATE` 確保 row 鎖住、別人 query 同 row 會等。
`WHERE status='pending'` 確保已 settled 的 row 不會被重複處理。

如果 UPDATE 影響 0 row（全部已 settled）→ API 回 409 Conflict、提示「已被別人結算」。

## 已拍板（2026-05-15 William 答覆）

1. **結團後獎金不能直接改**：「生成結案報告就變結案」=「結團就是結團」。要改獎金 → reopen tour（reopen 流程之後 spec）。
2. **獎金原因（reason）選填**：基本上就知道是什麼、特殊情況才填。
3. **結算模型 = 按月 batch、不是 user 勾選**：
   - HR 介面進去看的是「列表」（5 月獎金 / 6 月獎金 / ... 一筆一筆）
   - 點「新增獎金」→ 產出該月的 batch（draft 狀態、系統 pull 該月 pending bonus）
   - 點「確認」→ 產請款單、batch → submitted、bonus_pending → settled
   - **獎金 + 薪資同 pattern**（薪資結算也是「列表 + 新增 + 確認」）
4. **產出的請款單**：跟一般請款單一起、之後走出納流程（merge 進出納單）、不獨立。

## DB Schema 修正（按月 batch 模型）

### 新表：bonus_settlements（batch 級）

```sql
CREATE TABLE bonus_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  period TEXT NOT NULL,  -- 'YYYY-MM' 或自由文字（譬如「2026-05」）
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  payment_request_id UUID REFERENCES payment_requests(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 防同月重複建 batch
  UNIQUE (workspace_id, period)
);

-- bonus_pending 加 batch FK
ALTER TABLE bonus_pending ADD COLUMN bonus_settlement_id UUID REFERENCES bonus_settlements(id);
```

### 同樣結構複製到薪資 salary_settlements

```sql
CREATE TABLE salary_settlements (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  -- ... 同上
);

CREATE TABLE salary_settlement_items (
  id UUID PRIMARY KEY,
  settlement_id UUID REFERENCES salary_settlements(id),
  employee_id UUID,
  amount NUMERIC(12,2),
  ...
);
```

## UI 流程修正（按月 batch）

### /hr/bonus-settlement 頁

- ContentPageLayout、title「獎金結算」
- 主內容：列表（卡片或 table）
  - 每 row：5 月獎金 / 6 月獎金 / ...
  - status badge（draft / submitted）
  - 金額總和
  - 員工人數
- 右上「新增獎金結算」按鈕：
  - 點 → 選月份 dialog（或自動帶當月）
  - 確認 → 建 bonus_settlements(period=YYYY-MM, status=draft)
  - 系統自動關聯該月所有 pending bonus（bonus_pending.bonus_settlement_id = 新 batch.id）
  - Navigate 到 detail 頁
- 點任一 row → detail 頁：
  - 列該 batch 內所有 bonus（按員工 row）
  - 顯示總額 / 人數
  - draft 狀態：可看不可改（要改去 tour 結案頁、reopen 流程）
  - 「確認」按鈕（只 draft 狀態顯示）：
    - 點 → 產 payment_request、batch.status='submitted'、bonus.status='settled'
    - 防撞擊：transaction + status check
  - submitted 狀態：顯示請款單號 + 連到 finance/treasury

### /hr/salary-settlement 頁

- 完全同 pattern、只是 source 不同（薪資從 employees 表算當月該發）
- 新增 → 系統 pull employees + 設定當月薪資 → 建 salary_settlements (draft)
- 確認 → 產請款單

## 未來 spec（reopen 流程、之後再寫）

- 結團後改獎金 → reopen tour → 怎麼處理：
  - 已寫進 bonus_pending 怎麼辦？砍掉重寫？標 stale？
  - status='pending' 的 bonus 是否一起 reopen
  - 跟既有「reopen tour」的 trigger 邏輯整合
- 跟此 spec 不衝突、之後另外設計

## 實作 phase

### Phase 1（核心、半天工）
- DB schema：bonus_pending 表
- API：close tour 拿掉自動產請款、改寫 bonus_pending
- UI：旅遊團獎金 tab 拿掉日期選擇

### Phase 2（結算流程、半天工）
- API：list pending / settle
- UI：/hr/bonus-settlement 頁面
- 撞擊測試

### Phase 3（結帳單 PDF、看 William 要不要 / 半天工）
- 結帳單 PDF 模板 + 列印頁

### Phase 4（薪資結算、未來）
- 不在此 spec 範圍

## Reference

- 既有獎金邏輯位置：`src/app/(main)/tours/[code]/_components/` 或 `_components/tour-bonus-tab.tsx`（待 grep 定位）
- payment_requests / payment_request_items 表結構：既有
- 撞擊解法參考：PostgreSQL `SELECT ... FOR UPDATE` 標準用法

---

**作者註（Logan）**：

這是 William 2026-05-15 業務拍板的方向、技術細節（schema / API / UI）由我整理。實作前先過一輪 William review、確認 5 個未拍板問題、再開工。

預計總工時 1-2 天（Phase 1 + 2 + 部分 3）。不適合凌晨倉促做。
