# documents 升級到 5/5 計劃

## 當前分數：3.5/5（讀取⚠️ 資安✅ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ⚠️ | DocumentsModule 有 2 個 page（page.tsx + [id]/page.tsx）；實體在 library/document-center；`customer-documents.ts` entity 是牛步 |
| **資安** | ✅ | RLS/FK 完整；workspace_id guard 有 |
| **架構** | ✅ | L1-L6 全過；FeatureGate 有 |
| **開發品管** | ⚠️ | documents 無專屬 e2e；`document-types.ts` entity 已建立（Pass 1 補做）|
| **清理** | ⚠️ | `customer-documents.ts` entity 是牛步（Pass 1 supplement 有記錄）；待確認實際狀態 |

---

## 升 5/5 具體 actions

### 🟡 Action A（讀取效能 — 確認 entity hook 覆蓋）

**缺口**：`documents/page.tsx` 和 `documents/[id]/page.tsx` 是否走 entity hook。

**修法**：
1. 確認 `useDocuments` 或等效 entity hook 存在
2. 如果不存在 → 建立 `documents.ts` entity hook
3. `customer-documents.ts` 是另一個 entity（證件上傳），需確認 `src/app/(main)/documents/` 是否有用到

**影響檔**：`src/app/(main)/documents/page.tsx`、`src/app/(main)/documents/[id]/page.tsx`
**預估工時**：2-3 小時（如果 entity 存在、置換很快；如果要新建，4-6 小時）
**預期難度**：🟡 中

---

### 🟡 Action B（品管 e2e）

**缺口**：documents 無專屬 e2e。

**修法**：
`tests/e2e/documents.spec.ts`：
```
上傳 1 個文件 → 確認出現在列表 → 
下載文件 → 刪除文件 → 確認消失
```

**預估工時**：2 小時
**預期難度**：🟡 中

---

### 🟡 Action C（清理）

**缺口**：`customer-documents.ts` entity 是牛步（Pass 1 有記錄）。

**修法**：
1. 確認 `src/data/entities/customer-documents.ts` 實際狀態（是否存在、是否完整）
2. 如果存在且完整 → 從「牛步」移至「已完成」
3. knip 確認 documents 相關 unused files

**預估工時**：1 小時
**預期難度**：低

---

## 總工時

**4-5 小時**。

---

## 預期難度

🟡 中。Documents 是相對簡單的 module。

---

## 推薦執行順序

1. **Action A**：先確認 entity 狀態（診斷，30 分鐘）
2. **Action C**：同步確認 customer-documents 實際狀態
3. **Action B**：最後補 e2e

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*