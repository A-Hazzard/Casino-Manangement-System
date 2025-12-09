import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  // Ignore patterns for build and script folders
  {
    ignores: [
      '.next/**',
      'scripts/**',
      'backup/**',
      'mongo-migration/**',
      'node_modules/**',
      'out/**',
      'build/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Prefer const assertions and proper typing
      'prefer-const': 'error',

      // Allow all console methods
      'no-console': 'off',

      // Catch unused variables
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
];

export default eslintConfig;
