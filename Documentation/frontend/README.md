# Frontend Documentation

## Overview

This directory contains comprehensive documentation for all frontend pages and components in the Evolution One Casino Management System. Each document provides detailed technical specifications, business logic, and implementation details for the respective pages.

## Documentation Structure

### Core Pages
- **[Dashboard](./dashboard.md)** - Main landing page with real-time metrics and analytics
- **[Administration](./administration.md)** - User and licensee management system
- **[Cabinets](./cabinets.md)** - Cabinet (slot machine) management and monitoring
- **[Cabinet Details](./cabinet-details.md)** - Individual cabinet configuration and metrics
- **[Collection Report](./collection-report.md)** - Financial collection management system
- **[Collection System Pages](./collection-system-pages.md)** - Complete collection workflow documentation
- **[Locations](./locations.md)** - Gaming location management
- **[Location Cabinets](./location-cabinets.md)** - Location-specific cabinet management
- **[Members](./members.md)** - Member management system
- **[Sessions](./sessions.md)** - Gaming session tracking and management

### System Documentation
- **[Pages Overview](./pages-overview.md)** - High-level overview of all frontend pages
- **[Redirect Pages](./redirect-pages.md)** - Authentication and routing redirects

## Key Features Across All Pages

### Consistent Architecture
- **Next.js 14+ App Router** with TypeScript
- **Zustand** for global state management
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Framer Motion** for animations

### Standard Patterns
- **Responsive Design**: Desktop and mobile layouts
- **Skeleton Loading**: Content-specific loading states
- **Error Handling**: Graceful degradation with user feedback
- **Authentication**: Role-based access control
- **Real-time Updates**: Live data synchronization

### Financial Calculations
All pages follow the **Financial Metrics Guide** standards:
- **Money In (Drop)**: `movement.drop` field
- **Money Out**: `movement.totalCancelledCredits` field  
- **Gross Revenue**: `Drop - Total Cancelled Credits`
- **Variance Analysis**: Expected vs actual calculations

## Collection System Overview

The collection system is the most complex part of the frontend, consisting of:

### Main Components
1. **Collection Report Page** (`/collection-report`) - Main dashboard
2. **Collection Detail Page** (`/collection-report/report/[reportId]`) - Detailed analysis
3. **New Collection Modal** - Collection creation interface

### Key Features
- **Multi-tab Interface**: Collection, Monthly, Manager, Collector schedules
- **Real-time Financial Tracking**: Drop, cancelled credits, gross revenue
- **Machine Selection**: Location-based machine collection
- **Variance Analysis**: SAS vs meter data comparison
- **Audit Trail**: Complete collection history and logging

### Data Flow
```
User Action → API Call → Database Update → State Refresh → UI Update
```

## Development Guidelines

### Code Organization
- **Components**: Feature-specific components in dedicated directories
- **Types**: All types in `shared/types/`, `lib/types/`, or `types/` directories
- **Helpers**: Business logic in `lib/helpers/` directory
- **Utils**: Utility functions in `lib/utils/` directory

### State Management
- **Global State**: Zustand stores for cross-component data
- **Local State**: React hooks for component-specific state
- **Form State**: Controlled components with validation

### Performance
- **Memoization**: `useMemo` and `useCallback` for expensive operations
- **Lazy Loading**: Code splitting for large components
- **Optimistic Updates**: Immediate UI feedback with rollback capability

## Testing and Quality

### Manual Testing
- **Critical User Flows**: Test all major user journeys
- **Cross-browser Compatibility**: Test on major browsers
- **Mobile Responsiveness**: Test on various screen sizes
- **Error Scenarios**: Test error handling and recovery

### Code Quality
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code style and best practices enforcement
- **No `any` Types**: All variables properly typed
- **Error Boundaries**: Graceful error handling

## Security Considerations

### Authentication
- **JWT Tokens**: Secure authentication with `jose` library
- **Role-based Access**: Granular permissions system
- **Session Management**: Secure session handling

### Data Protection
- **Input Validation**: All user input validated and sanitized
- **XSS Prevention**: Safe handling of user-generated content
- **CSRF Protection**: Cross-site request forgery prevention

## Future Enhancements

### Planned Features
- **Real-time WebSocket Integration**: Live data updates
- **Advanced Analytics**: Enhanced reporting and insights
- **Mobile App**: Native mobile application
- **Offline Support**: Progressive Web App capabilities

### Technical Debt
- **Component Optimization**: Further performance improvements
- **Test Coverage**: Automated testing implementation
- **Documentation**: API documentation generation
- **Accessibility**: Enhanced accessibility features

---

**Author**: Aaron Hazzard - Senior Software Engineer  
**Last Updated**: October 10th, 2025  
**Version**: 2.0.0

For specific page documentation, refer to the individual markdown files in this directory. Each document provides comprehensive technical details, business logic, and implementation guidance for the respective page or system component.
