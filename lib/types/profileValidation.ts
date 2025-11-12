export type ProfileValidationModalData = {
  username: string;
  firstName: string;
  lastName: string;
  otherName: string;
  gender: string;
  emailAddress: string;
  phone: string;
  dateOfBirth: string;
  licenseeIds: string[];
  locationIds: string[];
};

export type ProfileValidationFormData = ProfileValidationModalData & {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};


