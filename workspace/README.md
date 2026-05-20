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
├── _meta/                     長青參考、不變的框架
│   ├── architecture/          🏛 治國大綱（6 層藍圖 / 建表 SOP / SSOT / audit 報告）
│   └── modules/               🏢 職權說明書（27 份功能模組 spec）
└── 健檢/                       🩺 五維度健檢框架（2026-05-20 加）
    ├── SPEC.md                健檢總覽
    ├── DELIVERABLE-2026-05-20.md  總交付（給 William 看的）
    ├── reports/               各維度健檢報告（5 份）
    │   ├── 架構層面健檢.md
    │   ├── 資安層面健檢.md
    │   ├── 效能層面健檢.md
    │   ├── 開發品管健檢.md
    │   ├── 清理層面健檢.md
    │   └── 26-modules-x-5-dimensions-matrix.md  ← 27 modules × 5 維度矩陣
    ├── decided/               已拍板、可直接執行
    │   └── ratchet-baseline.md
    └── pending/               等 William 拍板
        ├── p0-p1-p2-修法清單.md
        ├── upgrades/{module}-to-5of5.md ← 27 份升 5/5 計劃
        ├── proposals/         具體修法 code 草稿（P0-X-XXX.proposal.md）
        └── *-charter.md       openclaw 派工書
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
2. `~/Projects/yizhan-erp/CLAUDE.md` — 地方法律（紅線 / 連線 / 6 層架構 / 5 維度健檢）
3. `workspace/_meta/architecture/2026-05-13-建表-SOP.md` — 新表必過 6 層 checklist
4. `workspace/健檢/DELIVERABLE-2026-05-20.md` — 5 維度健檢現況 + P0/P1 真痛點
5. `~/Desktop/yizhan-erp-nightly-{今天}.md` — 每天 00:10 自動健檢報告

---

## 規矩

- ✅ 新規格 / 規劃直接放 `workspace/<主題>/`、命名 `YYYY-MM-DD-描述.md`、檔頭加 frontmatter（`status: spec/active/draft/done`）
- ✅ 完成的規格 **直接 git rm 砍掉、不留歸檔**（強迫症斷捨離、code / migration 才是真實留痕）
- ❌ 不在這裡放 code 或 migration（程式進 `src/` / `supabase/migrations/`）
- ❌ 不在這裡寫 secrets（secrets 進 `~/.config/venturo/secrets.env`）
