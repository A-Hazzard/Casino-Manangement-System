# Evolution One CMS - Documentation

## Table of Contents

- [Overview](#overview)
- [Documentation Structure](#documentation-structure)
- [Quick Start](#quick-start)
- [Key Documentation](#key-documentation)
- [Development Resources](#development-resources)
- [System Guides](#system-guides)

## Overview

This directory contains comprehensive documentation for the Evolution One Casino Management System. The documentation is organized into logical sections covering frontend, backend, system architecture, and development guidelines.

**Author:** Aaron Hazzard - Senior Software Engineer
**Last Updated:** January 2025
**Version:** 4.3.0 - Documentation Structure Update

## Documentation Structure

```
Documentation/
├── README.md                          # This overview file
├──
├── frontend/                          # Frontend documentation
│   ├── pages/                         # Main application pages
│   ├── details/                       # Detail page documentation
│   ├── integration/                   # Integration documentation
│   ├── guidelines/                    # Frontend development guidelines
│   ├── trackers/                      # Development trackers
│   └── _archive/                      # Archived files
│
├── backend/                           # Backend API documentation
│   ├── core-apis/                     # Core business logic APIs
│   ├── business-apis/                 # Business domain APIs
│   ├── analytics-apis/                # Analytics and reporting APIs
│   ├── specialized-apis/              # Specialized functionality APIs
│   ├── calculation-systems/           # Business calculation systems
│   ├── real-time-systems/             # Real-time communication systems
│   └── _archive/                      # Archived files
│
├── performance/                       # Performance documentation
│
└── [Root Documentation Files]         # System-wide guides and references
```

## Quick Start

### For New Developers

1. **Start Here:** Read [PROJECT_GUIDE.md](./PROJECT_GUIDE.md) for complete system overview
2. **Engineering Rules:** Review [`.cursor/rules/nextjs-rules.mdc`](../.cursor/rules/nextjs-rules.mdc) for strict coding standards
3. **Frontend Development:** Review [Frontend Guidelines](./frontend/guidelines/FRONTEND_GUIDELINES.md)
4. **Backend Development:** Review [Backend Guidelines](./backend/GUIDELINES.md)
5. **API Integration:** Check [Backend API Overview](./backend/api-overview.md)
6. **Type Safety:** Understand [TypeScript Type Safety](./typescript-type-safety-rules.md) three-tier system

### For Specific Tasks

- **Building a New Page:** See [Frontend Pages Documentation](./frontend/pages/)
- **Creating an API Endpoint:** See [Backend API Documentation](./backend/)
- **Understanding Financial Metrics:** See [Financial Metrics Guide](./financial-metrics-guide.md)
- **Database Schema:** See [Database Models](./database-models.md)
- **TypeScript Types:** See [TypeScript Type Safety](./typescript-type-safety-rules.md)

## Key Documentation

### 📘 Project Guide

**[PROJECT_GUIDE.md](./PROJECT_GUIDE.md)** - Complete project overview and system architecture

**Covers:**

- System architecture and technology stack
- TypeScript type safety system
- Database models and relationships
- Financial metrics system
- Timezone and gaming day management
- Role-based access control
- Performance optimization strategies

### 🎨 Frontend Documentation

**[Frontend Documentation](./frontend/)** - Complete frontend page and component documentation

**Key Sections:**

- **[Pages](./frontend/pages/)** - Main application pages
  - Dashboard, Reports, Cabinets, Locations, Members, Sessions, Collection Report, Administration, Login, Vault Management
  - See [pages-overview.md](./frontend/pages/pages-overview.md) for complete list
- **[Details](./frontend/details/)** - Detail page documentation
  - Location Details, Location Machines, Machine Details, Collection Report Details
- **[Integration](./frontend/integration/)** - MQTT and real-time integration
- **[Guidelines](./frontend/guidelines/)** - Frontend development standards
  - Component structure, JSX commenting, loading states, skeleton loaders

### 🔧 Backend Documentation

**[Backend Documentation](./backend/)** - Complete API endpoint documentation

**Key Sections:**

- **[API Overview](./backend/api-overview.md)** - Complete API reference and structure
- **[Core APIs](./backend/core-apis/)** - Authentication, administration, system configuration
- **[Business APIs](./backend/business-apis/)** - Locations, machines, cabinets, members, sessions, collections
- **[Analytics APIs](./backend/analytics-apis/)** - Reporting, analytics, operations, meters
- **[Specialized APIs](./backend/specialized-apis/)** - Meter synchronization, location-machine relationships
- **[Calculation Systems](./backend/calculation-systems/)** - Bill validator, SAS gross calculations
- **[Real-Time Systems](./backend/real-time-systems/)** - MQTT architecture and implementation
- **[Backend Guidelines](./backend/GUIDELINES.md)** - Backend development standards and best practices

### 💰 Financial System

**[Financial Metrics Guide](./financial-metrics-guide.md)** - Comprehensive financial calculation system

**Covers:**

- Money In (Drop) calculations
- Money Out (Cancelled Credits) calculations
- Gross Revenue formulas
- Variance analysis
- Currency conversion
- Financial reporting standards

### 🗄️ Database

**[Database Models](./database-models.md)** - Complete database schema reference

**Covers:**

- All MongoDB collections
- Model relationships
- Field definitions
- Indexes and optimization
- Data validation rules

### 📝 TypeScript

**[TypeScript Type Safety](./typescript-type-safety-rules.md)** - Type system guidelines

**Covers:**

- Three-tier type system (shared, frontend, backend)
- Type organization rules
- Type safety best practices
- Common patterns and anti-patterns

### 🔐 Security & Permissions

**[Role Based Permissions](./Role%20Based%20Permissions.md)** - Access control system

**Covers:**

- Role definitions
- Permission structure
- Access control patterns
- Security best practices

### ⏰ Time Management

**[Timezone Guide](./timezone.md)** - Timezone and date handling

**Covers:**

- UTC storage standards
- Display timezone conversion
- Gaming day offset system
- Date filtering best practices

## Development Resources

### Performance

**[Performance Optimization Guide](./PERFORMANCE_OPTIMIZATION_GUIDE.md)** - Performance best practices

**Covers:**

- Database query optimization
- Frontend performance techniques
- Caching strategies
- Memory management

### Query Results

**[Query Results Explanation](./QUERY_RESULTS_EXPLANATION.md)** - Understanding API responses

**Covers:**

- Response format standards
- Pagination patterns
- Error handling
- Data transformation

### Location Icons

**[Location Icons Guide](./location-icons-guide.md)** - Icon system reference

## System Guides

### Gaming Day Offset

The system uses a flexible gaming day offset system that allows each location to define its own business day boundaries. See [PROJECT_GUIDE.md](./PROJECT_GUIDE.md#gaming-day-offset-system) for details.

### Currency Conversion

Multi-licensee support with automatic currency conversion. See [PROJECT_GUIDE.md](./PROJECT_GUIDE.md#currency-conversion-system) for implementation details.

### Financial Calculations

All financial calculations follow standardized formulas. See [Financial Metrics Guide](./financial-metrics-guide.md) for complete formulas and examples.

## Navigation Tips

### Finding Documentation

1. **By Feature:** Check [Frontend Pages](./frontend/pages/) or [Backend APIs](./backend/)
2. **By Type:** Use directory structure (pages, APIs, guidelines)
3. **By Topic:** Use Ctrl+F to search within files
4. **By Reference:** Check cross-references in documentation

### Documentation Standards

All documentation follows consistent standards:

- **Table of Contents** for easy navigation
- **Code Examples** with TypeScript interfaces
- **API Endpoints** with request/response formats
- **Cross-References** to related documentation
- **Version Information** for tracking changes

## Contributing to Documentation

### Documentation Updates

When updating documentation:

1. **Follow Structure:** Maintain consistent format
2. **Update Dates:** Update "Last Updated" timestamps
3. **Cross-Reference:** Link to related documentation
4. **Code Examples:** Include working code examples
5. **Version Control:** Track version changes

### Documentation Organization

- **Frontend Docs:** In `frontend/` directory
- **Backend Docs:** In `backend/` directory
- **System Guides:** In root `Documentation/` directory
- **Trackers:** In respective `trackers/` directories

## Related Resources

### External Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Internal Resources

- Code comments and JSDoc
- Type definitions in `shared/types/`
- Component documentation in code
- API route documentation in handlers

## Support

For questions about documentation:

1. **Check Relevant Section:** Frontend, backend, or system guides
2. **Search Documentation:** Use Ctrl+F within files
3. **Review Code Examples:** See implementation in codebase
4. **Check Related Docs:** Follow cross-references

---

**Note:** This documentation is continuously updated. For the latest information, always refer to the most recent version of each document. When in doubt, check the codebase for the most current implementation.
