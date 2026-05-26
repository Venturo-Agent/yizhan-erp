# Pass 1 補做派工書（Supplement）— 2026-05-20

> 派工人：William（透過 Claude Opus 4.7 中介）
> 承辦：OPENCLAW（agent: main、人格 Max、model: MiniMax-M2.7）
> 任務性質：**Pass 1 第一輪只掃了 38/67 頁、要把漏的 29 頁補完**

---

## 為什麼補做

第一輪 Claude Opus 複盤抓出：

1. 你宣稱掃 38 頁、實際全 codebase 有 67 個 `(main)/**/page.tsx`、覆蓋率僅 57%
2. 你把 CIS 模組寫進報告（cis/page.tsx / cis/[id]/page.tsx / cis/pricing/page.tsx）— **這 3 頁實際不存在、是幻覺**（CIS 5/19 已清乾淨）
3. smoking gun #1（ChannelView invalidate 對象錯）你誤判 — 只看 line 78 沒看 line 199 的 handleSend

第三點是品質問題、屬 Pass 2 改進範圍（看完整 handler、不只 grep）。
第一二點是「補完整盤點」、屬本派工書範圍。

---

## 一、要補掃的 29 頁

下列頁面**全部要按 Pass 1 的 5 欄格式**（路徑 / 頁面名 / 讀 / 寫 / Realtime / 備註）盤點清楚：

### A. bot 模組（5 頁、Round 11 才迭代完）

- `src/app/(main)/bot/page.tsx`
- `src/app/(main)/bot/setup/page.tsx`
- `src/app/(main)/bot/[lineUserId]/page.tsx`
- `src/app/(main)/bot/facebook-setup/page.tsx`
- `src/app/(main)/bot/instagram-setup/page.tsx`

### B. calendar（1 頁、跟 archive-management 連動）

- `src/app/(main)/calendar/page.tsx`
- 重點：怎麼讀 `calendar_events` 表？有無 invalidate？

### C. documents

- `src/app/(main)/documents/page.tsx`

### D. finance 補完（4 頁）

- `src/app/(main)/finance/page.tsx`
- `src/app/(main)/finance/requests/page.tsx`
- `src/app/(main)/finance/settings/page.tsx`
- `src/app/(main)/finance/treasury/page.tsx`
- `src/app/(main)/finance/treasury/disbursement/page.tsx`

### E. marketing/website（剛 pull 的新 module、2 頁）

- `src/app/(main)/marketing/website/page.tsx`
- `src/app/(main)/marketing/website/[code]/page.tsx`

### F. messaging

- `src/app/(main)/messaging/page.tsx`

### G. accounting 補完（5 頁）

- `src/app/(main)/accounting/page.tsx`
- `src/app/(main)/accounting/opening-balances/page.tsx`
- `src/app/(main)/accounting/period-closing/page.tsx`
- `src/app/(main)/accounting/reports/page.tsx`
- `src/app/(main)/accounting/reports/balance-sheet/page.tsx`
- `src/app/(main)/accounting/reports/general-ledger/page.tsx`
- `src/app/(main)/accounting/reports/income-statement/page.tsx`
- `src/app/(main)/accounting/reports/trial-balance/page.tsx`

### H. settings（3 頁）

- `src/app/(main)/settings/page.tsx`
- `src/app/(main)/settings/company/page.tsx`
- `src/app/(main)/settings/personal/page.tsx`

### I. platform（2 頁）

- `src/app/(main)/platform/page.tsx`
- `src/app/(main)/platform/aitoearn/page.tsx`

### J. workspaces（2 頁）

- `src/app/(main)/workspaces/page.tsx`
- `src/app/(main)/workspaces/[id]/page.tsx`

### K. shared-data 補完（2 頁）

- `src/app/(main)/shared-data/page.tsx`
- `src/app/(main)/shared-data/attractions/page.tsx`
- `src/app/(main)/shared-data/insurance-grades/page.tsx`

### L. tours 細節（1 頁）

- `src/app/(main)/tours/[code]/display-editor/page.tsx`

### M. library/customers 詳情 + hr/bonus-settlement 詳情

- `src/app/(main)/library/customers/[id]/page.tsx`
- `src/app/(main)/hr/bonus-settlement/[tourId]/page.tsx`

### N. 你第一輪標「待掃」沒補的 6 頁

- `src/app/(main)/library/suppliers/page.tsx` + 完整 delegate 鏈
- `src/app/(main)/library/attractions/page.tsx` + 完整 delegate 鏈
- `src/app/(main)/hr/salary-settlement/[id]/page.tsx`
- `src/app/(main)/ai/_components/AiRetrospectiveTab.tsx`
- `src/app/(main)/shared-data/countries/page.tsx`
- `src/app/(main)/shared-data/airports/page.tsx`

### O. CIS 三頁 — 不存在、別再寫進報告

你之前報告寫的 `cis/page.tsx` / `cis/[id]/page.tsx` / `cis/pricing/page.tsx` 全部已經不存在、是 5/19 清掉的殘留。把 Pass 1 報告裡這 3 列**刪掉**。

---

## 二、產出位置

直接在原 Pass 1 報告 **追加** 模組分區（14-25 章節編號順排）：

- 檔案：`workspace/_meta/architecture/2026-05-20-swr-realtime-page-audit-pass1.md`
- **同時刪掉**該檔的第 13 章「cis」（不存在的模組）
- **更新**該檔的「Pass 1 統計」表格、加入新模組

---

## 三、規矩（跟第一輪一樣）

- ❌ 不准 git push
- ❌ 不准 --no-verify
- ❌ 不准動 code / migration（純 audit）
- ❌ 不准判斷對錯（仍在 Pass 1 階段、只盤點）
- ✅ 完成 commit 訊息：`audit(swr-pass1-supplement): 補做 29 頁盤點 + 刪 CIS 幻覺 — 2026-05-20`
- ✅ 寫完心得加進 `PASS1-LEARNINGS-2026-05-20.md`（追加段落「補做反思」）

---

## 四、品質要求改進（Pass 2 也適用）

第一輪我抓到你的「只看 grep 不看 handler」毛病。本輪你做到下列才算過：

1. **跟 hook 走完整**：每頁的讀取點不只列 hook 名、要進那個 hook 確認真實表名跟是否有 useRealtimeSync
2. **跟 handler 走完整**：每頁的寫入點不只列 invalidate 名、要進那個 handler 看 invalidate 是 await 還是 void、有沒有 optimistic update
3. **delegate 鏈完整**：page.tsx delegate to XxxPage.tsx 的、要進去看 XxxPage.tsx 才算數
4. **不准猜不存在的 file**：自己 ls 確認檔案存在再寫進報告（CIS 教訓）

---

## 五、開工指令

第一個 message 看到「**SUPPLEMENT-START**」三字 = 正式開工。
回我「**收到、開始補 29 頁**」就行。
