# travel_invoice 升級到 5/5 計劃

## 當前分數：N/A（已凍住）

---

> ⚠️ **特殊狀態**：travel_invoice module 已於 5/20 宣布凍住（Phase 2 再處理）。
> 以下分數是「如果凍住接著做的假設分數」而非當前狀態。

---

## 如果解凍（假設）

| 維度 | 假設分數 | 具體缺口 |
|---|---|---|
| **讀取效能** | ❌ | DB 100% + Entity 100% + Module 100%，但 **UI 0%**（7 個 route 全無 page.tsx）；API 0% |
| **資安** | ✅ | RLS/FK 完整；Phase 1 migration 已做 |
| **架構** | ✅ | L1-L6 全過；Phase 1 已建立足夠 infrastructure |
| **開發品管** | ⚠️ | 無 UI 無法測試；eslint suppress 有 |
| **清理** | ⚠️ | travel_invoice 是半成品；但已凍住、不緊急 |

**接續建設（假設解凍）**：需要補 7 個 route 的 page.tsx（UI 層）+ API routes（0%）。

---

## 升 5/5 具體 actions（如果解凍）

### 🔴 Action A（UI 層 — 7 個 route 全補）

**缺口**：travel-invoice/ 7 個 route 全無 page.tsx。

**修法**：
參考 `workspace/健檢/pending/travel-invoice-investigation.md` 的 Phase 2 建設清單：
1. `travel-invoice/page.tsx` — 列表頁
2. `travel-invoice/[id]/page.tsx` — 明細頁
3. `travel-invoice/new/page.tsx` — 新建頁
4. `travel-invoice/settings/page.tsx` — 設定頁
5. `travel-invoice/voids/page.tsx` — 作廢頁
6. `travel-invoice/reports/page.tsx` — 報表頁
7. `travel-invoice/allowances/page.tsx` — 補貼頁

**預估工時**：取決於 Option A（補完）或 Option B（凍住）。Option A 估 2-3 人天。

---

### 🟠 Action B（API routes）

**缺口**：Phase 1 沒做任何 API route（0%）。

**修法**：
- `/api/travel-invoices/` — CRUD API
- `/api/travel-invoice-configs/` — 設定 API
- `/api/travel-invoice-voids/` — 作廢 API
- `/api/travel-allowances/` — 補貼 API

**預估工時**：1-2 人天

---

## 總工時（如果解凍）

**3-5 人天**（補完 Phase 1 基礎上的 UI + API）。

---

## 當前建議

**繼續凍住**。理由：
- 6/1 前全力衝電子發票不可能（37 人天）
- Option B（凍住、8 月再從凍住基礎建設）是最優解
- 詳見 `workspace/健檢/pending/travel-invoice-investigation.md`

---

## 矩陣分數備註

此 module 不應计入「5/5 達標率」計算（因為已凍住）。

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*