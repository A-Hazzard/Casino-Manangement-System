# PC Dashboard Layout Specification

## Overview
This specification details the required layout for the **PC/Desktop view** of the Evolution CMS Dashboard. The mobile view is working correctly and should remain unchanged - this specification only applies to desktop layouts (xl: breakpoint and above).

## Current Issue
The current PC view is displaying the mobile layout instead of the proper desktop layout shown in the reference image. The PC view should have a two-column layout with the sidebar on the far left and the main content divided into left and right sections.

## Target Layout Structure

### **Overall Layout**
```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar │ Left Section (60%) │ Right Section (40%) │
│         │                    │                      │
│         │ Dashboard Title    │ Online/Offline      │
│         │ Date Filters       │ Map Preview         │
│         │ Metrics Text       │ Top Performing      │
│         │ 3 Metric Cards     │                     │
│         │ Trend Chart        │                     │
└─────────────────────────────────────────────────────────────┘
```

### **Left Section (Dashboard Content) - 60% Width**
**Top to Bottom Layout:**

1. **Dashboard Title Section**
   - Large "Dashboard" title with chart icon
   - Positioned at the top of the left section
   - Font size: text-3xl or text-4xl
   - Icon: Bar chart with upward trend

2. **Date Filter Controls**
   - Row of filter buttons: "Today", "Yesterday", "Last 7 days", "30 days", "All Time", "Custom"
   - Positioned directly below the dashboard title
   - "Today" should be highlighted in purple (`bg-buttonActive`)
   - Other buttons in green (`bg-green-500`)
   - Horizontal layout with proper spacing

3. **Metrics Description Text**
   - Text: "Total for all Locations and Machines"
   - Positioned below the date filters
   - Font size: text-lg
   - Color: text-gray-700

4. **Three Metric Cards (Horizontal Row)**
   - **Wager Card**: Shows "$1,515,837.00" with purple accent line
   - **Games Won Card**: Shows "$1,507,716.85" with green accent line  
   - **Gross Card**: Shows "$8,120.15" with orange accent line
   - Cards should be equal width, side by side
   - Each card has a colored accent line at the top
   - Rounded corners and subtle shadows
   - Responsive text sizing

5. **Trend Chart Section**
   - Large multi-area chart spanning the full width
   - Shows trends over months (Jan, Feb, Mar, Apr, May, Jun, Aug, Sep)
   - Uses multiple overlapping semi-transparent colors:
     - Purple (`#8b5cf6`)
     - Light blue (`#3b82f6`)
     - Orange (`#f97316`)
     - Darker brown/orange (`#ea580c`)
   - Positioned below the metric cards
   - Responsive height (should fill available space)

### **Right Section (Map & Status) - 40% Width**
**Top to Bottom Layout:**

1. **Online/Offline Status Widget**
   - Card showing real-time machine status
   - Displays "17 Online" (green text) and "05 Offline" (red text)
   - Positioned at the top of the right section
   - Rounded corners and subtle shadow
   - Icon: Computer monitor icon

2. **Map Preview Section**
   - Large interactive map showing Trinidad
   - Multiple red pin markers scattered across the island
   - Map controls on the left side:
     - "+" button for zoom in
     - "-" button for zoom out
     - Fullscreen icon
   - Positioned below the status widget
   - Responsive height

3. **Top Performing Section**
   - **Header**: "Top Performing" with "Sort by: Last 7 Days" dropdown
   - **Tabs**: "Locations" and "Cabinets" (Cabinets tab selected/highlighted in purple)
   - **Content**: Large donut chart with legend
   - **Legend**: Shows cabinet types with colored squares:
     - Mixtura (light green) - "5/10"
     - Fastlime (light blue)
     - Strikeys (orange)
     - Big Shot (dark blue)
     - Fresh (red)
   - Positioned at the bottom of the right section
   - Rounded corners and proper spacing

## Technical Implementation

### **Grid System**
```css
/* Main container */
.dashboard-container {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1.5rem;
}

/* Content area */
.content-area {
  display: grid;
  grid-template-columns: 60% 40%;
  gap: 1.5rem;
}
```

### **Responsive Behavior**
- This layout should **only** apply to PC/desktop (xl: breakpoint and above)
- Mobile should use the existing MobileLayout component unchanged
- The layout should be hidden on mobile with `hidden xl:block`
- Mobile view is working correctly and should remain as-is

### **Component Structure**
```jsx
<div className="hidden xl:block">
  <div className="grid grid-cols-2 gap-6">
    {/* Left Section */}
    <div className="space-y-6">
      {/* Dashboard Title */}
      {/* Date Filters */}
      {/* Metrics Text */}
      {/* 3 Metric Cards */}
      {/* Trend Chart */}
    </div>
    
    {/* Right Section */}
    <div className="space-y-6">
      {/* Online/Offline Status */}
      {/* Map Preview */}
      {/* Top Performing */}
    </div>
  </div>
</div>
```

### **Color Scheme**
- **Primary Purple**: `#8b5cf6` (buttonActive)
- **Green**: `#22c55e` (positive metrics, online status)
- **Orange**: `#f97316` (gross metrics, chart elements)
- **Red**: `#ef4444` (offline status, negative indicators)
- **Blue**: `#3b82f6` (chart elements, secondary highlights)
- **Light Green**: `#86efac` (Mixtura cabinet)
- **Light Blue**: `#93c5fd` (Fastlime cabinet)
- **Dark Blue**: `#1e40af` (Big Shot cabinet)

## Key Requirements

1. **Mobile View Preservation**: The mobile view is working correctly and should remain completely unchanged
2. **PC-Only Changes**: All layout changes should only apply to desktop (xl: breakpoint)
3. **Responsive Design**: The layout should be responsive within the desktop breakpoint
4. **Component Reuse**: Reuse existing components where possible (Chart, MapPreview, etc.)
5. **Performance**: Maintain good performance with proper loading states
6. **Accessibility**: Ensure proper ARIA labels and keyboard navigation

## Files to Modify
- `components/layout/PcLayout.tsx` - Main layout structure
- `app/page.tsx` - Ensure proper component usage
- CSS classes and Tailwind utilities as needed

## Success Criteria
- PC view matches the reference image exactly
- Mobile view remains unchanged and functional
- All interactive elements work properly
- Layout is responsive within desktop breakpoints
- Performance is maintained
- No breaking changes to existing functionality 