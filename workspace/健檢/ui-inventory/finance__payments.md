# UI 盤點：`/finance/payments`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/finance/payments/page.tsx`（含 `_components/AddReceiptDialog.tsx`、`ReceiptDialogFooter.tsx`、`ReceiptDialogHeader.tsx`、`RefundReceiptDialog.tsx`、`ReceiptPrintDialog.tsx`）
> 頁面類型：`列表`（收款管理，含對話框）

## 一句話用途
收款單列表：三 tab（全部 / 團體收款 / 公司收款）+ 「只看未付」篩選 + 列操作（編輯/核准/退款/收據/退回），點列開新增/編輯收款對話框。

## Layout 骨架
- **頁面框架**：`ListPageLayout`
- **頁首**：標題 `t('paymentManagement')`、primaryAction「新增收款」、headerActions 放「只看未付」Select、statusTabs（capability 控顯）
- **分頁**：serverPagination（每頁 15 筆）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「新增收款」 | ListPageLayout primaryAction | （內建） | - | Plus | btn-primary | ✅ |
| 列：編輯/查看 | `<ActionCell>` | default | h-7 | Edit2 | morandi-secondary→金底 | ✅ |
| 列：核准 | `<ActionCell>` | success | h-7 | CheckSquare | status-success | ✅ |
| 列：收據 | `<ActionCell>` | default | h-7 | Printer | morandi-secondary | ✅ |
| 列：退回 | `<ActionCell>` | danger | h-7 | XCircle | status-danger | ✅ |
| 列：退款 | `<ActionCell>` | danger | h-7 | Undo2 | status-danger | ✅ |
| 對話框 footer：存檔 | `<Button>` | soft-gold | default | Save | soft-gold | 🟡 存檔（拍板動作）用 soft-gold 次要樣式而非 default 主 CTA |
| 對話框 footer：刪除 | `<Button>` | soft-gold + 手寫 className | default | Trash2 | 🔴 text-morandi-red border-morandi-red | 🔴 刪除鈕套 soft-gold variant 又手寫 morandi-red 覆蓋，未走 destructive / status-danger token |
| 對話框 footer：收款轉移 | `<Button>` | soft-gold | default | ArrowRightLeft | soft-gold | ✅ |
| 對話框 footer：確認核帳 | `<Button>` | 手寫 className | default | Check | 🔴 bg-morandi-green text-white | 🔴 手寫綠底（語意「成功/確認」該走 status-success，不該 bg-morandi-green + text-white） |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 列表搜尋框 | ListPageLayout 內建 search | text | 預設 | ✅ |
| 收款項目表格（金額/實收/明細/備註） | `InlineEditTable`（ReceiptItemsTable） | inline | 預設 | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| headerActions「全部狀態/只看未付」 | `<Select>`（shadcn） | w-32 | ✅ |
| 對話框：團號 / 訂單選擇 | Combobox / Select（ReceiptDialogHeader） | 預設 | ✅ |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| ListPageLayout + EnhancedTable | 預設（table-fixed） | 預設 | 預設 | loading 骨架屏 | ✅ |

欄位：收款單號 / 收款日期 / 分公司 / 訂單號 / 團名 / 收款金額 / 實收金額 / 收款方式 / 狀態 / 操作。

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增/編輯收款 | `Dialog` + `DialogContent`（AddReceiptDialog，95vw×90vh，Tabs：團體/批量/公司） | 1（可傳 2） | 見上方 footer 表 | 🟡 footer 按鈕語意色手寫（見上） |
| 退款 | RefundReceiptDialog | - | 待確認 | 待確認（未深讀） |
| 列印收據 | ReceiptPrintDialog | - | 待確認 | 待確認（未深讀） |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 列：狀態欄 | `StatusCell type="receipt"` | badge | 走 status-tone-map | ✅（共用組件） |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 新增 | Plus | （primaryAction 內建） | - |
| 編輯/查看 | Edit2 | `size="0.95em"`（ActionCell） | inherit |
| 核准 | CheckSquare | `size="0.95em"` | inherit |
| 收據 | Printer | `size="0.95em"` | inherit |
| 退回 | XCircle | `size="0.95em"` | inherit |
| 退款 | Undo2 | `size="0.95em"` | inherit |
| footer：存檔 | Save | `size={16}` | inherit |
| footer：刪除 | Trash2 | `size={16}` | inherit |
| footer：確認 | Check | `size={16}` | inherit |
| footer：轉移 | ArrowRightLeft | `size={16}` | inherit |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 對話框內 Tabs（團體/批量/公司） | `Tabs`/`TabsContent`（shadcn） | - | - | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 成功/失敗訊息 | `toast`（sonner） | ✅ |
| 確認/輸入框 | `confirm` / `prompt`（@/lib/ui/alert-dialog） | ✅ |
| 列表載入 | ListPageLayout loading 骨架（只在無資料時） | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **對話框 footer「確認核帳」鈕手寫 `bg-morandi-green hover:bg-morandi-green/90 text-white`**（ReceiptDialogFooter L225）— 成功/確認語意該走 `bg-status-success` / Button success 樣式，現用美術綠 + 白字。
- 🔴 **對話框 footer「刪除」鈕套 `soft-gold` variant 再手寫 `text-morandi-red border-morandi-red`**（ReceiptDialogFooter L186）— 刪除該走 `destructive` 或 status-danger token，現混搭。
- 🟡 **存檔（拍板動作）用 soft-gold 次要樣式**，非 default 主 CTA 金漸層；跟「主操作走 default」的規則略不符（footer 主操作宜用 default）。
- ✅ 列表操作欄完全走 `ActionCell`（黃金標準），含 success/danger variant 正確走 status token — 此頁列表區是好範例。

## 備註
- 列表區（ActionCell）對齊度高；不統一集中在 **AddReceiptDialog 的 footer 按鈕語意色手寫**。
- RefundReceiptDialog / ReceiptPrintDialog 未逐行深讀，footer 樣式標「待確認」。
