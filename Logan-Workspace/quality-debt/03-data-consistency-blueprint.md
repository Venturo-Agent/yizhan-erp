---
title: 資料一致性維度藍圖
created: 2026-05-15
owner: Logan
status: v0.1（active、待 formatDateTaipei helper 補上）
---

# 資料一致性藍圖

## 規則

### R1 — 金額顯示走 formatCurrency SSOT
- ✅ 已建 `src/lib/utils/format-currency.ts`
- 不准散刻 `${prefix}${amount.toLocaleString()}`
- 例外：列印模板（Print*）可用 inline 處理、不強制走 SSOT

### R2 — 日期顯示走 formatDate / formatDateTaipei SSOT
- `formatDate(date)`：本地時區、YYYY-MM-DD
- `formatDateTaipei(date)`：強制台北時區、YYYY-MM-DD（**待建**）
- 不准散刻 `toISOString().slice(0, 10)` / `toLocaleDateString('zh-TW', ...)` / `toLocaleDateString('sv-SE', ...)`
- 例外：列印 / API 內部 timestamp（不顯示給人看）

### R3 — 狀態 label 走 STATUS_LABEL_MAP SSOT
- 狀態色 / 中文 label / icon 全走 `src/lib/design/status-tone-map.ts STATUS_LABEL_MAP`
- 不准 component 內 hardcode `status === 'pending' ? '待付款' : ...`

### R4 — 業務術語命名一致
- **請款**：對外要錢（向客戶 / 向公司）
- **付款**：實際出錢（公司付出去）
- **收款**：收進來
- **出納**：實際匯款 / 領現的會計動作
- **出帳**：公司資產減少的會計事件
- **結算**：把多筆 pending 收尾、產一張正式單

不准混用！譬如「請款」跟「付款」不同、UI label / DB 欄位 / API endpoint 命名都要對齊。

## 工具索引

| 工具 | 檢查項 | 命令 |
|------|--------|------|
| audit:data-consistency | 金額 / 日期散刻 | `npx tsx scripts/audit-data-consistency.ts` |

## 第一輪深掃成果（2026-05-15）

### 已建
- audit:data-consistency 工具（檢查金額 / 日期散刻）

### 已盤（未修）
- 14 處 finding：日期散刻 14、金額 0

### 未修原因
- 直接 swap toISOString().slice → formatDate 會改 timezone behavior、有風險
- 需先建 formatDateTaipei helper 才安全 swap

## 下輪迭代計畫

### 短期（一天）
1. 建 `formatDateTaipei(date)` 進 `src/lib/utils/format-date.ts`
2. 替換 8 處 toISOString().slice + 6 處 toLocaleDateString → formatDateTaipei
3. audit 升級：允許走 formatDateTaipei、不再 flag

### 中期（一週）
1. 寫 audit:status-label-consistency（檢查 hardcoded status 中文 label）
2. 寫 audit:naming-consistency（檢查業務術語：請款 / 出帳 / 出納 一致）
3. 把 STATUS_LABEL_MAP 規範寫進 R3 specific 範例

### 長期
- 半夜 loop 自動 fix 散刻 → SSOT（小違規）
