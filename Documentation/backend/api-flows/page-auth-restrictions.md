# Page and Tab Access Restrictions

This document details the role-based access control (RBAC) implemented across the Evolution One CMS. It outlines which user roles have access to specific pages and tabs within the application.

## 1. Overview of Roles

The system defines several user roles, each with varying levels of access:

| Role | Description | Access Level |
| :--- | :--- | :--- |
| **Developer** | Full system access, including maintenance and sensitive configs. | Highest |
| **Admin** | Full management access for a licensee. | High |
| **Manager** | High-level management access with some restrictions on technical/billing settings. | Medium-High |
| **Location Admin** | Management access restricted to assigned locations. | Medium |
| **Technician** | Access to machines and technical logs for troubleshooting. | Medium-Low |
| **Reviewer** | Read-only access for auditing financial data. | Low (Audit Only) |
| **Collector** | Access restricted to collection reports and basic machine status. | Low (Operations Only) |
| **Vault Manager** | Management of vault transactions and expenses. | Specialized |
| **Cashier** | Daily operations for payouts and shifts. | Specialized |

---

## 2. Page Level Access

Access to primary pages is controlled by the `hasPageAccess` utility. If a user lacks the required role, they are redirected or shown an "Access Restricted" message.

| Page | Required Roles / Permissions | Primary Components |
| :--- | :--- | :--- |
| **Dashboard** | `developer`, `admin`, `manager`, `location admin` | `DashboardContent` |
| **Locations** | `developer`, `admin`, `manager`, `location admin`, `reviewer` | `LocationsPageContent` |
| **Cabinets** | `developer`, `admin`, `manager`, `location admin`, `technician`, `reviewer`, `collector`, `vault-manager`, `cashier` | `CabinetsPageContent` |
| **Collection Report** | `developer`, `admin`, `manager`, `location admin`, `collector` | `CollectionReportContent` |
| **Reports** | `developer`, `admin`, `manager`, `location admin` | `ReportsPageContent` |
| **Sessions** | `developer`, `admin` | `SessionsPageContent` |
| **Members** | `developer`, `admin` | `MembersPageContent` |
| **Administration** | `developer`, `admin`, `manager`, `location admin` | `AdministrationPageContent` |
| **Vault Manager** | `developer`, `admin`, `vault-manager` | `VaultOverviewPageContent` |
| **Cash Desk** | `developer`, `admin`, `cashier` | `CashierShiftDashboard` |

---

## 3. Tab Level Access

Some pages contain internal tabs that are further restricted based on roles.

### 🎰 Cabinets Page
The Cabinets page organizes machine management into several specialized sections.

| Tab | Restricted Roles | Logic |
| :--- | :--- | :--- |
| **Cabinets** | None | Visible to all who can access the page. |
| **Movement Requests** | `reviewer`, `collector` | Hidden for auditors and ground operations collectors. |
| **SMIB Management** | `reviewer` | Hidden for auditors; technical management only. |
| **Firmware** | `reviewer` | Hidden for auditors; system updates only. |

> **Note**: For `reviewer` roles, the entire navigation menu is hidden, and they are defaulted to the "Cabinets" view with an additional **Reviewer Debug Panel** for raw data verification.

### 📊 Reports Page
Financial and operational reports are strictly segmented.

| Tab | Role Restrictions | Components |
| :--- | :--- | :--- |
| **Meters Report** | Visible to all authorized roles. | `ReportsMetersTab` |
| **Locations Report** | Restricted to `developer`, `admin`, `location admin`. | `ReportsLocationsTab` |
| **Machines Report** | Restricted to `developer` only. | `ReportsMachinesTab` |

### ⚙️ Administration Page
The administration panel manages users, licensees, and system-wide logs.

| Tab | Role Restrictions | Components |
| :--- | :--- | :--- |
| **Users** | `admin`, `manager`, `developer` | `UsersTab` |
| **Activity Logs** | `admin`, `developer` | `ActivityLogTab` |
| **Licencees** | Restricted to `developer`, `admin`. | `LicenceesTab` |
| **Countries** | Restricted to `developer`, `admin`. | `CountriesTab` |
| **Feedback** | Restricted to `developer`, `admin`. | `FeedbackTab` |

### 🏦 Vault Management Page
Management of vault operations, transactions, and cash desk oversight.

| Tab / Section | Role Restrictions | Logic / Component |
| :--- | :--- | :--- |
| **Global Overview** | `developer`, `admin` | Uses `fetchGlobalVaultOverviewData`. |
| **Location Overview** | `vault-manager` | Restricted to assigned location. |
| **Quick Actions** | `vault-manager` | (Add Cash, Remove Cash, Expense, Reconcile). |
| **Float Requests** | `vault-manager` | Review and approve/deny float requests. |
| **Shift Review** | `vault-manager` | Resolve/Reject cashier shifts. |

---

## 4. API Visibility & Sidebar

While a user might have URL access, the sidebar navigation uses `getCmsNavigationConfig` to group and hide items for a cleaner experience:

- **High-Priority CMS Roles** (`developer`, `admin`, `manager`, `location admin`) see grouped sections for **Cash Desk** and **Vault Manager**.
- **Specialized Roles** (`cashier`, `vault-manager`) see a flat structure containing only the tools relevant to their operational duties.
- **Collector Only** users have the **Locations** link hidden to prevent unnecessary navigation to high-level summaries.

---

## 5. Security Enforcement

Restrictions are enforced at two levels:

1.  **Frontend**: 
    - The `ProtectedRoute` component validates required pages.
    - `hasPageAccess` and `hasTabAccess` utilities prevent UI navigation.
    - Role detection in components (e.g., `isAdminOrDev`) toggles feature visibility.
2.  **Backend**: 
    - All API routes are wrapped with `withApiAuth`.
    - Verification of JWT and user roles (e.g., `hasVMAccess`, `isAdminOrDev`).
    - Licensee and Location filtering via `getUserLocationFilter` ensures data isolation.
