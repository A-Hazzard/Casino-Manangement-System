# Tab and URL Synchronization Implementation Guide

## Problem Statement

The location details page (`app/locations/[slug]/page.tsx`) needs to support two views:
1. **Machines Tab** - Shows machine/cabinet data (default view)
2. **Members Tab** - Shows membership data (only if location has membership enabled and has members)

The page should:
- Allow users to switch between tabs
- Sync the active tab with the URL query parameters (`?tab=members` or `?tab=machines`)
- Handle direct navigation to URLs with tab parameters
- Redirect to machines tab if members tab is accessed but location has no members
- Prevent infinite redirect loops

## Current Issues

The previous implementation had several problems:

1. **Race Conditions**: Multiple `useEffect` hooks were trying to sync URL and state simultaneously, causing conflicts
2. **Infinite Loops**: URL updates triggered state changes, which triggered URL updates, creating redirect loops
3. **Loading State Conflicts**: The logic waited for data to load before setting the view, causing incorrect content to display during loading
4. **Complex Dependencies**: Multiple effects with overlapping dependencies made it difficult to reason about the flow

## Implementation Approach

### Key Principles

1. **Single Source of Truth**: The URL should be the source of truth for the initial state, but user interactions should update state first, then sync to URL
2. **One-Way Data Flow**: 
   - URL → State (on initial load)
   - State → URL (on user interaction)
3. **Prevent Loops**: Use refs to track when updates are in progress and prevent circular updates
4. **Handle Loading States**: Set the view immediately based on URL, even if data is still loading

### Recommended Solution Architecture

The key is to establish a clear **one-way data flow** and **single source of truth**:

1. **URL as Initial Source of Truth**:
   - On component mount, read URL params ONCE
   - Set initial `activeView` state immediately based on URL (don't wait for any data)
   - Use a ref to track that initial read has happened
   - Default to 'machines' if no tab parameter exists

2. **State as Source of Truth for User Interactions**:
   - When user clicks a tab button, update `activeView` state immediately
   - Use a separate effect that watches `activeView` (not URL) to sync URL
   - This effect should only run AFTER initial mount (use a ref flag)
   - Check if URL already matches before updating to prevent unnecessary updates

3. **Data Validation (After Initial Load)**:
   - After membership data loads, validate if the current view is appropriate
   - If `tab=members` but location has no members, update state to 'machines' and URL accordingly
   - This should only happen once after data loads, not continuously

4. **Prevent Loops**:
   - Use refs to track when updates are in progress
   - URL sync effect should NOT depend on URL params (only on state)
   - Initial URL read effect should NOT update URL (only read it)
   - Use `window.history.replaceState` instead of `pushState` to avoid history entries

### Critical Implementation Details

**Initial Mount Flow**:
1. Component mounts
2. Read URL params (use `useSearchParams()` or `window.location.search`)
3. Set `activeView` based on URL param (default to 'machines' if none)
4. Mark initialization complete with a ref
5. Don't update URL during this phase

**User Interaction Flow**:
1. User clicks tab button
2. Update `activeView` state immediately
3. URL sync effect detects state change
4. Check if URL already matches (prevent unnecessary updates)
5. Update URL using `window.history.replaceState`
6. Use ref to prevent this URL update from triggering state changes

**Data Validation Flow**:
1. Membership data finishes loading
2. Check if current `activeView` is 'members' but location has no members
3. If invalid, update `activeView` to 'machines'
4. URL sync effect will automatically update URL
5. Only run this check once after data loads (use a ref to track)

**Browser Navigation Flow**:
1. User clicks browser back/forward button
2. URL changes (but React doesn't automatically re-render)
3. Use `popstate` event listener or Next.js router events to detect URL changes
4. Read new URL params and update `activeView` state
5. Use ref to prevent this from triggering URL sync effect

### Implementation Steps

1. **Remove all URL sync logic temporarily** (current state)
2. **Implement URL reading on mount**:
   - Read `tab` parameter from URL
   - Set initial `activeView` state based on URL
   - Don't wait for any data to load

3. **Add data validation effect**:
   - After membership stats load, validate if members tab should be accessible
   - Redirect if needed

4. **Add user interaction handler**:
   - Update state when user clicks tab
   - Sync URL after state update (using a separate effect)

5. **Add URL sync effect**:
   - Only sync URL when state changes (not when URL changes)
   - Use ref to prevent loops

### Key Considerations

- **Loading States**: Don't wait for data to load before setting the view - set it immediately based on URL
- **Race Conditions**: Use refs to track update state and prevent simultaneous updates
- **User Experience**: Show loading skeletons in the correct tab, not the wrong tab
- **Edge Cases**: Handle cases where membership data loads but shows 0 members, or membership is disabled

### Testing Checklist

- [ ] Direct navigation to `/locations/[id]?tab=members` shows members tab immediately
- [ ] Direct navigation to `/locations/[id]?tab=members` redirects to machines if no members
- [ ] Clicking tab buttons updates URL correctly
- [ ] No infinite redirect loops occur
- [ ] Browser back/forward buttons work correctly
- [ ] Page refresh maintains correct tab
- [ ] Switching locations resets to machines tab

## Current Status

**Status**: All URL/tab synchronization logic has been completely removed. The page currently always shows the members tab regardless of URL parameters or location membership status. This is a temporary state to prevent bugs while proper implementation is being developed.

**Why This Was Necessary**: The previous implementation caused infinite redirect loops and race conditions that made the page unusable. All URL manipulation code has been removed to provide a stable baseline.

**Next Steps**: Implement proper URL synchronization following the approach outlined above, ensuring:
- No infinite loops
- Proper handling of loading states
- Correct behavior with browser navigation
- Edge case handling (no members, membership disabled, etc.)
