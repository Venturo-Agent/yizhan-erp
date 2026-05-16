# 電子收據整合規格書（旅行業代收轉付平台）

```
date: 2026-05-16
status: 草稿 — 等 William 拍板
author: Logan（從 PDF × Atlas 架構推導）
related:
  - TRINVI_1.0.12（開立/作廢/折讓主API）
  - TRINBI_1.0.8（批次查詢API）
  - TRINCI_1.0.2（通知信補發API）
  - 2026-05-13-venturo-aierp-概念架構-blueprint.md
```

---

## TL;DR

旅行社客戶在 ERP 收款確認後、自動呼叫藍新科技 `travelinvoice.com.tw` API 開立電子收據，並同步財政部電子發票平台。整合點在 **收款確認** 觸發，後端走獨立 `TravelInvoiceService`，設定鑰匙存在加密的 workspace 設定欄位，HR 權限走既有 `role_capabilities` 系統，tenant 開關走 `workspace_features`。

---

## 一、這個功能是什麼

**業務背景**：台灣旅行社依法需對旅客開立電子收據（代收轉付性質），並上傳財政部電子發票整合服務平台。目前旅行社做法是手動登入 travelinvoice.com.tw 官網操作，和 ERP 是兩套系統。整合後：收款確認 → ERP 自動開立電子收據，不需跳出去另開分頁。

**平台**：藍新科技（Newebpay）旅行業代收轉付電子收據加值服務平台。僅限**旅行業同業公會會員**使用。

**三份 API 文件對應三個能力**：

| 文件 | 功能群組 | 主要 endpoint |
|------|----------|--------------|
| TRINVI_1.0.12（主文件）| 開立 / 作廢 / 折讓 / 變更 / 查詢 | `invoice_issue`、`invoice_invalid`、`allowance_issue` 等 |
| TRINBI_1.0.8 | 批次查詢收據 / 作廢單 / 折讓單 | `invoice_searchall`（SearchType 1/2/3/4）|
| TRINCI_1.0.2 | 補發通知信給買受人 | `notification_resend` |

---

## 二、6 層架構對照

依 `2026-05-13-venturo-aierp-概念架構-blueprint.md` 的 6 道門：

| Layer | 電子收據的對應 |
|-------|--------------|
| **L1 Feature Gate** | `workspace_features.feature_code = 'travel_invoice'`（旅行社才開）|
| **L2 Capability** | `travel_invoice.issue.write`、`travel_invoice.void.write`、`travel_invoice.allowance.write`、`travel_invoice.query.read` |
| **L3 Org Scope** | 繼承 receipts 的 scope（開立收據跟收款單掛在一起、自然繼承）|
| **L4 狀態守門** | `receipts.status = 'confirmed'` 才能開立；`invoice_status = 'issued'` 才能作廢/折讓；跨期作廢 ERP 層攔截（1-2 月 → 3/14 截止）|
| **L5 RLS** | `travel_invoices` 走 `setup_workspace_scoped_rls`；`workspace_travel_invoice_configs` 同 `workspace_settings` 走 workspace_scoped |
| **L6 防呆** | AES-256-GCM 加密 HashKey/HashIV（和現有 LINE/FB/IG 整合鑰匙同一套）；MerchantOrderNo 自動從訂單編號轉（限30字元英數底線）；跨期作廢截止日 ERP 層計算顯示警告 |

---

## 三、Module 定義（src/modules/travel_invoice.ts）

```typescript
import { defineModule } from './_define'

export const TravelInvoiceModule = defineModule({
  code: 'travel_invoice',
  name: '電子收據',
  description: '旅行業代收轉付電子收據（藍新 travelinvoice.com.tw）',
  category: 'premium',   // 付費加購、非所有租戶預設開
  routes: [
    '/finance/invoices',
    '/finance/invoices/[id]',
    '/workspaces/[id]/travel-invoice',  // workspace 設定頁 tab
  ],
  exposedToHr: true,
  defaultRoles: ['admin'],
  tabs: [
    {
      code: 'issue',
      name: '開立電子收據',
      description: '收款確認後開立、支援立即/預約兩種模式',
    },
    {
      code: 'void',
      name: '作廢收據',
      description: '作廢已開立收據（需注意跨期截止日限制）',
    },
    {
      code: 'allowance',
      name: '折讓',
      description: '部分退款折讓收據',
    },
    {
      code: 'query',
      name: '查詢記錄',
      description: '查詢電子收據、作廢單、折讓單',
      capabilities: ['read'],  // 查詢只有 read
    },
    {
      code: 'resend',
      name: '補發通知信',
      description: '補發開立/折讓/作廢通知 email 給買受人',
    },
    {
      code: 'settings',
      name: '串接設定',
      description: 'MerchantID / HashKey / HashIV 設定（HR 可勾給 admin）',
    },
  ],
})
```

衍生的 capability codes（`codegen:permissions` 跑後自動產出）：

```
travel_invoice.issue.read
travel_invoice.issue.write      ← 開立（主要動作）
travel_invoice.void.read
travel_invoice.void.write       ← 作廢
travel_invoice.allowance.read
travel_invoice.allowance.write  ← 折讓
travel_invoice.query.read       ← 查詢（只 read）
travel_invoice.resend.read
travel_invoice.resend.write     ← 補發信
travel_invoice.settings.read
travel_invoice.settings.write   ← 設定鑰匙（限 admin）
```

---

## 四、DB Schema

### 4.1 workspace_travel_invoice_configs（每個 workspace 的串接設定）

```sql
CREATE TABLE workspace_travel_invoice_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- 藍新平台給的憑證（加密存放、同 LINE/FB key 的機制）
  merchant_id       TEXT NOT NULL,          -- 旅行社統一編號 8碼
  hash_key_enc      TEXT NOT NULL,          -- HashKey AES-256-GCM 加密後
  hash_iv_enc       TEXT NOT NULL,          -- HashIV AES-256-GCM 加密後

  -- 環境
  is_production     BOOLEAN NOT NULL DEFAULT false,  -- false = 測試、true = 正式

  -- 狀態
  is_enabled        BOOLEAN NOT NULL DEFAULT false,
  surplus_count     INT,               -- 剩餘字軌數（從API回傳同步、readonly）
  last_synced_at    TIMESTAMPTZ,       -- 最後同步字軌數時間

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (workspace_id)  -- 每個 workspace 只有一筆設定
);

-- RLS
CALL setup_workspace_scoped_rls('workspace_travel_invoice_configs');
```

### 4.2 travel_invoices（電子收據記錄）

```sql
CREATE TABLE travel_invoices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID NOT NULL REFERENCES workspaces(id),

  -- 對應 ERP 內部
  receipt_id            UUID REFERENCES receipts(id),       -- 對應收款單
  order_id              UUID REFERENCES orders(id),         -- 對應訂單
  created_by            UUID REFERENCES employees(id),

  -- 藍新平台回傳欄位
  merchant_order_no     TEXT NOT NULL,          -- ERP 訂單編號轉換（30字元英數底線）
  invoice_trans_no      TEXT,                   -- 平台流水號（開立後才有）
  invoice_number        TEXT,                   -- 收據號碼 T開頭9碼（預約開立前空）
  random_num            TEXT,                   -- 防偽隨機碼 8碼

  -- 買受人資訊
  buyer_name            TEXT NOT NULL,
  buyer_email           TEXT NOT NULL,
  buyer_ubn             TEXT,                   -- 統一編號（B2B 才填）
  buyer_address         TEXT,
  buyer_phone           TEXT,
  category              TEXT NOT NULL CHECK (category IN ('B2B', 'B2C')),

  -- 收據資訊
  total_amt             INT NOT NULL,           -- 純數字、收據總金額
  item_detail           JSONB,                  -- [{ItemNum, ItemName, ItemCount, ItemWord, ItemPrice, ItemAmount}]

  -- 團資訊（旅行業特有）
  tour_name             TEXT,                   -- 團名
  tour_no               TEXT,                   -- 團號
  tour_date             DATE,                   -- 預計出團日
  seller_name           TEXT NOT NULL,          -- 經辦人名稱

  -- 狀態
  invoice_status        INT NOT NULL DEFAULT 0
    CHECK (invoice_status IN (0,1,2,3)),
    -- 0=預約開立 1=已開立 2=取消預約 3=已作廢

  tax_noted             INT DEFAULT 0 CHECK (tax_noted IN (0,1)),  -- 0=未申報 1=已申報

  -- 開立設定
  issue_type            INT NOT NULL DEFAULT 1 CHECK (issue_type IN (1,2)),
    -- 1=立即開立 2=預約開立
  scheduled_date        DATE,                   -- 預約開立日（issue_type=2 才填）

  -- 顯示用
  display_url           TEXT,                   -- 收據查看連結（平台提供）

  -- API 原始回傳（debug 用）
  api_raw_response      JSONB,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ             -- soft delete

  -- INDEX
  -- (workspace_id, created_at DESC)
  -- (workspace_id, invoice_number) UNIQUE WHERE invoice_number IS NOT NULL
  -- (workspace_id, merchant_order_no)
  -- (receipt_id)
);

CALL setup_workspace_scoped_rls('travel_invoices');
```

### 4.3 travel_allowances（折讓記錄）

```sql
CREATE TABLE travel_allowances (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id),
  invoice_id        UUID NOT NULL REFERENCES travel_invoices(id),
  created_by        UUID REFERENCES employees(id),

  -- 藍新回傳
  allowance_no      TEXT,                   -- 折讓流水號
  allowance_amt     INT NOT NULL,           -- 折讓金額
  remain_amt        INT NOT NULL,           -- 折讓後剩餘金額

  item_detail       JSONB,                  -- 折讓品項明細

  allow_status      INT NOT NULL DEFAULT 0
    CHECK (allow_status IN (0,1,2)),
    -- 0=等待折讓 1=已確認 2=取消

  buyer_email       TEXT,
  seller_name       TEXT NOT NULL,

  api_raw_response  JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CALL setup_inherited_rls('travel_allowances', 'travel_invoices', 'invoice_id');
```

### 4.4 travel_invoice_voids（作廢記錄）

```sql
CREATE TABLE travel_invoice_voids (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id),
  invoice_id        UUID NOT NULL REFERENCES travel_invoices(id),
  created_by        UUID REFERENCES employees(id),

  -- 藍新回傳
  invalid_no        TEXT,                   -- 作廢單流水號
  invalid_reason    TEXT NOT NULL,          -- 作廢原因

  invalid_status    INT NOT NULL DEFAULT 0
    CHECK (invalid_status IN (0,1,2)),
    -- 0=等待作廢 1=已確認 2=取消

  buyer_email       TEXT,
  seller_name       TEXT NOT NULL,

  api_raw_response  JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CALL setup_inherited_rls('travel_invoice_voids', 'travel_invoices', 'invoice_id');
```

---

## 五、後端 Service 架構

### 5.1 加密層（src/lib/travel-invoice/crypto.ts）

```typescript
// AES-256-CBC — 和藍新 API 對接用（不是 GCM）
// 注意：API 的 PostData_ 加密 = AES-256-CBC（藍新規格）
//       HashKey/HashIV 在 DB 存放的加密 = AES-256-GCM（我們自己的機密保護）
// 兩層不要搞混。

export function encryptPostData(
  params: Record<string, string | number>,
  hashKey: string,
  hashIv: string
): string {
  // 1. params → key=value&key=value
  // 2. AES-256-CBC PKCS#7 padding
  // 3. → hex 字串
}

export function verifyCheckCodeSearch(
  response: TravelInvoiceSearchResponse,
  hashKey: string,
  hashIv: string
): boolean {
  // SHA256(HashIV=xxx&欄位排序&HashKey=xxx) 大寫比對
}
```

### 5.2 主 Service（src/lib/travel-invoice/service.ts）

```typescript
export class TravelInvoiceService {
  constructor(private workspaceId: string) {}

  // ── 開立 ──
  async issue(params: IssueParams): Promise<IssueResult>
  async touchIssue(invoiceTransNo: string, status: 1 | 2): Promise<void>
  // status 1=確認開立 2=取消預約

  // ── 作廢 ──
  async void(params: VoidParams): Promise<VoidResult>
  async touchVoid(invalidNo: string, status: 1 | 2): Promise<void>
  // status 1=確認作廢 2=取消作廢

  // ── 折讓 ──
  async allowance(params: AllowanceParams): Promise<AllowanceResult>
  async touchAllowance(allowanceNo: string, status: 1 | 2): Promise<void>

  // ── 查詢 ──
  async queryByInvoiceNo(invoiceNumber: string): Promise<InvoiceRecord | null>
  async batchQuery(params: BatchQueryParams): Promise<InvoiceRecord[]>
  // 最多 90 天區間

  // ── 通知信 ──
  async resendNotification(params: ResendParams): Promise<void>

  // ── 內部 ──
  private async getConfig(): Promise<DecryptedConfig>
  private buildPostUrl(env: 'test' | 'production', path: string): string
  private async post(path: string, postData: Record<string, string | number>): Promise<string>
}
```

### 5.3 API Routes

```
POST /api/travel-invoice/issue          ← 開立（requireCapability travel_invoice.issue.write）
POST /api/travel-invoice/[id]/void      ← 作廢
POST /api/travel-invoice/[id]/allowance ← 折讓
POST /api/travel-invoice/[id]/resend    ← 補發信
GET  /api/travel-invoice                ← 列表查詢（travel_invoice.query.read）
GET  /api/travel-invoice/[id]           ← 單筆查詢
POST /api/travel-invoice/batch-sync     ← 批次同步（cron 每日跑）
```

---

## 六、與 ERP 現有流程的整合點

### 6.1 收款確認 → 自動開立（主流程）

```
receipts.status = 'pending'
    ↓ 收款人按「確認收款」
receipts.status = 'confirmed'
    ↓ receipt-core.service.ts 的 recalculateReceiptStats() 後
    ↓ 新增 → if (workspace has travel_invoice feature)
TravelInvoiceService.issue({
  merchantOrderNo: order.order_number,   // 轉換格式
  category: order.buyer_type,            // B2B / B2C
  buyerName: order.buyer_name,
  buyerEmail: order.buyer_email,
  buyerUbn: order.buyer_ubn,
  totalAmt: receipt.actual_amount,
  itemDetail: receipt.items,             // 收款品項 → 轉換格式
  tourName: tour.name,
  tourNo: tour.code,
  tourDate: tour.departure_date,
  sellerName: employee.name,
  status: 1,                             // 立即開立（預設）
})
```

**注意**：開立觸發是**選擇性的**，不是強制。收款確認後 ERP 顯示 badge「尚未開立電子收據」+ 按鈕，讓財務人員手動觸發，而不是全自動（因為有些收款是定金、不一定當下開完整收據）。

### 6.2 退款/取消訂單 → 作廢或折讓

```
退款種類         → 對應動作
──────────────────────────────
全退（同期別）  → invoice_invalid（作廢）
全退（跨期別）  → allowance_issue（折讓全額）
部分退款        → allowance_issue（折讓差額）
```

判斷跨期別規則（ERP 層計算）：
- 1-2 月開立 → 3/14 前可作廢，3/15 後只能折讓
- 3-4 月開立 → 5/14 前可作廢
- 以此類推（雙月制）

### 6.3 MerchantOrderNo 格式轉換

ERP 訂單編號（例 `ORD-2026-001234`）→ 需轉換為藍新格式（英數底線、最多 30 字元）：

```typescript
function toMerchantOrderNo(orderNumber: string): string {
  return orderNumber
    .replace(/-/g, '_')     // 連字符 → 底線
    .replace(/[^A-Za-z0-9_]/g, '')  // 移除其他特殊字元
    .slice(0, 30)
}
// 'ORD-2026-001234' → 'ORD_2026_001234'
```

---

## 七、租戶管理（Workspace 層）

### 7.1 workspace 設定頁新增 Tab

位置：`/workspaces/[id]` → 新增 "電子收據" tab（僅在 `workspace_features.travel_invoice = enabled` 時顯示）

設定頁欄位：
- 旅行社統一編號（MerchantID）
- HashKey（輸入後 AES-256-GCM 加密存放、顯示時 mask）
- HashIV（同上）
- 環境切換（測試 / 正式）
- 已啟用 / 停用
- 剩餘字軌數（唯讀、從平台同步）
- 測試連線按鈕

### 7.2 workspace_features seed

新租戶建立時預設 `travel_invoice = false`（付費加購後才開）。漫途內部的 workspace 可以開。

### 7.3 HR 權限頁新 Module

`/hr/roles` 頁面自動出現「電子收據」module（`exposedToHr: true`），HR admin 可以勾給哪些 role 開放：
- 開立收據：`travel_invoice.issue.write`
- 作廢收據：`travel_invoice.void.write`
- 折讓：`travel_invoice.allowance.write`
- 查詢記錄：`travel_invoice.query.read`
- 補發通知信：`travel_invoice.resend.write`
- 串接設定：`travel_invoice.settings.write`（建議只給 admin role）

---

## 八、前端頁面規劃

### 8.1 /finance/invoices — 電子收據列表

```
篩選：日期區間 / 狀態（預約/已開立/作廢）/ 團號 / 買受人
欄位：收據號碼 | 買受人 | 金額 | 開立時間 | 狀態 | 操作
操作按鈕：查看 DisplayURL | 補發信 | 作廢 | 折讓

狀態 badge 顏色：
  預約開立 → 黃
  已開立   → 綠
  作廢     → 紅
  已折讓   → 灰
  
跨期作廢警告：若收據在截止日前（例如 3/14）尚未作廢，顯示紅色 banner「此期別收據將於 X 日無法再作廢」
```

### 8.2 收款單頁 — 電子收據 Badge

在 `/finance/payments` 的收款單 row，新增欄位：
- 「未開收據」（橘色 badge）
- 「已開立 TXXXXXXXX」（綠色、點擊開 DisplayURL）
- 「已作廢」

點擊「開立電子收據」→ 打開 `IssueInvoiceDialog`：
- 確認買受人資訊（可編輯 email、選 B2B/B2C）
- 確認金額與品項
- 選擇立即開立 or 預約開立（附說明）
- 填團名/團號/出團日（從訂單自動帶入，可改）
- 確認按鈕（防連點 `disabled={loading}`）

### 8.3 IssueInvoiceDialog 欄位

| 欄位 | 預填來源 | 可否修改 |
|------|---------|---------|
| 買受人名稱 | 訂單 buyer_name | ✅ |
| 買受人 Email | 訂單 buyer_email | ✅ |
| 買受人統編 | 訂單 buyer_ubn | ✅（B2B 才顯示）|
| 收據種類 | B2B/B2C（訂單 buyer_type）| ✅ |
| 收據金額 | 收款單 actual_amount | ❌ 唯讀 |
| 商品名稱 | 團名 + 訂單品項 | ✅ |
| 團名 | tour.name | ✅ |
| 團號 | tour.code | ✅ |
| 出團日 | tour.departure_date | ✅ |
| 經辦人 | 當前登入員工 | ✅ |
| 開立方式 | 預設「立即開立」| ✅ |

---

## 九、前置條件（William 帶客戶做的行政手續）

每一家旅行社客戶上線前，業務需協助客戶完成：

1. **確認公會會員**：客戶需為旅行業同業公會會員（API 只對公會開放）
2. **開通平台帳號**：至 travelinvoice.com.tw → 右上「開通」→ 準備工商憑證讀卡機
3. **申請 IP 白名單**：
   - 下載「IP 設定申請表」→ 填寫 IP `167.179.97.139`（Vultr server）→ 蓋大小章
   - 傳真或郵寄給藍新客服
   - 等待審核（約 2-5 個工作天）
4. **取得 HashKey / HashIV**：登入平台 → 帳號管理 → 基本資料設定 → 最下方
5. **購買字軌號碼**：平台內「電子收據管理 / 申購待轉收據」→ 購買字軌（測試用 WebATM 免付款）

漫途 ERP 的 Vultr server IP 已是固定 IP（`167.179.97.139`），符合 API 要求。

---

## 十、已知限制 / 雷區

| 限制 | 說明 | ERP 層對應 |
|------|------|-----------|
| **作廢跨期限制** | 1-2 月開的 → 3/14 截止；3-4 月 → 5/14 截止 | 作廢前自動計算並顯示警告 badge |
| **折讓後不可作廢** | 收據已折讓確認後，不可再作廢 | 判斷 `invoice_status` 阻擋 UI |
| **MerchantOrderNo 格式** | 最多 30 字元、英數底線、不可含 `&` | 自動轉換函數 |
| **批次查詢 90 天上限** | 單次查詢最多 90 天區間 | 分頁批次查 |
| **每月 1 日才上傳財政部** | 開立後不是即時生效，當月 1 日批次上傳 | 告知旅行社勿期待即時查詢財政部 |
| **IP 白名單審核時間** | 約 2-5 工作天 | 行政手續提前做 |
| **字軌數耗盡** | 開立失敗前 ERP 要顯示剩餘字軌數警告 | surplus_count < 50 時顯示警告 |

---

## 十一、實作順序建議

**Phase 1：基礎建設（約 2 天）**
- [ ] `src/modules/travel_invoice.ts` defineModule 定義
- [ ] `npm run codegen:permissions` 產出 capabilities
- [ ] DB migration：`workspace_travel_invoice_configs`、`travel_invoices`、`travel_allowances`、`travel_invoice_voids`
- [ ] `setup_workspace_scoped_rls` + `setup_inherited_rls` 套上
- [ ] `TravelInvoiceService` 加密層（AES-256-CBC）+ 測試 CheckCode 生成

**Phase 2：核心功能（約 3 天）**
- [ ] `POST /api/travel-invoice/issue` — 開立
- [ ] `IssueInvoiceDialog` — 收款單頁的開立入口
- [ ] `POST /api/travel-invoice/[id]/void` — 作廢（含跨期攔截）
- [ ] `/finance/invoices` — 電子收據列表頁

**Phase 3：補完功能（約 2 天）**
- [ ] `POST /api/travel-invoice/[id]/allowance` — 折讓
- [ ] `POST /api/travel-invoice/[id]/resend` — 補發信
- [ ] Workspace 設定頁 tab（MerchantID / HashKey / HashIV 輸入）
- [ ] HR roles 頁面自動出現新 module（defineModule 接上後應自動）

**Phase 4：同步 + 監控（約 1 天）**
- [ ] 批次查詢 API 串接（`batch-sync` route）
- [ ] Cron job 每日同步剩餘字軌數
- [ ] 跨期作廢截止日警告 banner

---

## 十二、已拍板決定（2026-05-16 William 確認）

| 項目 | 決定 |
|------|------|
| **開立觸發時機** | 手動：收款確認後顯示橘色 badge，財務人員自己按「開立電子收據」|
| **預約開立預設** | 預設立即開立（Status=1），預約開立為可選項 |
| **B2B / B2C 判斷** | 每次由財務手動選，不自動帶入 |
| **定價** | premium 模式：可收一次性設定費（視業務決定），功能可模組加購 |
| **通知信語系** | 預設中文，workspace 設定頁可改為英文或其他語系 |

---

*Logan，2026-05-16。所有決定已拍板，可進 Phase 1。*
