# RAM Clear (Rollover) Validation System

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** October 29th, 2025

## Overview

The RAM Clear (RC) feature in collection reports handles meter rollover scenarios where machine meters reset to zero after reaching their maximum value. This system ensures accurate financial calculations and provides proper validation warnings to users.

## Business Context

### What is RAM Clear?

RAM Clear occurs when a machine's internal meters reach their maximum value and reset to zero. This is common in gaming machines that have limited meter storage capacity.

### Why Validation is Critical

- **Financial Accuracy**: Incorrect meter calculations lead to wrong revenue reporting
- **Data Integrity**: Prevents negative or impossible meter readings
- **User Guidance**: Helps collectors understand when rollover has occurred

## User Flow Process

### Step 1: Machine Selection

1. User selects a machine from the dropdown
2. System loads previous meter readings (`prevIn`, `prevOut`)
3. System displays current meter readings from machine

### Step 2: RAM Clear Detection

1. **Automatic Detection**: System compares current meters vs previous meters
2. **Manual Override**: User can manually check/uncheck RAM Clear checkbox
3. **Visual Indicator**: RAM Clear status is displayed prominently

### Step 3: Meter Input Validation

1. User enters current meter readings
2. System validates against RAM Clear rules
3. Real-time warnings are displayed for invalid inputs

### Step 4: Calculation Method Selection

1. **RAM Clear = FALSE**: Use standard calculation method
2. **RAM Clear = TRUE**: Use rollover calculation method
3. System applies appropriate formula automatically

### Step 5: Final Validation

1. System validates all meter values
2. Displays warnings for any inconsistencies
3. User can proceed or correct values

## Validation Rules

### Rule 1: RAM Clear = FALSE (Normal Operation)

**Expected Behavior:**

- Current meters should be **HIGHER** than previous meters
- Standard calculation: `currentMeters - previousMeters`

**Validation:**

```typescript
if (!ramClear) {
  if (currentMetersIn <= prevIn) {
    showWarning(
      'Meters In should be higher than previous reading when RAM Clear is unchecked'
    );
  }
  if (currentMetersOut <= prevOut) {
    showWarning(
      'Meters Out should be higher than previous reading when RAM Clear is unchecked'
    );
  }
}
```

**Calculation:**

```typescript
movementIn = currentMetersIn - prevIn;
movementOut = currentMetersOut - prevOut;
```

### Rule 2: RAM Clear = TRUE (Rollover Occurred)

**Expected Behavior:**

- Current meters should be **LOWER** than previous meters
- Rollover calculation: `(currentMeters - 0) + (maxMeterValue - prevMeters)`

**Validation:**

```typescript
if (ramClear) {
  if (currentMetersIn >= prevIn) {
    showWarning(
      'Meters In should be lower than previous reading when RAM Clear is checked'
    );
  }
  if (currentMetersOut >= prevOut) {
    showWarning(
      'Meters Out should be lower than previous reading when RAM Clear is checked'
    );
  }
}
```

**Calculation:**

```typescript
// For RAM Clear, we use current values directly (assuming rollover occurred)
movementIn = currentMetersIn; // Meters reset to 0, so current = movement
movementOut = currentMetersOut; // Meters reset to 0, so current = movement
```

### Rule 3: RAM Clear Coin Validation

**Expected Behavior:**

- RAM Clear coin values are usually **HIGHER** than or equal to previous values
- This is because RAM Clear represents a time range accumulation

**Validation:**

```typescript
if (ramClear) {
  if (ramClearCoinIn < prevIn) {
    showWarning('RAM Clear Coin In is usually higher than previous reading');
  }
  if (ramClearCoinOut < prevOut) {
    showWarning('RAM Clear Coin Out is usually higher than previous reading');
  }
}
```

## Mathematical Formulas

### Standard Calculation (RAM Clear = FALSE)

```
Movement In = Current Meters In - Previous Meters In
Movement Out = Current Meters Out - Previous Meters Out
Gross Revenue = Movement Out - Movement In
```

### RAM Clear Calculation (RAM Clear = TRUE)

```
Movement In = Current Meters In (meters reset to 0)
Movement Out = Current Meters Out (meters reset to 0)
Gross Revenue = Movement Out - Movement In
```

### Example Scenarios

#### Scenario 1: Normal Operation

```
Previous Meters In: 764,014
Previous Meters Out: 501,977
Current Meters In: 814,014
Current Meters Out: 531,977
RAM Clear: FALSE

Calculation:
Movement In = 814,014 - 764,014 = 50,000
Movement Out = 531,977 - 501,977 = 30,000
Gross = 30,000 - 50,000 = -20,000
```

#### Scenario 2: RAM Clear Occurred

```
Previous Meters In: 764,014
Previous Meters Out: 501,977
Current Meters In: 60,000 (rolled over)
Current Meters Out: 550,000 (rolled over)
RAM Clear: TRUE

Calculation:
Movement In = 60,000 (current value, meters reset)
Movement Out = 550,000 (current value, meters reset)
Gross = 550,000 - 60,000 = 490,000
```

#### Scenario 3: RAM Clear with Coin Values

```
Previous Meters In: 764,014
Previous Meters Out: 501,977
RAM Clear Coin In: 60,000
RAM Clear Coin Out: 550,000
Current Meters In: 50,000
Current Meters Out: 30,000
RAM Clear: TRUE

Calculation:
Movement In = (60,000 - 764,014) + (50,000 - 0) = -654,014
Movement Out = (550,000 - 501,977) + (30,000 - 0) = 78,023
Gross = 78,023 - (-654,014) = 732,037
```

## Implementation Requirements

### Frontend Validation

1. **Real-time Validation**: Validate on input change
2. **Visual Warnings**: Display clear warning messages
3. **Prevent Submission**: Block form submission with invalid data
4. **User Guidance**: Provide helpful explanations

### Backend Validation

1. **Server-side Validation**: Double-check all calculations
2. **Data Integrity**: Ensure consistent meter values
3. **Audit Trail**: Log all RAM Clear operations
4. **Error Handling**: Graceful handling of edge cases

### UI/UX Requirements

1. **Clear Indicators**: Prominent RAM Clear checkbox
2. **Warning Messages**: Contextual validation messages
3. **Help Text**: Explanatory text for users
4. **Visual Feedback**: Color coding for validation states

## Error Messages

### Validation Warnings

- "Meters In should be higher than previous reading when RAM Clear is unchecked"
- "Meters Out should be higher than previous reading when RAM Clear is unchecked"
- "Meters In should be lower than previous reading when RAM Clear is checked"
- "Meters Out should be lower than previous reading when RAM Clear is checked"
- "RAM Clear Coin In is usually higher than previous reading"
- "RAM Clear Coin Out is usually higher than previous reading"

### Error States

- **Invalid Input**: Red border, warning icon
- **Valid Input**: Green border, checkmark icon
- **Warning State**: Yellow border, warning icon

## Testing Scenarios

### Test Case 1: Normal Operation

- RAM Clear: FALSE
- Current > Previous: Should pass validation
- Current <= Previous: Should show warning

### Test Case 2: RAM Clear Operation

- RAM Clear: TRUE
- Current < Previous: Should pass validation
- Current >= Previous: Should show warning

### Test Case 3: Edge Cases

- Zero values
- Negative values
- Maximum meter values
- Invalid number formats

## Integration Points

### Collection Report Modal

- NewCollectionModal.tsx
- EditCollectionModal.tsx

### Validation Functions

- lib/helpers/collectionReportModal.ts
- lib/utils/validation.ts

### Data Models

- CollectionDocument type
- CollectionReportMachineEntry type

## Future Enhancements

1. **Automatic Detection**: AI-based RAM Clear detection
2. **Historical Analysis**: Pattern recognition for rollover prediction
3. **Machine Learning**: Improved validation accuracy
4. **Audit Reports**: RAM Clear frequency analysis
