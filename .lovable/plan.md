
# Fix "Verifying permissions..." Loading Flicker

## Problem

The "Verifying permissions..." loading screen appears too frequently because the role loading state (`roleLoading`) always starts as `true`, even when a valid cached role exists in localStorage. This causes a visible loading flash on every protected page navigation.

## Root Cause

```text
Current Flow (problematic):
┌─────────────────────────────────────────────────────────────────┐
│ 1. Component mounts → roleLoading = true (hardcoded)            │
│ 2. First render → Shows "Verifying permissions..." spinner      │
│ 3. useEffect runs → Checks localStorage cache                   │
│ 4. If cache valid → setRoleLoading(false)                       │
│ 5. Second render → Finally shows content                        │
└─────────────────────────────────────────────────────────────────┘
```

The cache check happens inside a `useEffect`, which runs **after** the first render. This guarantees at least one render showing the loading spinner.

## Solution

Use React's **lazy state initialization** to check localStorage **synchronously** during the initial `useState` call. If a valid cached role exists, the component never enters the loading state.

```text
Fixed Flow (instant):
┌─────────────────────────────────────────────────────────────────┐
│ 1. Component mounts → Check cache in useState initializer       │
│ 2. If cache valid → roleLoading = false, role = cachedValue     │
│ 3. First render → Shows content immediately (no spinner!)       │
│ 4. Background refresh → Updates if role changed in DB           │
└─────────────────────────────────────────────────────────────────┘
```

## Changes

### File: `src/hooks/useAuth.tsx`

1. **Create helper function** to check localStorage cache synchronously (moved outside component to avoid re-creation):

```typescript
// Helper to get cached role synchronously (for initial state)
const getCachedRoleSync = (): { role: string | null; isValid: boolean } => {
  try {
    const cachedRole = localStorage.getItem(ROLE_STORAGE_KEY);
    const timestamp = localStorage.getItem(ROLE_TIMESTAMP_KEY);
    
    if (cachedRole && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < 5 * 60 * 1000) { // 5 minutes
        return { role: cachedRole, isValid: true };
      }
    }
  } catch {
    // localStorage not available
  }
  return { role: null, isValid: false };
};
```

2. **Use lazy initialization** for `role` and `roleLoading` states:

```typescript
// Before (always starts loading):
const [role, setRole] = useState<string | null>(null);
const [roleLoading, setRoleLoading] = useState(true);

// After (uses cache if valid):
const [role, setRole] = useState<string | null>(() => {
  const cached = getCachedRoleSync();
  return cached.role;
});

const [roleLoading, setRoleLoading] = useState(() => {
  const cached = getCachedRoleSync();
  // If we have a valid cache, no loading needed initially
  return !cached.isValid;
});
```

3. **Optimize the role-fetching useEffect** to skip redundant work when cache was already applied:

```typescript
useEffect(() => {
  if (user) {
    const cachedRole = loadCachedRole();
    if (cachedRole) {
      // Only update if different from initial state
      if (role !== cachedRole) {
        setRole(cachedRole);
      }
      if (roleLoading) {
        setRoleLoading(false);
      }
      // Background refresh...
    }
    // ...
  }
}, [user, ...]);
```

## Expected Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Navigate to protected page (cache valid) | 200-500ms spinner flash | Instant content |
| Navigate to protected page (cache expired) | Spinner until DB response | Spinner until DB response |
| First visit (no cache) | Spinner until DB response | Spinner until DB response |
| Tab switch with cached role | Brief spinner flash | Instant content |

## Technical Notes

- **Lazy initialization** (`useState(() => ...)`) runs synchronously during the initial render, before any effects
- The cache is still validated in the background via the existing `fetchRole()` call
- Cross-tab synchronization remains intact via the `storage` event listener
- No changes needed to `ProtectedRoute`, `ProtectedAdminRoute`, or `DashboardRouter` - they'll automatically benefit from the faster auth context
