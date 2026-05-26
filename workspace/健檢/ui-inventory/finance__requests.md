# UI 盤點：`/finance/requests`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/finance/requests/page.tsx`（含 `_hooks/useRequestTable.tsx`、`_components/AddRequestDialog.tsx`、`AddRequestDialogFooter.tsx`、`AddRequestDialogHeader.tsx`、`RequestItemList.tsx`、`CreateSupplierDialog.tsx`、`CostTransferDialog.tsx`）
> 頁面類型：`列表`（請款管理，含對話框）

## 一句話用途
請款單列表：tab（全部 / 團體請款 / 公司請款 / 薪資，capability 控顯）+「只看未付」篩選，點列開請款明細對話框（團體/批量/公司三模式）。

## Layout 骨架
- **頁面框架**：`ListPageLayout`
- **頁首**：標題 `t('requestsManage')`、primaryAction「新增請款」、headerActions 放「只看未付」Select、statusTabs
- **分頁**：serverPagination（每頁 15 筆）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「新增請款」 | ListPageLayout primaryAction | （內建） | - | Plus | btn-primary | ✅ |
| 列操作 | （無 renderActions） | - | - | - | - | 🟡 此列表無列操作欄；全靠點整列開對話框（與 payments 的 ActionCell 模式不一致） |
| 對話框 footer：新增請款 | `<Button>` | soft-gold | default | Plus | soft-gold | 🟡 主提交動作用 soft-gold 而非 default 主 CTA |
| 對話框 footer：刪除 | `<Button>` | soft-gold + 手寫 className | sm | Trash2 | 🔴 text-morandi-red border-morandi-red | 🔴 刪除鈕套 soft-gold 又手寫 morandi-red，未走 destructive / status-danger |
| 對話框 footer：儲存 | `<Button>` | （手寫 className，無 variant） | sm | Save | 🔴 條件 bg-morandi-gold text-white / bg-morandi-container | 🔴 整顆按鈕色靠手寫 className 切換，未走 Button variant + 用 text-white |
| 對話框 header：同批次切換 chips | `<Button>` | soft-gold + 手寫 | sm h-7 | 無 | 條件 morandi-gold | 🟡 active 態手寫 morandi-gold 覆蓋 |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 列表搜尋框 | ListPageLayout 內建 | text | 預設 | ✅ |
| 請款明細項目（金額/數量/說明等） | RequestItemList（EditableRequestItemList） | inline | 預設 | ✅ |
| 日期 | `DatePicker` / `RequestDateInput` / `DeferredInput` | - | 預設 | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| headerActions「全部狀態/只看未付」 | `<Select>` | w-32 | ✅ |
| 對話框：團號 / 訂單選擇 | `Combobox`（AddRequestDialogHeader） | w-[19rem]/w-[15rem] | ✅ |
| 對話框：供應商 / 類別 / 付款方式 | Combobox / Select（RequestItemList、batch-tab） | 預設 | ✅ |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| ListPageLayout + EnhancedTable（useRequestTable 提供 columns） | 預設 | 預設 | 預設 | loading 骨架 | ✅ |

欄位：請款單號 / 分公司 / 團名 / 訂單號 / 請款日期（特殊出帳標 ⚠️）/ 金額 / 狀態。

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增/編輯請款 | `Dialog`+`DialogContent`（AddRequestDialog，95vw×90vh，Tabs：團體/批量/公司） | 1（可傳 level prop） | 見 footer 表 | 🟡 footer 按鈕語意色手寫 |
| 新增供應商 | CreateSupplierDialog | 巢狀 | 待確認 | 待確認（未深讀） |
| 成本對沖 | CostTransferDialog | 巢狀 | 待確認 | 待確認（未深讀） |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 列：狀態欄 | `StatusBadge type="payment_request"` | badge | 走 status-tone-map | ✅（共用組件） |
| 對話框 header：編輯模式狀態 | `StatusBadge` | badge | 同上 | ✅ |
| 特殊出帳標記 | 手刻 span「⚠️ 特殊出帳」 | 文字 | text-morandi-gold | 🟡 emoji + morandi-gold 文字，非 Badge 組件 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 新增 | Plus | primaryAction 內建 / footer `size={16}` | - |
| footer：刪除 | Trash2 | `size={16}` | inherit |
| footer：儲存 | Save | `size={16}` | inherit |
| header：同批次 | Layers | `size={14}` | text-morandi-muted |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 對話框 Tabs（團體/批量/公司） | `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` | - | - | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 列表載入 | ListPageLayout loading 骨架 | ✅ |
| 髒資料離開確認 | handleEditOpenChange（confirm） | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **AddRequestDialogFooter「儲存」鈕整顆色靠手寫 className 條件切換**（L112-117：`bg-morandi-gold text-white` / `bg-morandi-container text-morandi-muted`），完全沒走 Button variant，且用 text-white。
- 🔴 **「刪除」鈕套 soft-gold variant 又手寫 `text-morandi-red border-morandi-red hover:bg-morandi-red/10`**（L99-103）— 未走 destructive / status-danger token。
- 🟡 **此列表頁無列操作欄（renderActions）**，所有操作靠點整列進對話框；跟 `/finance/payments` 用 ActionCell 的模式不一致（兩個同 module 的列表互不對齊）。
- 🟡 主提交「新增請款」用 soft-gold（次要樣式）而非 default 主 CTA。
- 🟡 特殊出帳用 emoji「⚠️」+ text-morandi-gold 手刻，非 Badge/status 組件。

## 備註
- AddRequestDialog 拆得很細（header/footer/batch-tab/edit-ops/submit/types 分檔），UI 集中在 footer/header 兩檔。
- CreateSupplierDialog / CostTransferDialog footer 樣式未深讀，標「待確認」。
