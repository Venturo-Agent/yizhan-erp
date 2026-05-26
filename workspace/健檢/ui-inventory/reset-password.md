# UI 盤點：`/reset-password`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/reset-password/page.tsx`（單檔、含 inline `<style>`）
> 頁面類型：表單（認證頁 — 忘記密碼後重設）

## 一句話用途
員工點信中重設連結進來（Supabase PASSWORD_RECOVERY 事件）、設定新密碼、成功後 2.5 秒自動跳回 `/login`。

## Layout 骨架
- **頁面框架**：自刻 — 全螢幕置中 `div`（`min-h-screen` + 漸層底）包一張卡片
- **頁首**：卡片內標題「重設密碼」+ 副標、無圖示標題、無麵包屑
- **分頁**：N/A
- **client component**：是（`'use client'`、監聽 `onAuthStateChange`）
- **三態切換**：done（成功）/ !ready（驗證連結中）/ 表單

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 「確認新密碼」提交鈕 | 手刻 `<button>` + `.reset-button` class | — | w-full py-14px | — | `linear-gradient(45deg, morandi-gold 0%, hsl(38,35%,65%))` | 🔴 手刻、漸層方向/配方跟全站 `--btn-primary` 不同 |
| 顯示/隱藏密碼（眼睛）×1 | 手刻 `<button type=button>` | — | 圖示鈕 | Eye / EyeOff | `text-morandi-muted` | 🟡 認證頁慣例 |

提交鈕防連點：`disabled={loading}` + `.reset-button:disabled { opacity:.6 }`。

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 新密碼 | 手刻 `<input>` + `.reset-input` class | password/text 切換 | `border 2px transparent`、focus `border-morandi-gold`、`color:#333` | 🔴 inline `<style>` 自刻；focus 色 hardcode |
| 再次輸入新密碼 | 同上 | password | 同上 | 🔴 同上 |

⚠️ `.reset-input` 用 `color:#333` + placeholder `color:#aaa`（hardcode 灰）、跟 change-password 的 `.cp-input` 用 `var(--morandi-primary)` / `var(--morandi-muted)` token 不一致 — 同類認證頁兩套寫法。

### 🔽 下拉 / 選擇
N/A

### ☑️ 勾選 / 開關
N/A

### 📋 表格 / 列表
N/A

### 🪟 對話框
N/A

### 🏷️ 狀態標籤
N/A

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 成功打勾 | CheckCircle2 | `size={40}` | `text-morandi-green` |
| 錯誤提示 | AlertCircle | `size={14}` | `text-morandi-red` |
| 密碼顯示切換 | Eye / EyeOff | `size={16}` | `text-morandi-muted` |

全 lucide、尺寸 px 數字。

### 🃏 卡片 / 容器
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 重設卡片 | 手刻 div | `rounded-[40px]` hardcode | `shadow-[rgba(180,160,120,0.45)_...]` hardcode | 🔴 圓角/陰影 hardcode（已 eslint-disable） |

### 🔔 回饋 / 空狀態 / 載入
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 成功態 | CheckCircle2（morandi-green）+「密碼已更新！」+ 2.5s 自動跳轉 | 🔴 成功用 morandi-green（美術色）非 status-success |
| 驗證連結中（!ready） | 純文字「驗證連結中，請稍候...」 | 🟡 純文字、無 spinner |
| 錯誤橫幅 | 手刻 div（morandi-red/10）+ AlertCircle | 🔴 用 morandi-red（美術色）非 status-danger |
| 載入態 | 提交鈕文字切「設定中...」 | ✅ 合理 |

## 🔴 不統一 / 異常標記（重點）
- **提交鈕手刻 + 漸層配方不同**：`.reset-button` 用 `linear-gradient(45deg, morandi-gold, hsl(38,35%,65%))` 45 度雙色漸層 + 白字 + `transform:scale(1.03)` hover；跟 change-password 的純色 `.cp-button` 又不一樣、也跟全站 `<Button>` default（135deg `--btn-primary-bg` + 暖棕字）三套都不同。**3 個認證/CTA 場景 = 3 套按鈕配方**。
- **成功色用美術色軌**：成功打勾 CheckCircle2 用 `morandi-green`、語意上應走 `status-success` / `status-success-bg`。
- **錯誤色用美術色軌**：錯誤橫幅 + AlertCircle 用 `morandi-red`、應走 `status-danger`。
- **輸入框 hardcode 灰**：`.reset-input` 用 `color:#333` + placeholder `#aaa`（純 hex）、未走 morandi token；跟 change-password 的 `.cp-input`（走 var token）不一致。
- **圓角/陰影 hardcode**：`rounded-[40px]` + 自訂 shadow、已 eslint-disable。
- **驗證中無 spinner**：!ready 狀態只有純文字、未用 Loader2 / ModuleLoading、跟其他頁載入態風格不一。

## 備註
- 與 `/change-password` 是**同一族手刻認證頁**（同款圓角卡 + 暖金漸層底）、但 input/button 的 inline CSS 完全各寫各的（`.reset-*` vs `.cp-*`、配方還不同）→ **強烈待拍板：抽共用認證卡片 + 共用認證 input/button**、目前是兩份近似但不一致的 copy。
- 定性：**認證頁獨立 CIS**；主要技術債是「兩認證頁未共用 + 三套按鈕配方 + 語意色走美術色軌」。
