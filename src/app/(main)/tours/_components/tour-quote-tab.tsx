'use client'

/**
 * TourQuoteTab - 整合報價分頁
 *
 * 左邊版本選單：
 * - ⭐ 主報價單（標準報價，與行程表連動）
 * - 快速報價單列表
 *
 * 右邊內容：
 * - 主報價單：嵌入 QuoteDetailEmbed
 * - 快速報價單：跳轉到詳情頁（或嵌入）
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { generateQuoteCode } from '@/lib/codes'
import { FileText, Plus, Star, Receipt, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { getTodayString } from '@/lib/utils/format-date'
import { cn } from '@/lib/utils'
import { confirm } from '@/lib/ui/alert-dialog'
import { useAuthStore } from '@/stores'
import { softDelete } from '@/lib/data/soft-delete'
import type { Tour } from '@/stores/types'
import type { Quote } from '@/stores/types'
import { createQuote } from '@/data'
import { DEFAULT_CATEGORIES } from '@/app/(main)/orders/_quotes/_constants'
import { QuoteDetailEmbed } from '@/app/(main)/orders/_quotes/_components/QuoteDetailEmbed'
import { QuickQuoteDetail } from '@/app/(main)/orders/_quotes/_components/QuickQuoteDetail'

import { Spinner } from '@/components/ui/spinner'
const COMPONENT_LABELS = {
  MAIN_QUOTE_CREATED: '主報價單已建立',
  CREATE_MAIN_QUOTE_FAILED: '建立主報價單失敗',
  QUICK_QUOTE_CREATED: '快速報價單已建立',
  UPDATE_FAILED: '更新失敗',
  QUICK_QUOTE_DELETED: '已刪除快速報價',
  DELETE_FAILED: '刪除失敗',
  MAIN_QUOTE: '主報價單',
  ENTER_NAME_PLACEHOLDER: '輸入名稱',
  RENAME: '重新命名',
  DELETE: '刪除',
  ADD_QUICK_QUOTE: '新增快速報價',
  QUOTE_NOT_FOUND: '找不到報價單',
} as const

interface TourQuoteTabProps {
  tour: Tour
}

export function TourQuoteTab({ tour }: TourQuoteTabProps) {
  const t = useTranslations('tour')
  const _router = useRouter()
  const user = useAuthStore(state => state.user)

  // 主報價單狀態
  const [mainQuoteId, setMainQuoteId] = useState<string | null>(null)
  const [loadingMain, setLoadingMain] = useState(true)
  const [creatingMain, setCreatingMain] = useState(false)

  // 快速報價單列表
  const [quickQuotes, setQuickQuotes] = useState<Quote[]>([])
  const [loadingQuick, setLoadingQuick] = useState(true)
  const [creatingQuick, setCreatingQuick] = useState(false)

  // 當前選中的版本
  const [selectedVersion, setSelectedVersion] = useState<'main' | string>('main')

  // Inline 重新命名狀態
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  // Portal 容器：右側 action toolbar、給 detail 元件 createPortal 用
  const [actionsContainer, setActionsContainer] = useState<HTMLDivElement | null>(null)

  // ========== 載入主報價單（反查 quotes，葡萄串模型 docs/QUOTES_SSOT.md）==========
  useEffect(() => {
    const loadMainQuote = async () => {
      setLoadingMain(true)
      try {
        const { data, error } = await supabase
          .from('quotes')
          .select('id')
          .eq('tour_id', tour.id)
          .eq('quote_type', 'standard')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw error
        setMainQuoteId(data?.id || null)
      } catch (err) {
        logger.error('載入主報價單失敗', err)
      } finally {
        setLoadingMain(false)
      }
    }

    loadMainQuote()
  }, [tour.id])

  // ========== 載入快速報價單列表 ==========
  const loadQuickQuotes = useCallback(async () => {
    setLoadingQuick(true)
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(
          'id, code, tour_id, version, status, quote_type, customer_name, contact_phone, contact_address, tour_code, handler_name, issue_date, expense_description, total_amount, total_cost, received_amount, balance_amount, quick_quote_items, cost_structure, profit_margin, notes, workspace_id, created_at, created_by, updated_at'
        ) // 載入完整資料給 QuickQuoteDetail 使用
        .eq('tour_id', tour.id)
        .eq('quote_type', 'quick')
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuickQuotes((data as unknown as Quote[]) || [])
    } catch (err) {
      logger.error('載入快速報價單失敗', err)
    } finally {
      setLoadingQuick(false)
    }
  }, [tour.id])

  useEffect(() => {
    loadQuickQuotes()
  }, [loadQuickQuotes])

  // ========== 建立主報價單 ==========
  const handleCreateMainQuote = async () => {
    try {
      setCreatingMain(true)

      // 透過 DB RPC 產生主報價單編號（{tour_code}-Q{NN}、advisory lock 防競態）
      let quoteCode: string | undefined = undefined
      if (tour.code && tour.id) {
        quoteCode = await generateQuoteCode(tour.id, 'standard')
      }

      const newQuote = await createQuote({
        name: tour.name,
        quote_type: 'standard',
        status: 'draft',
        tour_id: tour.id,
        categories: DEFAULT_CATEGORIES,
        group_size: tour.max_participants || 20,
        customer_name: tour.name,
        tour_code: tour.code || '',
        issue_date: new Date().toISOString().split('T')[0],
        ...(quoteCode ? { code: quoteCode } : {}),
      } as Parameters<typeof createQuote>[0])

      if (newQuote?.id) {
        setMainQuoteId(newQuote.id)
        toast.success(COMPONENT_LABELS.MAIN_QUOTE_CREATED)
      }
    } catch (error) {
      logger.error('建立主報價單失敗', error)
      toast.error(COMPONENT_LABELS.CREATE_MAIN_QUOTE_FAILED)
    } finally {
      setCreatingMain(false)
    }
  }

  // 自動建立主報價單
  useEffect(() => {
    if (!loadingMain && !mainQuoteId && !creatingMain) {
      handleCreateMainQuote()
    }
  }, [loadingMain, mainQuoteId, creatingMain])

  // ========== 新增快速報價單 ==========
  const handleAddQuickQuote = async () => {
    if (creatingQuick) return
    setCreatingQuick(true)
    try {
      // 透過 DB RPC 產生快速報價單編號（{tour_code}-QQ{NN}、advisory lock 防競態）
      let quickQuoteCode: string | undefined
      if (tour.code && tour.id) {
        quickQuoteCode = await generateQuoteCode(tour.id, 'quick')
      }

      const newQuote = await createQuote({
        quote_type: 'quick',
        tour_id: tour.id,
        tour_code: tour.code || '',
        customer_name: '',
        handler_name: user?.display_name || user?.chinese_name || '',
        issue_date: getTodayString(),
        total_amount: 0,
        received_amount: 0,
        status: 'draft',
        is_active: true,
        is_pinned: false,
        workspace_id: user?.workspace_id || '',
        created_by: user?.id,
        created_by_name: user?.display_name || user?.chinese_name || '',
        ...(quickQuoteCode ? { code: quickQuoteCode } : {}),
        quick_quote_items: [
          {
            id: crypto.randomUUID(),
            description: '',
            quantity: 1,
            cost: 0,
            unit_price: 0,
            amount: 0,
            notes: '',
          },
        ],
      } as Parameters<typeof createQuote>[0])

      if (newQuote?.id) {
        await loadQuickQuotes()
        setSelectedVersion(newQuote.id)
        toast.success(COMPONENT_LABELS.QUICK_QUOTE_CREATED)
      }
    } catch (err) {
      const detail =
        err && typeof err === 'object'
          ? {
              message: (err as { message?: string }).message,
              code: (err as { code?: string }).code,
              details: (err as { details?: string }).details,
              hint: (err as { hint?: string }).hint,
            }
          : err
      logger.error('建立快速報價單失敗', detail)
      toast.error('建立快速報價單失敗，請稍後再試')
    } finally {
      setCreatingQuick(false)
    }
  }

  // ========== 進入 inline 重新命名 ==========
  const startRenameQuickQuote = (quote: Quote) => {
    setEditingQuoteId(quote.id)
    setEditingName(quote.name || quote.customer_name || '')
  }

  // ========== 儲存 inline 重新命名 ==========
  const commitRenameQuickQuote = async () => {
    const id = editingQuoteId
    if (!id) return
    const trimmed = editingName.trim()
    // 取消編輯 UI（不等 save 完成，畫面先回）
    setEditingQuoteId(null)

    // 若沒變動就不打 API
    const target = quickQuotes.find(q => q.id === id)
    const originalName = target?.name || ''
    if (trimmed === originalName) return

    try {
      const { error } = await supabase
        .from('quotes')
        .update({ name: trimmed || null })
        .eq('id', id)
      if (error) throw error
      await loadQuickQuotes()
    } catch (err) {
      logger.error('更新快速報價名稱失敗', err)
      toast.error(COMPONENT_LABELS.UPDATE_FAILED)
    }
  }

  const cancelRenameQuickQuote = () => {
    setEditingQuoteId(null)
    setEditingName('')
  }

  // ========== 刪除快速報價單 ==========
  const handleDeleteQuickQuote = async (quote: Quote) => {
    const label = quote.name || quote.customer_name || '此快速報價'
    const ok = await confirm(`確定要刪除「${label}」？此動作無法還原。`, {
      type: 'warning',
      title: '刪除快速報價',
      confirmText: '刪除',
      cancelText: '取消',
    })
    if (!ok) return

    try {
      const result = await softDelete(
        supabase as never,
        {
          workspaceId: user?.workspace_id ?? '',
          actorId: user?.id ?? '',
        },
        { table: 'quotes', id: quote.id }
      )
      if (!result.ok) throw new Error(result.error ?? '軟刪除失敗')
      // 如果刪的是正在選中的，切回主報價單
      if (selectedVersion === quote.id) setSelectedVersion('main')
      await loadQuickQuotes()
      toast.success(COMPONENT_LABELS.QUICK_QUOTE_DELETED)
    } catch (err) {
      logger.error('刪除快速報價失敗', err)
      toast.error(COMPONENT_LABELS.DELETE_FAILED)
    }
  }

  // ========== 渲染 ==========
  const isLoading = loadingMain || loadingQuick

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" className="text-morandi-gold" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 主操作列 — 上方靠父層 main 的 p-4 處理、下方加 mb-6 跟表格留距離 */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-6">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* ⭐ 主報價 */}
          <button
            onClick={() => setSelectedVersion('main')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
              selectedVersion === 'main'
                ? 'bg-morandi-gold/20 text-morandi-primary font-medium ring-1 ring-morandi-gold/40'
                : 'hover:bg-morandi-container/30 text-morandi-secondary'
            )}
          >
            <Star
              size={12}
              className={
                selectedVersion === 'main'
                  ? 'fill-morandi-gold text-morandi-gold'
                  : 'text-morandi-secondary'
              }
            />
            <span>{COMPONENT_LABELS.MAIN_QUOTE}</span>
          </button>

          {/* 快速報價 tabs */}
          {quickQuotes.map((quote, index) => {
            const displayName = quote.name || quote.customer_name || `快速報價 ${index + 1}`
            const isActive = selectedVersion === quote.id
            const isEditing = editingQuoteId === quote.id
            return (
              <div key={quote.id} className="group relative flex items-center">
                {isEditing ? (
                  <input
                    autoFocus
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onBlur={commitRenameQuickQuote}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        commitRenameQuickQuote()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        cancelRenameQuickQuote()
                      }
                    }}
                    placeholder={COMPONENT_LABELS.ENTER_NAME_PLACEHOLDER}
                    className="px-3 py-1.5 rounded-lg text-sm border border-morandi-gold/60 bg-card text-morandi-primary outline-none w-32"
                  />
                ) : (
                  <>
                    <button
                      onClick={() => setSelectedVersion(quote.id)}
                      className={cn(
                        'flex items-center gap-1.5 pl-3 pr-10 py-1.5 rounded-lg text-sm transition-colors',
                        isActive
                          ? 'bg-morandi-gold/20 text-morandi-primary font-medium ring-1 ring-morandi-gold/40'
                          : 'hover:bg-morandi-container/30 text-morandi-secondary'
                      )}
                    >
                      <Receipt size={11} className="shrink-0" />
                      <span className="max-w-[120px] truncate">{displayName}</span>
                    </button>
                    {/* Hover 上的重新命名 / 刪除 */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          startRenameQuickQuote(quote)
                        }}
                        className="p-1 text-morandi-secondary hover:text-morandi-gold transition-colors"
                        title={COMPONENT_LABELS.RENAME}
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          handleDeleteQuickQuote(quote)
                        }}
                        className="p-1 text-morandi-secondary hover:text-morandi-red transition-colors"
                        title={COMPONENT_LABELS.DELETE}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {/* + 新增版本（未來這顆會變 dropdown、提供「快速報價 / Local 報價 / 自訂版本」等選項） */}
          <Button
            onClick={handleAddQuickQuote}
            disabled={creatingQuick}
            variant="ghost"
            size="sm"
            className="h-8 text-sm gap-1 ml-1 text-morandi-secondary hover:text-morandi-primary border border-dashed border-border/60 hover:border-morandi-gold/40"
          >
            <Plus size={12} />
            <span>{COMPONENT_LABELS.ADD_QUICK_QUOTE}</span>
          </Button>
        </div>

        {/* 右側：版本內動作（未確認 / 新增檻次 / 儲存 / 列印）— detail 元件透過 React Portal 傳送到此 */}
        <div
          ref={node => setActionsContainer(node)}
          className="flex items-center gap-2 flex-wrap"
        />
      </div>

      {/* 內容區 — scroll context */}
      <div className="flex-1 overflow-y-auto">
        {selectedVersion === 'main' ? (
          // 主報價單
          mainQuoteId ? (
            <QuoteDetailEmbed quoteId={mainQuoteId} actionsContainer={actionsContainer} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-morandi-secondary">
              <Spinner size="lg" className="mb-2" />
              <p className="text-sm">{t('quoteTabCreating')}</p>
            </div>
          )
        ) : (
          // 快速報價單 - 直接嵌入顯示
          (() => {
            const selectedQuote = quickQuotes.find(q => q.id === selectedVersion)
            if (!selectedQuote) {
              return (
                <div className="flex flex-col items-center justify-center h-full">
                  <FileText size={48} className="text-morandi-secondary/30 mb-4" />
                  <p className="text-sm text-morandi-secondary">
                    {COMPONENT_LABELS.QUOTE_NOT_FOUND}
                  </p>
                </div>
              )
            }
            return (
              <QuickQuoteDetail
                key={selectedQuote.id} // 強制重新渲染
                quote={selectedQuote}
                embedded={true} // 嵌入模式：隱藏 header，按鈕移到底部
                actionsContainer={actionsContainer}
                onUpdate={async data => {
                  // 更新快速報價單
                  const { error } = await supabase
                    .from('quotes')
                    .update(data as never)
                    .eq('id', selectedQuote.id)
                  if (error) throw error
                  // 重新載入
                  await loadQuickQuotes()
                  return selectedQuote
                }}
              />
            )
          })()
        )}
      </div>
    </div>
  )
}
