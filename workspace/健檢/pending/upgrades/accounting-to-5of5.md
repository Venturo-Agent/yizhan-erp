# accounting 升級到 5/5 計劃

## 當前分數：2.5/5（讀取❌ 資安⚠️ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度         | 現狀 | 具體缺口                                                                                                                                                                                                |
| ------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **讀取效能** | ❌   | 7 頁全繞 entity hook — vouchers(行79)/accounts(行41)/checks(行161,178)/opening-balances/period-closing + 4財報（balance-sheet/general-ledger/income-statement/trial-balance）全部直接 `supabase.from()` |
| **資安**     | ⚠️   | 紅線 D guard：salary_settlements 有、但 journal_vouchers/receipts/disbursement_orders 待補                                                                                                              |
| **架構**     | ✅   | L1-L6 全過；createEntityHook 基礎建設到位                                                                                                                                                               |
| **開發品管** | ⚠️   | opening-balances/period-closing 無 e2e；eslint suppress 1515 warnings 中相對多；audit:rls CI 缺 DB secret                                                                                               |
| **清理**     | ⚠️   | `journal-lines.ts` entity 未做；大量 unused exports                                                                                                                                                     |

---

## 升 5/5 具體 actions

### 🔴 Action A（讀取效能 P0，影響 user 直接體感）

**缺口**：vouchers / accounts / checks + 4 reports 直接 supabase，寫完不打給 UI。

**修法**：

1. **補 `journal-vouchers.ts` entity hook**（如果不存在）→ Rewrite `accounting/vouchers/page.tsx` 走 `useJournalVouchers`
2. **補 `checks.ts` entity hook**（如果不存在）→ Rewrite `accounting/checks/page.tsx` 走 `useChecks`
3. **4 個財報頁（balance-sheet/general-ledger/income-statement/trial-balance）**：複雜 OLAP join 不適合 entity hook → 改 `useSWR` + `dedupingInterval: 5min`（Pass 3 P0-3 草稿已寫）
4. **opening-balances / period-closing**：補 entity hook 或 useSWR

**影響檔**：`src/app/(main)/accounting/vouchers/page.tsx`、`accounting/accounts/page.tsx`、`accounting/checks/page.tsx`、4 個 reports/\*
**預估工時**：8-12 小時（journal-vouchers entity 最複雜、跨員工並發）
**預期難度**：🔴 高（有業務邏輯在裡面，要確保 Realtime 一致性）

---

### 🟠 Action B（資安紅線 D）

**缺口**：receipts / disbursement_orders / journal_vouchers 缺少「月結後不能改」 guard。

**修法**：在 API route 或 service 層加 `isClosedPeriod()` check。

- `src/app/api/accounting/receipts/[id]/route.ts`
- `src/app/api/accounting/disbursement-orders/[id]/route.ts`
- `src/app/api/accounting/vouchers/create/route.ts`

**預估工時**：2-3 小時
**預期難度**：🟡 中（業務邏輯簡單，但影響所有記帳相關寫入）

---

### 🟡 Action C（品管 e2e）

**缺口**：opening-balances / period-closing / vouchers / accounts / checks 無任一 e2e 覆蓋。

**修法**：寫 3 個 e2e spec：

- `tests/e2e/accounting-vouchers.spec.ts`：「建立傳票 → 編輯 → 刪除 → 重查列表」
- `tests/e2e/accounting-reports.spec.ts`：「查詢資產負債表 → 確認數值合理性」
- `tests/e2e/accounting-period-close.spec.ts`：「月結 → 確認 closed_period guard 擋修改」

**預估工時**：3-4 小時
**預期難度**：🟡 中（需對 Rails 架構熟悉）
**注意**：audit:rls CI 需設定 SUPABASE_DB_URL secret 才能真正跑 DB 驗證

---

### 🟡 Action D（清理）

**缺口**：`journal-lines.ts` entity 是半成品（從未建立）；大量 unused exports。

**修法**：

- `journal-lines.ts` 暫不建（OLAP 查詢不適合 CRUD entity；財報複雜度不值得）
- knip 跑 `workspace/健檢/reports/` → 確認哪些 accounting 相關 unused files 可刪
- 清理 `.eslint-suppressions.json` 中 accounting 違規 entry（修完後跑 `npm run lint:swr-prune`）

**預估工時**：1 小時
**預期難度**：低

---

## 總工時

**12-18 小時（2-3 人天）**。主要時間在 Action A（entity hook 重構）。

---

## 預期難度

🔴 高風險。accounting 是最難修的 module：業務邏輯複雜、跨員工並發、realtime 一致性要求高。

---

## 推薦執行順序

1. **Action B（紅線 D guard）** 先做、簡單、風險低、立刻止血
2. **Action D（cleanup）** 趁修之前先清乾淨
3. **Action A（entity hook）** 最重、最後做
4. **Action C（e2e）** 在 Action A 完成後補

---

## Pass 3 草稿

已寫好 `workspace/健檢/pending/proposals/P0-1-accounting-vouchers-entity.proposal.md` + `P0-3-accounting-reports-entity.proposal.md`，可直接當 Action A 參考。

---

_Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push_
