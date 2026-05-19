# LINE / AI Hub / SWR 架構重構 — 待辦清單

> 建立：2026-05-17 / 已 commit `8b5b90f` 推上 main
> 對應 todos 表 master todo id `be711d60-e2aa-4ca6-b4bb-f667efa782d2`

## ✅ 今天完成（已 push）

### LINE Bot + AI Hub 主鏈
- [x] LINE webhook channel_id UI 文案 bug 修
- [x] LINE Bot freestyle 模式（不接 RAG、誰都能亂回）
- [x] opencc-js 100% 簡→繁（取代自寫 mapping）
- [x] 群組訊息真名顯示（fetchLineGroupMemberProfile 不限好友）
- [x] 群組 conversation「群組 #末4碼」+ Users icon
- [x] LINE 圖片/貼圖/位置/follow/join 友善描述
- [x] sendViaLine 走加密 token（agent UI 送訊息 401 修復）
- [x] customers.member_type 'individual' → 'potential'
- [x] LINE webhook 訊息 history 30 → 200 條
- [x] line-llm-compose LLM context 20 → 50 條

### 對話管理 / AI Hub
- [x] sidebar 280px + 兩行緊湊 layout + 頭像 channel 角標
- [x] 合併「同事 + 私訊」單一 section
- [x] Bot 自動回覆 toggle 搬 header 右側
- [x] 訊息 list auto-scroll to bottom
- [x] mark_as_read 進對話自動清未讀
- [x] Input Enter 送出 + 跟按鈕同高
- [x] 拿掉 channel filter / raw user ID
- [x] 暫時隱藏「AI 控制中心」dashboard tab

### 租戶管理 LLM Token
- [x] workspace_ai_settings 加 7 欄位 + CHECK constraint
- [x] LlmTokenSetupDialog 4-step wizard
- [x] API 擴 PUT + DELETE + status + validate
- [x] MiniMax / Anthropic / OpenRouter client + LLM dispatcher
- [x] dispatchLLM 全程加 log
- [x] HAPPY handler（同事跟 HAPPY 聊、共用 token）

### SWR / Cache / Realtime 架構（Phase 1 + 2.1）
- [x] Realtime publication 34 表全開（從 4 跳到 34）
- [x] apiMutate helper + 32 個 caller 改造
- [x] useRealtimeMutate hook
- [x] useTodos 改 createEntityHook
- [x] swr/config.ts per-user cache key（資安洞修）
- [x] clearAllSwrCacheKeys() + logout 清 cache
- [x] CACHE_VERSION v1 → v2

### Migrations（已 commit）
- [x] `20260517990000_enable_realtime_for_inbox.sql` 補檔
- [x] `20260518000100_enable_realtime_for_all_entities.sql` 30 表
- [x] `20260518100000_add_fk_todos_column_id.sql` 防孤兒
- [x] `20260518110000_add_llm_token_to_workspace_ai_settings.sql`

---

## ⏳ Phase 2 — 剩餘 SWR 全面套用（凍結後 / 週末整理）

預估 **6-10 小時**、不今天做。

- [ ] **Phase 2.2** paginate hooks 併進 entity hook
  - useTours-advanced / useToursPaginated
  - useAirports / useOrdersListView
  - 加 server-side pagination + filter + search 支援
- [ ] **Phase 2.3** 砍 `createCloudHook`、4 個 caller 改 entity hook
  - orders / tours / quotes / itineraries
- [ ] **Phase 2.4** finance report hooks 抽 `createReportHook`
  - usePayables / useReceivables / 5 個 RPC view hooks
  - 統一 mutate 介面（不走 entity hook、因為 RPC view）

### Phase 2.1 剩餘 ~15 個 caller 跳過（合理）

需要 apiMutate 擴充才能套：
- FormData upload caller（OCR / 護照 / 頭像 / 圖片）— 6 個
- Auth flow（change-password / personal）— 3 個
- response.blob() 抓圖片 — 2 個
- success flag shape — 4 個

→ Phase 2.5 可以做：擴 apiMutate 支援 FormData / blob / successFlag 選項。

---

## ⏳ Phase 3 — Lint + Audit + CI 守門（凍結後）

預估 **4-6 小時**。

- [ ] ESLint rule `venturo/no-direct-useswr-in-pages`
- [ ] ESLint rule `venturo/require-api-mutate-for-mutations`
- [ ] `npm run audit:realtime` 偵測 entity hook vs publication 差集
- [ ] CI workflow 加 audit:realtime
- [ ] CLAUDE.md「中央 Module 索引」加「資料讀取與 Cache 失效 SSOT」

---

## ⏳ Phase 2（LINE / AI Hub 本身）功能完整化

### LINE Bot 完整化
- [ ] **圖片完整下載 + Supabase storage**
  - bucket: `line-media`
  - handler 收 type=image → getMessageContent API → upload storage
  - UI render `<img>` 縮圖、點開原圖
  - 同樣處理 video / audio / file
  - 貼圖 sticker：直接 link line-stickers.com
- [ ] **群組手動命名 + 上傳頭像**
  - 對話 header 加「✏️ 編輯」按鈕（僅 group/room 顯示）
  - PATCH /api/messaging/conversations/[id] 加 display_name / picture_url / notes
  - 客戶自己改的不被 webhook 覆蓋
- [ ] **10 秒 debounce reply**
  - 收到訊息排程 10 秒 timer
  - 10 秒內又收新訊息 → cancel 重排
  - 10 秒內沒新訊息 → LLM 一次性回（合併所有累積訊息）
  - 持久化：Supabase pg_cron 或 in-memory queue
- [ ] **對話復盤功能**
  - 新表 `conversation_summaries`：每 thread 定期 LLM 摘要
  - 新表 `customer_long_term_memory`：客戶長期偏好 / 過敏 / VIP
  - 新表 `group_participants`：群組成員 → customer mapping
  - inbox_messages 加 attachments JSONB
  - cron 跑摘要任務
- [ ] **LLM provider v2**：opencc-js s2twp（含台灣詞組「軟件→軟體」「信息→訊息」「視頻→影片」）

### AI Hub 完整化
- [ ] **AI 控制中心 dashboard 上線**（等真實數據量）
  - 對話統計、平台連線、AI 回應效能
  - 7 日 trend chart
  - 哪些客戶傳最多、agent 平均處理時間
- [ ] **LINE 跨工作區 webhook 路徑**（production 上線後）
  - LINE Developer Console webhook URL 改 production
  - 把 ngrok 拿掉

---

## 🔐 紅線 / 規則待補

- [ ] CLAUDE.md 紅線新增「資料讀取與 Cache 失效 SSOT」
  - 對齊紅線 E（同表寫入 SSOT）的 Client 端版本
- [ ] CLAUDE.md 紅線新增「per-user SWR cache key」
  - 5/17 William 抓的跨帳號 cache 污染洞、值得記下

---

## ⚠️ 排程的 ScheduleWakeup loop 還在跑

我啟動了多輪 ScheduleWakeup、可能還會 fire 幾次（之前排的 prompt 已過時、實際進度遠超 prompt 內容）。
**建議**：明天看到 wakeup fire 自動跑、會 verify 進度發現都做完了、自然停。或者直接忽略。

---

## 📊 commit 統計

- commit hash: `8b5b90f`
- 130 files changed
- +11004 / -1055
- 1051 tests passed
- SSOT 自動 audit 全綠
- migration 4 個（全 production 已 apply）
