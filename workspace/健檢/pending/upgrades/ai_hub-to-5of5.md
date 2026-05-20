# ai_hub 升級到 5/5 計劃

## 當前分數：4/5（讀取✅ 資安✅ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ✅ | AiConversationsTab 手刻 `useRealtimeMutate`（合理，跨表聚合）；其他頁面走 entity |
| **資安** | ✅ | RLS/FK 完整；chat system 無資安漏洞 |
| **架構** | ✅ | L1-L6 全過；ai_hub 已整合 3 個 bot module |
| **開發品管** | ⚠️ | ai_hub 無 realtime e2e；但手刻 realtime 是合理設計決策 |
| **清理** | ⚠️ | 3 個 bot module（line_bot/facebook_bot/instagram_bot）已整合；capabilities drift 7 個待清理 |

---

## 升 5/5 具體 actions

### 🟡 Action A（品管 e2e — realtime）

**缺口**：ai_hub 無 realtime e2e。

**修法**：
`tests/e2e/ai-hub-realtime.spec.ts`：
```
建立 AI conversation → 
在兩個分頁開啟同一 conversation →
在 A 分頁發送 message →
確認 B 分頁即時看到新 message（useRealtimeMutate 鏈路驗證）
```

**預估工時**：2 小時
**預期難度**：🟡 中

---

### 🟡 Action B（清理 — bot capabilities drift）

**缺口**：`capabilities.ts` 有 7 個 bot capability drift（line_bot.config/write、facebook_bot.config/write、instagram_bot.config/write）。

**修法**：
1. 從 `capabilities.ts` 砍 7 個 bot capability 常數
2. 等 William 確認 production 無人在用後，寫 migration 刪 role_capabilities DB rows

**預估工時**：30 分鐘（code 層）
**預期難度**：低

---

### 🟡 Action C（品管 e2e — 全鏈路）

**缺口**：無 ai_hub 全鏈路 e2e。

**修法**：
`tests/e2e/ai-hub.spec.ts`：
```
打開 ai hub → 建立新 conversation →
傳送訊息 → 確認回覆出現 →
建立分類/資料庫搜索 →
確認搜尋結果正確
```

**預估工時**：2 小時
**預期難度**：🟡 中

---

## 總工時

**4 小時**。

---

## 預期難度

🟡 中低。AI Hub 架構健康，手刻 realtime 是合理設計。

---

## 推薦執行順序

1. **Action B**：清理 bot drift（30 分鐘，代價低）
2. **Action A**：realtime e2e（2 小時）
3. **Action C**：full spec（2 小時）

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*