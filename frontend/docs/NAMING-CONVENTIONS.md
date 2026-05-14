# Naming Conventions

## Files and Directories
- **Directories**: `kebab-case` (e.g., `user-profile/`).
- **Components**: `PascalCase.tsx` (e.g., `SubmitButton.tsx`).
- **Hooks**: `camelCase.ts` with `use` prefix (e.g., `useLocalStorage.ts`).
- **Utilities/Actions**: `kebab-case.ts` or `camelCase.ts` (e.g., `format-date.ts`).

## Variables and Functions
- **Variables**: `camelCase`.
- **Constants**: `UPPER_SNAKE_CASE`.
- **Boolean variables**: Use prefixes like `is`, `has`, `should`.
  - Good: `isLoading`, `hasPermission`.
  - Bad: `loading`, `permission`.

## CSS/Tailwind
- Use standard Tailwind classes.
- If using `cva` (Class Variance Authority), name variants clearly (e.g., `size`, `intent`).
