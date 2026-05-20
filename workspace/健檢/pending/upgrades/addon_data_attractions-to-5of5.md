# addon_data_attractions 升級到 5/5 計劃

## 當前分數：4/5（讀取✅ 資安✅ 架構✅ 品管✅ 清理⚠️）

---

## 5 維度狀態

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ✅ | attractions entity hook 有；library/attractions page 用 entity |
| **資安** | ✅ | RLS/FK 完整；addon workspace_id guard 有 |
| **架構** | ✅ | L1-L6 全過；addon 不暴露 HR |
| **開發品管** | ✅ | addon_data_* 有專屬 entity；lint/type 全過 |
| **清理** | ⚠️ | addon 是 addon；dead code 待確認（但相對獨立、影響小）|

---

## 升 5/5 具體 actions

### 🟡 Action A（清理 — knip）

**缺口**：addon dead code 待 knip 確認。

**修法**：
1. knip 跑 attractions/library 相關
2. 確認無 unused files

**預估工時**：1 小時
**預期難度**：低

---

### 🟡 Action B（品管 e2e）

**缺口**：attractions 無 e2e。

**修法**：
`tests/e2e/library-attractions.spec.ts`：
```
建立 attraction（景點）→ 確認出現在列表 →
關聯到 tour → 確認 tour 詳細頁正確顯示 →
編輯 attraction → 確認變更正確 →
確認 SWR cache 即時更新（apiMutate 鏈路）
```

**預估工時**：2 小時
**預期難度**：🟡 中

---

## 總工時

**2-3 小時**。

---

## 預期難度

🟢 低。Addon module 最簡單。

---

## 推薦執行順序

1. **Action A**：knip（1 小時）
2. **Action B**：e2e（2 小時）

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*