# todos 升級到 5/5 計劃

## 當前分數：4/5（讀取✅ 資安✅ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ✅ | `todos/page.tsx` 用 `useTodos` entity hook；createEntityHook 有 realtime |
| **資安** | ✅ | RLS/FK 完整；紅線 G（per-user cache key）✅ |
| **架構** | ✅ | L1-L6 全過 |
| **開發品管** | ⚠️ | todos 無 realtime e2e；duplicate exports 待清理 |
| **清理** | ⚠️ | todos 是相對完整的 module；但 duplicate exports 待清理（formatDateCompact/formatDateCompactPadded、formatDateTW/formatDateDisplay）|

---

## 升 5/5 具體 actions

### 🟡 Action A（品管 e2e — realtime）

**缺口**：todos 無 realtime e2e。

**修法**：
`tests/e2e/todos-realtime.spec.ts`：
```
建立 todo item → 
在兩個分頁開啟 todos →
在 A 分頁標記完成 →
確認 B 分頁即時看到狀態更新
```

**預估工時**：1-2 小時
**預期難度**：🟡 中

---

### 🟡 Action B（清理 — duplicate exports）

**缺口**：formatDateCompact/formatDateCompactPadded、formatDateTW/formatDateDisplay 兩組 duplicate exports（在 shared lib）。

**修法**：
1. 確認這兩組函式是否真的 duplicate（可能一個是 utility、一個是 export alias）
2. 如果是 → 統一保留一個 name、deprecated 另一個
3. 更新所有 caller

**預估工時**：1 小時
**預期難度**：低

---

### 🟡 Action C（清理 — knip unused）

**缺口**：knip 456 unused exports 中 todos 相關待確認。

**修法**：
1. knip 跑 todos 相關
2. 漸進清理

**預估工時**：30 分鐘
**預期難度**：低

---

## 總工時

**2-3 小時**。Todos 是簡單 module，工時少。

---

## 預期難度

🟢 低。Todos 無大缺口。

---

## 推薦執行順序

1. **Action A**：e2e（1-2 小時）
2. **Action B**：duplicate exports（1 小時）
3. **Action C**：knip（30 分鐘）

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*