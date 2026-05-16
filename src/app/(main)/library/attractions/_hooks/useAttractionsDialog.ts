import { useState } from 'react'
import { Attraction, AttractionFormData } from '../_types'

// ============================================
// Hook: 對話框狀態管理
// ============================================

const initialFormData: AttractionFormData = {
  name: '',
  english_name: '',
  description: '',
  country_id: '',
  region_id: '',
  city_id: '',
  category: '景點',
  tags: '',
  duration_minutes: 60,
  address: '',
  phone: '',
  website: '',
  images: '',
  notes: '',
  is_active: true,
}

export function useAttractionsDialog() {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null)

  const openAdd = () => setIsAddOpen(true)
  const closeAdd = () => setIsAddOpen(false)

  const openEdit = (attraction: Attraction) => {
    setEditingAttraction(attraction)
    setIsEditOpen(true)
  }

  const closeEdit = () => {
    setIsEditOpen(false)
    setEditingAttraction(null)
  }

  return {
    // 新增對話框
    isAddOpen,
    openAdd,
    closeAdd,
    // 編輯對話框
    isEditOpen,
    editingAttraction,
    openEdit,
    closeEdit,
    // 初始表單資料
    initialFormData,
  }
}
