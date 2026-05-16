# SKILLS.md — 一棧 ERP Agent Skills 清單

> 這份檔案是 AI agent skills 的 SSOT。
> `.agents/` 目錄不進 git（見 .gitignore）— 新機器 / 新 session 用下方指令重裝。

## 安裝指令

```bash
# 一次安裝所有已核准 skills
npx skills@latest add mattpocock/skills
```

## 已安裝 Skills

| Skill | 來源 | 用途 | 優先度 |
|-------|------|------|--------|
| `improve-codebase-architecture` | mattpocock/skills | 找淺模組 → 深模組的重構機會 | 🟢 常用 |
| `diagnose` | mattpocock/skills | 有結構的 bug 診斷（feedback loop first）| 🟢 常用 |
| `handoff` | mattpocock/skills | 把對話壓縮成 handoff 文件給下一個 session | 🟢 常用 |
| `tdd` | mattpocock/skills | 紅綠重構、vertical slice 方式 | 🟡 情境用 |
| `grill-me` | mattpocock/skills | 拍板前壓力測試設計決定 | 🟡 情境用 |
| `zoom-out` | mattpocock/skills | 進新模組先拿地圖 | 🟡 情境用 |
| `to-prd` | mattpocock/skills | 對話轉 PRD 文件 | ⚪ 備用 |
| `to-issues` | mattpocock/skills | 工作拆成 GitHub issue | ⚪ 備用 |
| `triage` | mattpocock/skills | GitHub issue 分類 | ⚪ 備用 |
| `prototype` | mattpocock/skills | 快速原型 | ⚪ 備用 |
| `caveman` | mattpocock/skills | 極簡說明複雜概念 | ⚪ 備用 |
| `grill-with-docs` | mattpocock/skills | 以文件為基礎的設計討論 | ⚪ 備用 |
| `write-a-skill` | mattpocock/skills | 自訂 skill meta-skill | ⚪ 備用 |

## 更新指令

```bash
# 檢查 + 更新 mattpocock/skills
npx skills@latest update mattpocock/skills

# 查看所有已安裝 skill 的來源與版本
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
