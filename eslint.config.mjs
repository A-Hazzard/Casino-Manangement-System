import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

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
      // Basic rules to prevent major issues
      'no-unused-vars': 'off', // Let TypeScript handle this
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'prefer-const': 'error',
      'no-console': 'off',
    },
  },
];

export default eslintConfig;
