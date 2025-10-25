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
- 📊 **Comprehensive Reports Module** ([docs](Documentation/frontend/reports.md))
  - Dashboard, Locations, Machines, and Meters tabs with comprehensive financial calculations
  - Gaming day offset integration for accurate reporting
- 🔄 **URL Redirects & SEO Optimization** ([docs](Documentation/frontend/redirect-pages.md))
- 📑 **Pages Overview & Architecture** ([docs](Documentation/frontend/pages-overview.md))
- 🕐 **Timezone Management** ([docs](Documentation/timezone.md)) - **Trinidad (UTC-4) timezone support**
- ⏰ **Gaming Day Offset System** ([docs](.cursor/gaming-day-offset-rules.md)) - **8 AM gaming day start time**

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

### 2️⃣ Install pnpm (if you don't have it)

If you don't have pnpm installed globally, run:

```sh
npm i -g pnpm@latest
```

### 3️⃣ Install Dependencies

```sh
pnpm install
```

### 4️⃣ Run the Development Server

```sh
pnpm run dev
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
  -e MONGO_URI="your_mongodb_connection_string" \
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
docker run --rm -p 3000:3000 -e MONGO_URI="mongo uri in .env" -e JWT_SECRET="jwt secret in .env" -e NODE_ENV="production" -e NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="api key in .env" registry.gitlab.com/sunny-group/sas/evolution-one-cms
```

```sh
# Mac/Linux (bash/zsh): use backslash \ to split lines
docker run --rm -p 3000:3000 \
  -e MONGO_URI="mongo uri in .env" \
  -e JWT_SECRET="jwt secret in .env" \
  -e NODE_ENV="production" \
  -e NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="api key in .env" \
  registry.gitlab.com/sunny-group/sas/evolution-one-cms
```

## 🖥️ Development Commands

| Command               | Description                  |
| --------------------- | ---------------------------- |
| `pnpm run dev`        | Start development server     |
| `pnpm run build`      | Build production app         |
| `pnpm run start`      | Start production server      |
| `pnpm run lint`       | Check for linting issues     |
| `pnpm run type-check` | Run TypeScript type checking |

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

- Requires `.env` file with `MONGO_URI` connection string
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

### Package Management & Build Integrity

- **Use `pnpm` exclusively** for all package management
- Always run `pnpm build` after code changes
- Fix build errors immediately and re-run until clean build

### TypeScript & Code Organization

- **Prefer `type` over `interface`** for consistency
- **No `any` allowed** - Create proper type definitions
- Organize types in appropriate directories:
  - `shared/types/` - Shared types between frontend/backend
  - `lib/types/` - Application-wide types
  - `app/api/lib/types/` - API-specific types

### File Organization & Separation of Concerns

- Keep `page.tsx` files lean - offload logic to helpers
- API logic in `app/api/lib/helpers/`
- Shared utilities in `lib/utils/` or `lib/helpers/`
- Components organized by feature in `components/`

### Code Quality

- Address all ESLint warnings immediately
- Run `pnpm lint` regularly
- Document complex business logic
- Use proper error handling in components

### Security & Authentication

- **Implement secure authentication practices** through Firebase Authentication
- **Follow OWASP standards** to safeguard code from vulnerabilities
- Never expose sensitive information (API keys, tokens) in client-side code
- Always validate and sanitize user input, especially in form submissions
- Use middleware for route protection where necessary

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
Evolution1 CMS/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes and handlers
│   ├── (auth)/            # Authentication pages
│   ├── administration/    # Admin management
│   ├── cabinets/          # Cabinet management
│   ├── collection-report/ # Collection reporting
│   ├── locations/         # Location management
├── components/            # Reusable UI components
├── lib/                   # Utilities, helpers, types, stores
├── shared/                # Shared types between frontend/backend
├── public/                # Static assets
├── test/                  # Go-based MongoDB query tool for development
├── Documentation/         # Comprehensive documentation
│   ├── frontend/         # Frontend component documentation
│   ├── backend/          # API documentation
│   └── *.md             # General documentation
└── middleware.ts          # Next.js middleware
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

- **API Overview:** Complete API reference ([api-overview.md](Documentation/backend/api-overview.md))
- **Reports API:** Backend reporting and aggregation ([reports-api.md](Documentation/backend/reports-api.md))
- **Meters Report API:** Machine-level meter readings ([meters-report-api.md](Documentation/backend/meters-report-api.md))
- **Analytics:** Dashboard analytics and metrics ([analytics-api.md](Documentation/backend/analytics-api.md))
- **Collections:** Financial data and collection management ([collections-api.md](Documentation/backend/collections-api.md))
  - Collection Report Details API - Individual report data and meter syncing
- **Members:** Member management and session tracking ([members-api.md](Documentation/backend/members-api.md))
  - Member Details API - Individual member data and session history
  - Member Sessions API - Session tracking and event details
- **Sessions:** Gaming session management ([sessions-api.md](Documentation/backend/sessions-api.md))
  - Session Events API - Detailed session event tracking
- **Locations & Machines:** Location and machine management ([locations-machines-api.md](Documentation/backend/locations-machines-api.md))
  - Location Details API - Individual location data and analytics
  - Machine Details API - Individual machine data and events
- **Authentication:** Security and user management ([auth-api.md](Documentation/backend/auth-api.md))
- **Administration:** User management and system administration ([administration-api.md](Documentation/backend/administration-api.md))
- **Operations:** System operations and metrics tracking ([operations-api.md](Documentation/backend/operations-api.md))
- **System Configuration:** System configuration and settings ([system-config-api.md](Documentation/backend/system-config-api.md))

### General Documentation

- **Timezone:** Trinidad timezone handling and date conversion ([timezone.md](Documentation/timezone.md))
- **Engineering Guidelines:** Development standards and best practices ([ENGINEERING_GUIDELINES.md](Documentation/ENGINEERING_GUIDELINES.md))
- **Financial Metrics:** Financial calculations and metrics guide ([financial-metrics-guide.md](Documentation/financial-metrics-guide.md))
- **Gaming Day Offset:** Complete gaming day offset implementation guide ([gaming-day-offset-rules.md](.cursor/gaming-day-offset-rules.md))
- **SAS GROSS Calculation:** SAS GROSS calculation system and verification ([sas-gross-calculation-system.md](Documentation/backend/sas-gross-calculation-system.md))

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

**Last Updated:** October 10th, 2025
