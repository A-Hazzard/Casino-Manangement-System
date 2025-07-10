# Reports Module Meeting Summary

**Date:** [Meeting Date]  
**Attendees:** [List of attendees]  
**Project:** Dynamic1 Casino Management System  
**Module:** Reports & Analytics

---

## 📋 Meeting Overview

This meeting focused on defining and refining the Reports Module functionality for the Dynamic1 Casino Management System. The discussion covered key concepts, report specifications, and new feature requirements for comprehensive casino analytics and compliance reporting.

---

## 🔑 Key Concepts & Definitions

### **Hold (Theoretical Hold Percentage)**
- **Definition:** The theoretical percentage of wagers a machine is expected to keep as profit over time
- **Purpose:** Used for performance analysis and comparison against actual results
- **Application:** Critical for the Comparison Report functionality
- **Note:** Not all machine types can provide theoretical hold values due to system constraints
- **Technical Implementation:** Requires integration with machine configuration data and historical performance metrics

### **Gaming Day**
- **Definition:** The defined operating hours for a specific casino location (start and end time)
- **Purpose:** Ensures accurate daily reporting by establishing consistent time boundaries
- **Implementation:** Must be configurable per location to accommodate different operating schedules
- **Impact:** Affects all time-based reporting and analytics calculations
- **Technical Requirements:** Database schema updates for location-specific gaming day configuration

### **Machine Types**
- **Requirement:** Machines must be categorized during creation (e.g., roulette, slot machine, video poker)
- **Purpose:** Enables filtering and grouping in reports
- **Categories:** Should include all major gaming machine types supported by the system
- **Impact:** Determines which reports and analytics are available for each machine
- **Technical Implementation:** Enum-based categorization with extensible type system

### **UI Color Coding for Net Win/Revenue Fields**
- **Proposed Color Scheme:**
  - **Gross Revenue:** Green (💰)
  - **Drop:** Yellow (⚠️)
  - **Total Cancelled Credits:** Black (⚫)
- **Purpose:** Provides immediate visual distinction between different revenue metrics
- **Implementation:** Should be consistent across all reports and dashboards
- **Technical Requirements:** CSS custom properties for consistent theming across components

---

## 📊 Report & Feature Breakdown

### **1. Events Browser**
- **Primary Purpose:** Troubleshooting and maintaining compliance with Gaming Laboratories International (GLI) standards
- **Key Features:**
  - Real-time event monitoring
  - Detailed audit trail
  - GLI compliance verification
  - **"Hide No Activity" filter** to simplify the view and focus on relevant events
- **Target Users:** Compliance officers, system administrators, technical support
- **Data Sources:** Machine events, system logs, user actions
- **Technical Architecture:**
  - Real-time WebSocket integration for live event streaming
  - Advanced filtering and search capabilities
  - Export functionality for compliance documentation
  - Role-based access control for sensitive event data

### **2. Meters Export Report**
- **Purpose:** Export raw, detailed machine data for analysis and external processing
- **Data Points:**
  - Coin In
  - Coin Out
  - Jackpot amounts
  - Games Played
  - Additional meter readings
- **Scope:** Specific location over a chosen time period
- **Format:** Exportable to various formats (CSV, Excel, PDF)
- **Use Cases:** External analysis, regulatory reporting, backup verification
- **Technical Implementation:**
  - Server-side data aggregation and processing
  - Multiple export format support (CSV, Excel, PDF)
  - Background job processing for large datasets
  - Secure file generation and download

### **3. Comparison Report**
- **Purpose:** Compare theoretical earnings against actual real-world performance
- **Key Metrics:**
  - Theoretical hold vs. actual hold
  - Expected vs. actual revenue
  - Performance variance analysis
- **System Constraint:** Not all machine types can provide theoretical hold values
- **Visualization:** Charts and graphs showing variance over time
- **Alerts:** Flag machines with significant performance deviations
- **Technical Requirements:**
  - Advanced charting library integration (Recharts or similar)
  - Statistical analysis algorithms for variance calculation
  - Real-time data processing for live comparisons
  - Alert system integration for performance monitoring

### **4. Location Evaluation Report**
- **Primary Focus:** SAS (Slot Accounting System) machines
- **Key Advantage:** Immediate access to soft meter data
- **Metrics Tracked:**
  - Real-time performance indicators
  - Soft meter readings
  - SAS-specific analytics
- **Update Frequency:** Real-time or near real-time data
- **Use Cases:** SAS machine optimization, performance monitoring
- **Technical Architecture:**
  - SAS protocol integration for real-time data access
  - Soft meter data processing and aggregation
  - Performance optimization for real-time analytics
  - Caching strategies for frequently accessed data

### **5. Location Revenue Report**
- **Focus:** Non-SAS machines at a location
- **Key Metrics:**
  - Drop (money inserted)
  - Cancelled credits
  - Gross revenue
  - Net win calculations
- **Features:**
  - **Graphs for visual analysis** showing trends over time
  - **Top-performing machines** identification
  - Comparative analysis between machines
- **Reporting Period:** Configurable time ranges
- **Export Options:** PDF, Excel, CSV formats
- **Technical Implementation:**
  - Time-series data processing and visualization
  - Performance ranking algorithms
  - Multi-format export capabilities
  - Responsive chart design for mobile devices

### **6. Machines Offline Report**
- **Purpose:** Monitor and manage offline machines
- **Key Features:**
  - Real-time status monitoring
  - Offline machine identification
  - **Authorized user editing capabilities** for machine values
  - Historical offline tracking
- **Alerts:** Notifications when machines go offline
- **Management:** Ability to update machine configurations for offline machines
- **Compliance:** Audit trail for all changes made to offline machines
- **Technical Requirements:**
  - Real-time machine status monitoring system
  - Role-based permissions for machine editing
  - Comprehensive audit trail implementation
  - Alert system integration (email, SMS, in-app notifications)

---

## 🚀 New Feature Requests

### **Automated Reporting System**
- **Requester:** Aaron
- **Status:** Under investigation
- **Functionality:**
  - Schedule reports for automatic generation
  - Email distribution to predefined recipient lists
  - Customizable timing (daily, weekly, monthly)
  - Report format selection
- **Benefits:**
  - Reduced manual effort
  - Consistent reporting schedule
  - Improved stakeholder communication
  - Compliance automation
- **Technical Considerations:**
  - Email server integration (SMTP/SendGrid)
  - Report generation scheduling (Cron jobs/Background workers)
  - User permission management
  - Storage and archiving of automated reports
  - Database schema for report scheduling and distribution

---

## 🔧 Technical Implementation Considerations

### **Data Architecture**
- **Database Schema:** Extensions required for new report types
- **Data Aggregation:** Server-side processing for performance optimization
- **Caching Strategy:** Redis/Memcached for frequently accessed data
- **Data Retention:** Policies for historical data storage and archival

### **API Integration**
- **RESTful Endpoints:** New API routes for report generation
- **Real-time Updates:** WebSocket integration for live data
- **Export APIs:** File generation and download endpoints
- **Authentication:** Role-based access control for sensitive reports

### **Frontend Architecture**
- **Component Library:** Reusable report components
- **State Management:** Zustand stores for report state
- **Charting Library:** Advanced visualization capabilities
- **Responsive Design:** Mobile-optimized report interfaces

### **Performance Optimization**
- **Data Pagination:** Efficient handling of large datasets
- **Lazy Loading:** On-demand report generation
- **Background Processing:** Asynchronous report generation
- **Caching:** Client and server-side caching strategies

### **Security & Compliance**
- **Data Encryption:** Sensitive data protection
- **Audit Logging:** Comprehensive activity tracking
- **Access Control:** Role-based permissions
- **GLI Compliance:** Regulatory requirement adherence

---

## 📝 Action Items

### **Immediate Actions**
- [ ] Aaron to investigate automated reporting system feasibility
- [ ] Define complete list of machine types for categorization
- [ ] Establish UI color coding standards across the system
- [ ] Create detailed specifications for each report type
- [ ] Design database schema extensions for new report types
- [ ] Plan API architecture for report generation endpoints

### **Follow-up Items**
- [ ] Review GLI compliance requirements for Events Browser
- [ ] Define export formats and data structures for Meters Export Report
- [ ] Establish performance benchmarks for Comparison Report
- [ ] Create user permission matrix for Machines Offline Report editing
- [ ] Design caching strategy for report performance optimization
- [ ] Plan WebSocket integration for real-time data updates

---

## 🎯 Next Steps

1. **Technical Review:** Assess implementation complexity for each report
2. **User Interface Design:** Create mockups for report layouts and interactions
3. **Data Architecture:** Ensure all required data points are available and accessible
4. **Testing Strategy:** Define testing requirements for each report functionality
5. **Documentation:** Create user guides and technical documentation
6. **Performance Planning:** Design scalable architecture for large datasets
7. **Security Review:** Implement comprehensive security measures
8. **Compliance Validation:** Ensure regulatory requirement adherence

---

## 📞 Questions for Follow-up

- What are the specific GLI compliance requirements for the Events Browser?
- Which machine types cannot provide theoretical hold values?
- What is the maximum number of recipients for automated report emails?
- Are there any regulatory requirements for report retention and archiving?
- What are the performance requirements for real-time data processing?
- How should we handle data privacy and encryption for sensitive reports?
- What are the backup and disaster recovery requirements for report data?

---

## 🔗 Integration Points

### **Existing System Integration**
- **Dashboard Module:** Integration with existing metrics and analytics
- **Cabinet Management:** Machine data and configuration integration
- **Location Management:** Location-specific reporting capabilities
- **User Management:** Role-based access control integration
- **Collection Reports:** Enhanced reporting capabilities

### **External System Integration**
- **Email Services:** Automated report distribution
- **File Storage:** Report archiving and retrieval
- **Analytics Tools:** External data analysis integration
- **Compliance Systems:** Regulatory reporting integration

---

*This document will be updated as requirements are refined and new information becomes available.* 