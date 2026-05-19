# workspace — 行政院（規格 / 決策 / 規劃紀錄）

> yizhan-erp 的「**地方行政院**」、實際運作 / 規劃 / 開會的工作目錄。
> 2026-05-19 大整理 + 斷捨離：active 草案全砍重來、quality-debt 框架砍、只留治國大綱跟職權說明書。

---

## 三層政治架構（譬喻）

| 層級 | 譬喻 | 實際 |
|---|---|---|
| 🏛 全國憲法 | 國家原則、跨所有專案 | `~/.claude/CLAUDE.md` |
| 📜 地方法律 | 這個專案的法條 + 紅線 | `~/Projects/yizhan-erp/CLAUDE.md` |
| 🏢 **地方行政院**（本目錄）| 規劃 / 開會 / 執行紀錄 | `workspace/` |

---

## 目錄結構

```
workspace/
├── README.md
└── _meta/                     長青參考、不變的框架
    ├── architecture/          🏛 治國大綱（6 層藍圖 / 建表 SOP / 隱私 / RBAC / SSOT）
    └── modules/               🏢 職權說明書（27 份功能模組 spec）
```

> 「執行草案」`active/` 已斷捨離、未來新增 spec 直接放 root 或重建 active/。

---

## _meta/architecture/（治國大綱、長青）

實用 SOP 範本、新功能 / 新租戶照表跑。

| 檔案 | 說明 |
|------|------|
| `2026-05-13-建表-SOP.md` | 新表必過 6 層 checklist + migration / API / hook 範本 |
| `2026-05-14-新租戶-onboarding-seed-SOP.md` | 新租戶 onboarding seed SOP |

## _meta/modules/（職權說明書、27 份功能模組 spec）

各 module 詳細規格：`accounting`, `addon-data-{attractions, hotels, restaurants}`, `calendar`, `channels`, `cis`, `customers`, `dashboard`, `database`, `facebook-bot`, `fee-distribution`, `finance`, `hr`, `hr-salary-settlement`, `instagram-bot`, `leave-severance`, `line-bot`, `messaging-inbox`, `office`, `orders`, `platform-integrations`, `settings`, `todos`, `tour-attributes`, `tours`, `workspaces`。

---

## 動工前必看的卡

新 session 接手 yizhan-erp、按順序看：

1. `~/.claude/CLAUDE.md` — 全國憲法（協作 / 紅線）
2. `~/Projects/yizhan-erp/CLAUDE.md` — 地方法律（紅線 / 連線 / 6 層架構）
3. `workspace/_meta/architecture/2026-05-13-建表-SOP.md` — 新表必過 6 層 checklist

---

## 規矩

- ✅ 新規格 / 規劃直接放 `workspace/<主題>/`、命名 `YYYY-MM-DD-描述.md`、檔頭加 frontmatter（`status: spec/active/draft/done`）
- ✅ 完成的規格 **直接 git rm 砍掉、不留歸檔**（強迫症斷捨離、code / migration 才是真實留痕）
- ❌ 不在這裡放 code 或 migration（程式進 `src/` / `supabase/migrations/`）
- ❌ 不在這裡寫 secrets（secrets 進 `~/.config/venturo/secrets.env`）
