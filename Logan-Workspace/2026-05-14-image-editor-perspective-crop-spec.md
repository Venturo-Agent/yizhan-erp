---
title: ImageEditor 視角拖移 + 完整畫面編輯感 spec
created: 2026-05-14
owner: Max（男僕）
status: 開工中
related: [[2026-05-14-帳單系統-客戶自助付款-CRM-spec]]
---

# ImageEditor 視角拖移 + 完整畫面編輯感

> William 2026-05-14 拍板開工。
> 動 `src/components/ui/image-editor/`（中央 module）— 寫卡同步執事長、避免撞車。

## 為什麼

William 反映：「現有截圖功能比較像放大之後再去存檔、缺乏畫面編輯的感覺」。

Step 2 retro 確認：
- ✅ ImageEditor 全站只一套（PassportUploadZone 批次 / PassportSection 單個都用同一個）
- ✅ cropImage 真合成（旋轉 + 翻轉 + 色彩調整 + 裁切都套進輸出 blob、不是 viewport 截圖）
- ⚠️ **但 UX 缺**：沒有可見裁切框 / 沒有 4 角拖曳 / 沒有 perspective / aspect ratio 寫死 prop

旅遊 ERP 接收的護照常常拍歪、有透視。一次調好、後續所有列印 / 報關 / 客服 demo 都受惠。

## 範圍

**動的檔**：
- `src/components/ui/image-editor/types.ts` — 擴 settings
- `src/components/ui/image-editor/image-utils.ts` — 加 perspectiveCropImage
- `src/components/ui/image-editor/ImageEditor.tsx` — 整合、收舊 viewport scale/drag
- 新檔 `src/components/ui/image-editor/CropFrame.tsx` — 4 角拖曳 UI

**不動的檔**：
- 訂單頁兩個 caller（PassportUploadZone / PassportSection）— ImageEditor props 簽章不變、caller 透明

## 設計

### 雙模式（共用 4 角拖曳 UI）

```
[裁切模式] crop          ←→   [視角校正] perspective
4 角侷限矩形                  4 角自由動
輸出 = 裁切 + 已套色          輸出 = perspective 反變換 → 矩形
aspect ratio toggle 可用      aspect ratio 不適用
```

### state 擴展

```ts
interface ImageEditorSettings {
  // 既有
  scale, x, y, rotation, flipH, adjustments

  // 新增
  mode: 'crop' | 'perspective'
  cornerOffsets: {
    tl: { x: number; y: number }  // 0-100% 相對原圖
    tr: { x: number; y: number }
    br: { x: number; y: number }
    bl: { x: number; y: number }
  }
  cropAspectRatio: 'free' | '3:2' | '4:3'
}
```

### perspective math

CSS 預覽：4 點 → matrix3d（用 numeric.js 風格手寫 8x8 線性方程組解 8 unknowns、不引外部 lib）

Canvas 輸出：對 4 點反推 → 用 perspective transform 把梯形 region 拉回矩形

實作參考：標準的 4-point homography（單應矩陣）、所有資料 Claude 訓練集裡都有、不踩雷。

### 收掉的舊行為

- 滾輪 scale → 砍（cropFrame 取代縮放概念）
- 拖曳 viewport（move scroll）→ 砍（cornerOffsets 取代）
- aspectRatio prop 寫死 → 改 settings.cropAspectRatio user 自選

### caller 影響

`PassportUploadZone.tsx` / `PassportSection.tsx` props 不變（仍傳 imageSrc / onCropAndSave / 可選 aspectRatio）— 內部把 prop aspectRatio 當「初始 cropAspectRatio」、user 可改。

## 工程量

8-10 hr 拆 6 sub-step（task tracker #18-23）：
1. state + math（2 hr）
2. CropFrame UI（2 hr）
3. mode + aspect toggle（1 hr）
4. perspectiveCropImage（2 hr）
5. ImageEditor 整合 + 收舊 code（1.5 hr）
6. 驗證 + commit（30 min）

## 紅線檢核

| 紅線 | 對齊 |
|---|---|
| 不刪 William 檔案（#8） | 只擴 ImageEditor、不刪舊檔 |
| 不過度抽象 | 新檔 CropFrame 第二個用、夠抽（裁切框未來其他編輯場景可重用） |
| 沒 console.log / no-any | check-standards.sh 守 |

## 對齊現有

- 跟 [[2026-05-14-帳單系統-客戶自助付款-CRM-spec]] 無 schema 衝突（不動 DB）
- 跟 Robin AI Hub 工作（in-progress）無檔案衝突（不動 sidebar / permissions / modules）
- 動到的檔案範圍：`src/components/ui/image-editor/*` + 新建 1 個 component、不踩其他 session 領地
