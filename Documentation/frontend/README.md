# Frontend Documentation

## Table of Contents

- [Overview](#overview)
- [Documentation Structure](#documentation-structure)
- [Quick Start](#quick-start)
- [Key Features](#key-features)
- [Development Guidelines](#development-guidelines)
- [Related Documentation](#related-documentation)

## Overview

This directory contains comprehensive documentation for all frontend pages, components, and integrations in the Evolution One Casino Management System. The documentation is organized into logical categories for improved navigation and maintainability.

**Author:** Aaron Hazzard - Senior Software Engineer
**Last Updated:** January 2026
**Version:** 2.5.0 - Documentation Structure Update

## Documentation Structure

### 📁 Directory Organization

```
Documentation/frontend/
├── README.md                          # This overview file
├──
├── pages/                             # Main application pages
│   ├── dashboard.md                   # Main dashboard with metrics
│   ├── administration.md              # User and licencee management
│   ├── locations.md                   # Location management
│   ├── machines.md                    # Machine/cabinet management
│   ├── members.md                     # Member management
│   ├── sessions.md                    # Session tracking
│   ├── collection-report.md           # Collection reporting
│   ├── reports.md                     # Reports page with evaluation tab
│   ├── login.md                       # Authentication page
│   ├── vault.md                       # Vault Management System pages
│   ├── pages-overview.md              # High-level page overview
│   └── redirect-pages.md              # Routing and redirects
│
├── details/                            # Detail page documentation
│   ├── location-details.md            # Location detail pages
│   ├── machine-details.md             # Machine detail pages
│   ├── collection-report-details.md    # Collection report details
│   └── location-machines.md            # Location-machine relationships
│
├── integration/                       # Integration documentation
│   └── mqtt-integration.md            # Real-time MQTT/SSE integration
│
├── guidelines/                        # Development guidelines
│   └── FRONTEND_GUIDELINES.md         # Frontend development standards
│
└── _archive/                          # Archived documentation
    └── Reports FRD.md                 # Legacy requirements document
```

## Pages Documentation

### Main Application Pages

**[Dashboard](pages/dashboard.md)** - Main landing page with real-time metrics, financial cards, charts, and location map

**Key Features:**

- Financial metrics cards (Drop, Coin In, Jackpot, Gross Revenue)
- Interactive charts with date filtering
- Location map with status indicators
- Top performing locations and cabinets
- Machine status widget

**[Administration](pages/administration.md)** - User and licencee management system

**Key Features:**

- User CRUD operations with role management
- Licencee management and assignments
- Activity log tracking
- Search and filtering capabilities

**[Locations](pages/locations.md)** - Gaming location management

**Key Features:**

- Location CRUD operations
- Financial metrics per location
- Machine assignment and tracking
- Geographic data management

**[Machines](pages/machines.md)** - Machine/cabinet management and monitoring

**Key Features:**

- Cabinet CRUD operations
- Real-time status monitoring
- SMIB configuration
- Performance metrics and analytics

**[Members](pages/members.md)** - Member management system

**Key Features:**

- Member profiles and registration
- Win/loss calculations
- Session history tracking
- Member analytics and reporting

**[Sessions](pages/sessions.md)** - Gaming session tracking and management

**Key Features:**

- Session listing and filtering
- Session event tracking
- Financial calculations
- Performance analytics

**[Collection Report](pages/collection-report.md)** - Financial collection management

**Key Features:**

- Multi-tab interface (Collection, Monthly, Collector, Manager)
- Collection report creation and management
- Financial tracking and variance analysis
- Mobile-responsive design

**[Reports](pages/reports.md)** - Machine and location performance analytics

**Key Features:**

- Multi-tab interface (Machines, Locations, etc.)
- Evaluation tab with performance charts
- Manufacturer and game performance analysis
- Top/bottom machines tables
- Pareto analysis summaries
- Export functionality

**[Login](pages/login.md)** - Authentication and user login

**Key Features:**

- JWT-based authentication
- Password update flows
- Profile validation gates
- Session management

### Overview and Navigation

**[Pages Overview](pages/pages-overview.md)** - High-level overview of all frontend pages

**[Redirect Pages](pages/redirect-pages.md)** - Authentication and routing redirects

## Detail Pages

**[Location Details](details/location-details.md)** - Detailed location information and management

**[Machine Details](details/machine-details.md)** - Individual machine configuration and metrics

**[Collection Report Details](details/collection-report-details.md)** - Detailed collection report analysis

**[Location Machines](details/location-machines.md)** - Location-machine relationship management

## Integration Documentation

**[MQTT Integration](integration/mqtt-integration.md)** - Real-time SMIB configuration with Server-Sent Events (SSE) and MQTT

**Key Features:**

- Real-time device communication
- SSE subscription endpoints
- MQTT message publishing
- Configuration management

## Development Guidelines

**[Frontend Guidelines](guidelines/FRONTEND_GUIDELINES.md)** - Comprehensive frontend development standards

**Covers:**

- Code organization and structure
- Component patterns and best practices
- State management with Zustand
- Performance optimization
- Accessibility requirements
- Testing strategies

## Key Features Across All Pages

### Consistent Architecture

- **Next.js 16.0.7 App Router** with TypeScript
- **Zustand** for global state management
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Framer Motion** for animations

### Standard Patterns

- **Responsive Design:** Desktop and mobile layouts
- **Skeleton Loading:** Content-specific loading states
- **Error Handling:** Graceful degradation with user feedback
- **Authentication:** Role-based access control
- **Real-time Updates:** Live data synchronization

### Financial Calculations

All pages follow the **Financial Metrics Guide** standards:

- **Money In (Drop):** `movement.drop` field
- **Money Out:** `movement.totalCancelledCredits` field
- **Gross Revenue:** `Drop - Total Cancelled Credits`
- **Variance Analysis:** Expected vs actual calculations

## Quick Start

### Reading Page Documentation

Each page documentation file follows a standardized structure:

1. **Table of Contents** - Quick navigation
2. **Overview** - Page purpose and features
3. **File Information** - Source files and components
4. **Page Sections** - Detailed breakdown of UI sections
5. **API Endpoints** - Backend integration points
6. **State Management** - Zustand stores and hooks
7. **Key Functions** - Important business logic functions

### Finding Information

- **Use Ctrl+F** to search within documentation files
- **Check the Table of Contents** for quick navigation
- **Review API Endpoints** section for backend integration
- **See State Management** for data flow understanding

## Development Guidelines

### Code Organization

- **Components:** Feature-specific components in dedicated directories
- **Types:** All types in `shared/types/`, `lib/types/`, or `types/` directories
- **Helpers:** Business logic in `lib/helpers/` directory
- **Utils:** Utility functions in `lib/utils/` directory

### State Management

- **Global State:** Zustand stores for cross-component data
- **Local State:** React hooks for component-specific state
- **Form State:** Controlled components with validation

### Performance

- **Memoization:** `useMemo` and `useCallback` for expensive operations
- **Lazy Loading:** Code splitting for large components
- **Optimistic Updates:** Immediate UI feedback with rollback capability

## Testing and Quality

### Manual Testing

- **Critical User Flows:** Test all major user journeys
- **Cross-browser Compatibility:** Test on major browsers
- **Mobile Responsiveness:** Test on various screen sizes
- **Error Scenarios:** Test error handling and recovery

### Code Quality

- **TypeScript:** Strict type checking enabled
- **ESLint:** Code style and best practices enforcement
- **No `any` Types:** All variables properly typed
- **Error Boundaries:** Graceful error handling

## Security Considerations

### Authentication

- **JWT Tokens:** Secure authentication with `jose` library
- **Role-based Access:** Granular permissions system
- **Session Management:** Secure session handling

### Data Protection

- **Input Validation:** All user input validated and sanitized
- **XSS Prevention:** Safe handling of user-generated content
- **CSRF Protection:** Cross-site request forgery prevention

## Related Documentation

### Backend Integration

- **[Backend API Documentation](../backend/)** - Complete API reference
- **[API Overview](../backend/api-overview.md)** - API ecosystem overview

### System Documentation

- **[Project Guide](../PROJECT_GUIDE.md)** - Overall project documentation
- **[Performance Guide](../PERFORMANCE_OPTIMIZATION_GUIDE.md)** - Performance optimization
- **[Engineering Rules](../.cursor/rules/nextjs-rules.mdc)** - Development standards (see `.cursor/rules/nextjs-rules.mdc`)

### Development Resources

- **[TypeScript Types](../../typescript-type-safety-rules.md)** - TypeScript guidelines
- **[Database Models](../../database-models.md)** - Database schema reference

## Support

For questions about frontend documentation or implementation details:

1. **Check Individual Page Docs:** Detailed page-specific information
2. **Review Frontend Guidelines:** Development standards and patterns
3. **Check Backend Documentation:** API integration details
4. **Review Code Examples:** Working implementation examples

---

**Note:** This documentation is organized for improved navigation and maintainability. Individual page documentation files provide comprehensive technical details, business logic, and implementation guidance for each page or system component.
