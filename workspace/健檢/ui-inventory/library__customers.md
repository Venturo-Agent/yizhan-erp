# UI 盤點：`/library/customers`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/library/customers/page.tsx`
> 主要 _components：`CustomerAddDialog.tsx`、`CustomerDialog.tsx`、`ImportCustomersDialog.tsx`、`PassportPreviewDialog`（共用）
> 頁面類型：`列表`（含三個 dialog）

## 一句話用途
顧客資料庫列表、可搜尋 / 新增（手動 + 護照 OCR）/ 批次匯入 / 檢視編輯 / 刪除、護照效期狀態提醒。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title + icon `Users` + 內建 search + headerActions + primaryAction）
- **頁首**：標題 `t('customerPageTitle')`、無麵包屑、頁首動作有「匯入」(header-outline) + primaryAction「新增」
- **分頁**：`EnhancedTable` server pagination、固定 15 筆/頁

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「匯入」 | `<Button>` | `header-outline` | sm | `FileSpreadsheet` (size=16) | morandi token | ✅ |
| 頁首「新增顧客」 | `primaryAction`（ContentPageLayout） | — | — | `Plus` | btn-primary | ✅ |
| 列表行「待驗證」（條件） | `<ActionCell iconOnly>` | warning | h-7 | `AlertTriangle` | status-warning | ✅ |
| 列表行「詳情/編輯」 | `<ActionCell iconOnly>` | default | h-7 | `Info` | morandi-secondary | ✅ |
| 列表行「刪除」 | `<ActionCell iconOnly>` | danger | h-7 | `Trash2` | status-danger | ✅ |
| 列表「姓名」連結（進詳情頁） | 手刻 `<button>` | — | — | — | `text-morandi-gold hover:text-morandi-gold-hover` | 🟡 文字連結、非操作鈕、可接受 |
| 列表姓名旁「看護照」（條件） | 手刻 `<button>` | — | — | `Eye` (size=12) | `text-morandi-gold` | 🟡 inline icon button |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 頁首搜尋（姓名/電話/公司） | ContentPageLayout 內建 search | text | 內建 | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 無（列表頁本身） | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無 | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| `EnhancedTable` | 內建（text-xs cells） | 內建 | 內建 | 內建 | ✅ |

> 欄位：編號（+未驗證 ⚠️）、姓名（連結 + 護照預覽）、護照姓名、電話、護照號碼、護照效期（含 status label）、身分證、出生日期、飲食禁忌、VIP。

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增顧客（手動 + OCR） | `ManagedDialog`（CustomerAddDialog） | maxWidth 4xl、showFooter=false | 自刻 footer：「取消」soft-gold | 🟡 footer 自刻 |
| 詳情/編輯（統一） | `ManagedDialog`（CustomerDialog） | maxWidth 5xl、showFooter=false | 自刻 footer：取消/確認/編輯/關閉 全 soft-gold | 🟡 footer 自刻 |
| 批次匯入 | `Dialog`（ImportCustomersDialog） | `level={1}` | 自刻 footer：返回/取消/匯入 全 soft-gold | 🟡 用底層 Dialog 非 FormDialog |
| 護照預覽 | `PassportPreviewDialog`（共用） | — | — | ✅ |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 未驗證警示（編號欄） | 手刻 `<span>` emoji ⚠️ | inline | `text-status-warning` | 🟡 用 emoji 當 badge |
| 飲食禁忌（有值時） | 手刻 `<span>` | rounded | `text-morandi-gold bg-status-warning-bg` | 🟡 美術色 + 語意底色混用 |
| VIP | 手刻 `<span>` | inline | `text-morandi-gold` | 🟡 美術色當強調 |
| 護照效期 status label | `formatPassportExpiryWithStatus` 回傳 className | inline | 動態（來自 util） | 🟡 待確認 util 顏色 token |
| 詳情 dialog 驗證徽章 | 手刻 `<div>` | rounded | `bg-morandi-green/90 text-white` / `bg-status-warning/90` | 🔴 已驗證用 `morandi-green` 美術色 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁首匯入 | `FileSpreadsheet` | `size={16}` | — |
| 頁首新增 | `Plus` | primaryAction | — |
| 行 待驗證 | `AlertTriangle` | ActionCell 0.95em | status-warning |
| 行 詳情 | `Info` | ActionCell 0.95em | morandi-secondary |
| 行 刪除 | `Trash2` | ActionCell 0.95em | status-danger |
| 行 看護照 | `Eye` | `size={12}` | morandi-gold |
| 新增 dialog 手動區 | `Edit` | `size={18}` | morandi-primary |
| 新增 dialog OCR 區 | `Upload` | `size={18}` / w-6 h-6 | morandi-secondary |
| 新增 dialog 移除檔 | `Trash2` | `size={12}` | status-danger |
| 新增 dialog 展開 | `ChevronDown`/`ChevronRight` | `size={14}` | morandi-secondary |
| 新增 dialog 檔案 | `FileImage` | `size={14}` | morandi-gold |
| 新增 dialog 手動加 | `Plus` | `size={16}` | — |
| 新增 dialog 取消 | `X` | `size={16}` | — |
| 詳情 dialog 編輯照片 | `Pencil` 🔴 | `size={16}` | morandi-primary |
| 詳情 dialog 無照片 | `ImageOff` | `size={40}` | morandi-muted |
| 詳情 dialog 上傳照 | `Upload` | `size={14}` | — |
| 詳情 dialog 已驗證 | `Check` | `size={12}` | — |
| 詳情 dialog 儲存 | `Save` | `size={14}` | — |
| 詳情 dialog 編輯/取消/關閉 | `Edit` / `X` | `size={14}` | — |
| 匯入 dialog 標題 | `FileSpreadsheet` | h-5 w-5 | `text-morandi-sky` |
| 匯入 dialog 上傳/下載/返回 | `Upload` / `Download` / `ArrowLeft` | `size={16}` / h-10 w-10 | morandi-secondary |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 新增 dialog OCR 上傳區 | 手刻 `<label>` dashed border | `rounded-lg` | — | 🟡 拖放上傳區自刻 |
| 新增 dialog 提醒/拍攝建議 accordion | 手刻 `<div>` + `<button>` 展開 | `rounded-lg` | — | 🟡 自刻折疊、用 status-info/warning 底 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 刪除前確認（含訂單關聯阻擋） | `confirm`（@/lib/ui/alert-dialog） | ✅ |
| 照片更新成功/儲存失敗 | `toast`（sonner） | ✅ |
| 列表空狀態/載入 | `EnhancedTable` 內建 | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **CustomerDialog 編輯照片鈕用 `Pencil`**、全站列表編輯主流是 `Edit2`、CustomerDialog 開頭又 import `Edit`（footer 用）→ 同一檔三種編輯圖示混用（`Edit`/`Pencil`）。
- 🔴 **驗證狀態徽章用 `bg-morandi-green`（美術色當語意成功色）**、應走 `bg-status-success`。詳情頁列表狀態也用 `text-morandi-income`/`text-morandi-red`（見 `[id]` 頁）。
- 🟡 三個 dialog footer 全自刻 `<Button variant="soft-gold">`、沒走 `FormDialog` 統一 footer（ImportCustomers 用底層 `Dialog level={1}`、Add/Detail 用 `ManagedDialog` showFooter=false）→ 取消/確認按鈕樣式靠各檔手拼、不統一。
- 🟡 未驗證提醒用 emoji `⚠️`/`⚠` 當 badge（編號欄 + 詳情驗證徽章）、非組件化 StatusBadge。
- 🟡 飲食禁忌 / VIP 用 `text-morandi-gold` 美術色當強調、非 status token。

## 備註
- 列表操作欄已對齊黃金標準（`ActionCell`）、語意色（warning/danger）正確。
- `handleRowClick` / `handleDelete` 直接散刻 `supabase.from(...)`（讀 passport_image_url、查 order_members 關聯）→ 非 UI 議題、但屬資料讀取紅線 F 範疇、留記。
- 匯入 dialog 走 `useCustomerImport` hook + `ImportCustomersPreviewStep` 子組件（預覽步驟、本次未深掃內部表格）。
