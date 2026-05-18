# Worldmove eSIM / SIM 整合規格書

```
date: 2026-05-16
status: 草稿 — 等 William 拍板
author: Logan（從 API doc v2.0.4 × yizhan-erp 架構推導）
related:
  - Worldmove Shipping System API Document v2.0.4_20260309.pdf
  - 2026-05-13-venturo-aierp-概念架構-blueprint.md
  - 2026-05-16-travel-invoice-spec.md（同批規格書）
```

---

## TL;DR

旅行社透過 ERP 向 Worldmove（世界移動）批次採購 eSIM，系統自動將 QR code 傳遞給出團旅客，並同步 SIM 使用量與狀態。整合點在**團員管理**（出發前發 eSIM）與**收款流程**（加購 eSIM 套餐），後端走獨立 `WorldmoveService`，憑證存在加密的 workspace 設定欄位，HR 權限走 `role_capabilities`，tenant 開關走 `workspace_features`。

---

## 一、這個功能是什麼

**業務背景**：旅行社帶客人出國，旅客需要上網。傳統做法是業務員幫旅客訂 eSIM，再一張一張手動發 QR code 很耗時。整合後：從 ERP 訂單頁直接批次採購 eSIM → 系統自動發 QR code email 給每位旅客 → 不需要跳 Worldmove 後台。

**供應商**：Worldmove LTD（世界移動），批發商 API（非消費者端），需向 Worldmove 申請 MerchantId / DeptId / Token。

**三種產品類型**（API productType）：

| 類型 | 說明 | Phase |
|------|------|-------|
| `0` eSIM（虛擬）| QR code 或 LPA text，掃描安裝 | Phase 1 主力 |
| `1` SIM 卡（實體）| 需填收件地址，郵寄 | Phase 2（旅行社庫存管理）|
| `2` Top-Up SIM | 補充已購 SIM 流量 | Phase 2 |

**Phase 1 範圍**：只做 eSIM，最快速整合且無實體物流需求。

---

## 二、API 架構總覽

**認證方式**：所有請求帶 `encStr`，計算規則 `SHA1(串接參數 + token)` 大寫 hex。**不是 AES，是 SHA1**（與 travelinvoice.com.tw 不同，注意區分）。

**兩套環境**（各自獨立的 MerchantId / DeptId / Token）：
- Production：`https://fmshippingsys.fastmove.com.tw`
- Test：`https://tfmshippingsys.fastmove.com.tw`

**Callback 機制**：多支 API 是非同步的（下單回傳 orderId，結果由 WM 推 callback 到我們的 URL）。Callback 必須回傳字串 `"1"`，否則 WM 每 5 秒重試，最多 3-4 次。

### Phase 1 用到的 API

| # | API | Endpoint | 方向 | 說明 |
|---|-----|----------|------|------|
| 1 | 查詢報價 | `/Api/QuoteMg/myQueryAll` | 我們→WM | 取得產品目錄 + 批發價，建議每週同步一次 |
| 2.1 | eSIM 下單 | `/Api/SOrder/mybuyesim` | 我們→WM | 下單，WM 非同步處理 |
| 2.2 | eSIM 下單 Callback | 我們自訂 URL | WM→我們 | 收到兌換碼（redemptionCode）|
| 2.3 | 查詢 eSIM 訂單 | `/Api/SOrder/querybuyesim` | 我們→WM | Callback 沒收到時主動查 |
| 2.4 | eSIM 下單+兌換 | `/Api/SOrder/mybuyesimRedemption` | 我們→WM | 下單同時立刻取得 QR code，最多 20 張/單 |
| 2.5 | 下單+兌換 Callback | 我們自訂 URL | WM→我們 | 收到 QR code + SIM 詳細資訊 |
| 2.6 | 查詢兌換訂單 | `/Api/SOrder/querybuyesimRedemption` | 我們→WM | Callback 沒收到時主動查 |
| 2.7 | eSIM 啟用通知 | 我們自訂 URL | WM→我們 | 旅客掃描啟用 eSIM 後通知 |
| 3.1 | 兌換兌換碼 | `/Api/OrderRedemption/redemption` | 我們→WM | 把 redemptionCode 換成 QR code |
| 3.2 | 兌換 Callback | 我們自訂 URL | WM→我們 | 收到 QR code |
| 6.1 | 查詢用量 | `/Api/UseageDetail/queryUsage` | 我們→WM | 查 eSIM 流量使用狀況 |
| 6.2 | eSIM 基本資料 | `/Api/UseageDetail/queryBasicInfo` | 我們→WM | 查 eSIM 生命週期狀態 |

---

## 三、關鍵業務流程

### 3.1 兩種下單模式比較

```
模式 A：先下單 → 再兌換（2.1 + 2.2 + 3.1 + 3.2）
  ✅ 每單最多 500 張 eSIM（大團適用）
  ✅ 分批兌換（可先買庫存，需要時再換 QR code）
  ❌ 非同步流程，需等 callback

模式 B：下單同時兌換（2.4 + 2.5）
  ✅ 一步拿到 QR code，最快
  ❌ 每單最多 20 張（小團）
  ❌ 不支援預付卡（IeSIM=false 的產品）
```

**建議**：ERP 預設用**模式 B**（適合 1-20 人小團），超過 20 人自動切**模式 A**（分批下單再兌換）。

### 3.2 eSIM 發放流程（主流程）

```
ERP 訂單（團員名單確定）
    ↓
業務員在「eSIM 管理」頁選產品 + 選旅客
    ↓ 每 ≤ 20 人一批（模式 B）
WorldmoveService.orderAndRedeem({ prodList, ... })
    ↓ WM 處理中（約數分鐘）
Callback 2.5 → 收到每位旅客的 QR code
    ↓
ERP 自動發 email 給旅客（含 QR code 圖片）
    ↓
旅客掃描啟用 → WM 觸發 Callback 2.7 → ERP 更新狀態為「已啟用」
```

### 3.3 超過 20 人的大團流程

```
模式 A 流程：
  步驟 1：WorldmoveService.order()（2.1）→ 拿到 redemptionCode 清單（max 500）
  步驟 2：按旅客分組，每人一個 redemptionCode
  步驟 3：WorldmoveService.redeem(redemptionCode)（3.1）→ 換成 QR code（3.2 callback）
  步驟 4：發 email 給旅客
```

---

## 四、6 層架構對照

| Layer | Worldmove eSIM 的對應 |
|-------|----------------------|
| **L1 Feature Gate** | `workspace_features.feature_code = 'esim'`（旅行社才開）|
| **L2 Capability** | `esim.orders.write`（下單）、`esim.orders.read`（查看）、`esim.products.read`（查報價）、`esim.settings.write`（設定憑證）|
| **L3 Org Scope** | 繼承 tour / order scope（eSIM 訂單掛在團，自然繼承）|
| **L4 狀態守門** | 團狀態 = `confirmed` 才能下 eSIM 訂單；eSIM 狀態 = `redeemed` 才能發 email |
| **L5 RLS** | `workspace_esim_orders` 走 `setup_workspace_scoped_rls`；`esim_items` 走 `setup_inherited_rls` |
| **L6 防呆** | SHA1 encStr 驗證 callback 真實性；callback 回傳 `"1"` 防重試洗版；重複下單攔截（orderId 唯一）；Callback 失敗有主動查詢 fallback |

---

## 五、Module 定義（src/modules/esim.ts）

```typescript
import { defineModule } from './_define'

export const EsimModule = defineModule({
  code: 'esim',
  name: 'eSIM 管理',
  description: '旅行業 eSIM 批採與發放（Worldmove）',
  category: 'basic',   // 抽成模式、不向旅行社額外收 SaaS 費
  routes: [
    '/tours/[id]/esim',           // 在團管理頁內的 eSIM tab
    '/esim',                      // 獨立 eSIM 訂單列表
    '/workspaces/[id]/esim',      // workspace 憑證設定
  ],
  exposedToHr: true,
  defaultRoles: ['admin'],
  tabs: [
    {
      code: 'orders',
      name: 'eSIM 訂單',
      description: '下訂單、查看訂單狀態、追蹤 QR code 發放',
    },
    {
      code: 'products',
      name: '產品目錄',
      description: 'Worldmove 產品報價（每週同步）',
      capabilities: ['read'],
    },
    {
      code: 'settings',
      name: '串接設定',
      description: 'MerchantId / DeptId / Token 設定',
    },
  ],
})
```

衍生的 capability codes：
```
esim.orders.read
esim.orders.write      ← 下單、兌換、發 QR code
esim.products.read     ← 查看產品目錄
esim.settings.read
esim.settings.write    ← 設定 WM 憑證
```

---

## 六、DB Schema

### 6.1 workspace_worldmove_configs（每 workspace 的 WM 憑證）

```sql
CREATE TABLE workspace_worldmove_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Worldmove 憑證（AES-256-GCM 加密存放）
  merchant_id     TEXT NOT NULL,
  dept_id         TEXT NOT NULL,
  token_enc       TEXT NOT NULL,     -- Token 加密後

  is_production   BOOLEAN NOT NULL DEFAULT false,
  is_enabled      BOOLEAN NOT NULL DEFAULT false,

  -- callback URL（WM 呼叫我們的）
  callback_url_base   TEXT,          -- e.g. https://erp.venturo.tw/api/worldmove/callback

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (workspace_id)
);

CALL setup_workspace_scoped_rls('workspace_worldmove_configs');
```

### 6.2 worldmove_products（產品目錄快取，每週同步）

```sql
CREATE TABLE worldmove_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),

  wm_product_id   TEXT NOT NULL,          -- Worldmove wmproductId（唯一值）
  product_id      TEXT,                   -- Worldmove productId
  product_name    TEXT NOT NULL,
  product_region  TEXT,
  product_type    INT NOT NULL            -- 0=eSIM 1=SIM 2=Top-Up
    CHECK (product_type IN (0,1,2)),
  product_price   INT NOT NULL,           -- 批發價 TWD
  product_c_price INT DEFAULT 0,          -- C端售價 TWD
  is_le_sim       BOOLEAN NOT NULL DEFAULT true,  -- true=WM產品 false=本地預付卡
  is_active       BOOLEAN NOT NULL DEFAULT true,

  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (workspace_id, wm_product_id)
);

CALL setup_workspace_scoped_rls('worldmove_products');
```

### 6.3 worldmove_orders（eSIM 訂單）

```sql
CREATE TABLE worldmove_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),

  -- 對應 ERP 內部
  tour_id         UUID REFERENCES tours(id),
  order_id        UUID REFERENCES orders(id),
  created_by      UUID REFERENCES employees(id),

  -- Worldmove 訂單
  wm_order_id     TEXT UNIQUE,        -- WM 回傳的 orderId（全局唯一）
  wm_order_sn     TEXT,               -- WM orderSN（eSIM mail order ID）
  order_mode      INT NOT NULL        -- 1=先訂再兌換（模式A）2=訂單兌換合一（模式B）
    CHECK (order_mode IN (1,2)),
  order_time      TEXT,               -- WM 訂單時間（字串格式）

  -- 狀態
  order_status    TEXT NOT NULL DEFAULT 'pending'
    CHECK (order_status IN ('pending','processing','completed','failed','partial')),
    -- pending=等待WM處理 processing=WM處理中 completed=全部完成 failed=失敗 partial=部分成功

  -- 統計
  total_qty       INT NOT NULL DEFAULT 0,
  completed_qty   INT NOT NULL DEFAULT 0,

  -- callback 原始資料
  api_raw_request  JSONB,
  api_raw_response JSONB,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CALL setup_workspace_scoped_rls('worldmove_orders');
```

### 6.4 worldmove_esim_items（每張 eSIM 卡的記錄）

```sql
CREATE TABLE worldmove_esim_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id),
  wm_order_id       UUID NOT NULL REFERENCES worldmove_orders(id),

  -- WM 識別欄位
  iccid             TEXT,               -- Coupon Number（WM 內部識別碼）
  rcode             TEXT,               -- Redemption Code（兌換碼）
  wm_product_id     TEXT NOT NULL,      -- wmproductId
  product_name      TEXT NOT NULL,
  product_price     INT,                -- 批發價 TWD

  -- QR code 資料（兌換後才有）
  qr_code           TEXT,               -- image URL 或 LPA text（依 qrcodeType）
  qr_code_type      INT,                -- 0=image URL 1=text 2=both
  qr_code_content   TEXT,               -- LPA text（qrcodeType=2 時）
  sale_plan_days    INT,                -- 天數

  -- SIM 技術資訊（選填，視產品）
  pin1 TEXT, pin2 TEXT,
  puk1 TEXT, puk2 TEXT,
  cf_code TEXT,                         -- Confirmation Code
  apn_explain TEXT,                     -- APN Description

  -- 旅客資訊（誰拿到這張 eSIM）
  traveler_name     TEXT,
  traveler_email    TEXT,
  traveler_order_id UUID REFERENCES orders(id),

  -- 狀態
  item_status       TEXT NOT NULL DEFAULT 'ordered'
    CHECK (item_status IN ('ordered','redeemed','email_sent','activated','expired','voided')),
    -- ordered=已下單 redeemed=已兌換QR code email_sent=已發信 activated=旅客已啟用

  -- 兌換結果
  redeem_result_code TEXT,             -- 000=成功
  redeem_result_msg  TEXT,

  -- 使用狀況（定期從 6.1 同步）
  esim_cid          TEXT,              -- eSIM Card Number
  esim_status       INT,               -- 0=Unknown 1=Active 2=Invalid
  use_start_date    TEXT,              -- useSDate timestamp
  use_end_date      TEXT,              -- useEDate timestamp
  total_usage_bytes BIGINT,            -- 累計用量（bytes）
  last_usage_synced_at TIMESTAMPTZ,

  -- 啟用通知（2.7 callback）
  activated_at      TIMESTAMPTZ,

  -- API 原始資料
  api_raw_callback  JSONB,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CALL setup_inherited_rls('worldmove_esim_items', 'worldmove_orders', 'wm_order_id');
```

---

## 七、後端 Service 架構

### 7.1 加密層（src/lib/worldmove/crypto.ts）

```typescript
// SHA1 encStr — Worldmove API 認證
// 注意：SHA1（不是 AES！與 travelinvoice 不同）
export function buildEncStr(...parts: string[]): string {
  const raw = parts.join('')  // 直接串接，不加分隔符
  return sha1(raw).toUpperCase()
}

// 驗證 WM callback 的 encStr
export function verifyCallbackEncStr(
  received: string,
  parts: string[],
  token: string
): boolean {
  const expected = buildEncStr(...parts, token)
  return received === expected
}
```

### 7.2 主 Service（src/lib/worldmove/service.ts）

```typescript
export class WorldmoveService {
  constructor(private workspaceId: string) {}

  // ── 產品目錄 ──
  async syncProducts(): Promise<WorldmoveProduct[]>
  // SHA1(merchantId+token)，每週 cron 跑

  // ── eSIM 下單（模式 B，≤20 人）──
  async orderAndRedeem(params: OrderAndRedeemParams): Promise<{ orderId: string }>
  async queryOrderAndRedeem(orderId: string): Promise<OrderAndRedeemResult>
  // 主動查詢（callback 沒到時用）

  // ── eSIM 下單（模式 A，>20 人）──
  async order(params: OrderParams): Promise<{ orderId: string }>
  async queryOrder(orderId: string): Promise<OrderResult>
  async redeem(rcode: string, qrcodeType: 0 | 1 | 2): Promise<void>
  // 分兩步：先取 redemptionCode，再換 QR code

  // ── 查詢 ──
  async queryUsage(params: { rcode?: string; simNum?: string; orderId?: string }): Promise<UsageResult>
  async queryBasicInfo(rcode: string): Promise<BasicInfoResult>

  // ── Callback 處理（在 API route 層呼叫）──
  async handleOrderCallback(payload: any): Promise<boolean>          // 2.2
  async handleOrderRedeemCallback(payload: any): Promise<boolean>    // 2.5
  async handleRedeemCallback(payload: any): Promise<boolean>         // 3.2
  async handleActivationNotification(payload: any): Promise<boolean> // 2.7

  // ── 內部 ──
  private async getConfig(): Promise<DecryptedConfig>
  private buildUrl(env: 'test' | 'production', path: string): string
  private async post(path: string, payload: Record<string, unknown>): Promise<any>
}
```

### 7.3 API Routes

```
── 我們主動呼叫 WM ──
POST /api/worldmove/products/sync          ← 同步產品目錄（cron 每週）
POST /api/worldmove/orders                 ← 新建 eSIM 訂單（模式 A 或 B）
GET  /api/worldmove/orders                 ← 訂單列表
GET  /api/worldmove/orders/[id]            ← 單筆訂單 + 子項目
POST /api/worldmove/orders/[id]/query      ← 主動查詢 WM 訂單狀態（fallback）
POST /api/worldmove/esim/[iccid]/redeem    ← 兌換 redemptionCode → QR code（模式 A 用）
POST /api/worldmove/esim/[iccid]/send-email ← 手動補發 QR code email 給旅客
GET  /api/worldmove/esim/[iccid]/usage     ← 查流量

── WM 呼叫我們（Callback）──
POST /api/worldmove/callback/order         ← 2.2 eSIM 下單結果
POST /api/worldmove/callback/order-redeem  ← 2.5 下單+兌換結果
POST /api/worldmove/callback/redeem        ← 3.2 兌換碼換 QR code 結果
POST /api/worldmove/callback/activation    ← 2.7 旅客啟用 eSIM 通知
POST /api/worldmove/callback/sim-activated ← 5.5 SIM 啟用通知（Phase 2）
POST /api/worldmove/callback/sim-closed    ← 5.6 SIM 關閉通知（Phase 2）
```

**Callback 安全**：每支 callback 進來都要用 `verifyCallbackEncStr` 驗 `encStr`，不符合直接回傳 `"1"`（避免 WM 重試洗版）但不處理資料。

---

## 八、與 ERP 現有流程的整合點

### 8.1 團管理頁 → eSIM Tab

位置：`/tours/[id]` → 新增「eSIM」tab（需 `esim.orders.write`）

流程：
```
1. 選擇產品（從 worldmove_products 撈，按地區/天數篩選）
2. 選擇旅客（從 tour_members 撈，預填 name + email）
3. 確認金額（批發價 × 人數）
4. 送出 → WorldmoveService.orderAndRedeem()
5. 等待 callback → UI 顯示進度（每張 eSIM 狀態）
6. 全部 redeemed → 一鍵發 QR code email 給所有旅客
```

### 8.2 Email 發送（已拍板）

**結論**：`systemMail=false`，由 ERP 自己發，走 **Resend** 服務。

- 寄件地址：`noreply@venturo.tw`（漫途統一品牌，Phase 1）
- Phase 2 開放各旅行社填自訂網域（workspace 設定頁預留欄位，驗證 SPF/DKIM 後啟用）
- 信件內容：QR code 圖片 + 產品名稱 + 使用有效期間 + 安裝說明連結
- Resend API key 存 `~/.config/venturo/secrets.env`，變數名 `$RESEND_API_KEY`

### 8.3 收款加購流程（選配）

旅客付費加購 eSIM → 收款確認後自動觸發下單（與 travel_invoice 整合點同層）。Phase 2 實作。

---

## 九、租戶管理（Workspace 層）

### 9.1 workspace 設定頁新 Tab

位置：`/workspaces/[id]` → 「eSIM 串接」tab

設定欄位：
- Merchant ID
- Department ID
- Token（輸入後 AES-256-GCM 加密存放，顯示時 mask）
- 環境切換（測試 / 正式）
- Callback URL 前綴（預設為 `https://erp.venturo.tw/api/worldmove/callback`）
- 系統發信 or WM 發信
- 測試連線按鈕（呼叫報價 API 驗證憑證）

### 9.2 HR 權限頁

`/hr/roles` 自動出現「eSIM 管理」module（`exposedToHr: true`）：
- 下訂單 / 兌換 / 發信：`esim.orders.write`
- 查看訂單：`esim.orders.read`
- 查看產品報價：`esim.products.read`
- 設定串接憑證：`esim.settings.write`（建議只給有 `hr.roles.write` capability 的 role）

---

## 十、前端頁面規劃

### 10.1 /tours/[id]/esim — 團 eSIM 管理

```
上方摘要：已購 N 張 / 已發送 M 張 / 已啟用 K 張
操作按鈕：新增 eSIM 訂單 / 一鍵發信（已兌換但未發信的）

表格欄位：旅客 | 產品 | QR code 狀態 | 發信時間 | 啟用時間 | 流量

狀態 badge：
  等待中   → 灰
  處理中   → 黃
  已兌換   → 藍（可發信）
  已發信   → 綠（等旅客啟用）
  已啟用   → 深綠
  失敗     → 紅
```

### 10.2 /esim — 全局 eSIM 訂單列表

篩選：日期 / 團名 / 產品地區 / 狀態
欄位：訂單編號 | 關聯團 | 數量 | 狀態 | 建立時間

### 10.3 eSIM 下單 Dialog（NewEsimOrderDialog）

```
步驟 1：選產品
  - 地區篩選（productRegion）
  - 天數篩選（salePlanDays）
  - 選定 wmproductId + 顯示批發價

步驟 2：選旅客
  - 從 tour_members 自動帶入
  - 每位旅客填確認 email（可編輯）
  - 超過 20 人提示「將分批下單（模式 A）」

步驟 3：確認
  - 顯示費用明細（批發價 × 人數）
  - 確認按鈕（disabled={loading}，防連點）
```

---

## 十一、已知限制 / 雷區

| 限制 | 說明 | ERP 層對應 |
|------|------|-----------|
| **查詢頻率限制** | 報價 API 建議每週一次，不可每次下單前查 | Cron 每週同步，ERP 用本地快取 |
| **模式 B 上限 20 張** | 超過自動切模式 A | 下單時自動判斷拆批 |
| **模式 A 上限 500 張** | 一個訂單最多 500 張 | 若超過 500 人的超大團，分多個訂單 |
| **Callback 不穩定** | WM 說「約 3 分鐘內」，實際視情況 | UI 顯示等待中 + 有主動查詢 fallback 按鈕 |
| **流量更新延遲** | 每 2-3 小時 to 一天（電信商決定）| 告知旅行社不要期待即時數字 |
| **預付卡不支援兌換** | IeSIM=false 的產品不能用模式 B | 下單前過濾 IeSIM=false 的產品 |
| **encStr 不同計算方式** | 各 API encStr 串接順序不同（見文件每支 API 說明）| Service 層每個 method 各自計算，不共用 |
| **Callback URL 需固定 IP** | WM 可能 block 可疑 IP | ⚠️ 2026-05-18 部署改 Vercel、出口 IP 不固定、需重新評估（過 NAT gateway / Cloudflare worker / 留專用 Vultr 中繼） |
| **Token 安全** | Token 泄漏 = 可以用我們身份下單 | AES-256-GCM 加密存 DB，傳輸不走 plaintext |

---

## 十二、實作順序建議

**Phase 1A：基礎建設（約 2 天）**
- [ ] `src/modules/esim.ts` defineModule
- [ ] `npm run codegen:permissions` 產出 capabilities
- [ ] DB migration：4 張表 + RLS
- [ ] `WorldmoveService` SHA1 加密層 + 測試連線驗證
- [ ] Workspace 設定頁（憑證輸入 + 測試連線）

**Phase 1B：核心下單（約 3 天）**
- [ ] `POST /api/worldmove/orders`（模式 B，≤20 人）
- [ ] Callback routes（2.5 + 2.7）+ encStr 驗證
- [ ] 主動查詢 fallback（2.6）
- [ ] `/tours/[id]/esim` — 下單 Dialog + 狀態列表

**Phase 1C：大團支援（約 2 天）**
- [ ] 模式 A 流程（2.1 + 2.2 + 3.1 + 3.2）
- [ ] 超過 20 人自動切模式 A

**Phase 1D：收尾（約 1 天）**
- [ ] Email 發送（我們自己發 or WM 發，workspace 設定控制）
- [ ] Cron：每週同步產品目錄
- [ ] Cron：每日同步流量（6.1）
- [ ] `/esim` 全局列表頁
- [ ] HR roles 自動出現新 module

---

## 十三、前置條件（向 Worldmove 申請的行政手續）

1. **申請帳號**：聯繫 Worldmove 業務，取得批發商帳號（Merchant 等級）
2. **取得測試環境憑證**：MerchantId / DeptId / Token（測試環境）
3. **設定 Callback URL**：在 Worldmove 後台 Settings 設定我們的 callback 網址
4. **測試環境驗證**：先跑完整流程（下單 → callback → 兌換 → QR code）
5. **申請正式環境**：測試通過後，取得正式 MerchantId / DeptId / Token
6. **正式環境費率確認**：確認批發價 vs 旅行社對客售價的 margin

（過去）漫途 Vultr server IP `167.179.97.139` 為固定 IP、符合 WM 要求；2026-05-18 後部署改 Vercel、需另尋固定 IP 方案。

---

## 十四、已拍板決定（2026-05-16 William 確認）

| 項目 | 決定 |
|------|------|
| Email 發信方 | ERP 自己發，Resend 服務，`noreply@venturo.tw`（Phase 1 統一品牌）|
| 旅行社自訂網域 | Phase 2 開放（workspace 設定頁預留欄位）|
| 下單觸發 | 業務員手動觸發（e-sync 整合留 Phase 2）|
| 實體 SIM 卡 | Phase 2 再做 |
| 定價模式 | 抽成（Worldmove 給漫途每張抽成），旅行社不額外付費，module = `basic` |
| 模式選擇 | 自動判斷：≤20 人用模式 B，>20 人用模式 A |
| 流量同步 | 每日一次 cron |

---

*Logan，2026-05-16。等 William 拍板後進 Phase 1A。*
