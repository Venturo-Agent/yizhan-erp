'use client'

/**
 * 業務後台 — 展示行程編輯器
 *
 * 路由：/tours/[code]/display-editor
 *
 * 為什麼開獨立路由：
 * - 編輯模式需要全螢幕（toolbar + 主畫面 + 右 panel）、不適合塞在 ContentPageLayout 內
 * - 業務點「進入編輯模式」直接跳這頁、退出就回 /tours/[code]?tab=display-itinerary
 *
 * 設計選擇（William 拍板的「簡化方案」）：
 * - 不做 inline contenteditable（雙向綁定 DOM 跟 state 太脆）
 * - 改右側 panel 結構化編輯：點任何 section / block → panel 表單 → onChange → debounce PUT
 *
 * 載入流程：
 *   1. 同時 fetch tour 跟 display-canvas
 *   2. 如果 API 回 canvas 是 null / 空 {} → 用 buildCanvasFromTour 從 tour 生一份
 *   3. 進入編輯 mode、編輯 → debounced PUT
 *
 * 權限：tours.display-itinerary.write（沒有就顯示「無編輯權限」）
 */

import * as React from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { ModuleLoading } from '@/components/module-loading'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { CanvasRenderer } from '@/components/canvas-renderer'
import { buildCanvasFromTour } from '@/lib/canvas/canvas-from-tour'
import { enrichDailyItinerary } from '@/lib/canvas/enrich-itinerary'
import type {
  TourData,
  CompanyInfo,
  EmployeeInfo,
} from '@/app/(public)/p/tour/[code]/_components/tour-types'
import type { Canvas } from '@/components/canvas-renderer/types'
import { EditorToolbar } from './_components/EditorToolbar'
import { EditorPanel } from './_components/EditorPanel'
import { DeleteBlockDialog } from './_components/DeleteBlockDialog'
import { AiAssistDialog } from './_components/AiAssistDialog'
import {
  deleteBlock,
  findBlock,
  applyAiPatch,
  type SelectionKey,
  type AiPatch,
} from './_components/canvas-utils'
import { useCanvasEditor } from './_hooks/useCanvasEditor'
import {
  fetchDisplayCanvas,
  publishDisplayCanvas,
  unpublishDisplayCanvas,
} from './_hooks/useDisplayCanvasApi'

// ============ Tour + Canvas 載入 ============

interface BootstrapState {
  loading: boolean
  error: string | null
  tour: TourData | null
  initialCanvas: Canvas | null
  initialUpdatedAt: string | null
  initialPublished: boolean
}

// canvas 是否「空殼」（API 回 null / {} 都算空、要走 auto-generate）
function isCanvasEmpty(c: unknown): boolean {
  if (c == null) return true
  if (typeof c !== 'object') return true
  return Object.keys(c as Record<string, unknown>).length === 0
}

function useBootstrap(code: string): BootstrapState {
  const [state, setState] = React.useState<BootstrapState>({
    loading: true,
    error: null,
    tour: null,
    initialCanvas: null,
    initialUpdatedAt: null,
    initialPublished: false,
  })

  React.useEffect(() => {
    let cancelled = false
    if (!code) return
    const run = async () => {
      try {
        // 1. 同時 fetch tour + override
        //
        // 5/17 修：
        //   (a) is_active 從 .eq 改 .not is false → 舊團 null 不會被擋
        //   (b) override API 失敗（migration 沒 apply / 表不存在等）不阻擋整頁、
        //       靜默 fallback 到 auto-generate、業務還能編草稿
        //       原本任何 throw 都會跳到 catch → 變紅錯誤畫面、嚇人
        // 5/17 修：tours.id (text) ↔ itineraries.tour_id (uuid) 型別不一致、嵌入查詢炸
        //       改兩步查 + enrich daily_itinerary
        const [tourRes, overrideRes] = await Promise.all([
          supabase
            .from('tours')
            .select(
              `id, code, departure_date, selling_price_per_person, max_participants,
               current_participants, days_count, airport_code, workspace_id`
            )
            .eq('code', code)
            .not('is_active', 'is', false)
            .maybeSingle(),
          fetchDisplayCanvas(code).catch(err => {
            // 5/17 加：API / 表不存在時、給「空殼 response」讓下面走 auto-generate
            // 不 toast 不擋頁面、靜默 log（業務不用知道後端細節）
            logger.warn('display-canvas API unavailable, fallback to auto-generate', {
              code,
              error: err instanceof Error ? err.message : String(err),
            })
            return {
              canvas: null,
              theme: 'classic' as const,
              published: false,
              published_canvas: null,
              published_at: null,
              updated_at: null,
            }
          }),
        ])

        if (cancelled) return

        if (tourRes.error || !tourRes.data) {
          setState({
            loading: false,
            error: tourRes.error ? `資料庫錯誤：${tourRes.error.message}` : `查不到團號 ${code}`,
            tour: null,
            initialCanvas: null,
            initialUpdatedAt: null,
            initialPublished: false,
          })
          return
        }

        // Step 2: 兩步查 itinerary
        const { data: rawItinerary } = await supabase
          .from('itineraries')
          .select(
            'id, title, subtitle, daily_itinerary, hotels, show_hotels, leader, meeting_info, show_leader_meeting'
          )
          .eq('tour_id', tourRes.data.id)
          .maybeSingle()

        // Step 3: enrich daily — 撈 attractions / hotels 補完描述跟圖
        const rawDaily = (rawItinerary?.daily_itinerary ?? null) as
          | import('@/app/(public)/p/tour/[code]/_components/tour-types').DailyItinerary[]
          | null
        const enrichedDaily = await enrichDailyItinerary(supabase, rawDaily)

        const tour: TourData = {
          ...tourRes.data,
          itinerary: rawItinerary ? { ...rawItinerary, daily_itinerary: enrichedDaily } : null,
        } as TourData

        // 2. 載入公司資訊 + hero image（給 auto-generate 用）
        let companyInfo: CompanyInfo = { name: '旅行社', phone: '' }
        if (tour.workspace_id) {
          const { data: workspace } = await supabase
            .from('workspaces')
            .select('legal_name, phone')
            .eq('id', tour.workspace_id)
            .maybeSingle()
          if (workspace) {
            companyInfo = {
              name: workspace.legal_name || '旅行社',
              phone: workspace.phone || '',
            }
          }
        }
        let heroImage: string | null = null
        if (tour.airport_code) {
          const { data: imageData } = await supabase
            .from('airport_images')
            .select('image_url')
            .eq('airport_code', tour.airport_code)
            .eq('is_default', true)
            .maybeSingle()
          if (imageData?.image_url) heroImage = imageData.image_url
        }

        // 3. 決定初始 canvas
        // - 有 draft canvas 用 draft（業務之前編過）
        // - 沒有就 auto-generate（業務第一次進編輯器）
        const employee: EmployeeInfo | null = null
        const draft = overrideRes.canvas
        const initialCanvas: Canvas = !isCanvasEmpty(draft)
          ? (draft as Canvas)
          : buildCanvasFromTour({ tour, heroImage, employee, companyInfo })

        if (cancelled) return
        setState({
          loading: false,
          error: null,
          tour,
          initialCanvas,
          initialUpdatedAt: overrideRes.updated_at,
          initialPublished: overrideRes.published,
        })
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : '載入失敗'
        logger.error('display-editor bootstrap failed', err)
        setState({
          loading: false,
          error: message,
          tour: null,
          initialCanvas: null,
          initialUpdatedAt: null,
          initialPublished: false,
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [code])

  return state
}

// ============ Main Page ============

export default function TourDisplayEditorPage() {
  const params = useParams()
  const rawCode = params.code as string
  const code = rawCode ? decodeURIComponent(rawCode) : ''

  const { has, loading: capLoading } = useMyCapabilities()

  // 等 capability 載入完
  if (capLoading) {
    return <ModuleLoading />
  }
  // 沒寫權限：擋
  if (!has(CAPABILITIES.TOURS_DISPLAY_ITINERARY_WRITE)) {
    return <UnauthorizedPage message="您沒有展示行程編輯權限" />
  }

  return <EditorBody code={code} />
}

function EditorBody({ code }: { code: string }) {
  const bootstrap = useBootstrap(code)

  if (bootstrap.loading) {
    return <ModuleLoading />
  }
  if (bootstrap.error || !bootstrap.initialCanvas) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          color: 'var(--morandi-secondary)',
        }}
      >
        <div>{bootstrap.error ?? '無法載入 Canvas'}</div>
      </div>
    )
  }

  return (
    <EditorReady
      code={code}
      initialCanvas={bootstrap.initialCanvas}
      initialUpdatedAt={bootstrap.initialUpdatedAt}
      initialPublished={bootstrap.initialPublished}
    />
  )
}

interface EditorReadyProps {
  code: string
  initialCanvas: Canvas
  initialUpdatedAt: string | null
  initialPublished: boolean
}

function EditorReady({
  code,
  initialCanvas,
  initialUpdatedAt,
  initialPublished,
}: EditorReadyProps) {
  const { canvas, setCanvas, saveStatus, flushNow } = useCanvasEditor({
    code,
    initialCanvas,
    initialUpdatedAt,
  })

  const [published, setPublished] = React.useState<boolean>(initialPublished)
  const [publishLoading, setPublishLoading] = React.useState<boolean>(false)
  const [unpublishLoading, setUnpublishLoading] = React.useState<boolean>(false)
  const [selection, setSelection] = React.useState<SelectionKey | null>(
    initialCanvas.sections.some(s => s.type === 'cover') ? { kind: 'cover' } : null
  )
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = React.useState<boolean>(false)
  const [showAiDialog, setShowAiDialog] = React.useState(false)

  const handlePublish = async () => {
    if (publishLoading) return
    setPublishLoading(true)
    try {
      // 先把 pending 草稿寫掉、避免發布到舊草稿
      await flushNow()
      const res = await publishDisplayCanvas(code)
      setPublished(res.published)
      toast.success(published ? '已重新發布' : '已發布、客人可看到最新版本')
    } catch (err) {
      const message = err instanceof Error ? err.message : '發布失敗'
      logger.error('display-canvas publish failed', err)
      toast.error(`發布失敗：${message}`)
    } finally {
      setPublishLoading(false)
    }
  }

  const handleUnpublish = async () => {
    if (unpublishLoading) return
    setUnpublishLoading(true)
    try {
      const res = await unpublishDisplayCanvas(code)
      setPublished(res.published)
      toast.success('已取消發布、客人連結會回到舊版本')
    } catch (err) {
      const message = err instanceof Error ? err.message : '取消發布失敗'
      logger.error('display-canvas unpublish failed', err)
      toast.error(`取消發布失敗：${message}`)
    } finally {
      setUnpublishLoading(false)
    }
  }

  const handleConfirmDelete = () => {
    if (!pendingDeleteId || !canvas) return
    setDeleteLoading(true)
    try {
      const next = deleteBlock(canvas, pendingDeleteId)
      setCanvas(next)
      // 如果剛刪的就是 selection、清掉避免 form 找不到
      if (selection?.kind === 'block' && selection.blockId === pendingDeleteId) {
        setSelection(null)
      }
      setPendingDeleteId(null)
      toast.success('已刪除（會在下次發布生效）')
    } finally {
      setDeleteLoading(false)
    }
  }

  const pendingDeleteLabel = React.useMemo(() => {
    if (!pendingDeleteId || !canvas) return ''
    const hit = findBlock(canvas, pendingDeleteId)
    if (!hit) return ''
    return `${hit.block.type} block`
  }, [pendingDeleteId, canvas])

  // 防呆：canvas 從 hook 出來可能短暫為 null（換 tour 時）、這頁不會碰到、但 TS 要 narrow
  if (!canvas) {
    return <ModuleLoading />
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--background, #faf7f3)',
      }}
    >
      <EditorToolbar
        code={code}
        saveStatus={saveStatus}
        published={published}
        publishLoading={publishLoading}
        unpublishLoading={unpublishLoading}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onAiAssist={() => setShowAiDialog(true)}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* 主畫面：渲染 canvas（不啟用 contentEditable） */}
        <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
          <CanvasRenderer canvas={canvas} />
        </main>

        {/* 右側結構化編輯 panel */}
        <EditorPanel
          canvas={canvas}
          selection={selection}
          onSelect={setSelection}
          onChange={setCanvas}
          onRequestDeleteBlock={id => setPendingDeleteId(id)}
        />
      </div>

      <DeleteBlockDialog
        open={Boolean(pendingDeleteId)}
        blockLabel={pendingDeleteLabel}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      {showAiDialog && (
        <AiAssistDialog
          code={code}
          canvas={canvas}
          onApply={(workingCanvas: Canvas, patches: AiPatch[]) => {
            // workingCanvas 已含「亮點升級」的結構改動（沒升級就 === 原 canvas）
            // 在它之上依序套 AI 文案 patch、一次更新頁面 canvas state
            let next = workingCanvas
            for (const patch of patches) {
              next = applyAiPatch(next, patch)
            }
            setCanvas(next)
          }}
          onClose={() => setShowAiDialog(false)}
        />
      )}
    </div>
  )
}
