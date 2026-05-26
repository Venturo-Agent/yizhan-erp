# P0-2 草稿：archive-management 加 invalidate

> **Proposer**: Max（OPENCLAW agent: main）
> **依據**: Pass 2 判决 — `library/archive-management/page.tsx` 🔴 P0
> **目的**: 歸檔刪除日曆事件 / 行程項目日後，calendar/page.tsx SWR cache 不 stale

---

## 現況（Pass 2 確認的問題）

### 完整 delete chain（行91-105）

```tsx
// library/archive-management/page.tsx 行91-105
const handleDeleteTour = async (tour: ArchivedTour) => {
  const { blockers, hasBlockers } = await checkTourDependencies(tour.id)
  if (hasBlockers) { toast.error(...); return }

  try {
    // ❌ 紅線 F：直接 delete 無 invalidate
    await supabase.from('tour_itinerary_items').delete().eq('tour_id', tour.id)   // 行100
    await supabase.from('calendar_events').delete().eq('related_tour_id', tour.id) // 行101

    // ✓ 這幾個有 invalidate（deleteTourEntity 內部有 invalidateTours）
    await unlinkTourQuotes(tour.id)
    await unlinkTourItineraries(tour.id)
    await deleteTourEmptyOrders(tour.id)
    await deleteTourEntity(tour.id)
    toast.success(...)
    loadArchivedData()
  } catch (error) { ... }
}
```

### 為什麼是 P0

| 動作                            | 影响的 SWR cache                                | 結果                     |
| ------------------------------- | ----------------------------------------------- | ------------------------ |
| `tour_itinerary_items.delete()` | `useTourItineraryItems`（ToursPage/行程編輯器） | 行程編輯器仍顯示已刪項目 |
| `calendar_events.delete()`      | `useCalendarEvents`（calendar/page.tsx）        | 日曆視圖仍顯示已刪事件   |

其他四個（unlinkQuotes / unlinkItineraries / deleteEmptyOrders / deleteTourEntity）有走 entity 內部 invalidate，所以只有兩個是問題。

---

## 修法（Option A：短期止血）

> **原則**：只補 invalidate，不動架構。草稿不是實際 apply 的 code。

### Diff（行100-101 改法）

```diff
  try {
    // 清理關聯資料
    await supabase.from('tour_itinerary_items').delete().eq('tour_id', tour.id)
+   // P0-2: invalidate tour itinerary items cache → 行程編輯器/ProfitTab 不 stale
+   import { invalidateTourItineraryItems } from '@/data'
+   await invalidateTourItineraryItems()

    await supabase.from('calendar_events').delete().eq('related_tour_id', tour.id)
+   // P0-2: invalidate calendar events cache → calendar/page.tsx 日曆視圖不 stale
+   import { invalidateCalendarEvents } from '@/data'
+   await invalidateCalendarEvents()

    await unlinkTourQuotes(tour.id)
    await unlinkTourItineraries(tour.id)
    await deleteTourEmptyOrders(tour.id)
    await deleteTourEntity(tour.id)  // ← 這個有內部 invalidateTours()
```

---

## 驗證哪些 invalidate 已經存在

```bash
# 確認 calendar-events.ts 有 export invalidateCalendarEvents
grep "export const invalidateCalendarEvents" src/data/entities/calendar-events.ts
# ✅ 已存在（Pass 2 讀過）

# 確認 tour-itinerary-items.ts 有 export invalidateTourItineraryItems
grep "export const invalidateTourItineraryItems" src/data/entities/tour-itinerary-items.ts
# ✅ 已存在（Pass 2 讀過）
```

---

## 影響行數 / 風險 / 回滾

| 項目             | 值                                                                                |
| ---------------- | --------------------------------------------------------------------------------- |
| **實際改動行數** | +4 行（2 個 import + 2 個 await）                                                 |
| **風險**         | 低（止血而已，不動 business logic）                                               |
| **回滾**         | git revert 1 commit、即回歸原狀                                                   |
| **測試驗證**     | 1. 歸檔一個 tour 2. 去 calendar/page.tsx 確認事件消失 3. 去行程編輯器確認項目消失 |
| **依賴**         | 無（invalidate helpers 已存在）                                                   |

---

## Option B（中期、徹底）

改用 `useCalendarEvents` 的 delete action + `useTourItineraryItems` 的 delete action，
不走直接 `supabase.from().delete()`。好處是 invalidate 全自動，缺點是這次草稿不涵蓋。

Option B 的缺點：archive-management 的刪除是一次刪一批（`.eq('tour_id', tour.id)`），
entity delete 多數是單筆刪除。需要看 entity delete 是否支持 batch delete。
（不在這次草稿範圍，標為 TODO）

---

## 附：完整 cascade invalidate 分析（P0-2b 參考）

`handleDeleteTour` 整串下來，invalidate 狀況：

| 動作                            | method          | invalidate？                   | 影响的 page                        |
| ------------------------------- | --------------- | ------------------------------ | ---------------------------------- |
| `tour_itinerary_items.delete()` | direct supabase | ❌ 無                          | ToursPage / 行程編輯器 / ProfitTab |
| `calendar_events.delete()`      | direct supabase | ❌ 無                          | calendar/page.tsx / 日曆視圖       |
| `unlinkTourQuotes()`            | service         | ✅（有 invalidateQuotes）      | quotes list                        |
| `unlinkTourItineraries()`       | service         | ✅（有 invalidateItineraries） | itinerary list                     |
| `deleteTourEmptyOrders()`       | service         | ✅（有 invalidateOrders）      | orders list                        |
| `deleteTourEntity(tour.id)`     | entity hook     | ✅（有 invalidateTours）       | tours list / dashboard             |

**結論**：只有前兩項缺 invalidate。這次 Option A 只補這兩個，Option B 未來再做。

---

_Draft by Max — 等待 William review + approve_
