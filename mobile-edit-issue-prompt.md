# Fix Mobile Edit Collection Modal Greyed Out Button

**Context:**
I am working on the generic collection reporting feature. Currently, there is a bug specifically returning on **mobile devices**. When I open an *existing* report in Edit mode via the mobile UI, the **"View Collected Machines"** button is greyed out, and the machine count shows `0`. 

However, when I do the exact same thing on the **PC/desktop UI**, it works perfectly fine and shows the collected machines (e.g., "1 machine").

Both mobile and desktop use separate but similar React hooks and components for the modal state. 

**Component files:**
- **Mobile Hook**: `lib/hooks/collectionReport/useMobileEditCollectionModal.ts`
- **PC Hook**: `lib/hooks/collectionReport/useEditCollectionModal.ts`
- **Mobile Location Selector (where button is disabled)**: `components/CMS/collectionReport/mobile/CollectionReportMobileEditLocationSelector.tsx`
- **Mobile Edit Modal Container**: `components/CMS/collectionReport/modals/CollectionReportMobileEditCollectionModal.tsx`

---

### Analyze and Fix Request

Please analyze the difference between how the PC hook (`useEditCollectionModal.ts`) and the Mobile hook (`useMobileEditCollectionModal.ts`) load the initial report data and handle collected machines state. 

**To help your analysis, here is what I have found so far:**
1. In `useMobileEditCollectionModal.ts`, there is a `loadReportData` function inside a `useEffect` that runs when the modal opens. It successfully fetches the old collections via `/api/collections?locationReportId=${reportId}`. It then updates both the local `modalState` and the Zustand store `collectedMachines`. 
2. **However, there's another `useEffect` causing problems in `useMobileEditCollectionModal.ts`:**
   ```typescript
   // Fetch existing collections when modal opens
   useEffect(() => {
     if (show && locations.length > 0) {
       fetchExistingCollections(selectedLocationId);
     }
   }, [show, selectedLocationId, fetchExistingCollections, locations.length]);
   ```
3. Look at `fetchExistingCollections()`. It fetches `/api/collections?locationId=${locationId}&incompleteOnly=true`. 
4. Because we're in *Edit* mode, the machines are already "Completed" (they have an assigned `locationReportId`), so `response.data` is empty!
5. This causes the `else` block to execute: `setStoreCollectedMachines([]);`.
6. Then, another `useEffect` designed to sync the store to `modalState` sees that `collectedMachines` is suddenly `[]`, overwriting the real machines with an empty array!
7. Over in the PC version (`useEditCollectionModal.ts`), the `fetchExistingCollections` functionality does not exist, which is why it works perfectly on desktop.

**Your Instructions:**
1. Confirm if this analysis is correct.
2. Explore `useMobileEditCollectionModal.ts` for any other rogue "new collection" logic that might have accidentally been copied over to the "edit collection" hook, and outline how they should be removed or refactored.
3. Provide the exact code block modifications needed to fix `useMobileEditCollectionModal.ts` so that it doesn't accidentally wipe out its own collected machines.

**DO NOT ATTEMPT TO FIX IT YET. I am just providing you context. First, acknowledge this task, confirm the analysis makes sense, and list out your plan for checking and modifying the files.**
