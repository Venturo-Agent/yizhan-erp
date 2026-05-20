# archive-management 升級到 5/5 計劃

## 當前分數：2.5/5（讀取❌ 資安⚠️ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ❌ | 行100-101 直接 `supabase.from('calendar_events').delete()` + `tour_itinerary_items.delete()` 後無任何 `invalidateCalendarEvents()` / `invalidateTourItineraryItems()` 呼叫；歸檔操作後馬上打開 calendar 頁面會看到已被刪的行程 |
| **資安** | ⚠️ | archive_delete 走 service、無 RLS 問題；但紅線 F（invalidate）缺口等於使用者看到 stale UI |
| **架構** | ✅ | L1 ModuleGuard 有；L2 Capability 有；L6 apiMutate 有 |
| **開發品管** | ⚠️ | 無專屬 e2e；eslint suppress 有 3 個 entry |
| **清理** | ⚠️ | archive-management 是 library 子頁（不獨立 module）；但 Pass 2 有討論價值 |

---

## 升 5/5 具體 actions

### 🔴 Action A（讀取效能 P0，+4 行搞定）

**缺口**：行100-101 的 delete 後完全沒有 SWR invalidate。

**修法**：在 delete 完成後加 2 行：
```ts
// 行 102 之後
void invalidateCalendarEvents()
void invalidateTourItineraryItems()
```

**影響檔**：`src/app/(main)/library/archive-management/page.tsx`
**預估工時**：15 分鐘
**預期難度**：🟢 低（只加 2 行，風險極低）

> 💡 業務語言：歸檔一筆行程，馬上打開「行程管理」頁面該行程還在（使用者體驗錯誤）。修完立刻正確。

---

### 🟠 Action B（級聯 cascade 確認）

**缺口**：歸檔刪 tour_itinerary_items + calendar_events，但刪除鏈上游的 tour_itinerary_items.service.ts 有無對 tour 做 invalidate？需 William 確認。

**修法**：已寫 `workspace/健檢/pending/proposals/P0-2b-archive-cascade-review.proposal.md`（純分析、無 code），確認：
- Step C: `tour_itinerary_items.service.ts` → `invalidateTours()` ✅ 已有
- Step D/E: 服務層 cascade → 需 grep 確認
- Step F: `tour_itinerary_items` entity delete 有 `invalidateTours()` ✅ 已解決

**預估工時**：30 分鐘（grep 確認）
**預期難度**：🟢 低

---

### 🟡 Action C（品管 e2e）

**缺口**：無 archive-management 專屬 e2e。

**修法**：在 `tests/e2e/library-archive-management.spec.ts`：
```
建立 1 筆 tour → 建立關聯行程 → 歸檔 → 
確認行程從 calendar 頁面消失 → 
確認 tour itinerary 頁面仍顯示歸檔行程（不刪 tour 本體）
```

**預估工時**：2 小時
**預期難度**：🟡 中

---

### 🟡 Action D（清理）

**缺口**：.eslint-suppressions.json 中 3 個 archive-management entry（修完 Action A 後可清除 2 個）。

**修法**：
1. 修完 Action A 後跑 `npm run lint:swr-prune` 自動清理 suppression
2. 確認 `src/app/(main)/library/archive-management/page.tsx` 無其他直接 supabase 散刻

**預估工時**：30 分鐘
**預期難度**：低

---

## 總工時

**3-4 小時（半天以內）**。Action A 是最快、最值得的 P0 修復。

---

## 預期難度

🟢 低（+4 行搞定，P0 中最簡單的一個）。

---

## 推薦執行順序

1. **Action A**：立刻做（+4 行，15 分鐘，馬上修補 user 體感）
2. **Action B**：同時計劃（純確認、不動 code）
3. **Action D**：修完 Action A 後跑 prune
4. **Action C**：最後補 e2e（相對不急）

---

## Pass 3 草稿

已寫 `workspace/健檢/pending/proposals/P0-2-archive-management-invalidate.proposal.md`。

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*