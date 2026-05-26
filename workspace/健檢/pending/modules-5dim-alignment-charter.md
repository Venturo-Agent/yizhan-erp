# 派工書 — 26 modules × 5 維度對齊矩陣 — 2026-05-20

> 派工人：William（透過 Claude Opus 4.7、老闆角色）
> 承辦：OPENCLAW（agent: main、人格 Max）
> 任務性質：**對每個 active module 逐一對 5 維度健檢、找出對齊缺口**
> 緊急程度：HIGH（6/1 deadline、淬體期）

---

## 為什麼

William 拍板：「重點是現在萃取期、應該把那些東西都完整地清理乾淨、他們的概念要跟你們對齊」。
今天 5 維度健檢（效能/資安/架構/開發品管/清理）框架已完整、但沒有把每個 active module 對著框架掃過一次。
要做一份「module × 維度」的矩陣、每格給判斷、列缺口。

---

## 任務範圍

### 必掃 module（從 src/modules/\_registry.ts ALL_MODULES）

請執行：`grep -E "^  [A-Z][a-zA-Z]+Module," src/modules/_registry.ts` 抓出真實 list。
扣掉已凍的 TravelInvoiceModule。預估 25-27 個 active module。

### 每個 module 給 5 個判決

| 維度         | 判決點                                                                              | ✅ / ⚠️ / ❌ |
| ------------ | ----------------------------------------------------------------------------------- | ------------ |
| 效能（讀取） | 每頁讀資料走 entity hook 嗎？有無散刻 useSWR / 直接 supabase.from?                  |              |
| 資安         | 紅線 0/A/B/C/D/E/F/G 守了哪些？特別查 created_by FK / closed period / SWR cache key |              |
| 架構         | 6 層架構過全嗎？L1-L6 各層對齊狀態                                                  |              |
| 開發品管     | 有測試嗎？lint suppress 數量？type 完整？                                           |              |
| 清理         | unused exports 有嗎？dead code 有嗎？跟 ai_hub 等已廢 module 殘留有嗎？             |              |

判決基準：

- ✅ 完整對齊、無缺口
- ⚠️ 部分對齊、有小缺口（譬如某個 entity 沒做、某條紅線 partial）
- ❌ 沒對齊、有大缺口（譬如整模組繞 entity hook）
- N/A 不適用（譬如 dashboard 沒寫操作、F/G 不適用）

### 對應數據來源

- Pass 1 + 補做 + Pass 2 已盤點 72 entries：直接引用
- 5/19 + 5/20 audit 報告
- .eslint-suppressions.json（lint suppress 數）
- knip 報告（unused files / exports per module）
- audit:rls / audit:writes / audit:realtime 報告

---

## 產出

`workspace/健檢/reports/26-modules-x-5-dimensions-matrix.md`

格式：

```markdown
# 26 Modules × 5 Dimensions 對齊矩陣 — 2026-05-20

## 救護車式總覽

| 維度     | 全 ✅ 模組 | ⚠️ 模組 | ❌ 模組 |
| -------- | ---------- | ------- | ------- |
| 讀取效能 | N          | M       | K       |
| 資安     | ...        |         |         |
| 架構     |            |         |         |
| 品管     |            |         |         |
| 清理     |            |         |         |

## 矩陣（每行一 module、每欄一維度）

| Module     | 讀取效能            | 資安                    | 架構 | 品管         | 清理                    | 總分  |
| ---------- | ------------------- | ----------------------- | ---- | ------------ | ----------------------- | ----- |
| accounting | ❌（7 頁繞 entity） | ⚠️（紅線 D guard 完整） | ✅   | ⚠️（少 e2e） | ⚠️（unused exports 多） | 2.5/5 |
| ai_hub     | ✅                  | ✅                      | ✅   | ⚠️           | ⚠️                      | 4/5   |
| ...        |

## 每 module 細節（章節 1-N）

### 1. accounting

- 讀取效能 ❌：vouchers / accounts / checks / 4 個財報全直接 supabase（Pass 2 #2-#5 P0）
- 資安 ⚠️：紅線 D salary_settlements 補了、但 receipts / payment_requests / disbursement / journal_vouchers 紅線 D guard 待補（5/19 round8）
- 架構 ✅：L1-L6 都過、有 RLS / FK / scope
- 品管 ⚠：opening-balances / period-closing 沒 e2e 測試
- 清理 ⚠：journal-lines entity 沒做、屬半成品（5/19 已標）

### 2. ai_hub

...

## 總體缺口排序（P0/P1/P2）

...

## 不確定 / 需 Claude Opus 複盤的點

...
```

---

## 紅線

- ❌ 不准動 src/ / migrations/
- ❌ 不准 push / apply migration
- ✅ MCP SELECT-only OK（驗 schema 用）
- ✅ commit 完成：`audit(modules-5dim): 26 module × 5 維度矩陣完成 — 2026-05-20`

---

## 品質要求

對齊 Pass 2 紀律：

- 進 entity 檔驗證、不只看名稱
- 跟完整 handler、不只 grep
- 引用對應 audit 報告（Pass 1/Pass 2/5/19 SWR/5-SSOT/紅線 audit）的具體判決

---

## 預估時間

1-2 小時。
完成後 Claude Opus 做 spot check、抽 3 個 module 驗判決正確。

---

## 開工指令

第一個 message 看到「**MATRIX-START**」 = 正式開工。
回我「收到、開始掃 26 modules」就行。
