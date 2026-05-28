# Alex 交接筆記（2026-05-28）

## 上層：3 行總結

1. **你是誰**：Alex（@VT_ALEX_BOT）、AI Engineer、yizhan-erp 4 senior bot 之一（scope = AI Hub / LLM dispatcher / RAG / LINE 整合）。
2. **上一場到哪**：今天做了 ① 公共池販售移除+歸還角落（已 push）② 一串 UI 修復（AI 設定 dialog + 開團 dialog）③ 訂房 PDF（一次性）④ AI 復盤/速度診斷 ⑤ **LINE 推播計次功能階段 1**（表+RPC+helper+types 已好、已 apply production DB、發送點未串）。
3. **下一個動作**：接 **LINE 計次階段 2**——串 4 個 push 發送點（接上計次 + 錯誤記錄）。

---

## 中層：當前任務狀態

### 🔧 進行中：LINE 推播用量計次功能（William 拍板「兩個都做」= 救傳不出去 + 計次）

**階段 1 ✅ done（已 apply production DB、驗證過、type-check 綠）**：
- 表 `workspace_line_usage`（workspace × billing_month 計次 + plan + monthly_limit + last_error_code）
- RPC `increment_line_usage`（原子 upsert、成功/失敗分開累加、SECURITY DEFINER）
- helper `src/lib/line/line-usage-counter.ts`（`recordLinePush(workspaceId, {ok,status})`、fire-and-forget）
- types 已手動加 `increment_line_usage`（src/lib/supabase/types.ts、下次 regenerate 自動含）
- RLS 4 條全 workspace 隔離（走 `setup_workspace_scoped_rls` procedure、過紅線 H）
- 免費版預設 200、測過、測試資料已清

**階段 2 ⏳ 待做：串發送點**（會動 LINE 發送核心、逐一改）：
- `pushLineText`（src/lib/line/push-client.ts）+ `pushToLine`（src/lib/line/reply-client.ts）→ 加 `workspaceId` 參數 + 內部呼叫 `recordLinePush`
- 4 個 push 呼叫處傳 workspaceId：
  - `src/app/api/line/webhook/route.ts:800`（postback 自動回）
  - `src/app/api/line/conversations/[lineUserId]/messages/route.ts:82`（人工推送）
  - `src/lib/line/handler.ts:485`（客服自動回 fallback）
  - `src/lib/messaging/send-reply.ts:149`（messaging 統一發送）
- reply（`replyToLine`）無限免費、**不計**

**階段 3 ⏳ 待做**：接 LINE 官方 quota consumption API（`GET /v2/bot/message/quota` + `/consumption`）拿精確數字、順便驗 token

**階段 4 ⏳ 待做**：AI Hub 顯示「本月推播 X/200、剩 Y、80% 黃燈/滿紅燈」+ 「LINE 推播另外計次」說明

### ❓ 等 William 拍板
- 滿額度行為：先「顯示+預警」、不自動停 AI（William 預設同意）；「滿了自動轉人工」待定

### ⚠️ 卡點 / 診斷發現
- **LINE「傳不出去」兩嫌疑**：(A) 本月 AI 回覆 161 次、接近免費 200 額度可能滿；(B) **secrets 的 LINE token 認證失敗(401)**。系統實際發 LINE 用 DB（workspace_line_settings 加密）token、不是 secrets。→ **William 要去 LINE 官方後台確認額度 + token 是否過期**。
- **大型復盤（rag_topic_queue）0 筆 = 沒成功跑過**（來源 customer_memories 只 2 張、聚合不出主題）。不是「沒存欄位」。對話級復盤（conversation_retrospectives）13 筆有存有讀回、OK。
- **AI 反應快慢**：line-llm-compose avg 6s（注入速記卡+RAG+商品+50則歷史、且無串流）、happy/ai-brain 2s。最有感優化 = **加串流**。llm_usage_logs 已記 latency_ms 可查。

---

## 下層：詳細（想深挖再讀）

### 今天已 commit 的（這次交班分批 commit）= 都是我動的、type-check 過
- **AI 設定 dialog UI**：`AiSettingsDialog.tsx`（tab 按鈕→金線 underline + ml-auto 靠右、header border-b → mx-6 獨立分隔線、金線跟分隔線分開不疊）、`AiSettingsTab.tsx`（divider 加 mx-6）
- **開團 dialog UI**：`TourFormShell.tsx`（隱藏備註欄位、清 Input/COMPONENT_LABELS）、`tour-form/TourBasicInfo.tsx`（移除團控提示文字）、`components/ui/simple-date-input.tsx`（`avoidCollisions={false}`→`avoidCollisions` 修月曆被畫面擋、**共用元件、全站日期選擇受益**）
- **LINE 計次階段1**：`migrations/20260528090000_create_workspace_line_usage.sql` + `lib/line/line-usage-counter.ts` + `lib/supabase/types.ts`（加 RPC type）

### 今天稍早已 commit + push
- `ff0a28f` AI 品牌名中性化（4 檔）
- `1649e02` 公共池販售移除+歸還角落（8 檔含 4 migration、已 apply production：景點/飯店/餐廳 3332 筆歸角落、RLS 簡化、shared_data_content gate 清、ref_* 機場/銀行/國家保留）

### 別人的活（絕不碰）
- tours/canvas display-editor 那批（13 改 + 3 新 component FlightCardEditor/LeaderMeetingEditor/CanvasLeaderMeeting）+ `規格書.md` = 別 session 進行中
- Logan 3 個 stash（5/23-24 待併回）

### LINE push 架構
- 2 函式：`pushLineText`(push-client，簡單 text)、`pushToLine`(reply-client，messages array) + 4 入口（見階段2）。reply 走 `replyToLine` 無限免費。

### 其他
- 訂房 PDF：`/tmp/booking-confirmation-OONXWB269057.pdf`（一次性、A4 一頁、去金額、客戶 Ching-Yi Chan、不進 git）。產 PDF：`NODE_PATH=<repo>/node_modules node /tmp/gen-booking-pdf.js`（playwright A4）。
- memory `venturo-rag-embedding-minimax` 已寫（RAG embedding 走 MiniMax embo-01、不碰 OpenAI）。
- LINE 社群（OpenChat）不支援 Messaging API bot（查證過）；一般群組可以。

### 當前 branch
- `fix/customers-into-database`（多 session 共用、不切 branch）

---

— Alex、2026-05-28
