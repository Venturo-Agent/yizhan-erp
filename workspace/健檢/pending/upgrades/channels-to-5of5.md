# channels 升級到 5/5 計劃

## 當前分數：4/5（讀取✅ 資安✅ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ✅ | `channels/page.tsx` 用 `useChannels` entity hook；handler 行199有 `invalidateChannelMessages()` |
| **資安** | ✅ | RLS/FK 完整；紅線 B（created_by → employees）✅；紅線 G（per-user cache key）✅ |
| **架構** | ✅ | L1-L6 全過；createEntityHook 內部 useRealtimeSync（行175+269）✅ |
| **開發品管** | ⚠️ | 無 realtime e2e 測試；eslint suppress 有 |
| **清理** | ⚠️ | bot module drift（line_bot/facebook_bot/instagram_bot）不在 channels 但殘留；duplicate exports 待清理 |

---

## 升 5/5 具體 actions

### 🟡 Action A（品管 e2e — realtime）

**缺口**：channels 無 realtime e2e 測試。

**修法**：
`tests/e2e/channels-realtime.spec.ts`：
```
建立 channel → 開啟兩個瀏覽器分頁 →
在 A 分頁發送 message → 
確認 B 分頁即時看到新 message（SWR realtime 鍊路驗證）
```

**預估工時**：2 小時
**預期難度**：🟡 中（ realtime 測試需要 timing 處理）

---

### 🟡 Action B（清理 — bot capabilities drift）

**缺口**：`src/lib/permissions/capabilities.ts` 有 7 個 bot capability drift（line_bot.config / facebook_bot.write 等）已廢但不清理。

**修法**（Phase 1）：
1. 從 `capabilities.ts` 砍 7 個 bot capability 常數（line_bot.config / write、facebook_bot.config / write、instagram_bot.config / write）
2. **不碰** role_capabilities DB rows（需要 migration，等 William 確認 production 無人在用）

**預估工時**：30 分鐘（code 層）
**預期難度**：低

---

### 🟡 Action C（品管 — duplicate exports）

**缺口**：channels 有無 duplicate exports（需 knip 確認）。

**修法**：
1. knip 跑 `workspace/健檢/reports/` channels 相關
2. 確認無同名函式從多處 export

**預估工時**：30 分鐘
**預期難度**：低

---

## 總工時

**3 小時**。Channels 是最健康的 module 之一，工時很少。

---

## 預期難度

🟢 低。Channels 無大缺口，主要缺 e2e realtime。

---

## 推薦執行順序

1. **Action B**：先清理 bot drift（30 分鐘，代價低）
2. **Action A**：補 realtime e2e（2 小時）
3. **Action C**：knip 確認

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*