# Dual Application Architecture Guide

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2026  
**Version:** 1.0.0

## Overview

The Evolution One CMS now supports two distinct application modes:
- **CMS (Casino Management System)** - Existing casino operations management
- **VAULT** - Vault and cash desk management

Both applications share the same authentication, error handling, and core infrastructure while maintaining separate UI and navigation.

## Architecture

### Environment-Based Routing

The application mode is determined by the `APPLICATION` environment variable:

- `APPLICATION=CMS` → Renders `CmsLayoutWrapper` with CMS navigation
- `APPLICATION=VAULT` → Renders `VaultLayoutWrapper` with VAULT navigation
- Not set → Shows "Application Not Configured" message

### Layout Wrappers

#### CmsLayoutWrapper

**Location:** `components/shared/layout/CmsLayoutWrapper.tsx`

**Purpose:** Wraps the CMS application with necessary providers and layout components.

**Structure:**
```typescript
<QueryProvider>
  <CurrencyProvider>
    <SidebarProvider>
      <GlobalSidebarWrapper navConfig={cmsNavigationConfig} />
      <ProfileValidationGate context="CMS" />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
    <Toaster position="top-right" />
  </CurrencyProvider>
</QueryProvider>
```

**Features:**
- React Query provider for data fetching
- Currency context for multi-currency support
- Sidebar with CMS navigation (Dashboard, Locations, Cabinets, etc.)
- Profile validation with CMS context
- Toast notifications

#### VaultLayoutWrapper

**Location:** `components/VAULT/layout/VaultLayoutWrapper.tsx`

**Purpose:** Wraps the VAULT application with necessary providers and layout components.

**Structure:**
```typescript
<QueryProvider>
  <CurrencyProvider>
    <SidebarProvider>
      <GlobalSidebarWrapper navConfig={vaultNavigationConfig} />
      <ProfileValidationGate context="VAULT" />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
    <Toaster position="top-right" />
  </CurrencyProvider>
</QueryProvider>
```

**Features:**
- Same provider structure as CMS
- Sidebar with VAULT navigation (Vault Overview, Transactions, Float Management, etc.)
- Profile validation with VAULT context
- Toast notifications

### Shared Components

#### GlobalSidebarWrapper

**Location:** `components/shared/layout/GlobalSidebarWrapper.tsx`

**Purpose:** Config-driven sidebar wrapper that accepts navigation configuration.

**Props:**
- `navConfig?: NavigationConfig` - Navigation configuration (defaults to CMS config)

**Usage:**
```typescript
// CMS mode
<GlobalSidebarWrapper navConfig={cmsNavigationConfig} />

// VAULT mode
<GlobalSidebarWrapper navConfig={vaultNavigationConfig} />
```

#### AppSidebar

**Location:** `components/shared/layout/AppSidebar.tsx`

**Purpose:** Main sidebar component that renders navigation items based on configuration.

**Props:**
- `navConfig?: NavigationConfig` - Navigation configuration (defaults to CMS config)

**Features:**
- Config-driven navigation items
- Role-based permission checking
- User profile section
- Currency selector
- Responsive design (collapsible on desktop, slide-in on mobile)

#### ProfileValidationGate

**Location:** `components/shared/providers/ProfileValidationGate.tsx`

**Purpose:** A crucial component that enforces user profile completeness and validity across the application. It acts as a gatekeeper, automatically triggering a mandatory profile update process if the user's profile is incomplete, invalid, or requires specific fields to be updated based on server-side evaluation.

**Key Features:**
-   **Mandatory Profile Update:** If a user's profile does not meet validation criteria (e.g., missing required fields, weak password, unassigned licensees/locations for certain roles), the `ProfileValidationModal` is automatically displayed and cannot be bypassed.
-   **Context-Aware Validation:** The `context` prop (`CMS` | `VAULT`) allows for future differentiation of validation rules based on the application mode.
-   **Password Strength Re-validation:** After login, if a user's password was flagged as weak, the gate re-validates it against the `lastLoginPassword` to potentially clear the flag without requiring immediate input.
-   **Role Exemption:** Admin and Developer roles are typically exempted from profile validation enforcement.
-   **Forced Re-login:** Upon a successful profile update, the user is *automatically logged out and redirected to the login page*. This is a critical security measure because successful profile updates often involve an increment of `sessionVersion` on the server, which invalidates the current JWT token, necessitating a fresh login.
-   **Error Handling & Feedback:** Integrates with the application's toast notification system for user feedback.

## Navigation Configuration

### Navigation Types

**Location:** `lib/types/layout/navigation.ts`

```typescript
type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permissionCheck?: (userRoles: string[]) => boolean;
};

type NavigationConfig = {
  items: NavigationItem[];
};
```

### CMS Navigation

**Location:** `lib/constants/navigation/cmsNavigation.ts`

**Items:**
- Dashboard (`/`)
- Locations (`/locations`)
- Cabinets (`/cabinets`)
- Collection Report (`/collection-report`)
- Sessions (`/sessions`)
- Members (`/members`)
- Reports (`/reports`)
- Administration (`/administration`)

### VAULT Navigation

**Location:** `lib/constants/navigation/vaultNavigation.ts`

**Items:**
- Vault Overview (`/vault-management`)
- Transactions (`/vault-management/transactions`)
- Float Management (`/vault-management/floats`)
- Transfers (`/vault-management/transfers`)
- Cash Desks (`/vault-management/cash-desks`)
- Expenses (`/vault-management/expenses`)

## Access Control

### VAULT Authorization

**Location:** `lib/utils/vault/authorization.ts`

**Authorized Roles:**
- Developer
- Admin
- Manager
- Location Admin

**Functions:**
- `hasVaultAccess(userRoles)` - Check if user has VAULT access
- `shouldShowApplicationSelection(userRoles)` - Check if user should see role selection screen

### Unauthorized Access

**Component:** `components/VAULT/VaultUnauthorized.tsx`

**Behavior:**
- Displays access denied message
- Shows user's role
- Provides logout button
- Sidebar remains visible for navigation

## Role Selection Screen

**Component:** `components/shared/auth/ApplicationSelection.tsx`

**Purpose:** Allows high-level users to choose between CMS and VAULT applications.

**When Shown:**
- User has high-level role (Developer, Admin, Manager, Location Admin)
- `APPLICATION` environment variable is NOT set

**When Bypassed:**
- `APPLICATION` environment variable is set → Loads specific application directly
- User doesn't have high-level role → Goes directly to CMS

**Note:** Currently, the role selection screen is created but not yet integrated into the login flow. This will be implemented in a future update.

## Root Layout

**Location:** `app/layout.tsx`

**Current Implementation:**
```typescript
{process.env.APPLICATION === 'CMS' ? (
  <CmsLayoutWrapper>{children}</CmsLayoutWrapper>
) : process.env.APPLICATION === 'VAULT' ? (
  <VaultLayoutWrapper>{children}</VaultLayoutWrapper>
) : (
  <div>Application Not Configured</div>
)}
```

## Folder Structure

### Current Structure

```
components/
├── layout/              # Shared layout components
│   ├── AppSidebar.tsx   # Config-driven sidebar
│   ├── CmsLayoutWrapper.tsx
│   └── GlobalSidebarWrapper.tsx
├── shared/              # Shared components
│   ├── auth/
│   │   └── ApplicationSelection.tsx
│   └── layout/          # (Future: move shared layout components here)
├── VAULT/               # VAULT-specific components
│   ├── layout/
│   │   └── VaultLayoutWrapper.tsx
│   └── VaultUnauthorized.tsx
└── [existing CMS components remain in current locations]
```

### Future Refactoring (Per FRD)

The FRD specifies a folder structure refactor:

```
components/
├── CMS/                 # CMS-specific components
├── VAULT/               # VAULT-specific components
└── shared/              # Shared components
    ├── layout/          # Sidebar, Header, ProfileModal
    ├── auth/            # Login, Role-based guards
    └── ui/              # Buttons, Inputs, Tables, Modals
```

**Note:** This refactoring is pending and will be done incrementally to avoid breaking changes.

## Usage Examples

### Setting Up VAULT Mode

1. **Set Environment Variable:**
   ```bash
   # .env.local
   APPLICATION=VAULT
   ```

2. **Access VAULT Application:**
   - Navigate to `/vault-management`
   - System automatically uses `VaultLayoutWrapper`
   - Sidebar shows VAULT navigation items

### Creating VAULT Pages

**Example:** `app/vault-management/page.tsx`

```typescript
export default function VaultManagementPage() {
  return (
    <ProtectedRoute>
      <VaultManagementPageContent />
    </ProtectedRoute>
  );
}

function VaultManagementPageContent() {
  const { user } = useUserStore();
  
  // Check VAULT access
  if (!hasVaultAccess(user?.roles)) {
    return <VaultUnauthorized />;
  }
  
  // Render VAULT dashboard
  return <VaultDashboardPageContent />;
}
```

### Adding Navigation Items

**For CMS:**
Edit `lib/constants/navigation/cmsNavigation.ts`

**For VAULT:**
Edit `lib/constants/navigation/vaultNavigation.ts`

**Example:**
```typescript
{
  label: 'New Feature',
  href: '/new-feature',
  icon: NewIcon,
  permissionCheck: (roles) => roles.includes('admin'), // Optional
}
```

## Key Principles

1. **Shared Infrastructure:** Both applications use the same providers (Query, Currency, Sidebar)
2. **Config-Driven Navigation:** Sidebar adapts based on `navConfig` prop
3. **Context-Aware Validation:** ProfileValidationGate accepts context for future differentiation
4. **Role-Based Access:** VAULT requires specific roles (Developer, Admin, Manager, Location Admin)
5. **Backward Compatible:** CMS continues to work as before with default navigation config

## Future Enhancements

1. **Role Selection Integration:** Integrate `ApplicationSelection` component into login flow
2. **Folder Refactoring:** Move CMS components to `components/CMS/` per FRD
3. **Context-Specific Validation:** Implement different validation rules for CMS vs VAULT if needed
4. **Session-Based Application Mode:** Store selected application in session instead of env var
5. **VAULT Dashboard Implementation:** Build out the actual vault dashboard with mock data

## References

- **FRD:** `.cursor/vault-FRD.md`
- **Navigation Configs:** `lib/constants/navigation/`
- **Authorization Utils:** `lib/utils/vault/authorization.ts`
- **Layout Wrappers:** `components/shared/layout/CmsLayoutWrapper.tsx`, `components/VAULT/layout/VaultLayoutWrapper.tsx`
