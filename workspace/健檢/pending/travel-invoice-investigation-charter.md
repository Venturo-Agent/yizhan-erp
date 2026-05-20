# 派工書 — travel_invoice 半成品深度盤點 — 2026-05-20

> 派工人：William（透過 Claude Opus 4.7 中介、老闆角色）
> 承辦：OPENCLAW（agent: main、人格 Max）
> 任務性質：**深度盤點半成品狀態、報告補完成本 + 業務必要性**
> 緊急程度：HIGH（6/1 第一付費客戶、剩 11 天）

---

## 為什麼 urgent

William 拍板：第一付費客戶從 8/13 提前到 **6/1（剩 11 天）**。
travel_invoice module 是「7 個 route 註冊但無 page.tsx」的半成品。
要做決定：補完上線 / 暫凍移除 / 部分補完。
**沒清楚現況就決定不了**。

---

## 任務

### Part 1：技術現況盤點

掃完整 codebase 跟 DB、列出 travel_invoice 已經做了多少：

1. **DB 層**（已備份檢查、應該都有）：
   - `travel_invoices` table — 欄位 / RLS / index 完整嗎？
   - `travel_invoice_voids` — 同上
   - `travel_allowances` — 同上
   - `workspace_travel_invoice_configs` — 同上
   - 看 supabase/migrations 找 `travel_invoice` 相關 migration、列日期 + 內容
   - 看 production DB（用 mcp__supabase__list_tables verbose）確認欄位

2. **Entity hook 層**：
   - `src/data/entities/travel-invoices.ts` 內容、產出哪些 hooks
   - 對應其他 entity 是否完整

3. **Module 註冊**：
   - `src/modules/travel_invoice.ts` 內容、7 個 route 名字
   - `src/lib/permissions/capabilities.ts` 對應 capability
   - `src/lib/permissions/features.ts` 對應 feature flag

4. **API route 層**：
   - `src/app/api/travel-invoices/` 或類似目錄存在嗎？
   - 有沒有 route.ts 已實作

5. **UI 層**：
   - `src/app/(main)/travel-invoice/` 目錄不存在（已知）
   - 但 `src/components/` 或 `_components/` 有沒有 travel-invoice 相關 partial 元件

### Part 2：業務必要性評估

讀 `docs/`、`CLAUDE.md`、`workspace/_meta/architecture/` 找線索：
- travel_invoice 是「旅行業專用發票」是什麼？跟普通發票（invoices）差異？
- 第一付費客戶（哪家、什麼樣的旅行社）需要這功能嗎？
- 6/1 上線「沒這功能會怎樣」？

### Part 3：補完成本估算

如果要 11 天內補完上線：
- 估算需要的 API route 數量 + 寫法
- 估算需要的 UI page 數量 + 寫法
- 估算總工時（人天）
- 評估風險（架構 / 資安 / 效能）

### Part 4：給 William 的三選一建議

| 選項 | 動作 | 6/1 上線結果 |
|---|---|---|
| **A. 全補完** | 11 天內把 7 個 page + API 補完 | 第一客戶可開發票 |
| **B. 凍結** | 從 modules/ 移除註冊、保留 DB + entity | 第一客戶手寫發票或不開 |
| **C. 部分補完** | 只做最小可用（譬如只開立、不退單） | 第一客戶基本能用 |

每個選項列：成本 / 風險 / 業務影響。**用業務語言**、William 不看 code。

---

## 產出

`workspace/健檢/pending/travel-invoice-investigation.md`

格式：救護車式總覽 + Part 1-4 段落 + 三選一建議表 + 推薦選項。

---

## 紅線

- ❌ 不准動 src/ / supabase/migrations/ 真實 code
- ❌ 不准 push
- ❌ 不准 apply migration
- ✅ 可用 mcp__supabase__list_tables 查 production schema 確認
- ✅ 完成 commit：`audit(travel-invoice): 半成品盤點完成 — 2026-05-20`

---

## 預估時間

30-60 分鐘。
Pass 4 charter、不是 Pass 3 的延伸。
完成由 Claude Opus 做 spot check 再給 William 拍板。

---

## 開工指令

第一個 message 看到「**TI-INVESTIGATE-START**」 = 正式開工。
回我「收到、開始盤點 travel_invoice」就行。
