---
date: 2026-05-12
source: Logan spawn 的 general-purpose subagent（扮演黒羽人格）
context: 第一輪圓桌討論結果、不是真黒羽 session、給真黒羽接手時參考
parent-spec: 2026-05-12-channel-system-spec-v0.md
---

# Channel spec §9 圓桌討論結果（Agent v1）

**重要 disclaimer**：這是 Logan 用 Agent tool spawn 的 general-purpose subagent 模擬黒羽人格跑的。沒有真實 vault context、人格也是 prompt 模擬。當參考、不當最終結論。真要深度策略 + vault 對齊還是要黒羽真 session 接手。

---

## 題 1：system_notice vs 哈比 bot 怎麼分

**Trade-off**
- 合併：schema 一張、好維護、但 UX 行為差異難用 type 控制、易亂
- 分開：多一個 type、UI 多一套 render
- 業務語意根本不同：system_notice = 單向通知流（XX 剛建了報價單）、bot = 可被 @ 問問題、可推卡片、有對話上下文

**推薦**：維持兩個獨立 type。
- `system_notice` 強制 only-thread-reply（不允許頻道內直接發新訊息）
- `bot` 允許 chat
- 同一張 `channel_messages` 表、靠 `message_type` 區分

**需 William 拍板**：`system_notice` 裡的 thread reply、是任何人都能回、還是只有相關人（如報價單 owner）才能回？影響 RLS 設計。

---

## 題 2：AI 客服機器人（給客戶）vs 內部哈比怎麼隔離

**Trade-off**
- 同 workspace 共存：省事、但 RLS 出錯會內部訊息外洩、風險大
- 完全另起爐灶：最安全、但開發量雙倍、v1 不該考慮
- workspace 層級隔離：用 scope 欄位 / 外部 workspace、中間路線

**推薦**：v1 不做客戶 AI 客服頻道。bot channel 留給內部哈比就好。客戶頻道是未來另一個 feature、到時再設計隔離。

**需 William 拍板**：客戶頻道的時間線？3 個月內 → schema 要現在留坑；1 年後 → 不用管。

---

## 題 3：邀請流程 A vs B

**Trade-off**
- A 直接加：流程快、Slack-like、但被加者「無感」是舊版痛點 → 哈比通知可補救
- B invite 表：被邀者主動接受、邏輯乾淨、但多一步確認、ERP 內部員工情境下彆扭、pending 狀態管理複雜
- 舊版痛點根因不是「沒 pending」、是「被加無感」→ A + 通知就能解

**推薦**：方案 A。直接 INSERT channel_members、同時哈比 bot 推通知給被加者（message_type='system'、payload 帶 channel link）。

**需 William 拍板**：哈比通知卡片要什麼資訊？「頻道名稱 + 誰邀的 + 進入按鈕」這三個夠嗎？

---

## 題 4：v1 @xxx action 範圍

**Trade-off**
- 做太多：每個 @action 都要 mention parser + RPC handler + 卡片模板、v1 爆炸
- 做太少：只做 @哈比 沒 ERP 整合、失去核心價值
- 優先：最常用 + 最能展示 channel × ERP 整合的先做

**推薦 v1 做 2 個**：
1. `@哈比` — bot channel 的存在意義
2. `@報價單` — 報價是業務最前端、頻率最高、模式跑通後 `@請款單` 照抄

`@請款單` 進 v2、邏輯幾乎等於 `@報價單`、v1 跑通後 v2 複製貼上即可。

**需 William 拍板**：`@報價單` 觸發後是「建新」還是「搜尋現有」？兩個需求差很多。

---

## 題 5：公告排程範圍 + 撤回機制

**Trade-off**
- 排程只限 announcement：邏輯乾淨、前端只在 announcement channel 顯示排程 UI
- 排程全頻道：看似彈性、實際使用情境幾乎不存在、加了只增 edge case
- 撤回已發公告：技術簡單、但「發了又消失」UX 怪、要不要留「本公告已撤回」佔位

**推薦**（不需 William 再拍）：
- 排程只開放 announcement type
- 撤回 v1 用 soft delete、前端顯示「此公告已撤回」佔位卡、不允許修改已發內文、要修改就重發

---

## 題 6：v1 reactions / attachments / is_pinned

**Trade-off**

| 功能 | v1 不做會痛？ | 理由 |
|---|---|---|
| reactions | 不痛 | 表情潤滑劑、不影響業務流程 |
| attachments | 有點痛 | 討論報價單想傳 PDF / 圖、沒有只能貼連結 |
| is_pinned | 不痛 | 有更好用、沒不會痛 |

**推薦**（不需 William 再拍）：
- `reactions` / `is_pinned` → v2、schema 欄位留著、UI 先不做
- `attachments` → v1 schema 留 jsonb、但只支援「貼連結 URL」、不做上傳（S3 是另一個 feature）。用 URL 先撐、v2 再接 storage

---

## 對 William 的 4 個追加問題（送下一輪會議拍板）

1. **system_notice thread reply 權限**：任何人都能回？還是只 owner 才能？
2. **客戶 AI 客服頻道時間線**：3 個月內 / 半年內 / 1 年後？
3. **哈比邀請通知卡片內容**：「頻道名 + 誰邀 + 進入按鈕」夠嗎？還要加什麼？
4. **@報價單 觸發語意**：建新報價單貼回頻道 / 搜尋現有報價單？或都要？

## Agent 自己拍的（不需 William 再拍）

- ✅ Q7 公告排程：只限 announcement、撤回用 soft delete + 佔位卡、不允許修改重發
- ✅ Q8 v1 範圍：reactions / pinned v2、attachments v1 但只支援 URL 連結不做上傳
