# hr_salary_settlement 升級到 5/5 計劃

## 當前分數：3.5/5（讀取⚠️ 資安✅ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ⚠️ | `salary-settlement/[id]/page.tsx` 用 `useSWR` + `apiMutate`；無 entity hook；其他 hr/salary-settlement/ 頁面也有類似問題 |
| **資安** | ✅ | 紅線 D guard（closed period）在 salary_settlements 已補（Round 4）✅ |
| **架構** | ✅ | L1-L6 全過；apiMutate 有 |
| **開發品管** | ⚠️ | salary-settlement 無 e2e；eslint suppress 有 |
| **清理** | ⚠️ | HrSalarySettlementModule 是 HrModule 子功能；employee-eligibilities entity 有 |

---

## 升 5/5 具體 actions

### 🟠 Action A（讀取效能 — entity hook）

**缺口**：`salary-settlement/[id]/page.tsx` 無 entity hook。

**修法**：
1. 確認 `useSalarySettlements` entity hook 是否存在
2. 如果存在 → rewrite page.tsx 走 entity hook
3. 如果不存在 → 建立 `salary-settlements.ts` entity hook

**影響檔**：`src/app/(main)/hr/salary-settlement/[id]/page.tsx`
**預估工時**：3-4 小時
**預期難度**：🟡 中

---

### 🟡 Action B（品管 e2e）

**缺口**：salary-settlement 無 e2e。

**修法**：
`tests/e2e/hr-salary-settlement.spec.ts`：
```
建立薪資結算 → 填寫資料 →
提交 → 確認狀態為「已結算」→
嘗試修改已結算項目 → 確認 closed period guard 擋住（紅線 D 驗證）
```

**預估工時**：2 小時
**預期難度**：🟡 中

---

### 🟡 Action C（清理）

**缺口**：HrSalarySettlementModule 是 HrModule 子功能，清理優先級低。

**修法**：
1. 修完 Action A 後跑 `npm run lint:swr-prune`
2. 確認 hr_salary_settlement 相關 suppress

**預估工時**：30 分鐘
**預期難度**：低

---

## 總工時

**5-6 小時**。

---

## 預期難度

🟡 中。HR salary settlement 邏輯相對簡單。

---

## 推薦執行順序

1. **Action A**：先做（最關鍵）
2. **Action B**：e2e
3. **Action C**：prune

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*