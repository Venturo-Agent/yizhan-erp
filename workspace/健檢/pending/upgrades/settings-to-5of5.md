# settings 升級到 5/5 計劃

## 當前分數：3/5（讀取❌ 資安✅ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ❌ | `settings/company/page.tsx` 行168 直接 `supabase.from('workspaces').update()`；寫完後其他打開公司設定的使用者看到舊資料（stale UI）|
| **資安** | ✅ | RLS/FK 完整；紅線 C（admin client per-request）✅ |
| **架構** | ✅ | L1 ModuleGuard 有；L6 apiMutate 有 |
| **開發品管** | ⚠️ | settings/company 無 e2e；eslint suppress 有 |
| **清理** | ⚠️ | settings/company 是半成品（direct supabase 寫入）|

---

## 升 5/5 具體 actions

### 🔴 Action A（讀取效能 P0，+4 行）

**缺口**：`settings/company/page.tsx` 行168 直接 `supabase.from('workspaces').update()`，寫完不 invalidates SWR cache。

**修法**：
1. `useWorkspaces` entity hook 是否存在？檢查 `src/data/entities/workspaces.ts`
2. 如果存在 → rewrite 行168 改用 `useWorkspaces` 的 update function + invalidate
3. 如果不存在 → 建立 `useWorkspaces` entity hook（Pass 3 有草稿）

**影響檔**：`src/app/(main)/settings/company/page.tsx`
**預估工時**：1-2 小時（如果 useWorkspaces 存在，置換很快；如果要新建，4-6 小時）
**預期難度**：🟡 中（workspace CRUD 相對單純）

> 💡 業務語言：老闆改了公司抬頭，所有員工立馬看到新抬頭——不是等 5 分鐘 cache 過期。

---

### 🟡 Action B（品管 e2e）

**缺口**：settings/company 無 e2e。

**修法**：
`tests/e2e/settings-company.spec.ts`：
```
打開公司設定 → 修改公司抬頭 → 儲存 →
確認其他分頁（新開 page）看到新資料 →
確認不同瀏覽器（或 incognito）看到新資料
```

**預估工時**：2 小時
**預期難度**：🟡 中

---

### 🟡 Action C（清理）

**缺口**：settings/company direct supabase 是半成品。

**修法**：
1. 修完 Action A 後跑 `npm run lint:swr-prune` 清理 suppression
2. 確認 settings/personal 和 settings/page.tsx 無類似問題

**預估工時**：30 分鐘
**預期難度**：低

---

## 總工時

**3-4 小時（半天以內）**。Action A 關鍵。

---

## 預期難度

🟡 中低。settings/company 業務邏輯簡單（就一個公司資料 CRUD）。

---

## 推薦執行順序

1. **Action A**：立刻做（最關鍵）
2. **Action C**：修完後立刻 prune
3. **Action B**：最後補 e2e

---

## 備註

settings 是少數「讀取效能唯一缺口」的 module（資安/架構都✅）。修完馬上升分到 4.5/5，性價比極高。

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*