# Auto-Logout on Permission Change - Implementation Guide

## 📋 Overview

This document describes the **Session Invalidation System** that automatically logs users out when an admin changes their permissions, roles, or licensee assignments. This ensures users always have up-to-date permissions without requiring manual logout/login.

---

## 🎯 Problem Solved

**Before:**
- Admin changes user's roles, licensees, or location permissions
- User's JWT token contains **old permissions**
- User continues to see incorrect data until they manually logout/login
- **Security risk**: Users could access data they shouldn't have access to

**After:**
- Admin changes user's permissions → `sessionVersion` incremented in database
- User's next API request detects session version mismatch → auto-logout
- User is redirected to login with clear message
- User logs back in with fresh token containing new permissions
- ✅ **Security maintained**: No stale permissions

---

## 🔧 Technical Implementation

### **1. Database Schema Update**

**File**: `app/api/lib/models/user.ts`

Added `sessionVersion` field to User model:

```typescript
sessionVersion: { type: Number, default: 1 },
```

- **Type**: Number
- **Default**: 1
- **Purpose**: Tracks permission changes. Incremented each time permissions are modified.

---

### **2. TypeScript Type Definitions**

**Files Updated**:
- `shared/types/entities.ts` - Added `sessionVersion?: number` to `User` type
- `shared/types/auth.ts` - Added `sessionVersion?: number` to `UserAuthPayload` and `JwtPayload` types

This ensures type safety across frontend and backend.

---

### **3. JWT Token Generation**

**File**: `app/api/lib/helpers/auth.ts`

Updated all `generateAccessToken` calls to include `sessionVersion`:

```typescript
const accessToken = await generateAccessToken({
  _id: userObject._id.toString(),
  emailAddress: userObject.emailAddress,
  username: String(userObject.username || ''),
  isEnabled: userObject.isEnabled,
  roles: userObject.roles || [],
  rel: userObject.rel || undefined,
  sessionId: sessionId,
  sessionVersion: Number(userObject.sessionVersion) || 1,  // ✅ ADDED
  dbContext: {
    connectionString: getCurrentDbConnectionString(),
    timestamp: Date.now(),
  },
});
```

**Updated in:**
- Login flow (line 255)
- Profile update flow (line 189)
- Token refresh flow (line 374)

---

### **4. Session Version Validation**

**File**: `app/api/lib/helpers/users.ts`

Added `sessionVersion` check in `getUserFromServer()`:

```typescript
// Validate session version (permission changes invalidate the session)
const jwtPayload = payload as JWTPayload;
if (jwtPayload.sessionVersion !== undefined && jwtPayload._id) {
  try {
    await connectDB();
    const UserModel = (await import('../models/user')).default;
    const user = await UserModel.findOne({ _id: jwtPayload._id })
      .select('sessionVersion')
      .lean() as { sessionVersion?: number } | null;
    
    if (user && user.sessionVersion !== undefined) {
      if (user.sessionVersion !== jwtPayload.sessionVersion) {
        console.warn(
          `[SESSION INVALIDATION] User ${jwtPayload._id} session version mismatch. ` +
          `DB: ${user.sessionVersion}, JWT: ${jwtPayload.sessionVersion}`
        );
        return null; // ❌ Session invalidated - triggers 401
      }
    }
  } catch (error) {
    console.error('Session version validation failed:', error);
    // Continue even if validation fails - don't block legitimate requests
  }
}
```

**Result**: If session versions don't match → returns `null` → API returns 401 → frontend auto-logout

---

### **5. Admin Panel - Increment sessionVersion**

**File**: `app/administration/page.tsx`

Added logic to increment `sessionVersion` when permission fields change:

```typescript
// Check if permission-related fields changed (roles, resourcePermissions, rel)
const permissionFieldsChanged = meaningfulChanges.some(change => {
  const fieldPath = change.path;
  return fieldPath === 'roles' || 
         fieldPath.startsWith('resourcePermissions') || 
         fieldPath.startsWith('rel');
});

// If permission-related fields changed, increment sessionVersion
if (permissionFieldsChanged) {
  updatePayload.$inc = { sessionVersion: 1 };  // ✅ MongoDB $inc operator
  console.log('[Administration] 🔒 Permission fields changed - incrementing sessionVersion');
}
```

**Triggers on:**
- ✅ Role changes (`roles` field)
- ✅ Location permission changes (`resourcePermissions.gaming-locations`)
- ✅ Licensee assignment changes (`rel.licencee`)

**Does NOT trigger on:**
- ❌ Profile changes (name, email, etc.)
- ❌ Password changes
- ❌ Profile picture changes

---

### **6. Frontend Auto-Logout**

**File**: `lib/utils/axiosInterceptor.ts`

Enhanced axios interceptor to handle 401 errors and auto-logout:

```typescript
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const errorMessage = error.response.data?.message || '';
      
      // Any 401 error (except database mismatch) triggers auto-logout
      console.warn('🔒 Session invalidated or authentication failed');
      
      if (typeof window !== 'undefined') {
        // Clear local storage
        localStorage.removeItem('user-auth-store');
        
        // Try to clear tokens via API
        axios.post('/api/auth/clear-all-tokens')
          .finally(() => {
            const message = errorMessage.includes('session') || errorMessage.includes('permission')
              ? 'Your permissions have changed. Please login again.'
              : 'Your session has expired. Please login again.';
            
            // Redirect to login (if not already there)
            if (currentPath !== '/authentication' && currentPath !== '/login') {
              window.location.href = `/authentication?message=${encodeURIComponent(message)}`;
            }
          });
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 🔄 Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN CHANGES USER PERMISSIONS                              │
│  (roles, licensees, or location permissions)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  DATABASE: sessionVersion incremented                         │
│  User document: { sessionVersion: 2 } (was 1)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  USER MAKES API REQUEST                                       │
│  JWT contains: sessionVersion: 1                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND: getUserFromServer()                                 │
│  Compares: JWT sessionVersion (1) vs DB sessionVersion (2)   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  MISMATCH DETECTED!                                           │
│  Return null → API returns 401 Unauthorized                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND: Axios interceptor catches 401                      │
│  - Clears localStorage                                        │
│  - Clears cookies via /api/auth/clear-all-tokens             │
│  - Redirects to login with message                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  USER LOGS IN AGAIN                                           │
│  New JWT contains: sessionVersion: 2 (matches database)      │
│  ✅ Fresh token with updated permissions                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Testing the Feature

### **Test Case 1: Change User's Licensee**

1. **Login as mkirton** (collector/manager, assigned to "Cabana")
2. **Verify**: User can see Cabana data (but not TTG)
3. **As Admin**: Add "TTG" licensee to mkirton
4. **Result**: Next API request from mkirton → 401 → auto-logout
5. **Login again** as mkirton
6. **Verify**: User can now see both Cabana AND TTG data ✅

---

### **Test Case 2: Change User's Roles**

1. **Login as mkirton** (manager role)
2. **Verify**: User can see all locations for their licensees
3. **As Admin**: Remove "manager" role from mkirton
4. **Result**: Next API request → 401 → auto-logout
5. **Login again** as mkirton
6. **Verify**: User now restricted to only assigned locations ✅

---

### **Test Case 3: Change User's Location Permissions**

1. **Login as technician user** (assigned to Location A)
2. **Verify**: User can see Location A data only
3. **As Admin**: Assign Location B to the user
4. **Result**: Next API request → 401 → auto-logout
5. **Login again**
6. **Verify**: User can now see both Location A and B ✅

---

## 🛠️ Troubleshooting

### **Issue: User not auto-logged out**

**Possible Causes:**
1. ❌ sessionVersion not incremented in database
2. ❌ JWT token doesn't contain sessionVersion
3. ❌ Axios interceptor not set up

**Solution:**
- Check admin panel console for: `[Administration] 🔒 Permission fields changed - incrementing sessionVersion`
- Check browser dev tools → Application → Local Storage → `user-auth-store` → verify sessionVersion
- Check server logs for: `[SESSION INVALIDATION] User X session version mismatch`

---

### **Issue: User auto-logged out on every request**

**Possible Causes:**
1. ❌ sessionVersion being incremented on non-permission changes
2. ❌ sessionVersion not being included in JWT token generation

**Solution:**
- Verify `permissionFieldsChanged` check in admin panel only triggers for roles/resourcePermissions/rel changes
- Verify all `generateAccessToken` calls include `sessionVersion`

---

## ✅ Benefits

1. **🔒 Security**: No stale permissions - users immediately lose access when permissions are revoked
2. **🚀 User Experience**: Clear message explaining why they need to re-login
3. **📊 Audit Trail**: Server logs record session invalidations
4. **⚡ Performance**: Minimal overhead - single database query to validate sessionVersion
5. **🎯 Selective**: Only triggers for permission changes, not profile updates

---

## 🔮 Future Enhancements

1. **WebSocket Notifications**: Push notification to user's browser before auto-logout
2. **Grace Period**: Allow 30 seconds for user to save work before logout
3. **Session History**: Track all session invalidations in activity logs
4. **Admin Dashboard**: Show which users have stale sessions

---

## 📚 Related Documentation

- `docs/LICENSEE_AND_LOCATION_ACCESS_CONTROL_GUIDELINE.md` - Access control system
- `docs/COMPLETE_IMPLEMENTATION_SUMMARY.md` - Full licensee system implementation

---

**Created**: 2025-11-08  
**Author**: AI Assistant  
**Version**: 1.0

