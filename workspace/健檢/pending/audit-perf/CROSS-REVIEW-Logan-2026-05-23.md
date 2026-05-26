# Cross-Review by Logan — 第二意見

**reviewer**：Logan（openclaw main agent、MiniMax-M2.7）
**review 時間**：2026-05-23 22:30
**review 對象**：3 份 markdown + 2 份子任務報告

---

## 結論 TL;DR

主 Claude 方向大致對、3 把刀邏輯成立。但有 **4 個地方我不同意**：

1. **刀 1 JWT 本地驗的前提沒說清楚** — 現在 Supabase project 用的是對稱簽章（HS256）、要改成非對稱（RS256/ES256）需要 William 去 dashboard 改、且**現有 token 全失效、所有登入 user 要重新登入** — 這個 breaking change 沒警告 William
2. **跨太平洋推論缺驗證** — 那個「70-90ms RTT、跨 Tokyo-Singapore」的 claim 沒有事實基礎、是猜的、可能根本不跨洋
3. **10 面向漏了 5 個** — Storage egress / Postgres autovacuum / connection pooler / RLS function recursion / Statement timeout 都沒提
4. **6 條 hallucination 自己可能再 hallucinate** — Task 2 那條「filter 被 silently drop」我的結論也太快、沒確認非 limit 路徑

---

## ✅ 主 Claude 的結論我同意的（理由）

### 刀 1 的方向對、但前提警告不夠

JWT 本地驗確實是全站最大加速機會。`getClaims()` 在 `@supabase/auth-js@2.89.0` 已有、這點我 grep 確認是真的。方向對。

**但有一個 hidden risk 主 Claude 沒說**：

> 現在 `.env.local` 裡的 JWT 用 **HS256 對稱簽章**（我知道因為 token payload 顯示 `"alg": "HS256"`）。`getClaims()` 本地驗需要 **非對稱簽章（RS256/ES256）** 才能跑 JWKS 本地快取校驗。
>
> 要切換演算法：William 要去 Supabase Dashboard → Authentication → JWT Settings → 把「JWT Algorithm」從 HS256 改成 RS256。**代價：所有現有 token 立刻失效、每個 user 都要重新登入**。

主 Claude 說「前提是 Supabase project 要先在 dashboard 切換到非對稱簽章」，但沒說**代價是全 user 強制重新登入**。這是一個破壞性改變、William 應該在點頭之前知道。

### 刀 2 getApiContext 推廣方向對

`getApiContext` 合併 auth + capability check 成一層、節省重複 DB query，這個方向對。我 grep 確認現在只 9/159 route 用，這個數字靠得住。

### 刀 3 Sentry Replay 降採樣率對

`sentry.client.config.ts` 的 `replaysSessionSampleRate: 0.1` 是真的、這個直接省 Sentry 配額。

### 6 條 hallucination 抓得準

- jspdf-autotable 在 `disbursement-pdf.ts:182` 動態 import，這個我 grep 驗了、是真有用、不可砍 ✅
- `/tours/[code]` egress 殺手 claim 太重，事實是「5 個 component 各跑 1 次 query、不是全 workspace 撈」✅
- 37 處散刻 useSWR → 實際 8 處（我 grep 驗了）✅

---

## ❌ 主 Claude 的結論我不同意的（理由 + 證據）

### ❌ 1. 跨太平洋延遲 claim 是幻想（未驗證）

**主 CLAUDE 講**：「app server 在 Tokyo（Vultr）、Supabase project URL `aawrgygqgemgqssflfrx.supabase.co`、預設 region 沒確認」、「如果真跨洋：每次 DB call 100-150ms 純網路」

**我不同意**：

- 我看 `.env.local`、Supabase URL 是 `https://aawrgygqgemgqssflfrx.supabase.co`、專案 ID 是 `aawrgygqgemgqssflfrx`
- **我沒有辦法從這台機器確認 Supabase project 的實際 region 是哪裡**
- 主 Claude 自己都說「懷疑跨洋」、不是「確認跨洋」
- **如果 Supabase 本身就在 Singapore 或東京（是有東京 region 的）、根本沒有 70-90ms 問題**

**這個 claim 如果不成立、「最大 leverage」就蒸發了**。不應該在還沒驗證之前就把「跨洋」當成事實寫進給老闆的總覽。

**我建議**：在開始大改建之前、先要 William 30 秒去 Supabase Dashboard 首頁截個圖、確認 project 在哪個 region。只有兩種情況：

- 在 Asia（Singapore 或 Tokyo）→ 跨洋 claim 不成立、刀 1-3 仍然有效、但 A 條不用做
- 在 US/EU → 跨洋 claim 成立、A 條是認真的最大刀

### ❌ 2. 刀 1 推廣 ROI 被高估

**主 CLAUDE 講**：「JWT 本地驗省 30-80ms、全站影響 100% 操作、每個按鈕都吃這口」

**我認為這個 ROI 計算過度樂觀**：

理由 1：`getClaims()` 本地驗只省「auth.getUser() 打 GoTrue 的 30-80ms」。但從 auth chain 圖看、`getServerAuth` 裡的 `user_metadata` 快速路徑（line 67-68）已經在 proxy 驗過 auth、以後每個 request 的 `getServerAuth` 是拿 cached session、不再打 GoTrue（line 43 的 `getUser()` 在快速路徑時不走 network）。

理由 2：就算 `getUser()` 真被打了、受益的是「第一次 auth」場景、不是「每個按鈕都吃」。從 auth chain 看、proxy 只打一次 GoTrue、之後 route handler 之間的 auth call 是否真的每次都打外部 HTTP、要問 `user_metadata` 快速路徑命中率有多高。

**真實受益**：只有「第一個 request 的 proxy 階段 + user_metadata 沒寫進緩存的那少數場景」。不是「每個按鈕省 30-80ms × 全站 100%」這麼大的數字。

### ❌ 3. getApiContext 推廣有 hidden cost（route 可能故意不走這套）

**主 CLAUDE 講**：「把 getApiContext 推廣到全部 150 條路由、低風險」

**我不同意「低風險」這句話**：

從我 grep 的結果、`getApiContext` 現在只出現在 `disbursement/` 和 `setup-tokens/` 和 `permissions/`。這些是常見的業務 route。但：

- **cron / webhook / service-only route** 可能故意不走 `getApiContext`（因為它們有特殊繞過邏輯）
- 還有 **`/api/auth/` 本身** 的 route、如果走 `getApiContext` 會有雞生蛋問題

而且、`getApiContext` 預設需要 capability check、但 cron route 通常不需要 capability（它們靠 IP 白名單或 secret token）。如果 blanket 推廣、會不會把 cron route 搞掛？

**建議**：推廣之前、先 grep 列出所有「不走 requireCapability/getApiContext」的 route、逐條確認是不是故意繞過。

### ❌ 4. spot check 自己沒做 meta-check

**主 CLAUDE 抓了 6 條 hallucination、宣稱自己做了「meta-check」**，但他對 Task 2 那條的結論也太快了：

他說：「filter 實作完整、被誤導的是 caller 的舊 comment」。但他只看 `createEntityHook.useList` 在 limit 路徑的實作。**我沒讀到「非 limit 路徑」的驗證**。

如果業務流程不是走 limit 路徑（也許走 paginated 或其他 variant）、那個 filter 有沒有被正確傳遞？主 Claude 沒有確認就下了結論。

---

## 🆕 主 Claude 漏的（補充）

### 🆕 1. Storage egress 成本（被漏）

全站效能升等全景 10 個面向、A-J 全部看完，**沒有任何一條提到 Storage**。

yizhan-erp 的 `.env.local` 有 `NEXT_PUBLIC_SUPABASE_URL`、但我沒看到 `STORAGE_URL` 或相關設定。Supabase Storage 的 Egress（資料流出）是要錢的。如果網站有上傳/下載功能、每次 user 下載檔案都有 egress 費用、這個成本隨著 user 增加會線性成長。

**建議**：確認有沒有用到 Supabase Storage。如果有、查一下月均 egress 用量。

### 🆕 2. Postgres autovacuum（被漏）

長時間營運的 Postgres、隨著資料增長、`pg_stat_user_tables` 的 `n_dead_tup` 和 `n_mod_since_analyze` 會讓查詢變慢。autovacuum 沒及時清就會有 table bloat。

這是「長期營運逐漸變慢」的那種問題、通常被忽略、直等到效能投訴爆了才發現。

**建議**：在要做 DB 優化之前、先查 `SELECT relname, n_dead_tup, last_autovacuum FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 20`。如果有很多 dead tuple、需要跟著優化。

### 🆕 3. Connection pooler 有沒有在用（被漏）

升等全景 H 條提到「確認 `DB_URL` 是 pooler endpoint」，但**沒有實際查、現在到底用沒用在用**。

我 grep `.env*` 找不到 `DATABASE_URL` / `pooler` 字樣。意味著：

- 要嘛 `.env.local` 根本沒設定這個（Next.js 不直接帶、需要另外設定）
- 要嘛連接池根本沒在用、直接連 Supabase（每個 request 都開新 connection、connection 很快就用光）

**建議**：查 Supabase 連線字串、如果長得像 `*.supabase.co:5432` 而不是 `*.pooler.supabase.com:6543`、就沒在用 pooler。

### 🆕 4. RLS function recursion 成本（被漏）

這個是 Supabase RLS 的一個不為人知的 hidden cost。當 RLS policy 裡 call function（如 `get_current_user_workspace()`）、而這個 function 本身又觸發 RLS check 時、會形成**Recursive RLS**。代價是：每 row 檢查要跑 2 倍 policy evaluation。

**建議**：查 `pg_get_expr(pol.polqual, pol.polrelid)` 看有沒有 ILIKE '%get_current_user_workspace%' 之類的 pattern、確認有沒有 recursion。

### 🆕 5. Postgres statement_timeout（被漏）

如果有一兩個糟糕的 SQL（如缺 index 導致 seq scan）、它會佔住 connection、讓其他 request 全部卡住。statement_timeout 可以防止單一 query 佔住太久。

**建議**：看現在有沒有設定 `statement_timeout`、建議 set 到 5-10 秒。

---

## ⚠️ Risk William 沒被警告的

### ⚠️ 1. 刀 1 隱含的全體重新登入（最重要）

見上面「❌ 1」。**沒有警告 William 這個破壞性改變**：HS256 → RS256 改簽章演算法會讓所有現有 JWT 失效。user 體驗：按下去之後全部被登出、要重新打 email magic link 或重新輸入密碼。

### ⚠️ 2. 刀 2 推廣可能搞掛 cron / webhook

見上面「❌ 3」。150 條 route 不是每一條都可以吃 `getApiContext`、有特殊 route 故意繞過 auth。需要先分類再改。

### ⚠️ 3. Supabase region 不確認就不要做 A 條大決策

跨洋 claim 如果不成立、「最大刀 A」就不見了、相關的「省 500-1300ms / 每按鈕」這個 ROI 就沒有意義。

### ⚠️ 4. 刀 2 getApiContext 推廣不等於 auth chain 重構

`getApiContext` 是把 auth + capability check 合併成 1 次 DB query。但從 auth chain 圖看、getApiContext 現在的實作、employees JOIN role_capabilities 那段可能是 parallel 不是 merge。如果 merge 方式的 Latency 是 10ms 而非 5ms，省的幅度可能不如想像。

---

## 給主 Claude 的修正建議（具體、可動）

### 修正 1：刀 1 前面加一句警告

在給 William 的總覽裡、刀 1 段落最前面加一句：

> ⚠️ **前提代價（破壞性）**：切換 JWT 演算法（HS256 → RS256）會讓**所有現有登入 user 的 token 立刻失效、需重新登入**。建議在低流量時段操作（如週六凌晨）、或確認目前沒有重要 user 正在操作。

### 修正 2：A 條改成「先驗、再動」

把「跨太平洋延遲」從「已確認事實」改成「待驗假設」：

> **先確認**：去 Supabase Dashboard 首頁、截圖看 project region。10 秒。如果在 Asia（A）→ 跳過這條；如果在 US/EU（B）→ 這條是全站最大刀、立刻做。

### 修正 3：刀 2 推廣前先做這兩件事

1. `grep -r "requireCapability\|getServerAuth" src/app/api/ | grep -v "getApiContext"` 列出所有「還沒吃 getApiContext」的 route
2. 逐條確認哪些是「故意繞過」（cron/webhook/測試route），哪些是「可以改」
3. 然後再動

### 修正 4：10 面向加 5 條

在 A-J 後面追加：

- **K. Storage egress**：確認有沒有用 Supabase Storage、有沒有月均用量監控
- **L. Autovacuum / table bloat**：跑 `pg_stat_user_tables` 看 dead tuple 多的表
- **M. Connection pooler**：確認 `DB_URL` 是 pooler endpoint 還是 direct
- **N. RLS recursive check**：查 `pg_policy` 確認沒有 function recursion
- **O. Statement timeout**：建議設定 5-10s 上限

---

_Review by Logan — MiniMax-M2.7 — 2026-05-23_
_紅線：純讀檔、純評論、不動 code/DB/commit/push_
