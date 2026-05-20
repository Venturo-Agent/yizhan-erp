# addon_data_hotels 升級到 5/5 計劃

## 當前分數：4/5（讀取✅ 資安✅ 架構✅ 品管✅ 清理⚠️）

---

## 5 維度狀態

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ✅ | hotels entity hook 有；addon 相對完整 |
| **資安** | ✅ | RLS/FK 完整 |
| **架構** | ✅ | L1-L6 全過 |
| **開發品管** | ✅ | addon_data_* 有專屬 entity |
| **清理** | ⚠️ | addon；dead code 待確認 |

---

## 升 5/5 具體 actions

### 🟡 Action A（清理 — knip）

**缺口**：addon dead code 待 knip 確認。

**修法**：
1. knip 跑 hotels/library 相關
2. 確認無 unused files

**預估工時**：1 小時
**預期難度**：低

---

### 🟡 Action B（品管 e2e）

**缺口**：hotels 無 e2e。

**修法**：
`tests/e2e/library-hotels.spec.ts`：
```
建立 hotel → 確認出現在列表 →
關聯到 tour/attraction →
確認詳細頁正確顯示 →
編輯 hotel → 確認變更正確
```

**預估工時**：2 小時
**預期難度**：🟡 中

---

## 總工時

**2-3 小時**。

---

## 預期難度

🟢 低。

---

## 推薦執行順序

1. **Action A**：knip（1 小時）
2. **Action B**：e2e（2 小時）

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*