# Mobile Collection Modal Design Prompt

## Overview
Design a mobile-first collection modal component for the Evolution One CMS collection report system. This component should provide an intuitive mobile experience for creating collection reports with slide-up interactions.

## Requirements

### 1. Mobile-First Design
- **Responsive**: Optimized for mobile devices (phones, tablets)
- **Touch-friendly**: Large touch targets, easy navigation
- **Slide-up interactions**: Forms and lists should slide up from bottom
- **Full-screen on mobile**: Take advantage of mobile screen real estate

### 2. Core Functionality
- **Location Selection**: Tap to select a location
- **Machine Selection**: Tap to select machines from the selected location
- **Data Entry Form**: Slide-up form for entering collection data
- **Machine List**: Slide-up list showing collected machines
- **Create Collection Report**: Single purple button to create the report

### 3. User Flow
1. **Default View**: Show locations and machines in a grid/list
2. **Location Selection**: Tap location to filter machines
3. **Machine Selection**: Tap machine to slide up data entry form
4. **Form Interaction**: Fill out collection data and tap "Add to List"
5. **List View**: Tap list button to slide up collected machines list
6. **Create Report**: Tap purple "Create Collection Report" button

### 4. Slide-Up Interactions
- **Form Slide-up**: When machine is selected, form slides up from bottom
- **List Slide-up**: When "Show List" is tapped, list slides up from bottom
- **Close Actions**: Swipe down or tap close button to hide slide-ups
- **Smooth Animations**: Use CSS transitions or Framer Motion for smooth animations

### 5. Visual Design
- **Modern UI**: Clean, modern design with proper spacing
- **Color Scheme**: Use the existing color palette (purple primary, blue accents)
- **Typography**: Clear, readable fonts with proper hierarchy
- **Icons**: Use Lucide React icons for consistency
- **Cards**: Use card-based layout for better organization

### 6. Form Fields
- **Collection Time**: Date/time picker
- **Meters In/Out**: Number inputs with validation
- **RAM Clear**: Checkbox with conditional fields
- **Notes**: Text area for machine-specific notes
- **Financial Fields**: Taxes, advance, variance, etc.

### 7. Technical Requirements
- **React Component**: TypeScript functional component
- **State Management**: Use React hooks for state
- **API Integration**: Connect to existing collection APIs
- **Validation**: Form validation with error messages
- **Loading States**: Show loading indicators during API calls
- **Error Handling**: Proper error handling with toast notifications

### 8. Accessibility
- **Keyboard Navigation**: Support keyboard navigation
- **Screen Reader**: Proper ARIA labels and descriptions
- **Focus Management**: Proper focus management for slide-ups
- **Touch Gestures**: Support swipe gestures for closing slide-ups

### 9. Performance
- **Lazy Loading**: Load data as needed
- **Optimized Rendering**: Use React.memo and useMemo where appropriate
- **Smooth Animations**: 60fps animations for slide-ups
- **Memory Management**: Proper cleanup of event listeners

### 10. Integration
- **Existing APIs**: Use existing collection and machine APIs
- **State Management**: Integrate with existing state management
- **Styling**: Use existing Tailwind CSS classes and design system
- **Components**: Reuse existing UI components where possible

## File Structure
```
components/collectionReport/mobile/
├── MobileCollectionModal.tsx          # Main mobile modal component
├── LocationSelector.tsx               # Location selection component
├── MachineSelector.tsx                # Machine selection component
├── MachineDataForm.tsx                # Slide-up data entry form
├── CollectedMachinesList.tsx          # Slide-up machines list
├── MobileCollectionModalSkeleton.tsx  # Loading skeleton
└── index.ts                          # Export file
```

## Key Features to Implement
1. **Slide-up Form**: Animated form that slides up when machine is selected
2. **Slide-up List**: Animated list that slides up to show collected machines
3. **Touch Gestures**: Swipe down to close slide-ups
4. **Responsive Grid**: Responsive grid for locations and machines
5. **Form Validation**: Real-time validation with error messages
6. **Loading States**: Skeleton loaders and loading indicators
7. **Error Handling**: Toast notifications for errors
8. **Accessibility**: Full keyboard and screen reader support

## Design Inspiration
- **Mobile Banking Apps**: Clean, card-based design
- **E-commerce Apps**: Smooth slide-up interactions
- **Form Apps**: Intuitive form design with validation
- **Dashboard Apps**: Clear data visualization

## Success Criteria
- ✅ Smooth slide-up animations
- ✅ Intuitive touch interactions
- ✅ Fast loading and responsive
- ✅ Accessible to all users
- ✅ Consistent with existing design system
- ✅ Proper error handling and validation
- ✅ Clean, modern mobile UI

---

**Author**: Aaron Hazzard - Senior Software Engineer  
**Last Updated**: August 29th, 2025

