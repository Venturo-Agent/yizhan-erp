# UI 盤點：`/settings/company`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/settings/company/page.tsx`
> 主要 _components：`CompanyInfoCard.tsx`、`OrganizationSection.tsx` → `BranchesSection.tsx`、`BonusPolicySection.tsx`、`tour-features-section.tsx`、`ImageUploadField.tsx`、`SettingsTabs.tsx`（headerActions）
> 頁面類型：設定（多 section 表單 + CRUD）
> ⚠️ `OrganizationSection` / `BranchesSection` 同檔也被 `hr/organization` 複用、改動時注意雙頁影響。

## 一句話用途
讓有 `settings.manage.company` capability 的員工維護公司基本資料 / 聯絡 / Logo / 印章 / 結帳設定 / 集團出帳 / 獎金計算順序 / 旅行屬性 / 分公司 CRUD。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title=公司設定、headerActions=`<SettingsTabs/>`、primaryAction=儲存）
- **頁首**：`ContentPageLayout` 標準標題列；右側 headerActions 放 `SettingsTabs`（目前只有「公司設定」一個 tab）；primaryAction 為「儲存」按鈕（走 layout 標準 primaryAction、icon=Save）。
- **分頁**：無資料分頁；section 用 `Card` + `border-t` 分區。
- 權限/狀態守門：`!can(SETTINGS_MANAGE_COMPANY)` → AlertCircle + Card 文案；無 workspace → 同；loading → `<ModuleLoading/>`。

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「儲存」 | `ContentPageLayout.primaryAction` | (layout 內部) | — | Save | btn-primary | ✅ |
| SettingsTabs「公司設定」tab | 手刻 `<button>` | — | px-4 py-1.5 | — | morandi-primary / -secondary + 底線 morandi-gold | 🟡 tab 樣式手刻（非 Button、屬導覽 tab、可接受但非 token 化組件） |
| BranchesSection 頁內「新增分公司」 | `<Button>` | soft-gold | sm | Building2 | — | ✅ |
| BranchesSection 表單「取消」 | `<Button>` | ghost | sm | — | — | ✅ |
| BranchesSection 表單「儲存」 | `<Button>` | soft-gold | sm | — | — | ✅ |
| BranchesSection 卡片「編輯」 | 手刻 `<button>` + `ACTION_BUTTON_BASE` + `ACTION_BUTTON_DEFAULT_TONE` | — | h-7 (BASE) | Edit2 | morandi-secondary | 🟡 直接套 ACTION_BUTTON_BASE 而非 `<ActionCell>`（黃金標準允許「ActionCell 不支援的特殊互動」直接引用常數、此處只是 card-row 編輯、非特殊互動、建議用 ActionCell） |
| BranchesSection 卡片「刪除」 | 手刻 `<button>` + `ACTION_BUTTON_BASE` | — | h-7 (BASE) | Trash2 | status-danger | 🟡 同上、刪除色走 status-danger ✅、但結構仍是手刻 button 非 ActionCell |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 公司名稱（唯讀） | `<Input>` disabled | text | bg-morandi-container/30 | ✅ |
| 統編 / 法定名稱 / 副標 / 地址 / 電話 / 傳真 / Email / 網址 / 描述 | `<Input>` / `<Textarea>` | text/email | 標準 input token | ✅ |
| 銀行分行 / 帳號 / 戶名 | `<Input>` | text | 標準 | ✅ |
| 統一收付每筆固定金額 | `<Input>` | number | 標準 | ✅ |
| 結帳稅率（%） | `<Input>` onBlur auto-save | number | 標準 | ✅ |
| 分公司代號 / 名稱 / 統編 | `<Input>` | text | 標準（code/統編加 font-mono） | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 銀行名稱 | `<BankCombobox>`（共用組件） | 標準 combobox | ✅ |
| 預設出帳日期（週日~週六） | 原生 `<select>` | `h-10 px-3 rounded-md border border-input bg-background` | 🟡 原生 select 非共用 `<Select>` 組件（樣式手刻、與 ui/select 不一致） |
| 統一收付差額入賬帳戶 | 原生 `<select>` | 同上手刻 | 🟡 同上、原生 select |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 集團出帳 toggle | `<Switch>`（ui/switch） | ✅ |
| 旅行屬性功能 toggle（tour-features-section） | `<Switch>` | ✅（依該檔、屬複用） |
| 匯款手續費模式（平均 / 統一）radio | 原生 `<input type=radio>` + `accent-morandi-gold` | 🟡 原生 radio 卡片、非共用組件（auto-save） |
| 獎金計算順序 radio（BonusPolicySection） | 原生 `<input type=radio>` + `accent-[var(--morandi-gold)]` | 🟡 原生 radio 卡片、非共用組件 |
| 分公司「設為預設」checkbox | 原生 `<input type=checkbox>` `h-4 w-4` | 🟡 原生 checkbox、非共用 `<Checkbox>` |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 分公司列表（非 table、是 `Card` 堆疊） | 每筆一張 Card p-4 | 無表頭 | 無 | 「尚無分公司」文字 | 🟡 用 Card 卡片堆而非 `EnhancedTable`（資料量小、可接受） |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 分公司新增/編輯表單 | 非 dialog、inline 展開區塊（`bg-morandi-container/10` 區塊） | — | ghost 取消 + soft-gold 儲存 | 🟡 inline 表單而非 FormDialog（設計選擇、按鈕順序對齊規則 R52） |
| 刪除分公司確認 | `confirm()`（`@/lib/ui/alert-dialog`） | — | — | ✅ |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 分公司「主要」標記 | inline span + Star icon | text | morandi-gold | ✅（品牌色標記、非語意狀態） |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 公司資料卡 header | Building2 | h-5 w-5 | morandi-gold |
| 結帳設定 header | Landmark | h-5 w-5 | morandi-gold |
| 公司印章 header | Stamp | h-4 w-4 | morandi-gold |
| 組織管理 header | Network | h-5 w-5 | morandi-gold |
| 獎金政策 header | HandCoins | h-5 w-5 | morandi-gold |
| 分公司卡 | Building2 | h-5 w-5 | morandi-gold |
| 編輯分公司 | Edit2 | `0.95em`（BASE 慣例） | morandi-secondary | ✅ Edit2 對齊 |
| 刪除分公司 | Trash2 | `0.95em` | status-danger | ✅ Trash2 對齊 |
| 無權限/無 workspace | AlertCircle | h-12 w-12 | morandi-red | 🟡 用 morandi-red（美術色）做警示、非 status-danger |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 公司資料卡 / 集團出帳 / 獎金政策 / 分公司 | `<Card>` | rounded-xl | shadow-sm | ✅ |
| 組織管理說明卡 | `<Card>` bg-morandi-container/10 | rounded-xl | shadow-sm | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 儲存/錯誤 toast | `sonner` toast | ✅ |
| 載入 | `<ModuleLoading/>` | ✅ |
| 分公司載入 | inline「載入中...」文字 | 🟡 非 skeleton/ModuleLoading |
| 刪除確認 | `confirm()` alert-dialog | ✅ |

## 🔴 不統一 / 異常標記（重點）
- 🔴 **多處原生 `<select>` 手刻**（預設出帳日、差額入賬帳戶）：用 `h-10 px-3 rounded-md border border-input` 手刻、未走共用 `ui/select`，樣式與全站 Select 不一致。
- 🔴 **原生 radio / checkbox 散刻**（匯款手續費模式、獎金計算順序、分公司預設）：未走 `ui/checkbox`，雖用 `accent-morandi-gold` 仍非 token 化組件。
- 🟡 **BranchesSection 卡片編輯/刪除按鈕直接套 `ACTION_BUTTON_BASE` 而非 `<ActionCell>`**：黃金標準允許特殊互動直接引用常數，但此處為一般 card-row 編輯/刪除，建議改用 ActionCell 統一。
- 🟡 **無權限/無 workspace 警示用 `text-morandi-red`（美術色）**而非 `text-status-danger`（語意色），違反顏色軌分岔紅線。
- 🟡 **SettingsTabs 是手刻 `<button>` tab**（非 Button 組件），目前只剩 1 個 tab、視覺為自刻底線高亮。

## 備註
- 此頁多個 section 採「auto-save」（Logo 位置滑桿 commit、匯款模式 radio、稅率 onBlur、獎金順序 radio），與主 primaryAction「儲存」共存，互動模型混合（部分欄位即時存、部分按儲存才存），對使用者一致性需留意。
- `OrganizationSection` / `BranchesSection` 為 `hr/organization` 共用組件，UI 改動雙頁同步生效。
- 公司印章 grid 宣告 4 欄但只放 3 個欄位（大章/小章/發票章），缺合約章入口（schema 有 `contract_seal_image_url` 但 UI 未放）。
