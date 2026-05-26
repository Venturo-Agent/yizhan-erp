'use client'

import { Loader2, Star, Trash2, Upload } from 'lucide-react'

const LABELS = {
  COVER: '封面',
  NO_PHOTOS: '尚無照片',
  UPLOADING: '上傳中...',
  UPLOAD_PHOTO: '上傳照片',
  SET_AS_COVER: '設為封面',
  DELETE_PHOTO: '刪除照片',
} as const

interface ResourceImagePanelProps {
  allImages: string[]
  currentImageIndex: number
  isEditing: boolean
  uploading: boolean
  resourceName: string
  onIndexChange: (idx: number) => void
  onSetCover: (imageUrl: string) => void
  onDeleteImage: (imageUrl: string) => void
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function ResourceImagePanel({
  allImages,
  currentImageIndex,
  isEditing,
  uploading,
  resourceName,
  onIndexChange,
  onSetCover,
  onDeleteImage,
  onUpload,
}: ResourceImagePanelProps) {
  return (
    <div className="flex flex-col gap-2 min-w-0 max-h-[31.25rem]">
      {/* 主圖 */}
      {allImages.length > 0 ? (
        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
          <img
            src={allImages[currentImageIndex]}
            alt={resourceName}
            className="w-full h-full object-cover"
          />
          {/* 封面標記 */}
          {currentImageIndex === 0 && allImages.length > 1 && (
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
              <Star size="0.625em" className="fill-current" /> {LABELS.COVER}
            </div>
          )}
          {/* 圖片計數 */}
          {allImages.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              {currentImageIndex + 1} / {allImages.length}
            </div>
          )}
          {/* 編輯模式：當前圖片操作 */}
          {isEditing && (
            <div className="absolute top-2 right-2 flex gap-1">
              {currentImageIndex !== 0 && (
                <button
                  onClick={() => onSetCover(allImages[currentImageIndex])}
                  className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded transition-colors"
                  title={LABELS.SET_AS_COVER}
                >
                  <Star size="0.875em" />
                </button>
              )}
              <button
                onClick={() => onDeleteImage(allImages[currentImageIndex])}
                className="bg-black/60 hover:bg-status-danger text-white p-1.5 rounded transition-colors"
                title={LABELS.DELETE_PHOTO}
              >
                <Trash2 size="0.875em" />
              </button>
            </div>
          )}
        </div>
      ) : isEditing ? (
        <div className="aspect-[4/3] rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm">
          {LABELS.NO_PHOTOS}
        </div>
      ) : null}

      {/* 縮圖列表 */}
      {allImages.length > 1 && (
        <div className="flex gap-1 overflow-x-auto">
          {allImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => onIndexChange(idx)}
              className={`relative w-16 h-12 flex-shrink-0 rounded overflow-hidden border-2 transition-colors ${
                idx === currentImageIndex ? 'border-primary' : 'border-transparent'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
              {idx === 0 && (
                <Star
                  size="0.5em"
                  className="absolute top-0.5 left-0.5 text-white fill-current drop-shadow"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* 上傳照片按鈕（編輯模式，推到底部對齊右側按鈕列） */}
      {isEditing && (
        <label className="mt-auto flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
          {uploading ? (
            <Loader2 size="0.875em" className="animate-spin" />
          ) : (
            <Upload size="0.875em" />
          )}
          {uploading ? LABELS.UPLOADING : LABELS.UPLOAD_PHOTO}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}
    </div>
  )
}
