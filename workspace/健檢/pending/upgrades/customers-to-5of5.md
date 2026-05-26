# customers 升級到 5/5 計劃

## 當前分數：4/5（讀取✅ 資安✅ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度         | 現狀 | 具體缺口                                                                                                                        |
| ------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------- |
| **讀取效能** | ✅   | SuppliersPage/AiRetrospectiveTab 用 `useCustomers` entity hook                                                                  |
| **資安**     | ✅   | RLS/FK 完整；紅線 B（customers.created_by → employees）✅                                                                       |
| **架構**     | ✅   | L1-L6 全過                                                                                                                      |
| **開發品管** | ⚠️   | customers 無專屬 e2e；eslint suppress 有                                                                                        |
| **清理**     | ⚠️   | customers entity 有 duplicate exports 3 個（canManageRoles/hasAdminCapability 等）；knip 456 unused exports 中有 customers 相關 |

---

## 升 5/5 具體 actions

### 🟡 Action A（品管 e2e）

**缺口**：customers 無專屬 e2e。

**修法**：
`tests/e2e/customers.spec.ts`：

```
建立 customer → 確認出現在列表 →
建立關聯 supplier / attraction（交叉引用）→
搜尋 customer → 確認能找到 →
編輯 customer → 確認更新正確 →
刪除 customer → 確認從列表消失
```

**預估工時**：2-3 小時
**預期難度**：🟡 中

---

### 🟡 Action B（清理 — duplicate exports）

**缺口**：duplicate exports 3 個（canManageRoles/hasAdminCapability、formatDateCompact/formatDateCompactPadded、formatDateTW/formatDateDisplay）。

**修法**：

1. 確認哪個 name 是「正確的」（通常第一個）
2. Deprecated 第二個 name、保留一個（避免同函式兩個 export name）
3. 更新所有 caller 統一用一個 name

**預估工時**：30 分鐘（確認）+ 1 小時（更新 caller）
**預期難度**：🟡 中

---

### 🟡 Action C（清理 — knip unused exports）

**缺口**：knip 抓到 456 unused exports、customers 相關待清理。

**修法**：

1. 跑 knip 確認 customers 相關 unused exports 具體是哪些
2. 確認是否真的沒人用（而非動態 import）
3. 漸進清理

**預估工時**：1 小時
**預期難度**：低

---

## 總工時

**3-4 小時**。

---

## 預期難度

🟡 中低。Customers 無大缺口。

---

## 推薦執行順序

1. **Action B**：先處理 duplicate exports（30 分鐘）
2. **Action C**：knip 確認
3. **Action A**：e2e（2 小時）

---

_Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push_
