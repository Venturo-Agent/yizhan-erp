import React from 'react'
import { Feature } from '../../types'
import { FeatureItem } from './FeatureItem'

interface FeatureListProps {
  features: Feature[]
  uploadingImage: { featureIndex: number; imageIndex: number } | null
  draggedImage: { featureIndex: number; imageIndex: number } | null
  dragOverImage: { featureIndex: number; imageIndex: number } | null
  draggedFeature: number | null
  dragOverFeature: number | null
  fileInputRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>
  onUpdateFeature: (index: number, field: string, value: string | string[]) => void
  onRemoveFeature: (index: number) => void
  onFeatureDragStart: (index: number) => void
  onFeatureDragEnd: () => void
  onFeatureDragOver: (e: React.DragEvent, index: number) => void
  onFeatureDrop: (index: number) => void
  onImageUpload: (featureIndex: number, imageIndex: number, file: File) => void
  onMultipleImageUpload: (featureIndex: number, files: FileList) => void
  onRemoveImage: (featureIndex: number, imageIndex: number) => void
  onImageDragStart: (featureIndex: number, imageIndex: number) => void
  onImageDragOver: (e: React.DragEvent, featureIndex: number, imageIndex: number) => void
  onImageDrop: (featureIndex: number, targetIndex: number) => void
  onImageDragEnd: () => void
}

export function FeatureList({
  features,
  uploadingImage,
  draggedImage,
  dragOverImage,
  draggedFeature,
  dragOverFeature,
  fileInputRefs,
  onUpdateFeature,
  onRemoveFeature,
  onFeatureDragStart,
  onFeatureDragEnd,
  onFeatureDragOver,
  onFeatureDrop,
  onImageUpload,
  onMultipleImageUpload,
  onRemoveImage,
  onImageDragStart,
  onImageDragOver,
  onImageDrop,
  onImageDragEnd,
}: FeatureListProps) {
  return (
    <>
      {features.map((feature: Feature, index: number) => {
        const isDraggingFeature = draggedFeature === index
        const isDragOverFeature = dragOverFeature === index

        return (
          <FeatureItem
            key={index}
            feature={feature}
            index={index}
            isDraggingFeature={isDraggingFeature}
            isDragOverFeature={isDragOverFeature}
            uploadingImage={uploadingImage}
            draggedImage={draggedImage}
            dragOverImage={dragOverImage}
            fileInputRefs={fileInputRefs}
            onUpdateFeature={onUpdateFeature}
            onRemoveFeature={onRemoveFeature}
            onFeatureDragStart={onFeatureDragStart}
            onFeatureDragEnd={onFeatureDragEnd}
            onFeatureDragOver={onFeatureDragOver}
            onFeatureDrop={onFeatureDrop}
            onImageUpload={onImageUpload}
            onMultipleImageUpload={onMultipleImageUpload}
            onRemoveImage={onRemoveImage}
            onImageDragStart={onImageDragStart}
            onImageDragOver={onImageDragOver}
            onImageDrop={onImageDrop}
            onImageDragEnd={onImageDragEnd}
          />
        )
      })}
    </>
  )
}
