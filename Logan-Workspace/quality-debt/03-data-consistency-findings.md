---
title: 品質債深掃 #3 資料一致性 — finding 報告
created: 2026-05-15
owner: Logan
status: in-progress（未修、待 timezone helper 補上後一起做）
---

# 資料一致性 finding（2026-05-15）

## 掃描範圍

工具：
- audit:data-consistency（新建、scripts/audit-data-consistency.ts）

檢查項：
1. 金額顯示散刻 vs formatCurrency SSOT
2. 日期 ISO slice 散刻 vs formatDate SSOT
3. 日期 toLocaleDateString 散刻 vs formatDate / formatDateTaipei SSOT

## Baseline

- 掃描 783 檔
- 金額散刻：0 ✅
- 日期 toISOString().slice(0,10)：8 處
- 日期 toLocaleDateString：6 處

## Finding 詳列

### date_iso_slice（8 處、待 formatDateTaipei helper）

```
src/app/(main)/ai/_components/AiConversationsTab.tsx:94
src/app/(main)/workspaces/[id]/_components/billing-tab.tsx:102
src/lib/ai/context-builder.ts:61
src/lib/facebook/setup-pipeline.ts:166
src/lib/instagram/setup-pipeline.ts:160
src/lib/line/erp-bridge.ts:204
src/lib/line/erp-bridge.ts:205
src/lib/line/setup-pipeline.ts:126
```

多為 `new Date().toISOString().slice(0, 10)` 拿「今天日期 YYYY-MM-DD」字串。

**風險**：直接 swap 為 `formatDate(new Date())` 會改 timezone behavior：
- `toISOString().slice(0, 10)` = UTC 日期
- `formatDate(new Date())` = 本地時區日期
- UTC 11:30pm 5/14、台北已 5/15 → 差一天

**修法**：先建 `formatDateTaipei(date)` SSOT helper、用 `toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })`、再 swap 散刻處。

### date_locale（6 處）

```
src/app/(main)/bot/[lineUserId]/_components/CustomerInfoSidebar.tsx:42  # 顯示用、可改 formatDate
src/app/(main)/calendar/_hooks/useEventOperations.ts:183/337/339/346/357  # 已用 sv-SE + timeZone、合理用法
```

calendar 5 處用 `'sv-SE'` + `timeZone: 'Asia/Taipei'`、行為對、屬合理「ad-hoc 用法」。
**建議**：抽 helper `formatDateTaipei(date)`、讓 calendar 也走 SSOT。

CustomerInfoSidebar 是純顯示、可直接 `formatDate(date)`。

## 待做（不在這次 ship）

1. **建 formatDateTaipei(date) SSOT**（用 `'sv-SE' + Asia/Taipei`、回 `YYYY-MM-DD`）
2. 替換 8 處 toISOString().slice(0, 10) → formatDateTaipei
3. 替換 calendar 5 處 + CustomerInfoSidebar 1 處 → formatDateTaipei / formatDate
4. audit:data-consistency 升級：抓 `'sv-SE'` 但允許走 helper、減 false positive
5. 寫 audit:status-label-consistency（檢查狀態 label 走 STATUS_LABEL_MAP SSOT）
6. 寫 audit:naming-consistency（檢查業務術語：請款 / 出帳 / 出納 一致）

## 不在這次掃的維度
- 介面一致性
- 效能
- 文檔
- 測試
