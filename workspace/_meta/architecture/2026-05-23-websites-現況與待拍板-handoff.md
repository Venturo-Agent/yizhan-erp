# 官網管理（websites 模組）— 現況與待拍板 handoff

> 2026-05-23 晚間 主 Claude 與 William 討論記錄。
> 規格本體：`2026-05-23-websites-module-spec.md`（Max 寫、status「等 William 拍板」）。
> 本檔補：**目前實作到哪 + 6 個待拍板問題（含推薦）+ 下一步選項**，供下輪接續、不丟。

---

## 一句話

`websites` = 客戶官網系統（addon 加購）：客戶買了進全螢幕編輯器、從 component 變體庫拼官網、發布到 `{subdomain}.venturo.tw`。spec 估 **7-10 個工作日**。**不是小修、是多天大模組。**

## 現況（2026-05-23 查證）

**已有底子：**

- ✅ `src/modules/websites.ts` 模組定義（addon、tabs: design / products、exposedToHr）
- ✅ 3 個後台頁殼：`(main)/websites/page.tsx` + `design/page.tsx` + `products/page.tsx`
- ✅ 4/5 SSOT（健檢 P1 記載）

**還沒做（spec 的核心）：**

- ❌ DB：workspaces 加 `subdomain` / `canvas` jsonb / canvas*updated/published*\* 審計欄位
- ❌ 全螢幕拖拉編輯器（dnd-kit、component 庫、properties、auto-save、undo/redo、預覽斷點）
- ❌ 多租戶子網域公開站（`(public)/sites/[subdomain]`、middleware subdomain detection、ISR）
- ❌ `src/lib/canvas/` 通用化 + 8 種 component type × 變體
- ❌ Canvas 改名（YongchengCanvas → Canvas、用 gitnexus_rename）

**已知缺口（健檢 P1）：** 漏 role_capabilities seed → 客戶簽 addon 會卡。

## 6 個待 William 拍板（spec 第十節、附主 Claude 推薦）

| #   | 問題                    | 推薦                                                                               |
| --- | ----------------------- | ---------------------------------------------------------------------------------- |
| 1   | 進 sidebar 嗎？         | 進、走 feature gate（`website_builder` 沒加購不顯示、不顯示鎖頭）— W 5/23 已傾向此 |
| 2   | subdomain 命名？        | 手動設定（簽約時填）、不從 code 衍生（code 是內部 ID）                             |
| 3   | public 站 SEO？         | v1：workspace 級 SEO defaults + tour 級 override（用 tours 既有 seo\_\* 欄位）     |
| 4   | 9 主題設計時程？        | v1 上線只 placeholder variant、9 主題之後逐個設計再 import、不擋上線               |
| 5   | Canvas 改名同步做？     | 同步做（Day 3）、用 gitnexus_rename 安全改、避免短期兩個名字混亂                   |
| 6   | API 路徑 reuse 還抽新？ | 暫沿用 `/api/marketing/website/[code]`、v2 再抽（避免動 marketing 影響 Corner）    |

## 下一步選項（William 2026-05-23 待選）

- **A.** 逐一拍板 6 個問題 → 決策定案、下輪照 spec Day 1 開工
- **B.** 今天先收、官網開全新一輪、先產更細的「還剩什麼」清單
- **C.** 只先補 role_capabilities seed 缺口（解簽 addon 卡）、大工程改天

## 重要邊界（別踩）

- **Corner 不動**：marketing module + `/marketing/website` + Corner Astro repo + corner.venturo.tw 保留（W 講「砍掉會死人」）。websites 是給新客戶的另一條線。
- 紅線 A-H spec 已對齊（見 spec 第三節對照表）。

---

_記錄人：主 Claude。觸發：William 提醒「討論要寫進檔案、不然新對話會丟」（本對話開場原則）。_
