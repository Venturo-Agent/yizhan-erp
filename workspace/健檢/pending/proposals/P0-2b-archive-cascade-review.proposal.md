# P0-2b 草稿：archive-management cascade invalidate 分析

> **Proposer**: Max（OPENCLAW agent: main）
> **依據**: Pass 2 + P0-2 草稿的「完整 cascade invalidate」分析需求
> **目的**: 不寫 code，寫「整個歸檔刪除流程到底動了哪些 cache、缺哪個 invalidate」的完整分析

---

## 背景

`handleDeleteTour`（library/archive-management/page.tsx 行91-105）是整個歸檔流程中最複雜的一個 handler。它串了 6 個不同的刪除/unlink 動作：

```tsx
const handleDeleteTour = async (tour: ArchivedTour) => {
  const { blockers, hasBlockers } = await checkTourDependencies(tour.id)
  if (hasBlockers) { toast.error(...); return }

  try {
    // A. tour_itinerary_items.delete()      — 行100
    // B. calendar_events.delete()           — 行101
    // C. unlinkTourQuotes()                 — 行102
    // D. unlinkTourItineraries()            — 行103
    // E. deleteTourEmptyOrders()            — 行104
    // F. deleteTourEntity(tour.id)          — 行105
    toast.success(...)
    loadArchivedData()
  } catch (error) { ... }
}
```

P0-2 草稿只處理了 A 和 B（最緊急的兩個）。但如果要彻底搞清楚，還需要確認 C/D/E/F 的 invalidate 是否完整。

---

## 完整 cascade 分析

### A. tour_itinerary_items.delete() — 直接 supabase ❌

**現況**（行100）：
```tsx
await supabase.from('tour_itinerary_items').delete().eq('tour_id', tour.id)
```
無 SWR cache invalidate。

**影響範圍**：
| Cache key | 影响的 page/component |
|---|---|
| `useTourItineraryItems` | ToursPage（行程列表） |
| `useTourItineraryItems` | ProfitTab（獎金結算） |
| `useTourItineraryItems` | TourTabs → ItineraryTab（行程編輯器） |
| `useTourItineraryItems` | TourDetailPage（行程概覽） |

**不缺什麼**：✅ `invalidateTourItineraryItems()` 已存在（tour-itinerary-items.ts 已 export）

**修法**：P0-2 草稿已涵蓋（加 `await invalidateTourItineraryItems()`）

---

### B. calendar_events.delete() — 直接 supabase ❌

**現況**（行101）：
```tsx
await supabase.from('calendar_events').delete().eq('related_tour_id', tour.id)
```
無 SWR cache invalidate。

**影響範圍**：
| Cache key | 影响的 page/component |
|---|---|
| `useCalendarEvents` | calendar/page.tsx（日曆視圖） |

**不缺什麼**：✅ `invalidateCalendarEvents()` 已存在（calendar-events.ts 已 export）

**修法**：P0-2 草稿已涵蓋（加 `await invalidateCalendarEvents()`）

---

### C. unlinkTourQuotes(tour.id) — service ✅

**現況**（tours/_services/tour_dependency.service.ts）：
```tsx
export async function unlinkTourQuotes(tourId: string) {
  await supabase.from('quotes').update({ tour_id: null }).eq('tour_id', tourId)
  // 需要：invalidateQuotes()
}
```
**缺口**：需要確認 `invalidateQuotes()` 有被叫到（不在 archive-management 的 scope，屬於 service 內部責任）

**影響的 cache**：
| Cache key | 影响的 page/component |
|---|---|
| `useQuotes` | ToursPage（報價列表） |

**修法**：若 service 內部有 invalidateQuotes() → ✅ 已解決；若沒有 → 補進 service。

---

### D. unlinkTourItineraries(tour.id) — service ✅

**現況**：
```tsx
export async function unlinkTourItineraries(tourId: string) {
  await supabase.from('itineraries').update({ tour_id: null }).eq('tour_id', tourId)
  // 需要：invalidateItineraries()
}
```

**影響的 cache**：
| Cache key | 影响的 page/component |
|---|---|
| `useItineraries` | ToursPage（行程管理） |
| `useItineraries` | TourTabs → ItineraryTab |

**修法**：同樣需要確認 service 內部有 invalidateItineraries()。

---

### E. deleteTourEmptyOrders(tour.id) — service ✅

**現況**：
```tsx
export async function deleteTourEmptyOrders(tourId: string) {
  const { data } = await supabase.from('orders').select('id, tour_id').eq('tour_id', tourId)
  // 刪除空 orders（沒有成員、沒有款項）
  for (const order of data) { await supabase.from('orders').delete().eq('id', order.id) }
  // 需要：invalidateOrders()
}
```

**影響的 cache**：
| Cache key | 影响的 page/component |
|---|---|
| `useOrders` | orders/page.tsx |
| `useOrders` | ToursPage（獎金結算） |

**修法**：同樣需要確認 service 內部有 invalidateOrders()。

---

### F. deleteTourEntity(tour.id) — entity hook ✅

**現況**（`deleteTourEntity` 來自 `tours.ts` entity hook）：
```tsx
export const deleteTour = toursEntity.delete  // 內部有 invalidateTours()
```

**影響的 cache**：
| Cache key | 影响的 page/component |
|---|---|
| `useTours` | tours/page.tsx |
| `useTours` | ToursPage（團體列表） |
| `useTours` | dashboard（儀表板） |

**狀態**：✅ 已解決（entity delete 自帶 invalidate）

---

## 完整 invalidate 清單（現在 vs 應該）

### 完整流程（現在 vs 加了 P0-2 後）

| 步驟 | 動作 | 現況 | P0-2 修法後 |
|---|---|---|---|
| A | `tour_itinerary_items.delete()` | ❌ 無 invalidate | ✅ 加 `await invalidateTourItineraryItems()` |
| B | `calendar_events.delete()` | ❌ 無 invalidate | ✅ 加 `await invalidateCalendarEvents()` |
| C | `unlinkTourQuotes()` | ⚠️ 待確認 service 內部 | ⚠️ 待 William 確認 |
| D | `unlinkTourItineraries()` | ⚠️ 待確認 service 內部 | ⚠️ 待 William 確認 |
| E | `deleteTourEmptyOrders()` | ⚠️ 待確認 service 內部 | ⚠️ 待 William 確認 |
| F | `deleteTourEntity()` | ✅ 有 invalidateTours() | ✅ 不需要改 |

---

## 待確認的缺口（不是這次 P0-2 草稿的範圍）

以下需要 William 確認後補进修法清單（P1-7 之類）：

###缺口 1：C/D/E 的 service 層 invalidate

需要確認 `unlinkTourQuotes` / `unlinkTourItineraries` / `deleteTourEmptyOrders` 三個 service 函式內部有沒有正確 call 對應的 invalidate。

**驗證方式**：
```bash
grep -n "invalidate" src/app/\(main\)/tours/_services/tour_dependency.service.ts
```

**如果缺**：這是 service 層的問題，修法跟 P0-2 一樣，在每個 service function 末尾加對應的 invalidate。

### 缺口 2：ToursPage / ProfitTab 的 cache key 一致性

當 A 被修好後，`invalidateTourItineraryItems()` 會叫醒 ToursPage 的 SWR cache。
但需要確認：
- ToursPage 的 useTourItineraryItems key 格式
- archive-management 叫的 invalidateTourItineraryItems() 是否能正確匹配

（理論上 `createEntityHook` 的 invalidate 是吃 workspace_id 當 key 一部分，應該能匹配。需 regression test。）

---

## 風險評估

| 項目 | 值 |
|---|---|
| **這次 P0-2 修法的風險** | 低（只加兩個 await invalidate）|
| **未修的 C/D/E 缺口風險** | 中（取決於 service 內部有沒有正確 invalidate）|
| **如果 C/D/E 没 invalidate** | ToursPage / ProfitTab 的報價/行程/訂單列表可能 stale |
| **回滾** | git revert 1 commit → 回到行100-101 原樣 |

---

## 建議 William 做的下一步

1. **立即**：apply P0-2 草稿（A + B 的兩個 await invalidate）
2. **第一天 regression test**：歸檔一個 tour → 檢查日曆視圖是否乾淨、行程編輯器是否乾淨
3. **第二天**：確認 tour_dependency.service.ts 的 C/D/E 是否有對應 invalidate（grep 確認）
4. **根據 grep 結果**：決定是否要補 P1-7（service 層 invalidate）

---

*Draft by Max — 等待 William review + approve*
*⚠️ 注意：此草稿不實際改任何 src/ code*