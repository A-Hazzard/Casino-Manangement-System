import axios from 'axios';

// Activity logging removed - handled via API calls

export type Country = {
  _id: string;
  name: string;
  alpha2: string;
  alpha3: string;
  isoNumeric: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Fetches all countries from the API
 */
export async function fetchCountries(): Promise<Country[]> {
  try {
    const response = await axios.get('/api/countries');
    if (response.data.success) {
      return response.data.countries;
    }
    throw new Error('Failed to fetch countries');
  } catch (error) {
    console.error('Error fetching countries:', error);
    throw error;
  }
}

export const createCountry = async (
  country: Omit<Country, '_id' | 'createdAt' | 'updatedAt'>
) => {
  const response = await axios.post('/api/countries', country);

  // Activity logging removed - handled via API calls

  return response.data.country;
};

export const updateCountry = async (country: Country) => {
  const response = await axios.put(`/api/countries/${country._id}`, country);

  // Activity logging removed - handled via API calls

  return response.data.country;
};

export const deleteCountry = async (id: string) => {
  const response = await axios.delete(`/api/countries/${id}`);

  // Activity logging removed - handled via API calls

  return response.data.success;
};
