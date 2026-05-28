import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import prettierConfig from 'eslint-config-prettier'
import venturoDesignSystem from './eslint-rules/venturo-design-system.js'

export default tseslint.config(
  // 全域忽略
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**',
      'out/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.husky/**',
      '.claude/**',
      '.env*',
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
      'lint-report.json',
      'scripts/**', // 忽略所有腳本
      'tools/**',
      '.storybook/**',
      'src/stories/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      'src/lib/db/verify-and-fix.ts',
      'src/lib/performance/memory-manager.ts',
      'src/lib/performance/monitor.ts',
      'analyze-code-quality.js',
      'auto-fix-code.js',
    ],
  },

  // 推薦的基礎設定 (JS + TS)
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // next-env.d.ts 特殊處理（Next.js 自動生成，不能改）
  {
    files: ['next-env.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },

  // 客製化與覆蓋規則
  {
    plugins: {
      'react-hooks': reactHooks,
      venturo: venturoDesignSystem,
    },
    rules: {
      // =====================================================
      // Venturo 設計系統規則 (2026-01-01 更新)
      // @see docs/DESIGN_SYSTEM.md
      // =====================================================
      // 先設為 warn，穩定後改為 error
      'venturo/no-forbidden-classes': 'warn',
      // 頁面佈局檢查 - 暫時關閉，待修復現有頁面後開啟
      'venturo/prefer-standard-layout': 'off',
      // 禁止自訂 Modal/Dialog - 應使用標準 Dialog 組件
      'venturo/no-custom-modal': 'warn',
      // Dialog 按鈕需要圖標
      'venturo/button-requires-icon': 'warn',
      // 表單標籤一致性
      'venturo/consistent-form-label': 'warn',
      // 禁止 JSX hardcoded 中文（強迫中央化、防新功能再寫 hardcoded label）
      'venturo/no-hardcoded-chinese-jsx': 'warn',
      // 紅線：防連點（FormDialog 必傳 loading prop）
      'venturo/form-dialog-loading-required': 'warn',
      // 紅線 F：頁面不准直接 useSWR（走 entity hook / createReportHook）
      // 2026-05-19 升 'error' + 既有違反走 .eslint-suppressions.json baseline
      'venturo/no-direct-useswr-in-pages': 'error',
      // 紅線 F：頁面不准直接 supabase 寫入（走 apiMutate + API route）
      // 2026-05-19 升 'error' + 既有違反走 .eslint-suppressions.json baseline
      'venturo/no-direct-supabase-writes': 'error',
      // 2026-05-26 夜間：UI SSOT D1 守門——禁止散刻原生 <input>（warn、不擋 CI、漸進清）
      'venturo/no-raw-input': 'warn',
      // 2026-05-26 紅線 I：禁止 mutate/globalMutate(key, undefined, ...) 清空 cache 的 footgun
      // 全盤盤點發現此 pattern 曾散在 8 處、是「刪除/新增後閃舊資料」反覆復發的根因
      'venturo/no-mutate-clear': 'error',

      // 5/21 William 拍板：禁止在迴圈內 await 單筆編號 RPC、會撞 unique
      // 必用批次 wrapper（譬如 nextPaymentRequestItemNumbers）
      'venturo/no-in-loop-number-rpc': 'error',

      // 暫時保留原設定中被放寬的規則，以避免一次性出現大量新錯誤
      'prefer-const': 'off',
      // 2026-05-06 Phase 2: no-unused-vars 'off' → 'warn'（後續 PR 逐步清）
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      // 允許 @ts-nocheck 和 @ts-ignore（部分舊檔案需要，待 DB migration 後移除）
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'react-hooks/rules-of-hooks': 'off', // 建議在下一階段開啟 (error)
      // Word doc SEC-006 / code quality rules (2026-05-17)
      'react-hooks/exhaustive-deps': 'warn',

      // 暫時禁用頑固的 no-undef 規則，以便專注於其他問題
      'no-undef': 'off',

      // 保留部分原有規則
      'no-var': 'error',
      // Word doc SEC-006 / code quality rules (2026-05-17)
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // =====================================================
      // 權限系統 SSOT 守門（2026-04-23）
      // 唯一權限來源 = role_tab_permissions（HR 職務管理）
      // API：useTabPermissions().canRead / canWrite / canReadAny / canWriteAny
      // =====================================================
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/hooks/usePermissions',
              message:
                '已廢棄（讀 user.permissions array、繞過 HR）。改用 useTabPermissions from @/lib/permissions',
            },
          ],
          patterns: [
            {
              group: ['**/lib/permissions/hooks'],
              importNames: ['useRolePermissions'],
              message:
                'useRolePermissions 是空殼 hook（permissions 永遠 []、canWrite 永遠回 true）。改用 useTabPermissions',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          // 直接用 *.permissions.{includes,some,find,filter,map}(...)
          selector:
            'CallExpression[callee.property.name=/^(includes|some|find|filter|map|every)$/][callee.object.property.name="permissions"]',
          message:
            '不准用 *.permissions.xxx(...) 查權限。請走 useTabPermissions().canRead / canWrite / canReadAny / canWriteAny — HR 為 SSOT',
        },
        {
          // 把 user.permissions 賦值給中介變數（常見繞過手法）
          selector:
            'VariableDeclarator[init.property.name="permissions"][init.object.property.name="user"], VariableDeclarator[init.left.property.name="permissions"][init.left.object.property.name="user"]',
          message:
            '不准把 user.permissions 拿出來用。權限請走 useTabPermissions — HR 為 SSOT',
        },
      ],

      // 關閉與 Prettier 衝突或不需要的規則
      quotes: 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'no-useless-catch': 'off',
      'no-async-promise-executor': 'off',
      'no-irregular-whitespace': 'off',
      'no-redeclare': 'off',
      'no-empty': 'off',
    },
  },

  // Prettier 整合 (必須放在最後)
  prettierConfig
)
