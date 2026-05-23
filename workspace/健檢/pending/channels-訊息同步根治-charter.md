# channels 訊息同步根治 — 派工書（待 William 回電腦前一起做、需即時測）

> 2026-05-23 主 Claude 診斷。起因：William 回報頻道發送卡「傳送中」+ 畫面重新整理。
> 已做：send 對齊 AI Hub（commit `5cef6fd`、send 大致順）。但暴露更深的架構問題、需單一來源重構 + 即時測。

---

## 根因（一句話）

channels 的訊息同步是**手刻的「雙來源」**：本地 `recentlySent`（樂觀）+ `useChannelMessages` entity hook 的 realtime。
兩個來源交接時機不定 → 間歇閃爍。**AI Hub 是單一來源（`useSWR` + `apiMutate` invalidate）所以永遠順。**

根治方向：把 channels 改成跟 AI Hub 一樣的單一來源模型。

## 症狀 → 對應 code

| 症狀 | 根 | 位置 |
|---|---|---|
| 送出「一下閃一下不閃」 | 雙來源（recentlySent vs messages）交接 | `ChannelView.tsx` `recentlySent` + `useChannelMessages` |
| 撤回會閃 | 還在用手動重抓 `await invalidateChannelMessages()` | `ChannelView.tsx` handleRevoke（約 line 213-214）|
| 切頻道時重整 | 標已讀後 `await invalidateChannelMembers()` 重抓 | `ChannelView.tsx` markRead useEffect（約 line 84）|
| 自己看到自己未讀 | 未讀算法 = `channel.updated_at > 我的 last_read_at`；發訊息 bump 了 updated_at、但沒更新自己的 last_read_at → 離開後顯示未讀 | `ChannelsSidebar.tsx` `isUnread`（約 line 160-171）|
| 傳給 Carson 不會 | 待確認、可能 DM vs 群組頻道差異 | — |

## ✅ 已完成 + 已驗證（2026-05-24 William 真站測「三個都順」）

- commit `5cef6fd`：handleSend 拆「傳送中」泡泡、`sending` 改 try/finally。
- commit `a510cfb`（根治）：移除過時的 `recentlySent` 雙來源 → 單一來源（entity hook）。發送/撤回後 `await invalidateChannelMessages()`、別人靠內建 realtime。
- 已部署 production、William 真站測：**發送 / 撤回 / 收訊息 三個都順、閃爍根治**。
- 根因確認：`recentlySent` 是繞 5/18 前「entity hook invalidate 不可靠」舊 bug 的補丁；該 bug 已修（dedupingInterval Infinity→2000），補丁過時反成閃爍源。

## 根治計畫（需 William 在電腦前、即時測）

1. **單一來源**：評估移除 `recentlySent`、send 後用 AI Hub 式 `apiMutate` invalidate（或確認 entity hook realtime 夠穩可純靠它）。目標：訊息只有一個來源、不再交接閃。
   - ⚠️ 前人註解稱 entity hook invalidate「不可靠」（dedupingInterval=Infinity + fallbackData）—— 要先驗證這說法現在還成不成立（channel_messages 已在 realtime 發布清單、我驗過）。
2. **撤回**：handleRevoke 同樣拆手動重抓、改樂觀更新（標記該訊息 revoked、靠 realtime 補）。
3. **標已讀**：markRead 拆 `invalidateChannelMembers()` 重抓、改樂觀更新本地 member 的 last_read_at。
4. **自己未讀**：發訊息時一併推進自己的 last_read_at（或未讀算法排除自己發的訊息）。
5. **每改一步、William 即時測**：發 / 撤回 / 收（請別人發給你）/ 切頻道 / 看紅點，五個情境都不閃才算過。

## 為什麼不現在盲改

前人改過 v5/v6/v7 還在跟閃爍纏鬥 = 這是 React 渲染時機的細活、必須即時測。William 外出、無法即時測時盲改 = 大概率越改越糟。違反「卡住先停手、不瞎試」鐵律。

## 部署狀態（2026-05-24 更新）

- 全部已部署 production：`70b5137`(JWT) / `5cef6fd`(channels) / `d845791`(payment) / `a510cfb`(channels 根治)。
- 閃爍根治**已驗證**（真站三情境都順）。
- **剩 iteration 2：自己看到自己未讀的紅點** — 見上方「根治計畫」第 4 點（發訊息時推進自己的 last_read_at，或未讀算法排除自己發的）。尚未做。
