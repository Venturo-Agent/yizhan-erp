# hr_bonus_settlement 升級到 5/5 計劃

## 當前分數：2.5/5（讀取⚠️ 資安⚠️ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ⚠️ | bonus-settlement/[tourId]/page.tsx 沒有 entity hook；ProfitTab 散刻 useSWR `'bonus_orders'`（B-type 跨表獎金計算）；無 realtime 訂閱 |
| **資安** | ⚠️ | 多人同時結算同一團無 lock；closed period guard 部分覆蓋 |
| **架構** | ✅ | L1 ModuleGuard 有；L2 Capability 有；L6 apiMutate 有 |
| **開發品管** | ⚠️ | bonus-settlement 無 e2e；eslint suppress 有 |
| **清理** | ⚠️ | `tour-bonus-settings.ts` entity 有；但 hr_bonus_settlement 是 HrModule 子功能，獨立性低 |

---

## 升 5/5 具體 actions

### 🟠 Action A（讀取效能 — entity hook）

**缺口**：`bonus-settlement/[tourId]/page.tsx` 無 entity hook。

**修法**：
1. 確認 `useTourBonusSettlements` 或等效 entity 是否存在（`src/data/entities/tour-bonus-settings.ts` 已確認）
2. 如果 entity hook 存在但 page.tsx 沒用 → rewrite page.tsx 走 entity hook
3. ProfitTab 的 `'bonus_orders'` useSWR（B-type）是跨表獎金計算、合理但可考慮包裝

**影響檔**：`src/app/(main)/hr/bonus-settlement/[tourId]/page.tsx`
**預估工時**：2-3 小時（如果 entity hook 已存在，單純置換很快）
**預期難度**：🟡 中（取決於 entity hook 是否完整）

---

### 🟠 Action B（資安紅線 D — 並發 lock）

**缺口**：多人同時結算同一個團（多人打開同一個獎金結算頁）可能產生 race condition。

**修法**：
1. 在 API route 加 `SELECT FOR UPDATE` lock（PostgreSQL advisory lock或行鎖）
2. 確認 `hr_bonus_settlement` API route 有並發控制
3. 或者從業務上限制「一個 tour 同時間只能一人結算」（加 tour.bonus_locked_at 欄位）

**預估工時**：2 小時
**預期難度**：🟡 中

---

### 🟡 Action C（品管 e2e）

**缺口**：bonus-settlement 無專屬 e2e。

**修法**：
`tests/e2e/hr-bonus-settlement.spec.ts`：
```
建立 1 筆 tour → 建立關聯 order → 
打開獎金結算頁 → 結算獎金 → 
確認利潤計算正確 → 確認結算後 lock（不能二次結算）
```

**預估工時**：2-3 小時
**預期難度**：🟡 中

---

### 🟡 Action D（清理）

**缺口**：hr_bonus_settlement 是 HrModule 子功能，清理優先級低。

**修法**：
1. knip 確認無 hr_bonus_settlement 專屬 unused files
2. 修完 Action A 後跑 `npm run lint:swr-prune`

**預估工時**：30 分鐘
**預期難度**：低

---

## 總工時

**5-7 小時（1 人天）**。

---

## 預期難度

🟡 中。相對簡單的 module，但並發 lock 需要小心。

---

## 推薦執行順序

1. **Action A**：先確認 entity hook 存在與否（診斷，30 分鐘）
2. **Action B**：紅線 D 相對重要、優先做
3. **Action D**：趁修之前清理
4. **Action C**：最後補 e2e

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*