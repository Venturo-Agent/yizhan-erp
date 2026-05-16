// 📌 開發新 widget 前必讀：docs/WIDGET_DEVELOPMENT_GUIDE.md
// 特別是付費 widget、同步要加租戶管理頁的開關（見指南 Step 3）
import { Calculator, Clipboard, Shield } from 'lucide-react'
import type { WidgetConfig } from '../_types'
import { CalculatorWidget } from './calculator-widget'
import { NotesWidget } from './notes-widget'
import { AmadeusTotpWidget } from './amadeus-totp-widget'

// 小工具配置
export const AVAILABLE_WIDGETS: Array<Omit<WidgetConfig, 'id'> & { id: string }> = [
  {
    id: 'calculator',
    name: '計算機',
    icon: Calculator,
    component: CalculatorWidget,
    span: 1,
  },
  {
    id: 'notes',
    name: '便條紙',
    icon: Clipboard,
    component: NotesWidget,
    span: 1,
  },
  {
    id: 'amadeus-totp',
    name: 'Amadeus 驗證碼',
    icon: Shield,
    component: AmadeusTotpWidget,
    span: 1,
  },
]
