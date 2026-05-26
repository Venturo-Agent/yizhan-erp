'use client'

/**
 * AI Hub — 商品分頁（William 2026-05-26）
 *
 * 客戶自助上架商品 → 存進 ai_products 正本表 → AI 客服組答時全量注入（product-context.ts）。
 *
 * 紅線：
 *   - F：讀走 entity hook（useAiProducts）、寫走 apiMutate 打 /api/ai/products、刷新走 invalidateAiProducts
 *   - 防連點：useAsyncSubmit + disabled={isSubmitting}
 *   - UI token：morandi-* / status-*（不寫死 Tailwind 預設色）
 *   - 金額走 formatMoneyWithCurrency（不手刻 toLocaleString）
 */

import { useState } from 'react'
import { Plus, Loader2, Check, X, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { apiMutate } from '@/lib/swr/api-mutate'
import { formatMoneyWithCurrency } from '@/lib/utils/format-currency'
import { useAiProducts, invalidateAiProducts, type AiProduct } from '@/data/entities'
import { PRODUCT_LABELS as L } from './ai-products-labels'

const API = '/api/ai/products'

export function AiProductsTab() {
  const { items: list, loading: isLoading, error } = useAiProducts()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleDelete = async (p: AiProduct) => {
    if (!confirm(L.deleteConfirm(p.name))) return
    const res = await apiMutate(`${API}/${p.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error(res.error || L.deleteFailed)
      return
    }
    await invalidateAiProducts()
    toast.success(L.deleteSuccess)
  }

  const handleToggleActive = async (p: AiProduct) => {
    const res = await apiMutate(`${API}/${p.id}`, {
      method: 'PATCH',
      body: { is_published: !p.is_published },
    })
    if (!res.ok) {
      toast.error(res.error || L.saveFailed)
      return
    }
    await invalidateAiProducts()
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-morandi-primary">{L.sectionTitle}</h2>
          <p className="text-xs text-morandi-muted mt-0.5">{L.sectionDesc}</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setShowForm(true)
            setEditingId(null)
          }}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" />
          {L.addButton}
        </Button>
      </div>

      {isLoading && <div className="text-sm text-morandi-muted">{L.loading}</div>}
      {error && <div className="text-sm text-status-danger">{L.loadFailed}</div>}

      {showForm && !editingId && (
        <ProductForm onDone={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      )}

      <div className="space-y-2">
        {list.map(p => (
          <div key={p.id}>
            {editingId === p.id ? (
              <ProductForm
                initial={p}
                onDone={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ProductRow
                p={p}
                onEdit={() => setEditingId(p.id)}
                onDelete={() => handleDelete(p)}
                onToggle={() => handleToggleActive(p)}
              />
            )}
          </div>
        ))}
      </div>

      {!isLoading && list.length === 0 && !showForm && (
        <div className="border border-dashed border-morandi-muted/30 rounded-xl p-8 text-center text-sm text-morandi-muted">
          {L.empty}
        </div>
      )}
    </div>
  )
}

// ============================================================
// ProductRow — 單筆商品顯示 + 操作
// ============================================================

function ProductRow({
  p,
  onEdit,
  onDelete,
  onToggle,
}: {
  p: AiProduct
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
        p.is_published
          ? 'border-morandi-muted/20 bg-white'
          : 'border-morandi-muted/10 bg-morandi-container/20 opacity-60'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-morandi-primary">{p.name}</span>
          {p.price != null && (
            <span className="text-xs font-medium text-morandi-gold">
              {formatMoneyWithCurrency(p.price, p.currency)}
            </span>
          )}
        </div>
        {p.contents && (
          <p className="text-xs text-morandi-secondary mt-1 line-clamp-2">{p.contents}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggle}
          title={p.is_published ? L.shelfOff : L.shelfOn}
          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
            p.is_published
              ? 'border-status-success/30 text-status-success bg-status-success-bg'
              : 'border-morandi-muted/20 text-morandi-muted hover:bg-morandi-container/40'
          }`}
        >
          {p.is_published ? L.active : L.inactive}
        </button>
        <button onClick={onEdit} className="p-1 text-morandi-muted hover:text-morandi-primary">
          <Edit className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1 text-morandi-muted hover:text-status-danger">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ============================================================
// ProductForm — 新增 / 編輯表單
// ============================================================

function ProductForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: AiProduct
  onDone: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [contents, setContents] = useState(initial?.contents ?? '')
  const [price, setPrice] = useState<string>(initial?.price != null ? String(initial.price) : '')
  const [currency, setCurrency] = useState<string>(initial?.currency ?? 'TWD')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [validFrom, setValidFrom] = useState(initial?.valid_from ?? '')
  const [validTo, setValidTo] = useState(initial?.valid_to ?? '')
  const [validityNote, setValidityNote] = useState(initial?.validity_note ?? '')

  const { isSubmitting, execute } = useAsyncSubmit(async () => {
    if (!name.trim()) {
      toast.error(L.nameRequired)
      return
    }
    if (validFrom && validTo && validTo < validFrom) {
      toast.error(L.dateRangeInvalid)
      return
    }

    const body = {
      name: name.trim(),
      contents: contents.trim() || null,
      price: price.trim() === '' ? null : Number(price),
      currency,
      description: description.trim() || null,
      valid_from: validFrom || null,
      valid_to: validTo || null,
      validity_note: validityNote.trim() || null,
    }

    const res = initial
      ? await apiMutate(`${API}/${initial.id}`, { method: 'PATCH', body })
      : await apiMutate(API, { method: 'POST', body })

    if (!res.ok) {
      toast.error(res.error || L.saveFailed)
      return
    }
    await invalidateAiProducts()
    toast.success(initial ? L.updateSuccess : L.createSuccess)
    onDone()
  })

  const labelCls = 'text-xs font-medium text-morandi-secondary mb-1 block'

  return (
    <div className="border border-morandi-gold/30 rounded-xl p-4 bg-morandi-gold/5 space-y-3">
      {/* 商品名稱 */}
      <div>
        <Label className={labelCls}>{L.name} *</Label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={L.namePlaceholder}
          className="h-8 text-sm"
        />
      </div>

      {/* 內容物 */}
      <div>
        <Label className={labelCls}>{L.contents}</Label>
        <Textarea
          value={contents}
          onChange={e => setContents(e.target.value)}
          placeholder={L.contentsPlaceholder}
          className="text-sm resize-none"
          rows={2}
        />
      </div>

      {/* 價格 + 幣別 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={labelCls}>{L.price}</Label>
          <Input
            type="number"
            min={0}
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder={L.pricePlaceholder}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className={labelCls}>{L.currency}</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {L.currencies.map(c => (
                <SelectItem key={c.value} value={c.value} className="text-sm">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 說明 */}
      <div>
        <Label className={labelCls}>{L.description}</Label>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={L.descriptionPlaceholder}
          className="text-sm resize-none"
          rows={2}
        />
      </div>

      {/* 販賣期間：起訖日期 + 備註文字（兩種都給） */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={labelCls}>{L.validFrom}</Label>
          <Input
            type="date"
            value={validFrom}
            onChange={e => setValidFrom(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className={labelCls}>{L.validTo}</Label>
          <Input
            type="date"
            value={validTo}
            onChange={e => setValidTo(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div>
        <Label className={labelCls}>{L.validityNote}</Label>
        <Input
          value={validityNote}
          onChange={e => setValidityNote(e.target.value)}
          placeholder={L.validityNotePlaceholder}
          className="h-8 text-sm"
        />
      </div>

      {/* 按鈕 */}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
          <X className="w-3.5 h-3.5" />
          {L.cancel}
        </Button>
        <Button size="sm" onClick={execute} disabled={isSubmitting} className="gap-1">
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          {L.save}
        </Button>
      </div>
    </div>
  )
}
