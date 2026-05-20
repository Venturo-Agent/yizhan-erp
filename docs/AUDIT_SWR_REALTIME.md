# SWR + Realtime 全盤審查報告
日期：2026-05-20
稽查員：Claude（Opus 4.7 1M）
範圍：yizhan-erp 全 client 端 SWR 用法 + Supabase Realtime 訂閱

---

## 一、總覽

| 項目 | 數量 |
|---|---|
| 掃過的檔案 | src/ 全域、約 80+ tsx/ts |
| `useSWR` / `useSWRConfig` / `SWRConfig` 使用點（檔案） | **37 個** |
| 直接 `useSWR()` 散刻在頁面 / hook（繞過 entity hook 的） | **21 個** |
| `createEntityHook` 註冊的 entity（也就是「正規軍」） | **41 個** |
| `useState<T[]>` 自己 cache 列表的反 pattern 頁面 | **至少 12 個**（accounting / settings / tour-itinerary 等）|
| Realtime 訂閱（`.channel(`、`postgres_changes`） | **12 個檔案 / 7 條真實訂閱路徑** |
| Supabase `supabase_realtime` publication 已開的 table | **35 個** |
| Entity hook 訂閱了 realtime、但 publication 沒開的 table | **8 個**（靜默失效）|
| 偵測破口 | **S 級 3 / M 級 5 / L 級 6** |

---

## 二、S 級破口（William 反映的 3 個症狀）

### S1. 景點資料庫新增不會立刻出現

**症狀（白話）**
你在景點頁按「新增」、表單存好、按下確認 — 列表 UI 還是舊的、要 F5 重整才看得到新增的那筆。
譬喻：你在圖書館登記新書、登記櫃台寫了一張卡放進櫃子裡、但前面那塊「新書公告板」沒人去貼、客人看不到。

**病因（技術根因、一句話）**
`attractions` 在「workspace 隔離名單」(`WORKSPACE_SCOPED_TABLES`) 跟 entity config 的 `workspaceScoped` 旗標**互相打架** — config 寫 `false`、名單寫「要隔離」、最後以 config 為準。但這條撕裂不直接造成新增看不到。**真正的原因是**：

attractions / hotels / restaurants 三個 entity 都設 `workspaceScoped: false`、所以 entity hook 的「樂觀更新」用 `globalMutate(predicate, updater, { revalidate: false })` predicate 比對 `cacheKeyList` prefix — 這個 SWR predicate 在自訂 cache provider 內**對未在 React tree 註冊的 key 行為不可靠**（5/18 修 channel 時也踩過同一個雷、所以加了 `entityHookRegistry` 兜底）。

加上 attractions 進 publication 確認 ✅、但 entity hook 走的 useRealtimeSync 用固定 channel 名 `realtime:${tableName}`、同一 page 多個 entity hook 訂閱不同 table 沒衝突、**但跨 page 切換 + StrictMode + dedupe 重連** 可能讓 broadcast 漏接。

實際 user-facing 表現：「新增 → 樂觀 push 進 cache」這一步成功、但「server return 後的 await invalidateEntity」依賴 registry 的 swrKey、attractions 用 `useAttractions({ all: true })` 走的是 `useList`、`useList` 有註冊 — 所以理論上應該有 mutate。**但這條 mutate 的 SWR fetcher 在 fallbackData=idb 那一刻直接 return 舊 cache、SWR `dedupingInterval: 2000ms` 內就被吞了**。如果 user 連點兩次 / 換 tab、就會看到「有時好、有時不好」。

**位置**
- entity 設定：`/Users/william/Projects/yizhan-erp/src/data/entities/attractions.ts:12-26`
- entity SSOT 撕裂：`/Users/william/Projects/yizhan-erp/src/data/core/entityHookCache.ts:112-166`（attractions 列在 WORKSPACE_SCOPED_TABLES）vs `attractions.ts:13`（workspaceScoped: false）
- 寫入路徑：`/Users/william/Projects/yizhan-erp/src/app/(main)/library/attractions/_hooks/useAttractionsData.ts:78-116`（addAttraction → createAttraction → entity hook create）
- create + invalidate：`/Users/william/Projects/yizhan-erp/src/data/core/entityHookCrud.ts:62-182`
- registry 兜底：`/Users/william/Projects/yizhan-erp/src/data/core/entityHookRegistry.ts`

**建議修法**
1. **立刻**：把 `WORKSPACE_SCOPED_TABLES` 內的 attractions / hotels / restaurants / countries / cities / regions / ref_airports 拿掉（既然 entity config 已說 false、不要兩處 source of truth、紅線 F 違反）。
2. **立刻**：useAttractionsData.ts addAttraction 在 createAttraction 後手動補一次 `await invalidateAttractions()`（updateAttraction 那條已有、addAttraction 沒、L122 vs L162 不對稱）。
3. **中期**：entity hook create 的「樂觀 push」改用 registry 的 key 直接 mutate、不用 predicate。

**影響範圍**
- 修法 1 跟 2：只動 attractions / hotels / restaurants 相關頁面、不擴散
- 修法 3：影響全 41 個 entity 的寫入路徑、要全套 regression

**難度**：S（修法 1+2 一個 commit 解決）

---

### S2. 頻道對話「忽好忽壞」

**症狀（白話）**
你在頻道（譬如「中山專案」或私訊）打字按 Enter / 點送出 — 有時候訊息瞬間就在訊息流出現、有時候要等個幾秒、有時候要 F5。同事傳給你的訊息也一樣 — 有時 popup 馬上看到、有時要重整。
譬喻：餐廳叫菜的鈴鐺有時響有時不響、廚師有時聽到有時沒聽到 — 服務生跟廚師之間根本沒有單一的「對」的喊單方法、誰高興喊誰的、結果有人沒接到。

**病因（技術根因、一句話）**
**送訊息有 3 條完全不同的程式路徑、各自做的事不一樣、有的會通知 SWR 重撈、有的不會**。

#### 3 條送訊息路徑 / 通知行為矩陣

| # | 入口 | 走的路 | 寫完叫 `invalidateChannelMessages`？ | 樂觀更新方式 | 行為 |
|---|---|---|---|---|---|
| 1 | `ChannelView` 一般 textarea Enter / 按送出 | `apiPost('/api/channels/messages')` → API admin client insert | ❌ **沒叫** | local state `recentlySent` 兜底 | 自己看得到、其他人要等 Realtime（有時通有時不通） |
| 2 | `ChannelView` 撤回訊息 | `apiPost('/api/channels/messages/${id}/revoke')` | ✅ 叫了 | 無 | OK |
| 3 | `SendAnnouncementDialog` 發公告 / 排程 | `createChannelMessage()` (entity hook .create) | ✅ entity hook 內建會叫 | entity 樂觀 push | OK |

最大 bug 在 **#1**：

- 自己送出後、`recentlySent` push 進 local state → sortedMessages 合併顯示 → **自己秒看到**（OK）
- 但 SWR `entity:channel_messages:list:...` 從來沒被叫 mutate
- 別人手機 SWR 也不會自動 refetch
- 別人靠 Realtime postgres_changes 接 — 但 Realtime 訂閱用固定 channel 名 `realtime:channel_messages`、`useChannelMessages` mount 之後 setAuth race / 訂閱錯過早期 events / `dedupingInterval: 2000ms` 內 SWR 把後續 mutate 吃掉、整個鏈條任何一節漏接就「沒收到」
- → **「有時收到、有時收不到」**

#### Realtime 訂閱鏈條的 race（為什麼忽好忽壞）

1. `src/lib/supabase/client.ts:33-39` — 建 client 時 fire-and-forget setAuth、**沒等回應**
2. `src/data/core/entityHookRealtime.ts:30-37` — subscribe 前再補一次 setAuth、也是 fire-and-forget
3. 同一 component（ChannelView）mount 時、useChannelMessages / useChannel / useChannelMembers 三個 entity hook **各自** call useRealtimeSync — 訂三條 channel：`realtime:channel_messages`、`realtime:channels`、`realtime:channel_members`
4. 換頻道時 unmount 全部清掉、再 mount 重訂 — 整個過程 setAuth + subscribe 各 fire-and-forget、Supabase 內部可能用舊 token / 同名 channel collide
5. dedupingInterval=2000ms：訂閱 event 通知後叫 globalMutate(key)、SWR 看 2 秒內已經 fetch 過 → 不 refetch、直接吃 cache（cache 沒新 row）
6. 連點兩次送 → 第一次 mutate 進 dedupe 視窗、第二次 mutate 被擋
7. 偶爾正常 = 走完整訂閱鏈、event 接到、剛好過 2 秒、SWR refetch 成功

**位置**
- 送訊息 #1（apiPost、漏 invalidate）：`/Users/william/Projects/yizhan-erp/src/app/(main)/channels/_components/ChannelView.tsx:156-204`（特別 L168-203 那段 v4 註解承認「不靠 realtime」、但完全沒手動 invalidateChannelMessages）
- 撤回 #2（OK）：`/Users/william/Projects/yizhan-erp/src/app/(main)/channels/_components/ChannelView.tsx:207-218`
- 發公告 #3（OK）：`/Users/william/Projects/yizhan-erp/src/app/(main)/channels/_components/SendAnnouncementDialog.tsx:33-74`
- API 寫入：`/Users/william/Projects/yizhan-erp/src/app/api/channels/messages/route.ts:24-97`
- 訂閱機制：`/Users/william/Projects/yizhan-erp/src/data/core/entityHookRealtime.ts:28-63`
- 訂閱 race 根源：`/Users/william/Projects/yizhan-erp/src/lib/supabase/client.ts:26-39`
- entity hook 預設 dedupe 2 秒：`/Users/william/Projects/yizhan-erp/src/data/core/createEntityHook.ts:93-107`

**建議修法**
1. **立刻**（解 80% 症狀）：ChannelView.tsx handleSend 在 apiPost 成功後加 `await invalidateChannelMessages()` — 跟 SendAnnouncementDialog 對齊。`recentlySent` local state 可以保留當瞬時 UI fallback、但 SWR cache 必須要被通知。
2. **中期**（解 race）：
   - `client.ts` 改成 await setAuth 完成才 export supabase（或包成 lazy proxy）
   - `entityHookRealtime.ts` channel 名加 random suffix（學 `use-realtime-mutate.ts` line 66 那招）、避免同名 collide
3. **長期**（架構）：channel_messages 是高頻寫入的 table、不該走 entity hook 全表訂閱、應該 per-channel filter `channel_id=eq.${channelId}`（學 AiConversationsTab line 137-142 對 inbox_messages 的做法）

**影響範圍**
- 修法 1：只動 ChannelView.tsx 一行、零風險
- 修法 2：影響全 41 個 entity hook 的 Realtime 訂閱、要 regression
- 修法 3：channel_messages entity hook signature 改、影響所有 caller（目前 only ChannelView）

**難度**：S（修法 1）→ M（修法 2）→ L（修法 3 結構性）

---

### S3. LINE 客戶訊息進來要重新整理才看到

**症狀（白話）**
LINE 客戶傳訊息進來、員工在 `/ai?tab=conversations` 看 LINE 對話框 — 左邊「對話列表」有時會出現新對話 / 紅點未讀數、有時不會；點進某個對話、訊息流也是有時自動進來、有時要 F5。
譬喻：客人從前門按電鈴、櫃台有時聽到、有時沒聽到 — 因為電鈴的線跟櫃台不是綁定關係、是「希望會聽到」。

**病因（技術根因、一句話）**
跟 S2 同根（Realtime 訂閱 race），但 LINE 特別嚴重的 3 個額外問題：

1. **AiConversationsTab 對「對話列表」走 `useRealtimeMutate({ table: 'inbox_conversations', filter: workspace_id=eq.X, swrKeys: [listUrl] })`** — 訂閱用 `enabled: Boolean(workspaceId)`、第一次 mount 時 workspaceId 可能還沒 hydrate、enabled=false → effect deps 變化才重訂、有 race window
2. **對話 messages 訂閱** `enabled: Boolean(selectedId)` — 只有選了某對話才訂閱、切對話 unsub + sub、過程 setAuth fire-and-forget、訊息漏接機率高
3. **AiConversationsTab 還掛 `refreshInterval: 10000` 對列表 / 5000 對 messages** — 這是「polling 兜底」、表示開發者自己知道 Realtime 不可靠、用 polling 救。但 polling 也不是真正即時、用戶感覺「忽好忽壞」（有時 polling 剛好命中、有時要等到下個 5 秒整點）

額外發現：**LINE webhook 寫入路徑是雙寫**。
- 主寫：`recordInboxMessage` → `inbox_conversations` + `inbox_messages`（已在 publication ✅）
- 同時 LINE 自己舊系統還寫 `line_conversation_messages`（這張表**沒在 publication**）
- UI 讀 inbox_messages、所以雙寫不影響顯示、但是潛在的 SSOT 撕裂

**位置**
- 對話列表訂閱：`/Users/william/Projects/yizhan-erp/src/app/(main)/ai/_components/AiConversationsTab.tsx:130-142`
- 對話 messages 訂閱：同檔 L137-142
- polling fallback：同檔 L144-157
- Realtime hook 實作：`/Users/william/Projects/yizhan-erp/src/lib/swr/use-realtime-mutate.ts:51-88`
- LINE webhook 寫入：`/Users/william/Projects/yizhan-erp/src/app/api/line/webhook/route.ts`
- inbox 寫入 helper：`/Users/william/Projects/yizhan-erp/src/lib/messaging/inbox.ts:57-153`
- line_conversation_messages 雙寫（沒在 publication）：`/Users/william/Projects/yizhan-erp/src/lib/line/handler.ts:217-255`

**建議修法**
1. **立刻**（補上漏接）：LINE webhook `recordInboxMessage` 後、用 Supabase channel broadcast 主動推一個 event 給訂閱該 workspace 的 client、不要只依賴 postgres_changes（postgres_changes 在 RLS table + ssr cookie 場景已知不穩、5/18 註解寫得很清楚）
2. **立刻**：拿掉 `refreshInterval` polling、改靠 Realtime — 不然就承認 Realtime 不可靠、把 polling 提到 3-5 秒當主路徑（兩條一起跑等於沒 SSOT、且每 5 秒一次全 workspace inbox 一次 query 也是 Supabase egress 費用）
3. **中期**：跟 S2 修法 2 同 — fix setAuth race
4. **長期**：寫一個 audit 強制「任何 INSERT 到 publication 內的 table、不准直接 raw insert、必須走中央 helper 確認該 row 真的 broadcast 出去」

**影響範圍**
- 修法 1：影響 LINE / FB / IG 整個 inbound 路徑
- 修法 2：UX 變更（polling 拿掉、會更依賴 Realtime — 如果 Realtime 真壞、用戶完全看不到、所以要先有 #1）

**難度**：M

---

## 三、M 級破口（同類問題、其他頁面）

### M1. 8 個 entity 訂閱了 Realtime 但 publication 沒開（靜默失效）

**白話**：8 張表的 React 端 code 寫了「請通知我變動」、但 DB 端沒開廣播 — 永遠收不到通知、UI 永遠卡 stale。

**位置**：
- application_service_types
- chart_of_accounts
- customer_document_applications
- customer_documents
- document_types
- payment_request_items
- supplier_pricing
- workspace_bonus_defaults

**證據**：
- 41 個 entity 訂閱（`npx tsx scripts/audit-realtime.ts`）
- 35 個 publication 開了（`mcp__supabase-aierp__execute_sql` 查 pg_publication_tables）
- 差集 = 上述 8 個

**建議修法**：寫一個 migration `ALTER PUBLICATION supabase_realtime ADD TABLE public.X`、補齊 8 個。

**難度**：S

---

### M2. tours 列表用兩套 SWR cache、彼此不互通（SSOT 撕裂）

**白話**：tour 列表頁、tour 詳情頁、tour 編輯頁用兩套不同的「資料抽屜」、抽屜 A 換了東西、抽屜 B 不知道。

**位置**：
- `/Users/william/Projects/yizhan-erp/src/app/(main)/tours/_hooks/useTours-advanced.ts:16-188` — 自訂 SWR key 純字串 `'tours'`、自己 fetcher
- `/Users/william/Projects/yizhan-erp/src/data/entities/tours.ts` — entity hook cache key `entity:tours:list:v...`
- createTour（useTours-advanced L93-119）混搭：呼叫 entity hook 的 createTourData、然後 mutate 自己的 `'tours'` key — entity hook 的 invalidate 走 registry、不知道 `'tours'` 這個 key 也要 mutate

**症狀**：tour 新增後 useTours-advanced 列表 OK（mutate 自己 key）、但 entity hook 的 useTours 列表（如果有別 page 用）會 stale。反之亦然。

**建議修法**：把 useTours-advanced 整個砍掉、改用 entity hook 的 `useTours` + `usePaginated`（OR filter 用法參考 useOrdersListView 的 escapeOrValue 技巧）。或承認 useTours-advanced 是「特例」、寫進 eslint exception 並標 deprecated。

**難度**：M

---

### M3. accounting 模組整片用 useState + useEffect 自己撈、不走 SWR

**白話**：會計模組所有頁面（checks / accounts / vouchers / period-closing / trial-balance / general-ledger）都是「進頁面跑一次 SELECT、結果存記憶體、不會自動更新」。

**位置**：
- `src/app/(main)/accounting/checks/page.tsx:46-72`
- `src/app/(main)/accounting/accounts/page.tsx:62`
- `src/app/(main)/accounting/vouchers/page.tsx:59`
- `src/app/(main)/accounting/period-closing/page.tsx:62`
- `src/app/(main)/accounting/vouchers/components/CreateVoucherDialog.tsx:94-107`
- `src/app/(main)/accounting/reports/trial-balance/page.tsx:49`
- `src/app/(main)/accounting/reports/general-ledger/page.tsx:57-61`

**症狀**：別人改了傳票、自己頁面不知道；自己改完傳票、要看 dialog onSuccess 有沒有 callback `loadXxx()`；多 tab 切換時資料完全沒同步。違反紅線 F（直接 useSWR + 自己 useState cache）。

**建議修法**：
- 短期：每張表至少把 onSuccess 都掛上 loadXxx、別漏（檢過 checks/accounts/vouchers 有掛、period-closing 也有）
- 中期：accounting 整片改寫成 entity hook 模式 + 走 `useReportHook` for 報表類

**難度**：L（整片重寫）

---

### M4. SendAnnouncementDialog 排程功能假的（v1 標註但 UI 沒明示）

排程時間欄位讓 user 選、但 v1 標註「實際立即送出」。不直接影響資料同步、但會造成 user 對「為什麼我排了卻馬上送了」混淆 — 這跟 SWR 沒關係、放這裡備註。

**位置**：`/Users/william/Projects/yizhan-erp/src/app/(main)/channels/_components/SendAnnouncementDialog.tsx:132-134`

**難度**：L（功能補完）

---

### M5. ConversationNotes / RetrospectiveModal 用本地 `mutate(historyUrl)` + 自己 `useSWR`、沒走 entity hook

**白話**：對話的「業務紀錄」「復盤紀錄」是直接 fetch /api 端點、不是 entity hook。寫入時手動 mutate(historyUrl) — 短期 OK、但跨頁切回來會 stale、多 tab 看也不同步。

**位置**：`/Users/william/Projects/yizhan-erp/src/app/(main)/ai/_components/AiConversationsTab.tsx:676-705`（RetrospectiveModal）、L1367-1395（ConversationNotes）

**難度**：M（補 useRealtimeMutate / 改 entity hook）

---

## 四、L 級破口（細節 / 體驗小坑）

### L1. entity hook Realtime channel 命名衝突風險
固定 `realtime:${tableName}`、多個 component 同時 mount 訂同 table 不會衝突（Supabase 內部 channel reference count）、但快速切 page → unmount + mount 連續打 → 可能有 race。建議學 use-realtime-mutate.ts line 66 加 random suffix。

**位置**：`/Users/william/Projects/yizhan-erp/src/data/core/entityHookRealtime.ts:40`

### L2. `WORKSPACE_SCOPED_TABLES` 跟 entity config 雙 SSOT
紅線 F 違反（「不准散刻 useSWR」精神）。建議：所有 entity config 顯式設 `workspaceScoped`、`WORKSPACE_SCOPED_TABLES` 純當 fallback 不再加新、長期廢除。

**位置**：`/Users/william/Projects/yizhan-erp/src/data/core/entityHookCache.ts:101-166`

### L3. AiConversationsTab `refreshInterval: 10000` / `5000` polling 跟 Realtime 並存
重複 query、每 5 秒一次全 inbox SELECT、Supabase egress 費用 + 假裝 Realtime 在做事。要嘛全靠 Realtime（先把 S3 修對）要嘛全靠 polling。

**位置**：`/Users/william/Projects/yizhan-erp/src/app/(main)/ai/_components/AiConversationsTab.tsx:144-157`

### L4. `getCurrentUserContext` 在 createEntity 取 workspace_id、走的是 localStorage `auth-storage`
不是經過 `useAuthStore`、是直接 parse JSON。如果 zustand store 還沒 hydrate、會 race。寫入時偶爾會插到 workspace_id=null 的 row（不影響 attractions 因為 workspaceScoped=false、但 customers / orders 等會中）。

**位置**：`/Users/william/Projects/yizhan-erp/src/data/core/entityHookCache.ts:45-66` + `entityHookCrud.ts:69-73`

### L5. ChannelView markedReadRef 在 unmount 不清空
換 user / 換 workspace 後、ref 還記得「已標讀過」、新 user 切回同 channelId 不會再 mark — 影響 unread 紅點。資安 OK（後端 RLS 擋）、UX 不對。

**位置**：`/Users/william/Projects/yizhan-erp/src/app/(main)/channels/_components/ChannelView.tsx:55`

### L6. 散刻 useSWR 21 個檔案、紅線 F 違反
完整清單：
1. `src/app/(main)/settings/company/_components/BranchesSection.tsx`
2. `src/app/(main)/settings/company/_components/DimensionSection.tsx`
3. `src/app/(main)/tours/_components/ProfitTab.tsx`
4. `src/app/(main)/tours/[code]/page.tsx`
5. `src/app/(main)/tours/_hooks/useToursPaginated.ts`
6. `src/app/(main)/tours/_hooks/useTours-advanced.ts`
7. `src/app/(main)/tours/_hooks/useTourItineraryItems.ts`
8. `src/app/(main)/tours/_hooks/useAirports.ts`
9. `src/app/(main)/shared-data/banks/page.tsx`
10. `src/app/(main)/shared-data/countries/page.tsx`
11. `src/app/(main)/shared-data/airports/page.tsx`
12. `src/app/(main)/library/attractions/_components/tabs/RegionsTab.tsx`
13. `src/app/(main)/workspaces/page.tsx`
14. `src/app/(main)/workspaces/[id]/_components/QuotaHistorySection.tsx`
15. `src/app/(main)/workspaces/[id]/_components/ai-health-tab.tsx`
16. `src/app/(main)/ai/_components/AiRetrospectiveTab.tsx`
17. `src/app/(main)/ai/_components/AiConversationsTab.tsx`
18. `src/app/(main)/ai/_components/AiSettingsTab.tsx`
19. `src/app/(main)/bot/[lineUserId]/_components/CustomerInfoSidebar.tsx`
20. `src/app/(main)/orders/_hooks/useOrdersListView.ts`（已有 eslint exception comment）
21. `src/components/bank-combobox.tsx`

部分有正當理由（OR filter / report-style fetch、`useOrdersListView` 標好註解）、部分純粹是「沒走 entity hook」遺留物。建議：每個都加 eslint-disable comment 寫清楚為什麼、無法解釋的改寫成 entity hook 或 createReportHook。

---

## 五、SWR + Realtime 架構建議

### 結構性問題（不是補螺絲、是要整修）

1. **Realtime 訂閱機制有 race-prone 的設計缺陷**（client.ts setAuth fire-and-forget + entityHookRealtime 再 fire-and-forget + dedupingInterval 吃 mutate） — 用 polling 兜底已經承認這件事。要嘛根治、要嘛承認用 polling 為主。
2. **寫入 SSOT 撕裂**：同一個業務操作（送頻道訊息 / 新增景點）可以走 entity hook、可以走 apiPost、可以走 raw supabase — 每條路徑對 SWR cache 的「通知」方式不一樣。紅線 E（DB 寫入 SSOT）/ 紅線 F（client 讀取 SSOT）目前在實作層仍有違規。
3. **Polling vs Realtime 雙軌**：AiConversationsTab refreshInterval 5s/10s + useRealtimeMutate 並存 = 沒人是 source of truth。
4. **WORKSPACE_SCOPED_TABLES 跟 entity config 雙 SSOT** — 紅線 F 的精神在「workspace 隔離資訊放哪」這層自己被違反。

### 建議推進順序

| Phase | 動作 | 收益 | 風險 |
|---|---|---|---|
| **P0**（立刻、24 小時內） | S1+S2+S3 的「立刻」修法 + M1 publication 補齊 8 表 | 解 80% 「忽好忽壞」症狀 | 極低（每條 ≤ 5 行 code） |
| **P1**（一週內） | setAuth race fix + entityHookRealtime channel name 加 random suffix + 拿掉 AiConversationsTab polling | 解剩餘 Realtime race | 中（要 regression 全 entity 訂閱） |
| **P2**（兩週內） | M2/M3/L6 — accounting 改寫 entity / tours-advanced 收掉 / 21 個散刻 useSWR 收編 | SSOT 收乾、紅線 F 達標 | 高（大面積改寫） |
| **P3**（長期） | broadcast helper 化 + ESLint rule 強制 | 預防新違規 | 低 |

---

## 報告完
