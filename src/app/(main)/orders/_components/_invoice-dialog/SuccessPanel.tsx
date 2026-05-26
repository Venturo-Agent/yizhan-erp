'use client'

// ============================================
// 子元件：開單成功 panel
// ============================================

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Copy, Check, CheckSquare } from 'lucide-react'
import type { CreatedBatch } from './invoice-dialog.types'

interface SuccessPanelProps {
  batch: CreatedBatch
  link: string
  copied: boolean
  onCopy: () => void
  onAnother: () => void
}

export function SuccessPanel({ batch, link, copied, onCopy, onAnother }: SuccessPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 px-3 py-3 bg-morandi-green/10 border border-morandi-green/30 rounded-lg">
        <CheckSquare className="h-5 w-5 text-morandi-green flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-medium text-morandi-primary">
            成功開立 {batch.invoice_count} 人帳單
          </div>
          <div className="text-xs text-morandi-secondary mt-1">
            產生 1 條付款連結、可分享給客戶。連結 14 天內有效、客戶可勾選代付任何成員。
          </div>
        </div>
      </div>

      <div className="border border-border rounded-lg p-3">
        <div className="text-xs text-morandi-secondary mb-1.5">付款連結</div>
        <div className="flex items-center gap-2">
          <Input value={link} readOnly className="text-xs font-mono" />
          <Button variant="outline" size="sm" onClick={onCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </Button>
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={onAnother} className="text-morandi-secondary">
        再開一張帳單
      </Button>
    </div>
  )
}
