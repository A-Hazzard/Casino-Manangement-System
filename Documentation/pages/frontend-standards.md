# Frontend Architecture & Standards

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** March 2026  
**Version:** 4.1.0

---

## 1. Page Implementation Standard

Every page in the CMS must follow the **Lean Page Pattern**:
- **`Page.tsx`**: Must be a server component shell. It handles authentication checks and meta-data.
- **`Layout.tsx`**: Manages the sidebars and global nav.
- **`Content.tsx`**: The primary client-side component where business logic resides.

### 📐 Component Structure
1. **Hooks**: (Zustand, React Query, useForm)
2. **Computed State**: (Memoized totals, filtered lists)
3. **Handlers**: (Submit, Toggle, Delete)
4. **Effects**: (Logging, Analytics)
5. **Render**: (JSX with specific semantic sections)

---

## 2. Skeleton UX (No Spinner Zone)

**Rule:** Generic spinners or "Loading..." text are prohibited.
- **How it works**: Every feature has a corresponding skeleton in `@/components/ui/skeletons/`.
- **Accuracy**: The skeleton must match the layout (Table, Grid, or Card) within 5px accuracy to prevent "Layout Shift" (CLS).

---

## 3. State & Search Logic

### 🔄 Zustand Stores
Values like `activeLicencee`, `dateRange`, and `selectedLocation` are stored in global Zustand PERSISTENT stores. This allows users to switch between the Dashboard and Locations page without losing their filters.

### 🔍 Search Debounce
All top-level search inputs must implement a 500ms debounce.
```typescript
const debouncedSearch = useDebounce(searchTerm, 500);
// The API call only triggers after the user stops typing for 500ms.
```

---

## 4. UI & Aesthetics

- **Gradients**: Use the `primary-to-secondary` gradient for actionable headers.
- **Glassmorphism**: Modals and Floating panels use a semi-transparent blur (`backdrop-blur-md`).
- **Icons**: Standardized use of `Lucide-React`.
  - 🟢 **Success**: Green
  - 🟡 **Warning**: Amber
  - 🔴 **Error/Critical**: Red
  - 🔵 **Info**: Deep Blue

---

## 5. Performance Checklist

- [ ] Every API call uses `useQuery` or `useMutation` with proper `staleTime`.
- [ ] Images/Avatars are optimized using `next/image`.
- [ ] Dynamic imports (`next/dynamic`) are used for heavy components like Maps and Charts.
- [ ] Error Boundaries are wrapped around each major Dashboard widget.

---
**Technical Standard** - Engineering Team
