# Add User Modal - Architecture & Design Documentation

**File**: `components/administration/AddUserModal.tsx`  
**Integration**: `app/administration/page.tsx`  
**API Endpoint**: `app/api/users/route.ts` (POST)

**Last Updated**: December 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Modal Trigger & Integration](#modal-trigger--integration)
3. [Component Architecture](#component-architecture)
4. [UI Structure Breakdown](#ui-structure-breakdown)
5. [Validation System](#validation-system)
6. [State Management](#state-management)
7. [Role-Based Permissions](#role-based-permissions)
8. [Data Flow & Submission](#data-flow--submission)
9. [Profile Picture Upload](#profile-picture-upload)
10. [Licensee & Location Management](#licensee--location-management)

---

## Overview

The Add User Modal is a comprehensive form component for creating new users in the system. It handles complete user profile creation including account information, personal details, address, identification, roles, and permissions.

### Key Features

- **Complete User Profile Creation**: Account info, personal details, address, identification
- **Profile Picture Upload**: With image cropping functionality
- **Role Assignment**: With permission-based restrictions based on creator's role
- **Licensee & Location Management**: Multi-select dropdowns with role-based filtering
- **Real-time Validation**: Debounced validation with API checks for username/email
- **Password Strength Indicator**: Visual feedback with requirements checklist
- **GSAP Animations**: Smooth modal entrance/exit animations
- **Responsive Design**: Mobile-first with desktop optimizations

---

## Modal Trigger & Integration

### Triggering the Modal

The modal is triggered from the Administration page when the "Add User" button is clicked:

```2634:2639:app/administration/page.tsx
            <Button
              onClick={openAddUserModal}
              className="flex items-center gap-2 rounded-md bg-button px-6 py-2 text-lg font-semibold text-white"
            >
              <PlusCircle className="h-4 w-4" />
              Add User
            </Button>
```

### Modal State Management

The modal state is managed in the parent component (`app/administration/page.tsx`):

```166:167:app/administration/page.tsx
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [addUserForm, setAddUserForm] = useState<AddUserForm>({
```

### Opening the Modal

```1440:1443:app/administration/page.tsx
  const openAddUserModal = () => {
    setAddUserForm({ roles: [], allowedLocations: [], licenseeIds: [] });
    setIsAddUserModalOpen(true);
  };
```

**Flow:**
1. Resets form state to empty values
2. Opens the modal by setting `isAddUserModalOpen` to `true`

### Closing the Modal

```1444:1470:app/administration/page.tsx
  const closeAddUserModal = useCallback(async () => {
    setIsAddUserModalOpen(false);
    // Refresh users data when modal is closed
    try {
      const result = await fetchUsers(
        selectedLicencee,
        1,
        itemsPerBatch,
        undefined,
        'username',
        selectedStatus as 'all' | 'active' | 'disabled' | 'deleted'
      );
      setAllUsers(result.users);
      setLoadedBatches(new Set([1]));
      setCurrentPage(0);
    } catch (error) {
      console.error('Failed to refresh users data:', error);
    }
  }, [
```

**Flow:**
1. Closes the modal
2. Refreshes the users list to show the newly created user
3. Resets pagination to first page

### Modal Component Integration

```2430:2435:app/administration/page.tsx
        <AddUserModal
          open={isAddUserModalOpen}
          onClose={closeAddUserModal}
          onSave={handleSaveAddUser}
          formState={addUserForm}
          setFormState={handleAddUserFormChange}
        />
```

**Props:**
- `open`: Controls modal visibility
- `onClose`: Callback to close modal and refresh data
- `onSave`: Handler that creates the user via API
- `formState`: Current form data
- `setFormState`: Updates form data

---

## Component Architecture

### Component Structure

```84:90:components/administration/AddUserModal.tsx
export default function AddUserModal({
  open,
  onClose,
  onSave,
  formState,
  setFormState,
}: AddUserModalProps) {
```

### Key Refs & State

```91:183:components/administration/AddUserModal.tsx
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = useUserStore(state => state.user);
  const currentUserRoles = (currentUser?.roles || []) as string[];
  const isDeveloper = currentUserRoles.includes('developer');
  const isAdmin = currentUserRoles.includes('admin') && !isDeveloper;
  const isManager =
    currentUserRoles.includes('manager') && !isAdmin && !isDeveloper;
  const isLocationAdmin =
    currentUserRoles.includes('location admin') &&
    !isAdmin &&
    !isDeveloper &&
    !isManager;

  // Filter available roles based on creator's permissions
  const availableRoles = useMemo(() => {
    if (isDeveloper) {
      // Developer can create all roles
      return ALL_ROLE_OPTIONS;
    } else if (isAdmin) {
      // Admin can create all roles except developer
      return ALL_ROLE_OPTIONS.filter(role => role.value !== 'developer');
    } else if (isManager) {
      // Manager can only create: location admin, technician, collector
      return ALL_ROLE_OPTIONS.filter(role =>
        ['location admin', 'technician', 'collector'].includes(role.value)
      );
    } else if (isLocationAdmin) {
      // Location admin can only create: technician, collector
      return ALL_ROLE_OPTIONS.filter(role =>
        ['technician', 'collector'].includes(role.value)
      );
    }
    // No roles available for other users
    return [];
  }, [isDeveloper, isAdmin, isManager, isLocationAdmin]);
  const currentUserLicenseeIds = useMemo(
    () =>
      (Array.isArray(currentUser?.assignedLicensees)
        ? currentUser.assignedLicensees
        : []
      ).map(id => String(id)),
    [currentUser?.assignedLicensees]
  );

  // Get location admin's assigned locations
  const currentUserLocationPermissions = useMemo(() => {
    // Use only new field
    let locationIds: string[] = [];
    if (
      Array.isArray(currentUser?.assignedLocations) &&
      currentUser.assignedLocations.length > 0
    ) {
      locationIds = currentUser.assignedLocations;
    }
    return locationIds.map(id => String(id));
  }, [currentUser?.assignedLocations]);

  const [isCropOpen, setIsCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [locations, setLocations] = useState<LocationSelectItem[]>([]);
  const [countries, setCountries] = useState<
    Array<{ _id: string; name: string }>
  >([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [allLicenseesSelected, setAllLicenseesSelected] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rolePermissionsDialog, setRolePermissionsDialog] = useState<{
    open: boolean;
    role: string;
    roleLabel: string;
  }>({ open: false, role: '', roleLabel: '' });
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: 'Very Weak',
    feedback: [] as string[],
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    },
  });
```

**State Categories:**
1. **UI State**: Modal visibility, crop modal, loading states
2. **Form State**: Managed via props (`formState`, `setFormState`)
3. **Validation State**: Errors, touched fields, submit attempt
4. **Async State**: Username/email checking, data loading
5. **Password State**: Strength score, requirements, feedback

---

## UI Structure Breakdown

### Modal Container

```911:920:components/administration/AddUserModal.tsx
      <div className="fixed inset-0 z-[100] flex items-end justify-center lg:items-center">
        <div
          ref={backdropRef}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <div
          ref={modalRef}
          className="relative flex h-full w-full flex-col overflow-y-auto border border-border bg-background p-4 animate-in lg:max-h-[95vh] lg:max-w-4xl lg:rounded-2xl lg:p-10"
          style={{ opacity: 1 }}
        >
```

**Structure:**
- **Backdrop**: Clickable overlay that closes modal
- **Modal Container**: Scrollable content area with responsive sizing
- **GSAP Animation**: Entrance animation on open

### 1. Header Section

```922:935:components/administration/AddUserModal.tsx
          {/* Close button */}
          <button
            className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 shadow hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-6 w-6 text-gray-700" />
          </button>

          <div className="mb-6 flex flex-col items-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Create New User
            </h2>
          </div>
```

### 2. Profile Picture Section

```944:984:components/administration/AddUserModal.tsx
              {/* Avatar - centered at top */}
              <div className="flex w-full justify-center">
                <div className="relative">
                  <Image
                    src={formState.profilePicture || defaultAvatar}
                    alt="Avatar"
                    width={120}
                    height={120}
                    className="rounded-full border-4 border-container bg-gray-200"
                  />
                  <button
                    type="button"
                    className="absolute bottom-2 right-2 flex items-center justify-center rounded-full border-2 border-border bg-white shadow transition-colors hover:bg-gray-100"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image
                      src={cameraIcon}
                      alt="Edit Avatar"
                      width={28}
                      height={28}
                      className="m-0 p-1"
                    />
                  </button>
                  {formState.profilePicture && (
                    <button
                      type="button"
                      className="absolute right-0 top-0 rounded-full bg-red-500 p-1.5 text-white transition-colors hover:bg-red-600"
                      onClick={handleRemoveProfilePicture}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
```

**Features:**
- Circular avatar display (120x120px)
- Camera icon button to upload
- Remove button (trash icon) when picture exists
- Hidden file input triggered by camera button

### 3. Account Information Section

```986:1056:components/administration/AddUserModal.tsx
              {/* Account Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Account Information
                </h3>
                <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Username: <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        autoComplete="off"
                        name="new-username"
                        id="new-username"
                        className={`w-full rounded-md border bg-white p-3 pr-10 ${
                          errors.username ? 'border-red-500' : 'border-border'
                        }`}
                        value={formState.username || ''}
                        onChange={e => {
                          setFormState({ username: e.target.value });
                          setTouched(prev => ({ ...prev, username: true }));
                        }}
                        placeholder="Enter Username"
                        required
                      />
                      {checkingUsername && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                    {errors.username && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.username}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Email Address: <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        className={`w-full rounded-md border bg-white p-3 pr-10 ${
                          errors.email ? 'border-red-500' : 'border-border'
                        }`}
                        value={formState.email || ''}
                        onChange={e => {
                          setFormState({ email: e.target.value });
                          setTouched(prev => ({ ...prev, email: true }));
                        }}
                        placeholder="Enter Email Address"
                        required
                      />
                      {checkingEmail && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
```

**Fields:**
- **Username**: Text input with real-time availability check
- **Email**: Email input with format and availability validation
- **Loading Indicators**: Spinner shown during API checks

### 4. Password Section

```1058:1196:components/administration/AddUserModal.tsx
              {/* Password Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Password
                </h3>
                <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Password: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      className={`w-full rounded-md border bg-white p-3 ${
                        errors.password ? 'border-red-500' : 'border-border'
                      }`}
                      value={formState.password || ''}
                      onChange={e => {
                        setFormState({ password: e.target.value });
                        setTouched(prev => ({ ...prev, password: true }));
                      }}
                      placeholder="Enter Password"
                      required
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.password}
                      </p>
                    )}
                    {formState.password && !errors.password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">Strength:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(level => (
                              <div
                                key={level}
                                className={`h-2 w-8 rounded ${
                                  level <= passwordStrength.score
                                    ? passwordStrength.score <= 2
                                      ? 'bg-red-500'
                                      : passwordStrength.score === 3
                                        ? 'bg-yellow-500'
                                        : 'bg-green-500'
                                    : 'bg-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-600">
                            {passwordStrength.label}
                          </span>
                        </div>
                        <ul className="list-inside list-disc text-xs text-gray-600">
                          <li
                            className={
                              passwordStrength.requirements.length
                                ? 'text-green-600'
                                : ''
                            }
                          >
                            At least 8 characters
                          </li>
                          <li
                            className={
                              passwordStrength.requirements.uppercase
                                ? 'text-green-600'
                                : ''
                            }
                          >
                            Contains an uppercase letter
                          </li>
                          <li
                            className={
                              passwordStrength.requirements.lowercase
                                ? 'text-green-600'
                                : ''
                            }
                          >
                            Contains a lowercase letter
                          </li>
                          <li
                            className={
                              passwordStrength.requirements.number
                                ? 'text-green-600'
                                : ''
                            }
                          >
                            Includes a number
                          </li>
                          <li
                            className={
                              passwordStrength.requirements.special
                                ? 'text-green-600'
                                : ''
                            }
                          >
                            Includes a special character (@$!%*?&)
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Confirm Password: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      className={`w-full rounded-md border bg-white p-3 ${
                        errors.confirmPassword
                          ? 'border-red-500'
                          : 'border-border'
                      }`}
                      value={confirmPassword}
                      onChange={e => {
                        setConfirmPassword(e.target.value);
                        setTouched(prev => ({
                          ...prev,
                          confirmPassword: true,
                        }));
                      }}
                      placeholder="Confirm Password"
                      required
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.confirmPassword}
                      </p>
                    )}
                    {confirmPassword &&
                      !errors.confirmPassword &&
                      formState.password === confirmPassword && (
                        <p className="mt-1 text-sm text-green-600">
                          ✓ Passwords match
                        </p>
                      )}
                  </div>
                </div>
              </div>
```

**Features:**
- **Password Input**: With real-time strength validation
- **Strength Indicator**: 5-bar visual indicator (red/yellow/green)
- **Requirements Checklist**: Shows which requirements are met
- **Confirm Password**: With match validation feedback

### 5. Personal Information Section

```1198:1275:components/administration/AddUserModal.tsx
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Personal Information
                </h3>
                <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      First Name: <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`w-full rounded-md border bg-white p-3 ${
                        errors.firstName ? 'border-red-500' : 'border-border'
                      }`}
                      value={formState.firstName || ''}
                      onChange={e => {
                        setFormState({ firstName: e.target.value });
                        setTouched(prev => ({ ...prev, firstName: true }));
                      }}
                      placeholder="Enter First Name"
                      required
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.firstName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Last Name: <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`w-full rounded-md border bg-white p-3 ${
                        errors.lastName ? 'border-red-500' : 'border-border'
                      }`}
                      value={formState.lastName || ''}
                      onChange={e => {
                        setFormState({ lastName: e.target.value });
                        setTouched(prev => ({ ...prev, lastName: true }));
                      }}
                      placeholder="Enter Last Name"
                      required
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">
                      Gender: <span className="text-red-500">*</span>
                    </label>
                    <select
                      className={`w-full rounded-md border bg-white p-3 ${
                        errors.gender ? 'border-red-500' : 'border-border'
                      }`}
                      value={formState.gender || ''}
                      onChange={e => {
                        setFormState({ gender: e.target.value });
                        setTouched(prev => ({ ...prev, gender: true }));
                      }}
                      required
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.gender && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.gender}
                      </p>
                    )}
                  </div>
                </div>
              </div>
```

**Fields:**
- **First Name**: Required, min 3 characters
- **Last Name**: Required, min 3 characters
- **Gender**: Required dropdown (Male/Female/Other)

### 6. Address Section

```1278:1378:components/administration/AddUserModal.tsx
            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Address</h3>
              <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Street:
                  </label>
                  <input
                    className={`w-full rounded-md border bg-white p-3 ${
                      errors.street ? 'border-red-500' : 'border-border'
                    }`}
                    value={formState.street || ''}
                    onChange={e => {
                      setFormState({ street: e.target.value });
                      setTouched(prev => ({ ...prev, street: true }));
                    }}
                    placeholder="Enter Street"
                  />
                  {errors.street && (
                    <p className="mt-1 text-sm text-red-500">{errors.street}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Town:
                  </label>
                  <input
                    className={`w-full rounded-md border bg-white p-3 ${
                      errors.town ? 'border-red-500' : 'border-border'
                    }`}
                    value={formState.town || ''}
                    onChange={e => {
                      setFormState({ town: e.target.value });
                      setTouched(prev => ({ ...prev, town: true }));
                    }}
                    placeholder="Enter Town"
                  />
                  {errors.town && (
                    <p className="mt-1 text-sm text-red-500">{errors.town}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Region:
                  </label>
                  <input
                    className={`w-full rounded-md border bg-white p-3 ${
                      errors.region ? 'border-red-500' : 'border-border'
                    }`}
                    value={formState.region || ''}
                    onChange={e => {
                      setFormState({ region: e.target.value });
                      setTouched(prev => ({ ...prev, region: true }));
                    }}
                    placeholder="Enter Region"
                  />
                  {errors.region && (
                    <p className="mt-1 text-sm text-red-500">{errors.region}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Country:
                  </label>
                  <select
                    className={`w-full rounded-md border bg-white p-3 ${
                      errors.country ? 'border-red-500' : 'border-border'
                    }`}
                    value={formState.country || ''}
                    onChange={e => {
                      setFormState({ country: e.target.value });
                      setTouched(prev => ({ ...prev, country: true }));
                    }}
                  >
                    <option value="">Select Country</option>
                    {countries.map(country => (
                      <option key={country._id} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {errors.country && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.country}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Postal Code:
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-white p-3"
                    value={formState.postalCode || ''}
                    onChange={e => setFormState({ postalCode: e.target.value })}
                    placeholder="Enter Postal Code"
                  />
                </div>
              </div>
            </div>
```

**Fields:** (All optional)
- **Street**: Letters, numbers, spaces, commas, periods
- **Town**: Letters, numbers, spaces, commas, periods
- **Region**: Letters, numbers, spaces, commas, periods
- **Country**: Dropdown from countries API
- **Postal Code**: No validation

### 7. Identification Section

```1380:1460:components/administration/AddUserModal.tsx
            {/* Identification Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Identification
              </h3>
              <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    D.O.B:
                  </label>
                  <input
                    type="date"
                    className={`w-full rounded-md border bg-white p-3 ${
                      errors.dateOfBirth ? 'border-red-500' : 'border-border'
                    }`}
                    value={formState.dateOfBirth || ''}
                    onChange={e => {
                      setFormState({ dateOfBirth: e.target.value });
                      setTouched(prev => ({ ...prev, dateOfBirth: true }));
                    }}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {errors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.dateOfBirth}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    ID Type:
                  </label>
                  <input
                    className={`w-full rounded-md border bg-white p-3 ${
                      errors.idType ? 'border-red-500' : 'border-border'
                    }`}
                    value={formState.idType || ''}
                    onChange={e => {
                      setFormState({ idType: e.target.value });
                      setTouched(prev => ({ ...prev, idType: true }));
                    }}
                    placeholder="Enter ID Type"
                  />
                  {errors.idType && (
                    <p className="mt-1 text-sm text-red-500">{errors.idType}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    ID Number:
                  </label>
                  <input
                    className={`w-full rounded-md border bg-white p-3 ${
                      errors.idNumber ? 'border-red-500' : 'border-border'
                    }`}
                    value={formState.idNumber || ''}
                    onChange={e => {
                      setFormState({ idNumber: e.target.value });
                      setTouched(prev => ({ ...prev, idNumber: true }));
                    }}
                    placeholder="Enter ID Number"
                  />
                  {errors.idNumber && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.idNumber}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-gray-900">
                    Notes:
                  </label>
                  <textarea
                    className="min-h-[56px] w-full rounded-md border border-border bg-white p-3"
                    value={formState.notes || ''}
                    onChange={e => setFormState({ notes: e.target.value })}
                    placeholder="Enter Notes"
                  />
                </div>
              </div>
            </div>
```

**Fields:** (All optional)
- **Date of Birth**: Date picker, cannot be in future
- **ID Type**: Letters and spaces only
- **ID Number**: Min 3 characters if provided
- **Notes**: Free text textarea

### 8. Roles & Permissions Section

```1462:1648:components/administration/AddUserModal.tsx
            {/* Roles & Permissions Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Roles & Permissions
              </h3>
              <div className="w-full space-y-6">
                {/* Roles Section */}
                <div>
                  <h4 className="mb-3 text-center text-lg font-semibold text-gray-900">
                    Roles <span className="text-red-500">*</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-3 md:gap-x-6">
                    {availableRoles.map(role => (
                      <div key={role.value} className="flex items-center gap-2">
                        <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm font-medium text-gray-900">
                          <Checkbox
                            id={role.value}
                            checked={(formState.roles || []).includes(
                              role.value
                            )}
                            onCheckedChange={checked =>
                              handleRoleChange(role.value, checked === true)
                            }
                            className="border-2 border-gray-400 text-blue-600 focus:ring-blue-600"
                          />
                          {role.label}
                        </label>
                        <button
                          type="button"
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setRolePermissionsDialog({
                              open: true,
                              role: role.value,
                              roleLabel: role.label,
                            });
                          }}
                          className="flex items-center justify-center rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600"
                          title={`View pages accessible to ${role.label}`}
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {errors.roles && (
                    <p className="mt-2 text-center text-sm text-red-500">
                      {errors.roles}
                    </p>
                  )}
                </div>

                {/* Licensees and Locations Container */}
                <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Licensees Section */}
                  <div className="flex flex-col">
                    <h4 className="mb-4 text-center text-lg font-semibold text-gray-900">
                      Assigned Licensees <span className="text-red-500">*</span>
                    </h4>

                    {/* For managers and location admins, show as read-only */}
                    {managerHasSingleLicensee ||
                    locationAdminHasSingleLicensee ? (
                      <div className="text-center">
                        <div className="text-gray-700">
                          {licensees.find(
                            l => String(l._id) === selectedLicenseeIds[0]
                          )?.name || 'No licensee assigned'}
                        </div>
                        <p className="mt-2 text-xs italic text-gray-500">
                          {isLocationAdmin
                            ? 'Licensee is automatically set to your assigned licensee'
                            : 'Licensee is automatically assigned based on your access'}
                        </p>
                      </div>
                    ) : managerHasMultipleLicensees ||
                      (isLocationAdmin && !canEditLicensees) ? (
                      <div className="space-y-3">
                        <label className="flex cursor-pointer items-center gap-2 text-base font-medium text-gray-900">
                          <Checkbox
                            checked={allLicenseesSelected}
                            onCheckedChange={checked =>
                              handleAllLicenseesChange(checked === true)
                            }
                            className="border-2 border-gray-400 text-blue-600 focus:ring-blue-600"
                          />
                          All Licensees
                        </label>

                        {!allLicenseesSelected && (
                          <MultiSelectDropdown
                            options={licenseeOptions}
                            selectedIds={selectedLicenseeIds}
                            onChange={handleLicenseeChange}
                            placeholder="Select licensees..."
                            searchPlaceholder="Search licensees..."
                            label="licensees"
                            showSelectAll={true}
                            disabled={
                              isLoadingAssignments ||
                              (isLocationAdmin && !canEditLicensees)
                            }
                          />
                        )}

                        {allLicenseesSelected && (
                          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-center text-sm font-medium text-green-800">
                            All {licensees.length} licensees are selected
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="flex cursor-pointer items-center gap-2 text-base font-medium text-gray-900">
                          <Checkbox
                            checked={allLicenseesSelected}
                            onCheckedChange={checked =>
                              handleAllLicenseesChange(checked === true)
                            }
                            className="border-2 border-gray-400 text-blue-600 focus:ring-blue-600"
                          />
                          All Licensees
                        </label>

                        {!allLicenseesSelected && (
                          <MultiSelectDropdown
                            options={licenseeOptions}
                            selectedIds={selectedLicenseeIds}
                            onChange={handleLicenseeChange}
                            placeholder="Select licensees..."
                            searchPlaceholder="Search licensees..."
                            label="licensees"
                            showSelectAll={true}
                            disabled={
                              isLoadingAssignments ||
                              (isLocationAdmin && !canEditLicensees)
                            }
                          />
                        )}

                        {allLicenseesSelected && (
                          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-center text-sm font-medium text-green-800">
                            All {licensees.length} licensees are selected
                          </div>
                        )}
                      </div>
                    )}
                    {errors.licenseeIds && (
                      <p className="mt-2 text-center text-sm text-red-500">
                        {errors.licenseeIds}
                      </p>
                    )}
                  </div>

                  {/* Locations Section */}
                  <div className="flex flex-col">
                    <h4 className="mb-4 text-center text-lg font-semibold text-gray-900">
                      Allowed Locations
                    </h4>

                    {/* Spacer to match checkbox height on left side - checkbox + label is ~28px */}
                    <div className="mb-[28px]">
                      {/* Invisible spacer to align dropdown with left side dropdown */}
                    </div>

                    {selectedLicenseeIds.length === 0 &&
                    !allLicenseesSelected ? (
                      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-center text-sm font-medium text-yellow-800">
                        ⚠️ Please select at least one licensee first to assign
                        locations
                      </div>
                    ) : (
                      <MultiSelectDropdown
                        options={locationOptions}
                        selectedIds={selectedLocationIds}
                        onChange={handleLocationChange}
                        placeholder="Select locations..."
                        searchPlaceholder="Search locations..."
                        label="locations"
                        showSelectAll={true}
                        disabled={isLoadingAssignments}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
```

**Features:**
- **Role Selection**: Checkboxes with info buttons for permissions
- **Licensee Assignment**: Multi-select with "All Licensees" option
- **Location Assignment**: Multi-select (requires licensee selection first)
- **Role-Based Restrictions**: Different UI based on creator's role

### 9. Form Actions

```1651:1674:components/administration/AddUserModal.tsx
            <div className="mt-8 flex justify-center gap-4 lg:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-md px-12 py-3 text-lg font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || Object.keys(errors).length > 0}
                className="rounded-md bg-button px-12 py-3 text-lg font-semibold text-white hover:bg-buttonActive disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create User'
                )}
              </Button>
            </div>
```

**Buttons:**
- **Cancel**: Closes modal without saving
- **Create User**: Submits form (disabled if errors exist or loading)

---

## Validation System

The validation system uses a multi-layered approach with real-time feedback and API checks.

### Validation Strategy

1. **Touched-Based Validation**: Only validate format after user interacts with field
2. **Submit-Based Validation**: Show required errors only after submit attempt
3. **Debounced Validation**: 300ms delay for format validation
4. **API Validation**: 500ms debounce for username/email availability

### Validation Flow

```506:753:components/administration/AddUserModal.tsx
  useEffect(() => {
    const handler = setTimeout(() => {
      const newErrors: Record<string, string> = {};
      const username = (formState.username || '').trim();
      const email = (formState.email || '').trim();
      const password = formState.password || '';
      const confirmPasswordValue = confirmPassword || '';
      const firstName = (formState.firstName || '').trim();
      const lastName = (formState.lastName || '').trim();
      const gender = (formState.gender || '').trim().toLowerCase();
      const street = (formState.street || '').trim();
      const town = (formState.town || '').trim();
      const region = (formState.region || '').trim();
      const country = (formState.country || '').trim();
      const idType = (formState.idType || '').trim();
      const idNumber = (formState.idNumber || '').trim();
      const dateOfBirth = (formState.dateOfBirth || '').trim();

      // Only validate format/pattern errors if field has been touched (user typed something)
      // Required errors only show after submit attempt
      const shouldValidateFormat = (_field: string) => touched[_field];
      const shouldValidateRequired = (_field: string) => submitAttempted;

      // Username validation (don't override API check errors)
      if (shouldValidateRequired('username') && !username) {
        newErrors.username = 'Username is required.';
      } else if (shouldValidateFormat('username') && username) {
        // Only set format errors if there's no API check error
        const hasApiError = errors.username?.includes('already taken');
        if (!hasApiError) {
          if (username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters.';
          } else if (containsEmailPattern(username)) {
            newErrors.username = 'Username cannot look like an email address.';
          } else if (containsPhonePattern(username)) {
            newErrors.username = 'Username cannot look like a phone number.';
          } else if (!validateUsername(username)) {
            newErrors.username =
              'Username may only contain letters, numbers, spaces, hyphens, and apostrophes.';
          } else if (email && username.toLowerCase() === email.toLowerCase()) {
            newErrors.username =
              'Username must be different from your email address.';
          }
        }
      }

      // Email validation (don't override API check errors)
      if (shouldValidateRequired('email') && !email) {
        newErrors.email = 'Email address is required.';
      } else if (shouldValidateFormat('email') && email) {
        // Only set format errors if there's no API check error
        const hasApiError = errors.email?.includes('already registered');
        if (!hasApiError) {
          if (!validateEmail(email)) {
            newErrors.email = 'Provide a valid email address.';
          } else if (isPlaceholderEmail(email)) {
            newErrors.email =
              'Please use a real email address. Placeholder emails like example@example.com are not allowed.';
          } else if (
            username &&
            email.toLowerCase() === username.toLowerCase()
          ) {
            newErrors.email = 'Email address must differ from your username.';
          } else if (containsPhonePattern(email)) {
            newErrors.email = 'Email address cannot resemble a phone number.';
          }
        }
      }

      // Password validation - always validate password strength if there's a value
      if (password) {
        const validation = validatePasswordStrength(password);
        if (!validation.isValid) {
          if (shouldValidateFormat('password')) {
            newErrors.password = validation.feedback.join(', ');
          }
        }
        setPasswordStrength({
          score: validation.score,
          label:
            validation.score <= 2
              ? 'Very Weak'
              : validation.score === 3
                ? 'Good'
                : 'Strong',
          feedback: validation.feedback,
          requirements: validation.requirements,
        });
      } else if (shouldValidateRequired('password')) {
        newErrors.password = 'Password is required.';
      }

      // Confirm password validation
      if (shouldValidateRequired('confirmPassword') && !confirmPasswordValue) {
        newErrors.confirmPassword = 'Please confirm your password.';
      } else if (
        shouldValidateFormat('confirmPassword') &&
        confirmPasswordValue &&
        password !== confirmPasswordValue
      ) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }

      // First name validation
      if (shouldValidateRequired('firstName') && !firstName) {
        newErrors.firstName = 'First name is required.';
      } else if (shouldValidateFormat('firstName') && firstName) {
        if (firstName.length < 3) {
          newErrors.firstName = 'First name must be at least 3 characters.';
        } else if (!validateNameField(firstName)) {
          newErrors.firstName =
            'First name may only contain letters and spaces and cannot look like a phone number.';
        }
      }

      // Last name validation
      if (shouldValidateRequired('lastName') && !lastName) {
        newErrors.lastName = 'Last name is required.';
      } else if (shouldValidateFormat('lastName') && lastName) {
        if (lastName.length < 3) {
          newErrors.lastName = 'Last name must be at least 3 characters.';
        } else if (!validateNameField(lastName)) {
          newErrors.lastName =
            'Last name may only contain letters and spaces and cannot look like a phone number.';
        }
      }

      // Gender validation
      if (shouldValidateRequired('gender') && !gender) {
        newErrors.gender = 'Gender is required.';
      } else if (
        shouldValidateFormat('gender') &&
        gender &&
        !validateOptionalGender(gender)
      ) {
        newErrors.gender = 'Select a valid gender option.';
      }

      // Street validation
      if (street && shouldValidateFormat('street')) {
        if (street.length < 3) {
          newErrors.street = 'Street address must be at least 3 characters.';
        } else if (!validateStreetAddress(street)) {
          newErrors.street =
            'Street address may only contain letters, numbers, spaces, commas, and full stops.';
        }
      }

      // Town validation
      if (town && shouldValidateFormat('town')) {
        if (town.length < 3) {
          newErrors.town = 'Town must be at least 3 characters.';
        } else if (!validateTownRegion(town)) {
          newErrors.town =
            'Town may only contain letters, numbers, spaces, commas, and full stops.';
        }
      }

      // Region validation
      if (region && shouldValidateFormat('region')) {
        if (region.length < 3) {
          newErrors.region = 'Region must be at least 3 characters.';
        } else if (!validateTownRegion(region)) {
          newErrors.region =
            'Region may only contain letters, numbers, spaces, commas, and full stops.';
        }
      }

      // Country validation
      if (country && shouldValidateFormat('country')) {
        if (country.length < 3) {
          newErrors.country = 'Country must be at least 3 characters.';
        } else if (!validateCountry(country)) {
          newErrors.country = 'Country may only contain letters and spaces.';
        }
      }

      // ID Type validation
      if (idType && shouldValidateFormat('idType')) {
        if (idType.length < 3) {
          newErrors.idType = 'ID type must be at least 3 characters.';
        } else if (!validateAlphabeticField(idType)) {
          newErrors.idType = 'ID type may only contain letters and spaces.';
        }
      }

      // ID Number validation (if provided, must be at least 3 characters)
      if (idNumber && shouldValidateFormat('idNumber') && idNumber.length < 3) {
        newErrors.idNumber = 'ID number must be at least 3 characters.';
      }

      // Date of birth validation
      if (dateOfBirth && shouldValidateFormat('dateOfBirth')) {
        if (!isValidDateInput(dateOfBirth)) {
          newErrors.dateOfBirth = 'Provide a valid date of birth.';
        } else {
          const parsedDob = new Date(dateOfBirth);
          const today = new Date();
          if (parsedDob > today) {
            newErrors.dateOfBirth = 'Date of birth cannot be in the future.';
          }
        }
      }

      // Roles validation
      if (
        shouldValidateRequired('roles') &&
        (!formState.roles || formState.roles.length === 0)
      ) {
        newErrors.roles = 'At least one role is required.';
      }

      // Licensee validation for managers
      // Licensee assignment is required for all users
      if (
        shouldValidateRequired('licenseeIds') &&
        (!formState.licenseeIds || formState.licenseeIds.length === 0)
      ) {
        newErrors.licenseeIds = 'Licensee assignment is required.';
      }

      setErrors(newErrors);
    }, 300);

    return () => clearTimeout(handler);
  }, [
    formState.username,
    formState.email,
    formState.password,
    confirmPassword,
    formState.firstName,
    formState.lastName,
    formState.gender,
    formState.street,
    formState.town,
    formState.region,
    formState.country,
    formState.idType,
    formState.idNumber,
    formState.dateOfBirth,
    formState.roles,
    formState.licenseeIds,
    isManager,
    touched,
    submitAttempted,
    errors.username,
    errors.email,
  ]);
```

### Username Validation

**Rules:**
1. **Required**: Must be provided
2. **Minimum Length**: 3 characters
3. **Format**: Letters, numbers, spaces, hyphens, apostrophes only
4. **No Email Pattern**: Cannot look like an email (e.g., `user@domain`)
5. **No Phone Pattern**: Cannot look like a phone number
6. **Uniqueness**: Checked via API (`/api/users/check-username`)
7. **Different from Email**: Must differ from email address

**API Check:**
```413:457:components/administration/AddUserModal.tsx
  useEffect(() => {
    const username = (formState.username || '').trim();

    // Check username availability
    if (
      username &&
      username.length >= 3 &&
      touched.username &&
      validateUsername(username) &&
      !containsEmailPattern(username) &&
      !containsPhonePattern(username)
    ) {
      const timeoutId = setTimeout(async () => {
        setCheckingUsername(true);
        try {
          const response = await fetch(
            `/api/users/check-username?username=${encodeURIComponent(username)}`
          );
          const data = await response.json();
          if (data.success && data.usernameExists) {
            setErrors(prev => ({
              ...prev,
              username: 'This username is already taken.',
            }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              if (newErrors.username === 'This username is already taken.') {
                delete newErrors.username;
              }
              return newErrors;
            });
          }
        } catch (error) {
          console.error('Error checking username:', error);
        } finally {
          setCheckingUsername(false);
        }
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
    setCheckingUsername(false);
    return undefined;
  }, [formState.username, touched.username]);
```

### Email Validation

**Rules:**
1. **Required**: Must be provided
2. **Format**: Valid email format (`/\S+@\S+\.\S+/`)
3. **No Placeholder**: Cannot be placeholder emails (e.g., `example@example.com`)
4. **No Phone Pattern**: Cannot resemble a phone number
5. **Uniqueness**: Checked via API (`/api/users/check-username?email=...`)
6. **Different from Username**: Must differ from username

**API Check:**
```459:504:components/administration/AddUserModal.tsx
  // Debounced email availability check
  useEffect(() => {
    const email = (formState.email || '').trim();

    // Check email availability
    if (
      email &&
      validateEmail(email) &&
      !isPlaceholderEmail(email) &&
      touched.email
    ) {
      const timeoutId = setTimeout(async () => {
        setCheckingEmail(true);
        try {
          const response = await fetch(
            `/api/users/check-username?email=${encodeURIComponent(email)}`
          );
          const data = await response.json();
          if (data.success && data.emailExists) {
            setErrors(prev => ({
              ...prev,
              email: 'This email address is already registered.',
            }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              if (
                newErrors.email === 'This email address is already registered.'
              ) {
                delete newErrors.email;
              }
              return newErrors;
            });
          }
        } catch (error) {
          console.error('Error checking email:', error);
        } finally {
          setCheckingEmail(false);
        }
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
    setCheckingEmail(false);
    return undefined;
  }, [formState.email, touched.email]);
```

### Password Validation

**Rules:**
1. **Required**: Must be provided
2. **Minimum Length**: 8 characters
3. **Uppercase**: At least one uppercase letter
4. **Lowercase**: At least one lowercase letter
5. **Number**: At least one number
6. **Special Character**: At least one special character (`@$!%*?&`)
7. **Strength Score**: 0-5 scale (requires 4+ for validity)

**Validation Function:**
```91:154:lib/utils/validation.ts
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number; // 0-4 scale
  feedback: string[];
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
} {
  const feedback: string[] = [];
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };

  let score = 0;

  if (requirements.length) {
    score++;
  } else {
    feedback.push('Password must be at least 8 characters long');
  }

  if (requirements.uppercase) {
    score++;
  } else {
    feedback.push('Password must contain at least one uppercase letter');
  }

  if (requirements.lowercase) {
    score++;
  } else {
    feedback.push('Password must contain at least one lowercase letter');
  }

  if (requirements.number) {
    score++;
  } else {
    feedback.push('Password must contain at least one number');
  }

  if (requirements.special) {
    score++;
  } else {
    feedback.push(
      'Password should contain at least one special character (@$!%*?&)'
    );
  }

  const isValid = score >= 4; // Require at least 4 out of 5 criteria

  return {
    isValid,
    score,
    feedback,
    requirements,
  };
}
```

**Confirm Password:**
- Must match password field
- Shows green checkmark when matching

### Name Validation

**First/Last Name Rules:**
1. **Required**: Must be provided
2. **Minimum Length**: 3 characters
3. **Format**: Letters and spaces only
4. **No Phone Pattern**: Cannot look like a phone number

**Validation Function:**
```220:229:lib/utils/validation.ts
export function validateNameField(value: string): boolean {
  // Allow only letters and spaces
  const allowedPattern = /^[a-zA-Z\s]+$/;

  // Check for phone number patterns
  const phonePattern =
    /^[\+]?[1-9][\d]{0,15}$|^[\+]?[(]?[\d\s\-\(\)]{7,}$|^[\+]?[1-9][\d\s\-\(\)]{6,}$/;

  return allowedPattern.test(value) && !phonePattern.test(value.trim());
}
```

### Gender Validation

**Rules:**
1. **Required**: Must be selected
2. **Valid Options**: `male`, `female`, `other`

### Address Validation

**Street/Town/Region:**
- **Optional**: Not required
- **Minimum Length**: 3 characters (if provided)
- **Format**: Letters, numbers, spaces, commas, periods

**Country:**
- **Optional**: Not required
- **Minimum Length**: 3 characters (if provided)
- **Format**: Letters and spaces only

### Identification Validation

**Date of Birth:**
- **Optional**: Not required
- **Format**: Valid date
- **Constraint**: Cannot be in the future

**ID Type:**
- **Optional**: Not required
- **Minimum Length**: 3 characters (if provided)
- **Format**: Letters and spaces only

**ID Number:**
- **Optional**: Not required
- **Minimum Length**: 3 characters (if provided)

### Roles Validation

**Rules:**
1. **Required**: At least one role must be selected
2. **Role Restrictions**: Based on creator's role (see Role-Based Permissions)

### Licensee Validation

**Rules:**
1. **Required**: At least one licensee must be assigned
2. **Auto-Assignment**: Managers/Location Admins may have auto-assigned licensees

---

## State Management

### Form State (Lifted to Parent)

The form state is managed in the parent component and passed down as props:

```39:59:lib/types/pages.ts
export type AddUserForm = {
  username?: string;
  email?: string;
  password?: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  gender?: string;
  profilePicture?: string | null;
  allowedLocations: string[];
  licenseeIds?: string[];
  street?: string;
  town?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  dateOfBirth?: string;
  idType?: string;
  idNumber?: string;
  notes?: string;
};
```

### Local State

**Validation State:**
- `errors`: Record of field errors
- `touched`: Record of touched fields
- `submitAttempted`: Whether form was submitted

**UI State:**
- `isLoading`: Form submission loading
- `checkingUsername`: Username API check in progress
- `checkingEmail`: Email API check in progress
- `isCropOpen`: Profile picture crop modal open
- `rawImageSrc`: Selected image before cropping

**Data State:**
- `licensees`: Available licensees list
- `locations`: Available locations list (filtered by selected licensees)
- `countries`: Available countries list
- `isLoadingAssignments`: Loading licensees/locations

**Password State:**
- `passwordStrength`: Strength score, label, feedback, requirements
- `confirmPassword`: Confirmation field value

**UI Controls:**
- `allLicenseesSelected`: "All Licensees" checkbox state
- `rolePermissionsDialog`: Role permissions dialog state

---

## Role-Based Permissions

### Available Roles Based on Creator

```106:127:components/administration/AddUserModal.tsx
  // Filter available roles based on creator's permissions
  const availableRoles = useMemo(() => {
    if (isDeveloper) {
      // Developer can create all roles
      return ALL_ROLE_OPTIONS;
    } else if (isAdmin) {
      // Admin can create all roles except developer
      return ALL_ROLE_OPTIONS.filter(role => role.value !== 'developer');
    } else if (isManager) {
      // Manager can only create: location admin, technician, collector
      return ALL_ROLE_OPTIONS.filter(role =>
        ['location admin', 'technician', 'collector'].includes(role.value)
      );
    } else if (isLocationAdmin) {
      // Location admin can only create: technician, collector
      return ALL_ROLE_OPTIONS.filter(role =>
        ['technician', 'collector'].includes(role.value)
      );
    }
    // No roles available for other users
    return [];
  }, [isDeveloper, isAdmin, isManager, isLocationAdmin]);
```

**Role Creation Matrix:**

| Creator Role | Can Create Roles |
|------------|------------------|
| Developer | All roles (developer, admin, manager, location admin, technician, collector) |
| Admin | All except developer (admin, manager, location admin, technician, collector) |
| Manager | location admin, technician, collector |
| Location Admin | technician, collector |
| Other | None |

### Licensee Assignment Restrictions

**Managers:**
- Auto-assigned to their licensee(s) if single licensee
- Can select from their assigned licensees if multiple

**Location Admins:**
- Auto-assigned to their licensee
- Read-only display (cannot change)

**Developers/Admins:**
- Can assign to any licensee
- "All Licensees" option available

### Location Assignment Restrictions

**Location Admins:**
- Can only assign from their assigned locations
- Filtered automatically

**Others:**
- Can assign from locations belonging to selected licensees

---

## Data Flow & Submission

### Form Submission Flow

```826:895:components/administration/AddUserModal.tsx
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    // Mark all required fields as touched to show validation
    const requiredFields = [
      'username',
      'email',
      'password',
      'confirmPassword',
      'firstName',
      'lastName',
      'gender',
      'roles',
      'licenseeIds', // Required for all users
    ];
    const newTouched: Record<string, boolean> = { ...touched };
    requiredFields.forEach(field => {
      newTouched[field] = true;
    });
    setTouched(newTouched);

    // Validate password match
    if (formState.password !== confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: 'Passwords do not match.',
      }));
      return;
    }

    // Wait a bit for validation to run (including debounced API checks)
    await new Promise(resolve => setTimeout(resolve, 600));

    // Check if there are any validation errors (including API check errors)
    if (Object.keys(errors).length > 0 || checkingUsername || checkingEmail) {
      if (checkingUsername || checkingEmail) {
        toast.error('Please wait for username/email validation to complete');
      } else {
        toast.error('Please fix the errors before submitting.');
      }
      return;
    }

    // For location admins, ensure licensee is set to their licensee
    const finalLicenseeIds =
      isLocationAdmin && currentUserLicenseeIds.length > 0
        ? currentUserLicenseeIds
        : formState.licenseeIds || [];

    // Update form state and ensure licenseeIds is set
    setFormState({
      ...formState,
      // Ensure licenseeIds is set (required for all users)
      // For location admins, use their licensee
      licenseeIds: finalLicenseeIds,
    });

    // Wait for state update to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    setIsLoading(true);
    try {
      await onSave();
    } catch (error) {
      console.error('Failed to save user:', error);
    } finally {
      setIsLoading(false);
    }
  };
```

**Steps:**
1. **Prevent Default**: Stop form submission
2. **Mark Submit Attempted**: Show required field errors
3. **Mark Required Fields as Touched**: Trigger validation
4. **Validate Password Match**: Check passwords match
5. **Wait for Validation**: Allow debounced validations to complete (600ms)
6. **Check Errors**: Verify no validation errors exist
7. **Handle Location Admin**: Auto-set licensee for location admins
8. **Update Form State**: Ensure licenseeIds is set
9. **Call onSave**: Trigger parent's save handler
10. **Handle Loading**: Show loading state during submission

### Parent Save Handler

```1476:1493:app/administration/page.tsx
  const handleSaveAddUser = useCallback(async () => {
    await administrationUtils.userManagement.createNewUser(
      addUserForm,
      setIsAddUserModalOpen,
      async () => {
        const result = await fetchUsers(
          selectedLicencee,
          1,
          itemsPerBatch,
          undefined,
          'username',
          selectedStatus as 'all' | 'active' | 'disabled' | 'deleted'
        );
        setAllUsers(result.users);
        setLoadedBatches(new Set([1]));
        setCurrentPage(0);
      }
    );
  }, [
```

### API Submission

```116:233:lib/helpers/administrationPage.ts
  createNewUser: async (
    addUserForm: AddUserForm,
    setIsAddUserModalOpen: (open: boolean) => void,
    refreshUsers: () => Promise<void>
  ) => {
    // Frontend validation
    const {
      username,
      email,
      password,
      roles,
      firstName,
      lastName,
      gender,
      profilePicture,
      licenseeIds,
      allowedLocations,
      street,
      town,
      region,
      country,
      postalCode,
      dateOfBirth,
      idType,
      idNumber,
      notes,
    } = addUserForm;

    if (!username || typeof username !== 'string') {
      toast.error('Username is required');
      return;
    }
    if (!email || !validateEmail(email)) {
      toast.error('A valid email is required');
      return;
    }
    if (!password || !validatePassword(password)) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      toast.error('At least one role is required');
      return;
    }

    // Build profile object with all fields
    const profile: Record<string, unknown> = {};
    if (firstName) profile.firstName = firstName.trim();
    if (lastName) profile.lastName = lastName.trim();
    if (gender) profile.gender = gender.trim().toLowerCase();

    // Build address object
    const address: Record<string, unknown> = {};
    if (street) address.street = street.trim();
    if (town) address.town = town.trim();
    if (region) address.region = region.trim();
    if (country) address.country = country.trim();
    if (postalCode) address.postalCode = postalCode.trim();
    if (Object.keys(address).length > 0) {
      profile.address = address;
    }

    // Build identification object
    const identification: Record<string, unknown> = {};
    if (dateOfBirth) {
      identification.dateOfBirth = new Date(dateOfBirth);
    }
    if (idType) identification.idType = idType.trim();
    if (idNumber) identification.idNumber = idNumber.trim();
    if (notes) identification.notes = notes.trim();
    if (Object.keys(identification).length > 0) {
      profile.identification = identification;
    }

    // Map to backend payload
    const payload: {
      username: string;
      emailAddress: string;
      password: string;
      roles: string[];
      profile: Record<string, unknown>;
      isEnabled: boolean;
      profilePicture: string | null;
      assignedLicensees?: string[];
      assignedLocations?: string[];
    } = {
      username,
      emailAddress: email,
      password,
      roles,
      profile,
      isEnabled: true,
      profilePicture: profilePicture || null,
    };

    // Include licensee assignments (required for all users)
    if (
      !licenseeIds ||
      !Array.isArray(licenseeIds) ||
      licenseeIds.length === 0
    ) {
      toast.error('A user must be assigned to at least one licensee');
      return;
    }
    payload.assignedLicensees = licenseeIds;

    // Include location assignments if provided
    if (
      allowedLocations &&
      Array.isArray(allowedLocations) &&
      allowedLocations.length > 0
    ) {
      payload.assignedLocations = allowedLocations;
    }

    try {
      await createUser(payload);
      setIsAddUserModalOpen(false);
      await refreshUsers();
      toast.success('User created successfully');
    } catch (err) {
      // Handle axios errors - axios wraps errors in AxiosError
      let errorMessage = 'Failed to create user';

      // Log the full error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('User creation error:', err);
      }

      if (err && typeof err === 'object') {
        // Check if it's an axios error with response data
        const axiosError = err as {
          response?: {
            data?: { message?: string; error?: string };
            status?: number;
          };
          message?: string;
        };

        // Prioritize server error message from response.data
        if (axiosError.response?.data) {
          errorMessage =
            axiosError.response.data.message ||
            axiosError.response.data.error ||
```

**Payload Structure:**
```typescript
{
  username: string;
  emailAddress: string;
  password: string;
  roles: string[];
  profile: {
    firstName?: string;
    lastName?: string;
    gender?: string;
    address?: {
      street?: string;
      town?: string;
      region?: string;
      country?: string;
      postalCode?: string;
    };
    identification?: {
      dateOfBirth?: Date;
      idType?: string;
      idNumber?: string;
      notes?: string;
    };
  };
  isEnabled: boolean;
  profilePicture: string | null;
  assignedLicensees: string[];
  assignedLocations?: string[];
}
```

### Backend API Validation

```427:576:app/api/users/route.ts
export async function POST(request: NextRequest): Promise<Response> {
  const startTime = Date.now();
  const context = apiLogger.createContext(request, '/api/users');
  apiLogger.startLogging();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    const body = await request.json();
    const {
      username,
      emailAddress,
      password,
      roles = [],
      profile = {},
      isEnabled = true,
      profilePicture = null,
      assignedLocations,
      assignedLicensees,
    } = body;

    // ============================================================================
    // STEP 3: Validate required fields
    // ============================================================================
    if (!username || typeof username !== 'string') {
      apiLogger.logError(
        context,
        'User creation failed',
        'Username is required'
      );
      return new Response(
        JSON.stringify({ success: false, message: 'Username is required' }),
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Validate email format
    // ============================================================================
    if (!emailAddress || !validateEmail(emailAddress)) {
      apiLogger.logError(
        context,
        'User creation failed',
        'Valid email is required'
      );
      return new Response(
        JSON.stringify({ success: false, message: 'Valid email is required' }),
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 5: Validate password strength
    // ============================================================================
    if (!password) {
      apiLogger.logError(
        context,
        'User creation failed',
        'Password is required'
      );
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Password is required',
        }),
        { status: 400 }
      );
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      apiLogger.logError(
        context,
        'User creation failed',
        `Password requirements not met: ${passwordValidation.feedback.join(
          ', '
        )}`
      );
      return new Response(
        JSON.stringify({
          success: false,
          message: `Password requirements not met: ${passwordValidation.feedback.join(
            ', '
          )}`,
        }),
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 6: Create user via helper function
    // ============================================================================
    const userWithoutPassword = await createUserHelper(
      {
        username,
        emailAddress,
        password,
        roles,
        profile,
        isEnabled,
        profilePicture,
        assignedLocations,
        assignedLicensees,
      },
      request
    );

    // ============================================================================
    // STEP 7: Return created user data
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Users API] POST completed in ${duration}ms`);
    }

    apiLogger.logSuccess(
      context,
      `Successfully created user ${username} with email ${emailAddress}`
    );
    return new Response(
      JSON.stringify({ success: true, user: userWithoutPassword }),
      { status: 201 }
    );
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Users API] POST error after ${duration}ms:`, errorMsg);
    apiLogger.logError(context, 'User creation failed', errorMsg);

    const isConflictError =
      errorMsg === 'Username already exists' ||
      errorMsg === 'Email already exists' ||
      errorMsg === 'Username and email already exist';

    return new Response(
      JSON.stringify({
        success: false,
        message: isConflictError ? errorMsg : 'User creation failed',
        error: errorMsg,
      }),
      { status: isConflictError ? 409 : 500 }
    );
  }
}
```

**Backend Validation:**
1. **Username**: Required, string type
2. **Email**: Required, valid format
3. **Password**: Required, meets strength requirements (4/5 criteria)
4. **Uniqueness**: Checked in `createUserHelper` (username/email conflicts return 409)

---

## Profile Picture Upload

### File Selection

```755:765:components/administration/AddUserModal.tsx
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        setRawImageSrc(e.target?.result as string);
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };
```

**Flow:**
1. User selects image file
2. FileReader reads file as data URL
3. Sets raw image source
4. Opens crop modal

### Image Cropping

```771:775:components/administration/AddUserModal.tsx
  const handleCropComplete = (croppedImageUrl: string) => {
    setFormState({ profilePicture: croppedImageUrl });
    setIsCropOpen(false);
    setRawImageSrc(null);
  };
```

**Flow:**
1. User crops image in `CircleCropModal`
2. Cropped image URL (base64) returned
3. Updates form state with cropped image
4. Closes crop modal

### Remove Profile Picture

```767:769:components/administration/AddUserModal.tsx
  const handleRemoveProfilePicture = () => {
    setFormState({ profilePicture: null });
  };
```

**Flow:**
1. User clicks remove button
2. Sets profile picture to `null`
3. Avatar displays default image

### Crop Modal Integration

```1679:1690:components/administration/AddUserModal.tsx
      {/* Profile Picture Cropping Modal */}
      {isCropOpen && rawImageSrc && (
        <CircleCropModal
          open={isCropOpen}
          onClose={() => {
            setIsCropOpen(false);
            setRawImageSrc(null);
          }}
          imageSrc={rawImageSrc}
          onCropped={handleCropComplete}
        />
      )}
```

---

## Licensee & Location Management

### Licensee Loading

```269:330:components/administration/AddUserModal.tsx
  // Load licensees - only when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadLicensees = async () => {
      setIsLoadingAssignments(true);
      try {
        const result = await fetchLicensees();
        if (cancelled) return;

        // Extract licensees array from the result
        let lics = Array.isArray(result.licensees) ? result.licensees : [];

        if (isManager && currentUserLicenseeIds.length > 0) {
          lics = lics.filter(lic =>
            currentUserLicenseeIds.includes(String(lic._id))
          );
        }

        // For location admins, filter to only show their licensee and auto-set it
        if (isLocationAdmin && currentUserLicenseeIds.length > 0) {
          lics = lics.filter(lic =>
            currentUserLicenseeIds.includes(String(lic._id))
          );
          // Auto-set the licensee for location admins
          if (lics.length > 0 && !cancelled) {
            setFormState({ ...formState, licenseeIds: [String(lics[0]._id)] });
            setAllLicenseesSelected(false);
          }
        }

        setLicensees(lics);

        if (isManager && lics.length === 1 && !cancelled) {
          setFormState({ ...formState, licenseeIds: [String(lics[0]._id)] });
          setAllLicenseesSelected(false);
        }
      } catch (error) {
        console.error('Error loading licensees:', error);
      } finally {
        if (!cancelled) {
          setIsLoadingAssignments(false);
        }
      }
    };

    void loadLicensees();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    setFormState,
    formState,
    setAllLicenseesSelected,
    setLicensees,
    setIsLoadingAssignments,
    isManager,
    currentUserLicenseeIds,
    isLocationAdmin,
  ]);
```

**Behavior:**
- **Managers**: Filtered to their assigned licensees, auto-set if single
- **Location Admins**: Filtered to their licensee, auto-set
- **Developers/Admins**: All licensees available

### Location Loading

```332:409:components/administration/AddUserModal.tsx
  // Load locations based on selected licensees
  useEffect(() => {
    if (!open || !formState.licenseeIds || formState.licenseeIds.length === 0) {
      setLocations([]);
      return;
    }

    let cancelled = false;

    const loadLocations = async () => {
      try {
        // Build query params for multiple licensees
        const params = new URLSearchParams();
        if (formState.licenseeIds && formState.licenseeIds.length > 0) {
          // Use gaming-locations endpoint which supports multiple licensees
          params.append('licensees', formState.licenseeIds.join(','));
        }

        const response = await fetch(
          `/api/gaming-locations?${params.toString()}`
        );
        if (cancelled) return;

        if (!response.ok) {
          throw new Error('Failed to fetch locations');
        }

        const data = await response.json();
        if (cancelled) return;

        // Handle both response formats: direct array or { success: true, data: [...] }
        let locationsArray: LocationSelectItem[] = [];
        if (Array.isArray(data)) {
          locationsArray = data;
        } else if (data.data && Array.isArray(data.data)) {
          locationsArray = data.data;
        } else if (data.locations && Array.isArray(data.locations)) {
          locationsArray = data.locations;
        }

        // Map to LocationSelectItem format
        let formattedLocations: LocationSelectItem[] = locationsArray.map(
          (loc: {
            _id?: unknown;
            id?: unknown;
            name?: string;
            licenseeId?: unknown;
          }) => ({
            _id: String(loc._id || loc.id),
            name: loc.name || '',
            licenseeId: loc.licenseeId ? String(loc.licenseeId) : null,
          })
        );

        // Filter locations for location admins - only show their assigned locations
        if (isLocationAdmin && currentUserLocationPermissions.length > 0) {
          formattedLocations = formattedLocations.filter(loc =>
            currentUserLocationPermissions.includes(loc._id)
          );
        }

        setLocations(formattedLocations);
      } catch (error) {
        console.error('Error loading locations:', error);
        setLocations([]);
      }
    };

    void loadLocations();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    formState.licenseeIds,
    isLocationAdmin,
    currentUserLocationPermissions,
  ]);
```

**Behavior:**
- **Trigger**: Loads when licensees are selected
- **API**: Fetches locations for selected licensees
- **Location Admins**: Filtered to their assigned locations
- **Format**: Handles multiple API response formats

### Licensee Change Handlers

```787:802:components/administration/AddUserModal.tsx
  const handleAllLicenseesChange = (checked: boolean) => {
    if (checked) {
      setAllLicenseesSelected(true);
      setFormState({ licenseeIds: licensees.map(l => String(l._id)) });
    } else {
      setAllLicenseesSelected(false);
      setFormState({ licenseeIds: [] });
    }
    setTouched(prev => ({ ...prev, licenseeIds: true }));
  };

  const handleLicenseeChange = (selectedIds: string[]) => {
    setAllLicenseesSelected(false);
    setFormState({ licenseeIds: selectedIds });
    setTouched(prev => ({ ...prev, licenseeIds: true }));
  };

  const handleLocationChange = (selectedIds: string[]) => {
    setFormState({ allowedLocations: selectedIds });
  };
```

**Handlers:**
- **All Licensees**: Selects/deselects all licensees
- **Licensee Change**: Updates selected licensees, triggers location reload
- **Location Change**: Updates selected locations

---

## Summary

The Add User Modal is a comprehensive form component that handles complete user creation with:

1. **Multi-Section Form**: Account info, password, personal details, address, identification, roles/permissions
2. **Real-Time Validation**: Debounced format validation + API uniqueness checks
3. **Password Strength**: Visual indicator with requirements checklist
4. **Profile Picture**: Upload with cropping functionality
5. **Role-Based Restrictions**: Different available roles based on creator
6. **Licensee/Location Management**: Multi-select with role-based filtering
7. **GSAP Animations**: Smooth modal entrance/exit
8. **Responsive Design**: Mobile-first with desktop optimizations

The validation system ensures data integrity with client-side checks and server-side verification, while the role-based permissions system maintains proper access control throughout the user creation process.
