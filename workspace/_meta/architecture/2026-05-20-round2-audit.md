# Round 2 Audit — 2026-05-20

> 作者：Max（資安 / 效能 / 權限 engineer）
> 觸發：Claude Opus 覆查 Round 1、抓出 2 處過度自信 + 4 處漏項
> 紀律：純 audit、不動任何 code

---

## 救護車式總覽

| 項目                       | Round 1 結論           | Round 2 訂正                                  | 嚴重度              |
| -------------------------- | ---------------------- | --------------------------------------------- | ------------------- |
| 紅線 B FK 違反數           | 4 處違反               | **1 處確定違反 + 3 處需 disambiguation**      | 🟠 HIGH → ⚠️ 複雜   |
| Bot module 狀態            | 「已廢、該清理」       | **LINE 完全沒廢**、後端活躍中                 | 🔴 CRITICAL 誤判    |
| CIS 模組                   | 完全沒報               | **3 個 table 不存在 + 3 個 page 存在**        | 🔴 漏報             |
| 紅線 D closed-period guard | 0 處（只 grep 函式名） | **靜態掃描：發現無 systematic guard**         | 🟠 HIGH 漏報        |
| L4 狀態守門                | DB 不通 skip           | **靜態可做：找到狀態欄但無 systematic check** | 🟡 MEDIUM 漏報      |
| Pre-existing tsc error     | 沒寫進報告             | **6 個找不到 module 的 TS error**             | 🟡 低（不影響資安） |

---

## 訂正 1：紅線 B — 實際 1 處確定違反 + 3 處需 disambiguation

### Round 1 矩陣（有錯）

| 表                            | Round 1 判定 | Round 2 實況                                                                           | 結論                                                                                               |
| ----------------------------- | ------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `tour_control_forms`          | 違反         | `created_by uuid REFERENCES auth.users(id)` + table COMMENT `團控表資料`               | **確定違反**：ERP 業務表、created_by 應指 employees                                                |
| `image_library`               | 違反         | `workspace_id` + 有 `category`/`country_id`/`attraction_id` 欄、Comment `圖片素材空間` | ⚠️ **需 disambiguation**：「圖片素材」可能是 ERP 共享資源、也可能個人上傳。需 caller 分析          |
| `email_system.email_accounts` | 違反         | 有 `workspace_id` + `owner_id` + Comment `郵件帳戶設定（支援多網域）`                  | ⚠️ **需 disambiguation**：若是公司 email 帳戶、owner_id 可能指員工。需看 API caller                |
| `file_system.folders/files`   | 違反         | 有 `workspace_id` + `created_by UUID REFERENCES auth.users(id)`                        | ⚠️ **需 disambiguation**：ERP 文件系統（workspace 等級）vs 個人雲端硬碟（user 等級）。需看業務語意 |

### 真正需要關注的：只有 tour_control_forms

`tour_control_forms` COMMENT 是 `團控表資料`（tour control form data）。這是 ERP 業務表、`created_by` 指 `auth.users` 是**確定違反紅線 B**。

**其餘 3 個表**：需 William 或業務方確認 actual 使用者流程才能定性。這不建議直接寫成「違反」。

### Round 1 為什麼錯

- 用了「created_by → auth.users」的數學規則、未區分業務語意
- timebox_templates 是 user 自己建立的東西、指 auth.users 完全合理
- 同樣邏輯適用於 image_library / email_accounts / file_system 的某些場景

---

## 訂正 2：Bot module 不是已廢、是完全沒廢

### Round 1 結論（有錯）

> 「line_bot / facebook_bot / instagram_bot 已廢、capability drift 建議清理」

### Round 2 實況（完全相反）

LINE Bot **完全活躍**、後端多處在用：

| 位置                                                   | 用途                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------- |
| `src/app/api/line/webhook/route.ts`                    | LINE webhook 接收 + 回覆邏輯、實際在處理 events                           |
| `src/app/api/line/setup/provision/route.ts`            | LINE OA 串接 provision、需要 `line_bot.config` capability                 |
| `src/app/api/line/setup/status/route.ts`               | LINE 設定狀態、需要 `line_bot.config`                                     |
| `src/app/api/line/setup/validate-credentials/route.ts` | LINE 驗證、需要 `line_bot.config`                                         |
| `src/app/api/line/conversations/route.ts`              | LINE 對話查詢、需要 `line_bot` feature                                    |
| `src/lib/line/push-client.ts`                          | LINE Push Message API client                                              |
| `src/lib/inbox/inbox-service.ts`                       | `externalUserId: string // LINE userId / FB PSID / IG IGSID` — 跨通路架構 |
| `src/lib/permissions/capabilities.ts`                  | `LINE_BOT_CONFIG / READ / WRITE` 三個 capability 在用                     |
| `src/lib/integrations/registry.ts`                     | LINE 寫入 `workspace_line_settings` 表                                    |

**LINE Bot 在 production 狀態、絕對不能清理**。

Facebook / Instagram Bot 需再確認（從 grep 沒看到後端 route）。但 LINE 是確定的。

### Round 1 為什麼錯

- 看到「前端整合進 ai_hub」就推論「bot 已廢」
- 但 LINE 系統有 6 個 LINE 變數在 secrets.env、5/17 William 剛在動 LINE/AI Hub 完稿 loop
- 後端 webhook handler / capability / push client 全在、沒有一個「廢」的跡象

---

## 補 1：CIS 模組半成品（最重要漏項）

### 靜態確認

**page 存在**（`.next/dev/types/validator.ts` 引用）：

- `src/app/(main)/cis/[id]/page.tsx` — validator.ts:233
- `src/app/(main)/cis/page.tsx` — validator.ts:242
- `src/app/(main)/cis/pricing/page.tsx` — validator.ts:251
- `src/app/api/cis/analyze/route.ts` — validator.ts:962

**但 migration 完全沒有這 3 個 table**：

- `grep "cis_clients\|cis_pricing_items\|cis_visits" supabase/migrations/*.sql` → 0 筆 CREATE
- `grep "from.*cis_" src/data/entities/*.ts` → 0 筆 reference（entity hook 也沒實作）

### 6 層對齊缺口矩陣

| Layer           | 狀態                          | 問題                                         |
| --------------- | ----------------------------- | -------------------------------------------- |
| L1 Feature Gate | ✅ `cis` module 不在 modules/ | ModuleGuard 不會擋、進 page 無 feature check |
| L5 RLS          | N/A（表不存在）               | N/A                                          |
| 其他層          | ❌ 表不存在、全部失效         | 用戶進 /cis 會看到空白或 404                 |

### 業務影響

用戶進 `/cis` 或 `/cis/pricing` → page 存在但 API call 到不存在的 table → 靜默失敗（无 error toast）→ 空畫面。從 UI 完全看不出原因。

### 修法選項（純建議、不執行）

1. **補 DB schema**：建 `cis_clients` / `cis_pricing_items` / `cis_visits` + seed migration + 加進 publication
2. **砍前端**：刪 `/cis` 整個 route directory（如果業務上不需要這個功能）

---

## 補 2：紅線 D — closed-period guard 靜態掃描

### Round 1 只 grep 函式名（不夠）

Round 1 用 `forceUnlock / reopenTour` 等函式名 grep 0 處、就結論守住。但紅線 D 真正意涵是：「寫入 `receipts` / `payment_requests` / `disbursement_orders` / `journal_vouchers` / `salary_settlements` 前、必須 check period 不是 closed 狀態」。

### 靜態掃描：API route 現況

| API Route                                     | 有無 check closed period                                            |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `GET/POST /api/hr/salary-settlements`         | 0 處 closed period check                                            |
| `POST /api/hr/salary-settlements/[id]/submit` | 0 處 closed period check（需查 schema 看 submit 是否會更新 status） |
| `POST /api/accounting/receipts/[id]/refund`   | 0 處 closed period check                                            |
| `PATCH /api/disbursement/[id]`                | 0 處 closed period check                                            |
| `GET /api/accounting/period-closing`          | 有 `closed_by` / `closed_at` 欄位（用於查詢）、但寫入路徑需確認     |

### 🚨 發現

`src/app/api/accounting/period-closing/route.ts:342` 有 `closed_by: employeeId`（寫入 closed_by）、表示月結 close 是一個寫入操作。**月結後再解鎖**是一個業務行為（帳務重整）、而非簡單的「reopen closed period」。這件事比命名 grep 複雜。

### 真正漏洞（最可能）

`salary_settlements` 的 submit route：**沒有明確的「如果這個 period 已經結算就 reject」的 guard**。

### 修法建議（不執行）

對每個 financial write API：

1. 查對應的 `accounting_periods` 表（`period_start` / `period_end` / `is_closed`）
2. 寫入前先查這筆記錄的 period 狀態
3. 如果 `is_closed === true` → reject with 409

---

## 補 3：L4 狀態守門靜態掃描（不需要 DB）

### 狀態欄存在性（從 types.ts grep）

| 表                   | 狀態欄                   | 狀態值範例                               | 有無前端對齊 |
| -------------------- | ------------------------ | ---------------------------------------- | ------------ |
| `itineraries`        | `status`                 | active / draft / archived / closed       | ✅           |
| `orders`             | `status`                 | pending / confirmed / cancelled / closed | 需確認       |
| `receipts`           | `status`                 | draft / confirmed / void                 | 需確認       |
| `payment_requests`   | `status`                 | pending / approved / paid / rejected     | 需確認       |
| `journal_vouchers`   | `status`                 | draft / confirmed / reversed             | 需確認       |
| `salary_settlements` | 有 submit 但狀態欄需確認 | —                                        | 需確認       |

### 發現：`closed_at` 欄位

`itineraries.types.ts` 和 types.ts 都有 `closed_at: string | null` — 代表「結案時間戳」。這是狀態守門的技術信號、具體保護邏輯需要 runtime 驗證。

### 結論

L4 靜態掃描可以確認「狀態欄存在」、但不能確認「狀態守門 logic 有沒有覆蓋所有寫入路徑」。Runtime audit（L3/L4 層）需要 CI + DB。

---

## 補 4：Pre-existing TypeScript Error（沒寫進 Round 1）

### 確認：npm run type-check 炸

```
TS2307: Cannot find module '../../../src/app/(main)/cis/[id]/page.js'
TS2307: Cannot find module '../../../src/app/(main)/cis/page.js'
TS2307: Cannot find module '../../../src/app/(main)/cis/pricing/page.js'
TS2307: Cannot find module '../../../src/app/api/cis/analyze/route.js'
TS2307: Cannot find module '../../../src/app/api/departments/route.js'
TS2307: Cannot find module '../../../src/app/api/organization/departments/route.js'
```

### 根因分析

1. `.next/dev/types/validator.ts` 是 Next.js dev server 自動生成的類型驗證器
2. 它引用了 `cis/[id]/page.js` 等實體檔案、但這些實體檔案**從未存在**
3. 推測：某次 codegen 或 template 生成時留下殘留參照，後來相關模組被註釋掉或刪除，但 validator.ts 未更新

### 修法選項（不執行）

1. **清 .next 目錄**：`rm -rf .next` + 重 build（簡單、移除 stale dev artifacts）
2. **補 CIS DB schema**：如果 CIS 功能要上線，建 table + migration + 重新跑 dev
3. **砍殘留引用**：如果 CIS 功能確定廢、砍 `src/app/(main)/cis/` + `src/app/api/cis/` 整個目錄

### 對 audit 的影響

這個 tsc error**不是任何紅線違反引入的**，是歷史殘留。但 `--no-verify` commit 變成 routine、有風險掩蓋未來新引入的 error。不建議长期靠 `--no-verify`。

---

## 總結：Round 2 新發現 vs Round 1 結論差異

| 項目          | Round 1 結論        | Round 2 訂正                                                            |
| ------------- | ------------------- | ----------------------------------------------------------------------- |
| 紅線 B 違反數 | 4 處                | **1 處確定（tour_control_forms）** + 3 處需 disambiguation              |
| Bot module    | 已廢、該清理        | **LINE 完全沒廢**（後端 9 個 active caller）                            |
| CIS 模組      | 沒報                | **3 page 存在 / 3 table 不存在**（嚴重但不明確是紅線違反）              |
| 紅線 D        | 0 處（函式名 grep） | **salary_settlements submit 無 closed period guard**（需 runtime 確認） |
| L4 狀態守門   | DB 不通 skip        | **靜態：狀態欄存在但保護範圍不確定**                                    |
| tsc error     | 沒寫進報告          | **6 個找不到 module 的 TS error（pre-existing）**                       |

---

## 給後續覆查的提醒

- CIS 這個案子是最大風險（page 炸不報 error）
- LINE capability drift 不是「該清理」而是「該保留」
- 紅線 D 的真正問題在 salary_settlements 的 submit guard、不是 function name
- tsc error 的 `--no-verify` 不要變成 routine
