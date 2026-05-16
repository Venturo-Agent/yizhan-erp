---
title: 品質債深掃 #7 介面一致性 — finding 報告
created: 2026-05-15
owner: Logan
status: 盤點完成、實際遷移留下次
---

# 介面一致性 finding（2026-05-15）

## 掃描範圍

工具：
- audit:ui-consistency（新建、scripts/audit-ui-consistency.ts）

檢查項：
1. Dialog 使用率：走 FormDialog / ConfirmDialog / ManagedDialog SSOT vs 直接 ui/dialog
2. Page Layout 使用率：走 ListPageLayout / ContentPageLayout SSOT vs 自製

## Baseline

### Dialog
- 總計使用 dialog 的 .tsx：80 個
- ✅ 走 SSOT：43（53.8%）
- ⚠ 直接用 ui/dialog：25（含特殊用途 dialog、不全是 antipattern）

### Page Layout
- 總計 page.tsx：64 個
- ✅ 走 SSOT：45（70.3%）
- ⚠ 自製 layout：19（含 dashboard / channels / bot 等特殊 UI 主、合理例外）

## Finding 分類

### Dialog 該遷移 → SSOT（表單型）
這些是「表單填寫 + 確認」dialog、應走 FormDialog：
```
src/app/(main)/finance/payments/_components/AddReceiptDialog.tsx
src/app/(main)/finance/payments/_components/BatchReceiptDialog.tsx
src/app/(main)/finance/payments/_components/RefundReceiptDialog.tsx
src/app/(main)/finance/requests/_components/AddRequestDialog.tsx
src/app/(main)/calendar/_components/AddEventDialog.tsx
src/app/(main)/bot/[lineUserId]/_components/BindCustomerDialog.tsx
```

### Dialog 合理例外（不遷移）
這些是「detail / 顯示型」dialog、底層 Dialog 用 inline 更彈性：
```
src/app/(main)/accounting/vouchers/components/VoucherDetailDialog.tsx (detail)
src/app/(main)/calendar/_components/EventDetailDialog.tsx (detail)
src/app/(main)/calendar/_components/MoreEventsDialog.tsx (列表顯示)
src/app/(main)/calendar/_components/BirthdayListDialog.tsx (列表顯示)
```

### Page 該遷移 → SSOT
這些是標準列表頁、應走 ListPageLayout：
```
src/app/(main)/finance/treasury/disbursement/page.tsx
src/app/(main)/library/attractions/page.tsx
```

### Page 合理例外（不遷移）
特殊 UI 主、非標準 list / content layout：
```
src/app/(main)/dashboard/page.tsx (儀表板、grid 自製)
src/app/(main)/channels/[id]/page.tsx (chat 主、特殊)
src/app/(main)/channels/page.tsx
src/app/(main)/bot/[lineUserId]/page.tsx (對話框)
src/app/(main)/bot/facebook-setup/page.tsx (setup wizard)
src/app/(main)/bot/instagram-setup/page.tsx
src/app/(main)/bot/setup/page.tsx
```

## 未修原因

UI 遷移 25 個 dialog + 19 個 page 工程量大（每個約 30 分鐘 - 1 小時、總計 1-2 天）。
不阻 ship、留下次。

## 下輪建議優先序

### Phase 1：高 ROI 遷移（4 個、半天）
1. AddReceiptDialog → FormDialog
2. AddRequestDialog → FormDialog
3. RefundReceiptDialog → FormDialog
4. BatchReceiptDialog → FormDialog

理由：金流相關、用戶最常用、樣式不一致最有感

### Phase 2：列表頁遷移（2 個、1 hr）
1. finance/treasury/disbursement → ListPageLayout
2. library/attractions → ListPageLayout

### Phase 3：擴展 audit 工具（半天）
- audit:button-consistency（檢查 className="bg-..." inline 按鈕、應走 Button variant）
- audit:form-field-consistency（檢查 input / label / hint 結構）

### Phase 4：UX 一致性深掃（一天）
- 走每個 dialog footer：確認按鈕順序（取消左 / 確認右）、size 一致
- 走每個 list page：表頭 / 列高 / 排序 ICON 一致
