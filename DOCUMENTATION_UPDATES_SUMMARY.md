# Documentation Updates Summary

**Date:** November 10, 2025  
**Author:** Aaron Hazzard - Senior Software Engineer  
**Purpose:** Updated documentation to reflect meter structure requirements, role-based currency conversion, and admin features

---

## 📝 Overview

This update consolidates recent system changes into the documentation, ensuring developers and Cursor AI understand:
1. **Meter Data Structure Requirements** - Critical fields needed for aggregation APIs
2. **Role-Based Currency Conversion** - Admin/Developer vs Manager conversion logic
3. **Admin Features** - Licensee filtering and currency selector behavior

---

## 📄 Files Updated

### 🆕 New Documentation

#### `Documentation/meter-data-structure.md`
**NEW COMPREHENSIVE GUIDE** for meter data requirements.

**Key Content:**
- **Required Fields**: `readAt` and `movement` object are MANDATORY
- **Field Structure**: Complete meter document structure with all fields
- **Why It Matters**: Explains why missing fields cause $0 in UI
- **Script Examples**: Correct and incorrect meter creation patterns
- **Fixing Issues**: Scripts to add missing fields to existing meters
- **Troubleshooting**: Common issues and solutions

**Critical Rules:**
1. Always use `readAt` for date filtering (NOT `timestamp` or `createdAt`)
2. Always include `movement` object with all financial fields
3. Aggregation APIs query `movement.drop` and `movement.totalCancelledCredits`
4. Missing these fields = $0 displayed in UI despite meters existing

---

### 📝 Updated Documentation

#### 1. `.cursor/application-context.md`
**Added:**
- Reference to `meter-data-structure.md` in Database & Type System section
- Reference to `currency-conversion-system.md` for role-based conversion
- New critical guideline section for meter data creation
- Warnings about `movement` and `readAt` field requirements

**Key Changes:**
```markdown
⚠️ **Before Creating Meter Data (Scripts/Migrations):**

1. **ALWAYS include `movement` field** - Required for all aggregation APIs
2. **ALWAYS include `readAt` field** - Used for date filtering (NOT timestamp)
3. Include top-level financial fields (drop, coinIn, etc.) for backward compatibility
4. Include `sasMeters` and `billMeters` for complete meter structure
5. See `database-models.md` for complete meter field requirements
```

---

#### 2. `Documentation/database-models.md`
**Updated:** Meters Model section with critical field requirements.

**Key Changes:**
- Added ⚠️ warnings for `readAt` and `movement` fields
- Expanded meter structure showing all required fields
- Added API query pattern examples (correct vs incorrect)
- Included top-level fields, sasMeters, billMeters structures
- Added explanation of field duplication for backward compatibility

**Critical Addition:**
```typescript
// ⚠️ CRITICAL: Use readAt for date filtering (NOT timestamp or createdAt)
readAt: Date;                   // Date filtering field used by ALL aggregation APIs

// ⚠️ CRITICAL: movement field is REQUIRED for aggregation APIs
movement: {
  drop: number;                 // Money In - primary financial metric
  totalCancelledCredits: number; // Money Out - primary financial metric
  // ... other fields
};
```

---

#### 3. `Documentation/currency-conversion-system.md`
**Updated:** Added role-based currency conversion rules.

**Key Changes:**
- Added comprehensive role-based conversion rules table
- Documented Admin/Developer vs Manager conversion behavior
- Added implementation examples for both admin and manager scenarios
- Updated API pattern to include role checking
- Added conversion flow examples for different user roles

**Critical Addition:**
```markdown
⚠️ **CRITICAL**: Currency conversion ONLY applies for **Admin/Developer** roles when viewing **"All Licensees"**.

| User Role | Licensee Filter | Currency Conversion | Currency Selector Visible |
|-----------|----------------|---------------------|---------------------------|
| Admin/Developer | "All Licensees" | ✅ YES | ✅ YES |
| Admin/Developer | Specific Licensee | ❌ NO | ❌ NO |
| Manager | Any | ❌ NO | ❌ NO |
```

---

#### 4. `Documentation/frontend/dashboard.md`
**Updated:** Added currency conversion and display section.

**Key Changes:**
- Updated licensee selection rules (Managers cannot view "All Licensees")
- Added comprehensive "Currency Conversion & Display" section
- Documented currency selector visibility rules
- Added conversion logic examples for different roles
- Listed all supported currencies with rates

**Key Addition:**
```markdown
### Currency Conversion & Display

⚠️ **IMPORTANT**: Currency conversion follows strict role-based rules:

**Currency Selector Visibility:**
- **Admin/Developer + "All Licensees"**: ✅ Currency selector VISIBLE
- **Admin/Developer + Specific Licensee**: ❌ Currency selector HIDDEN
- **Manager**: ❌ Currency selector ALWAYS HIDDEN

**Supported Currencies:**
- USD - US Dollar (base currency, rate: 1.0)
- TTD - Trinidad & Tobago Dollar (rate: 6.75)
- GYD - Guyanese Dollar (rate: 207.98)  
- BBD - Barbados Dollar (rate: 2.0)
```

---

#### 5. `Documentation/frontend/locations.md`
**Updated:** Added currency conversion section to search and filtering.

**Key Changes:**
- Updated licensee filtering rules (no "All Licensees" for managers)
- Added "Currency Conversion (Admin/Developer only)" section
- Documented when currency selector is visible
- Explained manager always sees native currency

---

#### 6. `Documentation/frontend/machines.md`
**Updated:** Added licensee filtering and currency conversion section.

**Key Changes:**
- Added comprehensive "Licensee Filtering & Currency Conversion" section
- Documented role-based licensee dropdown behavior
- Explained currency selector visibility rules
- Clarified manager never sees currency selector

---

#### 7. `Documentation/DOCUMENTATION_INDEX.md`
**Updated:** Added new meter data structure document and updated existing entries.

**Key Changes:**
- Added **Meter Data Structure** entry under "Database & Models" (⭐ NEW)
- Updated **Database Models** entry (⭐ UPDATED)
- Updated **Currency Conversion System** entry (⭐ UPDATED)
- Added descriptive bullet points for new documentation

---

## 🎯 Key Concepts Documented

### 1. Meter Structure Requirements

**Problem**: Meters without `movement` and `readAt` fields cause $0 to display in UI.

**Solution**: 
- Always include `movement` object with all financial fields
- Always include `readAt` field for date filtering
- See `meter-data-structure.md` for complete requirements

**Why It Matters**:
- All aggregation APIs depend on these fields
- Without them, queries return 0 results
- Chart may work (uses `sasMeters`) but cards show $0 (use `movement`)

---

### 2. Role-Based Currency Conversion

**Problem**: Managers were seeing converted USD values instead of native currency.

**Solution**: 
- Currency conversion ONLY for Admin/Developer viewing "All Licensees"
- Managers ALWAYS see native currency
- Currency selector ONLY visible for Admin/Developer when "All Licensees" selected

**Implementation**:
```typescript
const isAdminOrDev = userRoles.some(role => ['admin', 'developer'].includes(role));
const shouldConvert = isAdminOrDev && licensee === 'all';

if (shouldConvert) {
  // Apply conversion: Native → USD → Display Currency
} else {
  // Return native currency values
}
```

---

### 3. Admin Features

**Licensee Filtering**:
- **Developer/Admin**: Can view "All Licensees" or specific licensee
- **Manager**: Only sees assigned licensees (no "All Licensees" option)
- **Other Roles**: Restricted based on permissions

**Currency Selector**:
- **Visibility**: Only Admin/Developer + "All Licensees"
- **Functionality**: Converts between USD, TTD, GYD, BBD
- **Manager**: Never sees selector, always native currency

---

## 🔍 Documentation Cross-References

### For Cursor AI Context

When working on:
- **Meter Creation Scripts**: Reference `meter-data-structure.md`
- **Aggregation APIs**: Reference `database-models.md` meter section
- **Currency Conversion**: Reference `currency-conversion-system.md`
- **Admin Features**: Reference frontend docs (dashboard, locations, machines)

### For Developers

**Before creating meters**:
1. Read `meter-data-structure.md`
2. Review `database-models.md` meter structure
3. Follow correct meter creation pattern

**Before implementing currency features**:
1. Read `currency-conversion-system.md`
2. Understand role-based rules
3. Check implementation examples

**Before modifying financial pages**:
1. Review relevant frontend documentation
2. Check role-based behavior
3. Understand currency conversion logic

---

## 📊 Documentation Statistics

- **Files Updated**: 7
- **New Files**: 1
- **Total Lines Added**: ~800+
- **Key Sections Added**: 5 major sections

---

## ✅ Verification Checklist

Documentation now covers:
- [x] Meter structure requirements with examples
- [x] `readAt` vs `timestamp` distinction
- [x] `movement` field requirement for aggregations
- [x] Role-based currency conversion rules
- [x] Admin vs Manager conversion behavior
- [x] Currency selector visibility logic
- [x] Licensee filtering by role
- [x] Supported currencies and rates
- [x] Common issues and troubleshooting
- [x] Script examples (correct and incorrect)
- [x] Cross-references between documents

---

## 🎓 Learning Outcomes

After reading updated documentation, developers/AI should understand:

1. **Why meters need `movement` and `readAt` fields**
2. **How aggregation APIs query meter data**
3. **When currency conversion applies (Admin/Developer + "All Licensees" only)**
4. **Why managers always see native currency**
5. **How to create meters correctly in scripts**
6. **How to fix existing meters missing required fields**
7. **How to troubleshoot $0 financial metrics**

---

## 📌 Next Steps

**For Future Updates**:
1. Keep `meter-data-structure.md` updated if meter schema changes
2. Update `currency-conversion-system.md` if new currencies added
3. Update frontend docs if role permissions change
4. Add examples for any new aggregation patterns

**For Cursor AI**:
1. Reference these docs when working on meters
2. Follow meter structure requirements in scripts
3. Understand role-based conversion logic
4. Apply correct patterns for aggregation APIs

---

**Summary**: All critical system logic is now properly documented for both human developers and AI assistants. The meter structure requirements are clearly explained to prevent future $0 issues, and role-based currency conversion is fully documented to ensure correct implementation.

