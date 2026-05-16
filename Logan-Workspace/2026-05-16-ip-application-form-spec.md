# IP 申請表自動產生 — 規格書
**版本**：v1.0（已實作）  
**日期**：2026-05-16  
**負責人**：William  
**實作狀態**：Phase 1 完成

---

## 一、背景

旅行社啟用「旅行業代收轉付電子收據」服務（藍新科技 travelinvoice.com.tw）前，需向藍新科技申請 IP 白名單，讓我們的 ERP 伺服器能呼叫其 API。

**申請表**：藍新科技 API 手冊附件三「IP 設定表」（頁 72）  
**提交方式**：傳真至 (02)2286-3306 或郵寄  
**重要規則**：IP 設定可由 ERP 廠商（Venturo）代為申請

由於所有租戶的 ERP 部署在同一台伺服器（Vultr `167.179.97.139`），**所有租戶共用同一個對外 IP**，每次新客戶開通時只需填入相同的 IP 即可。

---

## 二、功能說明

### 位置
**漫途後台 → 租戶管理（/workspaces）→ 點進某租戶 → API 整合 tab → 最上方「藍新科技 IP 申請表」**

這功能屬於漫途內部工具（不暴露給旅行社業者自己），由漫途員工在幫客戶開通 travelinvoice 時操作。

### 流程
```
1. 漫途員工進入租戶管理，點進要開通的旅行社
2. 切到「API 整合」tab
3. 看到「藍新科技 IP 申請表」section
4. 點「產生申請表」按鈕
5. 系統從 DB 自動帶入旅行社資料（統一編號、公司名稱、電話、傳真、Email）
6. 產生 PDF 下載到本機
7. 列印 → 蓋章 → 傳真給藍新科技 (02)2286-3306
8. 藍新科技審核後，IP 白名單生效，旅行社可開始使用電子收據 API
```

### 前置條件
- 旅行社 workspace 必須已填寫「統一編號」（`workspaces.tax_id`）
- 若未填，系統顯示警告提示，無法產生

---

## 三、PDF 內容

產生的 PDF 對應藍新科技官方表格，預填以下欄位：

| 欄位 | 資料來源 |
|------|---------|
| 填寫日期 | 今天日期（自動） |
| 統一編號 | `workspaces.tax_id` |
| 會員名稱 | `workspaces.legal_name` 或 `workspaces.name` |
| 申請人 | 當前登入的漫途員工姓名 |
| 聯絡電話 | `workspaces.phone` |
| 傳真號碼 | `workspaces.fax` |
| 電子郵件 | `workspaces.email` |
| 測試環境 API IP #1 | `167.179.97.139`（hardcode） |
| 正式環境 API IP #1 | `167.179.97.139`（hardcode） |
| 申請備註 | 「IP設定可由ERP廠商代為申請，申請人為 VENTURO 漫途旅遊科技 代申請。」|

**需要人工填寫的部分**（留空）：
- 所屬公會（台北市/新北市/桃園市... 等勾選方框）
- 公司大小章（蓋章區域）
- 承辦人簽名

---

## 四、技術實作

### 已建立的檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/pdf/ip-application-form.ts` | PDF 產生函數（jsPDF + 中文字體） |
| `src/app/(main)/workspaces/[id]/_components/ip-form-section.tsx` | UI 元件（含資料撈取 + 按鈕） |
| `src/app/(main)/workspaces/[id]/_components/integrations-tab.tsx` | 已引入 IpFormSection |

### PDF 產生技術

**Library**：jsPDF（已安裝，`"jspdf": "^4.0.0"`）  
**中文字體**：ChironHeiHK（`loadChineseFonts()` from `src/lib/pdf/pdf-fonts.ts`，已有）  
**執行環境**：純前端（browser），動態 import 避免 bundle 太大

```typescript
// 呼叫方式
const { jsPDF } = await import('jspdf')
const { loadChineseFonts } = await import('@/lib/pdf/pdf-fonts')
const { generateIpApplicationForm } = await import('@/lib/pdf/ip-application-form')

const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
await loadChineseFonts(doc)
generateIpApplicationForm(doc, { companyName, taxId, applicantName, phone, fax, email })
doc.save(`藍新科技IP申請表_${companyName}_${date}.pdf`)
```

### 資料撈取
`ip-form-section.tsx` 直接用 supabase client 撈 `workspaces` 表，欄位：
`legal_name, name, tax_id, phone, fax, email`

---

## 五、未來擴展

### 其他平台的 IP 申請
同樣的機制未來可以支援其他需要 IP 白名單的平台，只需要：
1. 在 `src/lib/pdf/` 加一個對應的 PDF 產生函數
2. 在 `ip-form-section.tsx` 加一個新的按鈕

潛在的其他平台（有 API 白名單需求的）：
- Worldmove（eSIM 供應商）—需確認是否有 IP 白名單要求
- 永豐金流（未來金流整合）

### 自動化申請（長遠）
目前是人工傳真，未來若藍新科技提供線上申請管道，可以接 API 自動化申請流程。

---

## 六、相關規格書

| 規格書 | 路徑 |
|--------|------|
| 電子代轉收據（藍新科技）| `Logan-Workspace/2026-05-16-travel-invoice-spec.md` |
| eSIM 整合（Worldmove）| `Logan-Workspace/2026-05-16-worldmove-esim-spec.md` |
| 文件系統 | `Logan-Workspace/2026-05-16-document-system-spec.md` |
| AI 行程規劃 | `Logan-Workspace/2026-05-16-itinerary-ai-concept-spec.md` |
