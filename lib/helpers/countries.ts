import axios from "axios";
import type { Country } from "@/lib/types/country";
import { createActivityLogger } from "@/lib/helpers/activityLogger";

export const fetchCountries = async (): Promise<Country[]> => {
  const response = await axios.get("/api/countries");
  return response.data.countries;
};

export const createCountry = async (
  country: Omit<Country, "_id" | "createdAt" | "updatedAt">
) => {
  const countryLogger = createActivityLogger("licensee");
  
  const response = await axios.post("/api/countries", country);
  
  // Log the country creation activity
  await countryLogger.logCreate(
    response.data.country._id,
    response.data.country.name,
    country,
    `Created new country: ${country.name}`
  );
  
  return response.data.country;
};

export const updateCountry = async (country: Country) => {
  const countryLogger = createActivityLogger("licensee");
  
  const response = await axios.put(`/api/countries/${country._id}`, country);
  
  // Log the country update activity
  await countryLogger.logUpdate(
    country._id,
    country.name,
    country,
    country,
    `Updated country: ${country.name}`
  );
  
  return response.data.country;
};

export const deleteCountry = async (id: string) => {
  const countryLogger = createActivityLogger("licensee");
  
  const response = await axios.delete(`/api/countries/${id}`);
  
  // Log the country deletion activity
  await countryLogger.logDelete(
    id,
    "Unknown Country",
    { id },
    `Deleted country with ID: ${id}`
  );
  
  return response.data.success;
};
