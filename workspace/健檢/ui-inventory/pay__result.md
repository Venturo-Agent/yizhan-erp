# UI 盤點：`/pay/result`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(public)/pay/result/page.tsx`
> 頁面類型：公開頁（對客付款結果落地頁、永豐刷卡後 redirect 回來、輪詢入帳狀態、走 morandi token）

## 一句話用途
客戶在永豐刷卡頁刷完後 redirect 回這裡（帶 `?t=token`）、本頁每 3 秒輪詢入帳狀態、依結果顯示「確認中 / 成功 / 未完成 / 確認逾時」四種畫面。

## Layout 骨架
- **頁面框架**：自刻 `div`（`bg-morandi-cream` 全屏置中 + max-w-md 單卡片）
- **頁首**：無（單一狀態卡置中）
- **分頁**：無

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 無（純結果展示、無互動按鈕）| — | — | — | — | — | — |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 無 | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無 | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 無 | — | — | — | — | — |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 無（用大 icon + 標題表狀態、非 badge）| — | — | — | — |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 確認中 / loading | Loader2（spin）| `h-14 w-14` | morandi-gold |
| 付款成功 | CheckCircle2 | `h-14 w-14` | ✅ `text-status-success` |
| 付款未完成 | XCircle | `h-14 w-14` | ✅ `text-status-danger` |
| 款項確認中（逾時）| Clock | `h-14 w-14` | ✅ `text-status-warning` |
| Suspense fallback | Loader2 | `h-10 w-10` | morandi-gold |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 結果狀態卡 | 自刻 `bg-card border-morandi-container` | `rounded-2xl` | `shadow-sm` | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 載入 / Suspense fallback | 自刻 Loader2 置中 | 🟡 對客頁自刻（非 ModuleLoading、單頁簡單可接受）|
| 四種結果狀態 | 自刻 icon + 標題 + 說明 | ✅ 語意色全對齊 status-* |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- ✅ **本頁是公開付款頁裡最乾淨的範例**：成功/失敗/警告語意全走 `status-success` / `status-danger` / `status-warning`、品牌色走 `morandi-gold`、底色 `morandi-cream`、卡片走 `bg-card` + token 圓角陰影。註解明寫「走 morandi design token、不用永豐品牌色（UI 紅線）」。
- 無手刻違規按鈕 / 表單（純展示頁、無互動元件）。
- 文案集中在頁內 `LABELS` 常數（✅ 中央化）。

## 備註
- 用 `<Suspense>` 包 useSearchParams（Next.js 正確做法）。
- 輪詢上限 40 次（約 2 分鐘）、逾時給明確「確認中」訊息、不無限轉圈（2026-05-26 D 修）。
- 結論：**無需修復、可當公開頁 design token 用對的正面範例**。
