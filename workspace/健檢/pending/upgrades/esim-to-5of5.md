# esim 升級到 5/5 計劃

## 當前分數：3.5/5（讀取⚠️ 資安✅ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度         | 現狀 | 具體缺口                                                                                                                              |
| ------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **讀取效能** | ⚠️   | esim module 主要在 platform/aitoearn；entity hook 有 `worldmove-orders.ts` + `worldmove-esim-items.ts`；需確認 page.tsx 是否走 entity |
| **資安**     | ✅   | RLS/FK 完整；esim workspace_id guard 有                                                                                               |
| **架構**     | ✅   | L1-L6 全過；addon 不暴露 HR                                                                                                           |
| **開發品管** | ⚠️   | esim 無 e2e；Addon module 有專屬 entity                                                                                               |
| **清理**     | ⚠️   | esim 是 addon；dead code 待確認；但相對獨立、影響小                                                                                   |

---

## 升 5/5 具體 actions

### 🟡 Action A（讀取效能 — 確認 entity 覆蓋）

**缺口**：esim 主要功能在 platform/aitoearn；需確認各 page.tsx 是否走 entity hook。

**修法**：

1. 確認 `platform/aitoearn/page.tsx` 走 `useWorldmoveOrders` + `useWorldmoveEsimItems`
2. 如果沒有 → rewrite 走 entity hook
3. `esim` 相關的其他 page（如果有）

**影響檔**：`src/app/(main)/platform/aitoearn/page.tsx` 及相關子頁
**預估工時**：1-2 小時
**預期難度**：🟡 中

---

### 🟡 Action B（品管 e2e）

**缺口**：esim 無 e2e。

**修法**：
`tests/e2e/esim.spec.ts`：

```
查詢 esim 訂單 → 確認狀態流水 →
操作 esim 啟用/停用 → 確認狀態正確
```

**預估工時**：2 小時
**預期難度**：🟡 中

---

### 🟡 Action C（清理）

**缺口**：esim addon 狀態待確認。

**修法**：

1. knip 確認 esim/worldmove 相關 unused files
2. 確認 `src/data/entities/worldmove-*.ts` 完整覆蓋需要的場景

**預估工時**：1 小時
**預期難度**：低

---

## 總工時

**3-4 小時**。

---

## 預期難度

🟡 中。esim 是 addon，相對獨立簡單。

---

## 推薦執行順序

1. **Action A**：先確認
2. **Action C**：同步清理
3. **Action B**：最後 e2e

---

## 備註

esim 是 addon，不影響核心 ERP。優先級可以比較低。但如果 6/1 前平台一併 launch，這個還是要處理。

---

_Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push_
