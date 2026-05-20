# Pass 1 複盤 — Claude Opus — 2026-05-20

> 對象：openclaw 的 Pass 1 報告（2026-05-20-swr-realtime-page-audit-pass1.md）
> 性質：找漏 + 找誤判
> 時間：openclaw 收工後立即接手

---

## 救護車式總覽

| 項目 | openclaw 宣稱 | 實際 |
|---|---|---|
| 頁面覆蓋 | 38 頁 / "13 模組" | **67 個 page.tsx**（覆蓋率 ~57%、漏 29 頁） |
| smoking gun #1（ChannelView invalidate 錯）| 真的有問題 | **❌ 誤判** — ChannelView 在 send 流程實際有 invalidate messages |
| smoking gun #2（archive-management 無 invalidate）| 真的有問題 | **🟡 部分對** — 確實有直接 delete、但結尾有 entity delete trigger invalidate |
| smoking gun #3（accounting 3 頁無 realtime）| 真的有問題 | **✅ 確認** |
| LEARNINGS 紀律 | 寫了 ✅ | OK |

**白話**：smoking gun #1 是水中撈月、smoking gun #2 半真半假、smoking gun #3 是真的。覆蓋率不到六成。

---

## A. openclaw 誤判：smoking gun #1（ChannelView）

### openclaw 的指控
> 「`ChannelView.tsx:78` 發訊息後 invalidate 的是 members 不是 messages → 訊息列表 cache 沒被叫醒」

### 真相

我親自讀 `ChannelView.tsx`：

| 行 | 流程 | invalidate 對象 | 對不對 |
|---|---|---|---|
| 78 | **「標已讀」effect**（進頻道時更新 last_read_at） | invalidateChannelMembers | ✅ 對 — last_read_at 是 member 欄位 |
| 199 | **「發訊息」handler**（actually send） | `void invalidateChannelMessages()` | ✅ 對 |
| 214 | **「撤回訊息」handler** | `await invalidateChannelMessages()` | ✅ 對 |

**openclaw 看到 line 78 就斷定發訊息用錯 invalidate、但他沒看 handleSend 的 line 199**。

這是「grep 快但淺」的典型誤判：看到 file 第一個 invalidate 就以為是發訊息流程的，沒讀完整 handler。

### 額外發現（ChannelView 其實寫得非常用心）

讀 line 164-200 的註解：
```
樂觀更新 v6（5/20、解耦 sending 跟 invalidate、不再閃爍）：
  1. 立刻清 draft + 設 pendingBody
  2. await apiPost 拿 server 寫入 OK
  3. server return 完整 row 推進 recentlySent（local 兜底、自己秒看到）
  4. **立刻** setPendingBody(null)、UI 切回正常（不等 invalidate）
  5. void invalidateChannelMessages() 在背景跑
  6. 失敗 toast + 還原 draft
```

這是「不閃爍 + 即時顯示」的標準範本。**channels 寫入流程不是問題**。

### 那 William 感受到的「新訊息不即時」哪來？

懷疑點轉向：
1. **跨 tab / 跨 user 場景**：A 在 tab1 發、B 在 tab2 看、B 沒收到（subscription 沒推到 B）
2. **Realtime subscription 沒 mount 上去**：`useChannelMessages` 的 useRealtimeSync 對 messages publication 沒訂閱
3. **某個非 ChannelView 的訊息寫入路徑**：譬如 cron / webhook / 別的 component 寫了 channel_messages 但繞過 invalidate

**Pass 2 必查**：
- `audit:realtime` 確認 `channel_messages` table 真的在 publication 裡
- grep `from('channel_messages').insert` 看有沒有 ChannelView 以外的寫入路徑
- grep `useChannelMessages` 確認 entity hook 真的有 useRealtimeSync

---

## B. openclaw 半對：smoking gun #2（archive-management）

### openclaw 的指控
> 「直接 supabase.delete + 無 invalidate = 刪除後 UI 不更新」

### 真相

讀 `archive-management/page.tsx:71-105`：

```ts
await supabase.from('tour_itinerary_items').delete().eq('tour_id', tour.id)   // L100
await supabase.from('calendar_events').delete().eq('related_tour_id', tour.id) // L101
await deleteTourEmptyOrders(tour.id)                                            // L104
await deleteTourEntity(tour.id)                                                 // L105 ← 有 invalidate
```

- `deleteTourEntity` 是 entity 函式 → 會 trigger invalidate tours cache ✅
- 但 `tour_itinerary_items` 跟 `calendar_events` 的直接 delete **沒對應的 invalidate**

**影響範圍**（要看誰讀那兩個表）：
- `tour_itinerary_items` → 行程編輯頁、行程顯示頁如果讀這個表會 stale
- `calendar_events` → calendar/page.tsx 會 stale（這頁 openclaw 漏掉沒掃）

**結論**：問題真的存在但範圍比 openclaw 暗示的小。需要在 Pass 2 確認 calendar/page.tsx 是怎麼讀 calendar_events 的。

---

## C. openclaw 確認：smoking gun #3（accounting）

### 我親自抽樣
```bash
grep "supabase.from" src/app/(main)/accounting/{vouchers,accounts,checks}/page.tsx
```

| 頁面 | 讀 | 寫 | Realtime |
|---|---|---|---|
| vouchers | 直接 supabase.from('journal_vouchers') | apiMutate | ❌ |
| accounts | 直接 supabase.from('chart_of_accounts') | updateChartOfAccount (entity) | ❌ |
| checks | 直接 supabase.from('checks') | 直接 supabase.update('checks') | ❌ |

**確認**：3 頁全部繞過 entity hook、無 realtime。

**影響**：
- 你打傳票進去、UI 不會即時更新（無 realtime + 無 invalidate）
- 你建會計科目、要 F5 才看到
- 支票狀態變更、其他人看不到

**這是真痛點**。但這 3 頁都沒有對應的 entity hook，要先補 entity 才能修。

---

## D. openclaw 漏掉的頁面（29 個、覆蓋率 57%）

### 完全沒掃的模組

| 模組 | 漏掉的頁 |
|---|---|
| **bot**（LINE/AI Hub） | bot/page.tsx、bot/setup、bot/[lineUserId]、bot/facebook-setup、bot/instagram-setup |
| **calendar** | calendar/page.tsx ← 跟 smoking gun #2 直接相關 |
| **documents** | documents/page.tsx |
| **finance**（部分） | finance/page.tsx、finance/requests、finance/settings、finance/treasury、finance/treasury/disbursement |
| **marketing/website**（剛拉下來的新 module） | marketing/website/page.tsx、marketing/website/[code] |
| **messaging** | messaging/page.tsx |
| **accounting**（剩餘） | accounting/page.tsx、accounting/opening-balances、accounting/period-closing、accounting/reports/page、accounting/reports/{balance-sheet,general-ledger,income-statement,trial-balance} |
| **settings** | settings/page、settings/company、settings/personal |
| **platform** | platform/page、platform/aitoearn |
| **workspaces** | workspaces/page、workspaces/[id] |
| **shared-data**（部分） | shared-data/attractions、shared-data/insurance-grades、shared-data/page |
| **tours**（細節） | tours/[code]/display-editor |
| **library/customers** | library/customers/[id] |
| **hr/bonus-settlement** | hr/bonus-settlement/[tourId] |

**最痛幾個**：
- 🔴 **calendar/page.tsx** — 跟 archive-management 的 `calendar_events` 直接 delete 連動
- 🔴 **marketing/website** — 剛 pull 的新 module、沒被審
- 🔴 **bot/*** — LINE/AI Hub 整套（昨晚 Round 11 才迭代完的）
- 🔴 **accounting/reports/*** — 財報相關 4 個頁、全部沒掃
- 🟠 **finance/requests / finance/treasury** — 請款 / 出納（每天用）

### openclaw 的「待掃」（6 個）他自己也標了
- library/suppliers
- library/attractions  
- hr/salary-settlement/[id]
- ai/_components/AiRetrospectiveTab
- shared-data/countries
- shared-data/airports

---

## E. openclaw 標記抽樣覆查（檢查「✅ 乾淨」標記正不正確）

我抽 4 個他標 ✅entity 的：

| 他標 | 我看 | 結論 |
|---|---|---|
| channels/page.tsx ✅ | `useChannels({ all: true })` 確實 entity | ✅ 正確 |
| tours/page.tsx ✅ | 確實走 useQuotesSlim / useOrdersSlim 都 entity | ✅ 正確 |
| todos/page.tsx ✅ | useTodos 確實 entity | ✅ 正確 |
| visas/page.tsx ✅ | useCustomerDocumentApplications 確實 entity | ✅ 正確 |

**抽樣 4 個全對**。他標「乾淨」的標記 quality 應該可信。

---

## F. Pass 2 該怎麼做（給 openclaw 的修訂派工書要點）

1. **Pass 2 範圍要擴大**：補做 29 個漏掉的頁，**不能用「待掃」標記**
2. **Pass 2 不能只看 grep 結果**：smoking gun #1 就是「只看 grep 結果」害的、handleSend 完整邏輯要讀完
3. **Pass 2 重點 channel_messages 寫入路徑**：所有寫 channel_messages 的地方都要列、不只是 ChannelView
4. **Pass 2 確認 realtime publication**：跑 `npm run audit:realtime` 看真實 publication
5. **Pass 2 必查 calendar_events 跟 tour_itinerary_items**：誰讀、有沒有 invalidate

---

## G. 給 William 的建議

### 立刻可動手的（不等 Pass 2）

1. **accounting 3 頁** — 已確認直接 supabase 無 realtime。要嘛補 entity hook、要嘛接受「打單後要 F5」
2. **archive-management 的 calendar_events delete** — 加 invalidate 的 SQL 或 RPC

### 等 Pass 2 再決定的

3. **channels 真痛點** — 不是 ChannelView 的 invalidate 錯、而是其他地方。Pass 2 要查 realtime publication + 其他寫入路徑
4. **29 頁漏掃** — Pass 2 補完才知道有沒有更多 smoking gun

### 我建議的順序

```
Step 1（你拍板要不要做）：openclaw 的 Pass 1 補做 — 把 29 漏頁補完整盤點
Step 2：Pass 2 對錯判斷 + 我複盤
Step 3：依 Pass 2 結果排修法優先級
```

---

*Pass 1 複盤完成。等 William 拍板 Step 1。*
