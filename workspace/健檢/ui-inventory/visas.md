# UI 盤點：`/visas`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/visas/page.tsx`（單檔、無 _components）
> 頁面類型：`列表`（簽證/證件代辦申辦記錄 + 新增申辦對話框）

## 一句話用途
讓員工瀏覽 / 篩選簽證代辦申辦記錄（待送件 / 已送件 / 已領件 / 已退件 / 已歸還），並新增申辦。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（標題「簽證代辦」，無 icon、無搜尋、無 tabs、無 primaryAction）
- **頁首**：僅標題。動作放在內容區自刻 toolbar（一個 `<select>` 狀態篩選 + 一個「新增申辦」Button）
- **分頁**：🔴 無 server pagination（`<EnhancedTable>` 不傳 serverPagination，全量 render `mappedApplications`）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| toolbar「新增申辦」 | `<Button>` | default | sm | Plus (`h-4 w-4`) | 金漸層 | 🟡 應走 ContentPageLayout primaryAction、卻自刻在內容區 toolbar |
| 新增申辦對話框 footer | `FormDialog` 內建（submitLabel「建立」） | FormDialog default | — | — | 內建 | ✅ |

🔴 **列表無任何行操作按鈕**（無編輯 / 刪除 / 改狀態 / ActionCell）——申辦記錄目前只能看不能在列表操作。

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 對話框「備註」 | 🔴 原生 `<textarea>` | textarea | `border-morandi-gray-300`（🔴 未定義 token） | 🔴 原生 textarea（非共用 Textarea）+ 用不存在的 morandi-gray-300 |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| toolbar 狀態篩選 | 🔴 原生 `<select>` | `border-morandi-gray-300 bg-white`（🔴 未定義 token + hardcode white） | 🔴 原生 select（非共用 Select 組件） |
| 對話框「客戶證件」 | 🔴 原生 `<select>`（且 option 為空、TODO 未填） | `border-morandi-gray-300` | 🔴 原生 select + 功能未完成 |
| 對話框「服務類型」 | 🔴 原生 `<select>` | `border-morandi-gray-300` | 🔴 原生 select |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| （無） | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| `<EnhancedTable>` | 共用 | 共用 | 無（未傳 striped） | 🔴 自刻在 EnhancedTable 外（`mappedApplications.length===0` 時 render 純文字 div、不渲染表格） | 🟡 空狀態自刻在表格外、非 EnhancedTable emptyState；無分頁、無 striped |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增申辦 | `FormDialog` | 預設（未傳 level） | FormDialog 內建 | 🟡 未明示 level（FormDialog 預設） |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 列表「狀態」欄 | 🔴 自刻 `<span className="rounded-full px-2 py-0.5 ...">` | rounded-full pill | 🔴 **全用未定義 token**：pending `bg-morandi-gray-200 text-morandi-gray-700`、submitted `bg-morandi-blue-100 text-morandi-blue-600`、collected `bg-morandi-green-100 text-morandi-green-600`、rejected `bg-morandi-red-100 text-morandi-red-600`、returned_to_customer `bg-morandi-purple-100 text-morandi-purple-600` | 🔴🔴 不走 StatusBadge + 用 **不存在的 morandi-gray/blue/purple/green-100/red-100 數字階 token**（tokens.css 只定義 morandi-green/red/gold 無數字階）→ 實際渲染極可能無底色 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 新增 | Plus | `h-4 w-4` | morandi-gold |

🟡 全頁僅 1 個 icon（Plus）。

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| toolbar | 自刻 `<div className="mb-4 flex gap-3">` | — | — | 🟡 自刻 toolbar |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 建立成功 / 失敗 / 必填提示 | `toast`（sonner） | ✅ |
| 列表空狀態 | 自刻純文字 div（`text-morandi-gray-500` 🔴 未定義 token） | 🔴 自刻 + 未定義 token |
| 防連點 | `creating` state + FormDialog `loading` | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴🔴 **大量引用「不存在的」morandi 數字階 token**：`morandi-gray-200/300/500/700`、`morandi-blue-100/600`、`morandi-purple-100/600`、`morandi-green-100/600`、`morandi-red-100/500/600`。tokens.css 只定義 `morandi-green`/`morandi-red`/`morandi-gold`（無數字階、無 gray/blue/purple）→ 這些 class **實際無對應 CSS、會 silent 失效**（狀態 badge 無底色、表單邊框無色）。這是全頁最嚴重問題，視覺上等於「半成品」。
- 🔴 **狀態 badge 自刻 `<span>` 不走 `<StatusBadge>`**，且自帶 STATUS_COLORS/STATUS_LABELS map（與全站 status-tone-map SSOT 分岔）。
- 🔴 **表單全用原生 `<select>` / `<textarea>`**，不走共用 Select / Textarea 組件——與其他頁（tour-costs 用 shadcn Select）不一致。
- 🔴 **列表無行操作（無 ActionCell / 編輯 / 刪除 / 改狀態）**，只能看不能操作。
- 🟡 **無 server pagination、無 striped**：EnhancedTable 全量 render，違反「列表分頁固定 15 筆」效能紅線。
- 🟡 **「客戶證件」下拉 option 為空 + TODO 註解**（`{/* TODO: populate from customer_documents */}`）——功能未完成、無法選證件即無法建立申辦。
- 🟡 **toolbar 動作自刻在內容區**，未走 ContentPageLayout 的 primaryAction / 搜尋 / tabs 結構。

## 備註
- 此頁是 7 頁中**對齊度最低**的：單檔自刻、color token 大量寫錯（用不存在的數字階）、表單用原生元件、無 ActionCell、無分頁、且有未完成 TODO。整頁像早期 scaffold、未對齊公司 design system。
- 建議優先級：（1）狀態 badge 改 `<StatusBadge>`、（2）color token 全改成已定義的 status-* / morandi-* 、（3）原生 select/textarea 換共用組件、（4）補行操作 + server pagination、（5）補完客戶證件下拉。
