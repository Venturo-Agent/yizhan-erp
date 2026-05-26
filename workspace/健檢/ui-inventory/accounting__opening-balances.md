# UI 盤點：`/accounting/opening-balances`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/accounting/opening-balances/page.tsx`（共用 `../accounts/components/accounts-tabs.ts`）
> 頁面類型：`表單`（期初餘額設定、按資產/負債/權益三欄輸入）

## 一句話用途
啟用會計時設定一次資產/負債/權益的期初餘額、輸入後驗借貸平衡、儲存產生一張鎖定的「期初開帳傳票」（覆寫前次）。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（含 tabs 分頁、與科目管理共用 ACCOUNTS_TABS）
- **頁首**：標題 `t('openingBalances')`、tabs（科目列表 / 期初餘額）、無頁首動作按鈕
- **分頁**：tabs（路由切換）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 合計卡「儲存/覆寫期初餘額」 | `<Button>` | default（金漸層） | default | Save | 金漸層 | ✅（disabled={!isBalanced \|\| isSaving} 防連點 ✅） |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 各科目期初金額（每列一個） | `<Input>` text-right font-mono | number step=0.01 | 共用組件 | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 期初日（會計啟用日） | `<DatePicker>` w-48 | 標準 | ✅ |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無 | - | - |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 自刻 `grid grid-cols-12`（每科目一列：代號/名稱/輸入框） | py-1 | 無表頭（用 Card 標題分組） | 無 | 「沒有 X 類科目、請先到科目管理建立」 | 🟡 非 EnhancedTable、自刻 grid（表單性質、可接受） |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | - | - | - | - |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 差額「✅ 平衡 / $差額」 | 純文字 span（非 Badge） | - | text-morandi-green（平衡）/ text-morandi-red（不平衡） | 🔴 用 morandi-green/red 當「平衡=成功 / 不平衡=危險」語意色 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 說明卡 | `Info` | `size={20}` | text-status-info |
| 儲存按鈕 | `Save` | `size={16}` | (button 內) |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 說明卡 | `<Card>` bg-status-info/5 border-status-info/30 | Card 預設 | - | ✅ |
| 期初日卡 | `<Card>` p-4 | Card 預設 | - | ✅ |
| 資產/負債/權益 三欄 | `<Card>` p-4（each） | Card 預設 | - | ✅ |
| 合計 + 儲存卡 | `<Card>` p-4 | Card 預設 | - | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 載入中 | 自刻 `<Card>`「載入中...」文字 | 🟡 文字載入、非 Skeleton |
| 儲存成功/失敗 | `toast.success/error` | ✅ |
| 借貸不平衡警告 | `toast.error` | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **美術色當語意色**：差額顯示用 `text-morandi-green`（平衡）/ `text-morandi-red`（不平衡）、emoji ✅ 也混入、應改 status-success / status-danger token。
- **emoji 當狀態指示**：「✅ 平衡」用 emoji 寫在文字內、非 token 化的狀態組件。
- **載入態用文字而非 Skeleton**：「載入中...」純文字。
- **圖示尺寸混用**：Info `size={20}` / Save `size={16}`。
- **自刻 grid 當表格**：科目列表用 grid-cols-12 手排、非 EnhancedTable（表單輸入性質、可接受）。

## 備註
- 資料走 `fetch('/api/accounting/opening-balances')` + 儲存走 `apiMutate`（cache 失效 SSOT）✅。
- 與 `/accounting/accounts` 共用 ACCOUNTS_TABS 分頁、但一個用 ContentPageLayout.tabs、一個用 ListPageLayout.statusTabs（tab 機制不同層、視覺需確認一致）。
