# orders 升級到 5/5 計劃

## 當前分數：4/5（讀取✅ 資安✅ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度         | 現狀 | 具體缺口                                                                    |
| ------------ | ---- | --------------------------------------------------------------------------- |
| **讀取效能** | ✅   | `orders/page.tsx` 用 `useOrders` entity hook；createEntityHook 有 realtime  |
| **資安**     | ✅   | RLS/FK 完整；紅線 B（orders.created_by → employees）✅；紅線 G ✅           |
| **架構**     | ✅   | L1-L6 全過；apiMutate 有                                                    |
| **開發品管** | ⚠️   | orders 無 realtime e2e；eslint suppress 有                                  |
| **清理**     | ⚠️   | duplicate exports 無；但 `order-members.ts` entity 最近才補、可能需整合確認 |

---

## 升 5/5 具體 actions

### 🟡 Action A（品管 e2e — realtime）

**缺口**：orders 無 realtime e2e。

**修法**：
`tests/e2e/orders-realtime.spec.ts`：

```
建立 order →
在兩個分頁開啟同一 order →
在 A 分頁編輯 order 狀態 →
確認 B 分頁即時看到狀態更新（SWR realtime 鍊路驗證）
```

**預估工時**：2 小時
**預期難度**：🟡 中

---

### 🟡 Action B（品管 e2e — 全鏈路）

**缺口**：無 orders 全鏈路 e2e（這個更重要）。

**修法**：
`tests/e2e/full/orders-full.spec.ts`：

```
報價 → 建立 order → 確認出現在列表 →
建立關聯 tour → 安排出團日期 →
收款 → 確認餘額更新 →
出團 → 確認狀態流轉正確 →
完成 → 確認所有狀態已鎖定
```

**預估工時**：3-4 小時（e2e/full/ 是最完整的測試）
**預期難度**：🟡 中

---

### 🟡 Action C（清理 — order-members 整合）

**缺口**：`order-members.ts` entity 最近才補，需確認已正確整合。

**修法**：

1. 確認 `src/app/(main)/orders/` 各 page.tsx 都用 `useOrders` + `useOrderMembers`
2. 確認無散刻直接 supabase

**預估工時**：30 分鐘（確認）
**預期難度**：低

---

## 總工時

**5-6 小時**。

---

## 預期難度

🟡 中。Orders 是 Phase 1 核心 module，e2e 價值高。

---

## 推薦執行順序

1. **Action C**：先確認 order-members 整合（30 分鐘）
2. **Action A**：realtime e2e（2 小時）
3. **Action B**：full spec（3 小時，最重要）

---

_Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push_
