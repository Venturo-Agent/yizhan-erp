# database 升級到 5/5 計劃

## 當前分數：3.5/5（讀取⚠️ 資安✅ 架構✅ 品管✅ 清理⚠️）

---

## 5 維度狀態

| 維度         | 現狀 | 具體缺口                                                                                               |
| ------------ | ---- | ------------------------------------------------------------------------------------------------------ |
| **讀取效能** | ⚠️   | database module 是後台 schema 管理（無主要 page.tsx）；schema 管理不走 entity hook（合理，是內部工具） |
| **資安**     | ✅   | RLS/FK 完整；workspace scoped                                                                          |
| **架構**     | ✅   | L1-L6 全過；schema drift 有 audit:rls CI                                                               |
| **開發品管** | ✅   | database 專屬 audit 有（audit:rls）；lint/type 全過                                                    |
| **清理**     | ⚠️   | database 是內部工具，dead code 待確認；但非 user-facing、不緊急                                        |

---

## 升 5/5 具體 actions

### 🟡 Action A（讀取效能 — 確認 schema 管理無效能問題）

**缺口**：database module 等於 `/library` route（不是 `/database`），是 schema drift 檢查工具而非業務功能。

**修法**：

- 這是認知問題，不是 code 問題。database module 對應 `src/app/(main)/library/` 路由
- schema 管理不走 SWR cache（直接 RLS + PostgREST），不需要 entity hook
- **不需要任何 action**（✅ 現狀已合理）

**預期難度**：N/A（不需要 action）

---

### 🟡 Action B（清理）

**缺口**：database 相關 unused files 需 knip 確認。

**修法**：

1. 跑 `npx knip` 確認 database 相關 unused files
2. 確認 `src/app/(main)/library/` 下無 dead code
3. database schema drift 本身是功能（不要誤刪）

**預估工時**：1 小時
**預期難度**：低

---

## 總工時

**1 小時**（主要是確認，不需要真的改 code）。

---

## 預期難度

🟢 低。database 不是 user-facing，清理優先級低。

---

## 推薦執行順序

1. **Action A**：認知確認（5 分鐘）
2. **Action B**：找時間 knip 一下

---

## 備註

database module 實際上不是給一般使用者用的，是給工程師看的 schema drift 工具。評分起點應比其他 module 低（內部工具不需 5/5）。如果 William 希望有「完整覆蓋」的感覺，至少讓 Action B 跑一下 knip。

---

_Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push_
