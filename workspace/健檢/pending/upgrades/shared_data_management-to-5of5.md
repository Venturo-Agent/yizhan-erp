# shared_data_management 升級到 5/5 計劃

## 當前分數：3/5（讀取⚠️ 資安✅ 架構✅ 品管✅ 清理⚠️）

> ⚠️ **重要澄清**：矩陣中「資安⚠️ / 讀取效能⚠️ — SWR key 無 workspace_id」是 **false positive**（Pass 2 複盤已確認）。`ref_banks` / `ref_countries` / `ref_airports` 是**全域 master table**（無 workspace_id）、所有 workspace 看到一模一樣的清單、`getCurrentCacheKey()` 已自動為所有 key 加 user_id prefix。**不需要也不應該加 workspace_id 到這些 cache key**。

---

## 5 維度狀態（修正後）

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ✅ | banks/countries/airports 三頁散刻 useSWR 是設計決策（全域 master table 無 workspace_id 是正確的）；⚠️ 但三頁各自獨立散刻、缺乏統一 entity hook 抽象 |
| **資安** | ✅ | 全域 master table 無跨租戶污染風險（已確認）|
| **架構** | ✅ | L1-L6 全過；FeatureGate 有 |
| **開發品管** | ✅ | shared_data_management 有專屬 audit；lint/type 全過 |
| **清理** | ⚠️ | shared-data 是近唯讀；dead code 待確認 |

---

## 升 5/5 具體 actions

### 🟡 Action A（讀取效能 — 統一 entity hook 抽象）

**缺口**：banks / countries / airports 三頁各自散刻 useSWR、缺統一抽象。

**修法**：
1. 評估是否值得建 `ref-banks.ts` / `ref-countries.ts` / `ref-airports.ts` 三個 lightweight entity hook（近唯讀、無 realtime 需要）
2. 或者保持現狀（近唯讀、全域資料，三頁各自 useSWR 不影響 user 體驗）
3. **結論**：這是低優先級、如果 William 不堅持、可以保留現狀

**預估工時**：2-3 小時（如果要建三個 entity hook）
**預期難度**：🟢 低（近唯讀、簡單）
**注意**：如果建 entity hook、realtime 也許不需要（全域 master table 多 workspace 共用、realtime 必要性低）

---

### 🟡 Action B（清理）

**缺口**：shared-data 是近唯讀，清理優先級低。

**修法**：
1. knip 確認 shared-data 相關 unused files（預期不多）
2. 確認 `src/app/(main)/shared-data/` 下無死路由

**預估工時**：30 分鐘
**預期難度**：低

---

## 總工時

**30 分鐘 - 3 小時**（取決於是否要建 entity hook）。

---

## 預期難度

🟢 低。Shared-data 是最簡單的 module 之一。

---

## 推薦執行順序

1. **Action B**：先 knip 清理
2. **Action A**：William 決策是否要統一 entity hook（如果不需要、現狀已可接受）

---

## 重要備註（給 William）

**矩陣評分需修正**：
- 現矩陣：3/5（讀取⚠️ 資安⚠️ 架構✅ 品管✅ 清理⚠️）
- **真實分數：4/5（讀取✅ 資安✅ 架構✅ 品管✅ 清理⚠️）**
- SWR key workspace_id 是 false positive，Pass 2 複盤已排除

建議 William 更新矩陣此列還原事實。

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*