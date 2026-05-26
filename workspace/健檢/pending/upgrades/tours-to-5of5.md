# tours 升級到 5/5 計劃

## 當前分數：4/5（讀取✅ 資安✅ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度         | 現狀 | 具體缺口                                                                            |
| ------------ | ---- | ----------------------------------------------------------------------------------- |
| **讀取效能** | ✅   | ToursPage 用 `useTours` + `useTourItineraryItems`；createEntityHook 有 realtime     |
| **資安**     | ✅   | RLS/FK 完整；紅線 B（tours.created_by → employees）✅；紅線 G ✅                    |
| **架構**     | ✅   | L1-L6 全過；apiMutate 有                                                            |
| **開發品管** | ⚠️   | tours 無 realtime e2e；但 concurrency test 有（order-number-race）                  |
| **清理**     | ⚠️   | tours 是 Phase 1 最大 module；unused exports 待清理（knip 456 中大量是 tours 相關） |

---

## 升 5/5 具體 actions

### 🟡 Action A（品管 e2e — realtime）

**缺口**：tours 無 realtime e2e。

**修法**：
`tests/e2e/tours-realtime.spec.ts`：

```
建立 tour →
在兩個分頁開啟同一 tour →
在 A 分頁編輯行程項目 →
確認 B 分頁即時看到更新
```

**預估工時**：2 小時
**預期難度**：🟡 中

---

### 🟡 Action B（品管 e2e — 全鏈路）

**缺口**：無 tours 全鏈路 e2e。

**修法**：
`tests/e2e/full/tours-full.spec.ts`：

```
建立 tour → 設定基本資料 →
加入 itinerary items → 設定出團日期 →
確認報價頁正確計算 →
建立相關 orders → 收款 →
確認出團狀態流轉
```

**預估工時**：3-4 小時
**預期難度**：🟡 中

---

### 🟡 Action C（清理 — knip）

**缺口**：tours 是 Phase 1 最大 module，knip 456 unused exports 中大量是 tours 相關。

**修法**：

1. knip 跑 tours 相關，列出前 10-20 個最明顯的 unused exports
2. 確認是否真的沒人用（動態 import 要小心）
3. 漸進清理（每週清 5-10 個）

**預估工時**：2-3 小時（第一批）
**預期難度**：🟡 中

---

### 🟡 Action D（清理 — duplicate exports）

**缺口**：formatDateCompact/formatDateCompactPadded、formatDateTW/formatDateDisplay 雨 group duplicate export。

**修法**：同其他 module（統一 name）。

**預估工時**：1 小時
**預期難度**：低

---

## 總工時

**7-9 小時**。Tours 是 Phase 1 最大 module，清理量也大。

---

## 預期難度

🟡 中。Tours 業務複雜但架構健康。

---

## 推薦執行順序

1. **Action A**：realtime e2e（2 小時）
2. **Action D**：duplicate exports（1 小時，先清簡單的）
3. **Action C**：knip 第一批（2-3 小時）
4. **Action B**：full spec（3 小時）

---

_Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push_
