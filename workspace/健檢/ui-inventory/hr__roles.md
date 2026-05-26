# UI 盤點：`/hr/roles`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/hr/roles/page.tsx`（含 `_components/RoleListPanel.tsx`、`_components/RoleCapabilityTable.tsx`）
> 頁面類型：`設定`（左右分欄：職務列表 + 權限勾選矩陣）

## 一句話用途
有 `hr.roles.write` 能力的員工管理「職務（角色）」+ 細粒度權限矩陣（模組 / 分頁 × 可讀取 / 可寫入），新增 / 刪除職務、勾選能力後儲存。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（icon=Shield、tabs=HR_ADMIN_TABS.employee、breadcrumb）
- **頁首**：title 走 i18n、有 tab 子導航 + breadcrumb、`primaryAction`「新增職務」(Plus)
- **主體**：12 欄 grid（左 col-span-3 職務列表、右 col-span-9 權限矩陣）
- **無權限**：顯示 Shield + 「權限不足」中央卡片
- **分頁**：無（左列表內部 scroll、右矩陣內部 scroll）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「新增職務」 | `primaryAction`（ContentPageLayout） | default | — | Plus | btn-primary | ✅ |
| 職務列表行「刪除」 | 手刻 `<button>` + `ACTION_BUTTON_BASE` | — | base(h-7) | Trash2 | status-danger | ✅（引用 ACTION_BUTTON_BASE、非 ActionCell 但走黃金骨架常數） |
| 權限矩陣「儲存」 | `<Button>` | soft-gold | sm(h-8) | Save/Loader2 | morandi-gold | ✅ |
| 模組展開/收合 | 手刻 `<button>` | — | p-1 | ChevronDown/Right | morandi-secondary | ⚠️ 手刻展開鈕（accordion toggle、可接受） |
| 新增職務 Dialog footer | `<FormDialog>` 預設 footer | soft-gold | — | Save/X | morandi-gold | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 新增職務 角色名稱 | `<Input>` | text | 標準 | ✅ |
| 新增職務 說明 | `<Input>` | text | 標準 | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| （無） | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 模組層 可讀取 toggle | `<Switch>` + `data-[state=checked]:bg-morandi-green` | ⚠️ 開關開色用 morandi-green（美術色當語意色） |
| 模組層 可寫入 toggle | `<Switch>` + `data-[state=checked]:bg-morandi-gold` | ⚠️ 用 morandi-gold（品牌色當語意、可接受但需確認） |
| 分頁層 可讀取/可寫入 toggle | `<Switch>` 同上 | ⚠️ 同上 |
| 部分開啟指示點 | 手刻 `div bg-morandi-gold rounded-full`（絕對定位小圓點） | ⚠️ 手刻裝飾點 |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 權限矩陣（手刻 flex 行、非 table） | p-4 行 | sticky `bg-card border-b` 功能模組/可讀取/可寫入 | 模組行 bg-morandi-bg/30、分頁行 bg-card | 「請從左側選擇一個角色」Shield 空狀態 | ⚠️ 手刻 flex 矩陣、非 EnhancedTable（權限勾選特殊互動、合理） |
| 職務列表（左面板、手刻卡片清單） | p-3 卡片 | 面板標題列 h-14 | 選中 border-morandi-gold bg-gold/5 | 「尚未建立角色」Users 空狀態 | ✅（自刻清單、合理） |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增職務 | `<FormDialog>` (maxWidth sm) | 1(預設) | 預設 soft-gold（X/Save） | ✅ |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 模組「N 個分頁」 | `<Badge variant=outline>` | 標準 | text-morandi-secondary | ✅ |
| 圖例「可讀取/可寫入/部分開啟」色塊 | 手刻 `div bg-morandi-green / bg-morandi-gold rounded` | 小方塊/圓點 | morandi-green / morandi-gold | ⚠️ 圖例色塊（與 Switch 開色對應、屬說明） |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁面 icon / 無權限 / 空狀態 | Shield | h-12 w-12 / ContentPageLayout | morandi-red(無權限) / opacity-50 |
| 新增 | Plus | — | — |
| 儲存 | Save | h-3.5 w-3.5 | — |
| 刪除職務 | Trash2 | size 0.95em | status-danger |
| 選中職務 | Check | h-4 w-4 | morandi-gold |
| 載入中 | Loader2 / Loader2 | h-6 w-6 / h-3.5 animate-spin | morandi-secondary |
| 展開/收合 | ChevronDown / ChevronRight | h-4 w-4 | morandi-secondary |
| 空列表 | Users | h-12 w-12 | opacity-50 |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 職務列表面板 | 手刻 `div bg-card border rounded-lg` | rounded-lg | — | ✅ |
| 權限矩陣面板 | 手刻 `div bg-card border rounded-lg` | rounded-lg | — | ✅ |
| 模組 accordion（展開分頁） | 手刻（toggleExpand 控制） | — | — | ⚠️ 手刻 accordion |
| 系統主管提示條 | 手刻 `border-t bg-morandi-bg/30` | — | — | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 建立/儲存/刪除成功失敗 | `toast`（sonner） | ✅ |
| 刪除職務確認 | `confirm`（`@/lib/ui/alert-dialog`） | ✅ |
| 列表載入 | Loader2 spin | ✅ |
| 儲存中 | Loader2 spin（按鈕內） | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- ⚠️ **Switch 開關開色** 用 `data-[state=checked]:bg-morandi-green`（可讀）/ `bg-morandi-gold`（可寫）— 美術色 morandi-green 當語意色（全站通病、待彙整判定是否改 status token）
- ⚠️ **權限矩陣為手刻 flex 行 + 手刻 accordion**、非 EnhancedTable（屬權限勾選特殊互動、合理但需登記）
- ✅ 職務列表刪除鈕雖是手刻 `<button>`、但正確引用 `ACTION_BUTTON_BASE` + `status-danger` token、視覺對齊黃金標準（不算違規）
- ⚠️ 圖例 + 部分開啟指示點手刻色塊、與 Switch 開色綁定

## 備註
- 「儲存」按鈕走 soft-gold（次操作色軌）、而非 default 拍板金漸層 — 此處權限矩陣的儲存定位為次操作、與 EmployeeForm 主提交不同，待確認是否需統一拍板色。
- 自鎖保護：系統主管的 `hr.roles.write` Switch 永遠 disabled + 鎖定、留「回得來的鑰匙」。
- visibleModules 受 workspace feature gate 過濾（只列已開通模組/分頁）。
