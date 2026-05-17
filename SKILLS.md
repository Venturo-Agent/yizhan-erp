# SKILLS.md — 一棧 ERP Agent Skills 清單

> 這份檔案是 AI agent skills 的 SSOT。
> `.agents/` 目錄不進 git（見 .gitignore）— 新機器 / 新 session 用下方指令重裝。

## 安裝指令

```bash
# 工程 skills
npx skills@latest add mattpocock/skills

# 設計 skills
npx skills@latest add https://github.com/Leonxlnx/taste-skill
```

## 已安裝 Skills

### 工程類（mattpocock/skills）

| Skill | 用途 | 優先度 |
|-------|------|--------|
| `improve-codebase-architecture` | 找淺模組 → 深模組的重構機會 | 🟢 常用 |
| `diagnose` | 有結構的 bug 診斷（feedback loop first）| 🟢 常用 |
| `handoff` | 把對話壓縮成 handoff 文件給下一個 session | 🟢 常用 |
| `tdd` | 紅綠重構、vertical slice 方式 | 🟡 情境用 |
| `grill-me` | 拍板前壓力測試設計決定 | 🟡 情境用 |
| `zoom-out` | 進新模組先拿地圖 | 🟡 情境用 |
| `to-prd` | 對話轉 PRD 文件 | ⚪ 備用 |
| `to-issues` | 工作拆成 GitHub issue | ⚪ 備用 |
| `triage` | GitHub issue 分類 | ⚪ 備用 |
| `prototype` | 快速原型 | ⚪ 備用 |
| `caveman` | 極簡說明複雜概念 | ⚪ 備用 |
| `grill-with-docs` | 以文件為基礎的設計討論 | ⚪ 備用 |
| `write-a-skill` | 自訂 skill meta-skill | ⚪ 備用 |

### 設計類（Leonxlnx/taste-skill）

| Skill（安裝名） | 用途 | 適合情境 |
|----------------|------|---------|
| `design-taste-frontend` | 通用高品質前端設計 | 大多數 UI 的基準線 |
| `high-end-visual-design` | 柔和、留白、高端感 | 旅遊業 landing / 報名頁 |
| `redesign-existing-projects` | 審計現有 UI 再重設計 | 改 ERP 既有頁面 |
| `image-to-code` | 設計稿圖片 → 實作 code | 你有稿直接刻 |
| `minimalist-ui` | Notion / Linear 極簡 | ERP 管理介面 |
| `stitch-design-taste` | 與 Stitch MCP 串接 | 搭配 mcp__stitch__* 用 |
| `full-output-enforcement` | 強制完整輸出不截斷 | AI 生到一半就停時用 |
| `brandkit` | 品牌視覺套件 | 建立品牌規範 |
| `gpt-taste` | 更嚴格的設計品質版 | 需要更高設計精度時 |
| `industrial-brutalist-ui` | 硬派 Swiss 排版（Beta） | 特殊風格需求 |
| `imagegen-frontend-web` | 生成網頁設計參考圖 | 搭配圖片生成工具用 |
| `imagegen-frontend-mobile` | 生成 mobile 設計參考圖 | 搭配圖片生成工具用 |

## 更新指令

```bash
npx skills@latest update mattpocock/skills
npx skills@latest update https://github.com/Leonxlnx/taste-skill
npx skills@latest list
```

## 新機器 / 新 Session Onboarding

新 session 進入一棧 ERP 的必讀順序（見 CLAUDE.md 鐵律 #10）：

1. `~/.claude/CLAUDE.md` — 全局 11 條鐵律
2. `~/.claude/INFRASTRUCTURE.md` — API token / Supabase / Vultr / GitHub 索引
3. `CLAUDE.md`（本 repo 根目錄）— 專案規範 + 6 層架構
4. 安裝 skills：`npx skills@latest add mattpocock/skills`
5. 視任務需要再讀 `Logan-Workspace/` 的相關規格文件

## 知識層次圖

```
~/.claude/CLAUDE.md          ← 全局鐵律（個人機器、不進 git）
~/.claude/INFRASTRUCTURE.md  ← 基礎設施索引（個人機器、不進 git）
CLAUDE.md                    ← 專案規範（git ✅）
SKILLS.md                    ← skills 清單（git ✅）
Logan-Workspace/             ← 規格 / 會議紀錄（git ✅）
.agents/skills/              ← 安裝後才有（不進 git、見上方指令）
```
