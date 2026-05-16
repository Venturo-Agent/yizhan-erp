// comp-tours 模組 UI 標籤常量（通用、跨模組共享）
// 拆分至 common-vocab.ts（詞彙）與 common-widgets.ts（widget 結構化標籤）再合併

import { COMP_TOURS_VOCAB } from './common-vocab'
import { COMP_TOURS_WIDGETS } from './common-widgets'

export const COMP_TOURS_LABELS = {
  ...COMP_TOURS_VOCAB,
  ...COMP_TOURS_WIDGETS,
} as const
