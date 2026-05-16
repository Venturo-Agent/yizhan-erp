/**
 * ImageEditor 類型定義
 */

/**
 * 圖片色彩調整設定（Lightroom 風格）
 * 所有數值範圍為 -100 到 100，0 為預設值
 */
export interface ImageAdjustments {
  exposure: number
  contrast: number
  highlights: number
  shadows: number
  clarity: number
  saturation: number
  temperature: number
  tint: number
  vignette: number
}

/** 一個角的座標（百分比 0-100，相對於原圖整個範圍） */
export interface CornerPoint {
  x: number
  y: number
}

/** 裁切框 4 角座標 — crop 模式 4 角侷限矩形，perspective 模式 4 角自由 */
export interface CornerOffsets {
  tl: CornerPoint
  tr: CornerPoint
  br: CornerPoint
  bl: CornerPoint
}

/** 編輯模式 */
export type EditorMode = 'crop' | 'perspective'

export interface ImageEditorSettings {
  /** 縮放倍率（保留向後相容、新版改用 cornerOffsets） */
  scale: number
  /** 位置 X (0-100、保留向後相容） */
  x: number
  /** 位置 Y (0-100、保留向後相容） */
  y: number
  /** 旋轉角度 (0, 90, 180, 270) — 90° 增量 */
  rotation: number
  /** 水平翻轉 */
  flipH: boolean
  /** 水平微調 (-45 ~ +45 度) — 拉桿微調水平校正、跟 90° rotation 相加套用 */
  fineRotation: number
  /** 色彩調整 */
  adjustments: ImageAdjustments

  /** 編輯模式：裁切矩形 vs 視角校正梯形 */
  mode: EditorMode
  /** 4 角座標（百分比、相對原圖） */
  cornerOffsets: CornerOffsets
}

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  clarity: 0,
  vignette: 0,
}

/** crop 模式預設：4 角貼齊圖邊（=「整張圖、還沒框」、滑鼠 drag 才開新框） */
export const DEFAULT_CORNER_OFFSETS: CornerOffsets = {
  tl: { x: 0, y: 0 },
  tr: { x: 100, y: 0 },
  br: { x: 100, y: 100 },
  bl: { x: 0, y: 100 },
}

/** perspective 模式預設：4 角在 inner 15-85、圖立即套 forward transform 縮到 inner
 *  user 看到「圖縮小留 padding」、可以拖 4 角到 viewport 邊緣 = 把圖往外拉變形
 *  跟 William「先讓畫面縮小、然後才能去拉」期望一致 */
export const DEFAULT_PERSPECTIVE_CORNER_OFFSETS: CornerOffsets = {
  tl: { x: 15, y: 15 },
  tr: { x: 85, y: 15 },
  br: { x: 85, y: 85 },
  bl: { x: 15, y: 85 },
}

export const DEFAULT_SETTINGS: ImageEditorSettings = {
  scale: 1,
  x: 50,
  y: 50,
  rotation: 0,
  flipH: false,
  fineRotation: 0,
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  mode: 'crop',
  cornerOffsets: { ...DEFAULT_CORNER_OFFSETS },
}

