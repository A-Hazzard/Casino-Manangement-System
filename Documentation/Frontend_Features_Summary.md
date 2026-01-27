# Evolution One CMS - Frontend Feature Summary

**Author:** Aaron Hazzard
**Date:** January 2026
**Position:** Senior Full-Stack Software Engineer

---

This document provides a high-level overview of the key pages and features available in the Evolution One CMS frontend.

## Pages and Features

### 1. Login Page (`https://gy.sas.backoffice.ltd/login`)

- **Purpose:** Securely access the system.
- **Features:**
  - Login using email or username.
  - "Remember Me" option to save username.
  - Password visibility toggle.
  - Automatic prompts to update weak passwords or incomplete profiles after login.

### 2. Dashboard (`https://gy.sas.backoffice.ltd/`)

- **Purpose:** Get a quick, high-level overview of the entire casino operation's performance.
- **Features:**
  - **Financial Snapshot:** Shows key numbers like total money in, money out, and gross revenue.
  - **Performance Chart:** A visual graph showing financial trends over different time periods (Today, Yesterday, Week, etc.).
  - **Location Map:** An interactive map displaying all casino locations, color-coded by performance.
  - **Top Performers:** Lists of the best-performing locations and individual machines.
  - **Date Filters:** Allows managers to view data for specific date ranges.

### 3. Administration (`https://gy.sas.backoffice.ltd/administration`)

- **Purpose:** Manage system users, permissions, and view system-wide activity.
- **Navigation Tabs:**
  - **Users:**
    - **Features:**
      - View a list of all system users.
      - Create, edit, and delete user accounts.
      - Assign roles (like Manager, Collector) to users.
      - Assign users to specific casino locations or licensees.
      - Search and filter users by name, role, or status.
  - **Licensees:**
    - **Features:**
      - Manage the different business entities (licensees) operating within the system.
      - View and manage payment status and license details.
  - **Activity Logs:**
    - **Features:**
      - See a detailed log of all significant actions taken by users in the system for auditing purposes.
  - **Feedback:**
    - **Features:**
      - Review and manage feedback, bug reports, and suggestions submitted by users.

### 4. Locations (`https://gy.sas.backoffice.ltd/locations`)

- **Purpose:** Manage and monitor all casino gaming locations.
- **Features:**
  - **Location List:** View all locations with key financial metrics like money in, money out, and gross revenue.
  - **Status Overview:** Quickly see how many machines are online or offline at each location.
  - **Location Management:** Create, edit, or delete location information.
  - **Search & Filter:** Find specific locations or filter by status (e.g., show only locations with special hardware).
  - **Detailed View:** Click on a location to see its detailed performance page, including a breakdown of its individual machines and members.

#### 4.1. Location Detail Page (`https://gy.sas.backoffice.ltd/locations/[slug]`)

- **Purpose:** View detailed information about a specific gaming location.
- **Navigation Tabs:**
  - **Machines:**
    - **Features:**
      - View all machines at the location with financial performance metrics.
      - See machine status (online/offline) and last activity.
      - Search and filter machines by name, status, or game type.
      - Create, edit, or delete machines at this location.
  - **Members:**
    - **Features:**
      - View all members who have played at this location.
      - See member statistics and session history.
      - Access member summary reports for this location.

### 5. Cabinets / Machines (`https://gy.sas.backoffice.ltd/cabinets`)

- **Purpose:** A central hub for managing all gaming machines (cabinets), their hardware, firmware, and movements.
- **Navigation Tabs:**
  - **Cabinets:**
    - **Features:**
      - View a comprehensive list of all machines.
      - See financial performance for each machine (money in, gross revenue).
      - Search and filter machines by location, game type, or status (online/offline).
      - Add new machines, edit existing ones, or remove them from the system.
      - Click on a machine to view its detailed configuration and history.
  - **SMIB (Hardware Management):**
    - **Features:**
      - Configure the networking and communication settings for the hardware inside the machines.
      - Remotely restart machines or request data.
  - **Movement Requests:**
    - **Features:**
      - Create and track requests to move a machine from one place to another.
  - **Firmware:**
    - **Features:**
      - Manage and deploy software (firmware) updates to the machines.

#### 5.1. Cabinet Detail Page (`https://gy.sas.backoffice.ltd/cabinets/[slug]`)

- **Purpose:** View and manage detailed information about a specific cabinet/machine.
- **Features:**
  - **Summary Section:**
    - View machine identification (serial number, machine ID, relay ID).
    - See current status (online/offline) and location information.
    - View financial metrics and performance data.
    - Quick actions: Edit, Delete, Refresh, Navigate to location.
  - **SMIB Management:**
    - Configure SMIB (Slot Machine Interface Board) network settings.
    - Manage MQTT connection and configuration.
    - Send machine control commands (restart, request data, etc.).
    - View real-time connection status.
  - **Financial Charts:**
    - View revenue trends and financial performance over time.
    - Adjust chart granularity (hourly, daily, weekly, monthly).
    - Filter by date ranges.
  - **Accounting Section:**
    - View detailed accounting information and transaction history.
    - See meter readings and financial movements.

### 6. Members (`https://gy.sas.backoffice.ltd/members`)

- **Purpose:** Manage the casino's player membership program (also referred to as CRM - Customer Relationship Management).
- **Navigation Tabs:**
  - **Members List:**
    - **Features:**
      - View a list of all registered members.
      - See key statistics for each member, including their total win/loss, last session, and location.
      - Create, edit, or delete member profiles.
      - Search for members by name or ID.
      - Click a member to see their detailed profile and session history.
  - **Summary Report:**
    - **Features:**
      - View summary reports and analytics about the member base.
      - See total number of members and how many are active.
      - Export member data to a CSV file for external analysis.

#### 6.1. Member Detail Page (`https://gy.sas.backoffice.ltd/members/[id]`)

- **Purpose:** View detailed information about a specific member.
- **Features:**
  - **Member Profile Header:**
    - View member identification information (name, ID, contact details).
    - See member statistics (total win/loss, games played, average bet).
    - View member location and registration information.
    - Navigation back to members list.
  - **Financial Totals Card:**
    - Toggle to view/hide aggregated financial totals.
    - See total money in, money out, net win/loss, and other key metrics.
  - **Session History:**
    - View all gaming sessions for this member with pagination (20 sessions per page).
    - See session details including machine, start time, duration, and financial results.
    - Filter sessions by time period (session, day, week, month).
    - Sort by various criteria (time, session length, money in/out, jackpot, games played, etc.).
    - Export session data to PDF or Excel format.

### 7. Sessions (`https://gy.sas.backoffice.ltd/sessions`)

- **Purpose:** Monitor all individual gaming sessions played by members.
- **Features:**
  - **Session Log:** View a detailed log of every game session, including player, machine, start time, and duration.
  - **Performance Metrics:** See financial details for each session, like amount wagered (handle) and winnings.
  - **Search & Filter:** Find sessions by player, machine, or date.
  - **Event Viewer:** Click to see a detailed, moment-by-moment log of events within a single session.

#### 7.1. Session Events Page (`https://gy.sas.backoffice.ltd/sessions/[sessionId]/[machineId]/events`)

- **Purpose:** View detailed event-by-event information for a specific gaming session.
- **Features:**
  - **Event Timeline:** See a chronological list of all events that occurred during the session.
  - **Event Details:** View detailed information for each event including timestamps, event types, and data.
  - **Session Context:** View session metadata (member, machine, start/end times, duration).
  - **Navigation:** Easy navigation back to the sessions list or member profile.

### 8. Collection Report (`https://gy.sas.backoffice.ltd/collection-report`)

- **Purpose:** Manage the process of collecting money from machines.
- **Navigation Tabs:**
  - **Collection Reports:**
    - **Features:**
      - View a list of all collection reports.
      - Create new reports when money is collected from machines.
      - Record meter readings and calculate the amount of money collected.
      - Edit or delete reports to correct errors.
      - Click a report to see a detailed breakdown by machine.
  - **Monthly Report:**
    - **Features:**
      - View monthly summary reports of all collections.
  - **Manager Schedule:**
    - **Features:**
      - Manage schedules for collection managers.
      - Oversee and coordinate collection operations.
  - **Collectors Schedule:**
    - **Features:**
      - Manage schedules for collection staff (collectors).
      - Assign collectors to specific locations and routes.

#### 8.1. Collection Report Detail Page (`https://gy.sas.backoffice.ltd/collection-report/report/[reportId]`)

- **Purpose:** View detailed information about a specific collection report.
- **Features:**
  - **Report Header:**
    - View location name and report ID.
    - See collection report machine total gross amount.
    - Navigation back to collection reports list.
    - Refresh functionality to reload report data.
  - **Issue Detection (Developer Only):**
    - Automatic detection of SAS time issues and collection history problems.
    - Warning banners displaying detected issues grouped by machine.
    - "Fix Report" functionality to automatically resolve detected issues.
- **Navigation Tabs:**
  - **Machine Metrics:**
    - **Features:**
      - View individual machine collection data within the report.
      - See meter readings, drop amounts, and collection calculations for each machine.
      - Search and filter machines by name or location.
      - Sort by various metrics (drop, gross, net, etc.).
      - Pagination for large machine lists.
  - **Location Metrics:**
    - **Features:**
      - View location-level aggregated metrics.
      - See totals and summaries for each location in the report.
      - Compare location performance.
  - **SAS Metrics Compare:**
    - **Features:**
      - Compare SAS (Slot Accounting System) times and metrics.
      - Identify discrepancies between electronic and physical meter readings.
      - View detailed SAS time issues grouped by machine.
      - View collection history issues and problematic machines.
      - Click on issues to view detailed information and fix options.

### 9. Reports (`https://gy.sas.backoffice.ltd/reports`)

- **Purpose:** Provides in-depth analytics and performance evaluation tools.
- **Navigation Tabs:**
  - **Meters:**
    - **Features:**
      - Analyze raw meter data from machines.
      - View hourly trends for money in/out and games played.
      - Identify top-performing machines based on meter readings.
  - **Locations:**
    - **Features:**
      - **Overview:** See a summary of location performance with an interactive map.
      - **SAS Evaluation:** Compare the electronic (SAS) data against the physical meter data to find discrepancies.
      - **Revenue Analysis:** Analyze revenue trends for specific locations.
  - **Machines:**
    - **Features:**
      - **Overview:** View a master list of all machines with their financial performance.
      - **Evaluation:** Analyze and compare the performance of machines grouped by manufacturer or game title to identify which games are most profitable.
      - **Offline:** Get a list of all offline machines to prioritize maintenance.