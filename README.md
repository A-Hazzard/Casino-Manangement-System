# 🎰 Evolution1 Casino Management System (CMS)

**Evolution1 CMS** is a robust **casino management system** designed to oversee **casino operations, financial tracking, gaming reports, and compliance monitoring**. It provides a seamless dashboard for **real-time data visualization, revenue tracking, and slot machine performance monitoring**.

## 🚀 Features
- 📊 **Dashboard with Real-Time Reports & Analytics**
- 🎮 **Slot Machine & Gaming Floor Management**
- 💰 **Financial Tracking (Wager, Gross, Games Won)**
- 📈 **Advanced Reporting System with Multiple Report Types**
- 🔍 **Role-Based Access Control (RBAC)**
- 📊 **Interactive Charts & Data Visualization with Recharts**
- 🗺️ **Interactive Location Maps with Performance Indicators**
- 🔄 **Filtering & Sorting Options**
- 📧 **Automated Report Scheduling & Email Delivery**
- ⚡ **Optimized for Performance & SEO**

---

## 🛠️ Tech Stack
| Tech | Description |
|------|------------|
| **Next.js 15** | React-based framework for performance & scalability |
| **TypeScript** | Type safety & better developer experience |
| **Tailwind CSS** | Utility-first styling for responsive UI |
| **MUI** | Comprehensive UI component library for building responsive layouts |
| **Radix UI** | Primitives for building accessible UI components |
| **Shadcn** | UI component library for rapid development |
| **Recharts** | Data visualization & charting for reports |
| **React Leaflet** | Interactive maps for location-based data visualization |
| **MongoDB** | NoSQL database for application data |
| **Zustand** | State management for complex app interactions |
| **Framer Motion** | Animation library for creating smooth animations |
| **GSAP** | High-performance animation library for complex animations |

---

## 📂 Folder Structure
```
Evolution1 CMS/
├── app/                           # Next.js App Router - Main application logic
│   ├── (auth)/                   # Authentication route group
│   │   └── login/               # Login page
│   ├── administration/           # Admin management pages
│   ├── api/                     # API routes and handlers
│   │   ├── analytics/           # Analytics API endpoints (dashboard, locations, machines, logistics, reports)
│   │   ├── auth/               # Authentication endpoints
│   │   ├── collections/        # Collection management API
│   │   ├── collectors/         # Collector management API
│   │   ├── locations/          # Location management API
│   │   ├── machines/           # Machine management API
│   │   ├── users/              # User management API
│   │   ├── metrics/            # Performance metrics API
│   │   ├── movement-requests/  # Machine movement requests API
│   │   ├── schedulers/         # Scheduled tasks API
│   │   └── lib/                # API-specific helpers and utilities
│   │       ├── helpers/        # API helper functions
│   │       ├── middleware/     # API middleware
│   │       ├── models/         # Database models
│   │       ├── types/          # API-specific types
│   │       └── utils/          # API utility functions
│   ├── cabinets/               # Cabinet management pages
│   ├── collection/             # Collection pages
│   ├── collection-report/      # Collection reporting pages
│   ├── collections/            # Collections overview pages
│   ├── locations/              # Location management pages
│   ├── reports/                # Reports module with comprehensive reporting features
│   ├── layout.tsx              # Root layout component
│   ├── page.tsx                # Dashboard home page
│   └── globals.css             # Global styles
├── components/                   # Reusable UI components
│   ├── administration/         # Admin-specific components
│   ├── cabinetDetails/         # Cabinet detail components
│   ├── cabinets/               # Cabinet-related components
│   ├── collectionReport/       # Collection report components
│   ├── layout/                 # Layout components (Header, Sidebar)
│   ├── location/               # Location components
│   ├── locationDetails/        # Location detail components
│   ├── reports/                # Reports module components
│   │   ├── charts/            # Chart components for data visualization
│   │   ├── common/            # Shared report components (LocationMap, etc.)
│   │   ├── modals/            # Report-related modals
│   │   ├── reports/           # Report configuration components
│   │   └── tabs/              # Report tab components (Dashboard, Machines, Locations, etc.)
│   └── ui/                     # Base UI components (buttons, cards, etc.)
├── lib/                         # Shared utilities and configurations
│   ├── constants/              # Application constants
│   ├── helpers/                # Helper functions for business logic
│   │   ├── reports.ts         # Reports-specific helper functions
│   │   ├── administration.ts  # Admin helper functions
│   │   ├── cabinets.ts        # Cabinet helper functions
│   │   └── [+10 more files]   # Other domain-specific helpers
│   ├── hooks/                  # Custom React hooks
│   │   ├── useDashboardReports.ts    # Dashboard reports data hook
│   │   ├── useLocationsReports.ts    # Location reports data hook
│   │   ├── useMachinesReports.ts     # Machine reports data hook
│   │   ├── useLogisticsReports.ts    # Logistics reports data hook
│   │   ├── useGenerateCustomReport.ts # Custom report generation hook
│   │   └── [+4 more files]    # Other custom hooks
│   ├── store/                  # Zustand store configurations
│   │   ├── reportsStore.ts    # Main reports state management
│   │   ├── reportsDataStore.ts # Reports data caching and management
│   │   ├── useReportStore.ts  # Report configuration store
│   │   └── [+7 more files]    # Other stores
│   ├── types/                  # TypeScript type definitions
│   │   ├── reports.ts         # Reports-specific types
│   │   ├── administration.ts  # Admin types
│   │   ├── cabinets.ts        # Cabinet types
│   │   └── [+12 more files]   # Other type definitions
│   └── utils/                  # Utility functions
│       ├── exportUtils.ts     # Export functionality for reports
│       └── [+12 more files]   # Other utilities
├── shared/                      # Shared types between frontend and backend
│   └── types/                  # Shared TypeScript type definitions
│       ├── common.ts           # Core shared types (API, MongoDB, etc.)
│       ├── reports.ts          # Reports-specific shared types
│       └── index.ts            # Central export point
├── logs/                        # Application logs
├── public/                      # Static assets (images, icons, etc.)
│   └── leaflet/                # Leaflet map assets
├── pre-aggregation/             # Go-based data aggregation service
├── mongo-migration/             # Database migration utilities
├── middleware.ts                # Next.js middleware
├── next.config.ts              # Next.js configuration
├── package.json                # Dependencies and scripts
└── README.md                   # Project documentation
```

---

## 🏗️ Development Rules & Guidelines

To ensure code quality, maintainability, and security, all developers must adhere to the following engineering guidelines:

### 1. 📦 Package Management & Build Integrity
- **Use `pnpm` exclusively** for all package management tasks (install, update, remove)
- After any code or dependency change, always run `pnpm build`
- If a build error occurs, fix the error, then re-run `pnpm build`
- Repeat this process recursively until the project builds cleanly with zero errors or warnings
- For development, use `pnpm dev` to start the local development server

### 2. 🔷 TypeScript Discipline & Types Organization
- **All type definitions must reside in the appropriate types directories:**
  - **Shared types (used by both frontend and backend)**: `shared/types/`
  - Application-wide types: `lib/types/`
  - API-specific types: `app/api/lib/types/`
- **Prefer `type` over `interface`** for consistency across the codebase
- **No `any` allowed** - Create appropriate type definitions for all variables and functions
- Always import types from their respective type files - avoid redefining types
- Use the `@shared/types` path alias for importing shared types
- Ensure type exports are properly named and documented

### 3. 🎨 ESLint & Code Style
- **Never ignore ESLint rule violations**
- Address all ESLint warnings and errors immediately
- Run `pnpm lint` regularly to catch and fix style issues
- Follow the established code style in existing files for consistency
- Use ESLint's auto-fix feature when possible: `pnpm lint --fix`

### 4. 📁 File Organization & Separation of Concerns
- **Keep all `page.tsx` and component files lean**
  - Offload complex logic into helper functions and utilities
- **API-related logic should reside in `app/api/lib/helpers/` or specific feature directories**
- **Shared utilities should reside in `lib/utils/` or `lib/helpers/`**
- **Context providers should be in `lib/contexts/`**
- **Reports-related components should be organized in `components/reports/` with proper subdirectories**
- Organize feature-specific code within their related directories in `lib/` (e.g., `lib/reports/`, `lib/administration/`)
- Do not mix API logic with UI or utility logic

### 5. 📝 Comments & Documentation
- **Remove redundant comments** that simply restate the meaning of well-named code
- In helper and utility files, every function should have a concise block comment describing:
  - Its purpose
  - Its parameters
  - Its return value
- Document complex business logic with clear explanations
- Update comments when code changes

### 6. 🔒 Security & Authentication/Authorization
- **Implement secure authentication practices** using JWT tokens with `jose` library
- **Follow OWASP standards** to safeguard code from vulnerabilities
- Never expose sensitive information (API keys, tokens) in client-side code
- Always validate and sanitize user input, especially in form submissions
- Use middleware for route protection where necessary
- Store JWT tokens in secure HTTP-only cookies with proper expiration

### 7. ⚛️ Component Structure & State Management
- Use appropriate state management solutions based on scope:
  - React's `useState` and `useReducer` for local component state
  - Context API for shared state across component tree
  - Zustand for application-wide state management (reports, dashboard, etc.)
- Keep components focused on a single responsibility
- Extract reusable UI elements into separate components
- Implement proper error handling in components, especially for async operations

### 8. ⚡ Performance Optimization
- Implement proper code-splitting and lazy loading for pages and large components
- Optimize images using Next.js Image component
- Minimize unnecessary re-renders with memoization techniques
- Use efficient data fetching patterns to prevent waterfalls
- Implement proper caching strategies for API responses

### 9. 🧪 Testing Best Practices
- Testing framework setup is planned for future implementation
- Focus on manual testing of critical user flows during development
- Implement proper error handling and logging for debugging
- Use TypeScript for compile-time error catching

### 10. ♿ Accessibility & Internationalization
- Ensure all components are accessible with proper ARIA attributes
- Use semantic HTML elements
- Support keyboard navigation
- Prepare for internationalization by avoiding hardcoded strings where possible

---

## ⚙️ Installation & Setup
### **1️⃣ Clone the Repository**
```sh
git clone <repository-url>
cd Evolution1\ CMS
```

### **2️⃣ Install Dependencies**
```sh
pnpm install
```

### **3️⃣ Run the Development Server**
```sh
pnpm run dev
```
Open http://localhost:3000 to see the application.

---

## 🐳 Docker Setup

You can also build and run the application using Docker.

### **1️⃣ Build the Docker Image Locally**
This command builds the Docker image using the `Dockerfile` in the project root and tags it as `evolution1-cms:local`.
```sh
docker build -t evolution1-cms:local .
```

### **2️⃣ Run the Docker Container Locally**
This command runs the container based on the image built in the previous step.
```sh
docker run --rm -p 3000:3000 \
  -e MONGO_URI="your_mongodb_connection_string" \
  -e JWT_SECRET="cms" \
  -e NODE_ENV="production" \
  evolution1-cms:local
```
**Explanation:**
*   `--rm`: Automatically removes the container when it stops.
*   `-p 3000:3000`: Maps port 3000 on your host machine to port 3000 inside the container.
*   `-e VAR="value"`: Sets the required environment variables. **Replace the placeholder values** (like `"your_mongodb_connection_string"`) with your actual credentials for the application to function correctly.
*   `evolution1-cms:local`: Specifies the Docker image to run.

Once the container is running, you can access the application at http://localhost:3000.

### **3️⃣ (Optional) Push to GitLab Registry**
If you have access and need to push the image to the project's GitLab registry, first build it with the registry tag:
```sh
docker build -t registry.gitlab.com/sunny-group/sas/dynamic-cms .
```
Then, push the image:
```sh
docker push registry.gitlab.com/sunny-group/sas/dynamic-cms
```

---

## 🐙 Container Registry (GitLab)

You can build and push the Docker image to the GitLab container registry for this project.

### **1️⃣ Authenticate with GitLab Container Registry**
```sh
docker login registry.gitlab.com
```

### **2️⃣ Build the Docker Image for GitLab Registry**
```sh
docker build -t registry.gitlab.com/sunny-group/sas/dynamic-cms .
```

### **3️⃣ Push the Image to the Registry**
```sh
docker push registry.gitlab.com/sunny-group/sas/dynamic-cms
```

### **4️⃣ Run the Image from the Registry**
```sh
docker run --rm -p 3000:3000 ^
  -e MONGO_URI="your_mongodb_connection_string" ^
  -e JWT_SECRET="your_jwt_secret" ^
  -e NODE_ENV="production" ^
  registry.gitlab.com/sunny-group/sas/dynamic-cms
```
> **Note:** Replace the environment variable values with your actual credentials.

---

## 🖥️ Development Workflow

### 🏗️ Common Commands
| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start the development server with Turbopack |
| `pnpm run build` | Build the production app |
| `pnpm run start` | Start the production server |
| `pnpm run lint` | Check for linting issues |
| `pnpm run type-check` | Run TypeScript type checking |
| `pnpm test` | Run Jest tests (when configured) |

### 💡 Development Best Practices
- ✔️ Use TypeScript for type safety
- ✔️ Keep UI components reusable (`components/`)
- ✔️ Store utility functions in `lib/utils/`
- ✔️ Follow Tailwind CSS naming conventions
- ✔️ Run `pnpm build` after every change to ensure build integrity
- ✔️ Address all ESLint warnings before committing
- ✔️ Organize types in appropriate directories
- ✔️ Keep components focused on single responsibilities

---

## 🔗 Shared Types Architecture

### Implementation Overview
Following Next.js best practices for organizing lib folders, we've implemented a **shared types structure** to eliminate code duplication between frontend and backend components.

### Structure
- **`shared/types/common.ts`** - Core shared types including:
  - `ApiResponse<T>` - Generic API response structure
  - `DateRange` - Date range filtering
  - `TimePeriod` - Time period enumeration
  - MongoDB types (`MongooseId`, `MongoMatchStage`)
  - Performance indicators and sorting types

- **`shared/types/reports.ts`** - Reports-specific shared types including:
  - `ReportFilters` - Report filtering parameters
  - `ReportMetrics` - Performance metrics structure
  - Location and machine report responses
  - Comparison and compliance request/response types
  - Scheduled report configuration types

### Benefits Achieved
- ✅ **Eliminated Type Duplication** - Single source of truth for shared types
- ✅ **Improved Maintainability** - Updates only need to be made in one place
- ✅ **Better Organization** - Clear separation between shared and domain-specific types
- ✅ **Type Safety** - Consistent definitions across frontend and backend
- ✅ **Clean Imports** - Uses `@shared/types` path alias for easy importing


## 🔄 Architectural Updates

### Server-Rendered Sidebar
- The Sidebar component is now a server component, optimized for instant icon rendering and no hydration delay.
- It accepts a `pathname` prop from client pages to determine the current section (Dashboard, Locations, Cabinets, Collections, Administration, Reports).
- This architectural change improves performance and user experience by rendering the Sidebar on the server.

### Dynamic Routing & Error Handling
- The application uses dynamic routing for various sections:
  - `/locations/[slug]` - Location details
  - `/cabinets/[slug]` - Cabinet details
  - `/collection-report/report/[reportId]` - Collection report details
- Each dynamic route includes a `not-found.tsx` file for error handling, ensuring a consistent user experience even when resources are not found.

### Client-Side Pages
- Main pages (e.g., `app/page.tsx`, `app/locations/page.tsx`, `app/cabinets/page.tsx`, `app/collection-report/page.tsx`, `app/administration/page.tsx`, `app/reports/page.tsx`) are client components.
- They use `usePathname` to pass the current pathname to the Sidebar, ensuring accurate section highlighting.

### Error Handling
- Global 404 page (`app/not-found.tsx`) provides a fallback for unmatched routes.
- Section-specific 404 pages (e.g., `app/locations/not-found.tsx`, `app/cabinets/not-found.tsx`, `app/reports/not-found.tsx`) offer tailored error messages and navigation options.

---

## 📊 Reports Module Features

The Evolution1 CMS includes a comprehensive reports module with the following capabilities:

### 📈 Report Types
- **Dashboard Reports** - Real-time performance overview with interactive maps
- **Machine Reports** - Detailed machine performance, meters export, comparison analysis
- **Location Reports** - Location-based performance analysis and revenue tracking
- **Compliance Reports** - GLI compliance monitoring and event tracking
- **Logistics Reports** - Movement tracking and operational efficiency
- **Scheduled Reports** - Automated report generation and email delivery

### 🗺️ Interactive Features
- **Location Maps** - Interactive maps with performance indicators using React Leaflet
- **Real-time Charts** - Professional data visualization using Recharts
- **Export Functionality** - Export reports to Excel, PDF, and other formats
- **Gaming Day Support** - 6 AM to 6 AM reporting cycle for accurate daily metrics
- **Color-coded UI** - Gross (Green), Drop (Yellow), Cancelled Credits (Black)

### 🔧 Technical Implementation
- **Modular Architecture** - Tab-based interface with dedicated components
- **State Management** - Zustand stores for reports data and configuration
- **Type Safety** - Comprehensive TypeScript types for all report structures
- **Performance Optimized** - Efficient data fetching and caching strategies

---

## 📝 Summary

This project enforces strict discipline in type safety, code style, modularity, security, and build integrity. All contributors must follow these rules to ensure a robust, maintainable, and secure codebase.

**Key Principles:**
- **Persistence**: Keep going until the job is completely solved
- **Plan then reflect**: Plan thoroughly before every change, then reflect on the outcome
- **Use tools, don't guess**: If you're unsure about code or files, investigate - don't make assumptions

By following these guidelines, we maintain a high-quality codebase that scales effectively and remains maintainable over time.
