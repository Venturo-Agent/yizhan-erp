---
date: 2026-05-12
author: Logan（執行整理）
status: spec v0 — 待黒羽 + William 圓桌討論細化
context: yizhan-erp Channel 系統重做（5/2 才砍掉舊版、now 要重做、避免重蹈覆轍）
---

# Venturo Channel 系統 spec v0

## 0. 給黒羽的話

William 拍板要找你（處理靈魂資料庫的人員）一起做圓桌討論、把 Channel 系統的開發方向、問題點、架構討論清楚再交給我（Logan）動 code。

**William 鐵律提醒**：「整體的設計必須符合我們 ERP 的層級結構、不能天馬行空」。圓桌要克制、要扣回業務面。

---

## 1. 為什麼做 Channel？

引用 William 2026-05-12 訊息：

> 「Slack 有很多不管是未來整合 API 或其他的擴充性、而我們在整合內部 ERP 系統（例如報價單、請款單等流程）時、可以更快速地完成。」
> 「我最主要的理念是讓系統能與同事溝通、並可以建立自己的群組。如果以 Slack 來解釋、就是能開設專案群組、選定該專案後、系統在撈取資料時會自動綁定相關資訊、讓後續的開發自動化更加方便。」

核心目的（**不**是純聊天）：
1. **協作** — 員工溝通 + 專案討論
2. **ERP 整合面** — 在頻道內走業務動作（@報價單、@請款單、@AI 撈資料）
3. **擴充性** — 留接口給未來 API integration / AI 客服機器人（給客戶用、跟內部 channel 不同層）

---

## 2. 歷史脈絡（為什麼 5/2 砍掉）

yizhan-erp 之前做過一整套：
- 2025-12 ~ 2026-01：channels / messages / channel_members / channel_groups
- 後續加 visibility / scope / features / DM RPC
- **2026-05-02 William 拍板「內部聊天功能直接完全刪除」**
- 2026-05-03 CASCADE drop

William 砍掉的 3 個痛點：
1. **1on1 顯示 UUID** — 前端 query 沒 join employees、看到一串 UUID
2. **自動建頻道違和** — sidebar 太多自動建的頻道、視覺亂
3. **追加成員邏輯不通順** — channel_members 是平的、加一個是一個、被加者無感

新版必須避這 3 個坑。

---

## 3. 5 種 Channel Type（William 5/12 最終定）

| Type | 用途 | 誰能發 | 誰能加入 | 自動建？ |
|---|---|---|---|---|
| 1. `announcement` | 公告（人發、3 個固定按性質）| 老闆或有權限的人 | 全員 | 是、3 個固定 |
| 2. `system_notice` | 系統公告 | 系統 only、人不能發、only-thread-reply | 全員 | 是 |
| 3. `dm` | 1on1 私訊（含員工↔員工、員工↔HAPPY）| 兩人都能 | 限定兩人 | 員工 ↔ HAPPY 自動建、員工 ↔ 員工 lazy 建 |
| 4. `blank` | 空白群組 | 擁有者 | 邀請制 | 否、任何人手動 |
| 5. `project` | 團專案頻道 | 擁有者 | 邀請制 | 否、僅該團 controller_id 能建 |

**重要決定（5/12 William 拍板）**：
- 不做 `bot` type 公開頻道、**HAPPY 純走 DM**、每個員工各自跟 HAPPY 的 1on1
- 對外 AI（FB / IG / LINE@）**不在 channel 系統內**、之後會有獨立路由
- 沒有 scope 欄位、純內部

### 待釐清（圓桌討論）

**Q1：3 個固定公告頻道是哪 3 個？** ✅ 5/12 William 拍板 = **按性質分**
- `#重要事項` — policy / 制度變更
- `#日常公告` — 活動 / 一般佈達
- `#表揚 & 紀錄` — 業績達成 / 員工生日 / 重要里程碑

**Future consideration（未來擴展、不在 v1）**：
- William 提到「公告範圍可以看、最後才會有部門主管、再來是全公司公告」
- 暗示未來可能加「按範圍」的層級（全公司 → 部門）
- v1 先按性質做 3 個、未來擴成性質 × 範圍 矩陣

**Q2：系統公告（system_notice）vs AI 機器人（bot）差在哪？**
- William 講：「系統公告：不會有人說話、僅供針對該項內容進行串連回覆、不能直接在頻道聊天」
- 是不是 system_notice = 只允 thread reply、不允頻道內直接發訊息？
- bot 則是 AI 推送 + 可以 chat（@HAPPY 問問題）？

**Q3：AI 機器人命名** ✅ 5/12 William 拍板 = **HAPPY**
- 是 SaaS 內部 AI 統一名稱（給租戶員工查內部資料用）
- 走 `dm` type、每個員工自動有一個 1on1 with HAPPY
- 不做公開 bot channel

**Q4：對外 AI 客服機器人** ✅ 5/12 William 拍板
- 對外 AI 綁在 Facebook / IG / LINE@
- **不在 channel 系統內**、之後會有獨立的路由 / 介面
- channel 系統 v1 不需處理對外、scope 欄位砍掉

---

## 4. 成員管理機制（William 5/12 強調）

引用：
> 「1. 成員管理機制：(a) 邀請同事的機制 (b) 刪除與退出機制」

舊版砍掉的原因之一：「追加成員邏輯不通順、一個一個加」。

新版兩個方案二選一、待 William 拍板（見 §9）：

**方案 A — 直接加 + 機器人通知**
- 擁有者點「邀請」→ 直接 INSERT channel_members
- 同步在被邀者的機器人頻道推卡「你被加入 #XX 頻道、點此進入」
- 流程一步、像 Slack

**方案 B — invite 邀請流程**
- 建 `channel_invitations` 表（pending/accepted/declined）
- 被邀者要主動接受才進入
- 流程兩步、更禮貌

退出 / 刪除：
- 自己可隨時退出（DELETE channel_members WHERE user = self）
- 擁有者可踢人
- DM 不能退出（兩人才有意義、退一邊也沒意義）
- 系統頻道（announcement/system_notice/bot）不能退出

---

## 5. ERP 整合（William 5/12 願景）

引用：
> 「我們在整合內部 ERP 系統（例如報價單、請款單等流程）時、可以更快速地完成。」

要在頻道內走 ERP 動作：
- `@報價單` → 建報價單、結果以卡片貼回頻道
- `@請款單` → 建請款單
- `@AI` → 跨 channel 查資料（「王大明這三年退過幾張票」）

技術 sketch（待圓桌討論）：
- channel_messages 加 `message_type` 欄位、值含 `'text'|'card'|'system'|'bot'|'action_result'`
- card 訊息的 `payload jsonb` 結構化、前端 render 成卡片（不是純文字）
- 點卡片可一鍵跳結構化頁
- @ 觸發 mention parser、轉 RPC call

---

## 6. 公告系統（William 5/12 加新需求）

引用：
> 「在對話中使用『@公告』即可調出提示窗、設定發送時間與內容。」

需求：
- 公告 channel 內、發送者可以打 `@公告` → 跳出 modal
- modal 內：設定發送時間（未來 / 立即）+ 內容
- 排程到設定時間自動發

實作面：
- 用 cron / pg_cron / supabase scheduled function 排程
- announcement_messages 表加 `scheduled_at` 欄位
- 排程前狀態 = pending、時間到 trigger 改成 sent + push 進 channel

待釐清（圓桌討論）：
- 排程功能是只有 announcement 有、還是任何 channel 都能用？
- 排程已發出後可以撤回 / 修改嗎？

---

## 7. Real-time 與效能（William 5/12 強調）

引用：
> 「即時通訊：確保對話的即時度（Real-time）、並針對 One-on-one 或各個頻道的載入順序與效能進行優化。」

技術考量：
- Supabase Realtime（postgres_changes）監聽 channel_messages
- channel 列表載入順序：未讀的優先 / 最近活動排序
- 訊息分頁：scroll up infinite load、不要一次撈全部
- DM channel name 動態算（不存 fixed name、用 view 算對方名字）

---

## 8. Schema 草稿（5/12 拍板版）

```sql
-- employees 表現有、加 is_bot flag 標記 HAPPY
ALTER TABLE employees ADD COLUMN is_bot boolean DEFAULT false;
-- 每個 workspace seed 一筆 HAPPY 員工 (is_bot=true、display_name='HAPPY')

channels
  id uuid pk
  workspace_id uuid not null
  type text not null check (type in ('announcement','system_notice','dm','blank','project'))
  tour_id uuid nullable references tours(id)   -- 只 project 用
  name text
  description text
  created_by uuid references employees(id) on delete set null
  is_system boolean default false              -- announcement/system_notice = true、不能手動刪
  is_archived boolean default false
  archived_at timestamptz
  created_at / updated_at

channel_members
  channel_id uuid not null
  employee_id uuid not null references employees(id) on delete cascade
  role text check (role in ('owner','member'))
  joined_at timestamptz default now()
  last_read_at timestamptz                     -- 未讀紅點用
  primary key (channel_id, employee_id)

channel_messages
  id uuid pk
  channel_id uuid not null references channels(id) on delete cascade
  sender_id uuid references employees(id) on delete set null   -- null = 系統訊息；HAPPY 訊息 sender_id=HAPPY 員工 id
  body text
  message_type text check (message_type in ('text','card','system','action_result'))
  payload jsonb                                                 -- 卡片 / 系統參數
  reply_to_id uuid references channel_messages(id) on delete cascade   -- thread
  reply_count integer default 0
  last_reply_at timestamptz
  scheduled_at timestamptz                                      -- 公告排程
  is_pinned boolean default false                                -- v2 UI、欄位先留
  reactions jsonb default '{}'                                  -- v2 UI、欄位先留
  attachments jsonb default '[]'                                -- v1 只放 URL string array、不做檔案上傳
  created_at / edited_at / deleted_at
```

**砍掉**：visibility / scope / features / group_id / is_favorite / _needs_sync / bot type / message_type='bot' — 過度設計或不需要。

**RLS 策略**：
- `channels`：member 才能 SELECT；project type INSERT 要驗 tour controller；blank/dm 自由建；announcement/system_notice 只能 service role 建
- `channel_members`：member 才能 SELECT；owner 才能 INSERT/DELETE；DM 不能退出（兩人才有意義）
- `channel_messages`：member 才能 SELECT/INSERT；sender 才能 UPDATE/DELETE 自己的訊息；system_notice 內只允許 INSERT 有 `reply_to_id` 的訊息（不能在頻道直接發新主訊息）

---

## 9. 拍板項（5/12 全部 close）

含 Logan-spawn subagent 圓桌 + William 二輪確認。

### 已拍板
- ✅ **Q1 公告頻道**：3 個固定按性質分 — `#重要事項` / `#日常公告` / `#表揚 & 紀錄`（未來再擴範圍維度）
- ✅ **Q2 AI 機器人**：定名 **HAPPY**
- ✅ **Q3 system_notice vs bot**：兩個獨立 type
  - `system_notice` only-thread-reply、不能在 channel 直接 chat、**任何人都能回 thread**（不限 owner）
  - `bot`（HAPPY）可雙向對話、可推卡片
- ✅ **Q4 對外 AI**：**不在 channel 系統內**、之後獨立路由（綁 FB / IG / LINE@）
  - scope 欄位砍掉、純內部
  - HAPPY = SaaS 內部租戶員工查資料用、走 DM、不做公開頻道
  - 每個員工自動有一個 1on1 with HAPPY
- ✅ **Q5 邀請流程**：方案 A 簡化版
  - 直接 INSERT channel_members、**不發機器人通知**（內部不需通知打擾）
  - 不做 invite 表
- ✅ **Q6 v1 動作入口**：**「+」按鈕 v1 整個不做**（5/12 William 拍板再砍）
  - v1 channel 內純訊息、不做 @ mention 也不做 + 按鈕
  - ERP 整合（建報價單 / 建請款單 / 問 HAPPY）v2 再加
  - HAPPY 走 DM 對話、員工想問問題打字進去就好
- ✅ **Q7 公告排程**：只限 announcement type、撤回 soft delete + 「本公告已撤回」佔位卡、不允許修改已發內文
- ✅ **Q8 v1 範圍**：
  - reactions / pinned 進 v2、schema 留欄位 UI 不做
  - attachments v1 只支援「貼 URL 連結」、不做檔案上傳

### 全部 close、可以動 migration
1. ✅ 對外 AI 不在系統、HAPPY 走 DM
2. ✅ 純內部、不需要 scope
3. ✅ 「+」按鈕 v1 不做、v2 再加

### HAPPY 員工座位實作
- employees 加 `is_bot boolean default false`
- 每個 workspace seed 一筆 employee row：`{ display_name: 'HAPPY', is_bot: true, workspace_id: 該 workspace }`
- 新員工進來時、自動建 DM channel with HAPPY（lazy 也可以、但 HAPPY 是「人人都會用」、直接 onboarding 時建比較順）
- HAPPY 訊息 sender_id = HAPPY 員工 id、前端看到的就是 HAPPY 名字 + HAPPY avatar、不會看到 UUID（解舊版痛點 1）

---

## 10. 鐵律提醒

- **William 不看 code**、回報用業務語言
- **不能天馬行空**（William 鐵律）— 設計要扣回 ERP 業務流程、不要做 Slack 的所有功能
- **動 Supabase 必先 William 拍板**
- **避開舊版 3 個痛點**：
  - UUID 顯示 → 一律 join employees、回 sender_name
  - 自動建違和 → 只 seed 系統頻道、其他 lazy 建
  - 邀請邏輯 → 拍板 A/B 後通盤設計、不要平 INSERT

---

## 11. 今日討論前情提要（接手用）

從 5/12 早上開始的脈絡：

1. **資料盤點階段**（William 問：OKA / NGO 沒成本是為什麼）
   - 查清舊新 Supabase、payment_requests / receipts / quotes
   - 結論：蟲點子名古屋舊系統就沒建請款、不是匯入時掉的
   - OKA 沖繩 receipts 有 53,500 pending、付款端 0 筆、tour.total_cost 140,500 是孤兒數字

2. **handoff 接收**（William 從概念機丟 HANDOFF.md）
   - 全文吃完、跟今天 OKA/NGO 問題對接
   - P1.1 / P1.2 / P1.3 正好解決孤兒成本 / 報價斷鏈 / 帳單斷鏈

3. **結案流程修正**（已動手完成）
   - 砍舊 TourClosingDialog（5 處 dead code 清理）
   - 加獎金出帳日期 datepicker 到 BonusSettingsDialog（不是 ClosingReportDialog）
   - 日期衝突阻擋（disbursement_date < today 跳錯不結案）

4. **Channel 設計討論**（這份 spec 的起點）
   - 6 種 type 確定
   - 痛點 3 個對應改法
   - 待圓桌定 8 個拍板項

5. **下一步**
   - 圓桌跑完、Logan 接 §9 結論寫 migration + UI
