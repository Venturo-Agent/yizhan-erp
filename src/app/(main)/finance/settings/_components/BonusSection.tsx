// 獎金設定 placeholder section
'use client'

import { Card } from '@/components/ui/card'
import { Award } from 'lucide-react'
import { PAGE_LABELS } from './types'

export function BonusSection() {
  return (
    <div className="space-y-4">
      <Card className="border border-border rounded-xl overflow-hidden bg-card shadow-sm p-8">
        <div className="text-center text-morandi-muted py-8">
          <Award className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">{PAGE_LABELS.BONUS_SETTINGS}</p>
          <p className="text-sm mt-1">{PAGE_LABELS.COMING_SOON}</p>
        </div>
      </Card>
    </div>
  )
}
