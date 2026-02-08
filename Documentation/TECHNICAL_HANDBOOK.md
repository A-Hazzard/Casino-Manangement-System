# Technical Handbook & System Standards

## 1. Core Architecture
### Dual Application Mode
The system supports two distinct operation modes determined by the `APPLICATION` environment variable:
- **CMS**: Casino Management System (Real-time monitoring, financial reporting).
- **VAULT**: Vault & Cash Management (Float requests, payouts, safe reconciliation).

### Common Infrastructure
Both modes share:
- **QueryProvider**: For React Query data fetching.
- **CurrencyProvider**: For multi-licensee currency aggregation.
- **SidebarProvider**: For the config-driven navigation system.

---

## 2. Authentication & Security (RBAC)
### Hierarchy
Permissions are hierarchical. Higher roles inherit the capabilities of lower roles.
1. **Developer**: Absolute system access.
2. **Admin**: Fleet-wide management.
3. **Manager**: Licensee-level oversight.
4. **Location Admin**: Multi-unit management within a licensee.
5. **Vault Manager**: Restricted to Vault operations.

### Guards
- **Page-Level**: Use `ProtectedRoute` component.
  ```typescript
  <ProtectedRoute requiredPage="locations">...</ProtectedRoute>
  ```
- **Component-Level**: Use `hasAdminAccess(roles)` or `hasManagerAccess(roles)` in `lib/utils/permissions.ts`.

---

## 3. Page Setup Best Practices
All new pages should follow this standard structure:
1. **Protected Wrapper**: Always wrap with `<ProtectedRoute>`.
2. **Error Boundary**: Wrap content with `<PageErrorBoundary>`.
3. **Metadata**: Define a descriptive `PageTitle`.
4. **Skeleton States**: Create content-specific skeletons in `components/ui/skeletons/`.

---

## 4. UI Standards
### Icons & Indicators
- **Financial Trends**: Red for decrease, Green for increase, Orange/Yellow for warnings.
- **Status Badges**:
  - `online`: Solid Green.
  - `offline`: Solid Red.
  - `maintenance`: Yellow/Amber.

### Content Density
Always aim for premium, high-density dashboard layouts that prioritize "At-a-glance" visibility for managers.

---

## 5. TypeScript & Code Standards
- **No `any`**: Use explicit types from `shared/types`.
- **Naming**: Avoid underscore prefixes for public functions/variables.
- **Aggregation**: Use `.cursor({ batchSize: 1000 })` for heavy queries.
- **Performance**: Always use `readAt` for financial time filtering in the `meters` collection.
