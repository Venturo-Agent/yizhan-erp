# Logan Cross-Review — 5 維度完整健檢

**reviewer**：Logan（openclaw main agent、MiniMax-M2.7）
**review 時間**：2026-05-23 23:45
**review 對象**：6 份 markdown（總覽 + 5 維度報告）

---

## 結論 TL;DR

主 Claude 的 5 維度 refresh 方向大方向對、但有 **5 個地方我不同意**：

1. **P0 #1 排太後** — `TenantPrepSection` 真的引用了 `travel_invoice` feature（我 grep 驗了：line 24），不是猜的、6/1 客戶真的會撞。這應該是 #1 不是 #7 旁邊的附帶條目
2. **效能維度說「退步」但只列「待驗」** — 5/20 的 accounting 7 pages 現狀仍是 direct supabase.write、沒有新 commit、為什麼寫「待驗」不是「確認未修、P0 依然存在」？
3. **架構分數 8.0→8.0 算不過去** — 3 天內新長了 3 個洞（websites seed 缺 role_capabilities / approval framework 未進 module registry / auth orphan），同時 5 個舊洞沒動，分數應扣不應持平
4. **開發品管分數「退步」涵蓋不夠** — 23 lint errors + 6 個真實撞號 bug + 2 個散刻 useSWR commit 繞過 pre-commit（lint 沒在 hook 跑），這不是單純「退步」是「系統性防守失效」
5. **跨區 RTT claim 未驗** — 效能維度說「70-90ms Tokyo↔Singapore RTT」、但我從 codebase 找不到任何地方 actual 測過這個數字，又是估算沒有量測

---

## ✅ 主 Claude 整理我同意的

### 根因 A/B/C 抓對

pre-commit 只跑 type-check 不跑 lint → 2 個散刻 useSWR commit 直接過了。這邏輯我驗了：`.husky/pre-commit` 確實只有 `npm run type-check`，沒有 `npm run lint`。根因 A 成立。

CI 沒設 `SUPABASE_DB_URL` → `audit:rls` 跳過 DB 層 L3-L5，這也成立。

本地 MCP token 沒設 → 6 個 DB 面向全卡住，這也成立。

### 6 個迴圈撞號是真实 bug

`no-in-loop-number-rpc` rule 抓出 6 個位置（finance/payments × 3 / finance/requests × 2 / stores/core × 1），這些是真的會在批次操作時撞 unique constraint 的 bug，不是 lint 問題是真的 bug。這點我同意。

### TenantPrepSection 有 travel_invoice 引用（我驗了）

```
src/app/(main)/workspaces/_components/TenantPrepSection.tsx:24
    feature: 'travel_invoice',
    title: '電子發票',
    items: ['發票章圖檔', '電子發票字軌號碼'],
```

是真的。travel_invoice 已凍、客戶上來看到「請準備電子發票字軌」但沒地方上傳，6/1 客戶會遇到。這點報告寫對了。

### Sentry Replay 配額是真的（我驗了）

`sentry.client.config.ts:20` — `replaysSessionSampleRate: 0.1`（10% 全 session 錄影），`efc81ea` 這個 commit 把 0.1 降到 0.01，這個是真的省了配額。

---

## ❌ 主 Claude 整理我不同意的（理由 + 證據）

### ❌ 1. P0 排序：TenantPrepSection 不是 #1（但應該是）

**總覽寫**：「🔴 P0（最痛、立刻動）1. ⚠️ TenantPrepSection 會撞 6/1」排在第一個。

但往下看、P0 #1 後面馬上跟「15 分鐘可修」。然後後面還有 P0 #2-7。

問題在於：**總覽把 TenantPrepSection 當 P0 #1 講，但「🎯 給 William 的拍板建議」把同一個項目放在「立刻動（不卡 prereq、< 1 hr 完成）」的第 1 條**。等於 #1 優先又說「15 分鐘可修」，邏輯是通的。

但我不同意的是：**P0 #7 CAPABILITIES 死碼 59%（87 個）不是 P0、是 P2**。這項目錄在 P0 清單、跟「6/1 客戶撞上了」不是同一個量級。59% dead code 是一個長期的 code quality 問題、不是會死人的問題。 William 6/1 要面對的是 TenantPrepSection，不是 CAPABILITIES。這條應該降到 P2 或 P3。

### ❌ 2. 效能維度「待驗」覆寫太寵

**效能維度寫**：「accounting 全模組（7 頁）繞 entity hook → 🔄 待驗（無新 commit 痕跡）」

我驗了 `src/app/(main)/accounting/vouchers/page.tsx`（最肥的 accounting page）：line 79 還是 `supabase.from('journal_vouchers')` 直接讀、沒有 entity hook、沒有 realtime。

這不是「待驗」、這是「**確認未修、P0 依然存在**」。總覽說「5/20 P0 4 個沒動（accounting / archive-management / settings/company / workspaces 全 stale）」，既然確認是 stale，就不該寫「待驗」讓人覺得還要再確認。應該直接寫「確認未修、仍是 P0」。

### ❌ 3. 架構分數 8.0 → 8.0 不合理

**總覽寫**：架構 5/20 8.0 → 5/23 8.0（持平），原因是「進步（L4 trigger / L6 audit context 30→75）抵掉退步（websites 漏 SSOT + 舊洞沒動）」

**我不同意**：

- 3 天內新長 3 個洞：websites seed 缺 role_capabilities / approval framework 未進 module registry / auth orphan 1 筆
- 5 個舊洞沒動（esim 4 routes 404 / visas 3 routes 404 / documents 1 route 404 / L4 closed period guard 缺 / 3 個 module 無 entity hook）
- L6 audit context 採用 30→75 是「口頭採用」、要看實際有沒有真的跑

如果用簡單的數學：3 個新洞 + 5 個舊洞沒動 = 8 個問題，進步只有 2 項（L4 trigger + L6 audit adoption rate）。分數不應維持 8.0，應該是 7.x 之類。

更誠實的寫法：8.0 → 7.5 或類似的下調，註明「舊洞沒動 + 新洞長出來稀釋了進步」。

### ❌ 4. 開發品管「退步」這個字太輕

**總覽寫**：開發品管 5/20 持平 → 5/23 退步（lint errors 11→23、ESLint baseline 145 → 145）

實際問題：

- **lint errors 11→23（+12）**：這個數字如果包括 6 個真實撞號 bug，那退步不是「code quality 退步」是「真實功能 bug 存在」
- **pre-commit 被繞過**：2 個散刻 useSWR（AiSidebar + MethodDialog）在 5/23 commit 進去，pre-commit type-check 過了但 lint 沒跑。pre-commit 機制失效不只是「退步」，是「防守破口」
- **audit:rls 在 CI 跳過 4 層**：L3-L5 DB 層的 RLS 檢核全部 skip、生產環境 drift 沒人擋

用「退步」形容這個狀況太客氣。應該說「系統性防守失效：pre-commit/ESLint/CI 三層都在漏」。

### ❌ 5. 跨區 RTT claim 未驗就寫進報告

**效能維度寫**：「Tokyo Vultr ↔ Singapore Supabase、每次 70-90ms RTT」

這是**假設不是量測**。我剛幫另一個任務 cross-review 效能報告，已經點過這條：Supabase region 可能就在 Singapore 或 Tokyo Asia、根本沒有 70-90ms 那麼慢。

從 `.env.local` 我只知道 Supabase URL 是 `aawrgygqgemgqssflfrx.supabase.co`，但看不出 region 在哪。這個 claim 如果不成立，整個「單按鈕 500-1500ms」這個數字就大幅蒸發。

**建議**：效能維度那張「全鏈路延遲分解」圖，應該在標題加個「⚠️ 待驗：RTT 數字未實際量測」。不是不能寫，是要標清楚這是估算不是實測。

---

## 🆕 5 維度 subagent 都漏的（補充）

### 🆕 1. Migration 真的有 apply 嗎？（没查到）

效能維度提到 `20260522220310_block_draft_tour_financial_writes.sql`（5/22 新加 trigger），但我沒有在任何地方看到「這個 migration 真的 apply 到 production 了」的確認。

同樣的問題：`20260520070000_fix_red_line_b_audit_fk.sql` 和 `20260520091917_drop_knowledge_tags.sql` 是 William 自己用 MCP apply 還是還沒？

如果 migration 沒 apply，那 L4 trigger 那個「進步」根本還沒上 production。

### 🆕 2. Supabase region 跨洋 claim 沒有驗

見上面 ❌ 5。這個 claim 影響整個效能分析的最大預估收益。如果 region 是 Singapore 或 Tokyo Asia，`每按鈕 350-900ms 純等網路` 這個數字就整個不成立。

### 🆕 3. 6/1 deadline 的業務急迫性沒有傳遞到所有維度

總覽只在一個地方（TenantPrepSection）提到 6/1。開發品管維度沒有任何地方提到「6/1 前哪些 P0 要修才來得及」。如果 William 要赶 6/1、每個維度應該說「哪些 P0 影響 6/1、來不及修的要凍住」。

### 🆕 4. 開發品管的 CI 失效沒有被「根因」層級追踪

根因 A（pre-commit 沒跑 lint）只解釋了「2 個散刻 useSWR 過了」。但根因 A 沒解釋「那 6 個撞號 bug 怎麼進去的」—— 那些是新加的 rule、舊 code 在 rule 加進去之前沒有 violations、rule 一加就有 6 個。

所以真實情况是：**6 個撞號 bug 是舊 code、沒被 pre-commit 抓是因為 rule 是 5/21 才加的**。這不是 pre-commit 失效、而是 rule 落後於 code 的節奏問題。兩件事不一樣、根因分析要分開。

### 🆕 5. accounting 模組在 5/20 的 P0 到底有多肥？

5/20 報告說「accounting 整模組 P0」。5/23 總覽說「stale、沒動」。但我沒有看到任何人說「accounting 7 頁如果一起修、預估多少工時」。

如果 6/1 前 William 只有 1-2 人天可用，accounting 整模組補 entity hook（13+ hours estimate）根本做不完。應該說清楚「如果來不及、至少先修哪 1-2 頁」。

---

## ⚠️ 子任務報告之間互相矛盾的地方

### ⚠️ 1. 架構 vs 效能：requireCapability 採用率數字打架

**架構維度**（line 47）：「159 個 API route / 115 個有 requireCapability 或 getApiContext 守門 = 72%」

**效能維度**（line A3）：「104 個 route（65%）走 requireCapability chain」

104 vs 115、65% vs 72%，兩個數字明顯對不上。為什麼？

可能：架構維度把 `getApiContext` 也算進守門（9 routes），效能維度只算 `requireCapability`。但即使這樣，159 routes 裡：

- 架構：115 個有守門（requireCapability 或 getApiContext）
- 效能：104 個走 requireCapability

104 < 115 → 這代表有 11 個 route 用 getApiContext 但沒有 requireCapability？但 getApiContext 本身包含 capability check，所以這 11 個算是有守門的。

這個矛盾不會影響結論，但報告之間數字不一致讓人對數據失去信心。

### ⚠️ 2. 架構 vs 清理：office module 分數打得一個說一個沒說

**架構維度**（line 41）：「office module 半廢（5 SSOT 都掛著、routes:[] 空）」
**清理維度**（line B）：詳細描述 office 狀態，建議凍住或砍

但**總覽**的「📊 ratchet 機制狀態」完全沒提 office。分數變動表格也沒提 office。William 看總覽不會知道 office 是一個半廢的 module。

### ⚠️ 3. 資安 vs 清理：auth orphan 的嚴重度打分不一致

**資安維度**把 auth orphan 列 P1（說明影響低、用戶看不到），但**清理維度**根本沒提 auth orphan（只提 CAPABILITIES 死碼和 bot 死碼）。如果 auth orphan 那麼低調，為什麼在資安 P1 出現？

---

## 給主 Claude / William 的修正建議

### 修正 1：P0 清單重新排序

按「6/1 前會不會撞」+ 「實際 user-facing impact」重新排：

| 順序 | 項目                                                              | 為什麼                             |
| ---- | ----------------------------------------------------------------- | ---------------------------------- |
| #1   | TenantPrepSection travel_invoice（15 分鐘）                       | 6/1 客戶直接撞、立刻可修           |
| #2   | 6 個撞號 bug（半天）                                              | 真的會炸、批次操作 user 會看到     |
| #3   | contract sign admin client（5 分鐘）                              | 紅線 C、直接修                     |
| #4   | auth orphan（1 分鐘）                                             | `npm run audit:orphans -- --clean` |
| #5   | accounting 7 pages（P1、如果來不及就只修 vouchers 最肥的 1-2 頁） | stale 了 3 天                      |

CAPABILITIES 59% dead code 移到 P2/P3、不是 P0。

### 修正 2：架構分數下調

從 8.0 降到 7.5（舊洞沒動 + 3 個新洞長出來）。

### 修正 3：效能維度加「⚠️ 待驗」標記

「Tokyo↔Singapore 70-90ms RTT」那個 claim 的地方加上「⚠️ 待實際量測」。

### 修正 4：開發品管描述改成「系統性防守失效」

不只是「退步」，而是「pre-commit/ESLint/CI 三層各漏一個破口」。

### 修正 5：migration apply 狀態要確認

5/22 加的 L4 trigger、`expense_categories` 修補、这两个 migration 有沒有 apply 到 production？還是只是 commit 了但沒 apply？如果沒 apply，那 5/23 的「進步」根本還沒上 production。

---

_Review by Logan — MiniMax-M2.7 — 2026-05-23_
_紅線：純讀檔、純評論、不動 code/DB/commit/push、不 git commit 這個 markdown_
