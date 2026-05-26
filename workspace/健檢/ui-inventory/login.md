# UI 盤點：`/login`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/login/page.tsx`（單檔、無 _components）
> 頁面類型：公開頁（登入）

## 一句話用途
未登入者輸入公司代碼 + Email + 密碼登入；含「忘記密碼」寄信、密碼顯示切換、首次登入導向改密碼。

## Layout 骨架
- **頁面框架**：自刻 `div`（全螢幕置中 + 漸層底 `from-background via-card to-morandi-container`）
- **卡片**：claymorphism 風格卡片（`rounded-[40px]` + 5px 白邊 + 大柔陰影），**已掛 `eslint-disable venturo/no-forbidden-classes` 豁免**
- **頁首**：卡片內標題 `<h1>`（金色）+ 副標
- **分頁**：無

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 主「登入」按鈕 | 手刻 `<button class="login-button">` | — | inline `<style>` | — | inline `linear-gradient(45deg, var(--morandi-gold)...)` | 🔴 |
| 密碼顯示切換（眼睛） | 手刻 `<button>` | — | absolute | Eye/EyeOff | `morandi-muted` → hover `morandi-secondary` | 🟡 |
| 「忘記密碼？」連結鈕 | 手刻 `<button>` | — | text | — | `morandi-muted` | 🟡 |
| 忘記密碼「取消」 | 手刻 `<button>` | — | py-2 | — | `morandi-muted` + `border-morandi-gold/30` + `rounded-2xl` | 🔴 |
| 忘記密碼「寄出重設信」 | 手刻 `<button>` | — | py-2 | — | `bg-morandi-gold text-white rounded-2xl` | 🔴 |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 公司代碼 | 手刻 `<input class="login-input uppercase">` | text | inline `<style>`（白底 + 柔陰影 + focus 金邊） | 🔴 |
| Email | 手刻 `<input class="login-input">` | email | 同上 | 🔴 |
| 密碼 | 手刻 `<input class="login-input pr-10">` | password | 同上 | 🔴 |
| 忘記密碼 Email | 手刻 `<input class="login-input">` | email | 同上 | 🔴 |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| （無） | — | — | N/A |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| （無） | — | N/A |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| （無） | — | — | — | — | N/A |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 忘記密碼（inline 展開、非 dialog） | 卡片內 inline 區塊（`showForgot` 切換） | — | 手刻 取消/寄出 雙鈕 | 🟡 |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 錯誤訊息框 | 手刻 div + AlertCircle | `rounded-2xl` | `bg-morandi-red/10` + `border-morandi-red/30` + `text-morandi-red` | 🔴 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 錯誤提示 | AlertCircle | `size={16}` | `text-morandi-red` |
| 顯示密碼 | Eye | `size={16}` | `morandi-muted` |
| 隱藏密碼 | EyeOff | `size={16}` | `morandi-muted` |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 登入卡（claymorphism） | 手刻 div | `rounded-[40px]`（hardcode 任意值） | inline 大柔陰影 `shadow-[rgba(180,160,120,0.45)...]` | 🟡（已掛 lint 豁免、刻意風格） |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 登入錯誤 | 卡片內紅框（state `error`） | 🔴（顏色軌、見下） |
| 登入中 | 按鈕文字切換「登入中」+ disabled | ✅ |
| session 過期/逾時 | 寫進 error 框 | 🔴 |
| 忘記密碼寄出成功 | inline 文字提示（無 toast） | 🟡 |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **整頁走 inline `<style>` 自刻 `.login-input` / `.login-button` CSS class**（含 `linear-gradient(45deg, var(--morandi-gold), hsl(38 35% 65%))`、box-shadow、scale 動畫）——完全不走 `<Button>` / `<Input>` 共用組件、也不走 Tailwind token。是全站最「自成一格」的頁。
- **錯誤訊息用 `morandi-red`（美術色）當危險語意色**（`bg-morandi-red/10` `border-morandi-red/30` `text-morandi-red`），未走 `status-danger` / `status-danger-bg` 語意 token。同性質的 `/no-access` 頁正確用了 `status-danger`、兩頁不一致。
- **忘記密碼「寄出」鈕用 `bg-morandi-gold text-white rounded-2xl` 手刻**、非 `<Button variant="default">`（金漸層拍板鈕）。「取消」鈕同樣手刻。
- 卡片 `rounded-[40px]` + inline shadow 是 hardcode 任意值（已掛 `venturo/no-forbidden-classes` 豁免、屬刻意 claymorphism 風格、可接受但記錄）。
- 密碼眼睛按鈕含 `mt-[7px]` magic offset 對齊 hack。

## 備註
- 此頁刻意做「品牌登入頁」claymorphism 設計、跟系統內列表頁不同調、已有 lint 豁免註解。盤點僅記錄「沒走共用組件」事實、是否要對齊由 William 拍板。
- 真正建議優先收斂的是**顏色軌**：`morandi-red` → `status-danger`（純 token 替換、不動風格）、跟 `/no-access` 對齊。
- 有 i18n（`useTranslations('login')`），但忘記密碼區塊文案是寫死中文（「忘記密碼？」「取消」「寄出重設信」等），未走 i18n。
- 登入鈕 5/15 拔掉 `!code.trim()` disable（cloudflare tunnel SSR hydrate 問題），現只在 `isLoading` 時 disabled、防連點 OK。
