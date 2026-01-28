
# Fix: FileUpload Auto-Refresh Prevention

## Problem Identified
The initialization `useEffect` in `FileUpload.tsx` can re-run unexpectedly due to unstable callback dependencies (`loadDrafts` and `recoverOrphanedUploads`). This creates a scenario where:

1. The effect runs on mount ✓
2. If any parent re-renders, the callbacks could be recreated
3. The effect runs again, resetting `isLoading` to `true`
4. Local state (like `uploadedFiles`) gets cleared

## Solution

Add a **one-time initialization guard** using a `useRef` flag to ensure the initialization logic only runs once, regardless of callback recreation.

### Files to Modify

**1. `src/pages/FileUpload.tsx`**

Add an initialization ref guard:

```typescript
const hasInitialized = useRef(false);

useEffect(() => {
  // Guard: only initialize once per mount
  if (hasInitialized.current) return;
  hasInitialized.current = true;

  const initialize = async () => {
    // ... existing initialization code
  };

  initialize();
}, []); // Remove dependencies - initialization runs once only
```

This ensures:
- Initialization runs exactly once on mount
- No re-runs from callback recreation
- Local upload state is preserved
- Draft recovery only happens once

---

## Technical Details

### Current Code (Problematic)
```typescript
useEffect(() => {
  const initialize = async () => { /* ... */ };
  initialize();
}, [loadDrafts, recoverOrphanedUploads]); // Dependencies can change
```

### Fixed Code
```typescript
const hasInitialized = useRef(false);

useEffect(() => {
  if (hasInitialized.current) return;
  hasInitialized.current = true;

  const initialize = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const existingDrafts = await loadDrafts();
      const recoveredFiles = await recoverOrphanedUploads();
      
      if (recoveredFiles.length > 0) {
        toast.info(`🔄 Recovered ${recoveredFiles.length} file(s) from previous session`);
        await loadDrafts();
      }

      if (existingDrafts.some(d => d.files.length > 0)) {
        setShowExistingDrafts(true);
      }
    } catch (error) {
      console.error('Initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  initialize();
}, []); // Empty deps - runs once, guard prevents re-runs
```

### Import Addition
```typescript
import { useState, useEffect, useCallback, useRef } from "react";
```

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Init runs | Multiple times (on callback change) | Once only |
| Upload state | Could reset | Preserved |
| Recovery toast | Could appear multiple times | Appears once |
| Dependencies | `[loadDrafts, recoverOrphanedUploads]` | `[]` with ref guard |

This is a minimal, targeted fix that addresses the root cause without changing the overall draft-first architecture.
