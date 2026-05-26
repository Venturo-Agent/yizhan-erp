/**
 * Venturo Design System ESLint Plugin
 *
 * 自動檢查設計規範違規：
 * 1. 禁止使用 gray-* 顏色類別（應使用 CSS 變數）
 * 2. 禁止在 style 中硬編碼顏色
 * 3. 檢查是否使用標準組件
 * 4. 檢查自訂 Modal/Dialog 實現
 * 5. 檢查按鈕是否有圖標
 * 6. 檢查表單標籤一致性
 *
 * @see docs/DESIGN_SYSTEM.md
 * @see docs/VENTURO_UI_DESIGN_STYLE.md
 */

// 禁止的 Tailwind 類別模式
const FORBIDDEN_CLASS_PATTERNS = [
  {
    pattern: /\b(border-gray-\d+)/g,
    message: '請使用 border-border 或 border-border/60 代替 $1',
    suggestion: 'border-border',
  },
  {
    pattern: /\b(bg-gray-\d+)/g,
    message: '請使用 bg-morandi-container 或 CSS 變數代替 $1',
    suggestion: 'bg-morandi-container',
  },
  {
    pattern: /\b(text-gray-\d+)/g,
    message: '請使用 text-morandi-secondary 或 text-morandi-primary 代替 $1',
    suggestion: 'text-morandi-secondary',
  },
  {
    pattern: /\b(rounded-sm)\b/g,
    message: '請使用 rounded-md 或 rounded-lg 代替 rounded-sm（太小）',
    suggestion: 'rounded-lg',
  },
  {
    pattern: /\b(rounded-3xl)\b/g,
    message: '請使用 rounded-xl 或 rounded-2xl 代替 rounded-3xl（太大）',
    suggestion: 'rounded-xl',
  },
  {
    pattern: /\b(shadow-xl|shadow-2xl)\b/g,
    message: '請使用 shadow-lg 或 shadow-md 代替 $1（過度）',
    suggestion: 'shadow-lg',
  },

  // ─────────────────────────────────────────────
  // UI 大改前置 — 禁止 Tailwind arbitrary value 硬編碼
  // 對應 docs/DESIGN_TOKENS.md 紅線
  // ─────────────────────────────────────────────
  {
    pattern:
      /\b(?:bg|text|border|fill|stroke|ring|outline|divide|placeholder|caret|accent|decoration)-\[#[0-9a-fA-F]{3,8}\]/g,
    message:
      '禁止硬編碼顏色。請用 design token（bg-gold / bg-info / bg-morandi-* 等）。見 docs/DESIGN_TOKENS.md',
    suggestion: 'bg-gold',
  },
  {
    pattern: /\bshadow-\[(?:rgba?\([^)]+\)|#[0-9a-fA-F]+|var\([^)]+\))[^\]]*\]/g,
    message: '禁止硬編碼 shadow。請用 shadow-sm / shadow-md / shadow-lg / shadow-xl / shadow-2xl',
    suggestion: 'shadow-md',
  },
  {
    pattern: /\brounded(?:-[trblxy]{1,2})?-\[\d+(?:\.\d+)?(?:px|rem|em)\]/g,
    message:
      '禁止硬編碼 rounded。請用 rounded-card / rounded-card-sm / rounded-button / rounded-input / rounded-badge',
    suggestion: 'rounded-card',
  },
]

// 禁止的硬編碼顏色（應使用 CSS 變數）
const FORBIDDEN_HARDCODED_COLORS = [
  // 不包含 Morandi 主題色，只禁止非設計系統的顏色
  { pattern: /#(?:gray|grey)/i, message: '請使用 CSS 變數代替硬編碼灰色' },
]

/**
 * 檢查 JSX 屬性中的 className 違規
 */
function checkClassName(context, node, value) {
  if (typeof value !== 'string') return

  for (const rule of FORBIDDEN_CLASS_PATTERNS) {
    const matches = value.matchAll(rule.pattern)
    for (const match of matches) {
      context.report({
        node,
        message: rule.message.replace('$1', match[1] || match[0]),
        data: {
          found: match[0],
          suggestion: rule.suggestion,
        },
      })
    }
  }
}

/**
 * 檢查 style 屬性中的硬編碼顏色
 */
function checkStyleForHardcodedColors(context, node, styleValue) {
  // 只檢查物件格式的 style
  if (!styleValue || typeof styleValue !== 'object') return

  const colorProperties = ['color', 'backgroundColor', 'borderColor', 'background']

  for (const prop of colorProperties) {
    if (styleValue[prop] && typeof styleValue[prop] === 'string') {
      const value = styleValue[prop]
      // 檢查是否是硬編碼的 hex 顏色（排除 CSS 變數）
      if (/^#[0-9a-fA-F]{3,8}$/.test(value) && !value.includes('var(')) {
        // 排除 Morandi 設計系統的顏色
        const morandiColors = [
          '#3a3633',
          '#8b8680',
          '#c9aa7c',
          '#c4a572',
          '#a08968',
          '#b8996b',
          '#9fa68f',
          '#c08374',
          '#e8e5e0',
          '#b8b2aa',
          '#f6f4f1',
          '#d4c4b0',
          '#B8A99A',
          '#FAF7F2',
          '#333333', // 允許這些常用的
        ]
        if (!morandiColors.some(c => c.toLowerCase() === value.toLowerCase())) {
          context.report({
            node,
            message: `避免在 style 中硬編碼顏色 "${value}"，請使用 CSS 變數如 var(--morandi-gold)`,
          })
        }
      }
    }
  }
}

module.exports = {
  meta: {
    name: 'venturo-design-system',
    version: '1.0.0',
  },
  rules: {
    /**
     * 禁止使用非設計系統的 Tailwind 類別
     */
    'no-forbidden-classes': {
      meta: {
        type: 'suggestion',
        docs: {
          description: '禁止使用非 Venturo 設計系統的 Tailwind 類別',
          category: 'Stylistic Issues',
          recommended: true,
        },
        messages: {
          forbidden: '{{ message }}',
        },
        schema: [],
      },
      create(context) {
        return {
          // 檢查 JSX 屬性
          JSXAttribute(node) {
            if (node.name.name !== 'className') return

            // 處理字串字面值
            if (node.value && node.value.type === 'Literal') {
              checkClassName(context, node, node.value.value)
            }

            // 處理模板字串
            if (node.value && node.value.type === 'JSXExpressionContainer') {
              const expr = node.value.expression

              // 簡單字串
              if (expr.type === 'Literal') {
                checkClassName(context, node, expr.value)
              }

              // 模板字串
              if (expr.type === 'TemplateLiteral') {
                for (const quasi of expr.quasis) {
                  checkClassName(context, node, quasi.value.raw)
                }
              }

              // cn() 或 clsx() 函數呼叫
              if (expr.type === 'CallExpression') {
                for (const arg of expr.arguments) {
                  if (arg.type === 'Literal' && typeof arg.value === 'string') {
                    checkClassName(context, node, arg.value)
                  }
                  if (arg.type === 'TemplateLiteral') {
                    for (const quasi of arg.quasis) {
                      checkClassName(context, node, quasi.value.raw)
                    }
                  }
                }
              }
            }
          },
        }
      },
    },

    /**
     * 禁止 JSX 內 hardcoded 中文 — 應抽到 labels constant
     * 例外：純空格 / punctuation 混合中文
     */
    'no-hardcoded-chinese-jsx': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'JSX 內不准 hardcoded 中文、應抽到 labels constant',
          category: 'i18n',
          recommended: true,
        },
        messages: {
          hardcoded: '禁止 hardcoded 中文「{{ text }}」、請抽到 labels constant',
        },
        schema: [],
      },
      create(context) {
        return {
          JSXText(node) {
            const text = node.value.trim()
            if (text && /[一-鿿]/.test(text)) {
              context.report({
                node,
                messageId: 'hardcoded',
                data: { text: text.length > 20 ? text.slice(0, 20) + '...' : text },
              })
            }
          },
          JSXAttribute(node) {
            // placeholder / title / aria-label 內的 hardcoded 中文
            if (
              !['placeholder', 'title'].includes(node.name.name) &&
              node.name.name !== 'aria-label'
            )
              return
            if (!node.value || node.value.type !== 'Literal') return
            const val = node.value.value
            if (typeof val === 'string' && /[一-鿿]/.test(val)) {
              context.report({
                node,
                messageId: 'hardcoded',
                data: { text: val.length > 20 ? val.slice(0, 20) + '...' : val },
              })
            }
          },
        }
      },
    },

    /**
     * 建議使用標準佈局組件
     */
    'prefer-standard-layout': {
      meta: {
        type: 'suggestion',
        docs: {
          description: '頁面應使用 StandardPageLayout 或 ListPageLayout',
          category: 'Best Practices',
          recommended: true,
        },
        messages: {
          missingLayout: '頁面應使用 StandardPageLayout 或 ListPageLayout 組件',
        },
        schema: [],
      },
      create(context) {
        const filename = context.getFilename()

        // 只檢查 page.tsx 檔案
        if (!filename.endsWith('page.tsx')) return {}

        // 排除特殊頁面
        const excludedPaths = [
          '/login/',
          '/itinerary/new/',
          '/view/',
          '/confirm/',
          '/m/', // 手機版頁面
        ]
        if (excludedPaths.some(p => filename.includes(p))) return {}

        let hasStandardLayout = false
        let hasListPageLayout = false

        return {
          ImportDeclaration(node) {
            const source = node.source.value
            if (source.includes('standard-page-layout') || source.includes('StandardPageLayout')) {
              hasStandardLayout = true
            }
            if (source.includes('list-page-layout') || source.includes('ListPageLayout')) {
              hasListPageLayout = true
            }
          },
          'Program:exit'(node) {
            if (!hasStandardLayout && !hasListPageLayout) {
              context.report({
                node,
                messageId: 'missingLayout',
              })
            }
          },
        }
      },
    },

    /**
     * 禁止自訂 Modal/Dialog 實現
     * 應使用標準 Dialog 組件
     */
    'no-custom-modal': {
      meta: {
        type: 'suggestion',
        docs: {
          description: '禁止自訂 Modal/Dialog 遮罩層，應使用標準 Dialog 組件',
          category: 'Best Practices',
          recommended: true,
        },
        messages: {
          customModal:
            '發現自訂 Modal 遮罩層 (fixed inset-0)，請使用標準 Dialog 組件 from @/components/ui/dialog',
        },
        schema: [],
      },
      create(context) {
        const filename = context.getFilename()

        // 排除標準 Dialog 組件本身
        if (
          filename.includes('/ui/dialog.tsx') ||
          filename.includes('/ui/sheet.tsx') ||
          filename.includes('/ui/drawer.tsx')
        ) {
          return {}
        }

        return {
          JSXAttribute(node) {
            if (node.name.name !== 'className') return

            let classValue = ''
            if (node.value && node.value.type === 'Literal') {
              classValue = node.value.value || ''
            } else if (node.value && node.value.type === 'JSXExpressionContainer') {
              const expr = node.value.expression
              if (expr.type === 'Literal') {
                classValue = expr.value || ''
              }
            }

            // 檢查是否是自訂遮罩層模式
            if (
              classValue.includes('fixed') &&
              classValue.includes('inset-0') &&
              (classValue.includes('bg-black') ||
                classValue.includes('z-50') ||
                classValue.includes('z-['))
            ) {
              context.report({
                node,
                messageId: 'customModal',
              })
            }
          },
        }
      },
    },

    /**
     * 檢查 Dialog 按鈕是否有圖標
     */
    'button-requires-icon': {
      meta: {
        type: 'suggestion',
        docs: {
          description: '主要操作按鈕（儲存、確認、新增、取消、刪除）應有圖標',
          category: 'Best Practices',
          recommended: true,
        },
        messages: {
          missingIcon:
            '按鈕 "{{ text }}" 缺少圖標，主要操作按鈕應包含圖標（如 Save, Check, Plus, X, Trash2）',
        },
        schema: [],
      },
      create(context) {
        const filename = context.getFilename()

        // 只檢查 Dialog 相關檔案
        if (!filename.includes('Dialog') && !filename.includes('dialog')) {
          return {}
        }

        const actionKeywords = [
          '儲存',
          '保存',
          '確認',
          '新增',
          '取消',
          '刪除',
          'Save',
          'Confirm',
          'Add',
          'Cancel',
          'Delete',
          '提交',
          'Submit',
        ]

        return {
          JSXElement(node) {
            // 檢查是否是 Button 組件
            const openingElement = node.openingElement
            if (!openingElement || !openingElement.name) return

            const elementName = openingElement.name.name
            if (elementName !== 'Button') return

            // 獲取按鈕的子元素
            const children = node.children || []
            let hasIcon = false
            let buttonText = ''

            const iconNames = [
              'Save',
              'Check',
              'Plus',
              'X',
              'Trash2',
              'Edit2',
              'RefreshCw',
              'Upload',
              'Download',
              'Search',
              'Printer',
              'Loader2',
            ]

            // 遞迴檢查是否有圖標
            function checkForIcon(node) {
              if (!node) return false
              if (node.type === 'JSXElement') {
                const name = node.openingElement?.name?.name || ''
                if (iconNames.includes(name)) return true
                // 檢查子元素
                for (const child of node.children || []) {
                  if (checkForIcon(child)) return true
                }
              }
              if (node.type === 'JSXExpressionContainer') {
                return checkForIcon(node.expression)
              }
              if (node.type === 'ConditionalExpression') {
                return checkForIcon(node.consequent) || checkForIcon(node.alternate)
              }
              if (node.type === 'LogicalExpression') {
                return checkForIcon(node.left) || checkForIcon(node.right)
              }
              return false
            }

            for (const child of children) {
              // 檢查是否有圖標組件（包括三元運算符和邏輯運算符）
              if (checkForIcon(child)) {
                hasIcon = true
              }
              // 收集文字內容
              if (child.type === 'JSXText') {
                buttonText += child.value.trim()
              }
              if (child.type === 'Literal') {
                buttonText += String(child.value).trim()
              }
            }

            // 如果按鈕文字包含操作關鍵字但沒有圖標，報告警告
            if (
              buttonText &&
              actionKeywords.some(keyword => buttonText.includes(keyword)) &&
              !hasIcon
            ) {
              context.report({
                node,
                messageId: 'missingIcon',
                data: { text: buttonText },
              })
            }
          },
        }
      },
    },

    /**
     * 檢查表單標籤一致性
     */
    'consistent-form-label': {
      meta: {
        type: 'suggestion',
        docs: {
          description: '表單標籤應使用統一的樣式：text-sm font-medium text-morandi-primary mb-2',
          category: 'Stylistic Issues',
          recommended: true,
        },
        messages: {
          inconsistentLabel:
            '表單標籤樣式不一致，建議使用：block text-sm font-medium text-morandi-primary mb-2',
          wrongColor: '表單標籤應使用 text-morandi-primary 而非 text-morandi-secondary',
        },
        schema: [],
      },
      create(context) {
        return {
          JSXElement(node) {
            const openingElement = node.openingElement
            if (!openingElement || !openingElement.name) return

            const elementName = openingElement.name.name
            if (elementName !== 'label' && elementName !== 'Label') return

            // 獲取 className
            const classNameAttr = openingElement.attributes?.find(
              attr => attr.type === 'JSXAttribute' && attr.name?.name === 'className'
            )

            if (!classNameAttr || !classNameAttr.value) return

            let classValue = ''
            if (classNameAttr.value.type === 'Literal') {
              classValue = classNameAttr.value.value || ''
            }

            // 檢查是否使用了錯誤的顏色
            if (
              classValue.includes('text-morandi-secondary') &&
              !classValue.includes('text-morandi-primary')
            ) {
              context.report({
                node,
                messageId: 'wrongColor',
              })
            }
          },
        }
      },
    },

    /**
     * FormDialog 必傳 loading prop（防連點）
     *
     * 紅線：五大方向 5「防連點」— 所有儲存/刪除/確認按鈕必須 disabled={loading}
     * FormDialog 元件支援 loading prop、要求 caller 必傳、確保 dialog 內按鈕能 disable
     */
    'form-dialog-loading-required': {
      meta: {
        type: 'problem',
        docs: {
          description: '使用 <FormDialog> 必傳 loading prop、避免使用者連點重複提交',
          category: 'Best Practices',
          recommended: true,
        },
        messages: {
          missing:
            '<FormDialog> 必傳 `loading` prop（紅線：防連點）。父元件加 `const [isSubmitting, setIsSubmitting] = useState(false)`、handleSubmit 包 try-finally、傳 `loading={isSubmitting}`',
        },
        schema: [],
      },
      create(context) {
        return {
          JSXOpeningElement(node) {
            // 只檢查 <FormDialog ...>、不檢查自定義 wrapper（譬如 <SuppliersDialog>）
            if (!node.name || node.name.type !== 'JSXIdentifier') return
            if (node.name.name !== 'FormDialog') return

            const hasLoading = node.attributes.some(
              attr => attr.type === 'JSXAttribute' && attr.name?.name === 'loading'
            )

            if (!hasLoading) {
              context.report({
                node,
                messageId: 'missing',
              })
            }
          },
        }
      },
    },

    /**
     * 紅線 F：頁面 / component 不准直接 import useSWR（走 entity hook / createReportHook）
     *
     * 適用範圍：src/app/(main)/** 和 src/components/**
     * 排除：src/lib/swr/（工廠本身）、src/data/core/（工廠本身）
     */
    'no-direct-useswr-in-pages': {
      meta: {
        type: 'problem',
        docs: {
          description: '頁面與 component 不准直接 import useSWR（紅線 F）',
          category: 'Venturo SWR Architecture',
          recommended: true,
        },
        messages: {
          noDirectUseSWR:
            '禁止直接 import useSWR（紅線 F）。讀實體資料走 src/data/entities/ 的 entity hook；讀財務報表走 createReportHook。',
        },
        schema: [],
      },
      create(context) {
        const filename = context.getFilename()
        // 只檢查 app pages / components（不含 api routes、lib 工廠本身）
        const isPage =
          filename.includes('/src/app/(main)/') || filename.includes('/src/components/')
        const isFactory = filename.includes('/src/lib/swr/') || filename.includes('/src/data/core/')
        if (!isPage || isFactory) return {}

        return {
          ImportDeclaration(node) {
            if (node.source.value === 'swr') {
              context.report({ node, messageId: 'noDirectUseSWR' })
            }
          },
        }
      },
    },

    /**
     * 紅線 F：頁面 / component 不准對 supabase client 直接做寫入操作（走 apiMutate）
     *
     * 偵測：supabase.from('...').insert/update/upsert/delete 呼叫鏈
     * 適用範圍：src/app/(main)/**（排除 src/app/api/、lib 工廠）
     */
    /**
     * 禁止在 for / while 迴圈內 await 單筆 RPC（譬如 nextPaymentRequestItemNumber）
     *
     * 為什麼：單筆 RPC 每次新 transaction、loop 內 N 次呼叫看到的是 DB 既有 max
     *        新 row 還沒 insert、max 不變、N 個 row 拿到同一個編號 → 撞 unique
     *
     * 修法：改用批次 RPC（譬如 nextPaymentRequestItemNumbers）一次拿 N 個編號
     *
     * 對應紅線：「批次寫入必用批次 RPC、不在 loop 內 await 單筆 RPC」
     * 5/21 William 拍板「方案 A」、修 AddRequestDialog.edit-ops.ts 撞 unique bug。
     */
    'no-in-loop-number-rpc': {
      meta: {
        type: 'problem',
        docs: {
          description: '禁止在 for / while 迴圈內 await 單筆編號 RPC、會撞 unique',
          category: 'Venturo Data Safety',
          recommended: true,
        },
        messages: {
          inLoopRpc:
            '禁止在迴圈內 await {{name}}() — 會撞 unique constraint。改用批次 wrapper（譬如 {{batchName}}）一次拿 N 個。',
        },
        schema: [],
      },
      create(context) {
        // 抓 next*Number / generate*No 結尾的 single-row 編號 RPC
        const SINGLE_RPC_PATTERN = /^(next|generate).+(Number|No|Code)$/
        // 批次 wrapper 命名：複數結尾（Numbers / Codes）— 不算違反
        const BATCH_PATTERN = /^(next|generate).+(Numbers|Codes)$/

        function suggestBatchName(name) {
          // nextPaymentRequestItemNumber → nextPaymentRequestItemNumbers
          if (name.endsWith('Number')) return name + 's'
          if (name.endsWith('No')) return name + 's'
          if (name.endsWith('Code')) return name + 's'
          return name + ' batch wrapper'
        }

        function isInLoop(node) {
          let parent = node.parent
          while (parent) {
            if (
              parent.type === 'ForStatement' ||
              parent.type === 'ForInStatement' ||
              parent.type === 'ForOfStatement' ||
              parent.type === 'WhileStatement' ||
              parent.type === 'DoWhileStatement'
            ) {
              return true
            }
            // 不穿越 function boundary（譬如 .map callback 內的 await 也算問題、保守 detect）
            if (
              parent.type === 'FunctionDeclaration' ||
              parent.type === 'FunctionExpression' ||
              parent.type === 'ArrowFunctionExpression'
            ) {
              return false
            }
            parent = parent.parent
          }
          return false
        }

        return {
          AwaitExpression(node) {
            const arg = node.argument
            if (!arg || arg.type !== 'CallExpression') return
            const callee = arg.callee
            // 抓 identifier 形式：await nextPaymentRequestItemNumber(...)
            if (callee.type !== 'Identifier') return
            const name = callee.name
            if (!SINGLE_RPC_PATTERN.test(name)) return
            if (BATCH_PATTERN.test(name)) return // 批次版本豁免
            if (!isInLoop(node)) return

            context.report({
              node,
              messageId: 'inLoopRpc',
              data: { name, batchName: suggestBatchName(name) },
            })
          },
        }
      },
    },
    'no-direct-supabase-writes': {
      meta: {
        type: 'suggestion',
        docs: {
          description: '頁面 / component 不准直接呼叫 supabase 寫入（紅線 F）',
          category: 'Venturo SWR Architecture',
          recommended: true,
        },
        messages: {
          noDirectWrite:
            '禁止在 client 端直接呼叫 supabase .{{method}}()（紅線 F）。寫入應走 fetch API route + apiMutate 觸發 cache 失效。',
        },
        schema: [],
      },
      create(context) {
        const filename = context.getFilename()
        const isClientPage =
          filename.includes('/src/app/(main)/') || filename.includes('/src/components/')
        const isApiRoute = filename.includes('/src/app/api/')
        const isLibrary = filename.includes('/src/lib/') || filename.includes('/src/data/')
        if (!isClientPage || isApiRoute || isLibrary) return {}

        const WRITE_METHODS = new Set(['insert', 'update', 'upsert', 'delete'])

        return {
          CallExpression(node) {
            if (node.callee.type !== 'MemberExpression') return
            const methodName = node.callee.property?.name
            if (!WRITE_METHODS.has(methodName)) return

            // 往呼叫鏈找 .from()、確認是 supabase 寫入
            let obj = node.callee.object
            while (obj) {
              if (obj.type === 'CallExpression' && obj.callee.type === 'MemberExpression') {
                if (obj.callee.property?.name === 'from') {
                  context.report({ node, messageId: 'noDirectWrite', data: { method: methodName } })
                  return
                }
                obj = obj.callee.object
              } else {
                break
              }
            }
          },
        }
      },
    },
  },
}
