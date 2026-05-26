# UI 盤點：`/workspaces`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/workspaces/page.tsx`
> 主要 _components：`create-tenant-dialog.tsx`（+ 7 個 Tenant*Section）、`edit-tenant-dialog.tsx`
> 頁面類型：列表（租戶管理）

## 一句話用途
讓有 `tenants` feature + 對應 capability 的漫途員工列出 / 搜尋 / 新增 / 編輯 / 啟停所有租戶 workspace，點列進入租戶詳情。

## Layout 骨架
- **頁面框架**：`ListPageLayout`（title、icon=Building2、primaryAction=新增租戶）
- **頁首**：標準 ListPageLayout 標題列；右側 primaryAction「新增租戶」(Plus)；搜尋框（searchFields name/code）。
- **分頁**：`ListPageLayout` / `EnhancedTable` 內建分頁。

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「新增租戶」 | `ListPageLayout.primaryAction` | (layout) | — | Plus | btn-primary | ✅ |
| 列表行「編輯」 | `<ActionCell>` | default | h-7 | Edit2 | morandi-secondary | ✅ |
| 列表行「啟用/停用」 | `<ActionCell>` | warning(啟用時) / default(停用時) | h-7 | Building2 | status-warning | 🟡 啟停動作用 Building2 圖示（語意較弱、非常見 toggle 圖示如 Power/Eye）；用 warning variant 表「停用」尚可 |
| CreateDialog「取消」/「建立」 | `<Button>` | soft-gold / soft-gold | default | — | — | 🟡 取消與主操作同為 soft-gold（無視覺主次區分；其他頁取消多用 ghost） |
| CreateDialog done「關閉」/「複製全部」 | `<Button>` | soft-gold / soft-gold | default | — / Copy,Check | — | 🟡 同上 + 圖示尺寸寫 `size={16}`（非全站慣例的 className size） |
| EditDialog 提交/取消 | `EntityFormDialog`（共用） | — | — | — | — | ✅（走共用 EntityFormDialog） |
| TenantBrand/Org section 刪除一筆 | `<Button>` className=`text-morandi-red` | (預設) | sm | Trash2 | 🔴 morandi-red | 🔴 刪除色用 morandi-red 而非 status-danger |
| TenantBrand/Org「新增」 | `<Button>` | soft-gold | sm | — | — | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| EditDialog 名稱 / 員工上限 | `<Input>` | text/number | 標準 | ✅ |
| EditDialog 代碼（唯讀） | `<Input>` disabled | text | 標準 | ✅ |
| CreateDialog 基本資料（名稱/代號/統編等） | `<Input>` | text | 標準（code/統編 font-mono；error 時 `border-morandi-red`） | 🔴 error 邊框用 morandi-red 而非 status-danger |
| TenantOrgSection 分公司欄位 | 原生 `<input>` + `<Input>` | text | 混用 | 🟡 部分原生 input |

### 🔽 下拉 / 選擇 Select
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| TenantIndustrySection 產業/子產業 | （依該檔、需確認） | — | 待確認 |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| CreateDialog 方案選擇（卡片按鈕） | 手刻 `<button>` 卡片 | 🟡 方案卡用手刻 button |
| CreateDialog 進階 3選2 / 其他功能 toggle | `<Switch>` / 手刻 button | 🟡 混用 |
| CreateDialog 多分公司切換 | toggle | 待確認 |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 租戶列表 `EnhancedTable`（透過 ListPageLayout，bordered=true） | 標準 | 標準 | 依 EnhancedTable | emptyMessage 文案 | ✅ |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增租戶 | `<Dialog>`+`<DialogContent level={1}>`（max-w-2xl、max-h-90vh scroll） | 1 | 自刻 footer（soft-gold x2） | 🟡 自刻 footer、按鈕無主次區分 |
| 編輯租戶 | `<EntityFormDialog>`（共用） | — | 共用 | ✅ |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 方案欄 | inline span + `plan.colorClass` | rounded px-2 py-1 | 來自 subscription-plans 設定 | 🟡 顏色來自 plan 設定常數、需確認是否走 token |
| 狀態欄（啟用/停用） | inline span | rounded px-2 py-1 | 啟用=morandi-primary+morandi-container；停用=morandi-red+morandi-red/10 | 🔴 停用用 morandi-red（美術色）而非 status-danger |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁面/列表 icon | Building2 | (ListPageLayout) | — |
| 編輯 | Edit2 | (ActionCell 0.95em) | morandi-secondary | ✅ |
| 啟停 | Building2 | (ActionCell) | — | 🟡 語意弱 |
| 複製登入資訊 | Copy / Check | size={16} | — | 🟡 size={16} 非 className 慣例 |
| 刪除（create 子 section） | Trash2 | h-4 w-4 | morandi-red | 🔴 |

### 🃏 卡片 / 容器 Card / Panel
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| CreateDialog done 登入資訊卡 | `<Card>` bg-morandi-container/10 | (Card 預設) | — | ✅ |

### 🔔 回饋 Toast / 確認 / 空狀態 / Loading
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 啟停/編輯成功失敗 | sonner toast | ✅ |
| 列表載入 | ListPageLayout loading prop | ✅ |
| 空列表 | emptyMessage | ✅ |

## 🔴 不統一 / 異常標記（重點）
- 🔴 **狀態欄「停用」用 `text-morandi-red bg-morandi-red/10`（美術色）** 而非 `text-status-danger bg-status-danger-bg`，顏色軌分岔。
- 🔴 **CreateDialog 子 section 刪除按鈕用 `text-morandi-red`**（TenantBrandSection / TenantOrgSection）、應走 status-danger。
- 🔴 **CreateDialog 輸入錯誤 `border-morandi-red`**（TenantBasicInfoSection code/taxId error）、應走 status-danger。
- 🟡 **CreateDialog 取消與主操作都用 `soft-gold`**，無主次區分；其他頁取消多用 ghost。
- 🟡 **複製按鈕圖示寫 `size={16}`**（Copy/Check），非全站慣例的 `h-4 w-4` className 寫法。
- 🟡 **啟停動作用 Building2 圖示**（與「公司」同圖示），語意弱、易與行內 icon 混淆。
- 🟡 **新增租戶用手刻 Dialog footer**（非 FormDialog/EntityFormDialog），與編輯租戶（用 EntityFormDialog）兩套 dialog 模式並存。

## 備註
- 列表資料用 `useSWR('all-workspaces')` 直接 fetch `/api/workspaces`（繞 RLS、server 端守 tenants 權限）；CLAUDE.md 紅線 F 要求頁面走 entity hook，此處為直接 useSWR（已在 ratchet baseline？需確認）。
- 啟停走 `useWorkspaceStore().updateWorkspace`（store 直寫 workspaces），非 apiMutate。
- CreateTenantDialog 為 2-step wizard（form → done），含 7 個子 section（Plan / Prep / BasicInfo / Industry / Brand / Org / Admin），子 section 細節見各檔，本頁聚焦主框與顏色異常。
