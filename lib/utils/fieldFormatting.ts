/**
 * Formats field names for display in forms and modals
 * @param field - The field name to format
 * @returns Human-readable field name
 */
export function formatFieldName(field: string): string {
  // Handle common field names with better labels
  const fieldLabels: { [key: string]: string } = {
    // Date fields
    startDate: "Start Date",
    expiryDate: "Expiry Date",
    endDate: "End Date",
    dateOfBirth: "Date of Birth",
    createdAt: "Created At",
    updatedAt: "Updated At",
    timestamp: "Timestamp",
    lastEdited: "Last Edited",
    // User fields
    username: "Username",
    emailAddress: "Email Address",
    firstName: "First Name",
    lastName: "Last Name",
    middleName: "Middle Name",
    otherName: "Other Name",
    profilePicture: "Profile Picture",
    isEnabled: "Account Status",
    // Licensee fields
    licenseKey: "License Key",
    isPaid: "Payment Status",
    prevStartDate: "Previous Start Date",
    prevExpiryDate: "Previous Expiry Date",
    // Common fields
    name: "Name",
    description: "Description",
    country: "Country",
    roles: "Roles",
    gender: "Gender",
    // Nested fields
    "address.street": "Street Address",
    "address.town": "Town/City",
    "address.region": "Region/State",
    "address.country": "Country",
    "address.postalCode": "Postal Code",
    "identification.dateOfBirth": "Date of Birth",
    "identification.idType": "ID Type",
    "identification.idNumber": "ID Number",
    "identification.notes": "Notes",
  };

  // Check if it's a known field
  if (fieldLabels[field]) {
    return fieldLabels[field];
  }

  // Convert camelCase and dot notation to readable format
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/\./g, " → ")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
} 