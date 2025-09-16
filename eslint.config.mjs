import { FlatCompat } from "@eslint/eslintrc"

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Prefer const assertions and proper typing
      "prefer-const": "error",
      
      // No console.log in production
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      
      // Catch unused variables
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }]
    }
  }
]
