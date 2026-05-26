# UI 盤點：`/marketing/website`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/marketing/website/page.tsx`
> 頁面類型：`列表`

## 一句話用途
管理官網行程上架：看哪些團上架中、用 switch 切上架/下架、點編輯進詳情頁、右上「重新發布官網」觸發 Astro rebuild。

## Layout 骨架
- **頁面框架**：`ListPageLayout`（內含 EnhancedTable）
- **頁首**：`title="官網管理"` + `icon={Megaphone}`、有麵包屑（行銷管理 / 官網管理）、頁首動作 `headerActions`（重新發布官網按鈕）
- **分頁**：有、EnhancedTable 內建（client-side、未傳 serverPagination）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「重新發布官網」 | `<Button>` | outline | sm | RefreshCw / Loader2 | morandi-gold(outline) | ✅ |
| 列表行「編輯」 | `<Button variant="ghost">` + 手套 `ACTION_BUTTON_BASE`/`ACTION_BUTTON_DEFAULT_TONE` | ghost | sm（被 ACTION_BUTTON_BASE 的 h-7 覆蓋） | Edit2 | morandi-secondary | 🔴 待確認 |
| 列表行「預覽」 | 手刻 `<a>` 套 `ACTION_BUTTON_BASE`/`ACTION_BUTTON_DEFAULT_TONE` | — | h-7 | ExternalLink | morandi-secondary | 🔴 |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 搜尋框（團號/團名） | ListPageLayout 內建 search | text | 框架預設 | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 無 | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 列「官網上架」切換 | `<Switch>`（@/components/ui/switch） | ✅ |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| `EnhancedTable`（經 ListPageLayout） | 框架預設 | 框架預設 | 框架預設 | `emptyMessage="尚無旅遊團..."` | ✅ |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無（切換直接走 Switch + toast、編輯走路由跳轉） | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 無正式 badge；上架狀態以 Switch 表現 | — | — | — | — |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁首 icon | Megaphone | 框架預設 | — |
| 重新發布 | RefreshCw | `w-4 h-4` | 繼承 button |
| 載入中 | Loader2 | `w-4 h-4` / `w-3 h-3` | text-morandi-muted |
| 編輯 | Edit2 | `size="0.95em"` | morandi-secondary |
| 預覽外連 | ExternalLink | `size="0.95em"` | morandi-secondary |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 無（純列表頁） | — | — | — | — |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 操作成功/失敗 | `toast`（sonner）success/error/warning | ✅ |
| 切換中 | Loader2 spin（inline） | ✅ |
| 列表載入 | ListPageLayout `loading` prop | ✅ |
| 空狀態 | `emptyMessage` | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **列表「編輯」按鈕混搭寫法**：用 `<Button variant="ghost" size="sm">` 又疊上 `ACTION_BUTTON_BASE`/`ACTION_BUTTON_DEFAULT_TONE` className。黃金標準是列表操作走 `<ActionCell>`（或訂單頁那種直接引用骨架常數的手刻 `<button>`）。這裡是「Button 組件 + 操作欄骨架常數」混搭、ghost variant 的 hover 樣式可能跟骨架常數打架。建議改走 `<ActionCell>` 或純手刻 button + 骨架常數、二選一。
- **列表「預覽」用手刻 `<a>`**：雖然套了正確的骨架常數 token、但沒走 ActionCell；ActionCell 目前不支援 `<a>` 外連（只吃 onClick）、屬合理的 escape hatch、但與「編輯」並列時兩個元素類型不同（button vs a）容易高度/對齊細微不一致。標「待確認」。
- 整體顏色 / 圖示（Edit2、morandi token）都正確、無 Tailwind 預設色、無美術色當語意色。

## 備註
- 此頁為完整實作（非 skeleton）、走 entity hook `useWebsiteTours` + `apiMutate` + `invalidateWebsiteTours`、符合資料讀取紅線 F。
- 防連點到位：Switch、編輯、預覽、重新發布皆 `disabled` 控制。
- 「預覽」連到 `https://corner.venturo.tw/tours/${code}`（硬編 domain、屬官網對外網址、非 UI token 範疇）。
