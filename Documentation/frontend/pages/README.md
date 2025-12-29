# Frontend Pages Documentation

This directory contains comprehensive documentation for all main application pages in the Evolution One CMS frontend.

## Pages in This Directory

### 🏠 Main Application Pages

- **[Dashboard](dashboard.md)** - Main landing page with real-time metrics, financial cards, charts, and location map
- **[Administration](administration.md)** - User and licensee management system with activity logging
- **[Locations](locations.md)** - Gaming location management with financial metrics
- **[Machines](machines.md)** - Machine/cabinet management with SMIB configuration
- **[Members](members.md)** - Member management with win/loss calculations
- **[Sessions](sessions.md)** - Gaming session tracking and analytics
- **[Collection Report](collection-report.md)** - Financial collection management system

### 🔐 Authentication Pages

- **[Login](login.md)** - User authentication with password and profile validation

### 📋 Overview and Navigation

- **[Pages Overview](pages-overview.md)** - High-level overview of all frontend pages
- **[Redirect Pages](redirect-pages.md)** - Authentication and routing redirects

## Documentation Structure

Each page documentation file includes:

1. **Table of Contents** - Quick navigation
2. **Overview** - Page purpose and key features
3. **File Information** - Source files and component structure
4. **Page Sections** - Detailed breakdown of UI sections
5. **API Endpoints** - Backend integration points
6. **State Management** - Zustand stores and React hooks
7. **Key Functions** - Important business logic functions

## Common Patterns

All pages follow consistent patterns:

- **Next.js App Router** with TypeScript
- **Zustand** for global state management
- **Tailwind CSS** for styling
- **Skeleton loaders** for loading states
- **Error boundaries** for error handling
- **Role-based access control** for permissions

## Related Documentation

- **[Detail Pages](../details/)** - Detail page documentation
- **[Integration Docs](../integration/)** - Integration documentation
- **[Frontend Guidelines](../guidelines/)** - Development standards