import globals from 'globals'
import pluginJs from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'

// Globals that exist in the browser but NOT in Node. Banned in src/ so the
// published package stays isomorphic (node ∩ browser). TypeScript can't catch
// these — the `dom` lib in tsconfig declares them as valid — so eslint is the
// only guard for the browser-only half of the intersection.
const browserOnlyGlobals = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'navigator',
  'location',
  'history',
  'alert',
  'confirm',
  'prompt',
  'XMLHttpRequest',
]

export default [
  {
    name: 'global/base',
    plugins: {
      '@stylistic': stylistic,
    },
  },

  // TypeScript specific
  ...tseslint.configs.recommended,
  {
    name: 'typescript-eslint/overwrites',
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    }
  },

  // JavaScript specific
  {
    name: 'eslint/js/recommended',
    files: ['src/**/*.js'],
    rules: {
      ...pluginJs.configs.recommended.rules,
    }
  },

  // Stylistic rules for js + ts
  {
    name: 'global/stylistic',
    files: [
      'src/**/*.ts',
    ],
    rules: {
      ...stylistic.configs['recommended'].rules,
      '@stylistic/quotes': ['warn', 'single'],
      '@stylistic/semi': ['warn', 'never'],
      '@stylistic/indent': ['warn', 2, { SwitchCase: 1 }],
      '@stylistic/comma-dangle': ['warn', 'always-multiline'],
      '@stylistic/space-before-function-paren': ['warn', 'always'],
      '@stylistic/object-curly-spacing': ['warn', 'always'],
      '@stylistic/arrow-parens': ['warn', 'always'],
      '@stylistic/brace-style': ['warn', '1tbs'],
    },
  },

  // src/ is isomorphic: it may only use APIs present in BOTH Node and the
  // browser. Declare just the shared-node-browser intersection as globals and
  // ban the browser-only ones outright.
  {
    name: 'env/src-isomorphic',
    files: ['src/**/*.ts', 'src/**/*.js'],
    ignores: ['src/**/__tests__/**', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
    languageOptions: { globals: globals['shared-node-browser'] },
    rules: {
      'no-restricted-globals': ['error', ...browserOnlyGlobals.map((name) => ({
        name,
        message: `'${name}' is browser-only — src/ must use APIs available in both Node and the browser to keep the package isomorphic.`,
      }))],
    },
  },

  // Tests and root config files always run in Node — give them Node globals.
  {
    name: 'env/node',
    files: ['**/__tests__/**/*.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts', '*.config.ts'],
    languageOptions: { globals: globals.node },
  },

  // Special rules for tests
  {
    name: 'eslint/tests',
    files: ['**/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    }
  },

  // Global ignore patterns
  {
    name: 'global/ignore',
    ignores: [
      '**/.*',
      '**/*.DEPRECATED.*',
      '**/*.OBSOLETE.*',
      '**/*.TEMP.*',
      'dist/*',
      'node_modules/*',
    ],
  },
]
