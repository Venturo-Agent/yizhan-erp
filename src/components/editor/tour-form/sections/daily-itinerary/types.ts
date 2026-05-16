import { Activity, DailyItinerary, TourFormData } from '../../types'

// 擴展型別（與 AttractionSelector 一致）
export interface AttractionWithCity {
  id: string
  name: string
  description?: string
  image?: string
  images?: string[]
  city_name?: string
}

// 飯店資料型別
interface HotelData {
  id: string
  name: string
  name_en?: string
  brand?: string
  star_rating?: number
  hotel_class?: string
  city_name?: string
  image?: string
}

// 餐廳資料型別
interface RestaurantData {
  id: string
  name: string
  name_en?: string
  cuisine_type?: string[]
  category?: string
  price_range?: string
  city_name?: string
  is_michelin?: boolean
  michelin_stars?: number
  image?: string
}

// Props 型別
interface DailyItinerarySectionProps {
  data: TourFormData
  updateField: (field: string, value: unknown) => void
  addDailyItinerary: () => void
  updateDailyItinerary: (
    index: number,
    field: string | Record<string, unknown>,
    value?: unknown
  ) => void
  removeDailyItinerary: (index: number) => void
  swapDailyItinerary?: (fromIndex: number, toIndex: number) => void
  addActivity: (dayIndex: number) => void
  updateActivity: (dayIndex: number, actIndex: number, field: string, value: string) => void
  removeActivity: (dayIndex: number, actIndex: number) => void
  reorderActivities?: (dayIndex: number, activities: Activity[]) => void
  addDayImage: (dayIndex: number) => void
  updateDayImage: (dayIndex: number, imageIndex: number, value: string) => void
  removeDayImage: (dayIndex: number, imageIndex: number) => void
  addRecommendation: (dayIndex: number) => void
  updateRecommendation: (dayIndex: number, recIndex: number, value: string) => void
  removeRecommendation: (dayIndex: number, recIndex: number) => void
}

export interface SortableActivityItemProps {
  activity: Activity
  actIndex: number
  dayIndex: number
  is_collapsed?: boolean
  on_toggle_collapse?: () => void
  updateActivity: (dayIndex: number, actIndex: number, field: string, value: string) => void
  removeActivity: (dayIndex: number, actIndex: number) => void
  handleActivityImageUpload: (dayIndex: number, actIndex: number, file: File) => void
  handleExternalImageUpload?: (
    dayIndex: number,
    actIndex: number,
    imageUrl: string
  ) => Promise<void>
  isActivityUploading: boolean
  isActivityDragOver: boolean
  setActivityDragOver: (value: { dayIndex: number; actIndex: number } | null) => void
  activityFileInputRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>
  onOpenPositionEditor: (dayIndex: number, actIndex: number) => void
  onSaveToDatabase?: (activity: Activity, dayIndex: number, actIndex: number) => Promise<void>
}

export interface SortableActivityGridItemProps {
  activity: Activity
  actIndex: number
  dayIndex: number
}

export interface DayCardProps {
  day: DailyItinerary
  dayIndex: number
  dayLabel: string
  data: TourFormData
  // Collapse state
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  // 鎖定狀態（有關聯報價單時鎖定住宿編輯）
  isAccommodationLockedByQuote?: boolean
  // Actions
  updateDailyItinerary: (
    index: number,
    field: string | Record<string, unknown>,
    value?: unknown
  ) => void
  removeDailyItinerary: (index: number) => void
  swapDailyItinerary?: (fromIndex: number, toIndex: number) => void
  addActivity: (dayIndex: number) => void
  updateActivity: (dayIndex: number, actIndex: number, field: string, value: string) => void
  removeActivity: (dayIndex: number, actIndex: number) => void
  reorderActivities?: (dayIndex: number, activities: Activity[]) => void
  addRecommendation: (dayIndex: number) => void
  updateRecommendation: (dayIndex: number, recIndex: number, value: string) => void
  removeRecommendation: (dayIndex: number, recIndex: number) => void
  updateField: (field: string, value: unknown) => void
  // Selector handlers
  onOpenAttractionSelector: (dayIndex: number) => void
  onOpenHotelSelector: (dayIndex: number) => void
  onOpenRestaurantSelector: (dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner') => void
  // Image upload handlers
  handleActivityImageUpload: (dayIndex: number, actIndex: number, file: File) => Promise<void>
  handleExternalImageUpload?: (
    dayIndex: number,
    actIndex: number,
    imageUrl: string
  ) => Promise<void>
  onOpenPositionEditor: (dayIndex: number, actIndex: number) => void
}

export interface MealSelectorState {
  dayIndex: number
  mealType: 'breakfast' | 'lunch' | 'dinner'
}
