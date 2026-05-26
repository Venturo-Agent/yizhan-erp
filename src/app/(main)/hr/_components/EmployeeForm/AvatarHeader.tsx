'use client'

import React from 'react'
import { Camera } from 'lucide-react'

interface AvatarHeaderProps {
  avatarPreview: string | null
  avatarUploading: boolean
  isEditMode: boolean
  employeeNumber: string | undefined
  displayName: string
  chineseName: string
  headerRightSlot?: React.ReactNode
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onAvatarClick: () => void
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const LABELS = {
  AVATAR_PREVIEW_ALT: '預覽',
  NEW_EMPLOYEE: '新員工',
  UNNAMED: '未命名',
} as const

export function AvatarHeader({
  avatarPreview,
  isEditMode,
  employeeNumber,
  displayName,
  chineseName,
  headerRightSlot,
  fileInputRef,
  onAvatarClick,
  onAvatarChange,
}: AvatarHeaderProps) {
  return (
    // 外層只給左右 + 上 padding；分隔線（border-b）放內層、左右內縮跟內容對齊、不貼卡片邊
    <div className="px-6 pt-6">
      <div className="flex items-center gap-5 pb-6 border-b border-border">
        <div className="relative group flex-shrink-0">
          <div
            onClick={onAvatarClick}
            className="w-20 h-20 rounded-xl bg-morandi-gold/10 border-2 border-dashed border-morandi-gold/30 flex items-center justify-center overflow-hidden cursor-pointer group-hover:border-morandi-gold transition-all"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={LABELS.AVATAR_PREVIEW_ALT}
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera className="w-7 h-7 text-morandi-secondary" />
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onAvatarChange}
            className="hidden"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="inline-flex px-2 py-0.5 bg-morandi-gold/20 text-morandi-gold text-[0.588rem] font-bold uppercase tracking-widest rounded-full mb-1">
            {isEditMode ? employeeNumber : LABELS.NEW_EMPLOYEE}
          </div>
          <h3 className="text-lg font-bold text-morandi-primary truncate">
            {displayName || chineseName || LABELS.UNNAMED}
          </h3>
        </div>
        {/* 5/13 William 拍板：settings 個人頁傳「顯示偏好」進來、HR 不傳 */}
        {headerRightSlot && <div className="flex-shrink-0 ml-auto">{headerRightSlot}</div>}
      </div>
    </div>
  )
}
