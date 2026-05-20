# office 升級到 5/5 計劃

## 當前分數：3.5/5（讀取⚠️ 資安✅ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ⚠️ | OfficeModule `routes: []、tabs: []`（空殼）；`src/app/(main)/office/` 目錄不存在；`workspace-seals.ts` entity 有但 UI 從未實作 |
| **資安** | ✅ | RLS/FK 完整；office workspace_id guard 有 |
| **架構** | ✅ | L1-L6 全過；但 module 是空殘 |
| **開發品管** | ⚠️ | office 無 e2e（功能從未實作）|
| **清理** | ⚠️ | office 是半成品（比 travel_invoice 更空：連 DB/Entity 都沒做）|

---

## 升 5/5 具體 actions

### 🟠 Action A（讀取效能 — UI 實作 or 凍住）

**缺口**：`office` module 是空殼（routes: []、tabs: []）。

**修法（兩個選項）**：

**選項 A（補完）**：建立 office 功能（估 1-2 人天）
- 建立 `src/app/(main)/office/page.tsx`（也許是 /library 或 /workspace-seals 之類的入口）
- 建立對應 page.tsx 使用 `workspace-seals.ts` entity
- 補完整功能

**選項 B（凍住）**：從 `src/modules/_registry.ts` 移除 OfficeModule（1 小時）
- 理由：6/1 前來不及做，果斷凍住節省精力
- `workspace-seals.ts` entity 保留（未來可能用到）

**預估工時**：
- 選項 A：1-2 人天
- 選項 B：1 小時

**預期難度**：🟡 中（選項 B 簡單、選項 A 取決於複雜度）

---

## 總工時

取決於 William 決策（補完 vs 凍住）。

---

## 預期難度

🟡 中。

---

## 給 William 的問題

**office module 是什麼用途？**
- 如果是「公司章」管理（workspace-seals）→ 可以接受凍住或延後
- 如果是核心 ERP 功能 → 需要儘快實作

---

## 備註

office 是 Phase 1 另一個半成品（比 travel_invoice 更空）。建議 William 確認後果斷凍住或補完。

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*