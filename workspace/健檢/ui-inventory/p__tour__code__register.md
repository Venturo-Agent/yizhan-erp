# UI 盤點：`/p/tour/[code]/register`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(public)/p/tour/[code]/register/page.tsx`（含 `_components/tour-registration-form.tsx`）
> 頁面類型：公開頁（對客報名表單頁、接 API）

## 一句話用途
客戶在行程頁按「立即報名」後到這裡填報名資料（姓名/Email/電話/人數/備註）、送出建立公開報名。

## Layout 骨架
- **頁面框架**：自刻 `div`（sticky header + `<main>` 單欄、max-w-3xl）
- **頁首**：sticky 半透明 header（「返回行程」連結 + 「業務員引導」提示）
- **分頁**：無

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 表單「提交報名」| `<Button>` | default | 預設（w-full）| Loader2（loading 時）| btn-primary | ✅ |
| notFound「返回首頁」| `<Button>` | default | 預設 | 無 | btn-primary | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 姓名 | `<Input>`（共用）| text | 預設；error 時 🔴 `border-red-500` | 🟡 共用 Input 但 error 用 Tailwind 預設色 |
| Email | `<Input>` | email | 同上 error 🔴 `border-red-500` | 🟡 |
| 電話 | `<Input>` | tel | 預設 | ✅ |
| 報名人數 | `<Input>` | number | error 🔴 `border-red-500` | 🟡 |
| 備註 | `<Textarea>`（共用）| — | 預設 | ✅ |

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
| 「報名保障」`<ul>` | 一般 | 無 | 無 | n/a | ✅ |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 「業務員引導」提示 | 自刻 `<span>` | 文字 | 🔴 `text-morandi-green` | 🔴 美術色 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 返回 | ArrowLeft | `w-5 h-5` | morandi-primary |
| 保障 prompt | CheckCircle | `w-5 h-5` | 🔴 `text-morandi-green` |
| 表單 error | AlertCircle | `w-3 h-3` | 🔴 `text-red-500` |
| 成功畫面 | Check | `w-6 h-6` | 🔴 `text-green-600` |
| 提交 loading | Loader2 | `w-4 h-4` | 繼承 |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 報名保障卡 | 自刻 `bg-morandi-container/30` | `rounded-xl` | 無 | ✅ |
| 報名表單卡 | 自刻 `bg-card` | `rounded-2xl` | `shadow-sm` | ✅ |
| 成功狀態卡 | 自刻 🔴 `bg-green-50 border-green-200` | `rounded-xl` | 無 | 🔴 Tailwind 預設綠 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 提交成功/失敗 | `toast`（sonner）| ✅ |
| 載入 | `<ModuleLoading fullscreen>` | ✅ |
| 提交成功畫面 | 自刻 🔴 `bg-green-50/100 text-green-600/800` | 🔴 Tailwind 預設綠系（成功語意應走 status-success）|
| notFound | 自刻 + Button | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **成功畫面整塊用 Tailwind 預設綠**：`bg-green-50` / `bg-green-100` / `text-green-600` / `text-green-800` / `border-green-200`。語意「報名成功」應走 `bg-status-success-bg text-status-success`、屬 UI 紅線直接違規。
- 🔴 **表單錯誤態用 Tailwind 預設紅**：`border-red-500` / `text-red-500`。錯誤語意應走 `border-status-danger` / `text-status-danger`。
- 🔴 「業務員引導」與「報名保障」icon 用 `text-morandi-green`（美術色當語意/裝飾色）。
- ✅ 表單骨架走共用 `<Input>` / `<Textarea>` / `<Label>` / `<Button>`、提交按鈕 loading 防連點正確。

## 備註
- 此頁屬「ERP 內部該統一」範疇（非提案類一次性客製）— 它是行程系統的標準報名入口、應修成 design token。
- 文案多走 `useTranslations('publicPage')`、表單欄位 label 為硬編中文（可接受）。
- 結論：**建議納入統一修復**（綠/紅預設色 → status token）、是公開頁中最該對齊 ERP 規範的一頁。
