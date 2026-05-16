import React, { useMemo } from 'react'
import { TourFormData, FeaturesStyleType } from '../types'
import { useTemplates, getTemplateColor } from '@/app/(main)/tours/[code]/_itinerary/_hooks/useTemplates'
import { useFeatures } from './features/hooks/useFeatures'
import { FeatureList } from './features/FeatureList'
import { TOUR_FORM_LABELS } from './constants/labels'

interface FeaturesSectionProps {
  data: TourFormData
  updateField: (field: string, value: unknown) => void
  addFeature: () => void
  updateFeature: (index: number, field: string, value: string | string[]) => void
  removeFeature: (index: number) => void
  reorderFeature: (fromIndex: number, toIndex: number) => void
}

export function FeaturesSection({
  data,
  addFeature,
  updateFeature,
  removeFeature,
  reorderFeature,
}: FeaturesSectionProps) {
  const { featuresTemplates, loading: _templatesLoading } = useTemplates()

  const _featuresStyleOptions = useMemo(() => {
    return featuresTemplates.map(template => ({
      value: template.id as FeaturesStyleType,
      label: template.name,
      description: template.description || '',
      color: getTemplateColor(template.id),
    }))
  }, [featuresTemplates])

  const {
    uploadingImage,
    draggedImage,
    dragOverImage,
    draggedFeature,
    dragOverFeature,
    fileInputRefs,
    handleImageUpload,
    handleMultipleImageUpload,
    handleRemoveImage,
    handleImageDragStart,
    handleImageDragOver,
    handleImageDrop,
    handleImageDragEnd,
    handleFeatureDragStart,
    handleFeatureDragOver,
    handleFeatureDrop,
    handleFeatureDragEnd,
  } = useFeatures()

  const wrappedImageUpload = (featureIndex: number, imageIndex: number, file: File) => {
    const feature = data.features?.[featureIndex]
    const currentImages = feature?.images || []
    handleImageUpload(featureIndex, imageIndex, file, updateFeature, currentImages)
  }

  const wrappedMultipleImageUpload = (featureIndex: number, files: FileList) => {
    const feature = data.features?.[featureIndex]
    const currentImages = feature?.images || []
    handleMultipleImageUpload(featureIndex, files, updateFeature, currentImages)
  }

  const wrappedRemoveImage = (featureIndex: number, imageIndex: number) => {
    const feature = data.features?.[featureIndex]
    const currentImages = feature?.images || []
    handleRemoveImage(featureIndex, imageIndex, updateFeature, currentImages)
  }

  const wrappedImageDrop = (featureIndex: number, targetIndex: number) => {
    const feature = data.features?.[featureIndex]
    const currentImages = feature?.images || []
    handleImageDrop(featureIndex, targetIndex, updateFeature, currentImages)
  }

  const wrappedFeatureDrop = (targetIndex: number) => {
    handleFeatureDrop(targetIndex, reorderFeature)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b-2 border-morandi-gold pb-2">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-morandi-primary">{TOUR_FORM_LABELS.LABEL_6890}</h2>
          {/* 特色風格已統一 - 跟隨主題設定 (coverStyle) */}
        </div>
        <button
          onClick={addFeature}
          className="px-3 py-1 bg-morandi-gold text-white rounded-lg text-sm hover:bg-morandi-gold-hover"
        >
          + 新增特色
        </button>
      </div>

      <FeatureList
        features={data.features || []}
        uploadingImage={uploadingImage}
        draggedImage={draggedImage}
        dragOverImage={dragOverImage}
        draggedFeature={draggedFeature}
        dragOverFeature={dragOverFeature}
        fileInputRefs={fileInputRefs}
        onUpdateFeature={updateFeature}
        onRemoveFeature={removeFeature}
        onFeatureDragStart={handleFeatureDragStart}
        onFeatureDragEnd={handleFeatureDragEnd}
        onFeatureDragOver={handleFeatureDragOver}
        onFeatureDrop={wrappedFeatureDrop}
        onImageUpload={wrappedImageUpload}
        onMultipleImageUpload={wrappedMultipleImageUpload}
        onRemoveImage={wrappedRemoveImage}
        onImageDragStart={handleImageDragStart}
        onImageDragOver={handleImageDragOver}
        onImageDrop={wrappedImageDrop}
        onImageDragEnd={handleImageDragEnd}
      />
    </div>
  )
}
