'use client'

/**
 * 展示行程 Tab — 左右雙欄編輯器（5/18 William 拍板）
 *
 * 設計思路：
 * - 有 TOURS_DISPLAY_ITINERARY_WRITE：左=預覽 / 右=EditorPanel，不跳另一頁
 * - 無編輯權限：維持全寬唯讀預覽
 *
 * 載入流程：
 *   1. 同時等 capabilities + canvas 載入（避免一閃而過的 read-only → edit 切換）
 *   2. canvas 優先用草稿版（API 回 canvas 欄）、沒有就 auto-generate
 */

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ExternalLink, Copy, Check, Sparkles, ClipboardList, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { ModuleLoading } from '@/components/module-loading'
import { CanvasRenderer } from '@/components/canvas-renderer'
import type { Canvas } from '@/components/canvas-renderer'
import { buildCanvasFromTour } from '@/lib/canvas/canvas-from-tour'
import { enrichDailyItinerary } from '@/lib/canvas/enrich-itinerary'
import type {
  TourData,
  EmployeeInfo,
  CompanyInfo,
} from '@/app/(public)/p/tour/[code]/_components/tour-types'
import type { Tour } from '@/stores/types'
import { useCanvasEditor } from '../[code]/display-editor/_hooks/useCanvasEditor'
import type { SaveStatus } from '../[code]/display-editor/_hooks/useCanvasEditor'
import {
  fetchDisplayCanvas,
  publishDisplayCanvas,
  unpublishDisplayCanvas,
} from '../[code]/display-editor/_hooks/useDisplayCanvasApi'
import { EditorPanel } from '../[code]/display-editor/_components/EditorPanel'
import { DeleteBlockDialog } from '../[code]/display-editor/_components/DeleteBlockDialog'
import { AiAssistDialog } from '../[code]/display-editor/_components/AiAssistDialog'
import {
  deleteBlock,
  findBlock,
  applyAiPatch,
} from '../[code]/display-editor/_components/canvas-utils'
import type { SelectionKey, AiPatch } from '../[code]/display-editor/_components/canvas-utils'

// ── Props ─────────────────────────────────────────────────

interface TourDisplayItineraryTabProps {
  tour: Tour
}

// ── Bootstrap ─────────────────────────────────────────────

interface BootstrapState {
  loading: boolean
  error: string | null
  canvas: Canvas | null
  updatedAt: string | null
  published: boolean
}

function isCanvasEmpty(c: unknown): boolean {
  if (c == null) return true
  if (typeof c !== 'object') return true
  return Object.keys(c as Record<string, unknown>).length === 0
}

function useBootstrap(code: string): BootstrapState {
  const [state, setState] = useState<BootstrapState>({
    loading: true,
    error: null,
    canvas: null,
    updatedAt: null,
    published: false,
  })

  useEffect(() => {
    if (!code) return
    let cancelled = false
    setState({ loading: true, error: null, canvas: null, updatedAt: null, published: false })

    const run = async () => {
      try {
        // Step 1: 同時拉草稿 canvas + tour 基本資料
        const [overrideRes, tourRes] = await Promise.all([
          fetchDisplayCanvas(code).catch(err => {
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
          supabase
            .from('tours')
            .select(
              `id, code, departure_date, selling_price_per_person, max_participants,
               current_participants, days_count, airport_code, workspace_id`
            )
            .eq('code', code)
            .not('is_active', 'is', false)
            .maybeSingle(),
        ])

        if (cancelled) return

        if (tourRes.error || !tourRes.data) {
          setState({
            loading: false,
            error: tourRes.error ? `資料庫錯誤：${tourRes.error.message}` : `查不到團號 ${code}`,
            canvas: null,
            updatedAt: null,
            published: false,
          })
          return
        }

        // Step 2: 草稿存在就直接用、不走 auto-generate
        if (!isCanvasEmpty(overrideRes.canvas)) {
          if (cancelled) return
          setState({
            loading: false,
            error: null,
            canvas: overrideRes.canvas!,
            updatedAt: overrideRes.updated_at,
            published: overrideRes.published,
          })
          return
        }

        // Step 3: Auto-generate fallback（兩步查 itinerary）
        const { data: itineraryData, error: itinErr } = await supabase
          .from('itineraries')
          .select('id, title, subtitle, daily_itinerary, hotels')
          .eq('tour_id', tourRes.data.id)
          .maybeSingle()

        if (cancelled) return

        if (itinErr) {
          logger.warn('itinerary fetch failed', { code, error: itinErr.message })
        }

        const rawDaily = (itineraryData?.daily_itinerary ?? null) as
          | import('@/app/(public)/p/tour/[code]/_components/tour-types').DailyItinerary[]
          | null
        const enrichedDaily = await enrichDailyItinerary(supabase, rawDaily)

        const tourData: TourData = {
          ...tourRes.data,
          itinerary: itineraryData ? { ...itineraryData, daily_itinerary: enrichedDaily } : null,
        } as TourData

        let heroImage: string | null = null
        if (tourRes.data.airport_code) {
          const { data: imageData } = await supabase
            .from('airport_images')
            .select('image_url')
            .eq('airport_code', tourRes.data.airport_code)
            .eq('is_default', true)
            .maybeSingle()
          if (imageData?.image_url) heroImage = imageData.image_url
        }

        let companyInfo: CompanyInfo = { name: '旅行社', phone: '' }
        if (tourRes.data.workspace_id) {
          const { data: workspace } = await supabase
            .from('workspaces')
            .select('legal_name, phone')
            .eq('id', tourRes.data.workspace_id)
            .maybeSingle()
          if (workspace) {
            companyInfo = {
              name: workspace.legal_name || '旅行社',
              phone: workspace.phone || '',
            }
          }
        }

        const employee: EmployeeInfo | null = null
        const generatedCanvas = buildCanvasFromTour({
          tour: tourData,
          heroImage,
          employee,
          companyInfo,
        })

        if (cancelled) return
        setState({
          loading: false,
          error: null,
          canvas: generatedCanvas,
          updatedAt: overrideRes.updated_at,
          published: overrideRes.published,
        })
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : '載入失敗'
        logger.error('display-itinerary-tab bootstrap failed', err)
        setState({
          loading: false,
          error: message,
          canvas: null,
          updatedAt: null,
          published: false,
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

// ── Main Tab ──────────────────────────────────────────────

export function TourDisplayItineraryTab({ tour }: TourDisplayItineraryTabProps) {
  const { has, loading: capLoading } = useMyCapabilities()
  const bootstrap = useBootstrap(tour.code)
  const [copied, setCopied] = useState(false)

  const previewPath = `/p/tour/${tour.code}/canvas`
  const fullUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${previewPath}` : previewPath

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      toast.success('已複製連結')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('複製失敗')
    }
  }

  const handleOpen = () => {
    window.open(previewPath, '_blank')
  }

  if (bootstrap.loading || capLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <ModuleLoading />
      </div>
    )
  }

  if (bootstrap.error || !bootstrap.canvas) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">{bootstrap.error ?? '無法載入預覽'}</p>
      </div>
    )
  }

  const canEdit = has(CAPABILITIES.TOURS_DISPLAY_ITINERARY_WRITE)

  if (canEdit) {
    return (
      <EditorView
        code={tour.code}
        initialCanvas={bootstrap.canvas}
        initialUpdatedAt={bootstrap.updatedAt}
        initialPublished={bootstrap.published}
        copied={copied}
        onCopy={handleCopy}
        onOpen={handleOpen}
      />
    )
  }

  // 無編輯權限：唯讀預覽
  return (
    <div className="flex flex-col gap-2">
      <ReadOnlyToolbar copied={copied} onCopy={handleCopy} onOpen={handleOpen} />
      <CanvasRenderer canvas={bootstrap.canvas} />
    </div>
  )
}

// ── Read-only toolbar ─────────────────────────────────────

function ReadOnlyToolbar({
  copied,
  onCopy,
  onOpen,
}: {
  copied: boolean
  onCopy: () => void
  onOpen: () => void
}) {
  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 pb-2 bg-background">
      <Button variant="outline" onClick={onCopy} className="gap-2">
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        {copied ? '已複製' : '複製連結'}
      </Button>
      <Button variant="outline" onClick={onOpen} className="gap-2">
        <ExternalLink className="h-4 w-4" />
        新分頁開啟
      </Button>
    </div>
  )
}

// ── Save status badge ─────────────────────────────────────

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  const variants: Record<SaveStatus, { label: string; className: string }> = {
    saved: { label: '已儲存 ✓', className: 'text-green-600' },
    pending: { label: '未儲存 ●', className: 'text-amber-500' },
    saving: { label: '儲存中⋯', className: 'text-amber-500' },
    error: { label: '儲存失敗 ●', className: 'text-red-500' },
  }
  const v = variants[status]
  return <span className={`text-xs font-medium tabular-nums ${v.className}`}>{v.label}</span>
}

// ── Editor view ───────────────────────────────────────────

interface EditorViewProps {
  code: string
  initialCanvas: Canvas
  initialUpdatedAt: string | null
  initialPublished: boolean
  copied: boolean
  onCopy: () => void
  onOpen: () => void
}

function EditorView({
  code,
  initialCanvas,
  initialUpdatedAt,
  initialPublished,
  copied,
  onCopy,
  onOpen,
}: EditorViewProps) {
  const { canvas, setCanvas, saveStatus, flushNow } = useCanvasEditor({
    code,
    initialCanvas,
    initialUpdatedAt,
  })

  const [published, setPublished] = useState(initialPublished)
  const [publishLoading, setPublishLoading] = useState(false)
  const [unpublishLoading, setUnpublishLoading] = useState(false)
  const [selection, setSelection] = useState<SelectionKey | null>(
    initialCanvas.sections.some(s => s.type === 'cover') ? { kind: 'cover' } : null
  )
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showAiDialog, setShowAiDialog] = useState(false)

  const handlePublish = async () => {
    if (publishLoading) return
    setPublishLoading(true)
    try {
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
      toast.success('已取消發布')
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
      if (selection?.kind === 'block' && selection.blockId === pendingDeleteId) {
        setSelection(null)
      }
      setPendingDeleteId(null)
      toast.success('已刪除（下次發布生效）')
    } finally {
      setDeleteLoading(false)
    }
  }

  const pendingDeleteLabel = useMemo(() => {
    if (!pendingDeleteId || !canvas) return ''
    const hit = findBlock(canvas, pendingDeleteId)
    return hit ? `${hit.block.type} block` : ''
  }, [pendingDeleteId, canvas])

  if (!canvas) return <ModuleLoading />

  return (
    <div className="flex flex-col">
      {/* ─── Toolbar ─── */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 pb-2 bg-background border-b border-border">
        {/* 儲存狀態 */}
        <SaveStatusBadge status={saveStatus} />

        <div className="mx-1 h-5 w-px bg-border" />

        {/* AI 助理 */}
        <Button variant="outline" onClick={() => setShowAiDialog(true)} className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI 助理
        </Button>

        {/* 複製連結 */}
        <Button variant="outline" onClick={onCopy} className="gap-2">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          {copied ? '已複製' : '複製連結'}
        </Button>

        {/* 新分頁開啟 */}
        <Button variant="outline" onClick={onOpen} className="gap-2">
          <ExternalLink className="h-4 w-4" />
          新分頁開啟
        </Button>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* 連結效期 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Clock className="h-4 w-4" />
              連結效期
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">設定連結效期</h4>
              <p className="text-xs text-muted-foreground">
                目前連結永久有效。一次性連結（24h / 72h / 7 日）即將推出。
              </p>
              <div className="space-y-1.5">
                <Button variant="outline" size="sm" disabled className="w-full justify-start">
                  24 小時後過期
                </Button>
                <Button variant="outline" size="sm" disabled className="w-full justify-start">
                  72 小時後過期
                </Button>
                <Button variant="outline" size="sm" disabled className="w-full justify-start">
                  7 日後過期
                </Button>
                <Button variant="outline" size="sm" disabled className="w-full justify-start">
                  永久有效（預設）
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* 報名表 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              報名表
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">客戶報名表</h4>
              <p className="text-xs text-muted-foreground">
                客戶可在展示行程頁面直接填寫報名資料。即將推出。
              </p>
              <Button variant="outline" size="sm" disabled className="w-full">
                建立報名表（即將推出）
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* 發布 */}
        {published && (
          <Button variant="outline" onClick={handleUnpublish} disabled={unpublishLoading}>
            {unpublishLoading ? '處理中⋯' : '取消發布'}
          </Button>
        )}
        <Button onClick={handlePublish} disabled={publishLoading}>
          {publishLoading ? '發布中⋯' : published ? '重新發布' : '發布'}
        </Button>
      </div>

      {/* ─── 雙欄主體 ─── */}
      <div className="flex min-h-0">
        {/* 左：展示區（預覽） */}
        <div className="flex-1 min-w-0">
          <CanvasRenderer canvas={canvas} />
        </div>

        {/* 右：編輯 panel */}
        <EditorPanel
          canvas={canvas}
          selection={selection}
          onSelect={setSelection}
          onChange={setCanvas}
          onRequestDeleteBlock={id => setPendingDeleteId(id)}
        />
      </div>

      {/* ─── Dialogs ─── */}
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
          onApply={(patches: AiPatch[]) => {
            let next = canvas
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
