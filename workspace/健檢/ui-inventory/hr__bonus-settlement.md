# UI 盤點：`/hr/bonus-settlement`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/hr/bonus-settlement/page.tsx`
> 頁面類型：`列表`（+ 結算 wizard dialog）

## 一句話用途
預覽「待結算獎金」（read-only 列表、按團）、點「新增獎金結算」開 wizard：勾選團 + 設請款日 + 確認結算 → 每團產一張請款單。

## Layout 骨架
- **頁面框架**：`ListPageLayout`（icon=Award、breadcrumb 人資管理 / 獎金結算）
- **頁首**：title「獎金結算」、`primaryAction`「新增獎金結算」(Check、list 空時 disabled)
- **分頁**：ListPageLayout 內建、initialPageSize=15

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「新增獎金結算」 | `primaryAction`（ListPageLayout） | default | — | Check | btn-primary | ✅ |
| 列表行「看員工明細」 | `<Button>` + `cn(ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE)` | ghost | sm | ExternalLink | morandi-secondary | ⚠️ Button(ghost) 外再套 ACTION_BUTTON 常數、雙重 class 疊加（非 ActionCell、視覺對齊但寫法雜） |
| wizard「清除」（已選時） | `<Button>` | ghost | sm | — | — | ⚠️ ghost、待確認 |
| wizard footer「取消」 | `<Button>` | outline | default | — | — | ✅ |
| wizard footer「確認結算」 | `<Button>` | default | default | Loader2 | btn-primary | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| wizard 請款日期 | `<DatePicker>` | date | 標準 | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| （無） | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| wizard 全選 | `<Checkbox>` | ✅ |
| wizard 每團勾選 | `<Checkbox>` | ✅ |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 主列表 `EnhancedTable`（ListPageLayout） | 標準 | 內建 | 內建 | 內建 loading | ✅ |
| wizard 待結算清單（手刻 flex 行） | px-4 py-3 | 頂部 全選列 bg-morandi-container/30 | hover bg-morandi-container/20、選中 bg-morandi-gold/5 | 「目前無待結算獎金」 | ⚠️ 手刻清單（wizard 多選互動、合理） |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 結算 wizard | `<Dialog>`+`<DialogContent>` (!max-w-4xl max-h-85vh) | 預設 | 自刻 footer（outline 取消 + default 確認） | ⚠️ 用裸 Dialog 非 FormDialog、未明設 level（待確認） |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 列表「總獎金」金額 | 手刻 `span text-morandi-gold tabular-nums` | 文字 | morandi-gold | ✅（金額強調、非 badge） |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁面 icon | Award | ListPageLayout | morandi |
| 新增結算 | Check | — | — |
| wizard 標題 | Calendar | h-5 w-5 | morandi-gold |
| 看明細 | ExternalLink | size 0.95em | morandi-secondary |
| 結算中 loading | Loader2 | w-4 h-4 animate-spin | — |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| wizard 清單外框 | 手刻 `rounded-lg border-morandi-border` | rounded-lg | — | ✅ |
| wizard 提醒框 | 手刻 `rounded-lg bg-morandi-container/30 border-morandi-border` | rounded-lg | — | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 載入/結算成功失敗 | `toast`（sonner、含 success/warning/error） | ✅ |
| 列表載入 | ListPageLayout loading prop | ✅ |
| wizard 結算中 | Loader2（按鈕內）+ 防連點 disabled | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **wizard 請款日期必填星號** 用 `text-red-500`（Tailwind 預設色）— 應走 `text-status-danger` token（`page.tsx` L234）
- ⚠️ **列表行「看員工明細」** 用 `<Button variant=ghost>` 又疊 `cn(ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE)`、寫法重複（Button 內已有自己 base class、再蓋操作欄骨架）— 視覺勉強對齊但建議改純 ActionCell 或純 Button
- ⚠️ **結算 wizard 用裸 `<Dialog>`** 而非 `<FormDialog>`、且 DialogContent 未明設 `level`（憲法要求 Dialog 必設 level）— 待確認
- ⚠️ wizard「清除」用 ghost variant、不在標準操作色軌

## 備註
- 結算後不可修改（符合紅線 D 不開後門）、每團產一張請款單（BNS-團號-日期）。
- 主列表 read-only 預覽、勾選結算動作集中在 wizard。
