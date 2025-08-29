# Evolution One CMS Documentation Index

This directory contains comprehensive documentation for the Evolution One Casino Management System.

**Author:** Aaron Hazzard - Senior Software Engineer

## 📖 Getting Started

1. **Start Here:** Read `ENGINEERING_GUIDELINES.md` for development standards and conventions
2. **Financial Calculations:** Review `financial-metrics-guide.md` for all financial formulas and calculations
3. **System Overview:** Check the main `README.md` for project overview and setup

## 📁 Documentation Structure

### 📱 Frontend Documentation (`frontend/`)
Complete documentation for all user-facing pages and components:

- **[Dashboard](frontend/dashboard.md)** - Real-time analytics and metrics
- **[Reports](frontend/reports.md)** - Comprehensive reporting with 4 tabs (Dashboard, Locations, Machines, Meters)
- **[Members](frontend/members.md)** - Member management and session tracking
- **[Sessions](frontend/sessions.md)** - Gaming session management and analytics
- **[Locations](frontend/locations.md)** - Location management and performance
  - [Location Details](frontend/location-details.md) - Individual location analytics
  - [Location Cabinets](frontend/location-cabinets.md) - Cabinet management by location
- **[Cabinets](frontend/cabinets.md)** - Slot machine/cabinet management
  - [Cabinet Details](frontend/cabinet-details.md) - Individual cabinet monitoring
- **[Collection Report](frontend/collection-report.md)** - Collection reporting and scheduling
  - Collection Report Details - Individual report analysis and management
- **[Administration](frontend/administration.md)** - User and licensee management
- **[Login](frontend/login.md)** - Authentication page

### 🔧 Backend Documentation (`backend/`)
Complete API documentation with financial calculations analysis:

- **[API Overview](backend/api-overview.md)** - Complete API reference and architecture
- **[Reports API](backend/reports-api.md)** - Location aggregation and reporting endpoints
- **[Meters Report API](backend/meters-report-api.md)** - Machine-level meter readings
- **[Analytics API](backend/analytics-api.md)** - Dashboard metrics and analytics
- **[Collections API](backend/collections-api.md)** - Financial data and collection management
- **[Members API](backend/members-api.md)** - Member management with win/loss calculations
  - Member Details API - Individual member data and session history
  - Member Sessions API - Session tracking and event details
- **[Sessions API](backend/sessions-api.md)** - Gaming session management
  - Session Events API - Detailed session event tracking
- **[Locations & Machines API](backend/locations-machines-api.md)** - Location and machine management
  - Location Details API - Individual location data and analytics
  - Machine Details API - Individual machine data and events
- **[Authentication API](backend/auth-api.md)** - Security and user authentication
- **[Administration API](backend/administration-api.md)** - User management and system admin
- **[Operations API](backend/operations-api.md)** - System operations and metrics
- **[System Configuration API](backend/system-config-api.md)** - System configuration

### 📋 System Documentation (Root Level)

- **[Engineering Guidelines](ENGINEERING_GUIDELINES.md)** - Development standards and best practices
- **[Financial Metrics Guide](financial-metrics-guide.md)** - Mathematical formulas for all financial calculations
- **[TypeScript Type Safety Rules](typescript-type-safety-rules.md)** - TypeScript guidelines and type organization
- **[Color Coding Guide](color-coding.md)** - Casino performance color coding system
- **[Timezone Management](timezone.md)** - Trinidad timezone handling and date conversion

## 🧮 Financial Calculations Documentation

All frontend and backend documentation now includes comprehensive **Financial Calculations Analysis** sections that:

- ✅ Document how each financial metric is calculated
- ✅ Compare implementations against the official financial metrics guide
- ✅ Provide mathematical formulas in standardized format
- ✅ Mark calculations as matching (✅) or needing verification (❌)

**Key Financial Documentation:**
- **Frontend**: All pages with financial data have calculation sections
- **Backend**: All APIs with financial data have calculation sections
- **Guide**: `financial-metrics-guide.md` contains the authoritative formulas

## 🔍 Quick Navigation

**For Developers:**
- Start with `ENGINEERING_GUIDELINES.md` for coding standards
- Use `frontend/` docs for UI component implementation
- Use `backend/` docs for API integration

**For Financial Analysis:**
- Review `financial-metrics-guide.md` for authoritative formulas
- Check individual page docs for implementation details
- Compare calculations across frontend and backend docs

**For System Architecture:**
- `backend/api-overview.md` for API architecture
- `frontend/pages-overview.md` for page structure
- Root `README.md` for overall system overview

---

**Last Updated:** August 29th, 2025