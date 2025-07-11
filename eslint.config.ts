import globals from 'globals'
import pluginJs from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'

export default [
  {
    name: 'global/base',
    languageOptions: { globals: globals.browser },
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

  // Special rules for tests
  {
    name: 'eslint/tests',
    files: ['tests/**/*.ts'],
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
