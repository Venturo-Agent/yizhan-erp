# UI 盤點：`/hr/organization`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/hr/organization/page.tsx` → 複用 `src/app/(main)/settings/company/_components/OrganizationSection.tsx` → `BranchesSection.tsx`
> 頁面類型：`設定`（組織管理：分公司 CRUD）

## 一句話用途
管理「分公司」維度（品牌由漫途開通時設定、租戶不自管）；新增第 2 筆分公司後，業務單據與員工編輯頁自動冒對應下拉。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title「組織管理」、icon=Network）
- **頁首**：title + icon、無 breadcrumb、無 primaryAction（CRUD 在 BranchesSection 內）
- **主體**：說明文字 + `<OrganizationSection>`（含說明 Card + `<BranchesSection>`）
- **分頁**：無

## UI 元素清單

> ⚠️ 本頁 UI 完全 re-use `OrganizationSection` → `BranchesSection`（屬 settings 模組元件）。本頁自身 code 只有外殼 + 一行說明文字。下表 OrganizationSection 層級已盤，BranchesSection 內部細項標「待 settings 模組專員盤」（避免跨模組重複盤點）。

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 分公司新增/編輯/刪除 | （BranchesSection 內、待 settings 專員盤） | — | — | — | — | 待確認 |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 分公司欄位 | （BranchesSection 內、待 settings 專員盤） | — | — | 待確認 |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| （本頁外殼無） | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| （本頁外殼無） | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 分公司列表 | （BranchesSection 內、待 settings 專員盤） | — | — | — | 待確認 |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 分公司新增/編輯 dialog | （BranchesSection 內、待 settings 專員盤） | — | — | 待確認 |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| （本頁外殼無） | — | — | — | — |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁面 icon | Network | ContentPageLayout | morandi |
| OrganizationSection 卡片標題 | Network | h-5 w-5 | morandi-gold |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| OrganizationSection 說明卡 | `<Card>` `rounded-xl shadow-sm border bg-morandi-container/10` | rounded-xl | shadow-sm | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| （BranchesSection 內、待 settings 專員盤） | — | 待確認 |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- ⚠️ **本頁無自有 UI 元件**：純複用 settings 模組的 `OrganizationSection` / `BranchesSection`。CRUD 互動細項應由 settings 模組 UI 盤點覆蓋、避免兩處重複盤（SSOT）。
- OrganizationSection 說明卡走標準 `<Card>` + token、外殼無違規。

## 備註
- 此頁 capability 守門複用既有 `settings.company.read`（不另建）。
- 品牌管理 5/24 已移除（品牌由漫途開通設定）、此頁只剩分公司。
- 完整分公司 CRUD UI 元素請對照 settings 模組 `settings__company.md`（或相應 BranchesSection 盤點）。
