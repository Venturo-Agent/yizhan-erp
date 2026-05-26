import { KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

export function useDefaultDndSensors() {
  const pointer = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
  const keyboard = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
  return useSensors(pointer, keyboard)
}

export function useLongPressDndSensors() {
  const pointer = useSensor(PointerSensor, {
    activationConstraint: { delay: 500, tolerance: 8 },
  })
  const touch = useSensor(TouchSensor, {
    activationConstraint: { delay: 500, tolerance: 8 },
  })
  const keyboard = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
  return useSensors(pointer, touch, keyboard)
}

export function useImmediateDndSensors() {
  const pointer = useSensor(PointerSensor)
  const keyboard = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
  return useSensors(pointer, keyboard)
}
