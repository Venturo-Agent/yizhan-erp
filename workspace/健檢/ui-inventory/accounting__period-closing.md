# UI 盤點：`/accounting/period-closing`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/accounting/period-closing/page.tsx`
> 頁面類型：`表單 + 歷史列表`（期末結轉：月/季/年結、含結轉歷史）

## 一句話用途
執行月結 / 季結 / 年結（結轉損益科目到本期損益、年結再轉保留盈餘）、產生鎖定結轉傳票、並列出過往結轉歷史（不可重複結轉）。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title=期末結轉）
- **頁首**：標題 `t('periodClosing')`、無麵包屑、無頁首動作按鈕
- **分頁**：無

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 「執行結轉」 | `<Button>` w-full | default（金漸層） | default | - | 金漸層 | ✅（disabled={isLoading \|\| isClosed} 防連點 ✅） |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 無 | - | - | - | - |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 期間類型（月/季/年結） | `<Select>` | 標準 | ✅ |
| 年度 | `<Select>` | 標準 | ✅ |
| 月份（periodType=month 時） | `<Select>` | 標準 | ✅ |
| 季度（periodType=quarter 時） | `<Select>` | 標準 | ✅ |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無 | - | - |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 結轉歷史：自刻 `<div>` flex 列（每筆一個 border rounded-lg） | p-3 | 無表頭 | 無 | 「尚無結轉記錄」 | 🟡 自刻列表、非 EnhancedTable |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 結轉確認 | `confirm()`（type=warning、非 Dialog 組件） | - | - | ✅ |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 期間「已結轉」 | `<Badge>` variant=outline + text-morandi-green + CheckCircle | outline | text-morandi-green | 🔴 用 morandi-green 當「已完成=成功」語意色 |
| 期間「未結轉」 | `<Badge>` variant=secondary + AlertCircle | secondary | - | ✅ |
| 結轉歷史「淨利/淨損」 | 純文字 span | - | text-morandi-green（淨利）/ text-morandi-red（淨損） | 🔴 用 morandi-green/red 當語意色 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 執行期末結轉標題 | `Calendar` | `size={20}` | - |
| 已結轉 Badge | `CheckCircle` | `size={14}` | text-morandi-green |
| 未結轉 Badge | `AlertCircle` | `size={14}` | - |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 執行結轉卡 | `<Card>` p-6 | Card 預設 | - | ✅ |
| 期間/狀態摘要塊 | `<div>` bg-muted p-4 rounded-lg | rounded-lg | - | ✅ |
| 結轉歷史卡 | `<Card>` p-6 | Card 預設 | - | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 結轉成功/失敗 | `toast.success/error` | ✅ |
| 已結轉警告 | `toast.error`（PAGE_LABELS.ALREADY_CLOSED） | ✅ |
| 結轉確認 | `confirm()` | ✅ |
| 歷史空狀態 | 「尚無結轉記錄」文字 | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **美術色當語意色**：已結轉 Badge 用 `text-morandi-green` + CheckCircle、淨利/淨損用 morandi-green/red、應改 status-success / status-danger。
- **圖示尺寸混用**：Calendar `size={20}` / CheckCircle/AlertCircle `size={14}`。
- **結轉歷史自刻列表**：非 EnhancedTable、用 flex div 排（無表頭、無分頁、limit 20）。
- **年結特殊提示用 text-status-warning**：✅ 正確用語意色（這條對齊）。

## 備註
- 符合紅線 D（無作弊後門）：結轉後不可重複、無 reopen / unlock API、UI 用 isClosed 鎖按鈕 ✅。
- 結轉走 `fetch('/api/accounting/period-closing')`、歷史直接 `supabase.from('accounting_period_closings')`（未走 entity hook、紅線 F 順帶記）。
- 用 `useAsyncSubmit` 包執行邏輯 ✅。
