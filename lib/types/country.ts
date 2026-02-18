/**
 * Country Type Definition
 */

export type Country = {
  _id: string;
  name: string;
  alpha2: string;
  alpha3: string;
  isoNumeric: string;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CountryFormData = {
  name: string;
  alpha2: string;
  alpha3: string;
  isoNumeric: string;
};
