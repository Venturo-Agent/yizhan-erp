'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { HandCoins } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { BonusCalculationOrder } from '@/app/(main)/tours/_services/profit-calculation.service'

const ORDER_OPTIONS: { value: BonusCalculationOrder; label: string; desc: string }[] = [
  {
    value: 'independent',
    label: '各自計算（預設）',
    desc: 'OP 獎金和業務獎金都從淨利各自計算，互不影響',
  },
  {
    value: 'op_first',
    label: 'OP 先算',
    desc: '先從淨利計算 OP 獎金，業務獎金再從（淨利 − OP）計算',
  },
  {
    value: 'sales_first',
    label: '業務先算',
    desc: '先從淨利計算業務獎金，OP 獎金再從（淨利 − 業務）計算',
  },
]

interface BonusPolicySectionProps {
  workspaceId: string
  initialOrder: BonusCalculationOrder
}

export function BonusPolicySection({ workspaceId, initialOrder }: BonusPolicySectionProps) {
  const [order, setOrder] = useState<BonusCalculationOrder>(initialOrder)
  const [saving, setSaving] = useState(false)

  const handleChange = async (value: BonusCalculationOrder) => {
    setOrder(value)
    setSaving(true)
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ bonus_calculation_order: value } as Record<string, unknown>)
        .eq('id', workspaceId)
      if (error) throw error
      toast.success('獎金計算順序已儲存')
    } catch (err) {
      logger.error('儲存獎金計算順序失敗', err)
      toast.error('儲存失敗，請重試')
      setOrder(initialOrder)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="rounded-xl shadow-sm border border-border p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-morandi-gold/10 rounded-lg">
          <HandCoins className="h-5 w-5 text-morandi-gold" />
        </div>
        <div>
          <h3 className="font-semibold text-morandi-primary">獎金政策</h3>
          <p className="text-xs text-morandi-muted">OP 獎金與業務獎金的計算順序</p>
        </div>
      </div>

      <div className="space-y-3">
        {ORDER_OPTIONS.map(opt => (
          <label
            key={opt.value}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              order === opt.value
                ? 'border-morandi-gold bg-morandi-gold/5'
                : 'border-border hover:bg-morandi-container/40'
            } ${saving ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <input
              type="radio"
              name="bonus_calculation_order"
              value={opt.value}
              checked={order === opt.value}
              onChange={() => handleChange(opt.value)}
              className="mt-0.5 accent-[var(--morandi-gold)]"
            />
            <div>
              <div className="text-sm font-medium text-morandi-primary">{opt.label}</div>
              <div className="text-xs text-morandi-muted mt-0.5">{opt.desc}</div>
            </div>
          </label>
        ))}
      </div>
    </Card>
  )
}
