# tour_attributes 升級到 5/5 計劃

## 當前分數：4/5（讀取✅ 資安✅ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度         | 現狀 | 具體缺口                                                                           |
| ------------ | ---- | ---------------------------------------------------------------------------------- |
| **讀取效能** | ✅   | tour_attributes module 用 `useTourAttributes` 或等效 entity；itineraries entity 有 |
| **資安**     | ✅   | RLS/FK 完整                                                                        |
| **架構**     | ✅   | L1-L6 全過                                                                         |
| **開發品管** | ⚠️   | tour_attributes 無 e2e；addon module lint 有 suppress                              |
| **清理**     | ⚠️   | tour_attributes 是 addon；dead code 待確認；但相對獨立、影響小                     |

---

## 升 5/5 具體 actions

### 🟡 Action A（品管 e2e）

**缺口**：tour_attributes 無 e2e。

**修法**：
`tests/e2e/tour-attributes.spec.ts`：

```
建立 tour attribute（如：城市、語言、等級）→
確認出現在下拉選單 →
關聯到 tour →
確認 tour 詳細頁正確顯示 attribute
```

**預估工時**：2 小時
**預期難度**：🟡 中

---

### 🟡 Action B（清理）

**缺口**：addon 狀態待 knip 確認。

**修法**：

1. knip 跑 tour_attributes 相關
2. 確認無閒置 route

**預估工時**：30 分鐘
**預期難度**：低

---

## 總工時

**2.5 小時**。Addon module，工時少。

---

## 預期難度

🟢 低。

---

## 推薦執行順序

1. **Action A**：e2e（2 小時）
2. **Action B**：清理（30 分鐘）

---

_Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push_
