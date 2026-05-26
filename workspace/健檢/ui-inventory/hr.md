# UI 盤點：`/hr`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/hr/page.tsx`（含 `_components/EmployeeForm.tsx` + `EmployeeForm/{AvatarHeader,BasicInfoSection,SalarySection}.tsx`、`_components/SeveranceCalculatorDialog.tsx`）
> 頁面類型：`列表`（+ 員工大表單 dialog + 資遣試算 dialog）

## 一句話用途
HR 管理員工列表（在職）：新增 / 編輯員工（基本資料 + 薪資設定大表單）、辦理離職、永久刪除、資遣試算。

## Layout 骨架
- **頁面框架**：`ListPageLayout`（icon=Users、statusTabs=HR_ADMIN_TABS.employee）
- **頁首**：`title` 走 i18n、有 statusTab 子導航、`primaryAction`「新增員工」(Plus)
- **分頁**：ListPageLayout 內建（EnhancedTable）、bordered

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「新增員工」 | `primaryAction`（ListPageLayout 內部 Button） | default | — | Plus | btn-primary | ✅ |
| 列表行「編輯」 | `<ActionCell>` | default | h-7 | Edit2 | morandi-secondary | ✅ |
| 列表行「資遣試算」 | `<ActionCell>` | default | h-7 | Calculator | morandi-secondary | ✅ |
| 列表行「辦理離職」 | `<ActionCell>` | danger | h-7 | UserX | status-danger | ✅ |
| 列表行「永久刪除」 | `<ActionCell>` | danger | h-7 | Trash2 | status-danger | ✅ |
| EmployeeForm 底部「取消」 | `<Button>` | soft-gold | default | — | morandi-gold | ✅ |
| EmployeeForm 底部「儲存變更/建立員工」 | `<Button>` | （default 被覆蓋） | default | Save | 🔴 `bg-morandi-gold hover:bg-morandi-gold/90 text-white` hardcode | 🔴 |
| 資遣試算「重設」 | `<Button>` | ghost | sm(h-6) | RefreshCw | — | ⚠️ ghost 非標準操作色軌、待確認 |
| 資遣試算「關閉」 | `<Button>` | outline | default | — | — | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| BasicInfo 中文姓名/職稱/Email/手機/身分證/地址/緊急聯絡 | `<Input>` | text/email/tel | border-input | ✅ |
| Salary 月薪/全勤/津貼/投保薪資/眷屬/勞退% | `<Input type=number>` | number | border-input | ✅ |
| Salary 銀行帳號/戶名 | `<Input>` | text | border-input | ✅ |
| 資遣試算 離職日/到職日 | `<Input type=date>` | date | morandi-border | ✅ |
| 資遣試算 平均工資 | `<Input type=number>` | number | morandi-border | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| BasicInfo 職務（角色） | 原生 `<select>` | 手刻 `border-input rounded-lg focus:border-morandi-gold bg-card` | 🔴 手刻 select、非共用 Select 組件 |
| BasicInfo 分公司（多分公司時） | 原生 `<select>` | 手刻同上 | 🔴 手刻 select |
| Salary 銀行代碼 | `<BankCombobox>` | 共用組件 | ✅ |
| 資遣試算 資遣費制度/特休制度 | 原生 `<select>` | 手刻 `h-9 border-morandi-border bg-morandi-surface` | 🔴 手刻 select |
| BasicInfo/Salary 日期 | `<DatePicker>` | 共用組件 | ✅ |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| Salary 勞保/健保在本公司投保 | 原生 `<input type=checkbox className="w-4 h-4">` | 🔴 手刻 checkbox、非共用 `<Checkbox>` |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 員工列表 `EnhancedTable`（ListPageLayout） | 標準 | 內建 | 內建 | 內建 | ✅ |
| Salary 調薪紀錄（內嵌表單） | 手刻 `<table>` | `bg-morandi-container/50 text-morandi-secondary uppercase` | hover only | `尚無調薪紀錄` colSpan | ⚠️ 手刻表格、非 EnhancedTable（屬唯讀子表、可接受） |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增/編輯員工 | `<Dialog>`+`<DialogContent>` (max-w-6xl h-90vh、透明殼) | 1 | EmployeeForm 自帶底部按鈕 | ✅（用 Dialog level） |
| 資遣試算 | `<FormDialog>`（showFooter=false、自帶 footer） | 2 nested | 自刻「關閉」 outline | ✅ |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 員工列表「狀態」 | `<StatusBadge tone label>` | pill | tone→status token | ✅ |
| AvatarHeader 員工編號/新員工 | 手刻 `inline-flex ... bg-morandi-gold/20 text-morandi-gold rounded-full` | pill | morandi-gold | ⚠️ 手刻 pill（裝飾用、非語意狀態） |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁面 icon | Users | ListPageLayout | morandi |
| 編輯 | Edit2 | size 0.95em (ActionCell) | morandi-secondary |
| 刪除 | Trash2 | size 0.95em | status-danger |
| 辦理離職 | UserX | size 0.95em | status-danger |
| 資遣試算 | Calculator | size 0.95em / h-5 w-5 | morandi |
| 新增 | Plus | — | — |
| 儲存 | Save | w-4 h-4 | — |
| 修改密碼（self mode） | Lock | w-4 h-4 | — |
| 頭像上傳 | Camera | w-7 h-7 | morandi-secondary |
| 資遣重設 | RefreshCw | h-3 w-3 | — |
| Spinner | Spinner | size md | — |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| EmployeeForm 外殼（Character Card） | 手刻 `div bg-card rounded-xl border shadow-sm` | rounded-xl | shadow-sm | ✅（走 token） |
| AvatarHeader 頭像框 | 手刻 `div rounded-xl border-2 border-dashed border-morandi-gold/30` | rounded-xl | — | ✅ |
| 資遣試算 輸入/結果區塊 | 手刻 `rounded-lg border-morandi-border bg-morandi-surface/background` | rounded-lg | — | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 操作成功/失敗提示 | `toast`（sonner） | ✅ |
| 辦理離職/刪除確認 | `<ConfirmDialog>` + `useConfirmDialog` | ✅ |
| 提交 loading | `<Spinner>` | ✅ |
| 資遣試算「無法試算」 | 🔴 手刻 `border-amber-300 bg-amber-50 text-amber-800`（Tailwind 預設 amber） | 🔴 |
| 資遣試算 撈薪資錯誤提示 | 🔴 `text-amber-600`（Tailwind 預設色當警告色） | 🔴 |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **EmployeeForm 主提交按鈕** 用 `className="bg-morandi-gold hover:bg-morandi-gold/90 text-white"` 蓋掉 Button default 金漸層 variant — 全站拍板動作應走 default variant、此處 hardcode 金底白字（`EmployeeForm.tsx` L109-125）
- 🔴 **資遣試算「無法試算」警示框 + 撈薪資錯誤** 用 Tailwind 預設色 `amber-300/50/600/800`、應走 `status-warning` token（`SeveranceCalculatorDialog.tsx` L280, L371）
- 🔴 **BasicInfoSection / SalarySection / 資遣試算 多處原生 `<select>`** 手刻邊框樣式、未走共用 Select 組件（職務 / 分公司 / 資遣費制度 / 特休制度）
- 🔴 **SalarySection 勞健保「在本公司投保」用原生 `<input type=checkbox>`**、未走共用 `<Checkbox>`（同頁 bonus/salary settlement 都用 Checkbox、此處分岔）
- ⚠️ 資遣試算「重設」用 ghost variant、不在 ActionCell/標準操作色軌內（待確認是否需統一）

## 備註
- EmployeeForm 是大表單、mode 分 `hr`/`self`（self 由 settings 個人頁複用、底部按鈕由 ContentPageLayout primaryAction 提供）。
- SalarySection 只在 `mode==='hr' && hrFullEnabled` 顯示（feature gate）。
- BasicInfoSection 必填欄位星號用 `text-morandi-red`（美術色當必填標記、非 status token、全站通病、待彙整判定）。
- 資遣試算為純試算、不寫 DB。
