---
title: 介面一致性維度藍圖
created: 2026-05-15
owner: Logan
status: v0.1（active、遷移工作未開始）
---

# 介面一致性藍圖

## 規則

### R1 — Dialog SSOT
- **表單型 dialog**（填寫資料 + 取消 / 確認）→ `<FormDialog>` from `@/components/dialog`
- **確認型 dialog**（是否刪除 / 是否退單 yes/no）→ `<ConfirmDialog>`
- **多層 dialog**（dialog 內開 dialog）→ `<ManagedDialog>` + `level` prop
- **detail / 顯示型** dialog（看明細、無 submit）→ 底層 `<Dialog>` from `@/components/ui/dialog` OK（合理例外）

### R2 — Page Layout SSOT
- **列表頁**（table + filter + 新增）→ `<ListPageLayout>` from `@/components/layout`
- **內容頁**（表單 / 詳情 / setup）→ `<ContentPageLayout>`
- **特殊 UI 主**（dashboard / chat / wizard）→ 可自製、合理例外

### R3 — Button SSOT
- 走 `<Button>` from `@/components/ui/button` + `variant="soft-gold" | "outline" | "ghost" | ...`
- 不准 className="bg-... text-... px-..." 自製按鈕
- 例外：列印 / iframe 內 inline style

### R4 — Footer / 按鈕順序一致
- Dialog footer：取消（左）/ 主操作（右）
- Form：儲存（主、實心）/ 取消（次、outline）
- 確認 dialog：取消（次）/ 確認動作（danger 用紅、其他金）

### R5 — Icon SSOT
- 走 `lucide-react` 全 repo 統一
- 不准 emoji 當 icon（除非用戶要求）
- 不准 Heroicons / Font Awesome 混用

## 工具索引

| 工具 | 檢查項 | 命令 |
|------|--------|------|
| audit:ui-consistency | Dialog / Layout SSOT 使用率 | `npx tsx scripts/audit-ui-consistency.ts` |

## 第一輪深掃成果（2026-05-15）

### 已建
- audit:ui-consistency 工具（盤點 SSOT 使用率）

### 已盤
- Dialog SSOT 覆蓋率：53.8%（43 / 80）
- Layout SSOT 覆蓋率：70.3%（45 / 64）

### 未修
- 25 dialog + 19 page 沒走 SSOT、留下次遷移

## 下輪迭代計畫

### Phase 1：高 ROI 遷移（半天）
- 4 個金流 dialog → FormDialog（AddReceipt / AddRequest / RefundReceipt / BatchReceipt）

### Phase 2：列表頁（1 hr）
- finance/treasury/disbursement → ListPageLayout
- library/attractions → ListPageLayout

### Phase 3：audit 擴展（半天）
- audit:button-consistency
- audit:form-field-consistency

### Phase 4：UX 一致性紙本深掃（一天）
- 每個 dialog footer 對齊 R4
- 每個 list page 表頭對齊
