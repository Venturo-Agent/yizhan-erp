'use client'
/**
 * PrintControls - 列印控制按鈕組件（共用）
 */

import React from 'react'
import { Button } from '@/components/ui/button'
import { X, Printer } from 'lucide-react'

const LABELS = {
  CLOSE: '關閉',
  PRINT: '列印',
}

interface PrintControlsProps {
  onClose: () => void
  onPrint: () => void
}

export const PrintControls: React.FC<PrintControlsProps> = ({ onClose, onPrint }) => {
  return (
    <div className="flex justify-end gap-2 p-4 print:hidden">
      <Button onClick={onClose} variant="soft-gold" className="gap-2">
        <X className="h-4 w-4" />
        {LABELS.CLOSE}
      </Button>
      <Button onClick={onPrint} className="gap-2">
        <Printer className="h-4 w-4" />
        {LABELS.PRINT}
      </Button>
    </div>
  )
}
