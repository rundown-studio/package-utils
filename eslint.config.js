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

  // Typescript sepcific
  ...tseslint.configs.recommended,
  {
    name: 'typescript-eslint/overwrites',
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
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
      'src/**/*.js',
      'src/**/*.ts',
    ],
    rules: {
      ...stylistic.configs['recommended-flat'].rules,
      '@stylistic/quotes': ['warn', 'single'],
      '@stylistic/semi': ['warn', 'never'],
      '@stylistic/indent': ['warn', 2, { SwitchCase: 1 }],
      '@stylistic/comma-dangle': ['warn', 'always-multiline'],
      '@stylistic/space-before-function-paren': ['warn', 'always'],
      '@stylistic/object-curly-spacing': ['warn', 'always'],
    },
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
    ],
  },
]
