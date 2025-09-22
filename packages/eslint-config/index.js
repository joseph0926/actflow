import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import importPlugin from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.FlatConfig[]} */
const config = [
  {
    ignores: [
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/node_modules/**',
      'eslint.config.{js,mjs,cjs,ts}',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2023,
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'no-duplicate-imports': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        sourceType: 'module',
        ecmaVersion: 2023,
      },
      globals: { ...globals.node, ...globals.browser },
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['packages/*/tsconfig.json'],
        },
        node: {
          extensions: ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.d.ts'],
        },
      },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': [
        'warn',
        {
          allowNumber: true,
          allowBoolean: true,
          allowNullish: false,
          allowRegExp: true,
        },
      ],
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-explicit-any': ['warn', { ignoreRestArgs: true }],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      '@typescript-eslint/no-misused-promises': [
        'warn',
        {
          checksVoidReturn: { attributes: false },
        },
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 5,
        },
      ],
      'no-duplicate-imports': 'error',
      'prefer-template': 'error',
      'no-console': 'warn',
      curly: 'error',
      eqeqeq: ['error', 'smart'],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'fs', message: "Use 'node:fs'." },
            { name: 'path', message: "Use 'node:path'." },
            { name: 'os', message: "Use 'node:os'." },
            { name: 'url', message: "Use 'node:url'." },
            { name: 'crypto', message: "Use 'node:crypto'." },
            { name: 'stream', message: "Use 'node:stream'." },
            { name: 'events', message: "Use 'node:events'." },
            { name: 'util', message: "Use 'node:util'." },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    plugins: { 'simple-import-sort': simpleImportSort, import: importPlugin },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^node:'],
            [
              '^(assert|buffer|child_process|cluster|crypto|dgram|dns|domain|events|fs|http|http2|https|net|os|path|perf_hooks|process|punycode|querystring|readline|repl|stream|string_decoder|timers|tls|tty|url|util|v8|vm|zlib)(/.*)?$',
            ],
            ['^react$', '^react-dom$', '^next(/.*)?$'],
            ['^@?\\w'],
            ['^@actionflow(/.*)?$', '^@tagforge(/.*)?$'],
            ['^@/'],
            ['^\\.\\.(?!/?$)', '^\\.\\./'],
            ['^\\./(?!/?$)', '^\\./'],
            ['^.+\\.(css|scss|sass|less)$'],
            ['^.+\\.(svg|png|jpe?g|gif|webp|avif)$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      'import/no-cycle': ['error', { maxDepth: 3, ignoreExternal: true }],
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.test.*',
            '**/*.spec.*',
            '**/tests/**',
            'scripts/**',
            '**/*.config.*',
            'packages/**/vitest.config.*',
            'packages/**/vite.config.*',
          ],
        },
      ],
    },
  },
  {
    files: ['packages/server/**/*.{ts,tsx}', 'packages/core/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      'no-restricted-syntax': [
        'error',
        { selector: 'ExportDefaultDeclaration', message: 'Use named exports in library packages.' },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'Server/Core must not depend on React.' },
            { name: 'react-dom', message: 'Server/Core must not depend on React DOM.' },
            { name: 'next/navigation', message: 'Client-only API is forbidden in server/core.' },
            { name: 'next/link', message: 'Client component forbidden in server/core.' },
            { name: 'next/image', message: 'Client component forbidden in server/core.' },
            { name: 'next/head', message: 'Client component forbidden in server/core.' },
            { name: 'client-only', message: 'Client-only marker is forbidden in server/core.' },
          ],
          patterns: [
            {
              group: ['@/app/**', '@/components/**', '@/**'],
              message: 'Do not import app/client aliases in server/core.',
            },
            { group: ['**/*.{css,scss,sass,less}'], message: 'No style imports in server/core.' },
            {
              group: ['**/*.{png,jpg,jpeg,gif,svg,webp,avif}'],
              message: 'No asset imports in server/core.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/*/vitest.config.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['packages/core/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@actionflow/react', '@actionflow/server', '@actionflow/adapter-react-query'],
              message: 'core must not depend on higher layers.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/server/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@actionflow/react', '@actionflow/adapter-react-query'],
              message: 'server can depend only on @actionflow/core.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/react/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@actionflow/server'], message: 'react must not depend on server.' },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/adapter-react-query/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@actionflow/server'],
              message: 'adapter-react-query must not depend on server.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/react/**/*.{ts,tsx,js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      sourceType: 'module',
      ecmaVersion: 2023,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
  {
    files: ['scripts/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx,js,jsx}'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },
  eslintConfigPrettier,
];

export default config;
