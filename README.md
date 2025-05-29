# 🎰 Dynamic1 Casino Management System (CMS)

**Dynamic1 CMS** is a robust **casino management system** designed to oversee **casino operations, financial tracking, gaming analytics, and compliance monitoring**. It provides a seamless dashboard for **real-time data visualization, revenue tracking, and slot machine performance monitoring**.

## 🚀 Features
- 📊 **Dashboard with Real-Time Analytics**
- 🎮 **Slot Machine & Gaming Floor Management**
- 💰 **Financial Tracking (Wager, Gross, Games Won)**
- 🔍 **Role-Based Access Control (RBAC)**
- 📈 **Advanced Data Visualization with Recharts**
- 🔄 **Filtering & Sorting Options**
- ⚡ **Optimized for Performance & SEO**

---

## 🛠️ Tech Stack
| Tech | Description |
|------|------------|
| **Next.js 15** | React-based framework for performance & scalability |
| **TypeScript** | Type safety & better developer experience |
| **Tailwind CSS** | Utility-first styling for responsive UI |
| **Recharts** | Data visualization & charting |
| **MongoDB** | NoSQL database for application data |
| **Zustand** | State management for complex app interactions |

---

## 📂 Folder Structure
```
├── app/                    # Main application logic
│   ├── layout.tsx         # Global layout (header, footer, etc.)
│   ├── page.tsx           # Dashboard page
│   ├── not-found.tsx      # Global 404 page
│   ├── components/        # Reusable UI components
│   │   ├── layout/       # Layout components (Header, Sidebar, etc.)
│   │   ├── charts/       # Chart components for data visualization
│   │   ├── tables/       # Data tables & lists
│   ├── lib/              # Utilities & helper functions
│   │   ├── utils/        # Common utility functions (calculations, formatting)
│   │   ├── types/        # TypeScript type definitions
│   ├── styles/           # Global styles (Tailwind CSS)
│   ├── public/           # Static assets (images, icons, etc.)
│   ├── README.md
```

---

## ⚙️ Installation & Setup
### **1️⃣ Clone the Repository**
```sh
git clone https://gitlab.com/sunny-group/sas/dynamic-cms.git
cd dynamic1-cms
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
docker run --rm -p 3000:3000 \\
  -e MONGO_URI="your_mongodb_connection_string" \\
  -e JWT_SECRET="your_jwt_secret" \\
  -e NODE_ENV="production" \\
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

### 💡 Best Practices
- ✔️ Use TypeScript for type safety
- ✔️ Keep UI components reusable (`components/`)
- ✔️ Store utility functions in `lib/utils/`
- ✔️ Follow Tailwind CSS naming conventions

### 🏗️ Common Commands
| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start the development server |
| `pnpm run build` | Build the production app |
| `pnpm run lint` | Check for linting issues |
| `pnpm run format` | Format code using Prettier |

---

## 🔄 Architectural Updates

### Server-Rendered Sidebar
- The Sidebar component is now a server component, optimized for instant icon rendering and no hydration delay.
- It accepts a `pathname` prop from client pages to determine the current section (Dashboard, Locations, Cabinets, Collections, Administration).
- This architectural change improves performance and user experience by rendering the Sidebar on the server.

### Dynamic Routing & Error Handling
- The application uses dynamic routing for various sections:
  - `/locations/[slug]` - Location details
  - `/cabinets/[slug]` - Cabinet details
  - `/collection-report/report/[reportId]` - Collection report details
- Each dynamic route includes a `not-found.tsx` file for error handling, ensuring a consistent user experience even when resources are not found.

### Client-Side Pages
- Main pages (e.g., `app/page.tsx`, `app/locations/page.tsx`, `app/cabinets/page.tsx`, `app/collection-report/page.tsx`, `app/administration/page.tsx`) are client components.
- They use `usePathname` to pass the current pathname to the Sidebar, ensuring accurate section highlighting.

### Error Handling
- Global 404 page (`app/not-found.tsx`) provides a fallback for unmatched routes.
- Section-specific 404 pages (e.g., `app/locations/not-found.tsx`, `app/cabinets/not-found.tsx`) offer tailored error messages and navigation options.

---

## 📝 Additional Notes
- Ensure all pages pass the `pathname` prop to the Sidebar for consistent navigation.
- Follow the established code style and TypeScript discipline for maintainability.
- Regularly run `pnpm build` and `pnpm lint` to catch and fix any issues.
