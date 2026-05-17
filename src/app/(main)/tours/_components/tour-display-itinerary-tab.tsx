'use client'

/**
 * 展示行程 Tab — 業務操作 + 內嵌預覽
 *
 * 設計思路（5/17 William 拍板重做、原版太碎）：
 * - 上方一排 toolbar、把所有功能集中（不要散在多張卡片）
 * - 下方直接 inline 渲染預覽（不用 iframe、避免 X-Frame 問題）
 * - 主題切換是下拉、不是兩張卡並排（永成款 / 標準是「同份行程的兩種視覺」、不是兩個獨立連結）
 *
 * Toolbar 功能：
 *   主題切換  編輯模式  複製連結  新分頁開啟  ｜  連結效期  報名表
 *   ────────────────────────────────────────────  ←  目前 URL
 *
 * 下方：永成款選了就 inline render、標準選了就提示「請新分頁」
 * （標準頁面跟 yongcheng 不同框架、不適合在 tab 內嵌）
 */

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  ExternalLink,
  Copy,
  Check,
  Pencil,
  Palette,
  ClipboardList,
  Clock,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { supabase } from '@/lib/supabase/client'
import { ModuleLoading } from '@/components/module-loading'
import { YongchengRenderer } from '@/components/tour-display-yongcheng'
import type { YongchengCanvas } from '@/components/tour-display-yongcheng'
import { buildYongchengCanvasFromTour } from '@/lib/yongcheng/canvas-from-tour'
import { enrichDailyItinerary } from '@/lib/yongcheng/enrich-itinerary'
import type {
  TourData,
  EmployeeInfo,
  CompanyInfo,
} from '@/app/(public)/p/tour/[code]/_components/tour-types'
import type { Tour } from '@/stores/types'

type DisplayTheme = 'yongcheng' | 'sakura'

interface TourDisplayItineraryTabProps {
  tour: Tour
}

const THEME_LABELS: Record<DisplayTheme, string> = {
  yongcheng: '永成款（精品提案）',
  sakura: '標準（Tokyo Sakura）',
}

export function TourDisplayItineraryTab({ tour }: TourDisplayItineraryTabProps) {
  const router = useRouter()
  const { has } = useMyCapabilities()
  const canEdit = has(CAPABILITIES.TOURS_DISPLAY_ITINERARY_WRITE)

  const [theme, setTheme] = useState<DisplayTheme>('yongcheng')
  const [copied, setCopied] = useState(false)

  // 永成款 canvas 載入狀態
  const [canvas, setCanvas] = useState<YongchengCanvas | null>(null)
  const [canvasLoading, setCanvasLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // 對外連結
  const previewPath = useMemo(
    () =>
      theme === 'yongcheng'
        ? `/p/tour/${tour.code}/yongcheng`
        : `/p/tour/${tour.code}`,
    [theme, tour.code]
  )
  const fullUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${previewPath}`
      : previewPath

  // 載入 canvas（永成款 tab 內預覽用）
  // 邏輯：
  // 1. 先試從 API 拉 published canvas（業務發布過的版本）
  // 2. 沒發布過 → 從 tour itinerary 自動生成（auto-generate fallback）
  // 標準主題不 load canvas（標準頁面結構不同、要請業務新分頁開啟）
  useEffect(() => {
    if (theme !== 'yongcheng') {
      setCanvas(null)
      setCanvasLoading(false)
      return
    }

    let cancelled = false
    setCanvasLoading(true)
    setLoadError(null)

    const loadCanvas = async () => {
      // Step 1: 試 API（業務編輯過的會有 row）
      try {
        const res = await fetch(`/api/tours/${tour.code}/display-canvas`)
        if (res.ok) {
          const json = (await res.json()) as { canvas?: YongchengCanvas }
          if (json.canvas && Object.keys(json.canvas).length > 0) {
            if (!cancelled) {
              setCanvas(json.canvas)
              setCanvasLoading(false)
            }
            return
          }
        }
        // API 沒回 row 或 row 是空 canvas → 走 fallback
      } catch {
        // API 沒 build（migration 沒 apply）也 fallback、不阻擋預覽
      }

      // Step 2: Fallback 自動生成
      //
      // 改成「兩步查」、不一次嵌入 itineraries：
      // - 仙台團 SDJ260612A 用嵌入查詢吐錯誤、原因可能是 PostgREST fkey 推不出來、
      //   或 itineraries 行不存在但嵌入查詢把整筆 tour 也吃掉
      // - 兩步查容錯：itinerary 沒 row 不算 error、auto-generate 用空 daily_itinerary 跑骨架版
      const { data: tourBasic, error: tourErr } = await supabase
        .from('tours')
        .select(
          `id, code, departure_date, selling_price_per_person, max_participants,
           current_participants, days_count, airport_code, workspace_id`
        )
        .eq('code', tour.code)
        .maybeSingle()

      if (cancelled) return

      if (tourErr) {
        setLoadError(`資料庫錯誤（tours）：${tourErr.message}`)
        setCanvasLoading(false)
        return
      }

      if (!tourBasic) {
        setLoadError(
          `查不到團號 ${tour.code} — 通常是登入 session 或工作區權限沒同步、請重新登入再試`
        )
        setCanvasLoading(false)
        return
      }

      // 查 itinerary（找不到不算錯、給 null 讓 auto-generate 跑骨架）
      const { data: itineraryData, error: itinErr } = await supabase
        .from('itineraries')
        .select('id, title, subtitle, daily_itinerary, hotels')
        .eq('tour_id', tourBasic.id)
        .maybeSingle()

      if (cancelled) return

      if (itinErr) {
        setLoadError(`提示：行程資料讀取失敗（${itinErr.message}）、顯示骨架版`)
      }

      // Enrich daily_itinerary — 撈 attractions / hotels 補完描述跟圖
      // 5/17 William 抓：原本只有標題、因為 activity.description 是空字串、實際描述在 attractions 表
      // daily_itinerary 在 supabase 端是 jsonb、type 推成 union、cast 成具體陣列型別
      const rawDaily = (itineraryData?.daily_itinerary ?? null) as
        | import('@/app/(public)/p/tour/[code]/_components/tour-types').DailyItinerary[]
        | null
      const enrichedDaily = await enrichDailyItinerary(supabase, rawDaily)

      const tourData: TourData = {
        ...tourBasic,
        itinerary: itineraryData
          ? { ...itineraryData, daily_itinerary: enrichedDaily }
          : null,
      } as TourData

      // 補抓 hero / company info（簡化版、tab 內預覽不需要 ref 業務員）
      let heroImage: string | null = null
      if (tourBasic.airport_code) {
        const { data: imageData } = await supabase
          .from('airport_images')
          .select('image_url')
          .eq('airport_code', tourBasic.airport_code)
          .eq('is_default', true)
          .maybeSingle()
        if (imageData?.image_url) heroImage = imageData.image_url
      }

      let companyInfo: CompanyInfo = { name: '旅行社', phone: '' }
      if (tourBasic.workspace_id) {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('legal_name, phone')
          .eq('id', tourBasic.workspace_id)
          .maybeSingle()
        if (workspace) {
          companyInfo = {
            name: workspace.legal_name || '旅行社',
            phone: workspace.phone || '',
          }
        }
      }

      const employee: EmployeeInfo | null = null

      setCanvas(
        buildYongchengCanvasFromTour({
          tour: tourData,
          heroImage,
          employee,
          companyInfo,
        })
      )
      setCanvasLoading(false)
    }

    loadCanvas()

    return () => {
      cancelled = true
    }
  }, [tour.code, theme])

  // ──────────────── handlers ────────────────

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

  const handleEdit = () => {
    router.push(`/tours/${tour.code}/display-editor`)
  }

  // ──────────────── render ────────────────

  return (
    // -m-4 是為了打破 tab 父層的 p-4 padding、讓預覽能 full-bleed
    <div className="-m-4 flex flex-col">
      {/* ─── Toolbar（sticky 頂部）─── */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b bg-card px-4 py-2 shadow-sm">
        {/* 主題切換 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Palette className="h-4 w-4" />
              {THEME_LABELS[theme]}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setTheme('yongcheng')}>
              永成款（精品提案）
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('sakura')}>
              標準（Tokyo Sakura）
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 編輯模式 */}
        {canEdit ? (
          <Button variant="outline" size="sm" onClick={handleEdit} className="gap-2">
            <Pencil className="h-4 w-4" />
            編輯
          </Button>
        ) : null}

        {/* 分隔線 */}
        <div className="mx-1 h-6 w-px bg-border" />

        {/* 複製連結 */}
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? '已複製' : '複製連結'}
        </Button>

        {/* 新分頁開啟 */}
        <Button variant="outline" size="sm" onClick={handleOpen} className="gap-2">
          <ExternalLink className="h-4 w-4" />
          新分頁開啟
        </Button>

        {/* 分隔線 */}
        <div className="mx-1 h-6 w-px bg-border" />

        {/* 連結效期 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Clock className="h-4 w-4" />
              連結效期
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">設定連結效期</h4>
              <p className="text-xs text-muted-foreground">
                目前連結永久有效。一次性連結（24h / 72h / 7 日 過期）即將推出。
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
            <Button variant="outline" size="sm" className="gap-2">
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

        {/* 右側 URL */}
        <div className="flex-1" />
        <div className="hidden md:block max-w-md truncate font-mono text-xs text-muted-foreground">
          {fullUrl}
        </div>
      </div>

      {/* ─── 預覽區 ─── */}
      <div className="flex-1">
        {theme === 'yongcheng' ? (
          canvasLoading ? (
            <div className="flex items-center justify-center py-24">
              <ModuleLoading />
            </div>
          ) : loadError ? (
            <div className="flex items-center justify-center py-24">
              <p className="text-sm text-muted-foreground">{loadError}</p>
            </div>
          ) : canvas ? (
            <YongchengRenderer canvas={canvas} />
          ) : (
            <div className="flex items-center justify-center py-24">
              <p className="text-sm text-muted-foreground">無法載入預覽</p>
            </div>
          )
        ) : (
          // 標準預覽：tokyo-sakura 是另一套框架、不適合 inline 嵌入
          // 提示業務新分頁開啟、不破壞 tab 內結構
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <p className="text-sm text-muted-foreground">
              標準（Tokyo Sakura）預覽不支援內嵌、請點新分頁開啟
            </p>
            <Button onClick={handleOpen} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              開啟標準預覽
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
