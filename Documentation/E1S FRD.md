# Dynamic1 Casino Management System – Functional Requirements Document

**Author:** Aaron Hazzard  
**Date:** 09/07/2025  
**Version:** 1.0

---

## 1. Introduction

This document outlines the core functional requirements for the Dynamic1 Casino Management System (CMS), a comprehensive platform designed to oversee casino operations, financial tracking, compliance monitoring, and real-time analytics. The system provides a seamless dashboard for real-time data visualization, revenue tracking, slot machine performance monitoring, and administrative management across all casino locations.

The system has been in active development from February to July 2025, with a target for full completion by the end of August 2025. The platform serves internal stakeholders, collections staff, licensees, and casino management personnel to enable efficient monitoring of financials, machine performance, customer data, and site operations.

---

## 2. System Overview

### 2.1 Core Architecture
- **Frontend:** Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes with MongoDB database
- **State Management:** Zustand for client-side state
- **Authentication:** JWT-based with secure HTTP-only cookies
- **Security:** OWASP standards compliance with role-based access control

### 2.2 Key Modules
- **Dashboard:** Real-time analytics and performance overview
- **Locations:** Casino location management and performance tracking
- **Cabinets:** Slot machine management with SMIB configuration
- **Collections:** Financial reporting and meter data synchronization
- **Administration:** User and licensee management with activity logging
- **Reports:** Comprehensive reporting system (under redesign)

---

## 3. Functional Requirements

### 3.1 Authentication & Security Module

#### 3.1.1 Login Page (`/login`)
**Functional Requirements:**
- Secure user authentication with email and password
- JWT token generation and secure cookie storage
- Input validation for email format and password strength
- Error handling for invalid credentials
- Loading states and user feedback
- Responsive design for desktop and mobile devices

**User Stories:**
- As a casino staff member, I want to securely log into the system using my credentials
- As a system administrator, I want to ensure only authorized users can access the platform
- As a user, I want clear feedback when login fails

#### 3.1.2 Role-Based Access Control
**Functional Requirements:**
- User roles: Admin, Manager, Collector, Viewer
- Resource-based permissions for different modules
- Location-specific access controls
- Session management with automatic logout
- Activity logging for all user actions

### 3.2 Dashboard Module (`/`)

#### 3.2.1 Real-Time Analytics Dashboard
**Functional Requirements:**
- Display real-time financial metrics (money in/out, gross revenue)
- Show machine status (total, online, offline machines)
- Interactive charts for time-series data visualization
- Top-performing locations and machines
- Licensee selection dropdown for multi-tenant support
- Date filtering (Today, Yesterday, Last 7 days, 30 days, Custom)
- Responsive layouts for desktop and mobile

**User Stories:**
- As a casino manager, I want to see real-time performance metrics across all locations
- As a licensee, I want to filter data by my specific locations
- As a collector, I want to quickly identify which machines need attention

#### 3.2.2 Data Visualization
**Functional Requirements:**
- Line charts for revenue trends over time
- Pie charts for location and machine distribution
- Performance indicators with color-coded status
- Export capabilities for dashboard data
- Real-time data updates without page refresh

### 3.3 Locations Management Module (`/locations`)

#### 3.3.1 Location Overview
**Functional Requirements:**
- Display all casino locations with performance metrics
- Search and filter locations by name, licensee, or performance
- Sort by various performance indicators
- Pagination for large location lists
- Add, edit, and delete location functionality
- Geographic coordinates and address management

**User Stories:**
- As a casino manager, I want to view all locations and their performance at a glance
- As an administrator, I want to add new casino locations to the system
- As a collector, I want to see which locations have the highest revenue

#### 3.3.2 Location Details (`/locations/[slug]`)
**Functional Requirements:**
- Detailed view of cabinets assigned to specific location
- Real-time status of machines (online/offline)
- Search and filter cabinets by status
- Cabinet details modal with configuration information
- Location switching without page reload

#### 3.3.3 Location Performance (`/locations/[slug]/details`)
**Functional Requirements:**
- Comprehensive location metrics and analytics
- Time period filtering for historical data
- Cabinet breakdown with performance indicators
- Financial summaries (money in/out, gross, net)
- Export location data to PDF/CSV

### 3.4 Cabinets Management Module (`/cabinets`)

#### 3.4.1 Cabinet Overview
**Functional Requirements:**
- Display all slot machines (cabinets) across all locations
- Search, sort, and filter cabinets by various criteria
- Real-time status indicators (online/offline)
- Pagination for large cabinet lists
- Add, edit, and delete cabinet functionality
- Location filtering and switching

**User Stories:**
- As a technician, I want to see all machines and their current status
- As a manager, I want to add new machines to specific locations
- As a collector, I want to identify machines that need collection

#### 3.4.2 Cabinet Details (`/cabinets/[slug]`)
**Functional Requirements:**
- Detailed cabinet information and configuration
- SMIB (Slot Machine Interface Board) settings management
- Firmware version control and updates
- Network settings and MQTT topic configuration
- Metrics filtering by time period
- Multiple tabs: Metrics, Live Metrics, Bill Validator, Activity Log, Collection History

#### 3.4.3 SMIB Management
**Functional Requirements:**
- Configure communication modes and protocols
- Manage firmware versions and rollback capabilities
- MQTT topic configuration for real-time communication
- Network settings and connectivity monitoring
- Advanced settings for machine-specific configurations

#### 3.4.4 Movement Requests
**Functional Requirements:**
- Create and manage cabinet movement requests
- Track cabinet transfers between locations
- Approve, reject, or cancel movement requests
- View movement history and status
- Email notifications for movement updates

### 3.5 Collections Module (`/collection-report`)

#### 3.5.1 Collection Reports
**Functional Requirements:**
- View, filter, and search collection data by location, date, and status
- Monthly summaries and detailed reports
- Manager and collector scheduling
- Data export and synchronization
- Pagination for both mobile and desktop layouts

**User Stories:**
- As a collector, I want to see my assigned collections for the day
- As a manager, I want to review collection reports and variances
- As an administrator, I want to sync meter data for accurate reporting

#### 3.5.2 Collection Report Details (`/collection-report/report/[reportId]`)
**Functional Requirements:**
- Detailed view of individual collection reports
- Machine metrics and accounting details
- Location metrics and financial summaries
- SAS metrics comparison
- Export capabilities for detailed reports

#### 3.5.3 Meter Data Synchronization
**Functional Requirements:**
- Sync meter data from slot machines
- Recalculate SAS metrics based on meter readings
- Handle variances between expected and actual counts
- Update collection reports with real-time data
- Error handling for sync failures

### 3.6 Administration Module (`/administration`)

#### 3.6.1 User Management
**Functional Requirements:**
- Add, edit, and delete users
- Assign roles and permissions
- View and edit user details
- Activity logs for user actions
- Search and filter users by various criteria
- Pagination for user lists

**User Stories:**
- As an administrator, I want to create new user accounts with appropriate permissions
- As a manager, I want to view user activity logs for security monitoring
- As a user, I want to update my profile information

#### 3.6.2 Licensee Management
**Functional Requirements:**
- Add, edit, and delete licensees
- Manage licensee payment status and expiry
- View payment history and activity logs
- License key generation and management
- Country and geographic information
- Payment status confirmation and updates

#### 3.6.3 Activity Logging
**Functional Requirements:**
- Track all significant user actions
- Filter logs by entity type, action type, and date range
- Export activity logs for auditing
- Real-time log updates
- IP address tracking for security

### 3.7 Reports Module (Under Redesign)

#### 3.7.1 Daily Counts and Voucher Reports
**Functional Requirements:**
- Summarize daily meter readings and physical cash counts
- Include voucher issuance and redemptions
- Track variances between expected vs actual counts
- Filter by date range, location, and other parameters
- Export to PDF and CSV formats

#### 3.7.2 Active Customer Count
**Functional Requirements:**
- Display current registered and active customers
- Filters for date range and location
- Trends over time (weekly/monthly)
- Customer activity patterns
- Export customer data

#### 3.7.3 Location Statistics Summary
**Functional Requirements:**
- Performance metrics per location
- Machine count and online/offline breakdown
- Total daily intake and payouts
- Net revenue and uptime statistics
- Comparative analysis across locations

#### 3.7.4 Machine Performance Reports
**Functional Requirements:**
- Performance metrics for each machine
- Money in/out tracking
- Play count and average play duration
- Total income generated
- Comparisons across locations and machine types

#### 3.7.5 Financial Performance Reports
**Functional Requirements:**
- Revenue and net performance by machine ID and game type
- Payout ratio and hold percentage calculations
- Earnings per game analysis
- Financial trend analysis
- Export financial data

---

## 4. Technical Requirements

### 4.1 Performance Requirements
- Page load times under 3 seconds
- Real-time data updates within 30 seconds
- Support for 100+ concurrent users
- Responsive design for all device types
- Offline capability for critical functions

### 4.2 Security Requirements
- JWT-based authentication with secure cookies
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Activity logging for audit trails

### 4.3 Data Requirements
- MongoDB database with proper indexing
- Data backup and recovery procedures
- Data encryption at rest and in transit
- GDPR compliance for user data
- Data retention policies

### 4.4 Integration Requirements
- SMIB protocol integration for slot machines
- MQTT messaging for real-time updates
- Email notifications for critical events
- Export functionality (PDF, CSV, Excel)
- API endpoints for third-party integrations

---

## 5. User Interface Requirements

### 5.1 Design Standards
- Modern, responsive design using Tailwind CSS
- Consistent color scheme and typography
- Accessible design (WCAG 2.1 compliance)
- Mobile-first approach
- Intuitive navigation and user experience

### 5.2 Component Requirements
- Reusable UI components using Shadcn/UI
- Loading states and skeleton screens
- Error handling with user-friendly messages
- Modal dialogs for detailed views
- Form validation with real-time feedback

### 5.3 Navigation Requirements
- Persistent sidebar navigation
- Breadcrumb navigation for deep pages
- Search functionality across modules
- Quick access to frequently used features
- Responsive navigation for mobile devices

---

## 6. Data Management Requirements

### 6.1 Data Models
- User management and authentication
- Location and cabinet management
- Collection and meter data
- Activity logging and audit trails
- Licensee and payment management

### 6.2 Data Validation
- Client-side validation for immediate feedback
- Server-side validation for security
- Data type checking and format validation
- Business rule validation
- Error handling and user notification

### 6.3 Data Export/Import
- PDF export for reports and documents
- CSV export for data analysis
- Excel export for financial data
- Import capabilities for bulk data
- Data format validation for imports

---

## 7. Testing Requirements

### 7.1 Functional Testing
- Unit tests for all business logic
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Cross-browser compatibility testing
- Mobile device testing

### 7.2 Performance Testing
- Load testing for concurrent users
- Stress testing for system limits
- Database performance testing
- Network latency testing
- Memory and CPU usage monitoring

### 7.3 Security Testing
- Authentication and authorization testing
- Input validation testing
- SQL injection testing
- XSS vulnerability testing
- Penetration testing

---

## 8. Deployment Requirements

### 8.1 Environment Setup
- Development environment configuration
- Staging environment for testing
- Production environment setup
- Docker containerization
- CI/CD pipeline configuration

### 8.2 Monitoring and Logging
- Application performance monitoring
- Error tracking and alerting
- User activity monitoring
- System health monitoring
- Log aggregation and analysis

### 8.3 Backup and Recovery
- Automated database backups
- Disaster recovery procedures
- Data retention policies
- System restore procedures
- Business continuity planning

---

## 9. Documentation Requirements

### 9.1 User Documentation
- User manuals for each module
- Video tutorials for complex features
- FAQ and troubleshooting guides
- Best practices documentation
- Training materials for new users

### 9.2 Technical Documentation
- API documentation
- Database schema documentation
- Deployment guides
- Configuration documentation
- Code documentation and comments

---

## 10. Future Enhancements

### 10.1 Planned Features
- Advanced analytics and machine learning
- Mobile application development
- Third-party integrations
- Advanced reporting capabilities
- Real-time notifications

### 10.2 Scalability Considerations
- Microservices architecture
- Cloud deployment options
- Horizontal scaling capabilities
- Performance optimization
- Database sharding strategies

---

## 11. Conclusion

The Dynamic1 Casino Management System provides a comprehensive solution for casino operations management, financial tracking, and compliance monitoring. The system is designed to be scalable, secure, and user-friendly while meeting the specific needs of casino operators, collectors, and administrators.

The modular architecture allows for easy extension and maintenance, while the modern technology stack ensures optimal performance and reliability. The system's focus on real-time data, comprehensive reporting, and user experience makes it an essential tool for modern casino management.

**Next Steps:**
- Stakeholder review and feedback collection
- Prioritization of features for MVP delivery
- Development timeline finalization
- User acceptance testing planning
- Training and deployment preparation 