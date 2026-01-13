import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import svelte from 'eslint-plugin-svelte'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  prettier,
  ...svelte.configs['flat/prettier'],
  {
    ignores: [
      'node_modules',
      '**/node_modules',
      'dist',
      '**/dist',
      'build',
      '**/build',
    ],
  },
  {
    files: ['**/electron.js', '**/electron-logger.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Disable: {@html} is used intentionally for mrkdwn rendering
      'svelte/no-at-html-tags': 'off',
      // Downgrade to warning: good practice but not critical
      'svelte/require-each-key': 'warn',
      // Disable: current $state + $effect patterns work fine
      'svelte/prefer-writable-derived': 'off',
      // Disable: expressions like `arr.length` are used to create effect dependencies
      '@typescript-eslint/no-unused-expressions': 'off',
      // Disable: Map/Set are often used for non-reactive caching purposes
      'svelte/prefer-svelte-reactivity': 'off',
    },
  },
  {
    // Override Svelte plugin's config for .svelte.ts files - these are TS files, not Svelte components
    files: ['**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Disable: these files often use Map/Set for non-reactive purposes
      'svelte/prefer-svelte-reactivity': 'off',
    },
  }
)
