import axios from "axios";
import type { Country } from "@/lib/types/country";

export const fetchCountries = async (): Promise<Country[]> => {
  const response = await axios.get("/api/countries");
  return response.data.countries;
};

export const createCountry = async (
  country: Omit<Country, "_id" | "createdAt" | "updatedAt">
) => {
  const response = await axios.post("/api/countries", country);
  return response.data.country;
};

export const updateCountry = async (country: Country) => {
  const response = await axios.put(`/api/countries/${country._id}`, country);
  return response.data.country;
};

export const deleteCountry = async (id: string) => {
  const response = await axios.delete(`/api/countries/${id}`);
  return response.data.success;
};
