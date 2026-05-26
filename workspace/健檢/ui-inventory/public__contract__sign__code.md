# UI 盤點：`/public/contract/sign/[code]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/public/contract/sign/[code]/page.tsx`（server 取資料）→ `ContractSignPage.tsx`（client 狀態機）→ 4 個 step 組件：`ContractPreviewStep` / `ContractFillInfoStep` / `ContractSignStep` / `ContractSuccessStep`
> 頁面類型：公開頁（對客電子簽約、多步驟流程）

## 一句話用途
讓客戶用分享連結（合約 code）線上閱讀旅遊定型化契約、補填聯絡資訊、電子簽名、提交。4 步驟：預覽 → 填資料 → 簽名 → 完成。

## Layout 骨架
- **頁面框架**：自刻多步驟 — `page.tsx`（server、admin client per-request 查 contract/tour/workspace/members/itinerary）→ `ContractSignPage`（client 狀態機、`step` 切 4 個全螢幕畫面）
- **頁首**：每步自畫頂部列（合約名 + 團名 + 編號 + 公司名 / 或「← 返回合約」+ 標題）、無全站麵包屑
- **分頁**：N/A
- **client**：是；用 SignaturePad 簽名、滾動到底才解鎖簽署（readingProgress 進度條）
- **mobile-first**：`max-w-md` 卡片、響應式簽名板寬度（`min(350, innerWidth-96)`）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 預覽「我已閱讀，進行電子簽署」 | `<Button>` | default | lg | FileSignature | `--btn-primary` 金漸層 | ✅ 走共用 Button |
| 預覽/已簽「列印合約」 | `<Button>` | soft-gold | lg | Printer | morandi-gold soft | ✅ |
| 填資料「下一步：電子簽名」 | `<Button>` | default | lg w-full | FileSignature | 金漸層 | ✅ |
| 簽名「確認提交」 | `<Button>` | default | flex-1 | Check | 金漸層 | ✅ |
| 簽名「重新簽名」 | `<Button>` | soft-gold | flex-1 | — | soft-gold | ✅ |
| 完成「回到首頁」 | `<Button>` | default | lg | — | 金漸層 | ✅ |
| 完成「查看合約」 | `<Button>` | soft-gold | lg | — | soft-gold | ✅ |
| 填資料/簽名「← 返回合約」 | 手刻 `<button>` | — | 文字鈕 | — | `text-morandi-muted hover:text-morandi-primary` | 🟡 返回連結、文字鈕、可接受 |

✅ **主要按鈕全走共用 `<Button>`（default / soft-gold）** — 本頁是 6 個根層頁中按鈕對齊最好的（認證頁全手刻、此頁用 Button）。

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 聯絡電話（必填） | 手刻 `<input>` | tel | `border-morandi-muted` + focus `ring-morandi-gold` | 🔴 手刻、未走共用 Input |
| 住居所地址（必填） | 手刻 `<input>` | text | 同上 | 🔴 同上 |
| 身分證字號（選填） | 手刻 `<input>` | text | 同上 | 🔴 同上 |

3 個 input 用一致的手刻 className（`w-full px-3 py-2 border-morandi-muted rounded-lg focus:ring-2 focus:ring-morandi-gold`）、彼此一致但未抽共用 Input 組件。

### 🔽 下拉 / ☑️ 勾選
N/A

### 📋 表格 / 列表 Table
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 附件一：團員名單表 | 手刻 `<table>` | `border-b-2 border-morandi-muted` | 無 | 條件渲染（>1 人才出） | 🟡 合約附件靜態表、非 EnhancedTable（合理、列印導向） |
| 附件二：簡易行程表 | 手刻 `<table>` + inline style | gold 表頭白字 | 斑馬（`var(--card)` / `var(--morandi-container)`） | 條件渲染 | 🟡 跟報價單同款 inline style + `MORANDI_COLORS` 常數、列印用 |

### 🪟 對話框
N/A（用 step 切全螢幕、非 Dialog）

### 🏷️ 狀態標籤 Badge
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 預覽頂部「已簽署」 | 手刻 `<span>` | rounded-full | `bg-morandi-green/15 text-morandi-green` | 🔴 「已簽署」狀態用美術色 morandi-green、非 status-success |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 合約圖示 / 進行簽署 | FileSignature | `w-5 h-5` | `text-status-warning`（未簽）/ 按鈕內繼承 |
| 已簽勾 / 提交勾 / 完成勾 | Check | `w-5 h-5` / `w-4 h-4` / `w-10 h-10` | `text-morandi-green` |
| 載入 | Loader2（animate-spin） | `w-8 h-8` | `text-morandi-gold` |
| 滾動提示 | ChevronDown（animate-bounce） | `w-4 h-4` | `text-morandi-muted` |
| 列印 | Printer | `w-5 h-5` | 按鈕內繼承 |

全 lucide、尺寸用 `w-x h-x` Tailwind class（跟認證頁 `size={n}`、landing `size="x em"` 又是第三種寫法）。

### 🃏 卡片 / 容器
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 合約內容滾動區 | 手刻 div | `rounded-lg` | `shadow-lg` | ✅ token |
| 填資料/簽名卡 | 手刻 div | `rounded-xl` | `shadow-lg` | ✅ token |
| 完成卡 | 手刻 div | `rounded-xl` | `shadow-lg` | ✅ token |
| 頂部資訊列 | 手刻 div（sticky） | — | `shadow-sm` | ✅ |
| 閱讀進度條 | 手刻 div（`bg-morandi-gold` 寬度動態） | — | — | ✅ |

### 🔔 回饋 / 空狀態 / 載入
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 範本載入中 | Loader2 spin（morandi-gold） | 🟡 自刻、非 ModuleLoading（公開頁可接受） |
| 範本載入錯誤 | 置中文字 `text-morandi-red` | 🔴 錯誤用美術色 morandi-red |
| 各步錯誤橫幅 | 手刻 div `bg-morandi-red/10 text-morandi-red` | 🔴 同上、非 status-danger |
| 完成態 | ContractSuccessStep 全頁（綠勾 + 編號 + 時間） | 🔴 成功底色 `from-morandi-green/10` 用美術色 |
| 簽名提交中 | Loader2 spin + 「簽署中...」 | ✅ 合理 |

## 🔴 不統一 / 異常標記（重點）
- **錯誤/成功色全走美術色軌（morandi-red / morandi-green）**：合約載入錯誤、各步錯誤橫幅、「已簽署」badge、完成頁綠勾與綠漸層底 — 全用 `morandi-red` / `morandi-green`（美術色）而非 `status-danger` / `status-success`（語意色）。這是本頁最一致的偏離（4 處錯誤 + 多處成功）。對照同頁「未簽」狀態用的是 `status-warning`（語意色）→ **同頁語意色與美術色混用、不一致**。
- **input 手刻、未走共用 Input**：填資料 3 個 input 自刻 className（彼此一致、但全站沒走共用組件）。
- **圖示尺寸第三種寫法**：本頁用 `w-5 h-5` Tailwind class；認證頁用 `size={16}`；landing 用 `size="1em"` — 全站圖示尺寸三套寫法並存。
- **必填星號用 morandi-red**：`<span className="text-morandi-red">*</span>`、語意上必填標記用 danger 色合理、但同樣是美術色軌。
- 行程表附件用 inline style + `MORANDI_COLORS` JS 常數（為了列印一致）、屬合理特例。

## 備註
- **按鈕對齊最佳**：6 個根層頁裡、唯一主要按鈕全走共用 `<Button>`（default 金漸層 + soft-gold）的頁、CTA 視覺與全站一致 → 認證頁應參考此頁改用 `<Button>`。
- 文案中央化做得好：每個 step 組件頂部都有 `PAGE_LABELS` 常數集中文案。
- 安全：合約 HTML 經 DOMPurify sanitize（FORBID script/iframe/form）+ 使用者輸入先 escape、防 XSS；admin client per-request（紅線 C 註解明確）。
- 定性：**對客電子簽約頁、獨立 CIS（mobile-first 多步驟）**；結構/按鈕已相當對齊全站、主要待拍板項是「錯誤/成功色從美術色軌（morandi-red/green）改走語意色軌（status-danger/success）」。
