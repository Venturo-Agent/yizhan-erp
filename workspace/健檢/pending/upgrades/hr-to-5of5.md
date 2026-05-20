# hr 升級到 5/5 計劃

## 當前分數：4/5（讀取✅ 資安⚠️ 架構✅ 品管⚠️ 清理✅）

---

## 5 維度狀態

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ✅ | HrModule 用 `useEmployees` entity hook；organization/roles/employees 都走 entity |
| **資安** | ⚠️ | 紅線 D（closed period）在 salary_settlements 有；但 HrModule 其他部分（organization/roles）無 closed period guard |
| **架構** | ✅ | L1-L6 全過；capability 148 項完整 |
| **開發品管** | ⚠️ | hr/organization 無 e2e；eslint suppress 有 |
| **清理** | ✅ | 無 dead code；HrModule 獨立完整 |

---

## 升 5/5 具體 actions

### 🟡 Action A（資安 — 紅線 D guard 補漏）

**缺口**：HrModule 的 organization / roles 編輯缺少 closed period guard。

**修法**：
1. 確認哪些 HR 操作需要月結後鎖定（通常是 salary_settlement 相關，organization/roles 編輯通常不需鎖）
2. 如果需要 → 在 API route 加 `is_closed_period()` check
3. 如果不需要 → 維持現狀（業務判斷）

**預估工時**：1-2 小時
**預期難度**：🟡 中

---

### 🟡 Action B（品管 e2e）

**缺口**：hr/organization 無 e2e。

**修法**：
`tests/e2e/hr-organization.spec.ts`：
```
建立部門 → 確認出現在組織圖 →
建立員工 → 確認隸屬正確部門 →
編輯員工部門 → 確認組織圖更新 →
刪除部門 → 確認員工被妥善移轉（不做孤立）
```

**預估工時**：2-3 小時
**預期難度**：🟡 中

---

### 🟡 Action C（清理 — eslint suppress）

**缺口**：eslint suppress 有 hr/organization entries。

**修法**：
1. 修完 Action A/B 後跑 `npm run lint:swr-prune`
2. 確認 hr 相關 suppress 都清除

**預估工時**：30 分鐘
**預期難度**：低

---

## 總工時

**3-4 小時**。

---

## 預期難度

🟡 中。HR 業務邏輯清晰簡單。

---

## 推薦執行順序

1. **Action A**：先確認是否真的需要 closed period guard（業務判斷）
2. **Action B**：e2e
3. **Action C**：prune

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*