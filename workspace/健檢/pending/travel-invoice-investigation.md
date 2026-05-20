# Travel Invoice 半成品深度盤點報告

> **承辦**: Max（OPENCLAW agent: main）
> **派工**: William — TI-INVESTIGATE-START
> **日期**: 2026-05-20（6/1 第一付費客戶倒數 11 天）
> **格式**: 救護車式總覽 + Part 1-4 + 三選一建議

---

## 🏥 救護車式總覽（30 秒判斷）

```
travel_invoice module — 結論：現在不能上、補完來不及、凍住最安全

已完成：  DB（4表+RLS+index）✅  |  Entity hook ✅  |  Module 註冊 ✅
未完成：  API routes ❌（0 個）  |  UI pages ❌（0 個）
6/1 現實：沒 UI + 沒 API = 客戶根本用不了
補完估工：30-40 人天（11 天來不及）
建議：凍住（Option B）— 客戶手開發票或下期再用
```

---

## Part 1：技術現況逐層盤點

### 1.1 DB 層 ✅ 完整

**Migrations（歷史累積）**：

| 檔名 | 日期 | 內容 |
|---|---|---|
| `20251204120000_create_travel_invoices.sql` | 2025-12-04 | 初版 travel_invoices 表 |
| `20260517700000_create_travel_invoice_module.sql` | 2026-05-17 | **Phase 1 本體**：4 表 + RLS + 9 index |
| `20260503260000_drop_travel_invoices_ghost_house.sql` | 2026-05-03 | 清理舊鬼屋（0 筆可砍）|

**Phase 1 Migration（`20260517700000`）建立的 4 表**：

| Table | RLS | Indexes | 狀態 |
|---|---|---|---|
| `workspace_travel_invoice_configs` | ✅ workspace_scoped | 1 個（workspace unique）| ✅ 完整 |
| `travel_invoices` | ✅ workspace_scoped + soft-delete | 5 個 | ✅ 完整 |
| `travel_allowances`（折讓單）| ✅ inherited via invoice_id | 2 個 | ✅ 完整 |
| `travel_invoice_voids`（作廢）| ✅ inherited via invoice_id | 2 個 | ✅ 完整 |

**types.ts 已同步**：4 表皆在 `src/lib/supabase/types.ts` 有完整定義（無 schema drift）。

**結論**：DB 層 Phase 1 已完工，架構乾淨（RLS/FK/index 都正確）。

---

### 1.2 Entity Hook 層 ✅ 完整

**檔案**：`src/data/entities/travel-invoices.ts`

```ts
export const useTravelInvoices        // list（分頁/排序/軟刪 filter）
export const useTravelInvoicesSlim    // slim 版（列表頁用）
export const useTravelInvoice         // detail（單筆）
export const createTravelInvoice      // create（含 workspace_id guard）
export const updateTravelInvoice      // update
export const deleteTravelInvoice      // soft-delete
export const invalidateTravelInvoices  // cache invalidate
```

**cache preset**：`CACHE_PRESETS.medium`（5min），合理。
**workspace_id**：有對，RLS 合規。
**types**：完整，無 any。

**結論**：Entity hook 層 Phase 1 已完工，CRUD 都有，realtime 支援也有。

---

### 1.3 Module 註冊層 ✅ 完整

**檔案**：`src/modules/travel_invoice.ts`

```ts
routes: [
  '/travel-invoice',       // 列表總覽
  '/travel-invoice/issue',    // 開立發票
  '/travel-invoice/void',     // 作廢發票
  '/travel-invoice/allowance', // 折讓管理
  '/travel-invoice/query',    // 發票查詢
  '/travel-invoice/resend',   // 重寄發票
  '/travel-invoice/settings', // 發票設定
]
tabs: [issue, void, allowance, query, resend, settings]  // 6 個 tab
```

**Capability 定義**（`capabilities.ts`）：
- `travel_invoice.issue.{read,write}`
- `travel_invoice.void.{read,write}`
- `travel_invoice.allowance.{read,write}`
- `travel_invoice.query.{read,write}`
- `travel_invoice.resend.{read,write}`
- `travel_invoice.settings.{read,write}`

**Feature flag**（`features.ts`）：有 `travel_invoice` 註冊，category `premium`。

**結論**：Module 註冊層完整，capability/feature/tabs 全到位。

---

### 1.4 API Route 層 ❌ 完全空白

**掃描結果**：`src/app/api/` 底下，**零個** travel-invoice 相關目錄或檔案。

對照其他已完成的模組（invoices / receipts / vouchers），標配 API routes：
- `GET/POST /api/travel-invoices`（列表 + 開立）
- `GET/PATCH/DELETE /api/travel-invoices/[id]`（單筆 CRUD）
- `POST /api/travel-invoices/[id]/void`（作廢）
- `POST /api/travel-invoices/[id]/resend`（重寄）
- `GET /api/travel-invoices/settings`（讀取 workspace 設定）

**最低標：4 個 API route 檔**，都沒做。

---

### 1.5 UI 層 ❌ 完全空白

**掃描結果**：
- `src/app/(main)/travel-invoice/` 目錄：**不存在**
- `src/components/` 或 `_components/` 中 travel-invoice 相關元件：**零個**
- `src/app/(main)/` 全域搜尋 `travelInvoice`：**零引用**

對照 Phase 1 migration 的 6 tabs（issue/void/allowance/query/resend/settings），
最低標需要 6 個 page.tsx：每個 tab 一個。

---

### 1.6 各層完工率總結

| Layer | 檔案數 | 狀態 | 完工率 |
|---|---|---|---|
| DB（migrations）| 3+1 個 | ✅ 4 表 + RLS + index | **100%** |
| Entity hook | 1 個 | ✅ CRUD + invalidate + realtime | **100%** |
| Module 註冊 | 1 個 | ✅ routes + capabilities + tabs | **100%** |
| API routes | 0 個 | ❌ 零個 | **0%** |
| UI pages | 0 個 | ❌ 零個 | **0%** |
| **整體** | | | **~40%** |

---

## Part 2：業務必要性評估

### 2.1 travel_invoice 是什麼（技術背景）

台灣旅行業適用的「電子發票」系統，分兩種場景：

| 類型 | 場景 | 發票格式 |
|---|---|---|
| **B2C 電子發票** | 一般消費者（個人旅客）| 雲端發票（存入財政部電子發票整合服務平台）|
| **B2B 二聯式發票** | 公司行號（旅行社同業）| 統一編號發票（買方報帳用）|

`travel_invoices` 表的欄位（seller_name/seller_ban/buyer_ban/carrier_type）就是支援這兩種場景。

### 2.2 第一付費客戶需要這個功能嗎？

**未取得 context**：無法從 workspace/ 或 CLAUDE.md 確認：
- 第一付費客戶是哪一家旅行社（公司名）
- 這家旅行社的客群（以 B2C 個人旅客為主，還是 B2B 同業為主）
- 這家旅行社目前怎麼開發票（手寫？Excel？還是根本沒開？）

**但可以合理推估**：

如果這家旅行社的旅客多為**一般個人消費者（B2C）**：
→ 需要電子發票（travel_invoice 的 `carrier_type: 'cloud'`）→ **業務剛需**

如果這家旅行社的旅客多為**公司行號（B2B）**：
→ 只需要一般統一編號發票 → **不需要 travel_invoice，普通 invoices 即可**

如果這家旅行社**從來沒開過發票**（補習班、非正式營運）：
→ 6/1 之前不上電子發票功能也行 → **不需要**

### 2.3 6/1「沒這功能會怎樣」？

 Worst case：
- 旅行社收了旅客的團費，要給旅客開發票
- 沒有 UI、沒有 API，**等於無法開立**
- 旅行社只好：**手寫三聯式發票** 或 **遲遲無法出貨（不開發票）**

Best case：
- 旅行社目前根本還沒用到這個功能階段（还在接單，还没到收款开票环节）
- 6/1 只是系统上线，travel_invoice 可以 later 补

---

## Part 3：補完成本估算（11 天 = 8 個工作天）

### 3.1 最低標：止血版本（Option C）

**目標**：只有一個 page + 一個 API，實現「開立發票」這一件事。

| 項目 | 數量 | 估工 |
|---|---|---|
| `/travel-invoice/issue` page.tsx | 1 個 | 3 人天（表單 + 校驗 + workspace 綁定）|
| `/api/travel-invoices` route（POST）| 1 個 | 2 人天（前端驗證 + 寫入 + 回應格式）|
| 基本設定頁面（起碼有 settings tab）| 1 個 | 1 人天 |
| **合計** | | **6 人天** |

**缺口**：
- 無作廢功能 → 開錯發票只能手動沖帳
- 無折讓功能 → 退款時無法開折讓單
- 無查詢功能 → 不確定開了沒
- 無財政部 API 串接 → 实际发票号码还是没有

### 3.2 中標：基本可用版本（具備 CRUD + 查詢）

| 項目 | 數量 | 估工 |
|---|---|---|
| 6 個 page.tsx（issue/void/allowance/query/resend/settings）| 6 個 | 12 人天 |
| 4 個 API routes（list/create/void/resend）| 4 個 | 6 人天 |
| UI 組件（發票表單、作廢確認、折讓表）| 3 套 | 5 人天 |
| config page（起碼能設定 merchant_id）| 1 個 | 1 人天 |
| **合計** | | **24 人天** |

**缺口**：
- 無財政部 API 實際串接（仍需對接 ezpay 或財政部）
- 6/1 仍無法真正開發票出去（只是有 UI）

### 3.3 標配：完整版本（Phase 1 承諾的完整功能）

| 項目 | 數量 | 估工 |
|---|---|---|
| 6 個 page.tsx | 6 個 | 12 人天 |
| 6+ API routes（含 allowance/void/settings CRUD）| 6 個 | 8 人天 |
| 財政部 API 串接（ezpay 或 invoicing）| 1 套 | 10 人天（最複雜、涉及發票字軌/配號）|
| Allowance（折讓單）專屬 API + UI | 2 個 | 4 人天 |
| RLS 回歸測試 + SWR invalidate | - | 3 人天 |
| **合計** | | **37 人天** |

### 3.4 風險分析

| 風險 | 等級 | 說明 |
|---|---|---|
| **財政部 API 串接複雜度** | 🔴 高 | 發票字軌/號碼由財政部核配、需對接平台（ezpay/invoicing），文件不完整，debug 困難 |
| **B2B/B2C 雙軌邏輯** | 🟡 中 | carrier_type = cloud（雲端）/ phone（手機載具）/ citizen（自然人憑證）/ none（不載具）— 表單校驗複雜 |
| **6 tabs 的一致性** | 🟡 中 | issue/void/allowance/query/resend/settings，每個都是獨立 page，共享元件少 |
| **11 天等於 8 個工作天** | 🟡 中 | 中間如果遇到 block（API 文件不清、William 要確認業務邏輯），來不及 |
| **沒有 QA 驗收** | 🔴 高 | 匆忙上線，發票號碼出錯會造成無法報帳 |

---

## Part 4：三選一建議（業務語言，William 看得懂）

---

### 選項 A：11 天內全力補完，6/1 上線

| 項目 | 說明 |
|---|---|
| **做法** | 全力動員，目標 6 個 page + 4 個 API + 基本財政部串接 |
| **6/1 結果** | 理論上可上線，但**發票號碼是假的**（沒真正串接財政部）|
| **業務風險** | 🔴 最高 — 旅行社開出去的發票可能是無效發票，旅客無法報帳 |
| **技術風險** | 🔴 最高 — 財政部 API 串接是Phase 1 最難的部分，11天不够 |
| **工時** | 37 人天（不可能由一人完成）|
| **現實** | ❌ 做不到 |

---

### 選項 B：凍住，客戶 6/1 手開發票，8 月後再上電子發票

| 項目 | 說明 |
|---|---|
| **做法** | 從 modules/ 拿掉 travel_invoice 註冊（移除 7 個 route），保留 DB + entity + capabilities |
| **6/1 結果** | 旅行社**手寫三聯式發票**（或 Excel），系統不出發票，但其他功能（報價、收款）正常 |
| **業務風險** | 🟢 低 — 旅行社本來就可能需要手開，系統只管報價/收款/出團 |
| **技術風險** | 🟢 低 — 完全不動 code，只移除一個 module 註冊（不到 1 小時）|
| **工時** | < 1 人天 |
| **未來** | Phase 2（8 月）再補電子發票，從凍住的 DB/Entity 起開發，速度快 |
| **現實** | ✅ 可行 |

---

### 選項 C：做一個最小可用版（只做 issue page），其餘凍住

| 項目 | 說明 |
|---|---|
| **做法** | 只做 `/travel-invoice/issue` 一個 page + 一個 POST API，其餘 5 個 route 拿掉 |
| **6/1 結果** | 旅行社**只能開立、不能作廢、不能折讓、不能查詢** |
| **業務風險** | 🟡 中 — 開錯發票時無法修正（旅客拿到錯誤發票）|
| **技術風險** | 🟡 中 — 6 人天可完成一個 page，但財政部 API 仍是假數據 |
| **工時** | 6 人天 |
| **現實** | ⚠️ 可做，但等於花 6 人天做半套，且發票仍不能真正用 |

---

### 三選一總結表

| 選項 | 6/1 可用？ | 發票真的能用？ | 工時 | 風險 | 推薦 |
|---|---|---|---|---|---|
| **A. 全補完** | 理論可 | ❌ 不能（無財政部串接）| 37人天 | 🔴 最高 | ❌ 不推薦 |
| **B. 凍住** | ❌ 不能 | ❌ 不能 | <1人天 | 🟢 低 | **✅ 推薦** |
| **C. 做最小版** | ⚠️ 半套 | ❌ 不能 | 6人天 | 🟡 中 | ⚠️ 備選 |

---

## 🏆 推薦：Option B（凍住）

### 理由（3 句话）

1. **travel_invoice 是 Phase 1 最複雜的功能**（台灣電子發票涉及財政部法規、B2C/B2B 雙軌、載具串接），不是 11 天可以品質完成的
2. **客戶 6/1 上的是「旅行社管理系統」，不是「電子發票系統」** — 發票功能是附加價值，補完再上不影響核心價值
3. **Phase 1 DB/Entity/Module 已完整，凍住的代價極低** — 8 月再補時，DB schema/RLS/index 已就位，直接做 UI/API 即可，省 50% 工時

### William 需要做的決策

> **Q1：6/1 客户是否在 6/1 之前就必须要开出发票给旅客？**
> 如果是 → Option B 可能有業務衝擊（需要手開），但最安全
> 如果否 → 完全沒問題，6/1 先上系統，8 月再上電子發票

> **Q2：客户的客群是 B2C（个人旅客）还是 B2B（同业）？**
> B2C 多 → 電子發票業務剛需高，應加速補完
> B2B 多 → 普通 invoices 足夠，travel_invoice 非必要

---

## 附：凍住的具體做法（如果 William 選 B）

1. 移除或註解掉 `src/modules/travel_invoice.ts` 的 module 註冊（不刪檔案，預留復原）
2. 在 `features.ts` 中把 `travel_invoice` 從 `true` 改為 `false`（或從 module list 拿掉）
3. 客户 6/1 上線，系統其餘功能正常，電子發票改 8 月Phase 2 處理

---

*盤點完成：Max（OPENCLAW agent: main）— 2026-05-20*
*紅線遵守：❌ 未動 src/ ❌ 未動 migrations ❌ 未 push ✅ 僅資料庫唯讀查詢*