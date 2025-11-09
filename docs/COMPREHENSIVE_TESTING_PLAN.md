# 🧪 Comprehensive Testing Plan
## Licensee, Location & Role-Based Access Control

---

## 📋 **Test Accounts**

### **Account 1: Admin (aaronhazzard2018@gmail.com)**
- **Password**: `Decrypted12!`
- **Roles**: Admin, Developer
- **Licensees**: All (Admin/Developer see everything)
- **Locations**: All
- **Expected Access**: Full access to all pages and data

### **Account 2: Manager (mkirton@dynamic1group.com)**
- **Password**: (TBD - check with user)
- **Roles**: Manager, Collector
- **Licensees**: Cabana, TTG (or as configured)
- **Locations**: DevLabTuna (or as configured)
- **Expected Access**: 
  - Can see all locations for assigned licensees
  - Dashboard access (manager privilege)
  - Cannot access Sessions/Members/Reports pages

---

## 🎯 **Testing Scenarios Matrix**

### **1. USER ROLES & PAGE ACCESS**

| Test # | Role | Page | Expected Result |
|--------|------|------|-----------------|
| 1.1 | Developer | Dashboard | ✅ Access granted |
| 1.2 | Admin | Dashboard | ✅ Access granted |
| 1.3 | Manager | Dashboard | ✅ Access granted |
| 1.4 | Location Admin | Dashboard | ❌ Access denied / No Data |
| 1.5 | Collector | Dashboard | ❌ Access denied / No Data |
| 1.6 | Developer | Sessions | ✅ Access granted |
| 1.7 | Admin | Sessions | ❌ Access denied |
| 1.8 | Manager | Sessions | ❌ Access denied |
| 1.9 | Developer | Members | ✅ Access granted |
| 1.10 | Admin | Members | ❌ Access denied |
| 1.11 | Developer | Reports | ✅ Access granted |
| 1.12 | Admin | Reports | ❌ Access denied |
| 1.13 | All Roles | Locations | ✅ Access granted (filtered by permissions) |
| 1.14 | All Roles | Cabinets | ✅ Access granted (filtered by permissions) |
| 1.15 | All Roles | Collection Reports | ✅ Access granted (filtered by permissions) |
| 1.16 | Admin/Developer | Administration | ✅ Access granted |
| 1.17 | Manager/Location Admin/Collector | Administration | ❌ Access denied |

---

### **2. DASHBOARD DATA ACCURACY**

| Test # | Scenario | Steps | Expected Result |
|--------|----------|-------|-----------------|
| 2.1 | Admin - All Licensees | 1. Login as admin<br>2. Select "All Licensees"<br>3. Compare Dashboard totals with Locations page totals | Money In/Out/Gross should match exactly |
| 2.2 | Admin - Single Licensee | 1. Select specific licensee (e.g., TTG)<br>2. Compare Dashboard with Locations page for that licensee | Data should match for selected licensee only |
| 2.3 | Manager - Assigned Licensees | 1. Login as manager<br>2. Dashboard should show data for assigned licensees only | Data filtered by licensee assignment |
| 2.4 | Collector - No Locations | 1. Remove all locations from collector<br>2. Check Dashboard | Should show $0.00 / $0.00 / $0.00 |
| 2.5 | Time Period Accuracy | 1. Test Today, Yesterday, Last 7 Days, Last 30 Days<br>2. Compare with Locations page for same period | Data should match for all time periods |
| 2.6 | Chart Data Accuracy | 1. Verify chart shows correct dates<br>2. Verify Money In/Out/Gross lines match table data | Chart should reflect actual data trends |

---

### **3. LOCATIONS PAGE**

| Test # | Scenario | Steps | Expected Result |
|--------|----------|-------|-----------------|
| 3.1 | Admin - All Locations | 1. Login as admin<br>2. Check Locations page | Should see all locations across all licensees |
| 3.2 | Manager - Licensee Locations | 1. Login as manager (Cabana)<br>2. Check Locations page | Should see all Cabana locations (no location assignment needed for managers) |
| 3.3 | Collector - Assigned Locations Only | 1. Login as collector with 1 location assigned<br>2. Check Locations page | Should see only assigned location (e.g., DevLabTuna) |
| 3.4 | Collector - No Locations | 1. Remove all locations from collector<br>2. Check Locations page | Should show "No locations found" message |
| 3.5 | Licensee Filter | 1. Select specific licensee from dropdown<br>2. Verify locations filtered | Should show only locations for selected licensee |
| 3.6 | Location Data Accuracy | 1. Compare Money In/Out/Gross for each location<br>2. Sum should match Dashboard total | Individual location data should be accurate |

---

### **4. LOCATION DETAILS PAGE**

| Test # | Scenario | Steps | Expected Result |
|--------|----------|-------|-----------------|
| 4.1 | Admin - Any Location | 1. Click any location card/row<br>2. Verify details page loads | Should show full location details + cabinets |
| 4.2 | Manager - Licensee Location | 1. Click location within assigned licensee<br>2. Verify details page loads | Should show location details |
| 4.3 | Manager - Other Licensee Location | 1. Try to access location from different licensee<br>2. Should be blocked | Should show "Access Denied" or redirect |
| 4.4 | Collector - Assigned Location | 1. Click assigned location<br>2. Verify details page loads | Should show location details |
| 4.5 | Collector - Unassigned Location | 1. Try to access unassigned location (direct URL)<br>2. Should be blocked | Should show "Access Denied" or redirect |
| 4.6 | Location Cabinets List | 1. Verify cabinets shown belong to this location<br>2. Check cabinet data accuracy | Should only show location's cabinets |

---

### **5. CABINETS PAGE**

| Test # | Scenario | Steps | Expected Result |
|--------|----------|-------|-----------------|
| 5.1 | Admin - All Cabinets | 1. Login as admin<br>2. Check Cabinets page | Should see all cabinets across all licensees |
| 5.2 | Manager - Licensee Cabinets | 1. Login as manager (Cabana)<br>2. Check Cabinets page | Should see all Cabana cabinets from all Cabana locations |
| 5.3 | Collector - Assigned Location Cabinets | 1. Login as collector (DevLabTuna only)<br>2. Check Cabinets page | Should see only DevLabTuna cabinets |
| 5.4 | Collector - No Locations | 1. Remove all locations from collector<br>2. Check Cabinets page | Should show "No machines found in your allowed locations for [licensees]" |
| 5.5 | Licensee Filter | 1. Select specific licensee<br>2. Verify cabinets filtered | Should show only cabinets for selected licensee + user's allowed locations |
| 5.6 | Cross-Licensee Check | 1. Login as user with Barbados licensee<br>2. Ensure NO TTG cabinets show | Should NOT see machines from other licensees |
| 5.7 | Time Period Filter | 1. Change time period (Today/Last 7 Days/etc)<br>2. Verify cabinet data updates | Data should reflect selected time period |

---

### **6. CABINET DETAILS PAGE**

| Test # | Scenario | Steps | Expected Result |
|--------|----------|-------|-----------------|
| 6.1 | Admin - Any Cabinet | 1. Click any cabinet<br>2. Verify details page loads | Should show full cabinet details + metrics |
| 6.2 | Manager - Licensee Cabinet | 1. Click cabinet within assigned licensee location<br>2. Verify details page loads | Should show cabinet details |
| 6.3 | Manager - Other Licensee Cabinet | 1. Try to access cabinet from different licensee (direct URL)<br>2. Should be blocked | Should show "Access Denied" or redirect |
| 6.4 | Collector - Assigned Location Cabinet | 1. Click cabinet in assigned location<br>2. Verify details page loads | Should show cabinet details |
| 6.5 | Collector - Unassigned Cabinet | 1. Try to access cabinet from unassigned location (direct URL)<br>2. Should be blocked | Should show "Access Denied" or redirect |
| 6.6 | Cabinet Metrics Accuracy | 1. Verify Money In/Out, Games Played, etc.<br>2. Check SAS meters | Data should be accurate for selected time period |

---

### **7. COLLECTION REPORTS PAGE**

| Test # | Scenario | Steps | Expected Result |
|--------|----------|-------|-----------------|
| 7.1 | Admin - All Reports | 1. Login as admin<br>2. Check Collection Reports page | Should see all collection reports across all licensees |
| 7.2 | Manager - Licensee Reports | 1. Login as manager (Cabana)<br>2. Check Collection Reports page | Should see all Cabana reports (all Cabana locations) |
| 7.3 | Collector - Assigned Location Reports | 1. Login as collector (DevLabTuna only)<br>2. Check Collection Reports page | Should see only DevLabTuna reports |
| 7.4 | Manager Cross-Licensee Check | 1. Login as manager (Cabana only)<br>2. Ensure NO TTG reports show | Should NOT see reports from other licensees (e.g., TTG) |
| 7.5 | Collector - No Locations | 1. Remove all locations from collector<br>2. Check Collection Reports page | Should show "No collection reports found" |
| 7.6 | Report Details Access | 1. Click on a report<br>2. Verify report details page loads | Should show full report with machine data |

---

### **8. USER PROFILE EDITING (Admin/Developer)**

| Test # | Scenario | Steps | Expected Result |
|--------|----------|-------|-----------------|
| 8.1 | Admin Changes Own Licensee | 1. Login as admin<br>2. Open Profile Modal<br>3. Change assigned licensee<br>4. Save | `sessionVersion` should increment in DB<br>Toast notification on next API call<br>Auto-logout and redirect to login |
| 8.2 | Admin Changes Own Roles | 1. Login as admin<br>2. Open Profile Modal<br>3. Add/remove roles<br>4. Save | `sessionVersion` should increment<br>Auto-logout after next API call |
| 8.3 | Admin Changes Own Locations | 1. Login as admin<br>2. Open Profile Modal<br>3. Change resourcePermissions (locations)<br>4. Save | `sessionVersion` should increment<br>Auto-logout after next API call |
| 8.4 | Admin Changes Non-Permission Fields | 1. Login as admin<br>2. Change name, email, address, etc.<br>3. Save | `sessionVersion` should NOT increment<br>No auto-logout |
| 8.5 | Admin Changes Password | 1. Login as admin<br>2. Change password<br>3. Save | `sessionVersion` should NOT increment for password-only change |
| 8.6 | Regular User Profile Edit | 1. Login as collector<br>2. Try to edit profile<br>3. Change any field | Should NOT be able to change roles/licensees/permissions |

---

### **9. ADMIN PAGE - USER MANAGEMENT**

| Test # | Scenario | Steps | Expected Result |
|--------|----------|-------|-----------------|
| 9.1 | Session Counters Display | 1. Login as admin<br>2. Go to Administration page<br>3. Check user cards & table | Should show Login Count, Last Login, Session Version for each user |
| 9.2 | Admin Changes User Licensee | 1. Edit user (e.g., mkirton)<br>2. Add/remove licensee<br>3. Save | `sessionVersion` should increment for that user<br>User should be auto-logged out on next API call |
| 9.3 | Admin Changes User Roles | 1. Edit user<br>2. Add/remove roles<br>3. Save | `sessionVersion` should increment<br>User auto-logged out |
| 9.4 | Admin Changes User Locations | 1. Edit user<br>2. Add/remove locations<br>3. Save | `sessionVersion` should increment<br>User auto-logged out |
| 9.5 | Admin Changes Non-Permission Fields | 1. Edit user<br>2. Change name, email, etc.<br>3. Save | `sessionVersion` should NOT increment<br>User stays logged in |
| 9.6 | Login Counter Increments | 1. Note current login count for user<br>2. Logout that user<br>3. Login again<br>4. Check admin page | Login count should increment by 1<br>Last Login should update |
| 9.7 | Session Version Display | 1. Check session version badge in table/cards<br>2. Increment it by changing permissions<br>3. Refresh admin page | Should show v1, v2, v3, etc. |

---

### **10. AUTO-LOGOUT & TOAST NOTIFICATIONS**

| Test # | Scenario | Steps | Expected Result |
|--------|----------|-------|-----------------|
| 10.1 | Permission Change Auto-Logout | 1. Have two browser tabs: Admin & User<br>2. Admin changes user permissions<br>3. User makes any API call | User sees red toast: "Your permissions have changed. Please login again."<br>Redirects to login after 1.5s |
| 10.2 | Licensee Change Auto-Logout | 1. Admin removes user's licensee<br>2. User navigates to any page | Auto-logout with toast notification |
| 10.3 | Location Change Auto-Logout | 1. Admin removes user's location<br>2. User tries to view cabinets | Auto-logout with toast notification |
| 10.4 | Role Change Auto-Logout | 1. Admin removes manager role<br>2. User tries to access Dashboard | Auto-logout with toast notification |
| 10.5 | No Auto-Logout for Name Change | 1. Admin changes user's name<br>2. User continues using app | Should NOT be logged out |

---

### **11. LICENSEE SELECT DROPDOWN**

| Test # | Scenario | Steps | Expected Result |
|--------|----------|-------|-----------------|
| 11.1 | Admin - All Licensees | 1. Login as admin<br>2. Check licensee dropdown | Should show "All Licensees" + Barbados, Cabana, TTG |
| 11.2 | Manager - Assigned Licensees Only | 1. Login as manager (Cabana, TTG)<br>2. Check licensee dropdown | Should show only Cabana and TTG (no "All Licensees" for non-admin) |
| 11.3 | Collector - Single Licensee | 1. Login as collector (Cabana only)<br>2. Check licensee dropdown | Dropdown should be hidden (only 1 licensee) |
| 11.4 | Licensee Filter Functionality | 1. Select different licensee<br>2. Verify all pages filter data | Dashboard, Locations, Cabinets, Reports should all update |

---

### **12. DATA ISOLATION & SECURITY**

| Test # | Scenario | Steps | Expected Result |
|--------|----------|-------|-----------------|
| 12.1 | Direct URL Access - Location | 1. Login as collector (Cabana)<br>2. Try to access TTG location via direct URL | Should be denied / redirected |
| 12.2 | Direct URL Access - Cabinet | 1. Login as collector (Location A)<br>2. Try to access cabinet from Location B via URL | Should be denied / redirected |
| 12.3 | API Direct Access | 1. Use browser DevTools to call API directly<br>2. Try to fetch data for unauthorized licensee | Should return 401/403 error |
| 12.4 | JWT Token Validation | 1. Check localStorage JWT token<br>2. Verify it contains correct roles, rel, resourcePermissions | JWT should have all permission fields |
| 12.5 | Stale Token Rejection | 1. Admin changes user permissions<br>2. User's old JWT token is used<br>3. API should reject it | Should return 401 with session invalidation message |

---

### **13. EMPTY STATES & ERROR MESSAGES**

| Test # | Scenario | Steps | Expected Result |
|--------|----------|-------|-----------------|
| 13.1 | No Licensee Assigned | 1. Remove all licensees from user<br>2. Login as that user | Should show "No Licensee Assigned" message |
| 13.2 | No Locations Assigned - Cabinets | 1. Collector with no locations<br>2. Check Cabinets page | Should show "No machines found in your allowed locations for [licensees]" |
| 13.3 | No Locations Assigned - Locations | 1. Collector with no locations<br>2. Check Locations page | Should show "No locations found" |
| 13.4 | No Data for Time Period | 1. Select "Today" when no activity today<br>2. Check Dashboard | Should show $0.00 / $0.00 / $0.00 |
| 13.5 | Manager with Empty Licensee | 1. Manager assigned to licensee with no locations<br>2. Check pages | Should show appropriate "No data" messages |

---

### **14. PROFILE MODAL - LOCATION & LICENSEE DISPLAY**

| Test # | Scenario | Steps | Expected Result |
|--------|----------|-------|-----------------|
| 14.1 | Show Assigned Licensees | 1. Login as user with multiple licensees<br>2. Open Profile Modal | Should show licensee names (e.g., "Cabana, TTG") |
| 14.2 | Show Assigned Locations | 1. Login as user with locations assigned<br>2. Open Profile Modal | Should show location names (e.g., "DevLabTuna") |
| 14.3 | Show "No Licensee" | 1. Login as user with no licensees<br>2. Open Profile Modal | Should show "No licensees assigned" |
| 14.4 | Show "No Locations" | 1. Login as user with no locations<br>2. Open Profile Modal | Should show "No locations assigned" |
| 14.5 | Skeleton Loaders | 1. Open Profile Modal on slow connection<br>2. Check UI | Should show skeleton loaders while fetching data |

---

## 🧪 **Testing Priority Order**

### **Phase 1: Core Functionality (MUST TEST FIRST)**
1. User Roles & Page Access (Section 1)
2. Dashboard Data Accuracy (Section 2)
3. Data Isolation & Security (Section 12)

### **Phase 2: Page-Specific Filtering**
4. Locations Page (Section 3)
5. Cabinets Page (Section 5)
6. Collection Reports Page (Section 7)

### **Phase 3: Detail Pages & Security**
7. Location Details Page (Section 4)
8. Cabinet Details Page (Section 6)

### **Phase 4: Admin Features**
9. Admin Page - User Management (Section 9)
10. User Profile Editing (Section 8)
11. Auto-Logout & Toast Notifications (Section 10)

### **Phase 5: UI/UX & Edge Cases**
12. Licensee Select Dropdown (Section 11)
13. Empty States & Error Messages (Section 13)
14. Profile Modal Display (Section 14)

---

## 📝 **Testing Checklist Template**

For each test, document:
- ✅ **PASS** / ❌ **FAIL**
- **Actual Result**: What happened
- **Screenshot**: (if applicable)
- **Notes**: Any observations

---

## 🚀 **Pre-Testing Setup**

1. ✅ Ensure dev server is running (`pnpm dev`)
2. ✅ Have admin account ready (aaronhazzard2018@gmail.com)
3. ✅ Have test user account ready (mkirton@dynamic1group.com)
4. ✅ Open browser DevTools (Network & Console tabs)
5. ✅ Have MongoDB Compass open to verify DB changes
6. ✅ Clear browser cache/cookies before starting

---

## 📊 **Success Criteria**

All tests must pass with:
- ✅ Correct data displayed based on user permissions
- ✅ Unauthorized access properly blocked
- ✅ No data leakage between licensees
- ✅ Auto-logout working for permission changes
- ✅ Toast notifications displayed correctly
- ✅ Session counters updating properly
- ✅ Dashboard data matches location totals
- ✅ All empty states showing appropriate messages

---

**Total Tests**: ~100+ scenarios across 14 sections
**Estimated Time**: 3-4 hours for complete testing
**Tools Needed**: Browser, DevTools, MongoDB Compass, Two browser profiles/tabs

