# UI 盤點：`/bot/[lineUserId]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/bot/[lineUserId]/page.tsx`（+ 已孤立的 `_components/BindCustomerDialog.tsx`、`_components/CustomerInfoSidebar.tsx`）
> 頁面類型：`redirect 殘骸（已遷移）+ 孤立 dead-code 組件`

## 一句話用途
原本是單一 LINE 客戶對話詳情頁（右側顯示客戶資訊 + 歷史訂單、可綁定/解綁客戶）、5/14 整合進 AI Hub、現在 `page.tsx` 只剩 `redirect('/ai?tab=conversations')`。底下 `_components/` 兩個檔仍存在但**已無人 import**（dead code、鐵律 #8 保留）。

## Layout 骨架
- **頁面框架**：page.tsx 無框架（純 redirect）。`_components` 用 `Card` 堆右側 sidebar、`FormDialog` 做綁定對話框。
- **頁首**：無
- **分頁**：無（訂單列表是「最多 10 筆」max-h scroll、非分頁）

## UI 元素清單

⚠️ 下表記錄的是**孤立 dead-code 組件**（`CustomerInfoSidebar` + `BindCustomerDialog`）的元素、目前**未掛在任何 live 路由**（page.tsx 已 redirect）。保留作未來 Phase 4 移植到 `/ai` conversations tab 時的參考底稿。

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| sidebar「綁定到客戶」（未綁時） | `<Button>` | soft-gold | sm | Link2(h-3 w-3) | morandi-gold 系 | ✅ |
| sidebar「解綁」（已綁時） | `<Button>` | ghost | sm | Unlink(h-3 w-3) | accent hover | 🟡 解綁是破壞性動作、卻用 ghost 無語意色（待確認是否該帶 status-warning） |
| 對話框 footer「取消」 | `<Button>` | outline | default | — | morandi | ✅ |
| 對話框 footer「綁定」 | `<Button>` | soft-gold | default | — | morandi-gold 系 | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 綁定對話框「選擇客戶」 | `<Combobox>`（含內建搜尋 input） | text/搜尋 | 走 Combobox 內建 token | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 綁定對話框選客戶（label = `name（phone）`） | `<Combobox>` + `ComboboxOption[]`、`disablePortal` | 共用組件 | ✅ |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| （無） | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 「最近訂單」非 table、是手刻 `div` 卡片列表（map orders）、`max-h-[400px] overflow-y-auto` | text-xs 密集 | 無表頭 | 無、每筆 `rounded-md border border-border p-2.5`、hover `bg-morandi-container/30` | 「這個客戶還沒有訂單」`text-morandi-muted` | 🟡 非 EnhancedTable、自刻卡片列表（屬詳情側欄、可接受、待確認是否要統一） |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 綁定客戶對話框 | `<FormDialog>` | 未設 level、用 `maxWidth="md"` + `loading` prop | customFooter（outline 取消 + soft-gold 綁定） | 🟡 用 maxWidth 而非 level={1/2/3}（待確認 FormDialog 是否以 maxWidth 取代 level） |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 訂單卡片「payment_status」 | 手刻 `span` | `rounded` 小膠囊 | `bg-morandi-container/50 text-morandi-secondary`（中性灰、不分付款狀態著色） | 🟡 直接顯示 raw payment_status 字串、無 label 翻譯、無語意著色（待確認是否要對齊收款狀態 SSOT） |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 綁定 | Link2 | h-3 w-3 / 對話框 h-4 w-4 | text-morandi-gold |
| 解綁 | Unlink | h-3 w-3 | （隨 ghost button） |
| 客戶區標題 | User | h-4 w-4 | text-morandi-gold |
| 電話 | Phone | h-3 w-3 | text-morandi-secondary |
| Email | Mail | h-3 w-3 | text-morandi-secondary |
| 最近訂單標題 | ShoppingBag | h-4 w-4 | text-morandi-gold |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 客戶資訊區 | `<Card className="p-4">` | 走 Card 內建 | 走 Card 內建 | ✅ |
| 最近訂單區 | `<Card className="p-4">` | 走 Card 內建 | 走 Card 內建 | ✅ |
| 載入中卡片 | `<Card className="p-4">` | 走 Card | 走 Card | ✅ |
| 錯誤卡片 | `<Card className="p-4 border-status-danger/30 bg-status-danger/5">` | 走 Card | 走 Card | ✅（用 status-danger token、正確）|

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 綁定/解綁成功失敗提示 | `toast`（sonner） | ✅ |
| 解綁確認框 | `confirm()`（`@/lib/ui/alert-dialog`、type: 'warning'） | ✅ |
| 載入中 | 文字「載入客戶資訊中...」（無 Skeleton） | 🟡 純文字、非 Skeleton（待確認是否要對齊） |
| 空狀態（沒綁/沒訂單） | 文字 `text-morandi-muted` | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **整頁是 redirect 殘骸**：`page.tsx` 已 `redirect('/ai?tab=conversations')`、下表元素全來自**未被 import 的 dead-code 組件**（`grep` 證實 BindCustomerDialog / CustomerInfoSidebar 只在自己資料夾互相引用、無 live 路由掛載）。
- 🟡 「解綁」用 `variant="ghost"` 無破壞性語意色——破壞性動作建議至少帶 status-warning（待確認）。
- 🟡 訂單 payment_status 直接顯示 raw 字串、無 label 翻譯、無語意著色（中性灰膠囊）——與收款狀態 SSOT 不對齊（待確認）。
- 🟡 FormDialog 用 `maxWidth="md"` 而非 `level={1/2/3}`（CLAUDE.md 規範 Dialog 必設 level、待確認 FormDialog 新 API 是否以 maxWidth 取代）。
- 🟡 CustomerInfoSidebar 直接 `useSWR(url, fetcher)`——違反紅線 F（client 讀取應走 entity hook）。屬 dead code、Phase 4 移植時應一併修正。
- ✅ 顏色軌乾淨：成功/危險走 status-* token、品牌走 morandi-gold、無 Tailwind 預設色、無美術色當語意色。

## 備註
- 真正 live 的對話詳情 UI 之後會整合進 `/ai` conversations tab（Phase 4）、本檔記錄的是移植前的舊組件底稿。
- 兩個 `_components` 為孤立 dead code、不影響 live 站、鐵律 #8 保留不刪。
