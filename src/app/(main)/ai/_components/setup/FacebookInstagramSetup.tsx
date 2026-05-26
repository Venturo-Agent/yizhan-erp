'use client'

import { Facebook, Instagram, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function FacebookSetup() {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <Card className="max-w-md p-8 text-center space-y-4 border-dashed border-2">
        <div className="flex justify-center">
          <Facebook className="w-12 h-12 text-[#1877f2]" />
        </div>
        <h2 className="text-lg font-semibold text-morandi-primary">Facebook AI 整合</h2>
        <div className="flex items-center justify-center gap-2 text-sm text-morandi-secondary">
          <Clock className="w-4 h-4" />
          <span>AI 整合中，敬請期待</span>
        </div>
        <p className="text-xs text-morandi-muted">
          Facebook Messenger Bot 整合功能正在開發，完成後即可在此設定。
        </p>
      </Card>
    </div>
  )
}

export function InstagramSetup() {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <Card className="max-w-md p-8 text-center space-y-4 border-dashed border-2">
        <div className="flex justify-center">
          <Instagram className="w-12 h-12 text-[#e4405f]" />
        </div>
        <h2 className="text-lg font-semibold text-morandi-primary">Instagram AI 整合</h2>
        <div className="flex items-center justify-center gap-2 text-sm text-morandi-secondary">
          <Clock className="w-4 h-4" />
          <span>AI 整合中，敬請期待</span>
        </div>
        <p className="text-xs text-morandi-muted">
          Instagram DM Bot 整合功能正在開發，完成後即可在此設定。
        </p>
      </Card>
    </div>
  )
}
