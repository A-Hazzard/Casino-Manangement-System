# Evolution1 Casino Management System (CMS)

<div align="center">
  <img src="public/EOS_Logo.png" alt="EOS Logo" width="200"/>
</div>

**Evolution1 CMS** is a robust casino management system for real-time casino operations, financial tracking, and compliance monitoring. It features a modern dashboard, detailed reporting, and comprehensive management of locations, cabinets, collections, and users.

**Author:** Aaron Hazzard - Senior Software Engineer

## 🚀 Features

- 📊 **Dashboard with Real-Time Analytics** ([docs](Documentation/frontend/dashboard.md))
  - Gaming day offset support for accurate financial reporting
  - Custom date ranges with time inputs
  - Multi-currency support with real-time conversion
- 🎮 **Slot Machine & Gaming Floor Management** ([docs](Documentation/frontend/cabinets.md))
  - 🔧 **Cabinet Details & SMIB Configuration** ([docs](Documentation/frontend/cabinet-details.md))
  - Real-time status monitoring and performance tracking
- 💰 **Financial Tracking & Collection Reporting** ([docs](Documentation/frontend/collection-report.md))
  - 📋 **Collection Report Details** - Individual report analysis with SAS time validation
  - ✏️ **Edit/Delete Reports** - Full lifecycle management with meter reversion
  - 🔧 **Fix SAS Times** - Automatic detection and correction of SAS time issues
  - 📱 **Mobile Collection Modal** - Responsive mobile interface with dual-state architecture
  - Movement Delta Method for accurate financial calculations
- 📍 **Location Management** ([docs](Documentation/frontend/locations.md))
  - 🎰 **Location Cabinets** ([docs](Documentation/frontend/location-cabinets.md))
  - 📊 **Location Details & Analytics** ([docs](Documentation/frontend/location-details.md))
  - Custom date filtering with time inputs
- 👥 **Member Management** ([docs](Documentation/frontend/members.md))
- 🎯 **Session Management** ([docs](Documentation/frontend/sessions.md))
- 👥 **User & Licensee Administration** ([docs](Documentation/frontend/administration.md))
- 🔐 **Secure Authentication** ([docs](Documentation/frontend/login.md))
  - Role-based access control (RBAC)
  - JWT token-based authentication
  - Multi-device session support (users can log in on multiple devices/tabs simultaneously)
  - Session invalidation only when permissions change (not on login)
  - Mandatory post-login profile validation enforcing legal name, phone number, and date-of-birth compliance before accessing the UI
- 📊 **Comprehensive Reports Module** ([docs](Documentation/frontend/reports.md))
  - Dashboard, Locations, Machines, and Meters tabs with comprehensive financial calculations
  - Gaming day offset integration for accurate reporting
- 🔄 **URL Redirects & SEO Optimization** ([docs](Documentation/frontend/redirect-pages.md))
- 📑 **Pages Overview & Architecture** ([docs](Documentation/frontend/pages-overview.md))
- 🕐 **Timezone Management** ([docs](Documentation/timezone.md)) - **Trinidad (UTC-4) timezone support**
- ⏰ **Gaming Day Offset System** ([docs](.cursor/gaming-day-offset-system.md)) - **8 AM gaming day start time**

## 🛠️ Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **MongoDB**
- **Zustand** (state management)
- **Recharts** (charts)
- **React Leaflet** (maps)
- **Shadcn/UI** (UI components)

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```sh
git clone https://gitlab.com/sunny-group/sas/evolution-one-cms.git
cd "evolution-one-cms"
```

### 2️⃣ Install bun (if you don't have it)

If you don't have bun installed globally, run:

```sh
npm i -g bun@latest
```

### 3️⃣ Install Dependencies

```sh
bun install
```

### 4️⃣ Run the Development Server

```sh
bun run dev
```

Open http://localhost:3000 to see the application.

## 🐳 Docker Setup

### 1️⃣ Build the Docker Image Locally

```sh
docker build -t evolution1-cms:local .
```

### 2️⃣ Run the Docker Container Locally

```sh
docker run --rm -p 3000:3000 \
  -e MONGODB_URI="your_mongodb_connection_string" \
  -e JWT_SECRET="cms" \
  -e NODE_ENV="production" \
  evolution1-cms:local
```

### 3️⃣ GitLab Container Registry

**Authenticate:**

```sh
docker login registry.gitlab.com
```

**Build for GitLab Registry:**

```sh
docker build -t registry.gitlab.com/sunny-group/sas/evolution-one-cms .
```

**Push to Registry:**

```sh
docker push registry.gitlab.com/sunny-group/sas/evolution-one-cms

```

**Run from Registry:**

```sh
# Windows (CMD or PowerShell): run as one line (no backslashes)
docker run --rm -p 3000:3000 -e MONGODB_URI="mongo uri in .env" -e JWT_SECRET="jwt secret in .env" -e NODE_ENV="production" -e NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="api key in .env" registry.gitlab.com/sunny-group/sas/evolution-one-cms
```

```sh
# Mac/Linux (bash/zsh): use backslash \ to split lines
docker run --rm -p 3000:3000 \
  -e MONGODB_URI="mongo uri in .env" \
  -e JWT_SECRET="jwt secret in .env" \
  -e NODE_ENV="production" \
  -e NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="api key in .env" \
  registry.gitlab.com/sunny-group/sas/evolution-one-cms
```

## 🖥️ Development Commands

| Command               | Description                  |
| --------------------- | ---------------------------- |
| `bun run dev`        | Start development server     |
| `bun run build`      | Build production app         |
| `bun run start`      | Start production server      |
| `bun run lint`       | Check for linting issues     |
| `bun run type-check` | Run TypeScript type checking |

## 🧪 Testing & Development Tools

### Test Directory (`test/`)

The `test/` directory contains a **Go-based MongoDB query tool** for development and debugging:

**Purpose:**

- **Database Testing**: Interactive tool for testing MongoDB queries directly
- **Data Validation**: Verify data structure and relationships
- **Query Optimization**: Test and optimize complex aggregation pipelines
- **Development Support**: Debug data issues without affecting the main application

**Features:**

- **Interactive CLI**: Menu-driven interface for different query types
- **Date Range Support**: Query data for specific time periods (today, yesterday, 7 days, custom dates)
- **Location & Licensee Filtering**: Filter data by specific locations or licensees
- **Machine Search**: Find specific machines by serial number
- **Meter Data Analysis**: Query meter data with date filtering
- **Real-time Results**: Immediate feedback on query results

**Usage:**

```bash
cd test/
go run main.go
```

**Query Types Available:**

1. **Machine Search**: Find machines by serial number with location/licensee info
2. **Machine with Meters**: Search machines with meter data by date range
3. **Licensee Search**: Find all machines under a specific licensee
4. **Location Search**: Find all machines at a specific location
5. **Location & Licensee**: Combined filtering for specific location/licensee combinations
6. **Location by Licensee**: Find all locations under a specific licensee

**Configuration:**

- Requires `.env` file with `MONGODB_URI` connection string
- Connects to `sas-prod` database
- Supports 5-minute timeout for complex queries
- Includes progress monitoring for long-running queries

**Benefits for Development:**

- **Data Verification**: Confirm API responses match database state
- **Query Debugging**: Test aggregation pipelines before implementing in API
- **Performance Testing**: Measure query performance with real data
- **Data Exploration**: Understand data relationships and structure
- **Regression Testing**: Verify data integrity after changes

## 🏗️ Development Guidelines

**See [`.cursor/rules/nextjs-rules.mdc`](.cursor/rules/nextjs-rules.mdc) for complete engineering rules and [Documentation/PROJECT_GUIDE.md](Documentation/PROJECT_GUIDE.md) for detailed guidelines.**

### Package Management & Build Integrity

- **Use `bun` exclusively** for all package management
- Always run `bun build` after code changes
- Fix build errors immediately and re-run until clean build
- Run `bun type-check` to verify TypeScript types
- Run `bun lint` to check code style

### TypeScript & Code Organization

- **Prefer `type` over `interface`** for consistency across the codebase
- **No `any` allowed** - Create appropriate type definitions for all variables and functions
- **No underscore prefixes allowed** - Never prefix variables or functions with underscores
- **Always check dependencies before deleting code** - Use `grep` to verify usage before removal
- Organize types in appropriate directories:
  - `shared/types/` - Shared types between frontend/backend (entities, API, database)
  - `lib/types/` - Frontend-specific types
  - `app/api/lib/types/` - Backend-specific types
- **Avoid type duplication** - Import and re-export from shared types instead of redefining

### File Organization & Separation of Concerns

- **Keep all `page.tsx` files lean** - Offload complex logic into helper functions and utilities
- **API-related logic** should reside in `app/api/lib/helpers/` or specific feature directories
- **Shared utilities** should reside in `lib/utils/` or `lib/helpers/`
- **Context providers** should be in `lib/contexts/` or `lib/providers/`
- **Feature-specific code** should be organized within their related directories in `lib/` (e.g., `lib/helpers/cabinets/`, `lib/hooks/cabinets/`)
- **Components organized by feature** in `components/[feature]/` with subfolders for tabs, modals, details, etc.
- **Create reusable UI components** in `components/ui/` for common patterns

### API Route Structure (CRITICAL)

- **All API routes must follow exact structure pattern** with step-by-step comments
- Use `// ============================================================================` separators for major steps
- Number each step: `// STEP 1:`, `// STEP 2:`, etc.
- Extract complex logic to `app/api/lib/helpers/[feature].ts` when functions exceed 20-30 lines
- Include file-level JSDoc describing route purpose and features

### Component Structure (CRITICAL)

- **All components must be organized with clear sections** using section comments
- Use `// ============================================================================` to separate: Hooks & State, Computed Values, Event Handlers, Effects, Render
- **Maximum component length**: ~400-500 lines (extract sub-components if needed)
- **Use JSX comments** to mark major UI sections (headers, filters, tables, forms, modals)

### Code Quality

- **Never ignore ESLint rule violations** - Address all warnings and errors immediately
- Run `bun lint` regularly and use `bun lint --fix` when possible
- Document complex business logic with clear explanations
- Use proper error handling in components, especially for async operations
- **Every function should have JSDoc** describing purpose, parameters, and return value

### Security & Authentication

- **Implement secure authentication practices** using JWT tokens with `jose` library
- **Follow OWASP standards** to safeguard code from vulnerabilities
- Never expose sensitive information (API keys, tokens) in client-side code
- Always validate and sanitize user input, especially in form submissions
- Use middleware for route protection where necessary
- Store JWT tokens in secure HTTP-only cookies with proper expiration

### Performance Optimization

- **All `Meters.aggregate()` calls MUST use `.cursor({ batchSize: 1000 })`** instead of `.exec()`
- Use `location` field directly from Meters collection instead of expensive `$lookup` operations
- Eliminate N+1 query patterns with batch queries
- **Performance Targets**: 7d queries <10s, 30d queries <15s
- Implement proper code-splitting and lazy loading for pages and large components
- Use `useMemo` and `useCallback` for expensive computations
- **Use specific skeleton loaders** - Each page/component must have its own skeleton that matches the exact layout

### Timezone Management

- **Trinidad Timezone (UTC-4)**: All date fields are automatically converted from UTC to Trinidad local time
- **Database Storage**: All dates are stored in UTC format in the database
- **API Responses**: Date fields are automatically converted to Trinidad time before being sent to the frontend
- **Date Filtering**: When querying by date ranges, use the timezone utility to convert Trinidad time to UTC for database queries
- **Implementation**: See [Timezone Documentation](Documentation/timezone.md) for detailed implementation guidelines

### Auditing & Logging

**Critical Importance:** Comprehensive auditing and logging are essential for casino management systems due to regulatory compliance requirements, security monitoring, and operational transparency.

#### API Logging Standards

- **Use `APILogger` utility** (`app/api/lib/utils/logger.ts`) for all API endpoints
- **Log all CRUD operations** with success/failure status, duration, and context
- **Include user identification** when available for audit trail
- **Log security-relevant events** (login attempts, permission changes, data access)
- **Format:** `[timestamp] [level] (duration) METHOD endpoint: message [context]`

#### Activity Logging Requirements

- **Track all user actions** that modify system data or access sensitive information
- **Record before/after values** for data changes to enable rollback and audit
- **Include IP addresses and user agents** for security investigation
- **Store logs in dedicated collections** with proper indexing for performance
- **Implement log retention policies** according to regulatory requirements

#### Compliance Considerations

- **Gaming regulations** require detailed audit trails for all financial transactions
- **Data protection laws** mandate logging of personal data access and modifications
- **Security standards** require monitoring of privileged operations and access patterns
- **Operational transparency** enables troubleshooting and performance optimization

#### Implementation Guidelines

- **Use structured logging** with consistent field names and data types
- **Implement log levels** (INFO, WARNING, ERROR) for appropriate filtering
- **Include correlation IDs** to trace related operations across systems
- **Ensure log data integrity** with proper validation and sanitization
- **Monitor log performance** to prevent system impact during high-volume operations

## 🏗️ Project Structure

```
evolution-one-cms/
├── app/                          # Next.js App Router (Next.js 15)
│   ├── (auth)/                  # Authentication pages
│   │   └── login/               # Login page
│   ├── api/                     # API routes and handlers
│   │   └── lib/
│   │       ├── helpers/         # Backend business logic
│   │       ├── models/           # Mongoose models
│   │       ├── types/            # Backend-specific types
│   │       └── utils/            # Backend utilities
│   ├── administration/           # Admin management pages
│   ├── cabinets/                 # Cabinet/machine management
│   │   └── [slug]/               # Cabinet detail pages
│   ├── collection-report/        # Collection reporting
│   │   └── report/[reportId]/    # Collection report details
│   ├── locations/                # Location management
│   │   └── [slug]/               # Location detail pages
│   ├── machines/                 # Machine pages
│   │   └── [slug]/               # Machine detail pages
│   ├── members/                   # Member management
│   │   └── [id]/                  # Member detail pages
│   ├── reports/                   # Reports dashboard
│   ├── sessions/                  # Session management
│   │   └── [sessionId]/[machineId]/events/  # Session events
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Home/dashboard page
├── components/                    # React components
│   ├── [feature]/                 # Feature-specific components
│   │   ├── tabs/                  # Tab-specific components
│   │   ├── modals/                # Modal components
│   │   ├── details/                # Detail page components
│   │   └── skeletons/             # Loading skeletons
│   └── ui/                        # Reusable UI components (Shadcn/ui)
│       ├── skeletons/             # Shared skeleton loaders
│       └── common/                 # Common utilities
├── lib/                           # Frontend libraries
│   ├── helpers/                   # Frontend data fetching & API helpers
│   │   ├── [feature]/             # Feature-specific helpers
│   │   └── client/                 # Client-side utilities
│   ├── utils/                     # Pure utility functions
│   │   ├── [category]/            # Categorized utilities
│   │   └── [feature]/             # Feature-specific utilities
│   ├── types/                      # Frontend-specific types
│   │   ├── [feature]/             # Feature-specific types
│   │   └── index.ts                # Type exports
│   ├── hooks/                     # Custom React hooks
│   │   ├── [feature]/             # Feature-specific hooks
│   │   └── data/                   # Data fetching hooks
│   ├── store/                      # Zustand stores
│   ├── contexts/                   # React contexts
│   ├── constants/                  # Application constants
│   └── providers/                  # React providers
├── shared/                         # Shared code between frontend/backend
│   ├── types/                      # Shared type definitions
│   │   ├── entities.ts             # Core entity types
│   │   ├── api.ts                   # API request/response types
│   │   ├── database.ts              # Database-related types
│   │   └── index.ts                 # Central exports
│   └── utils/                       # Shared utilities
├── public/                         # Static assets (images, icons, etc.)
├── test/                          # Go-based MongoDB query tool for development
├── Documentation/                 # Comprehensive documentation
│   ├── frontend/                   # Frontend documentation
│   │   ├── pages/                  # Page documentation
│   │   ├── details/                 # Detail page docs
│   │   ├── guidelines/             # Frontend guidelines
│   │   └── integration/            # Integration docs
│   ├── backend/                    # Backend API documentation
│   │   ├── core-apis/              # Core APIs
│   │   ├── business-apis/          # Business domain APIs
│   │   ├── analytics-apis/         # Analytics APIs
│   │   ├── specialized-apis/       # Specialized APIs
│   │   ├── calculation-systems/     # Calculation systems
│   │   └── real-time-systems/      # MQTT/real-time systems
│   ├── PROJECT_GUIDE.md            # Complete project guide
│   └── *.md                        # System-wide guides
├── .cursor/                        # Cursor IDE configuration
│   └── rules/                       # Engineering rules and guidelines
├── middleware.ts                   # Next.js middleware (auth, routing)
└── [config files]                 # TypeScript, ESLint, Tailwind, etc.
```

## 📊 Key Modules & Documentation

### Frontend Documentation

- **Dashboard:** Real-time analytics and metrics ([dashboard.md](Documentation/frontend/dashboard.md))
- **Reports:** Comprehensive reporting with 4 tabs (Dashboard, Locations, Machines, Meters) ([reports.md](Documentation/frontend/reports.md))
- **Members:** Member management and session tracking ([members.md](Documentation/frontend/members.md))
- **Sessions:** Gaming session management and analytics ([sessions.md](Documentation/frontend/sessions.md))
- **Locations:** Location management, metrics, cabinet assignment ([locations.md](Documentation/frontend/locations.md))
  - **Location Details:** Individual location analytics ([location-details.md](Documentation/frontend/location-details.md))
  - **Location Cabinets:** Cabinet management by location ([location-cabinets.md](Documentation/frontend/location-cabinets.md))
- **Cabinets:** Slot machine/cabinet management, firmware, SMIB ([cabinets.md](Documentation/frontend/cabinets.md))
  - **Cabinet Details:** Individual cabinet configuration and monitoring ([cabinet-details.md](Documentation/frontend/cabinet-details.md))
- **Collection Report:** Collection reporting, monthly summaries, scheduling, delete/edit functionality ([collection-report.md](Documentation/frontend/collection-report.md))
- **Administration:** User and licensee management ([administration.md](Documentation/frontend/administration.md))
- **Login:** Secure authentication ([login.md](Documentation/frontend/login.md))

### Backend Documentation

**See [Backend Documentation README](Documentation/backend/README.md) for complete API reference.**

- **API Overview:** Complete API reference ([api-overview.md](Documentation/backend/api-overview.md))
- **Core APIs:** Authentication, administration, system configuration ([core-apis/](Documentation/backend/core-apis/))
- **Business APIs:** Locations, machines, members, sessions, collections ([business-apis/](Documentation/backend/business-apis/))
- **Analytics APIs:** Reporting, analytics, operations ([analytics-apis/](Documentation/backend/analytics-apis/))
- **Specialized APIs:** Meter synchronization, location-machine relationships ([specialized-apis/](Documentation/backend/specialized-apis/))
- **Calculation Systems:** Bill validator, SAS gross calculations ([calculation-systems/](Documentation/backend/calculation-systems/))
- **Real-Time Systems:** MQTT architecture and implementation ([real-time-systems/](Documentation/backend/real-time-systems/))

### General Documentation

- **Project Guide:** Complete system overview and architecture ([PROJECT_GUIDE.md](Documentation/PROJECT_GUIDE.md))
- **Timezone:** Trinidad timezone handling and date conversion ([timezone.md](Documentation/timezone.md))
- **Financial Metrics:** Financial calculations and metrics guide ([financial-metrics-guide.md](Documentation/financial-metrics-guide.md))
- **Gaming Day Offset:** Complete gaming day offset system guide ([gaming-day-offset-system.md](.cursor/gaming-day-offset-system.md))
- **Performance Optimization:** Database and frontend optimization strategies ([PERFORMANCE_OPTIMIZATION_GUIDE.md](Documentation/PERFORMANCE_OPTIMIZATION_GUIDE.md))
- **TypeScript Type Safety:** Three-tier type system guidelines ([typescript-type-safety-rules.md](Documentation/typescript-type-safety-rules.md))
- **Database Models:** Complete database schema reference ([database-models.md](Documentation/database-models.md))

See [pages-overview.md](Documentation/frontend/pages-overview.md) for a full list of pages and documentation status.

## 📝 Summary

Evolution1 CMS enforces strict engineering discipline in type safety, code style, modularity, and security. All contributors must follow these guidelines to maintain a robust, maintainable, and secure codebase.

**Key Principles:**

- **Build Integrity:** Always ensure clean builds with zero errors
- **Type Safety:** Comprehensive TypeScript coverage
- **Code Organization:** Clear separation of concerns
- **Security First:** Follow OWASP standards and secure practices
- **Timezone Consistency:** All dates automatically converted to Trinidad time (UTC-4)
- **Gaming Day Offset:** Financial reporting aligned with 8 AM gaming day start
- **Movement Delta Method:** All financial calculations use sum of movement fields
- **Comprehensive Testing:** Use the test directory for database validation and query testing

**User Management:** Add, edit, and manage user roles and permissions.
**Activity Logs:** Track all significant actions for auditing and security.

## ✨ Core Principles

- **Modularity**: Easy to extend and maintain
- **Documentation**: See the `Documentation/` folder for detailed specs, requirements, and page summaries.
- **Testing**: Use the `test/` directory for database validation and development support.

---

**Last Updated:** January 2025
