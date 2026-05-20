# Ratchet Baseline — 凍結現有違規、不准新增

> 狀態：**已落地**（不是 proposal、是現況解釋）
> 機制：`.eslint-suppressions.json` + `npm run lint:swr-baseline` + `npm run lint:swr-prune`

---

## 為什麼這份文件存在

5/19 SWR 健檢時、抽象層蓋好但 0 個 caller 在用。為了不讓「未來再加新違規」，需要 ratchet（棘輪）機制：
1. 凍結現有違規（已有的不擋）
2. 新加違規 → ESLint error → CI 擋 PR
3. 修完的違規自動從 baseline 移除（不可加回）

**這個機制 5/20 已經實作了**、本檔記錄現況讓未來查得到。

---

## 現況快照（2026-05-20 19:30）

| 指標 | 數 |
|---|---|
| Baseline 檔 | `.eslint-suppressions.json`（350 行）|
| 違規檔數 | 68 |
| `venturo/no-direct-supabase-writes` 違規數 | 127（53 檔）|
| `venturo/no-direct-useswr-in-pages` 違規數 | 18（18 檔）|
| 合計違規 | **145** |

---

## 機制怎麼運作

### 1. ESLint config（`eslint.config.mjs`）

```js
'venturo/no-direct-useswr-in-pages': 'error',
'venturo/no-direct-supabase-writes': 'error',
```

兩條都 error 級。沒有 baseline 的話、現有 145 處全部會擋 CI。

### 2. package.json scripts

```json
"lint": "eslint --suppressions-location .eslint-suppressions.json --pass-on-unpruned-suppressions .",
"lint:swr-baseline": "eslint --suppress-rule venturo/no-direct-useswr-in-pages --suppress-rule venturo/no-direct-supabase-writes --suppressions-location .eslint-suppressions.json .",
"lint:swr-prune": "eslint --suppressions-location .eslint-suppressions.json --prune-suppressions ."
```

- `npm run lint` — 用 baseline 過濾、只看新違規
- `npm run lint:swr-baseline` — **重新生成 baseline**（在棘輪鬆綁前用）
- `npm run lint:swr-prune` — **自動移除已修好的條目**（修完一個違規後跑）

### 3. baseline 結構（一個檔多 rule + 一個檔多 violation）

```json
"src/app/(main)/accounting/checks/page.tsx": {
  "venturo/no-direct-supabase-writes": {
    "count": 2
  }
}
```

- 鎖到「檔案 × rule × 次數」
- 同檔同 rule 的 count 變多 → ESLint 抓新增 → 報 error
- 同檔同 rule 的 count 變少 → 修好了、可 prune

---

## 使用方式（給工程師看的）

### 寫新 code 撞到 ESLint error

報錯如下：
```
error  Direct useSWR in page detected — use entity hook instead  venturo/no-direct-useswr-in-pages
```

**正確做法**：
1. 翻 `src/data/entities/*.ts` 找對應 entity hook
2. 沒有 → 補一個（用 `createEntityHook` from `src/data/core/createEntityHook.ts`）
3. 改寫頁面用 entity hook

**不要做的**：
- ❌ 用 `// eslint-disable-next-line` 繞過
- ❌ 手動加 `.eslint-suppressions.json` 凍結

### 修好現有違規

1. 改 code（搬到 entity hook）
2. `npm run lint:swr-prune` → 自動移除該檔該 rule 的 suppression entry
3. commit 含 baseline 更新

### 升新 rule 到 error 級（譬如 form-dialog-loading-required）

1. 改 eslint.config.mjs 把 rule 升 error
2. `npm run lint:swr-baseline`（或對應的 baseline command）→ 凍結現有
3. commit baseline 增量

---

## 未來該升級的 rules（pending decisions）

### 1. `form-dialog-loading-required` — warn → error
- 現況：warn 級、不擋 PR
- 升級成本：對 codebase grep 出 N 處未傳 loading 的 FormDialog、凍結 baseline、升 error
- 風險：低
- 工時：30 分鐘

### 2. 新 rule：`no-svar-in-realtime-handler`
- 用途：防 5/19 useTourEdit 那種 stale closure bug
- 寫法：偵測 `useRealtimeSync` callback 內引用未 ref 的變數
- 工時：3-5 小時（新寫 ESLint rule）

### 3. 新 rule：`no-deprecated-imports`
- 用途：偵測引用已廢的 module（譬如 5/14 已廢的 bot/* 內容）
- 寫法：白名單列已廢 import path
- 工時：1 小時

---

## CI 整合狀態

當前 ci.yml 的 quality job 跑 `npm run lint`、會用 baseline 過濾、只擋新違規。

**要不要把 baseline 變更也加 CI 守門**（防有人手 patch baseline 加新 supression）？

選項：
- **A**：加 check 比對 baseline 跟 main 分支、新 supression 必須有 commit 說明
- **B**：保持現狀（信任 prune + reviewer）

建議 B（避免過度規範）。

---

## ratchet 哲學（給 William 看）

「**抽象層蓋好但沒人用**」這個 5/19 問題、靠 ratchet 解決：
- **不要動現有的 145 違規**：太多、修要 1-2 週工
- **不要再加新違規**：CI 擋
- **慢慢清舊違規**：時間到自然 0

預估 1-2 個月可清光（每週修 10-20 處）。

跟「整個 codebase 砍掉重寫」對比：
- 重寫：3-6 個月、停止新功能
- ratchet：日常工作中漸進清、不影響新功能

**結論**：ratchet 是 SaaS 創業階段的正解。
