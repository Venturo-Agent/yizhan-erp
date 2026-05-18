# Logan-Workspace — 規格 / 決策紀錄索引

> 這個目錄是設計規格書、圓桌會議紀錄、技術決策的歷史存檔。
> 已完成的規格標 ✅、過時但保留歷史的標 🗄️、仍有效的標 📌。

## 架構 / 規範（長青文件）

| 檔案 | 狀態 | 說明 |
|------|------|------|
| `2026-05-13-建表-SOP.md` | 📌 有效 | 新表必過 6 層 checklist、migration 範本 |
| `2026-05-13-venturo-aierp-概念架構-blueprint.md` | 📌 有效 | 581 行 6 層架構設計大樓圖（檔名含舊名、內容仍適用）|
| `2026-05-13-開發方向圓桌-資安效能規範.md` | 📌 有效 | 圓桌結論、資安優先順序 |

## 歷史紀錄

| 檔案 | 狀態 | 說明 |
|------|------|------|
| `2026-05-12-修復筆記-夜戰計畫.md` | 🗄️ 歷史 | 5/12 夜戰修復紀錄 |
| `2026-05-13-夜戰-session-retro.md` | 🗄️ 歷史 | 夜戰 retro |
| `2026-05-13-會計上線圓桌會議.md` | 🗄️ 歷史 | 會計模組上線討論 |

## 已完成的規格（✅ 已實作）

| 檔案 | 完成日期 | 對應 migration |
|------|---------|---------------|
| `2026-05-16-出納單Phase7-單張多銀行-spec.md` | 2026-05-17 | `20260517600000_disbursement_phase7_item_bank.sql` |
| `2026-05-16-document-system-spec.md` | 2026-05-17 | `20260517500000_create_documents_module.sql` |
| `2026-05-16-travel-invoice-spec.md` | 2026-05-17 | `20260517700000_create_travel_invoice_module.sql` |
| `2026-05-16-worldmove-esim-spec.md` | 2026-05-17 | `20260517800000_create_esim_module.sql` |
| `2026-05-14-出納單品項級重構-spec.md` | 2026-05-15 | Phase 3-6 系列 migration |
| `2026-05-15-出納單完整重構-spec.md` | 2026-05-15 | 同上 |

## 進行中 / 待開發

| 檔案 | 說明 |
|------|------|
| `2026-05-17-旅遊團-訂單-AI需求單-pipeline-spec.md` | 📌 旅遊團狀態機 + 官網 vs AI 兩條 pipeline + 需求單設計 |
| `2026-05-17-官網報名-公開API-訂單狀態機-spec.md` | 📌 官網報名 feature + 公開 API 設計 + AI Hub 待處理介面 |
| `2026-05-14-帳單系統-客戶自助付款-CRM-spec.md` | 待排 |
| `2026-05-14-ai-integration-spec-v2-circle-table.md` | 凍結中（AI 整合） |
| `2026-05-15-bonus-settlement-spec.md` | 待排 |
| `2026-05-15-insurance-grade-annual-reminder-spec.md` | 待排 |
| `2026-05-15-setup-gate-spec.md` | 待排 |
| `2026-05-16-ip-application-form-spec.md` | 待排 |
| `2026-05-16-itinerary-ai-concept-spec.md` | 待排 |
| `2026-05-16-atlas-架構入場券.md` | 📌 atlas 計畫已併入 yizhan-erp、歷史參考 |

## Bug / 修復記錄

| 檔案 | 狀態 |
|------|------|
| `2026-05-12-bug-audit-全站-pattern-matrix.md` | 🗄️ 歷史 |
| `2026-05-12-bug-audit-員工+供應商.md` | 🗄️ 歷史 |
| `2026-05-12-pr1-rls-apply-記錄.md` | 🗄️ 歷史 |
| `2026-05-15-bug-PR-detail-明細不見-handoff.md` | 🗄️ 歷史（已修）|
