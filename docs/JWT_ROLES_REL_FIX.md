# JWT Token Missing Roles & Rel Fields - Critical Fix

## 🚨 Critical Issue Found

The JWT access token was **not including `roles` and `rel.licencee` fields**, which caused:
1. ❌ Admin users unable to see all locations (empty array from `/api/locations?showAll=true`)
2. ❌ Licensee-based access control failing
3. ❌ `getUserAccessibleLicenseesFromToken()` returning empty array for admins

## 🔍 Root Cause Analysis

### The Problem

When a user logs in, the system generates a JWT access token via `generateAccessToken()`. However, the token payload was missing critical fields:

**What was being stored in JWT:**
```typescript
{
  _id: "...",
  emailAddress: "...",
  username: "...",
  isEnabled: true,
  sessionId: "...",
  dbContext: { ... }
  // ❌ Missing: roles
  // ❌ Missing: rel
}
```

**What should be stored:**
```typescript
{
  _id: "...",
  emailAddress: "...",
  username: "...",
  isEnabled: true,
  roles: ["admin", "developer"],  // ✅ NEEDED!
  rel: {                                 // ✅ NEEDED!
    licencee: ["licenseeId1", "licenseeId2"]
  },
  sessionId: "...",
  dbContext: { ... }
}
```

### Why This Broke Admin Access

The `/api/locations` endpoint logic:
```typescript
// 1. Get user's accessible licensees from JWT
const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();

// 2. Check if admin and showAll
if (showAll && userAccessibleLicensees === 'all') {
  // Return all locations ✅
} else {
  // Filter by user's licensees ❌
}
```

**Without `roles` in JWT:**
- `getUserAccessibleLicenseesFromToken()` couldn't detect admin role
- It returned empty array `[]` instead of `'all'`
- Even with `showAll=true`, the condition failed
- Result: Empty locations array `{"locations":[]}`

## ✅ Solution

### Files Modified

1. **`shared/types/auth.ts`** - Added `roles` and `rel` to `JwtPayload` type
2. **`app/api/lib/helpers/auth.ts`** - Include `roles` and `rel` when generating tokens
3. **`app/api/auth/refresh-token/route.ts`** - Preserve `roles` and `rel` when refreshing tokens

### Changes Made

#### 1. Updated JWT Payload Type

**File:** `shared/types/auth.ts`

```typescript
export type JwtPayload = {
  _id: string;
  emailAddress: string;
  username: string;
  isEnabled: boolean;
  roles?: string[];              // ✅ ADDED
  rel?: {                        // ✅ ADDED
    licencee?: string[];
  };
  sessionId: string;
  dbContext: {
    connectionString: string;
    timestamp: number;
  };
  iat?: number;
  exp?: number;
  jti?: string;
};
```

#### 2. Updated Login Token Generation

**File:** `app/api/lib/helpers/auth.ts`

**Before:**
```typescript
const accessToken = await generateAccessToken({
  _id: userObject._id.toString(),
  emailAddress: userObject.emailAddress,
  username: String(userObject.username || ''),
  isEnabled: userObject.isEnabled,
  sessionId: sessionId,
  dbContext: {
    connectionString: getCurrentDbConnectionString(),
    timestamp: Date.now(),
  },
});
```

**After:**
```typescript
const accessToken = await generateAccessToken({
  _id: userObject._id.toString(),
  emailAddress: userObject.emailAddress,
  username: String(userObject.username || ''),
  isEnabled: userObject.isEnabled,
  roles: userObject.roles || [],        // ✅ ADDED
  rel: userObject.rel || undefined,     // ✅ ADDED
  sessionId: sessionId,
  dbContext: {
    connectionString: getCurrentDbConnectionString(),
    timestamp: Date.now(),
  },
});
```

#### 3. Updated Token Refresh

**File:** `app/api/auth/refresh-token/route.ts`

**Before:**
```typescript
const newToken = await generateAccessToken({
  _id: payload._id,
  emailAddress: payload.emailAddress,
  username: payload.username,
  isEnabled: payload.isEnabled,
  sessionId: payload.sessionId,
  dbContext: payload.dbContext,
});
```

**After:**
```typescript
const newToken = await generateAccessToken({
  _id: payload._id,
  emailAddress: payload.emailAddress,
  username: payload.username,
  isEnabled: payload.isEnabled,
  roles: payload.roles,           // ✅ ADDED
  rel: payload.rel,               // ✅ ADDED
  sessionId: payload.sessionId,
  dbContext: payload.dbContext,
});
```

## 🧪 How to Test

### Test 1: Admin User Can See All Locations

1. **Login** as admin user (e.g., `aaronhazzard2018@gmail.com`)
2. **Open browser dev tools** → Network tab
3. **Call API:** `GET /api/locations?showAll=true`
4. **Expected Result:** ✅ Returns all locations (not empty array)

```json
{
  "locations": [
    { "_id": "...", "name": "Location 1", ... },
    { "_id": "...", "name": "Location 2", ... },
    ...
  ]
}
```

### Test 2: Admin User Modal Shows Locations

1. **Login** as admin
2. **Go to** Administration page
3. **Click** on a user to open User Modal
4. **Click** "Edit" button
5. **Scroll to** "Allowed Locations" section
6. **Expected Result:** ✅ Dropdown shows all locations

### Test 3: Licensee Assignment Works

1. **Login** as admin
2. **Go to** Administration page
3. **Click** on a user to open User Modal
4. **Click** "Edit" button
5. **Scroll to** "Assigned Licensees" section
6. **Expected Result:** ✅ Dropdown shows all licensees

### Test 4: Verify JWT Token Contents

1. **Login** as admin
2. **Open browser dev tools** → Application/Storage → Cookies
3. **Find** the `token` cookie
4. **Copy** the token value
5. **Decode at** jwt.io
6. **Expected Result:** ✅ Token contains `roles` and `rel` fields

```json
{
  "_id": "...",
  "emailAddress": "aaronhazzard2018@gmail.com",
  "username": "aaron",
  "isEnabled": true,
  "roles": ["admin", "developer"],  // ✅ SHOULD BE HERE
  "rel": {                                 // ✅ SHOULD BE HERE
    "licencee": ["licenseeId1", "licenseeId2"]
  },
  "sessionId": "...",
  "dbContext": { ... }
}
```

## 🔒 Security Impact

**No security vulnerabilities introduced:**
- ✅ JWT still requires valid signature
- ✅ Role-based access control still enforced on backend
- ✅ Users cannot modify their own JWT (signed with secret key)
- ✅ Token expiration still works (7 days)
- ✅ Refresh token logic still works

**What changed:**
- JWT now includes user's roles and licensee assignments
- This data was already in the database, just not in the token
- Backend still validates permissions on every request

## 📊 Verification

- ✅ **TypeScript:** No errors (`pnpm type-check`)
- ✅ **ESLint:** No warnings (`pnpm lint`)
- ✅ **Build:** Successful

## ⚠️ Important: Users Must Re-Login

**After deploying this fix, all users need to log out and log back in** to get a new token with `roles` and `rel` fields.

Existing tokens in browser cookies will still work but won't have the new fields until they expire or user logs out.

### Auto-Fix for Existing Tokens

The token refresh endpoint (`/api/auth/refresh-token`) will preserve `roles` and `rel` if they exist, but won't add them if missing. Users with old tokens need to:
1. Log out
2. Clear browser cookies (optional but recommended)
3. Log back in

## 🎯 Expected Behavior After Fix

### Admin Users (with `admin` or `developer` role)
- ✅ Can see **all locations** via `/api/locations?showAll=true`
- ✅ Can assign **any location** to any user
- ✅ Can assign **any licensee** to any user
- ✅ See "All Licensees (Admin)" in their profile
- ✅ Never see "No Licensee Assigned" message

### Regular Users (with assigned licensees)
- ✅ See only their **assigned licensees' locations**
- ✅ See their **assigned licensees** in profile
- ✅ Can access pages for their licensees
- ✅ Cannot access other licensees' data

### Regular Users (without assigned licensees)
- ✅ See "No Licensee Assigned" message
- ✅ Cannot access protected pages
- ✅ Admin can assign licensees to them

## 📝 Lessons Learned

1. **Always verify JWT contents** - Check what's actually in the token, not just the database
2. **Test with actual tokens** - Decode JWT at jwt.io to verify fields
3. **Include all necessary fields** - If access control depends on it, it must be in the token
4. **Update refresh logic** - When adding fields to JWT, also update token refresh

---

**Status:** ✅ **FIXED - Users must re-login to get new tokens with roles and rel fields**

