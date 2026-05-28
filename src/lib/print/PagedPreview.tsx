'use client'
/**
 * PagedPreview — 用 pagedjs 把 children 渲染成「螢幕分頁」預覽（William 2026-05-28 拍板「最完整」做法）
 *
 * 為什麼存在：原本螢幕預覽是長頁、列印才分頁、使用者看不到實際分頁效果 + 第二頁有沒有 thead。
 * pagedjs 是 CSS Paged Media polyfill，把 HTML 內容**在螢幕上**按 @page 規則切成多張 A4 紙、
 * 每張視覺像一張紙、thead 自動每頁重複、所見即所印。
 *
 * 用法：
 *   <PagedPreview>
 *     <你的列印內容（用 table thead 結構讓 thead 自動重複）/>
 *   </PagedPreview>
 *
 * 技術細節：
 * - dynamic import 避開 SSR（pagedjs 純 browser、操作 DOM）
 * - children 渲染在隱藏 source div（讓 React 正常生命週期、ref 可掛載）
 * - pagedjs Previewer 把 source 的 DOM 內容拷貝、按 @page 切多張 A4、渲染到 preview container
 */

import React, { useEffect, useRef, ReactNode, useState } from 'react'
import { logger } from '@/lib/utils/logger'

interface PagedPreviewProps {
  children: ReactNode
  /** 額外 CSS（譬如 @page 邊距、字型）；不傳則用 pagedjs 預設 + content inline style */
  stylesheets?: string[]
}

export function PagedPreview({ children, stylesheets }: PagedPreviewProps) {
  const sourceRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  // 'rendering' = pagedjs 跑中、'success' = 分頁渲染好、'error' = 失敗
  // 只有 success 才隱藏 source；rendering/error 時 source 顯示 = fallback（至少看得到內容、不分頁）
  const [state, setState] = useState<'rendering' | 'success' | 'error'>('rendering')

  useEffect(() => {
    if (!sourceRef.current || !previewRef.current) return
    let cancelled = false
    setState('rendering')

    void (async () => {
      try {
        // dynamic import 避開 SSR;用 dist/paged.esm.js(已 bundled)避開 webpack 處理 src/ 拿不到 contains helper 的 bug
        // 透過 next.config.ts turbopack.resolveAlias 把 'pagedjs' alias 到 dist/paged.esm.js
        // （package.json exports 沒列 sub-path、不能直接 import('pagedjs/dist/paged.esm.js')）
        const { Previewer } = await import('pagedjs')
        if (cancelled || !sourceRef.current || !previewRef.current) return

        // 清空舊預覽
        previewRef.current.innerHTML = ''

        const previewer = new Previewer()

        // pagedjs preview API：content（HTML string）+ stylesheets + renderTo container
        await previewer.preview(sourceRef.current.innerHTML, stylesheets ?? [], previewRef.current)

        if (!cancelled) setState('success')
      } catch (err) {
        if (!cancelled) {
          logger.error('[PagedPreview] pagedjs render failed', err)
          setState('error')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [children, stylesheets])

  return (
    <>
      {/* source：success 時隱藏（pagedjs preview 顯示分頁版）；rendering / error 時顯示（fallback、至少看得到內容） */}
      <div ref={sourceRef} style={{ display: state === 'success' ? 'none' : 'block' }}>
        {children}
      </div>
      {state === 'rendering' && (
        <div className="text-sm text-morandi-secondary py-2 text-center">分頁渲染中…</div>
      )}
      {state === 'error' && (
        <div className="text-sm text-status-danger py-2 text-center">
          分頁渲染失敗、顯示原始內容（請按列印看實際分頁；console 有錯誤訊息）
        </div>
      )}
      {/* preview：pagedjs 成功時這裡會有切好的多張 A4 紙 */}
      <div ref={previewRef} className="paged-preview" />
    </>
  )
}
