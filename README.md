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
| **Next.js 14** | React-based framework for performance & scalability |
| **TypeScript** | Type safety & better developer experience |
| **Tailwind CSS** | Utility-first styling for responsive UI |
| **Recharts** | Data visualization & charting |
| **Firebase / MongoDB** | NoSQL database for real-time data |
| **Zustand** | State management for complex app interactions |

---

## 📂 Folder Structure
```
├── app/                    # Main application logic
│   ├── layout.tsx         # Global layout (header, footer, etc.)
│   ├── page.tsx           # Dashboard page
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
