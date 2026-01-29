
# Fix: Role Race Condition in Protected Routes

## Problem
After removing the "Verifying permissions..." loading screen, protected routes now show "Access Denied" before the role has been fetched from the database. This happens when:
- The localStorage cache is empty or expired
- The role is still being fetched (`roleLoading = true`)
- But the `loading` check (auth only) passes, so the route renders
- At that moment, `role` is `null`, triggering the "Access Denied" screen

## Solution
Keep the `roleLoading` check but **return `null`** instead of showing a loading spinner. This preserves the seamless experience while preventing the false "Access Denied" error.

## Changes

### File: `src/components/ProtectedRoute.tsx`

**Before:**
```typescript
if (loading) {
  return null;
}
```

**After:**
```typescript
// Wait for auth AND role loading - return null for seamless experience
if (loading || roleLoading) {
  return null;
}
```

### File: `src/pages/DashboardRouter.tsx`

**Before:**
```typescript
if (loading) {
  return null;
}
```

**After:**
```typescript
// Wait for auth AND role loading to prevent false "no role" state
if (loading || roleLoading) {
  return null;
}
```

### File: `src/components/ProtectedAdminRoute.tsx`

No changes needed - it already correctly handles the verification flow.

## Expected Behavior

| Scenario | Before (Broken) | After (Fixed) |
|----------|-----------------|---------------|
| Valid cache exists | ✅ Instant access | ✅ Instant access |
| Cache expired, DB has role | ❌ Shows "Access Denied" briefly | ✅ Brief blank, then access |
| No role in DB | ✅ Shows "Access Denied" | ✅ Shows "Access Denied" |

The key difference: returning `null` during `roleLoading` prevents the false negative where a user with a valid role sees "Access Denied" because the fetch hasn't completed yet.

## Technical Note
The lazy initialization (`getCachedRoleSync`) ensures that **most of the time** users with a valid cache won't see any delay. This fix only affects the edge case where the cache is empty or expired.
