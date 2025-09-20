import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/** @type {import('eslint').Linter.FlatConfig[]} */
const config = [
  {
    ignores: [
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/node_modules/**',
      '*.config.{js,mjs,cjs,ts}',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    ...js.configs.recommended,
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2023,
      globals: {
        ...globals.node,
        ...globals.browser,
      },
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
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
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
    },
  },
  {
    files: [
      'packages/core/**/*',
      'packages/server/**/*',
      'packages/adapter-react-query/**/*',
      'scripts/**/*',
    ],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'module',
      ecmaVersion: 2023,
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
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx,js,jsx}'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    rules: {
      'no-console': 'warn',
      curly: 'error',
      eqeqeq: ['error', 'smart'],
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
];

export default config;
