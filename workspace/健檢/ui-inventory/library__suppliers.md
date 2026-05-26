# UI 盤點：`/library/suppliers`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/library/suppliers/page.tsx` → `_components/SuppliersPage.tsx`
> 主要 _components：`SuppliersList.tsx`、`SuppliersDialog.tsx`、`ImportSuppliersDialog.tsx`
> 頁面類型：`列表`（含新增/編輯 dialog + 匯入 dialog）

## 一句話用途
供應商資料庫列表、可搜尋 / 排序 / 新增 / 編輯 / 刪除 / 批次匯入、含完整銀行匯款資訊（國內走銀行代號、國外走 SWIFT）。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title + icon `Building2` + breadcrumb + search + headerActions + primaryAction）
- **頁首**：標題 `t('supplierManagement')`、有麵包屑（首頁 / 資料庫管理 / 供應商管理）、頁首動作「匯入」(header-outline) + primaryAction「新增供應商」
- **分頁**：`EnhancedTable` server pagination、固定 15 筆/頁、支援 server 排序

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「匯入」 | `<Button>` | `header-outline` | sm | `FileSpreadsheet` (16) | morandi token | ✅ |
| 頁首「新增供應商」 | `primaryAction` | — | — | `Plus` | btn-primary | ✅ |
| 列表行「編輯」 | `<Button variant=ghost size=iconSm>` 套 `ACTION_BUTTON_BASE + DEFAULT_TONE` | ghost+常數 | iconSm | `Edit2` | morandi-secondary | 🟡 沒走 ActionCell、但套黃金標準骨架常數 |
| 列表行「刪除」 | `<Button variant=ghost size=iconSm>` 套 `ACTION_BUTTON_BASE + status-danger` | ghost+常數 | iconSm | `Trash2` | status-danger | 🟡 同上、手拼骨架而非 ActionCell |
| Dialog 提交/取消 | `FormDialog` 內建 footer | — | — | — | FormDialog 統一 | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 頁首搜尋（名稱/編號/銀行代碼/帳號） | ContentPageLayout 內建 | text | 內建 | ✅ |
| Dialog 名稱/編號/公司全名/統編/分行/戶名/帳號/聯絡人/電話/Email/地址 | `<Input>` | text/email | 內建 | ✅ |
| Dialog SWIFT（國外才出現） | `<Input className="font-mono">` maxLength=11 | text | 內建 | ✅ |
| Dialog 備註 | `<Textarea rows={3}>` | textarea | 內建 | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| Dialog 銀行（國內模式） | `<BankCombobox>`（共用、disablePortal） | 可搜尋下拉 | ✅ |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| Dialog「臺灣國內 / 國外」二選一 | 手刻 `<input type="radio">`（`h-4 w-4`） | 🔴 原生 radio、非共用 RadioGroup 組件 |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| `EnhancedTable` | 內建 | 內建（sortable） | 內建 | 內建 loading | ✅ |

> 欄位：供應商編號(font-mono)、名稱、銀行代碼、銀行帳號、備註。

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增/編輯供應商 | `FormDialog`（maxWidth 2xl、loading prop 傳齊） | FormDialog | FormDialog 統一 | ✅ |
| 批次匯入 | `ImportSuppliersDialog`（本次未深掃內部） | 待確認 | 待確認 | 待確認 |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 無（列表無狀態欄） | — | — | — | — |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁面 icon | `Building2` | ContentPageLayout | — |
| 頁首匯入 | `FileSpreadsheet` | `size={16}` | — |
| 頁首新增 | `Plus` | primaryAction | — |
| 行 編輯 | `Edit2` | `size="0.95em"` | morandi-secondary |
| 行 刪除 | `Trash2` | `size="0.95em"` | status-danger |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| Dialog 國內/國外選擇區塊 | 手刻 `<div className="bg-morandi-container/10 rounded-md p-3">` | `rounded-md` | — | 🟡 自刻區塊、用 token |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 刪除確認 | `confirm`（@/lib/ui/alert-dialog、type warning） | ✅ |
| 新增/更新/刪除 成功失敗 | `alert`（@/lib/ui/alert-dialog） | ✅ |
| 列表載入（防白閃） | `EnhancedTable loading`（首次才顯示） | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **國內/國外切換用原生 `<input type="radio">`**（`h-4 w-4` 無 token 樣式）、非共用 RadioGroup/Switch 組件 → 視覺與全站表單控件不一致。
- 🟡 **列表操作鈕沒走 `ActionCell`**、而是 `<Button variant=ghost size=iconSm>` 手動套 `ACTION_BUTTON_BASE + ACTION_BUTTON_DEFAULT_TONE` 常數。視覺上跟黃金標準一致（圖示 `Edit2`/`Trash2`、語意色正確）、但形式上沒用 ActionCell wrapper → 跟 customers/archive 頁（用 ActionCell）形式不統一。
- 🟡 Dialog 必填星號用 `<span className="text-morandi-red">*</span>`（美術色）、慣例上必填星號用紅可接受、但專案紅線傾向 status token。
- 🟡 `SuppliersDialog` labels 全寫死在 `COMPONENT_LABELS` 常數（非走 i18n、註解標 SKIP i18n）、`SuppliersList` 部分欄位（銀行代碼）也寫死中文 → 標記待釐清是否刻意。

## 備註
- 編號自動產生走 `generateSupplierCode`（@/lib/codes）、符合中央 module 紅線。
- 新增/更新後走 `invalidateSuppliers()` 失效 cache、防連點用 `isSubmitting` state + FormDialog loading prop。
- `ImportSuppliersDialog` 結構與 `ImportCustomersDialog` 對稱（未深掃、推測同 pattern：底層 Dialog + 上傳/預覽兩步 + soft-gold footer）。
