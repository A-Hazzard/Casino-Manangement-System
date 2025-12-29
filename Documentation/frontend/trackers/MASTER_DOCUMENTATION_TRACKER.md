# Master Documentation Tracker

**Author:** Assistant (Grok)  
**Date:** December 29, 2025  
**Last Updated:** December 29, 2025

This master tracker provides a comprehensive mapping of all implementation files to their corresponding documentation locations. It ensures that documentation stays synchronized with code changes and implementation details.

## Documentation Structure Overview

```
Documentation/
├── backend/                    # Backend API and system documentation
│   ├── core-apis/             # Core API endpoints
│   ├── business-apis/         # Business logic APIs
│   ├── analytics-apis/        # Analytics and reporting APIs
│   ├── specialized-apis/      # Specialized functionality APIs
│   ├── calculation-systems/   # Calculation and business logic
│   ├── real-time-systems/     # Real-time systems (MQTT, WebSocket)
│   └── GUIDELINES.md          # Backend development guidelines
├── frontend/                  # Frontend documentation
│   ├── pages/                 # Page-specific documentation
│   ├── guidelines/            # Frontend development guidelines
│   ├── integration/           # Integration and API documentation
│   ├── trackers/              # Implementation tracking files
│   └── README.md              # Frontend overview
├── database-models.md         # Database schema documentation
├── typescript-type-safety-rules.md  # TypeScript standards
├── PROJECT_GUIDE.md           # Overall project documentation
└── [other specialized docs]
```

## File-to-Documentation Mapping

### Authentication System

#### `shared/types/auth.ts`

- **Type:** Shared Type Definitions
- **Purpose:** Authentication-related TypeScript types
- **Documentation:**
  - `Documentation/backend/core-apis/auth-api.md` - API interface definitions
  - `Documentation/typescript-type-safety-rules.md` - Type safety patterns
- **Key Types:**
  - `UserDocument` - Full user document interface
  - `LeanUserDocument` - Lean query result interface
  - `UserAuthPayload` - Authentication response payload
  - `JwtPayload` - JWT token structure
  - `AuthResult` - Authentication operation result

#### `shared/types/users.ts`

- **Type:** Shared Type Definitions
- **Purpose:** User-related API types
- **Documentation:**
  - `Documentation/backend/core-apis/auth-api.md` - User model interface
  - `Documentation/typescript-type-safety-rules.md` - Type patterns
- **Key Types:**
  - `UserDocumentWithPassword` - User document with auth methods
  - `CurrentUser` - Current authenticated user info
  - `OriginalUserType` - Legacy user type (migration)

#### `app/api/lib/helpers/auth.ts`

- **Type:** Backend Helper Function
- **Purpose:** Core authentication logic and JWT handling
- **Documentation:**
  - `Documentation/backend/core-apis/auth-api.md` - Implementation details
  - `Documentation/frontend/trackers/AUTHENTICATION_TYPE_CHANGES_TRACKER.md` - Recent changes
- **Key Functions:**
  - `authenticateUser()` - Main authentication flow
  - `refreshAccessToken()` - Token refresh logic
  - `getUserPayload()` - User data formatting
  - `validatePassword()` - Password validation

#### `app/api/lib/helpers/users.ts`

- **Type:** Backend Data Access
- **Purpose:** User database operations
- **Documentation:**
  - `Documentation/backend/core-apis/auth-api.md` - User lookup implementation
  - `Documentation/database-models.md` - Database query patterns
- **Key Functions:**
  - `getUserByEmail()` - Email-based user lookup
  - `getUserByUsername()` - Username-based user lookup
  - `createUser()` - User creation logic
  - `updateUser()` - User update operations

#### `app/api/auth/login/route.ts`

- **Type:** API Route Handler
- **Purpose:** User login endpoint
- **Documentation:**
  - `Documentation/backend/core-apis/auth-api.md` - Login endpoint specification
- **Implementation:** POST `/api/auth/login`

#### `app/api/auth/current-user/route.ts`

- **Type:** API Route Handler
- **Purpose:** Get current user information
- **Documentation:**
  - `Documentation/backend/core-apis/auth-api.md` - Current user endpoint
- **Implementation:** GET `/api/auth/current-user`

### Database Models

#### `app/api/lib/models/user.ts`

- **Type:** Database Schema
- **Purpose:** User collection schema definition
- **Documentation:**
  - `Documentation/database-models.md` - User schema specification
  - `Documentation/backend/core-apis/auth-api.md` - User model interface
- **Key Fields:**
  - `_id` - Unique identifier (string)
  - `roles` - User role array
  - `isEnabled` - Account status
  - `profile` - Extended user profile
  - `assignedLocations` - Location access permissions
  - `assignedLicensees` - Licensee access permissions

### Type System Components

#### `lib/types/componentProps.ts`

- **Type:** Frontend Type Definitions
- **Purpose:** Component prop interfaces
- **Documentation:**
  - `Documentation/typescript-type-safety-rules.md` - Frontend type patterns
- **Key Types:** Component-specific prop interfaces

#### `lib/types/mongo.ts`

- **Type:** Frontend Type Definitions
- **Purpose:** MongoDB-related types for frontend
- **Documentation:**
  - `Documentation/typescript-type-safety-rules.md` - Database type handling
- **Key Types:** MongoDB operation types

#### `lib/types/location.ts`

- **Type:** Frontend Type Definitions
- **Purpose:** Location-related types
- **Documentation:**
  - `Documentation/typescript-type-safety-rules.md` - Entity type patterns
- **Key Types:** Location data structures

### Frontend Components (Examples)

#### `app/page.tsx`

- **Type:** Next.js Page Component
- **Purpose:** Main application dashboard
- **Documentation:**
  - `Documentation/frontend/pages/dashboard.md` - Page functionality
  - `Documentation/frontend/README.md` - Application overview

#### `components/modals/TopPerformingMachineModal.tsx`

- **Type:** React Component
- **Purpose:** Machine performance modal
- **Documentation:**
  - `Documentation/frontend/pages/dashboard.md` - Modal usage
  - `Documentation/frontend/guidelines/components.md` - Component patterns

### Helper Functions

#### `lib/helpers/collectionReport.ts`

- **Type:** Frontend Helper
- **Purpose:** Collection report data operations
- **Documentation:**
  - `Documentation/frontend/integration/api-integration.md` - API helper patterns
- **Key Functions:**
  - `fetchCollectionReports()` - Report data fetching
  - `fetchCollectionReportById()` - Single report retrieval

#### `lib/hooks/reports/useMetersTabData.ts`

- **Type:** React Custom Hook
- **Purpose:** Meters tab data management
- **Documentation:**
  - `Documentation/frontend/integration/hooks.md` - Hook patterns
- **Key Logic:** Chart data loading and state management

## Documentation Maintenance Checklist

### When Updating Code Files:

1. **Check Documentation Coverage**
   - [ ] Does the file have corresponding documentation?
   - [ ] Is the documentation up to date with current implementation?
   - [ ] Are API contracts documented accurately?

2. **Update Type Documentation**
   - [ ] Are TypeScript interfaces documented in relevant API docs?
   - [ ] Do type changes affect frontend-backend contracts?
   - [ ] Are new types added to the appropriate documentation?

3. **Update Implementation Details**
   - [ ] Are key algorithms and business logic documented?
   - [ ] Are error handling patterns documented?
   - [ ] Are performance optimizations documented?

4. **Update Tracker Files**
   - [ ] Create/update tracker file for significant changes
   - [ ] Document breaking changes and migration notes
   - [ ] Update version change logs

### Documentation Standards:

#### API Documentation (`/backend/core-apis/`, `/backend/business-apis/`)

- [ ] Request/response schemas with examples
- [ ] Error codes and handling
- [ ] Authentication requirements
- [ ] Rate limiting information
- [ ] Implementation notes for complex logic

#### Type Documentation (`typescript-type-safety-rules.md`)

- [ ] Type definition examples
- [ ] Usage patterns and anti-patterns
- [ ] Migration guidelines
- [ ] Error prevention strategies

#### Tracker Documentation (`/frontend/trackers/`)

- [ ] File change summaries
- [ ] Technical improvement details
- [ ] Verification steps completed
- [ ] Future considerations

## Automated Documentation Checks

### Type Safety Validation:

- [ ] TypeScript compilation passes (`tsc --noEmit`)
- [ ] ESLint validation passes (`pnpm lint`)
- [ ] No type assertion warnings

### Documentation Completeness:

- [ ] All exported functions have JSDoc comments
- [ ] All complex algorithms have inline documentation
- [ ] All API endpoints have corresponding documentation
- [ ] All type definitions are documented

### Tracker Maintenance:

- [ ] Recent changes are tracked in appropriate tracker files
- [ ] Tracker files are updated when implementations change
- [ ] Outdated tracker files are archived appropriately

## Recent Documentation Updates

### December 29, 2025 - Authentication Type System Overhaul

- **Files Updated:**
  - `Documentation/backend/core-apis/auth-api.md`
  - `Documentation/typescript-type-safety-rules.md`
  - `Documentation/frontend/trackers/AUTHENTICATION_TYPE_CHANGES_TRACKER.md`
- **Changes:**
  - Updated User model interface to match actual schema
  - Added LeanUserDocument pattern documentation
  - Documented lean object handling best practices
  - Added implementation details for optimized queries

## Documentation Quality Metrics

### Completeness Score:

- [ ] 90%+ of code files have corresponding documentation
- [ ] All public APIs are fully documented
- [ ] Type definitions are documented with examples

### Accuracy Score:

- [ ] Documentation matches current implementation
- [ ] Examples work with current codebase
- [ ] Version information is current

### Maintenance Score:

- [ ] Documentation is updated within 1 week of code changes
- [ ] Tracker files are maintained for complex changes
- [ ] Outdated documentation is flagged and updated

## Contributing to Documentation

### When Adding New Features:

1. **Create Implementation** - Write the code first
2. **Update Documentation** - Document the new functionality
3. **Create Tracker** - Track the implementation for future reference
4. **Verify Integration** - Ensure docs integrate with existing structure

### When Refactoring Existing Code:

1. **Document Changes** - Update relevant documentation files
2. **Create Change Tracker** - Document what changed and why
3. **Update Examples** - Ensure code examples still work
4. **Verify Links** - Check that cross-references are still valid

This master tracker ensures that our documentation remains comprehensive, accurate, and synchronized with our evolving codebase.
