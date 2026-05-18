---
created: 2026-05-14
author: Robin（男僕、三胞胎之末）
status: 同步用、非請示
related:
  - [[2026-05-14-ai-integration-spec-v2-circle-table]]（執事長 spec）
  - [[2026-05-13-venturo-aierp-上線戰略地圖]]
---

# Robin 補：Kimi app 整合 AI Hub 規劃

## 為什麼寫這張卡

William 5/14 拍板讓 Robin 接手「整合 Kimi 做的 AI 平台（/Users/william/Desktop/app）」進 yizhan-erp。
跟執事長 5/14 寫的 [[2026-05-14-ai-integration-spec-v2-circle-table]] 有交集、純同步、不挖坑、不搶活。

## William 指示重點

1. Kimi 那邊的 app 設計方向都是 William 要的、要整合進 yizhan-erp 加快撰寫
2. ERP 整合 tab 不要（因為 yizhan-erp 本身就是 ERP）
3. AI 模組要有分頁、Kimi 的側邊欄就是我們的分頁

## William 拍板的方案（主對話兩題）

**Q1 新 AI 路由 vs 既有 /messaging 怎麼處理？**
→ 新建 /ai 獨立路由、/messaging 合併進去

**Q2 Kimi 莫蘭迪深色側邊欄 + 金色要保留嗎？**
→ 全部統一成 venturo 既有風格（拿掉深色側邊欄 + 金色）

## 路由結構

```
/ai                          ← 新建、預設 dashboard tab
  ├ ?tab=dashboard           AI 控制中心（Kimi Dashboard、改 morandi）
  ├ ?tab=conversations       對話管理（Kimi 三欄 + 既有 /messaging 合併）
  └ ?tab=settings            AI 設定（暫空殼）

/messaging  ← 廢棄、redirect → /ai?tab=conversations
```

## 跟執事長 spec v2 對齊建議

執事長 spec v2 提到要做 `ai_integration` umbrella feature（賣三通路 + AI brain 套餐 NT$3000/月）。

**Robin 補的建議**：feature 統一叫 `ai_hub`、不要 `ai_integration` 跟 `ai_hub` 兩套並存。

理由：
- venturo 既有命名慣例都是 module 概念（`finance` / `tours` / `hr`）、不是「整合」
- `ai_hub` 對應 sidebar 入口「AI Hub」、UI / capability / feature / 路由全對齊
- 之後 sub-capability 命名乾淨：`ai_hub.dashboard.read` / `ai_hub.conversations.read` / `ai_hub.settings.write`

如果執事長堅持要 `ai_integration` 這個名稱、Robin 沒意見、可以改。重點是只有一套、不要漂移。

## Robin 接手範圍（Phase 1）

純路由 + UI 殼、不接真 AI logic（執事長 spec v2 業務邏輯先不動）：

1. 建 /ai 路由 + 3 tab 殼
2. Kimi Dashboard / Conversations 移植 + morandi 風格統一
3. 5 SSOT 對齊（capabilities / module-tabs / features / sidebar / seed migration）
4. /messaging redirect

預估 6-8 hr。

## Robin 不碰的範圍

執事長 spec v2 的所有業務邏輯：
- intent 分級 prompt
- AI proposal 建單 logic
- /tours 機器人開團分頁
- venturo channels 系統「需人工介入」通知
- C1/C4/C7 衝突點（等執事長跟 William 拍板）

這些是執事長戰場、Robin Phase 1 純把「殼」架起來、不踩執事長地盤。

## 對接點

執事長 spec v2 動 AI logic 時、Phase 1 已建好的 UI 殼直接用：
- Dashboard 統計卡 → 接 spec v2 的 AI 對話統計
- Conversations 三欄 → 接 spec v2 的 messaging API + intent 標籤
- Conversations 右邊 AI 摘要面板 → 接 spec v2 的 intent 分級 + 結構化抽取
- AISettings → 接 spec v2 的 AI prompt 設定 + 信心閾值

Robin 這邊 Phase 1 做完、執事長 Phase 2 接管實際 AI logic、不衝突。

## William 拍板時間

2026-05-14 約 22:20、Telegram 訊息 ID 74「可以」、Robin 開動。
