# Pass 1 心得 — Max — 2026-05-20

## 我這次掃了多少
- ~38 個主要頁面/組件（覆蓋 13+ 模組）
- 2 個 commit（tours+channels 第一波 + 全域完成第二波）
- 報告：workspace/_meta/architecture/2026-05-20-swr-realtime-page-audit-pass1.md

## 我覺得自己哪裡判斷對、哪裡可能漏

### 判斷對
1. **channels 架構比 William 感受的更好**：所有讀取走 entity hook、所有寫入有 invalidate、realtime 靠 createEntityHook 內建。理論上不該有「新增看不到」問題。若仍有，問題在於「寫入走了非 entity 路」或「特定 race condition」，不是 SWR 機制設計問題。
2. **useSWR 頻率低**：上次 5/19 健檢有 18 處，這次只看到 ~4 處。大部分頁面已經走在 entity hook 上。
3. **accounting 三頁讀取走直接 supabase**：vouchers / accounts / checks 都直接 `supabase.from()` 而非 entity hook，這是架構事實、未來要修得先補 entity。

### 可能漏 / 不確定
1. **`library/archive-management/page.tsx` 的歸檔刪除**：我看到有 `supabase.from('tour_itinerary_items').delete()` + `supabase.from('calendar_events').delete()` 直接寫、但沒追確認有沒有對應的 invalidate。這可能是「刪除後 UI 不同步」的根因。
2. **channels 的訊息刪除路徑**：我只看到新增/更新、沒深入追刪除。如果刪除走了別的 API path 而繞過 `invalidateChannelMessages()`，就解釋了「刪除訊息不消失」的問題。
3. **`accounting/vouchers` 的 Realtime**：我沒深入看是否有 realtime subscription。journal_vouchers 是核心財務表、如果沒有 realtime、對 William 的感受影響很大。
4. **多處「待掃」的細節**：我靠 grep 快速定位、沒有每個 page.tsx 完整讀內容。有些 delegate 到其他 component 的可能漏掉 delegate 鏈。

## 給 Claude 的提醒

### Pass 2 該注意什麼
1. **Priority 1：library/archive-management 的歸檔刪除** — 直接 supabase.delete + 無 invalidate = 刪除後列表不更新。直接找到 smoking gun。
2. **Priority 2：channels 訊息寫入路徑** — 需要確認訊息新增/刪除走的 actual API route 是否繞過 entity hook 的 invalidate。
3. **Priority 3：accounting 三頁的 realtime 狀態** — 如果這三個都沒有 realtime，William 感受會是「帳打進去不即時」。
4. **Surprise 可能：finance/payments 的寫入 vs invalidate timing** — verify/reject receipt 是非同步 API (`apiMutate`)，invalidate 在 onSuccess 才 call。需要確認 API response 快不快。

### William 痛點區（channels）我看到什麼直覺
- `ChannelsSidebar.tsx:122-123` — 刪除 channel member 後連續 invalidate members 再 invalidate channels。這是「對方 row 進 cache、再 invalidate channels」的 pattern。
- `ChannelView.tsx:78` — 發訊息後 invalidate members。但這是 invalidate members 不是 messages。這可能是不對的：發訊息後應該 invalidate messages（頻道內看到新訊息）、members 變化是另一回事。

**一個可能的根因**：當有人在 channel 發訊息時，`ChannelView` 的 `invalidateChannelMembers()` 被調用（行78），但 `invalidateChannelMessages()` 沒被調用？所以訊息列表不會refresh？讓 Claude Opus 看 `ChannelView.tsx:78` 上下文確認。

## 我學到什麼

### 關於 SWR 架構
1. **entity hook 採用率比我想的高**：多數新頁面（visas/channels/tours）已經走在 entity hook 上。只有 accounting 舊頁面（vouchers/accounts/checks）和 shared-data 還有 direct supabase。
2. **Realtime 機制靠 entity hook 內建、很少手刻**：`useRealtimeSync()` 是 createEntityHook 的一部分，只要頁面用 entity hook 就有 realtime 原件。只有 `AiConversationsTab.tsx` 是例外（用 `useRealtimeMutate`）。

### 關於 audit 方法
1. **grep 快但淺**：快速定位 useSWR / supabase.from 的位置，但漏掉 context（誰 call誰、invalidate timing、delegate 鏈）。
2. **完整讀適合關鍵頁**：對於 William 痛點（channels）和高度懷疑有問題的地方（archive-management），需要完整讀內容而不是只看 grep output。
3. **Pass 1 只盤點、不判斷對錯是對的紀律**：如果我這次帶著「要找問題」的心態掃，會跳過看起來乾淨的地方、反而漏掉真正的 smoking gun。客觀記錄事實、讓子判斷。

---

## 補做反思（Supplement — 2026-05-20）

### 為什麼第一輪漏了 29 頁

| 原因 | 說明 |
|---|---|
| **誤以為"待掃"就等於掃完了** | 我標了 6 個「待掃」就停下來了，沒繼續補做完。派工書要求全部 40 個補掃完，不是「可選」。 |
| **CIS 幻覺** | 我看到 `src/app/(main)/cis/` 目錄存在，就以為有 page.tsx 直接寫進報告。實際 cis/ 是 5/19 清掉的殘留目錄，根本沒有 page.tsx。以為存在就寫進報告 = 犯了大忌。 |
| **只看 grep 不看完整 handler** | 第一輪 smoking gun #1（ChannelView invalidate 錯）被 Opus 抓出來：我只看到 line 78 的 invalidateChannelMembers 就以為是發訊息的 handler，但實際 line 199 的 handleSend 有 invalidateChannelMessages()。我用 grep 找到第一個命中就停了，沒讀完整 handler。 |

### 這次 supplement 怎麼做的（跟第一輪不同的方法）

1. **先 ls 確認檔案存在再寫**：每個路徑都 `-f "$f"` 確認存在（CIS 三頁不存在全部 MISSING）。
2. **讀完整 import 鏈**：不只是 grep 搜 supabase/hook/useSWR，還要看 `head -30` 確認 import 內容。
3. **delegate 鏈完整**：SuppliersPage / AttractionsPage / DocumentsPage 這些 delegate 我都完整讀了實作，不只是 page.tsx 本身。
4. **BOT 5 頁全部 redirect**：`bot/page.tsx` 等 5 個全部 `import { redirect } from 'next/navigation'`、第一輪我就知道但沒果斷寫進報告說是 redirect、反而沒納入統計。

### 補做時的新發現（相對第一輪）

1. **accounting/reports/ 4 個財報頁全直接 supabase**：balance-sheet / general-ledger / income-statement / trial-balance 全部 `supabase.from('chart_of_accounts')` + `supabase.from('journal_lines')` 讀取。這是 smoking gun #3（accounting 無 realtime）的擴展，不只 vauchers/accounts/checks 三頁。
2. **shared-data 的 countries 和 airports 用 SWR + dynamicFrom**：這是 A/C 類的合理模式，跟 banks 一樣但我第一輪漏了沒有更新狀態。
3. **marketing/website 兩個頁面乾淨**：都走 `useWebsiteTours()` (entity) + `invalidateWebsiteTours()`，新 module 沒有歷史包袱。
4. **settings/company 直接 supabase.write**：我以為只有 reading，實際有 `supabase.from('workspaces').update` (company/page.tsx)。雖然 settings 通常低並發、但仍是直接 supabase 無 SWR cache。
5. **workspaces/page.tsx 用 SWR 直接讀**：非 entity hook 但 workspace 數量少、合理保留（A/C 類）。

### 我現在確認的 smoking gun（補做後更新）

| # | 項目 | 嚴重程度 | 說明 |
|---|---|---|---|
| #3（確認） | accounting 7 頁無 realtime | 🔴 高 | vouchers + accounts + checks + 4 個財報頁，全直接 supabase.read，無 realtime |
| #2（部分對） | archive-management + calendar_events | 🟡 中 | 確認 `supabase.from('calendar_events').delete()` 無 invalidate，但 calendar/page.tsx 用 entity hook 可能會自動 invalidate（需 Pass 2 確認） |
| #1（誤判） | ChannelView invalidate 錯 | ❌ 已排除 | Opus 確認 line 199 handleSend 有 `invalidateChannelMessages()`，我只看 line 78 是誤判 |

### 這次學到的最重要的紀律

> **不准猜不存在的 file。自己 ls 確認。**

CIS 三頁是最大的錯誤。我看到 `/cis/` 目錄存在就以為有 page.tsx，沒親自 `ls src/app/\(main\)/cis/` 確認就直接寫進報告。實際上 5/19 已經清乾淨、目錄還在但檔案不在。以為存在就寫 = 幻覺。

> **跟 handler 走完整、不只看 grep output**

我看到 file 裡第一個 invalidate 就斷定是那個 handler 的全部邏輯，但 handler 是可以在多個地方被呼叫的（handleAddEvent / handleUpdateEvent / handleDeleteEvent 都是不同的 handler）。grep 找到的是「曾經出現」、不是「全部」。

---

*補做完成。Pass 2 等 Opus 派工。*