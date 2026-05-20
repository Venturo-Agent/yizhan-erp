# platform_integrations 升級到 5/5 計劃

## 當前分數：3.5/5（讀取⚠️ 資安✅ 架構✅ 品管✅ 清理⚠️）

---

## 5 維度狀態

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ⚠️ | platform/aitoearn page.tsx 有；實體是 addon（addon module 不強制走 entity，但建議）|
| **資安** | ✅ | RLS/FK 完整；addon workspace_id guard 有 |
| **架構** | ✅ | L1-L6 全過；FeatureGate 有 |
| **開發品管** | ✅ | platform_integrations 專屬 audit 有；lint/type 全過 |
| **清理** | ⚠️ | platform_integrations 是 addon；dead code 待確認；但相對獨立、影響小 |

---

## 升 5/5 具體 actions

### 🟡 Action A（讀取效能 — 確認 entity 覆蓋）

**缺口**：platform/aitoearn 各 page.tsx 是否走 entity hook。

**修法**：
1. 確認 `usePlatformIntegrations` 或等效 entity hook
2. 如果 addon 不需要嚴格走 entity hook（addon 相對簡單），可接受現狀
3. 如果有直接 supabase 散刻 → 改用 entity hook 或 apiMutate

**影響檔**：`src/app/(main)/platform/aitoearn/page.tsx` 及子頁
**預估工時**：1-2 小時
**預期難度**：🟡 中

---

### 🟡 Action B（清理）

**缺口**：addon 狀態待 knip 確認。

**修法**：
1. knip 確認 platform_integrations / aitoearn 相關 unused files
2. 確認無閒置 route

**預估工時**：1 小時
**預期難度**：低

---

## 總工時

**2-3 小時**。Platform integrations 是 addon，相對簡單。

---

## 預期難度

🟡 中低。Addon module 業務邏輯簡單。

---

## 推薦執行順序

1. **Action A**：先確認
2. **Action B**：清理

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*