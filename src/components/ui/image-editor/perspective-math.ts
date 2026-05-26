/**
 * Perspective transform 數學工具 — 4-point homography
 *
 * 給 4 對 (源點、目標點)、解一個 3x3 矩陣 H、使得齊次座標下：
 *   [u, v, 1]^T = H [x, y, 1]^T
 *
 * 用途：
 * - CSS 預覽：把 4 角拖到任意位置 → 算出 matrix3d 套在 <img> 上
 * - Canvas 輸出：4 角座標反推、用 transform 把梯形區域拉回矩形
 *
 * 不引外部 lib（自寫 Gauss elimination 解 8x8 線性方程組）。
 */

import type { CornerPoint, CornerOffsets } from './types'

export type Homography = number[] // length 9, row-major (h11, h12, h13, h21, h22, h23, h31, h32, h33)

/**
 * 解 4-point homography
 *
 * 設 h33 = 1、剩 8 個 unknowns。
 * 對每對點 (x_i, y_i) → (u_i, v_i)、列 2 條線性方程：
 *   h11*x + h12*y + h13 - u*h31*x - u*h32*y = u
 *   h21*x + h22*y + h23 - v*h31*x - v*h32*y = v
 * 共 8 條方程、8 個 unknowns、用 Gauss-Jordan 消元法解。
 */
export function solveHomography(
  src: [CornerPoint, CornerPoint, CornerPoint, CornerPoint],
  dst: [CornerPoint, CornerPoint, CornerPoint, CornerPoint]
): Homography {
  // 8x9 augmented matrix [A | b]
  const M: number[][] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i]
    const { x: u, y: v } = dst[i]
    // h11, h12, h13, h21, h22, h23, h31, h32 | u
    M.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u])
    // h11, h12, h13, h21, h22, h23, h31, h32 | v
    M.push([0, 0, 0, x, y, 1, -v * x, -v * y, v])
  }

  // Gauss-Jordan elimination
  for (let i = 0; i < 8; i++) {
    // Pivot: find max absolute value in column i below row i
    let maxRow = i
    for (let k = i + 1; k < 8; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k
    }
    if (maxRow !== i) {
      ;[M[i], M[maxRow]] = [M[maxRow], M[i]]
    }
    // Singular check (退化矩陣、4 點共線時會發生)
    if (Math.abs(M[i][i]) < 1e-10) {
      // 回傳 identity 當 fallback、避免 NaN 炸 UI
      return [1, 0, 0, 0, 1, 0, 0, 0, 1]
    }
    // Normalize row i
    const pivot = M[i][i]
    for (let j = i; j < 9; j++) M[i][j] /= pivot
    // Eliminate other rows
    for (let k = 0; k < 8; k++) {
      if (k === i) continue
      const factor = M[k][i]
      if (factor === 0) continue
      for (let j = i; j < 9; j++) M[k][j] -= factor * M[i][j]
    }
  }

  return [M[0][8], M[1][8], M[2][8], M[3][8], M[4][8], M[5][8], M[6][8], M[7][8], 1]
}

/**
 * 把 homography 轉成 CSS matrix3d 字串
 *
 * CSS matrix3d 是 4x4 column-major、我們的 H 是 3x3 row-major。
 * 對應方式（CSS 不使用 z 維、把 z column/row 設成 identity）：
 *   [ h11 h12 0 h13 ]
 *   [ h21 h22 0 h23 ]
 *   [ 0   0   1 0   ]
 *   [ h31 h32 0 1   ]
 * 然後 column-major flatten。
 */
export function homographyToCSSMatrix3d(H: Homography): string {
  const [h11, h12, h13, h21, h22, h23, h31, h32, h33] = H
  // column-major: col0 col1 col2 col3
  const m = [
    h11,
    h21,
    0,
    h31, // col 0
    h12,
    h22,
    0,
    h32, // col 1
    0,
    0,
    1,
    0, // col 2
    h13,
    h23,
    0,
    h33, // col 3
  ]
  return `matrix3d(${m.join(',')})`
}

/**
 * 計算 CSS transform：Photoshop Distort 風格、拉 4 角讓圖跟著變形。
 *
 * 5/14 第二輪：William「先訂一個邊往外拉、圖片就開始變形」=
 * forward transform：把整張圖 (0,0)-(W,H) 變形到拖到的位置（梯形）。
 *
 * 退化保護：
 *   - viewport 太小（<10px）→ 回 identity（避免 ResizeObserver 還沒測量好、圖縮成 0px 變黑）
 *   - 4 角共線 → solveHomography 已 fallback identity
 */
export function cornerOffsetsToPreviewMatrix(
  cornerOffsets: CornerOffsets,
  viewportWidth: number,
  viewportHeight: number
): string {
  if (viewportWidth < 10 || viewportHeight < 10) {
    return 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)'
  }
  // 源點：原圖 4 角（佔 viewport 全範圍）
  const src: [CornerPoint, CornerPoint, CornerPoint, CornerPoint] = [
    { x: 0, y: 0 },
    { x: viewportWidth, y: 0 },
    { x: viewportWidth, y: viewportHeight },
    { x: 0, y: viewportHeight },
  ]
  // 目標點：cornerOffsets 換算成像素（user 拖到的位置）
  const dst: [CornerPoint, CornerPoint, CornerPoint, CornerPoint] = [
    {
      x: (cornerOffsets.tl.x / 100) * viewportWidth,
      y: (cornerOffsets.tl.y / 100) * viewportHeight,
    },
    {
      x: (cornerOffsets.tr.x / 100) * viewportWidth,
      y: (cornerOffsets.tr.y / 100) * viewportHeight,
    },
    {
      x: (cornerOffsets.br.x / 100) * viewportWidth,
      y: (cornerOffsets.br.y / 100) * viewportHeight,
    },
    {
      x: (cornerOffsets.bl.x / 100) * viewportWidth,
      y: (cornerOffsets.bl.y / 100) * viewportHeight,
    },
  ]
  const H = solveHomography(src, dst)
  return homographyToCSSMatrix3d(H)
}

/**
 * 把單點套上 homography（齊次座標）
 *
 * [u, v, w]^T = H [x, y, 1]^T → (u/w, v/w)
 */
export function applyHomographyToPoint(H: Homography, p: CornerPoint): CornerPoint {
  const [h11, h12, h13, h21, h22, h23, h31, h32, h33] = H
  const w = h31 * p.x + h32 * p.y + h33
  if (Math.abs(w) < 1e-10) return { x: 0, y: 0 }
  return {
    x: (h11 * p.x + h12 * p.y + h13) / w,
    y: (h21 * p.x + h22 * p.y + h23) / w,
  }
}

/**
 * 4 角是否「足夠像矩形」— 用來判斷 perspective 模式下是否需要 perspective 合成
 *
 * 容許 0.5% 偏差（避免浮點數比較）。
 */
export function isCornersRectangular(c: CornerOffsets): boolean {
  const tol = 0.5
  return (
    Math.abs(c.tl.y - c.tr.y) < tol &&
    Math.abs(c.bl.y - c.br.y) < tol &&
    Math.abs(c.tl.x - c.bl.x) < tol &&
    Math.abs(c.tr.x - c.br.x) < tol
  )
}
