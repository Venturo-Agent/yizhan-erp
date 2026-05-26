# Pass 3 派工書 — P0 修法草稿 — 2026-05-20

> 派工人：William（透過 Claude Opus 4.7 中介、主管角色）
> 承辦：OPENCLAW（agent: main、人格 Max）
> 任務性質：**只寫 code 草稿到 proposals/ 目錄、不動真實 code**

---

## 為什麼 Pass 3

Pass 2 完成、5 個 P0 + 5 個 P1 verified。
William 明早起床要看 actionable artifact、不只是 audit 報告。
所以你今晚寫 P0 修法 code 草稿、放 workspace/健檢/pending/proposals/、明早 review → approve → apply。

**這是「draft 階段」不是「apply 階段」**：

- 你寫 `.proposal.tsx` / `.proposal.ts` / `.proposal.sql` 草稿
- 不動 `src/` 真實檔
- 不動 `supabase/migrations/` 真實 migration
- 不 push、不 git apply

---

## P0 5 個草稿任務

### Draft 1：archive-management 加 invalidate

**檔**：`workspace/健檢/pending/proposals/P0-2-archive-management-invalidate.proposal.tsx`
**內容**：

- 找出現有 `src/app/(main)/library/archive-management/page.tsx` 的 delete handler
- 在 line 100 `tour_itinerary_items.delete()` 後加 `invalidateCalendarEvents()` + `invalidateTourItineraryItems()`
- 確認 `src/data/entities/calendar-events.ts` / `tour-itinerary-items.ts` 有 export invalidate helper（沒就標 TODO）
- diff 格式（before / after 顯示要動什麼）

### Draft 2: accounting/vouchers 補 entity hook

**檔**：`workspace/健檢/pending/proposals/P0-1-accounting-vouchers-entity.proposal.ts`
**內容**：

- 寫新檔 `src/data/entities/journal-vouchers.ts` 用 `createEntityHook` 模板
- 對照 `src/data/entities/customer-document-applications.ts` 當參考（剛驗過 Pass 2 ✅ 合規）
- 列 select 欄位、orderBy、cache preset
- 改寫 `accounting/vouchers/page.tsx` 用 useJournalVouchers
- diff 格式

### Draft 3: accounting/reports 4 頁補 entity hook

**檔**：`workspace/健檢/pending/proposals/P0-3-accounting-reports-entity.proposal.ts`
**內容**：

- 4 個財報頁 (balance-sheet / general-ledger / income-statement / trial-balance) 讀 chart_of_accounts + journal_lines
- 補 `src/data/entities/chart-of-accounts.ts` + `journal-lines.ts`（用 useList readonly preset）
- 改寫 4 頁用 entity hook
- 注意：報表頁可不需 realtime（純 read 用、用 dedupingInterval 5min）

### Draft 4: archive-management cascade 還缺什麼

**檔**：`workspace/健檢/pending/proposals/P0-2b-archive-cascade-review.proposal.md`
**內容**：

- 不寫 code、寫分析
- archive-management 還有 `deleteTourEmptyOrders()` + `deleteTourEntity()` 兩個 entity 函式
- 列「整套歸檔流程」會動到哪些 cache、缺哪一個 invalidate
- 給出最完整 cascade invalidate 清單

### Draft 5: P0-4 + P0-5 不寫草稿（已夠清楚）

- P0-4（CI audit:writes）由我自己直接寫 .github/workflows/ 改動草稿
- P0-5（11 個 lint errors）的修法很小、直接列在 P0/P1/P2 清單裡就好

---

## 規矩

### 紅線

- ❌ **不准動 `src/` 真實 code**（只寫 proposals/）
- ❌ **不准動 `supabase/migrations/` 真實 migration**（要寫就放 migrations-pending/.draft 副檔）
- ❌ **不准 git push**
- ❌ **不准 `--no-verify`**

### 紀律

- ✅ proposals 用 diff 格式（顯示「現在長這樣 → 改成這樣」）
- ✅ 每個 proposal 標：影響行數、風險評估、回滾方式
- ✅ 引用 Pass 2 對應的判決（哪個 entry、哪一條紅線）

### commit

- ❌ 不要把 proposals/ 加 .gitignore（要進 git）
- ✅ 每完成 1 個 proposal commit、format：`audit(swr-pass3): 加 P0-X 修法草稿 — 2026-05-20`
- ✅ 全完成最後 commit：`audit(swr-pass3): 完成 P0 5 個草稿 — 2026-05-20`

---

## 品質要求

對齊 Pass 2 學到的紀律（你自己寫的）：

1. **打開 entity 檔驗證模板**（customer-document-applications.ts 是好範本）
2. **跟完整 handler**（archive-management 的 delete 不只一處）
3. **不猜不存在的 entity**（journal-lines / chart-of-accounts entity 可能還沒有、自己 ls src/data/entities 確認）

---

## 預估工時

- 4 個 proposal、每個 30-60 分鐘
- 總共 2-3 小時
- 你的 4 小時 timeout 夠

---

## 開工指令

第一個 message 看到「**PASS3-START**」三字 = 正式開工。
回我「**收到、開始寫 P0 5 個草稿到 proposals/**」就行。

預估 22:00 前完成、Claude Opus 起 spot check、最遲 23:00 給 William 一份「proposal pack」交付。
