import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

const eslintConfig = [
  // Ignore patterns for build and script folders
  {
    ignores: [
      '.next/**',
      '.next-preview*/**',
      'scripts/**',
      'scratch/**',
      'backup/**',
      'mongo-migration/**',
      'node_modules/**',
      'out/**',
      'build/**',
    ],
  },
  // Configuration for TypeScript and JavaScript files
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // No unused variables - strict enforcement
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'prefer-const': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'off',
    },
  },
];

export default eslintConfig;
