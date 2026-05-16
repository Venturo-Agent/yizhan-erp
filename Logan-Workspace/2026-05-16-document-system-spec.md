# 文件系統模組 — 規格書
**版本**：v0.1  
**日期**：2026-05-16  
**負責人**：William  
**討論紀錄**：William × Logan，2026-05-16

---

## 一、背景與動機

### 業界痛點
台灣中小型旅行社普遍使用 Microsoft Office 進行文件作業（合約、報價單、行程表、飯店往來文件），但使用者多為盜版授權。這帶來：
- 法律風險（智慧財產權）
- 無法在外出時即時處理文件
- 蓋章需回辦公室，流程不便

### Venturo 的解法
在 ERP 側邊欄提供一個**文件中心**，讓業者：
1. 在瀏覽器內合法編輯 Word / Excel / PPT（取代盜版 Office）
2. 對 PDF 進行蓋章、合併、分割等操作
3. 未來加入 AI 輔助排版、文字潤飾

這不只是一個功能，而是一個**合規 + 效率**的強烈業務誘因，也是 Venturo 的差異化賣點之一。

---

## 二、功能範圍

### 2.1 核心功能（Phase 1）

#### PDF 操作
- **蓋章**：上傳或使用已儲存的公司章（大小章、發票章）圖片，拖曳到 PDF 指定位置，下載帶章 PDF
- **合併**：將多個 PDF 合併成一份
- **分割**：將一份多頁 PDF 拆分成多份
- **下載**：下載處理後的 PDF

#### 文件儲存
- 上傳文件（Word / Excel / PPT / PDF）到 Supabase Storage
- 每個 workspace 各自的文件目錄
- 文件列表管理（名稱、類型、上傳日期）

### 2.2 進階功能（Phase 2）

#### 瀏覽器內文件編輯（OnlyOffice）
- 開啟 Word（.docx）、Excel（.xlsx）、PPT（.pptx）直接在瀏覽器編輯
- 儲存後同步回 Supabase Storage
- 格式完全相容 Microsoft Office（開啟不走樣）
- 使用者不需安裝任何軟體

#### 轉換功能
- Word / Excel → PDF（伺服器端轉換，讓 PDF 可進行蓋章操作）

### 2.3 未來功能（Phase 3）

#### AI 輔助
- **文字潤飾**：選取段落 → AI 改寫（正式語氣、白話語氣等）
- **排版美化**：AI 根據內容建議排版結構
- **範本生成**：根據訂單資料 AI 自動生成行程表、報價單文件

---

## 三、技術架構

### 3.1 PDF 操作

**Library**：`pdf-lib`（純 JavaScript，不依賴 Node.js canvas）

```
用戶點「蓋章」→ 選章的位置 → pdf-lib 嵌入圖片 → 下載
用戶點「合併」→ 選多個 PDF → pdf-lib merge → 下載
```

pdf-lib 特性：
- 純前端可跑（不需 API call）
- 支援 PNG 透明背景章
- 不需 server 資源
- 已有成熟 TypeScript 支援

**安裝**：
```bash
npm install pdf-lib
```

### 3.2 章印管理

**DB 表**：`workspace_seals`

```sql
CREATE TABLE workspace_seals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  name         text NOT NULL,          -- 例：公司大章、發票章
  image_url    text NOT NULL,          -- Supabase Storage URL（PNG 透明背景）
  is_active    boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);
```

業者在設定頁上傳章的圖片，系統儲存到 Supabase Storage。

### 3.3 文件儲存

**Supabase Storage Bucket**：`workspace-documents`

目錄結構：
```
workspace-documents/
  {workspace_id}/
    {year}/{month}/
      {original_filename}
```

RLS：只有同 workspace 的員工有對應 capability 才能讀寫。

**DB 表**：`workspace_documents`

```sql
CREATE TABLE workspace_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  name         text NOT NULL,
  file_type    text NOT NULL,    -- 'pdf' | 'docx' | 'xlsx' | 'pptx'
  storage_path text NOT NULL,
  size_bytes   bigint,
  created_by   uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now(),
  deleted_at   timestamptz        -- 軟刪除
);
```

### 3.4 OnlyOffice（Phase 2）

**什麼是 OnlyOffice**：
- 開源文件編輯套件（AGPL 授權）
- 相容 Microsoft Office 格式（.docx / .xlsx / .pptx）
- 提供瀏覽器嵌入式編輯器（iframe / JavaScript API）
- 社群版本免費自架

**部署架構**：
```
OnlyOffice Document Server（Docker container）
  → 部署在 Vultr（167.179.97.139）
  → 與 venturo-aierp 同機或獨立 container

venturo-aierp（Next.js）
  → 嵌入 OnlyOffice Editor iframe
  → 透過 Document Server 的 JavaScript API 通訊
  → 文件讀寫走 Supabase Storage（需要 OnlyOffice 能讀到的公開 URL）
```

**OnlyOffice Callback 流程**：
```
用戶在 OnlyOffice 編輯 → 點儲存
→ OnlyOffice 伺服器把新版文件 POST 到 callback URL（我們的 API）
→ 我們的 API 收到 → 上傳到 Supabase Storage → 更新 DB
```

**系統需求**：
- RAM：建議 4GB+
- CPU：2 核+
- Vultr 目前的機器（視資源是否足夠、不夠則開新 container）

### 3.5 AI 輔助（Phase 3）

- Provider：Claude API（`VENTURO_AI_BRAIN_KEY` 已有）
- 作法：選取文字 → 右鍵選「AI 潤飾」→ call Claude API → 回傳 → 使用者確認替換
- 與現有景點 AI 潤飾（`/api/shared-data/attractions/ai-polish`）走同一套 provider 架構

---

## 四、Module 定義

```typescript
// src/modules/documents.ts
export const DocumentsModule = defineModule({
  code: 'documents',
  name: '文件中心',
  description: '上傳、編輯、蓋章、合併文件（PDF / Word / Excel / PPT）',
  category: 'basic',   // 基本功能，不需額外付費
  routes: ['/documents'],
  exposedToHr: true,
  tabs: [],
})
```

---

## 五、Capability 設計

| Capability Code | 說明 |
|-----------------|------|
| `documents.read` | 查看文件列表、下載文件 |
| `documents.write` | 上傳、編輯、刪除文件 |
| `documents.manage_seals` | 管理公司章（上傳/刪除） |

---

## 六、UI 規劃

### 6.1 側邊欄入口
```
文件中心
├── 我的文件（列表）
└── 設定
    └── 章印管理
```

### 6.2 文件列表頁（/documents）
- 類似 Google Drive 的列表視圖
- 篩選：全部 / PDF / Word / Excel / PPT
- 點擊：
  - PDF → 進入 PDF 操作頁（蓋章/合併/下載）
  - Word/Excel/PPT → 進入 OnlyOffice 編輯器（Phase 2）
- 操作欄：上傳、刪除、重新命名

### 6.3 PDF 操作頁（/documents/[id]/stamp）
```
左側：PDF 預覽（pdf.js viewer）
右側：
  - 選章：下拉選已上傳的章
  - 位置：拖曳到預覽上的位置
  - 確認蓋章 → 下載
```

### 6.4 章印管理頁（/settings/seals）
- 上傳章的 PNG 圖片（需透明背景）
- 命名（大章、小章、發票章）
- 停用/刪除

---

## 七、分期實作計畫

### Phase 1（建議優先）
- [ ] DB migration：`workspace_documents`、`workspace_seals`
- [ ] Supabase Storage bucket 設定（`workspace-documents`）
- [ ] 文件上傳 / 列表 API 和 UI
- [ ] PDF 蓋章功能（`pdf-lib` + 拖曳定位）
- [ ] PDF 合併 / 分割
- [ ] 章印管理設定頁
- [ ] Module 定義 + 5 SSOT 對齊（capability / features / seed）

**安裝依賴**：
```bash
npm install pdf-lib
```

### Phase 2
- [ ] OnlyOffice Document Server 架設（Docker on Vultr）
- [ ] OnlyOffice 嵌入編輯器
- [ ] OnlyOffice Callback API（儲存回 Supabase Storage）
- [ ] Word → PDF 轉換（via OnlyOffice conversion API）

### Phase 3
- [ ] AI 文字選取 → 潤飾
- [ ] 根據訂單資料 AI 生成行程表 / 報價單 Word 文件

---

## 八、安全性考量

| 風險 | 處理方式 |
|------|---------|
| 跨租戶文件洩露 | Supabase Storage RLS + 路徑帶 workspace_id |
| OnlyOffice callback 偽造 | Callback URL 加 secret token 驗證 |
| 惡意 PDF 注入 | 只允許 PDF/Office 格式上傳，server-side MIME 驗證 |
| 章印圖片洩露 | Storage bucket 設為 private，只透過 signed URL 取用 |

---

## 九、尚待決定

| 問題 | 現況 |
|------|------|
| OnlyOffice 架在同機還是獨立機器 | 視 Vultr 資源決定 |
| 文件版本控制（多版本留存） | Phase 2 後考慮 |
| 文件分享給客人（外部連結） | 未定，視業者需求 |
| PDF viewer 用 pdf.js 還是 iframe 嵌入 | 待評估 |

---

## 十、相關規格書

| 規格書 | 路徑 |
|--------|------|
| AI 行程規劃引擎 | `Logan-Workspace/2026-05-16-itinerary-ai-concept-spec.md` |
| 電子代轉收據（藍新科技）| `Logan-Workspace/2026-05-16-travel-invoice-spec.md` |
| eSIM 整合（Worldmove）| `Logan-Workspace/2026-05-16-worldmove-esim-spec.md` |
