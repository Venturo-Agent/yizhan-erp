# calendar 升級到 5/5 計劃

## 當前分數：4.5/5（讀取✅ 資安✅ 架構✅ 品管⚠️ 清理✅）

---

## 5 維度狀態

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ✅ | page.tsx 用 `useCalendarEvents` entity hook；createEntityHook 有 realtime |
| **資安** | ✅ | RLS/FK 完整；workspace_id guard 有 |
| **架構** | ✅ | L1-L6 全過；6 層都到位 |
| **開發品管** | ⚠️ | 無 calendar specific e2e；eslint suppress 有 |
| **清理** | ✅ | 無 dead code 殘留；module 獨立完整 |

---

## 升 5/5 具體 actions

### 🟡 Action A（品管 e2e — realtime）

**缺口**：calendar 無 realtime e2e。

**修法**：
`tests/e2e/calendar-realtime.spec.ts`：
```
建立 calendar event →
在兩個分頁開啟 calendar →
在 A 分頁編輯 event 時間 →
確認 B 分頁即時看到更新（SWR realtime 鍊路驗證）
```

**預估工時**：2 小時
**預期難度**：🟡 中

---

### 🟡 Action B（品管 e2e — 全鏈路互動）

**缺口**：無 calendar 全鏈路 e2e。

**修法**：
`tests/e2e/calendar.spec.ts`：
```
建立行程 → 設定時間/地點 →
拖曳行程變更時間 →
確認出現在對應日期 →
刪除行程 → 確認從視圖消失 →
確認歸檔操作後行程從 calendar 消失（archive-management 連動）
```

**預估工時**：2-3 小時
**預期難度**：🟡 中

---

## 總工時

**3-4 小時**。

---

## 預期難度

🟡 中。Calendar 是 Phase 1 最健康 module 之一，e2e 價值高。

---

## 推薦執行順序

1. **Action A**：realtime e2e（2 小時）
2. **Action B**：full spec（2 小時）

---

## 備註

Calendar 4.5/5 已是 Phase 1 最高分之一。升 5/5 只需要補 e2e，性價比極高。

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*