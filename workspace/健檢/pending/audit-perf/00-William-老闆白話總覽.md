# 全站效能盤查 — 老闆白話總覽（品管後）

> 2026-05-23 主管視角總結。5 份子任務報告 + 1 份 spot check 後寫的、給 William 看的「該開哪幾刀、預期省多少、風險如何」。
> 卡關沒做完的：DB 查詢熱點 + DB trigger 全表（2 份報告卡 Supabase MCP token）。

---

## 一句話結論

**「全站慢」這件事、Alex 上一個 session 抓的方向是對的、不是 channels 專有病、是全站每個按鈕都串 5-10 次資料庫查詢 + 1 次外部身分驗。已經找到 3 把刀可以同時砍、最大那把刀可以讓全站每個按鈕快 50-150 毫秒。**

---

## 該開的 3 把刀（優先順序）

### 🥇 刀 1：身分驗證走本地驗、不打外部 Supabase Auth 服務

- **現狀**：每點一個按鈕、後端會去打 Supabase 的身分驗證 HTTP 服務問「這個 user 是誰」、來回 30-80 毫秒。全站每個按鈕都吃這口湯。
- **修法**：JWT 用本地驗（Supabase SDK 已內建支援、不用升版、code 改 5 處）。
- **效益**：每個按鈕省 **30-80 毫秒**、全站影響 100% 操作。
- **工期**：半天
- **風險**：低（前提是 Supabase project 要先在 dashboard 切換到非對稱簽章、約 1 分鐘設定）
- **驗證來源**：Task 4 — 已 spot check 確認 SDK 支援、5 個 callsite 真實存在

### 🥈 刀 2：身分驗 + 權限檢查合併成 1 次資料庫查詢

- **現狀**：每點一個按鈕、後端會「先查員工 → 再查角色 → 再查權限」、3 次資料庫來回。明明可以 1 次 join 撈完。
- **修法**：把現有的 `getApiContext`（已寫好、但只 9 條路由用、全站 159 條）推廣到全部寫入 / 讀取路由。
- **效益**：每個按鈕省 **10-15 毫秒**、外加少打 200+ 次重複 DB 查（Supabase 計價省）。
- **工期**：1-2 天（grep + 改 150 條路由、低風險、漸進）
- **風險**：低（既有 SSOT、不引新概念）
- **驗證來源**：Task 4 — 已 spot check 確認 9/159 採用率正確

### 🥉 刀 3：Sentry 監控採樣率降到 1%、砍掉 Replay 配額洩血

- **現狀**：Sentry 客戶端設了「10% 的 user session 全程錄影 + 出錯時 100% 錄」。估每月上傳 3GB+、燒 Sentry 配額。
- **修法**：`replaysSessionSampleRate` 從 0.1 改 0.01（10% 改 1%）。其他不動。
- **效益**：省 Sentry 月費（不是 user 感受速度、但是直接省錢）。
- **工期**：5 分鐘
- **風險**：極低
- **驗證來源**：Task 7 — 已 spot check 確認 sentry.client.config.ts:20 數值

---

## 中等優先（可一起做、單獨價值較小）

### 砍殭屍依賴 pdf-lib（24MB）

- 整個 src 沒人 import、可直接 `npm uninstall pdf-lib`
- 工期：1 分鐘、風險：0、效益：build size 降一點
- ⚠️ Task 7 還順帶講 `jspdf-autotable` 也是殭屍、**這條我複查後是假的**（disbursement-pdf.ts 真的在用）、別誤砍

### Top 5 最肥路由 sequential → parallel

- LINE webhook / 月結 / 退款 等 5 條後端路由內部 DB 查詢都是「一條跑完再跑下一條」、可改 parallel
- 工期：每條 2-3 小時、5 條約 2 天
- 效益：top 路由各省 10-20 毫秒
- ⚠️ 各條 DB 查詢有沒有先後依賴要逐條驗、不能 blanket 改

### Client 端讀資料散刻沒走中央 SSOT

- 25-37 處（Task 6 的數字 inflated、實際偏低、但問題是真的）
- 工期：漸進、每改 1 個風險很低
- 效益：cache 命中率提升、紅線 F 對齊
- 同時清掉一個污染源：`tour-receipts.tsx:65` 的 stale comment「filter 被 silently drop」誤導下次 audit

---

## 卡關沒做完（要你拍板）

### Task 3 + Task 5：DB 查詢熱點 + DB trigger 全表

要連 production Supabase 跑 `pg_stat_statements` / `pg_trigger`、現在這台機器：

- `.mcp.json` 上一個 session 清掉寫死的 token（資安做得對）
- 你的 `secrets.env` 有 `SUPABASE_MCP_AIERP_TOKEN`、但 MCP server 沒被啟動帶這把
- 沒這份資料、無法知道「production 真實最慢的 SQL 是哪一條 + 各 trigger 平均 cost」

選一個讓 Task 3+5 動：

- **A）我加 `.mcp.json`**（寫 supabase-aierp server 用 env var、重啟 Claude Code 再派）
- **B）你 Supabase Studio 跑 3+4 條 SQL**（我把確切 SQL 整好給你、貼結果回來）
- **C）暫時跳過**、先動上面 3 把刀（不需要 DB 數據也能修）

---

## 複查抓到的 hallucination（已剔除、不影響上面結論）

| 來源   | 不成立的 claim                                             | 修正                                                                                 |
| ------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Task 7 | jspdf-autotable 是殭屍                                     | 在用（disbursement-pdf.ts）、不可砍                                                  |
| Task 2 | `/tours/[code]` egress 殺手（5 component 全 workspace 撈） | filter 有套、只 5 次同 filter query、第一次 mount 5 round-trip、不是全撈             |
| Task 2 | createEntityHook filter 被靜默丟棄                         | filter 實作完整、被誤導的是 tour-receipts.tsx:65 的 stale comment                    |
| Task 6 | 37 處散刻 useSWR                                           | 實際 8 處（agent 算進 useSWRConfig 之類變體）、紅線 F 偏離仍真但量級不像 37 那麼驚悚 |
| Task 6 | useTourItineraryItems.ts 散刻 supabase.from                | 檔名 camelCase 是假的、真檔是 `tour-itinerary-items.ts`、grep 0 supabase 引用        |
| Task 1 | top 5 DB call 數（18/14/11/11/10）                         | 是把 helper 內 DB call 加總的估值、ranking 對、絕對數字偏高                          |

---

## 給 William 拍板

1. **3 把刀同意動嗎？順序：刀 1（半天）→ 刀 2（1-2 天）→ 刀 3（5 分鐘）**
2. **Tasks 3/5 卡 MCP、選 A / B / C？**
3. **複查抓到的 stale comment（tour-receipts.tsx:65）一併修嗎？**

我等你拍板再開工。
