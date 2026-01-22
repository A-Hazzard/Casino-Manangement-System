export type Licensee = {
  _id: string;
  name: string;
  description?: string;
  country: string;
  countryName?: string; // For populated country name
  startDate?: Date | string;
  expiryDate?: Date | string;
  prevStartDate?: Date | string;
  prevExpiryDate?: Date | string;
  isPaid?: boolean;
  lastEdited?: Date | string;
  deletedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  geoCoords?: {
    latitude?: number;
    longitude?: number;
    zoomRatio?: number;
  };
};

