# 📌 Map Modal & Locations Feature Refactor Prompt

**Goal:**  
Unify the map modal design and location data features between the dashboard and reports modules for a consistent, modern UX.

---

## 1. Dashboard Map Modal Redesign (`app/page.tsx` / `MapPreview.tsx`)

- **Update the pin modal (popup) design** in `@MapPreview.tsx` (used on the dashboard) to **match the design of the location performance map modal** from `/reports/page.tsx`.
  - This means:
    - Use the same layout, styling, and information hierarchy as the reports location modal.
    - Keep the **current dashboard map functionality** (data aggregation, filtering, navigation, etc.) unchanged—**only the modal's visual design and structure should change**.

---

## 2. Reports Location Map Data Consistency (`/reports/page.tsx`)

- **Update the location performance map in `/reports/page.tsx`** to use the **same location data features and aggregation logic as the dashboard map in `app/page.tsx`**.
  - This means:
    - Use the same data fetching, aggregation, and filtering logic for locations as the dashboard.
    - Ensure the map markers, popups, and performance calculations are consistent with the dashboard.
    - **Keep the current reports map design and modal style**—only update the data logic/features to match the dashboard.

---

## 3. Summary

- **Dashboard map:**  
  - **Design:** Use the reports modal design.
  - **Functionality:** Keep current dashboard logic.
- **Reports map:**  
  - **Design:** Keep current reports design.
  - **Functionality:** Use dashboard's location data logic.

---

**This will ensure a consistent user experience and accurate, unified data presentation across both modules.** 