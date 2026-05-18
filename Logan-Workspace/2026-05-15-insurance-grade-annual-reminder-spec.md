---
title: 勞健保級距年度更新提醒系統 spec
date: 2026-05-15
author: William（業務）+ Logan（技術整理）
status: spec / 待實作
---

# 勞健保級距年度更新提醒

## 背景

勞動部 / 衛福部每年 1/1 公告新版「勞工保險投保薪資分級表」、「全民健康保險投保金額分級表」、「勞工退休金月提繳工資分級表」。

譬如：
- 2025/12 → 公告 2026 版（基本工資 28,590 → 29,500）
- 2026/12 → 公告 2027 版（如果基本工資再漲）

需要：系統在每年 1/1（或前後）自動發訊息給「有 shared_data_management capability 的人」、提醒檢查勞動部 / 健保署官網更新最新版進 `ref_insurance_salary_grades`。

## 設計

### 觸發機制

選 1：cron job（推薦）
- 用 yizhan-erp 既有 cron infrastructure（看 `src/app/api/cron/` 目錄）
- 每年 1/1 00:00 觸發
- 或：每年 12/15 早預警 + 1/1 提醒 + 1/15 後查驗

選 2：app 啟動時 lazy check
- 每次 admin 進系統、檢查 ref_insurance_salary_grades 最新 effective_from
- 如果距今超過 11 個月、彈 banner 提醒
- 不需要 cron、但每次登入要 query

我傾向 選 1 cron job、更乾淨。

### 通知管道

William 拍板：透過系統內 channels（既有 channels module、跟 Slack-like 對話系統一致）。

實作：
- channels module 內建一個系統 channel（譬如「平台公告」）
- cron job 觸發時、寫進該 channel 一則訊息：
  ```
  ⚠️ 年度提醒：勞動部 / 健保署可能已公告 [YYYY] 年新版勞健保級距、
  請進「共用資料管理 → 勞健保級距」確認並 update。
  
  資料來源：
  - 勞動部勞工保險局: https://www.bli.gov.tw/0100493.html
  - 健保署投保金額分級表: https://www.nhi.gov.tw
  ```

或者：發 push notification 給有 shared_data_management capability 的所有 user。

### Cron 觸發

yizhan-erp 既有 cron pattern：
- `src/app/api/cron/<task>/route.ts` — endpoint
- VENTURO_AIERP_CRON_SECRET 守門
- 外部排程器（Vercel Cron / Supabase scheduled function）打 endpoint

實作：
1. 新 `src/app/api/cron/insurance-grade-reminder/route.ts`
2. 邏輯：
   - 撈當前最新 effective_from（max）
   - 算距今幾個月
   - 如果 > 11 個月、寫提醒訊息進「平台公告」channel
3. 排程：每年 1/1 + 1/15 + 2/1 各觸發一次

## 還沒決定的

1. 通知 channel 是「全 workspace 共用一個系統 channel」、還是「每個 workspace 各自一個」？
2. 是否同時用其他管道（Telegram bot / Email）？
3. 是否要存「proactive reminder」DB row、確保「同年提醒只發一次」（避免每天觸發都重發）？
   - 可以加 `system_reminders` 表、key=`insurance_grade_2027`、避免重發

## 實作 phase

P1：寫 cron endpoint + 寫 channel message logic（半天）
P2：cron schedule 設定（用 Vercel Cron 為主）
P3：測試（2027/1/1 觸發）

## 此 spec 之後做、不在此次薪資結算 scope

只先建 spec、等真正需要時再做。今天先確保 ref_insurance_salary_grades 表存在、admin 能手動 update、計算 service 能用 ref 表查級距。

---

**注意**：因為 William 講「2027/1/1 系統要發消息給負責人」、這條只是 spec、實作排到之後。
