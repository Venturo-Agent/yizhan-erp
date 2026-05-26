# UI 盤點：`/finance/treasury/disbursement`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/finance/treasury/disbursement/page.tsx`（re-export）→ `_disbursement/_components/DisbursementPage.tsx`（含 CreateDisbursementWizardDialog、DisbursementPrintDialog、GroupedDisbursementItemsTable、DisbursementRequestsTable、DisbursementPaymentStats）
> 頁面類型：`列表`（出納單管理）

## 一句話用途
出納單管理列表：全部出納單一覽（未付款在上、已付款在下），點 pending 列開編輯精靈、點 paid 列開列印預覽；列操作含預覽/編輯/出帳/刪除。

## Layout 骨架
- **頁面框架**：`ListPageLayout`（icon=Wallet）
- **頁首**：標題 `t('disbursementManagement')`、primaryAction「新增出納單」（canManage 才顯示）、搜尋出納單號（client searchable）
- **分頁**：無 serverPagination；`useDisbursementOrders({ all: true })` 全撈 + 前端固定排序

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「新增出納單」 | ListPageLayout primaryAction | （內建） | - | Plus | btn-primary | ✅ |
| 列：預覽 | `<Button>` + `cn(ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE)` | ghost | sm | 無 | morandi-secondary→金底 | 🔴 套 ACTION_BUTTON_BASE 但用 `<Button>` 包、未走 `<ActionCell>` 組件 |
| 列：編輯 | 同上 | ghost | sm | 無 | morandi-secondary | 🔴 同上 |
| 列：出帳（確認付款） | `<Button>` + `cn(ACTION_BUTTON_BASE, 手寫綠)` | ghost | sm | 無 | 🔴 text-morandi-green hover:bg-morandi-green/10 | 🔴 出帳鈕手寫 morandi-green 當「成功」語意色（該走 status-success）；且未走 ActionCell |
| 列：刪除 | `<Button>` + `cn(ACTION_BUTTON_BASE, status-danger)` | ghost | sm | 無 | text-status-danger hover:bg-status-danger-bg | 🟡 顏色走 status-danger ✅、但用 Button+ACTION_BUTTON_BASE 拼、未走 ActionCell |

> 註：操作鈕全為純文字（無圖示），label 走 i18n（disbursementActionPreview/Edit/Pay/Delete）。

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 對齊標準? |
|---|---|---|---|
| 列表搜尋（出納單號） | ListPageLayout 內建 search（searchFields=['order_number']） | text | ✅ |
| 精靈內金額/日期/備註 | CreateDisbursementWizardDialog（Input/DatePicker） | - | 待確認（未深讀） |

### 🔽 下拉 / 選擇
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 精靈內銀行/請款單選擇 | CreateDisbursementWizardDialog | 待確認（未深讀） |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| ListPageLayout + EnhancedTable | 預設 | 預設 | 預設 | ListPageLayout 內建 | ✅ |
| GroupedDisbursementItemsTable（精靈/預覽內，按銀行分組） | 手刻分組 table | - | - | - | 🟡 手刻分組表（含展開全部/收合全部 ghost Button） |

欄位：出納單號 / 出帳日期 / 請款單數 / 銀行帳戶（玉山 3 筆 / 台新 2 筆摘要）/ 總金額（font-semibold text-morandi-gold）/ 狀態。

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增/編輯出納單精靈 | `CreateDisbursementWizardDialog` | - | soft-gold（取消/上一步）+ default（下一步/完成）+ Check/X icon | 🟡 footer 用 soft-gold + Check/X，大致對齊（未深讀全部） |
| 列印預覽 | `DisbursementPrintDialog` | - | 列印鈕 soft-gold + Printer icon | ✅ |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 列：狀態欄 | `StatusBadge type="disbursement"` | badge | 走 status-tone-map（內部 morandi-green/red） | ✅（共用組件） |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 新增 | Plus | primaryAction 內建 | - |
| 頁面 icon | Wallet | （ListPageLayout icon） | - |
| 列操作（預覽/編輯/出帳/刪除） | 無圖示（純文字 label） | - | - |
| 精靈 footer | Check / X | （Button 內 svg size-4） | inherit |
| 列印 | Printer | - | inherit |
| 分組表展開/收合 | （文字 Button h-7） | - | - |

### 🃏 卡片 / 容器
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| DisbursementPaymentStats（付款統計） | （Card/StatCard 類） | 待確認（未深讀） |

### 🔔 回饋 Toast / 確認框 / 載入
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 確認出帳/刪除 | `confirm`（type='warning'） | ✅ |
| 成功/失敗 | `alert`（@/lib/ui/alert-dialog） | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **列操作欄整組未走 `<ActionCell>`**：改用 `<Button variant="ghost" size="sm">` 手動套 `cn(ACTION_BUTTON_BASE, ...)`。雖共用了 ACTION_BUTTON_BASE 骨架常數（視覺對齊 OK），但繞過 ActionCell 組件本身 — 跟 `/finance/payments` 用 ActionCell 的黃金標準分岔。
- 🔴 **「出帳」鈕手寫 `text-morandi-green hover:text-morandi-green hover:bg-morandi-green/10`**（DisbursementPage L364）— 確認/成功語意該走 `status-success`（ActionCell 的 `variant: 'success'` 已內建 status-success token，這裡卻手寫 morandi-green 重造）。
- 🟡 列操作鈕無圖示、純文字 label；payments 列表用 icon+label 的 ActionCell — 兩個財務列表操作欄風格不一致。
- 🟡 刪除鈕顏色走 status-danger（✅ 對），但仍是 Button+ACTION_BUTTON_BASE 拼裝而非 ActionCell。
- ✅ 列印預覽、確認/刪除回饋、StatusBadge、總金額金色強調都對齊；精靈 footer 大致走 soft-gold + default。

## 備註
- 此頁 .hardcoded-color-baseline / GroupedDisbursementItemsTable 在當前 git status 中為已修改狀態（本次 read-only 不動）。
- CreateDisbursementWizardDialog 內部表單欄位未逐行深讀，精靈 footer 與 DisbursementPaymentStats 標「待確認」。
- 出納單管理刻意不全用 ActionCell 的原因：操作鈕依 status（pending/paid）+ canManage 條件顯示，且為純文字 label；但若要對齊黃金標準，ActionCell 支援 actions 陣列條件組裝，技術上可改。
