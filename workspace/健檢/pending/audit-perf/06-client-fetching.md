# 06 — Client 端讀取效能

**資料時點**：2026-05-23 23:50
**資料來源**：grep + Read `src/data/entities/*.ts` + `src/data/core/*.ts` + `src/lib/swr/**` + 全 client code
**範圍**：紅線 F「client 端讀寫只走 entity hook + apiMutate」實際偏離量化
**模式**：純調查、不改 code、不改 DB

---

## 摘要

業務白話：紅線 F 規定「讀資料走 entity hook、寫資料走 apiMutate」。實際盤點 yizhan-erp 全 client code 後：

- **entity hook**：46 個 active entity（44 個走 `createEntityHook` 框架 + 2 個合理跨表 RPC / shared data 例外）
- **散刻 useSWR**：**37 處**（across 19 個檔案）— 跟 Alex 估的「25 處」差距大、實際更嚴重
- **散刻 mutate(key)**：32 處（多為合理的「自己 SWR 自己 mutate」、紅旗只 5 處）
- **散刻 supabase.channel()**：2 處（presence + broadcast helper、皆合理例外）
- **apiMutate 使用率**：41 處走 apiMutate vs 68 處走原始 `fetch /api/`、**比率 38%**（紅旗：62% 寫入 path 沒走 SSOT）
- **eslint baseline 凍住**：18 個 useswr 違規 + 145 個 supabase-writes 違規（CLAUDE.md 已記）

### 紅旗排序（最該優先修）

1. **`useTours-advanced.ts` 整檔死碼**：第一個 export `useTours()` 沒 caller、舊架構殘留、應砍。第二個 `useTourDetails()` 可遷 `useTour`
2. **`useToursPaginated.ts` 內建 supabase.channel** subscribe：跟 entity hook 的 `useRealtimeSync` 重複、用本地 `mutateSelf()` 跳過 SSOT
3. **`useNotes` (dashboard)**：用 useState + 散刻 `supabase.from('notes')` + service layer、完全繞過 entity hook (`noteEntity` 都已預備好但 caller 沒接)
4. **`useTourItineraryItems.ts`** 兩個 hook：明明有 `useTourItineraryItems` entity hook、但這檔自己再散刻 `supabase.from('tour_itinerary_items').eq('tour_id'...)` filter
5. **62% 寫入 path 沒走 apiMutate**：寫完 cache 失效靠 caller 手刻、SWR key 命名改版會靜默失效

---

## entity hook 矩陣（46 個 active entity、紅線 F 守門 SSOT）

**框架統一行為（適用所有 `createEntityHook` 產出的 hook）**：
- **realtime**：✅ 全部自動 `useRealtimeSync(tableName)`、不需各 entity 開
- **dedupingInterval**：硬寫 **2000ms**（`createEntityHook.ts:106`、5/18 從 Infinity 改、解 mutate 卡 stale）
- **staleTime (TTL)**：`Infinity`（cache 永不過期、靠 Realtime 推播刷新；`CACHE_PRESETS.{high,medium,low}` 在 types.ts:57-82 全部都是 Infinity、preset 高/中/低**無實際差別**、純文件分類）
- **revalidateOnFocus**：false（切 tab 不重撈）
- **revalidateOnReconnect**：true（除 `low` 是 false）
- **workspace scope**：依 `WORKSPACE_SCOPED_TABLES` 表自動隔離

### 矩陣表

| # | entity 檔 | table | preset | workspace | audit | server filter? | export hooks |
|---|---|---|---|---|---|---|---|
| 1 | ai-agents | ai_agents | high | auto | auto | filter param | List, Slim, Detail |
| 2 | airport-images | airport_images | low | auto | **skip** | filter param | List |
| 3 | application-service-types | application_service_types | high | auto | auto | filter param | List, Detail, Slim |
| 4 | attractions | attractions | low | **false（shared）** | auto | filter param | List |
| 5 | bank-accounts | bank_accounts | medium | auto | auto | filter param | List, Detail |
| 6 | calendar-events | calendar_events | medium | auto | auto | filter param | List |
| 7 | channel-members | channel_members | low | auto | **skip** | filter param | List |
| 8 | channel-messages | channel_messages | low | auto | auto | filter param | List |
| 9 | channels | channels | low | auto | auto | filter param | List, Detail |
| 10 | chart-of-accounts | chart_of_accounts | medium | auto | auto | filter param | List, Detail |
| 11 | cities | cities | low | auto | **skip** | filter param | List |
| 12 | customer-document-applications | customer_document_applications | low | auto | auto | filter param | List, Detail |
| 13 | customer-documents | customer_documents | medium | auto | auto | filter param | List, Detail |
| 14 | customers | customers | medium | auto | auto | filter param | List, Slim, Paginated |
| 15 | disbursement-orders | disbursement_orders | high | auto | auto | filter param | List |
| 16 | document-types | document_types | high | auto | auto | filter param | List, Detail, Slim |
| 17 | employees | employees | low | **explicit true** | auto | filter param | List, Slim, Detail, Paginated, Dictionary |
| 18 | expense-categories | expense_categories | medium | auto | auto | filter param | List, Detail |
| 19 | hotels | hotels | low | **false（shared）** | auto | filter param | List |
| 20 | image-library | image_library | medium | **explicit true** | auto | filter param | List (caller 0、dead) |
| 21 | itineraries | itineraries | medium | auto | auto | filter param | List |
| 22 | members | order_members | high | auto | auto | filter param | List, Slim |
| 23 | notes | notes | high | auto | auto | filter param | **ZERO caller** (`_useNotes` 全 underscore-prefixed) |
| 24 | order-members | order_members | medium | auto | auto | filter param | List, Detail |
| 25 | orders | orders | high | auto | auto | filter param | List, Slim, Paginated |
| 26 | payment-methods | payment_methods | medium | auto | auto | filter param | List, Detail |
| 27 | payment-request-items | payment_request_items | medium | auto | auto | filter param | List |
| 28 | payment-requests | payment_requests | high | auto | auto | filter param | List |
| 29 | quotes | quotes | medium | auto | auto | filter param | List, Slim, Detail |
| 30 | receipts | receipts | high | auto | auto | filter param | List |
| 31 | regions | regions | low | auto | auto | filter param | List |
| 32 | restaurants | restaurants | low | **false（shared）** | auto | filter param | List |
| 33 | supplier-pricing | supplier_pricing | medium | auto | auto | filter param | List, Detail |
| 34 | suppliers | suppliers | low | auto | auto | filter param | List, Slim |
| 35 | todos | todos | high | **explicit true** | auto | filter param | List (Entity), Slim, Detail |
| 36 | tour-bonus-settings | tour_bonus_settings | low | auto | auto | filter param | List |
| 37 | tour-itinerary-items | tour_itinerary_items | high | **explicit true** | auto | filter param | List (但有散刻 hook 繞過、見紅旗 #4) |
| 38 | tours | tours | high | auto | auto | filter param + 客製 `useToursForCalendar` | List, Slim, Detail, Dictionary, Calendar |
| 39 | travel-invoices | travel_invoices | medium | auto | auto | filter param | List, Slim, Detail |
| 40 | website-tours | tours (同表) | medium | auto | auto | filter param | List, Slim, Detail (Corner 官網用) |
| 41 | workspace-bonus-defaults | workspace_bonus_defaults | low | auto | auto | filter param | List |
| 42 | workspace-documents | workspace_documents | medium | auto | auto | filter param | List, Slim, Detail |
| 43 | workspace-seals | workspace_seals | medium | auto | auto | filter param | List, Slim, Detail |
| 44 | workspaces | workspaces | low | **false** | **skip** | filter param | List (entity 自己用) |
| 45 | worldmove-esim-items | worldmove_esim_items | medium | auto | auto | filter param | List, Slim, Detail |
| 46 | worldmove-orders | worldmove_orders | medium | auto | auto | filter param | List, Slim, Detail |

### 框架例外（非 createEntityHook、合理）

| # | 檔 | 為什麼 |
|---|---|---|
| E1 | countries.ts | 改撈 `ref_countries`（shared data SSOT、ISO 標準表、平台共用）、純 useSWR 包 fetcher、`dedupingInterval: 5min` |
| E2 | employee-eligibilities.ts | composite PK（employee_id, eligibility_code）、createEntityHook 寫死 `.eq('id', ...)`、不支援；純 useSWR、`dedupingInterval: 5min` |
| E3 | finance-summary.ts | RPC 跨表 aggregate（`compute_tour_pl` / `compute_treasury_summary`）、非單表 CRUD、走 useSWR + custom RPC wrapper、`dedupingInterval: 5min` |

### entity 健康紅旗

- **notes entity 死碼**：`noteEntity` 5 個 hook 全 `_underscore` 前綴 + 0 caller、但 dashboard 自己另寫 `useNotes()` 用 useState + 散刻 `supabase.from('notes')`（見散刻 useSWR 清單 #x、實際更糟、根本不是 useSWR）
- **image-library entity 半死**：`_useImageLibrary` 全 underscore、唯一 export 是 `createImageLibraryItem`、讀取 path 沒接 entity hook（caller 用什麼讀？待 audit Task 7 / Task 8 follow）
- **website-tours / tours 共用 table**：兩個 entity hook 指同一張 `tours`、cache key 用 select hash 區分（OK、但 invalidate 互相影響待驗）
- **employee-eligibilities** 用 `dynamicFrom('employee_eligibilities')` style cast、type-check 繞過、composite PK 未來該擴展 createEntityHook 的 pkColumn 機制

---

## 散刻 useSWR 清單（紅線 F 偏離、37 處 across 19 檔）

> 凡是 client 端直接 `useSWR(...)` 而不走 entity hook 都列。已加 eslint-disable comment 的 = 知情 / 已掛 baseline；無 comment 的 = 漏網。

### 19 個檔（37 處 useSWR）

| # | file:line | 用途 | 為什麼沒走 entity hook | 已 baseline? |
|---|---|---|---|---|
| 1 | `src/app/(main)/settings/company/_components/BranchesSection.tsx:36` | 抓 `/api/organization/branches` 列分公司 | API route（非 supabase 直查）、無 entity（branches/brands SSOT 走 API） | ✅ |
| 2 | `src/app/(main)/settings/company/_components/DimensionSection.tsx:48` | 抓 brands/branches dimension（共用） | 同上 | ✅ |
| 3 | `src/app/(main)/tours/_components/ProfitTab.tsx:190` | 撈 `workspaces.bonus_calculation_order` 單欄位 | workspaces 表只想拿 1 欄、entity hook 抓全表浪費 | ✅ |
| 4 | `src/app/(main)/tours/[code]/page.tsx:30` | `fetchTourIdByCode(code)` 路由 code → tour id | code 是路由 param、非 id；entity hook 沒 by-code lookup | ✅ |
| 5 | `src/app/(main)/tours/_hooks/useToursPaginated.ts:82` | 列表頁主撈、含 server filter + 分頁 + realtime + 樂觀更新 | comment 寫「entity hook 無法表達」、實際 `useOrdersPaginated`(entity) 行為類似、可重構 | ✅ |
| 6 | `src/app/(main)/tours/_hooks/useToursPaginated.ts:372` | `useTourDetailsPaginated()` 單筆 by id | 跟 `useTour`（entity Detail）功能重疊、應遷 | ✅ |
| 7 | `src/app/(main)/tours/_hooks/useTourItineraryItems.ts:81` | byTour 撈 tour_itinerary_items + merge attractions | `useTourItineraryItems`(entity) 已存在、但這檔 by_tour 變體沒接（join attractions 是借口、可改 entity filter + 在 component 端 merge） | 🚫 **無 disable comment** |
| 8 | `src/app/(main)/tours/_hooks/useTourItineraryItems.ts:107` | byItinerary 同上 | 同上 | 🚫 |
| 9 | `src/app/(main)/tours/_hooks/useTours-advanced.ts:49` | 舊架構撈所有 tours、用 client filter | **caller=0、整 function 死碼**（grep 找不到 `useTours-advanced` 被 import 為 useTours） | ✅ |
| 10 | `src/app/(main)/tours/_hooks/useTours-advanced.ts:214` | `useTourDetails(tour_id)` | `useTour` (entity) 完全可替代、grep 1 caller (`tours/[code]/page.tsx:50`) | ✅ |
| 11 | `src/app/(main)/tours/_hooks/useAirports.ts:158` | 撈 ref_airports + ref_destinations 合併 | shared data table（非 workspace）、composite key (iata_code)、entity hook 不支援 | ✅ |
| 12 | `src/app/(main)/tours/_hooks/useAirports.ts:161` | 撈 ref_countries 給 airport 用 | 同 countries.ts、shared data | ✅ |
| 13 | `src/app/(main)/shared-data/countries/page.tsx:31` | shared-data 頁列 ref_countries | 同上、PK=code 非 id | ✅ |
| 14 | `src/app/(main)/shared-data/airports/page.tsx:61` | shared-data 頁列 ref_airports | 同 #11 | ✅ |
| 15 | `src/app/(main)/shared-data/airports/page.tsx:66` | shared-data 頁列 ref_countries | 同 #12 | ✅ |
| 16 | `src/app/(main)/shared-data/banks/page.tsx:31` | shared-data 頁列 ref_banks | 同上、PK=bank_code | ✅ |
| 17 | `src/app/(main)/library/attractions/_components/tabs/RegionsTab.tsx:81` | 撈 ref_countries + workspace_countries map | 跨表 join、非 entity hook 場景 | ✅ |
| 18 | `src/app/(main)/workspaces/page.tsx:39` | 抓 `/api/workspaces` 列租戶 | API route、無 entity | ✅ |
| 19 | `src/app/(main)/workspaces/[id]/_components/ai-health-tab.tsx:99` | 抓 `/api/workspaces/${id}/ai-health` | API route、aggregate | ✅ |
| 20 | `src/app/(main)/workspaces/[id]/_components/QuotaHistorySection.tsx:31` | 抓 `/api/workspaces/${id}/employee-quota` | API route | ✅ |
| 21 | `src/app/(main)/ai/_components/AiRetrospectiveTab.tsx:70` | 抓 `/api/ai/retrospective/topics` | API route | ✅ |
| 22 | `src/app/(main)/ai/_components/AiSidebar.tsx:108` | 抓 conversations 列表 | API route（inbox_messages 走 API 不直查 supabase） | 🚫 **無 disable comment** |
| 23 | `src/app/(main)/ai/_components/AiConversationsTab.tsx:203` | conversations 列表 | 同 #22 | ✅ |
| 24 | `src/app/(main)/ai/_components/AiConversationsTab.tsx:209` | 單一 conversation 的 messages | API route | 🚫 |
| 25 | `src/app/(main)/ai/_components/AiConversationsTab.tsx:797` | retrospectives 列表 | API route | 🚫 |
| 26 | `src/app/(main)/ai/_components/AiConversationsTab.tsx:1192` | conversation memory | API route | 🚫 |
| 27 | `src/app/(main)/ai/_components/AiConversationsTab.tsx:1493` | conversation notes | API route | 🚫 |
| 28 | `src/app/(main)/ai/_components/AiConversationsTab.tsx:1582` | postback templates | API route | 🚫 |
| 29 | `src/app/(main)/ai/_components/AiSettingsTab.tsx:83` | `/api/line/setup/status` | API route | 🚫 |
| 30 | `src/app/(main)/ai/_components/AiSettingsTab.tsx:227` | `/api/line/postback-templates` | API route | ✅ |
| 31 | `src/app/(main)/finance/settings/_components/MethodDialog.tsx:75` | `/api/finance/payment-providers` | API route | 🚫 **無 disable comment** |
| 32 | `src/app/(main)/bot/[lineUserId]/_components/CustomerInfoSidebar.tsx:54` | `/api/line/conversations/.../customer-orders` | API route | ✅ |
| 33 | `src/app/(main)/orders/_hooks/useOrdersListView.ts:97` | orders 列表（含 sales OR created_by filter） | 業務 OR filter（sales OR created_by）entity hook .eq chain 不支援 | ✅ |
| 34 | `src/components/bank-combobox.tsx:93` | 抓 ref_banks | shared data、PK=bank_code | ✅ |
| 35 | `src/hooks/useWorkspaceSettings.ts:128` | 撈 workspaces.{name,phone,address,...} 公司資訊 | workspaces 表只想拿子集、走獨立 hook 跟 entity 分流 | 🚫 |
| 36 | `src/lib/auth/useLayoutContext.ts:124` | 撈 `/api/auth/layout-context`（user + workspace + capabilities + features） | aggregate API、layout SSOT、非單表 | 🚫 |
| 37 | `src/lib/permissions/useIntegrationEnabled.ts:40` | 撈 `/api/workspace-integrations` | API route | 🚫 |

### 散刻 useSWR 分類

| 類別 | 處數 | 評估 |
|---|---|---|
| **API route 包裝**（包 fetch 拿 JSON 結果）| 19 | 合理、entity hook 是給 supabase 表直查、不是給 API route 用；ratchet 標掛 18/19、合理 |
| **shared data**（ref_countries / ref_airports / ref_banks）| 6 | 合理、表 PK 非 id、entity hook 不支援；待 future 擴展 `pkColumn` 才能遷 |
| **跨表 join / 客製 OR filter**（useOrdersListView / RegionsTab）| 2 | 合理、entity hook .eq chain 不支援 OR；可考慮 createReportHook 框架擴展 |
| **單欄位 by-code lookup**（fetchTourIdByCode）| 1 | 合理（id ≠ code）、entity hook 沒 by-code 介面 |
| **死碼**（useTours-advanced.useTours / dead helpers）| 1 | **🚩 應砍**：`useTours-advanced.ts:49` `useTours()` 0 caller |
| **可遷未遷**（明明 entity hook 已存在）| 3 | **🚩 紅旗**：useTourItineraryItems (#7, #8、應改用 entity hook + filter)、useTours-advanced.useTourDetails (#10、應改 useTour) |
| **單欄 subset 撈 workspaces**（useWorkspaceSettings / ProfitTab.bonus_order）| 2 | 半合理、走獨立 hook 是因為 workspaces entity hook 抓欄位 select 太寬；可考慮 entity 加 partial select 模式 |

### 紅旗：3 個漏 disable comment、可能漏網

未掛 disable comment 但實際在 client tree（潛在違規）：
- `useTourItineraryItems.ts:81, 107`
- `useWorkspaceSettings.ts:128`
- `MethodDialog.tsx:75`
- `AiConversationsTab.tsx` 多處（203 ✅、其餘 209/797/1192/1493/1582 都漏 comment）
- `AiSidebar.tsx:108`、`AiSettingsTab.tsx:83`、`useLayoutContext.ts:124`、`useIntegrationEnabled.ts:40`

**根因**：baseline 凍住 18 個違規、但這些檔可能 lint rule 不生效（譬如不在 `src/app/(main)` 結構下、或 rule 規則窄、待 Task 7 follow）。

---

## 散刻 mutate(key) 清單（32 處）

> SWR 的 `mutate` 有兩種：① `useSWR` 回傳的 local `mutate`（自己 SWR 自己 mutate、OK）；② 從 `swr` 或 `@/lib/swr/scoped-mutate` import 的 global `mutate(key)`（可能繞 apiMutate SSOT）。

### 應改 apiMutate / 已合理

| # | file:line | 用途 | 該改 apiMutate? |
|---|---|---|---|
| 1 | `DimensionSection.tsx:102,139` | 寫完 brands/branches local refresh | ❌ 不需、local `mutate`（useSWR return） |
| 2 | `useTours-advanced.ts:103,113,116,129,146,149,168,177,180,187` | global mutate(TOURS_KEY) | **🚩 死碼**、整檔應砍 |
| 3 | `useAirports.ts:231,269` | global mutate(AIRPORTS_CACHE_KEY) | ❌ 不需、shared data 直接 invalidate 合理 |
| 4 | `RegionsTab.tsx:109` | global mutate(WC_CACHE_KEY) | ❌ 跨表 join cache、合理 |
| 5 | `AiRetrospectiveTab.tsx:87,163` | global mutate predicate（refresh all retrospective topics） | 🤔 **可走 apiMutate.invalidate**、目前散刻 |
| 6 | `AiConversationsTab.tsx:1214,1228,1388,1512` | local mutate (useSWR return) | ❌ 不需 |
| 7 | `AiSettingsTab.tsx:239,250,285,306` | global mutate(API) | 🤔 **可走 apiMutate.invalidate**、目前散刻 |
| 8 | `CustomerInfoSidebar.tsx:217` | local mutate (useSWR return) | ❌ 不需 |
| 9 | `usePaymentData.ts:118,302,328` | comment 不是 code（comment 寫 globalMutate predicate 不穩、改 local mutate） | ❌ 已是 best practice |
| 10 | `useOrdersListView.ts:158` | local mutate (useSWR return) | ❌ 不需 |
| 11 | `bank-combobox.tsx:153` | local mutate (useSWR return) | ❌ 不需 |
| 12 | `useWorkspaceSettings.ts:188` | global mutate(buildSwrKey(workspaceId)) | 🤔 **可走 apiMutate.invalidate** |

### 真紅旗：5 處散刻 global mutate 該整合 apiMutate

| # | file:line | 場景 | 該改 |
|---|---|---|---|
| 1 | `AiRetrospectiveTab.tsx:87` | 復盤完 mutate predicate refresh all topics | 改 `apiMutate(.../aggregate, { invalidate: [...] })` |
| 2 | `AiSettingsTab.tsx:239,250,285,306` (4 處) | postback templates CRUD 完手動 mutate(API) | 改 `apiMutate(API, { invalidate: [API] })` |
| 3 | `useWorkspaceSettings.ts:188` | invalidateWorkspaceSettings(id) 用 global mutate | 此處是 helper、合理；caller 應改走 apiMutate 失效 |

---

## 散刻 supabase.channel() 清單（2 處、皆合理）

| # | file:line | 訂哪張表 | 用途 |
|---|---|---|---|
| 1 | `src/hooks/useEditingPresence.ts:50` | N/A（presence channel） | 多人協作編輯時、追蹤誰正在編同份資源（itinerary / order / quote），非 entity 場景 |
| 2 | `src/lib/messaging/broadcast.ts:69` | N/A（broadcast channel） | webhook server-side push event 給訂閱 client，繞過 postgres_changes RLS 路徑（紅線 F 補強、不是違規） |

**結論**：無散刻 postgres_changes 訂閱、所有資料表 realtime 都走 `useRealtimeSync`（entity hook 內建）+ `useRealtimeMutate`（messaging 專用 hook）。✅

---

## apiMutate 使用率（紅線 F「寫入 + cache 失效 SSOT」）

| 指標 | 量 |
|---|---|
| `apiMutate(...)` 呼叫處（client 端） | **41 處** |
| `fetch('/api/...', { method: POST/PUT/PATCH/DELETE })` 散刻處 | **68 處** |
| `await fetch('/api/...')`（含 GET / 隱含 POST）總量 | 81 處 |
| `apiPost / apiPatch / apiPut / apiDelete / apiGet` helper 用量 | 33 處 |

**比率**：`apiMutate / (apiMutate + 散刻 fetch) ≈ 41 / 109 ≈ 38%`

**業務白話**：寫入 SaaS 後台動作每 10 個只有不到 4 個走 SSOT、其餘 6 個各自手刻 fetch + 各自處理 cache 失效。
- ⚠️ **長期風險**：apiMutate 改 API（譬如加 retry / 加 audit context）後、那 62% 散刻處全部缺新功能
- ⚠️ **SWR key 改版風險**：散刻 fetch 沒帶 `invalidate: [...]` 列表、寫完用戶看不到更新、必須 F5

### 散刻 fetch + method 樣本（前 30）

詳清單在 [scripts 已抓出來]、典型場景：
- 公開頁面（contract sign / pay / tour registration）— 部分合理（unauth flow）
- accounting / vouchers / opening-balances — 寫會計分錄、應走 apiMutate
- workspaces / billing-tab / integration-settings — admin 操作、應走 apiMutate
- display-editor / AttractionForm / passport-upload — 內容編輯、應走 apiMutate

---

## eslint baseline 紀錄（CLAUDE.md 已凍）

- `venturo/no-direct-useswr-in-pages`：**18 個違規凍住**（baseline）
- `venturo/no-direct-supabase-writes`：**127 個違規凍住**（baseline）

📝 紅線 F「ESLint rule `venturo/require-api-mutate-for-mutations`（寫入後沒走 apiMutate 報 warning）」目前**尚未實作**（CLAUDE.md 紅線 F 標 Phase 3 待做）。這條 rule 上線、上面「62% 寫入沒走 SSOT」會浮上來 surface。

---

## 紅旗總結（業務優先順序）

| 優先 | 紅旗 | 影響 | 修法 |
|---|---|---|---|
| **P0** | `useTours-advanced.ts` `useTours()` 死碼 | 維護負擔、混淆下個工程師 | 直接砍整 function（保留 useTourDetails 給 [code]/page.tsx 用、再排程遷 entity） |
| **P0** | 62% 寫入 fetch 沒走 apiMutate | SWR key 改版會靜默失效、user 看到 stale UI | 排程 Phase B 全面遷 apiMutate、上 ESLint rule 擋新增 |
| **P1** | `useTourItineraryItems.ts` 兩個 hook 散刻 supabase.from 重複 entity 功能 | tour 詳情頁 realtime 失效（無 useRealtimeSync）、attractions merge 浪費讀取 | 改用 entity hook + filter（tour_id / itinerary_id）+ component 端 merge |
| **P1** | `useNotes` (dashboard) 用 useState + 散刻 supabase.from（無 SWR、無 realtime） | A 改筆記、B 看不到、只能 F5；offline 期間用 localStorage 不同步 | 改用 `noteEntity.useList` / `useDictionary`（entity 已預備、只是沒接） |
| **P2** | useToursPaginated 自建 supabase.channel realtime | 跟 entity hook 內建 useRealtimeSync 重複訂閱 同 table、雙倍 Supabase realtime quota | 拿掉本地 channel、靠 invalidateTours() 失效 SSOT |
| **P2** | AiSettingsTab postback templates 寫完散刻 mutate(API) | apiMutate 不知道有這條失效路徑、未來 cache key 改版會漏 | 改 apiMutate(API, { invalidate: [API] }) |
| **P3** | 9 處散刻 useSWR 漏 eslint disable comment | baseline 未涵蓋、rule 上線會 break build | 加 disable comment 或遷 entity hook（看 case） |

---

## 立刻停手寫進報告（紅線觸發）

**無紅線級違規**（資安洞 / 跨租戶污染 / 業務終結級）。本次調查屬效能 / 維護紀律維度、不停手。

## 待後續調查（不在 Task 6 範圍）

- **Task 7（建議）**：image-library 讀取 path 誰在用？entity 0 caller 但 createImageLibraryItem 有 export
- **Task 7（建議）**：notes entity 跟 dashboard.service.ts 為何各做各的？要砍哪邊
- **Task 8（建議）**：68 處散刻 fetch /api/ 分類，哪些可遷 apiMutate / 哪些是真合理（public unauth flow）
- **建議**：上 `venturo/require-api-mutate-for-mutations` ESLint rule（CLAUDE.md 紅線 F Phase 3）
