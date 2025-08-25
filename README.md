# Evolution1 Casino Management System (CMS)

<div align="center">
  <img src="public/EOS_Logo.png" alt="EOS Logo" width="200"/>
</div>

**Evolution1 CMS** is a robust casino management system for real-time casino operations, financial tracking, and compliance monitoring. It features a modern dashboard, detailed reporting, and comprehensive management of locations, cabinets, collections, and users.

## 🚀 Features
- 📊 **Dashboard with Real-Time Analytics** ([docs](Documentation/dashboard.md))
- 🎮 **Slot Machine & Gaming Floor Management** ([docs](Documentation/cabinets.md))
  - 🔧 **Cabinet Details & SMIB Configuration** ([docs](Documentation/cabinet-details.md))
- 💰 **Financial Tracking & Collection Reporting** ([docs](Documentation/collection-report.md))
  - 📈 **Collection Report Details** ([docs](Documentation/collection-report-details.md))
- 📍 **Location Management** ([docs](Documentation/locations.md))
  - 🎰 **Location Cabinets** ([docs](Documentation/location-cabinets.md))
  - 📊 **Location Details & Analytics** ([docs](Documentation/location-details.md))
- 👥 **User & Licensee Administration** ([docs](Documentation/administration.md))
- 🔐 **Secure Authentication** ([docs](Documentation/login.md))
- 📊 **Comprehensive Reports Module** ([docs](Documentation/reports.md)) ✅ **Recently Implemented**
  - Dashboard, Locations, Machines, Customers, Vouchers, Movements, Compliance, Analytics, Templates, and Scheduled Reports
- 🔄 **URL Redirects & SEO Optimization** ([docs](Documentation/redirect-pages.md))
- 📑 **Pages Overview & Architecture** ([docs](Documentation/pages-overview.md))
- 🤖 **AI Assistant Integration** ([docs](Documentation/prompt.md))
- 📋 **Meeting Management** ([docs](Documentation/meeting.md))
- 🕐 **Timezone Management** ([docs](Documentation/timezone.md)) - **Trinidad (UTC-4) timezone support**

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

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start development server |
| `pnpm run build` | Build production app |
| `pnpm run start` | Start production server |
| `pnpm run lint` | Check for linting issues |
| `pnpm run type-check` | Run TypeScript type checking |

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
└── middleware.ts          # Next.js middleware
```

## 📊 Key Modules & Documentation

- **Dashboard:** Real-time analytics and metrics ([dashboard.md](Documentation/dashboard.md))
- **Login:** Secure authentication ([login.md](Documentation/login.md))
- **Administration:** User and licensee management ([administration.md](Documentation/administration.md))
- **Collection Report:** Collection reporting, monthly summaries, scheduling ([collection-report.md](Documentation/collection-report.md))
- **Cabinets:** Slot machine/cabinet management, firmware, SMIB ([cabinets.md](Documentation/cabinets.md))
- **Locations:** Location management, metrics, cabinet assignment ([locations.md](Documentation/locations.md))
- **Timezone:** Trinidad timezone handling and date conversion ([timezone.md](Documentation/timezone.md))

See [pages-overview.md](Documentation/pages-overview.md) for a full list of pages and documentation status.

## ❌ Reports Module Status
- The previous Reports module has been **removed** pending a full redesign and stakeholder review.
- See [reports.md](Documentation/reports.md) for historical context and [Reports FRD.md](Documentation/Reports%20FRD.md) for planned requirements.
- Reporting features are currently integrated into the dashboard, collection report, and other modules as described above.

## 📝 Summary

Evolution1 CMS enforces strict engineering discipline in type safety, code style, modularity, and security. All contributors must follow these guidelines to maintain a robust, maintainable, and secure codebase.

**Key Principles:**
- **Build Integrity:** Always ensure clean builds with zero errors
- **Type Safety:** Comprehensive TypeScript coverage
- **Code Organization:** Clear separation of concerns
- **Security First:** Follow OWASP standards and secure practices
- **Timezone Consistency:** All dates automatically converted to Trinidad time (UTC-4)

**User Management:** Add, edit, and manage user roles and permissions.
**Activity Logs:** Track all significant actions for auditing and security.

## ✨ Core Principles
- **Modularity**: Easy to extend and maintain
- **Documentation**: See the `Documentation/` folder for detailed specs, requirements, and page summaries.
