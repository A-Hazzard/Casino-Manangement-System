# Evolution1 Casino Management System (CMS)

<div align="center">
  <img src="public/EOS_Logo.png" alt="EOS Logo" width="200"/>
</div>

**Evolution1 CMS** is a robust casino management system designed to oversee casino operations, financial tracking, gaming reports, and compliance monitoring. It provides a seamless dashboard for real-time data visualization, revenue tracking, and slot machine performance monitoring.

## 🚀 Features
- 📊 **Dashboard with Real-Time Reports & Analytics**
- 🎮 **Slot Machine & Gaming Floor Management**
- 💰 **Financial Tracking (Wager, Gross, Games Won)**
- 📈 **Advanced Reporting System with Multiple Report Types**
- 🔍 **Role-Based Access Control (RBAC)**
- 📊 **Interactive Charts & Data Visualization**
- 🗺️ **Interactive Location Maps with Performance Indicators**
- 📧 **Automated Report Scheduling & Email Delivery**

## 🛠️ Tech Stack
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety and better developer experience
- **Tailwind CSS** - Utility-first styling
- **MongoDB** - NoSQL database
- **Zustand** - State management
- **Recharts** - Data visualization and charting
- **React Leaflet** - Interactive maps
- **Shadcn/UI** - Modern UI components

## ⚙️ Installation & Setup

### **1️⃣ Clone the Repository**
```sh
git clone <repository-url>
cd "Evolution1 CMS"
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

## 🐳 Docker Setup

### **1️⃣ Build the Docker Image Locally**
```sh
docker build -t evolution1-cms:local .
```

### **2️⃣ Run the Docker Container Locally**
```sh
docker run --rm -p 3000:3000 \
  -e MONGO_URI="your_mongodb_connection_string" \
  -e JWT_SECRET="cms" \
  -e NODE_ENV="production" \
  evolution1-cms:local
```

### **3️⃣ GitLab Container Registry**

**Authenticate:**
```sh
docker login registry.gitlab.com
```

**Build for GitLab Registry:**
```sh
docker build -t registry.gitlab.com/sunny-group/sas/dynamic-cms .
```

**Push to Registry:**
```sh
docker push registry.gitlab.com/sunny-group/sas/dynamic-cms
```

**Run from Registry:**
```sh
docker run --rm -p 3000:3000 \
  -e MONGO_URI="your_mongodb_connection_string" \
  -e JWT_SECRET="your_jwt_secret" \
  -e NODE_ENV="production" \
  registry.gitlab.com/sunny-group/sas/dynamic-cms
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

## 📂 Project Structure
```
Evolution1 CMS/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes and handlers
│   ├── (auth)/            # Authentication pages
│   ├── administration/    # Admin management
│   ├── cabinets/          # Cabinet management
│   ├── collection-report/ # Collection reporting
│   ├── locations/         # Location management
│   └── reports/           # Reports module
├── components/            # Reusable UI components
├── lib/                   # Utilities, helpers, types, stores
├── shared/                # Shared types between frontend/backend
├── public/                # Static assets
└── middleware.ts          # Next.js middleware
```

## 📊 Key Modules

### Reports Module
- **Dashboard Reports** - Real-time performance overview
- **Machine Reports** - Detailed machine performance analysis
- **Location Reports** - Location-based revenue tracking
- **Compliance Reports** - GLI compliance monitoring
- **Logistics Reports** - Movement tracking
- **Scheduled Reports** - Automated report generation

### Authentication & Security
- JWT-based authentication with secure HTTP-only cookies
- Role-based access control (RBAC)
- OWASP security standards compliance
- Input validation and sanitization

## 📝 Summary

Evolution1 CMS enforces strict engineering discipline in type safety, code style, modularity, and security. All contributors must follow these guidelines to maintain a robust, maintainable, and secure codebase.

**Key Principles:**
- **Build Integrity**: Always ensure clean builds with zero errors
- **Type Safety**: Comprehensive TypeScript coverage
- **Code Organization**: Clear separation of concerns
- **Security First**: Follow OWASP standards and secure practices 