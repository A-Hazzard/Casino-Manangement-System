# 🚀 Coding Skills Recovery Guide

## Overview

This guide will help you regain your coding skills by systematically exploring and understanding your Evolution One CMS codebase. We'll start with simple concepts and gradually build up to more complex systems.

---

## 🎯 Learning Path Overview

### Phase 1: Authentication System (Week 1-2)

**Goal:** Understand how users log in and how the app protects routes

### Phase 2: Collection Reports (Week 3-4)

**Goal:** Master the core business logic and complex data flows

### Phase 3: Dashboard & Analytics (Week 5-6)

**Goal:** Understand data aggregation and real-time updates

### Phase 4: Advanced Features (Week 7-8)

**Goal:** Dive into gaming day offsets, SAS calculations, and complex business rules

---

## 📚 Phase 1: Authentication System

### Day 1-2: Understanding the Login Flow

#### Files to Study (in order):

1. **`app/(auth)/login/page.tsx`** - The login page
2. **`components/auth/LoginForm.tsx`** - The actual form component
3. **`app/api/auth/login/route.ts`** - Backend login logic
4. **`middleware.ts`** - Route protection
5. **`lib/hooks/useAuth.ts`** - Authentication state management
6. **`lib/store/userStore.ts`** - User data storage

#### Study Questions:

- [ ] How does the login form validate user input?
- [ ] What happens when you submit the login form?
- [ ] How are JWT tokens created and stored?
- [ ] How does the middleware protect routes?
- [ ] How does the app know if a user is logged in?
- [ ] What happens when a token expires?

#### Hands-On Exercises:

1. **Add a "Remember Me" checkbox** to the login form
2. **Implement password visibility toggle**
3. **Add loading spinner** during login
4. **Create a "Forgot Password" link** (UI only)

### Day 3-4: Authentication State Management

#### Files to Study:

1. **`lib/store/userStore.ts`** - Zustand store for user data
2. **`lib/hooks/useAuth.ts`** - Authentication hook
3. **`lib/utils/auth.ts`** - Auth utility functions
4. **`lib/middleware/auth.ts`** - Auth middleware helpers

#### Study Questions:

- [ ] How is user data stored and retrieved?
- [ ] What happens when the app starts up?
- [ ] How does token refresh work?
- [ ] How does the app handle authentication errors?

#### Hands-On Exercises:

1. **Add user profile display** in the header
2. **Implement logout functionality**
3. **Add session timeout warning**
4. **Create user preferences storage**

### Day 5-7: Route Protection & Middleware

#### Files to Study:

1. **`middleware.ts`** - Main middleware file
2. **`lib/utils/auth.ts`** - Auth utilities
3. **`app/unauthorized/page.tsx`** - Unauthorized access page

#### Study Questions:

- [ ] How does the middleware decide which routes to protect?
- [ ] What happens when an unauthenticated user tries to access protected content?
- [ ] How does the middleware validate JWT tokens?
- [ ] What is database context validation?

#### Hands-On Exercises:

1. **Add role-based route protection**
2. **Implement admin-only routes**
3. **Create custom 403 error page**
4. **Add audit logging for auth events**

---

## 📊 Phase 2: Collection Reports System

### Day 8-10: Understanding Collection Reports

#### Files to Study (in order):

1. **`app/collection-reports/page.tsx`** - Main collection reports page
2. **`app/api/collectionReport/route.ts`** - Collection reports API
3. **`lib/helpers/collectionReportService.ts`** - Collection report business logic
4. **`shared/types/collectionReport.ts`** - Type definitions

#### Study Questions:

- [ ] What is a collection report and why does it exist?
- [ ] How are collection reports created?
- [ ] What data does a collection report contain?
- [ ] How are collection reports filtered and sorted?
- [ ] What is the relationship between collections and collection reports?

#### Hands-On Exercises:

1. **Add search functionality** to the collection reports list
2. **Implement date range filtering**
3. **Add export to CSV functionality**
4. **Create collection report templates**

### Day 11-13: Collection Report Creation

#### Files to Study:

1. **`components/collectionReport/NewCollectionModal.tsx`** - New report modal
2. **`components/collectionReport/mobile/MobileCollectionModal.tsx`** - Mobile version
3. **`lib/utils/collectionTime.ts`** - Collection time utilities
4. **`lib/helpers/collectionCreation.ts`** - Core creation logic

#### Study Questions:

- [ ] How does the collection report creation process work?
- [ ] What is a collection time and why is it important?
- [ ] How are machines selected for collection?
- [ ] What happens when you create a collection report?
- [ ] How does the mobile version differ from desktop?

#### Hands-On Exercises:

1. **Add machine selection filters**
2. **Implement collection time validation**
3. **Create collection report preview**
4. **Add bulk machine operations**

### Day 14-16: Collection Report Details & Editing

#### Files to Study:

1. **`app/collection-report/report/[reportId]/page.tsx`** - Report details page
2. **`components/collectionReport/EditCollectionModal.tsx`** - Edit modal
3. **`app/api/collection-report/[reportId]/route.ts`** - Report API
4. **`lib/helpers/accountingDetails.ts`** - Report data helpers

#### Study Questions:

- [ ] How is a collection report displayed in detail?
- [ ] What is SAS (Slot Accounting System) and why is it important?
- [ ] How does the edit functionality work?
- [ ] What happens when you delete a collection report?
- [ ] How are collection report metrics calculated?

#### Hands-On Exercises:

1. **Add collection report comments**
2. **Implement report sharing**
3. **Create report comparison feature**
4. **Add collection report history**

---

## 🎮 Phase 3: Dashboard & Analytics

### Day 17-19: Dashboard Overview

#### Files to Study:

1. **`app/page.tsx`** - Main dashboard page
2. **`components/dashboard/DashboardMetrics.tsx`** - Metrics display
3. **`app/api/dashboard/totals/route.ts`** - Dashboard API
4. **`lib/helpers/dashboard.ts`** - Dashboard logic

#### Study Questions:

- [ ] What metrics are displayed on the dashboard?
- [ ] How are dashboard metrics calculated?
- [ ] How does real-time data updating work?
- [ ] What is the relationship between different metrics?

#### Hands-On Exercises:

1. **Add custom metric widgets**
2. **Implement dashboard customization**
3. **Create metric comparison charts**
4. **Add dashboard export functionality**

### Day 20-22: Gaming Day Offsets

#### Files to Study:

1. **`lib/utils/gamingDayRange.ts`** - Gaming day utilities
2. **`app/api/dashboard/totals/route.ts`** - How gaming days are used
3. **`app/api/locations/[locationId]/route.ts`** - Location-specific gaming days

#### Study Questions:

- [ ] What is a gaming day offset and why is it needed?
- [ ] How do gaming days affect data calculations?
- [ ] How are gaming days configured per location?
- [ ] What is the difference between local time and UTC?

#### Hands-On Exercises:

1. **Add gaming day configuration UI**
2. **Implement gaming day validation**
3. **Create gaming day reports**
4. **Add timezone conversion utilities**

---

## 🔧 Phase 4: Advanced Features

### Day 23-25: SAS (Slot Accounting System)

#### Files to Study:

1. **`lib/helpers/collectionCreation.ts`** - SAS calculations
2. **`app/api/collection-report/[reportId]/fix-sas-times/route.ts`** - SAS fixing
3. **`app/api/collections/route.ts`** - Collection management

#### Study Questions:

- [ ] What is SAS and how does it work?
- [ ] How are SAS times calculated?
- [ ] What happens when SAS times are incorrect?
- [ ] How does the SAS fixing functionality work?

#### Hands-On Exercises:

1. **Create SAS validation tools**
2. **Implement SAS time debugging**
3. **Add SAS performance monitoring**
4. **Create SAS documentation**

### Day 26-28: Machine Management

#### Files to Study:

1. **`app/cabinets/page.tsx`** - Machines overview
2. **`app/api/machines/aggregation/route.ts`** - Machine aggregation
3. **`components/cabinets/MachineCard.tsx`** - Machine display

#### Study Questions:

- [ ] How are machines organized and displayed?
- [ ] What is machine aggregation and why is it needed?
- [ ] How do machine metrics relate to collection reports?
- [ ] What is the difference between machines and cabinets?

#### Hands-On Exercises:

1. **Add machine grouping functionality**
2. **Implement machine performance tracking**
3. **Create machine maintenance schedules**
4. **Add machine location mapping**

---

## 🛠️ Daily Practice Routine

### Morning (30 minutes):

1. **Read one file** from the current phase
2. **Answer the study questions** for that file
3. **Make notes** about what you learned

### Afternoon (1-2 hours):

1. **Complete the hands-on exercise** for the day
2. **Test your changes** thoroughly
3. **Document any issues** you encountered

### Evening (15 minutes):

1. **Review your notes** from the day
2. **Plan tomorrow's learning** objectives
3. **Update this checklist** with your progress

---

## 🎯 Success Metrics

### Week 1-2 (Authentication):

- [ ] Can explain the complete login flow
- [ ] Can add new authentication features
- [ ] Understands JWT token management
- [ ] Can implement route protection

### Week 3-4 (Collection Reports):

- [ ] Can create and edit collection reports
- [ ] Understands SAS calculations
- [ ] Can debug collection report issues
- [ ] Can implement new collection features

### Week 5-6 (Dashboard):

- [ ] Can modify dashboard metrics
- [ ] Understands gaming day offsets
- [ ] Can implement real-time updates
- [ ] Can create custom analytics

### Week 7-8 (Advanced):

- [ ] Can work with complex business logic
- [ ] Understands data aggregation
- [ ] Can implement performance optimizations
- [ ] Can debug complex issues

---

## 🚨 When You Get Stuck

### Debugging Strategies:

1. **Read error messages carefully** - they often contain the solution
2. **Use browser dev tools** - inspect network requests and console
3. **Check the database** - use MongoDB Compass to see actual data
4. **Add console.log statements** - trace data flow
5. **Read the TypeScript types** - understand expected data structures

### Getting Help:

1. **Document your problem** - what were you trying to do?
2. **Include error messages** - copy the exact error
3. **Show your code** - what did you change?
4. **Explain your understanding** - what do you think should happen?

### Common Pitfalls:

- **Don't skip the fundamentals** - understand each layer before moving on
- **Don't copy code without understanding** - always know what each line does
- **Don't ignore TypeScript errors** - they're trying to help you
- **Don't work on too many things at once** - focus on one concept per day

---

## 📝 Progress Tracking

### Daily Checklist Template:

```
Date: ___________
Phase: ___________
Files Studied: ___________
Key Learnings: ___________
Exercises Completed: ___________
Issues Encountered: ___________
Tomorrow's Plan: ___________
```

### Weekly Review Questions:

1. What was the most challenging concept this week?
2. What did I accomplish that I'm proud of?
3. What would I do differently next week?
4. Am I ready to move to the next phase?

---

## 🎉 Celebration Milestones

- **Week 2:** "I understand authentication!" 🎊
- **Week 4:** "I can build collection reports!" 🎊
- **Week 6:** "I can create dashboards!" 🎊
- **Week 8:** "I'm a full-stack developer again!" 🎊

---

## 💡 Pro Tips

1. **Start each day with a clear goal** - what do you want to learn?
2. **Take breaks** - your brain needs time to process information
3. **Ask questions** - if something doesn't make sense, investigate
4. **Practice regularly** - consistency is more important than intensity
5. **Celebrate small wins** - every line of code you understand is progress

---

**Remember:** You're not starting from zero. You have a working system, and you just need to understand how it works. Take your time, be patient with yourself, and enjoy the journey of rediscovering your coding skills! 🚀
