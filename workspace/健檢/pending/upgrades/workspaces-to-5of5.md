# workspaces 升級到 5/5 計劃

## 當前分數：3.5/5（讀取⚠️ 資安✅ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度         | 現狀 | 具體缺口                                                                                                             |
| ------------ | ---- | -------------------------------------------------------------------------------------------------------------------- |
| **讀取效能** | ⚠️   | `workspaces/page.tsx` 用 `useSWR('workspaces')` 散刻 key；無 entity hook；新增 workspace 後其他用户要等 5 分鐘才看到 |
| **資安**     | ✅   | RLS/FK 完整；紅線 A（workspaces NO FORCE）✅；紅線 G ✅                                                              |
| **架構**     | ✅   | L1-L6 全過；ModuleGuard 有                                                                                           |
| **開發品管** | ⚠️   | workspaces 無 e2e；eslint suppress 有                                                                                |
| **清理**     | ⚠️   | workspaces 是核心 module；但無 entity hook 是設計缺陷                                                                |

---

## 升 5/5 具體 actions

### 🟠 Action A（讀取效能 P1 — 補 useWorkspaces entity）

**缺口**：`workspaces/page.tsx` 無 entity hook。

**修法**：

1. 確認 `useWorkspaces` entity hook 是否存在（`src/data/entities/workspaces.ts`）
2. 如果存在 → rewrite `workspaces/page.tsx` 走 `useWorkspaces`
3. 如果不存在 → 建立 `workspaces.ts` entity hook（CRUD: list/get/create/update）

**影響檔**：`src/app/(main)/workspaces/page.tsx`、`src/app/(main)/workspaces/[id]/page.tsx`
**預估工時**：3-4 小時（workspace CRUD 相對單純，但 cross-workspace 安全性要小心）
**預期難度**：🟡 中（workspace 隔離是 ERP 核心邏輯，要小心 RLS）

> 💡 業務語言：當老闆新增一個子公司，所有員工要等 5 分鐘才看到那個子公司——修完後馬上看到。

---

### 🟡 Action B（品管 e2e）

**缺口**：workspaces 無 e2e。

**修法**：
`tests/e2e/workspaces.spec.ts`：

```
建立新 workspace → 確認出現在列表 →
邀請成員加入 workspace → 確認成員名單更新 →
切換 workspace → 確認視角正確（跨租戶滲透防護）
```

**預估工時**：2-3 小時
**預期難度**：🟡 中

---

### 🟡 Action C（清理）

**缺口**：workspaces 是核心 module，清理優先級低。

**修法**：

1. 修完 Action A 後跑 `npm run lint:swr-prune`
2. 確認 `.eslint-suppressions.json` 中 workspaces entries

**預估工時**：30 分鐘
**預期難度**：低

---

## 總工時

**5-7 小時（1 人天）**。

---

## 預期難度

🟡 中。Workspace 邏輯清晰，但跨租戶安全性是核心。

---

## 推薦執行順序

1. **Action A**：立刻做（P1 最關鍵）
2. **Action C**：修完後 prune
3. **Action B**：最後補 e2e

---

_Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push_
