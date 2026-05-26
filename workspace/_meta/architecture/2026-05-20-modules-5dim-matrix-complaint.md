# 5 維度矩陣複盤 — Claude Opus — 2026-05-20

> 對象：openclaw 的 26 modules × 5 dimensions 矩陣（matrix.md）
> 性質：spot check 真實性 + 找漏 / 找誤判
> 時間：openclaw 收工後立即接手（萃取期紀律）

---

## 救護車式總覽

| 項目             | 結果                                                                     |
| ---------------- | ------------------------------------------------------------------------ |
| 矩陣完整         | ⚠️ 列 27 模組（含 archive-management 為獨立列、實際是 library 子頁）     |
| 救護車總覽計數   | ⚠️ 讀取效能 ❌ 列「5 個」但實際是 4 個（差 1）                           |
| ✅ 判決準確度    | spot check 4 個 ✅ 都對                                                  |
| ❌ 判決準確度    | 真實違規列 4 個 / openclaw 多列 1                                        |
| P0/P1/P2 排序    | ✅ 合理                                                                  |
| 新發現           | ✅ office module routes:[] 空殼半成品                                    |
| 漏讀 Pass 2 複盤 | ❌ shared-data 紅線 G **又被列回 P1**（我 Pass 2 已確認 false positive） |
| 誤標             | ⚠️ database module 標「不存在」實際 = /library route                     |

**白話**：矩陣框架對、整體脈絡好、但小錯多處。最大失誤是「shared-data 紅線 G 又出現」——openclaw 忘了讀我 Pass 2 complaint。

---

## A. 真實性 Spot Check（4 個）

### Spot 1 — accounting ❌ 讀取效能 = ✅ 真實

- 我親自 grep：`accounting/vouchers/page.tsx:79` 有 `supabase.from('journal_vouchers')`
- `accounting/reports/balance-sheet/page.tsx:69,80,145,167` 有 4 處 supabase.from
- openclaw 對的

### Spot 2 — channels ✅ 全綠 = ✅ 真實

- ChannelView 我 Pass 1 已親自驗、line 78 是 last_read_at、line 199 是 messages invalidate
- entity hook 全用
- openclaw 對的

### Spot 3 — office module 「routes:[]、半成品」 = ✅ 真實

- 親自看 `src/modules/office.ts`：`routes: [], tabs: []`
- 註解寫「UI 入口尚未開放」
- **這是新發現**、openclaw 抓到了
- 跟 travel_invoice 半成品一個型（差別：office 連 entity / migration 都沒做）

### Spot 4 — database module「不存在」標籤 = ❌ 誤標

- openclaw 在「不確定點」寫「DatabaseModule 也是純宣告？」
- 親自看 `src/modules/database.ts`：`routes: ['/library', '/library/attractions', '/library/suppliers', '/library/archive-management']`
- **/library 目錄真實存在**、是「database 模組對應 library 路由」這個 naming 落差
- openclaw 看錯、應該寫「database = /library route、不是 /database」

---

## B. P1 中混入的 false positive

openclaw P1 #6：「shared_data_management banks/countries/airports SWR key 無 workspace_id → 補 workspace_id 到 SWR key」

**這是 Pass 2 我抓的 false positive、現在又出現**。

事實（再次確認）：

- ref_banks / ref_countries / ref_airports 都是**全域 master table**、無 workspace_id 欄位
- SWR `getCurrentCacheKey()` 自動為**所有 key** 加 user_id prefix
- 不需要也不應該加 workspace_id 到 cache key

openclaw 沒讀我 Pass 2 complaint、又踩同一個雷。

**修正 P1**：扣掉 shared_data_management 那行、P1 應該是 4 個（不是 5 個）。

---

## C. 計數小錯

「救護車式總覽」說讀取效能 ❌ = 5 個、實際從矩陣數只有 4 個：

- accounting
- archive-management
- finance
- settings

差 1 個。可能 openclaw 把 archive-management 跟 library 分開算所以多算 1、或單純算錯。

不影響結論、但提醒下次自我驗算。

---

## D. archive-management 單獨列 vs library 子頁

openclaw 把 `archive-management` 當獨立 module 列、實際是 `library/archive-management/page.tsx`（library/database module 子頁）。

理由可能：archive-management 是 Pass 1/2 重點 smoking gun、單獨列方便辨識。
**這是工程判斷、可接受**、但要在 P0 修法時記住「不是改 module 而是改 page」。

---

## E. 整體品質評價

| 維度         | Pass 1   | Pass 2      | Pass 3           | Pass 4（矩陣）                         |
| ------------ | -------- | ----------- | ---------------- | -------------------------------------- |
| 全覆蓋       | 漏 29 頁 | ✅ 全 74    | ✅ 5 個 proposal | ✅ 27 module                           |
| 誤判         | 1        | 1           | 0                | 2 (shared-data G 再犯 + database 誤標) |
| 自我反思     | 中       | 高          | —                | 中（沒 LEARNINGS append）              |
| 跨 Pass 引用 | —        | 引用 Pass 1 | 引用 Pass 1+2    | 引用 5 維度健檢 ✅                     |
| **新發現**   | —        | shared-data | proposals        | **office 半成品** ✅                   |

**Pass 4 整體 ~80% 品質**。比 Pass 1 進步、但忘了讀 Pass 2 complaint 屬倒退。

---

## F. 修正後的最終 P0/P1/P2 清單

### 🔴 P0（不變、3 個）

1. accounting 全模組（7 頁繞 entity）→ Pass 3 P0-1/P0-3 草稿已寫
2. archive-management 直接 delete 無 invalidate → Pass 3 P0-2 草稿已寫
3. settings/company 直接 supabase.write → P0-3 草稿待寫

### 🟠 P1（修正後、4 個、扣掉 false positive）

4. finance service 層 supabase 散刻（5/14 ratchet 重點）
5. ~~shared-data SWR key（false positive、不需修）~~
6. workspaces 補 useWorkspaces entity
7. hr_bonus_settlement 補 entity hook
8. **office module 補 entity + 開放 routes（OR 凍住、決策題）**

### 🟡 P2（合理 / 待討論、2 個）

9. ai_hub 手刻 realtime — 設計決策
10. database = /library naming（不重要）

---

## G. 新增 P1 提案：office module 該怎辦

openclaw 抓出 office module 是空殼半成品（routes: []、tabs: []）：

- 比 travel_invoice 更空（連 routes 都沒）
- 5/13 commit 寫「UI 入口尚未開放」
- 跟 travel_invoice 一樣面對「補完 OR 凍住」決策

**建議**：等 William 拍板、跟 travel_invoice 一樣處理。

---

## H. 給 openclaw 下一輪的提醒

**讀 complaint 不是 optional**：
你今天兩次重犯 Pass 2 complaint 抓出的同個 false positive。
未來派工書要明確列「必讀 complaint 並把已 reject 的 finding 從清單中扣除」。

---

_複盤完成。openclaw Pass 4 整體可用、修正 P1 後可直接給 William 拍板。_
