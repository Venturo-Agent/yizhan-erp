import { Todo } from '@/stores/types'

export interface TodoExpandedViewProps {
  todo: Todo
  onUpdate: (updates: Partial<Todo>) => void
  onClose: () => void
  onDelete?: () => void | Promise<void>
}

export type QuickActionType = 'receipt' | 'invoice' | 'share'

export interface QuickActionInstance {
  id: string
  type: QuickActionType
}

export interface NotesSectionProps {
  todo: Todo
  onUpdate: (updates: Partial<Todo>) => void
}

export interface AssignmentSectionProps {
  todo: Todo
  onUpdate: (updates: Partial<Todo>) => void
  readOnly?: boolean
}

export interface QuickActionsButtonsProps {
  onAdd: (type: QuickActionType) => void
}

export interface QuickActionInstanceCardProps {
  instance: QuickActionInstance
  todo: Todo
  onUpdate: (updates: Partial<Todo>) => void
  onRemove: () => void
}
