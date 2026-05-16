// barrel — re-exports all editor label sub-modules and re-assembles COMP_EDITOR_LABELS
import { EDITOR_MEDIA_LABELS } from './media'
import { EDITOR_ITINERARY_LABELS } from './itinerary'
import { EDITOR_UI_LABELS } from './ui'

export { EDITOR_MEDIA_LABELS, EDITOR_ITINERARY_LABELS, EDITOR_UI_LABELS }

// COMP_EDITOR_LABELS is the public API — callers import this name
export const COMP_EDITOR_LABELS = {
  ...EDITOR_MEDIA_LABELS,
  ...EDITOR_ITINERARY_LABELS,
  ...EDITOR_UI_LABELS,
}
