# marketing 升級到 5/5 計劃

## 當前分數：4/5（讀取✅ 資安✅ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度 | 現狀 | 具體缺口 |
|---|---|---|
| **讀取效能** | ✅ | marketing/website page.tsx 有；`website-tours.ts` entity hook 有 |
| **資安** | ✅ | marketing 是 Corner 官網；workspace_id guard 有 |
| **架構** | ✅ | L1-L6 全過；marketing 是 5/20 新 module |
| **開發品管** | ⚠️ | marketing 無 e2e（新 module 相對新）；`website-tours.ts` entity 是牛步（Pass 1 supplement 做一半）|
| **清理** | ⚠️ | `website-tours.ts` entity 是牛步；marketing 是新 module、dead code 不多 |

---

## 升 5/5 具體 actions

### 🟡 Action A（品管 e2e）

**缺口**：marketing 無 e2e（新 module）。

**修法**：
`tests/e2e/marketing-website.spec.ts`：
```
打開官網 → 確認網站 tour 列表正確顯示 →
點擊 tour → 確認詳細頁正確載入 →
確認 workspace 切換後網站內容跟著換（如果是多租戶 SaaS）
```

**預估工時**：2 小時
**預期難度**：🟡 中

---

### 🟡 Action B（讀取效能 — 補完 website-tours entity）

**缺口**：`website-tours.ts` entity 是牛步（Pass 1 supplement 有記錄）。

**修法**：
1. 確認 `src/data/entities/website-tours.ts` 實際狀態（是否存在、完整度）
2. 如果存在且完整 → 從牛步移至完成
3. 如果不完整 → 完成 entity hook

**影響檔**：`src/data/entities/website-tours.ts` + `src/app/(main)/marketing/website/page.tsx`
**預估工時**：2-3 小時
**預期難度**：🟡 中

---

### 🟡 Action C（清理）

**缺口**：marketing 是新 module，dead code 不多。

**修法**：
1. knip 跑 `workspace/健檢/reports/` marketing 相關
2. 確認 `.eslint-suppressions.json` 中 marketing entries

**預估工時**：30 分鐘
**預期難度**：低

---

## 總工時

**4-5 小時**。Marketing 是新 module，工時不多。

---

## 預期難度

🟡 中低。新 module 問題少，性價比高。

---

## 推薦執行順序

1. **Action B**：先確認 website-tours entity 狀態（30 分鐘診斷）
2. **Action A**：e2e 補上
3. **Action C**：最後清理

---

*Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push*