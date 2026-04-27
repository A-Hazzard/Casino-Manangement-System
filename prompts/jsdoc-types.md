# JSDoc Type Annotations

## Task
Add proper TypeScript types to all `@param` and `@returns` JSDoc annotations in TypeScript files across the codebase.

## Rules

1. **Format**: Always use curly braces for types
   - `@param {Type} paramName - description`
   - `@returns {ReturnType}`

2. **Required types for `@param`**:
   - Use actual TypeScript types from the function signature (e.g., `string`, `number`, `Date`, `Promise<void>`)
   - For complex types, reference imported types or use type expressions (e.g., `CreateCollectionReportPayload['machines']`)
   - Use `[]` suffix for array types only when documenting the parameter itself (e.g., `{string[]}`), NOT in the parameter name (e.g., `@param machines[]` is wrong)

3. **Optional parameters**:
   - Mark with `[paramName]` syntax
   - Add optional type marker if the type includes `undefined` (e.g., `{string} [paramName]`)

4. **Do NOT add types to**:
   - Inline comments (// comments)
   - Generic description-only JSDoc blocks (file-level module documentation)

5. **Keep existing descriptions** - Preserve the `- description` text after each param

## Example

**Before**:
```typescript
/**
 * @param body - The collection report payload
 * @returns { isValid: boolean; error?: string }
 */
```

**After**:
```typescript
/**
 * @param {Partial<CreateCollectionReportPayload>} body - The collection report payload
 * @returns {{ isValid: boolean; error?: string }}
 */
```

## Files to process
Process all `.ts` and `.tsx` files in the codebase, focusing on:
- API route handlers
- Helper functions
- Utility modules
- Component files with JSDoc

## Notes
- Match types to actual function signatures
- Preserve existing descriptions and formatting
- Do not modify code logic, only JSDoc annotations