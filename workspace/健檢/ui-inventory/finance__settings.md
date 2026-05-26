# UI 盤點：`/finance/settings`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/finance/settings/page.tsx`（含 `_components/`：BankAccountsSection、PaymentMethodsSection、SortableMethodRow、CategoriesSection、SortableCategoryRow、MethodDialog、BonusSection、shared-table、types）
> 頁面類型：`設定`（6 tab，內含 5 張可操作設定卡 + 1 placeholder）

## 一句話用途
財務設定中心：6 分頁（銀行帳戶 / 收款方式 / 付款方式 / 團體請款類別 / 公司收支項目 / 獎金設定），每張卡是一個 list table + 編輯對話框；多數支援拖曳排序 + Switch 啟停。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（icon=Settings，tabs prop 切 6 分頁）
- **頁首**：標題 `t('financeSettings')`、primaryAction「新增X」依 activeSection 動態給 label
- **分頁**：頁籤切換（無資料分頁，各 section 一次載全部）

---

## 各設定卡逐張盤點

### 卡 1：銀行帳戶（BankAccountsSection）
**列表表頭**：名稱 / 銀行 / 帳號 / 跨行手續費 / 預設 / 可出帳 / 操作（用 `shared-table` 的 Table）
**空狀態**：`emptyBankAccounts` 文字
**列操作按鈕**：
| 用途 | 組件 | variant | size | 圖示 | 顏色 | 對齊標準? |
|---|---|---|---|---|---|---|
| 編輯 | `<Button>` | ghost | icon | 🔴 SquarePen | 預設 | 🔴 編輯用 SquarePen（黃金標準=Edit2）；用 ghost+icon 非 ActionCell |
| 刪除 | `<Button>` | ghost | icon | Trash2 | text-status-danger | 🟡 顏色走 status-danger ✅；但用 ghost+icon 非 ActionCell |

**Badge**：預設 `bg-morandi-gold/20 text-morandi-gold`；可出帳 `bg-morandi-green/20 text-morandi-green`（🔴 可/不可用美術綠/灰當語意色）
**對話框（BankDialog）**：`FormDialog`，欄位 Input（代號/名稱/帳號/跨行手續費）+ `BankCombobox` + 2 個原生 `<input type=checkbox>`（🔴 非 Switch/Checkbox 組件）；submit 用 FormDialog 內建 footer ✅。

### 卡 2/3：收款方式 / 付款方式（PaymentMethodsSection + SortableMethodRow）
**列表表頭**：拖曳把手 / 名稱 / 金流商 / [借方科目] / [貸方科目] / 狀態 / [客戶收款] / 操作（借貸科目僅開通 accounting 顯示）
**拖曳**：dnd-kit（PointerSensor + KeyboardSensor），把手 `GripVertical`
**列操作按鈕**（SortableMethodRow）：
| 用途 | 組件 | variant | size | 圖示 | 顏色 | 對齊標準? |
|---|---|---|---|---|---|---|
| 編輯 | `<Button>` | ghost | icon | 🔴 Pencil | 預設 | 🔴 編輯用 Pencil（黃金標準=Edit2）；ghost+icon 非 ActionCell |
| 刪除 | `<Button>` | ghost | icon | Trash2 | text-status-danger | 🟡 status-danger ✅；ghost+icon 非 ActionCell |

**狀態/客戶收款**：`<Switch>`（shadcn）✅
**金流商 Badge**：`bg-morandi-gold/15 text-morandi-gold`（品牌色 ✅）
**對話框（MethodDialog）**：`EntityFormDialog`，種類/金流商/借貸科目/手續費科目用原生 `<select>`（🔴 非 shadcn Select），名稱/說明/手續費用 Input，客戶開放用原生 `<input type=checkbox>`（🔴）；submit 走 EntityFormDialog footer ✅。

### 卡 4/5：團體請款類別 / 公司收支項目（CategoriesSection + SortableCategoryRow）
**列表表頭**：拖曳把手 / 名稱 / [類型] / [借方科目] / [貸方科目] / 狀態 / 操作
**拖曳**：dnd-kit，把手 GripVertical
**列操作按鈕**（SortableCategoryRow，跟 SortableMethodRow 同款）：
| 用途 | 組件 | variant | size | 圖示 | 顏色 | 對齊標準? |
|---|---|---|---|---|---|---|
| 編輯 | `<Button>` | ghost | icon | 🔴 Pencil | 預設 | 🔴 Pencil；ghost+icon 非 ActionCell |
| 刪除（is_system 隱藏） | `<Button>` | ghost | icon | Trash2 | text-status-danger | 🟡 status-danger ✅；ghost+icon |

**類型 Badge**：收入 `bg-status-success-bg text-status-success`（✅ 走 status token！）/ 支出 `bg-morandi-container text-morandi-secondary`
**狀態**：`<Switch>` ✅
**對話框（CategoryDialog）**：`FormDialog`，類型/借貸科目用原生 `<select>`（🔴），名稱用 Input；submit 走 FormDialog footer ✅。

### 卡 6：獎金設定（BonusSection）
placeholder：Card + Award icon（opacity-40）+「即將推出」文字。無互動。✅（空殼）

---

## 跨卡共通 UI 元素彙整

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 圖示 | 對齊標準? |
|---|---|---|---|---|
| 頁首「新增X」 | ContentPageLayout primaryAction | （內建） | Plus | ✅ |
| 各列編輯 | `<Button variant="ghost" size="icon">` | ghost | 🔴 SquarePen（銀行）/ Pencil（方式/類別） | 🔴 三種編輯圖示混用、且全非 ActionCell |
| 各列刪除 | `<Button variant="ghost" size="icon">` | ghost | Trash2 | 🟡 顏色 status-danger ✅、但非 ActionCell |

### ☑️ 勾選 / 開關
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 列：啟用/停用、客戶收款 | `<Switch>`（shadcn） | ✅ |
| 對話框：設為預設 / 可出帳 / 客戶開放 | 原生 `<input type="checkbox">` | 🔴 非 shadcn Checkbox/Switch 組件 |

### 🔽 下拉 / 選擇
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 對話框：種類/科目/類型 | 原生 `<select>`（手寫 className h-10 border-input） | 🔴 非 shadcn Select |
| 對話框：銀行全名 | `BankCombobox` | ✅ |

### 📋 表格
| 用什麼組件 | 對齊標準? |
|---|---|
| `shared-table`（自刻 Table/TableHeader/TableRow/TableCell）放在 Card 內 | 🟡 設定頁專用 table（非 EnhancedTable），但 5 卡統一用同一份 shared-table ✅ |

### 🪟 對話框
| 位置/用途 | 組件 | 對齊標準? |
|---|---|---|
| 銀行/類別編輯 | `FormDialog`（含 loading prop ✅ 防連點） | ✅ |
| 收款/付款方式編輯 | `EntityFormDialog`（含 isSubmitting） | ✅ |

### 🎨 圖示
| 用途 | icon | 尺寸寫法 |
|---|---|---|
| 編輯（銀行） | 🔴 SquarePen | `className="h-4 w-4"` |
| 編輯（方式/類別） | 🔴 Pencil | `className="h-4 w-4"` |
| 刪除 | Trash2 | `className="h-4 w-4"` |
| 拖曳把手 | GripVertical | `className="h-4 w-4"` |
| tab 圖示 | Building2/CreditCard/Banknote/Tag/TrendingUp/Award | （tabs 內建） |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **編輯圖示三種混用**：銀行卡用 `SquarePen`、收款/付款方式卡用 `Pencil`、類別卡用 `Pencil` — 全站黃金標準是 `Edit2`。同一個設定頁內就有兩種編輯圖示。
- 🔴 **所有列操作按鈕都用 `<Button variant="ghost" size="icon">` 手刻、未走 `ActionCell`** — 跟 `/finance/payments` 列表的 ActionCell 黃金標準分岔（雖然這裡是 shared-table 不是 EnhancedTable，仍是操作欄）。
- 🔴 **對話框內 select/checkbox 用原生 HTML 元素**（`<select>` / `<input type=checkbox>`）+ 手寫 className，非 shadcn Select/Checkbox/Switch 組件（列表用 Switch 但對話框用原生 checkbox，自相矛盾）。
- 🟡 「可出帳」可/不可 Badge 用美術色 `bg-morandi-green/20`（可）/ `bg-morandi-muted/20`（不可）當語意色。
- ✅ **好的地方**：類別卡「收入」Badge 走 `status-success-bg/status-success` token（正確示範）；刪除鈕顏色走 `text-status-danger`；FormDialog/EntityFormDialog 都帶 loading 防連點；5 卡共用 shared-table。

## 備註
- BankDialog 的「代號 code」欄位列表已砍但對話框仍要求填（William 2026-05-21 砍列欄但保留輸入），submitDisabled 綁 code+name。
- 拖曳排序為 Optimistic update + batch PUT，UI 互動好。
