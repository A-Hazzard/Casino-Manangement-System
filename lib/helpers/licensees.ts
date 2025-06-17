import axios from "axios";
import type { Licensee } from "@/lib/types/licensee";

export const fetchLicensees = async (): Promise<Licensee[]> => {
  const response = await axios.get("/api/licensees");
  return response.data.licensees;
};

export const createLicensee = async (
  licensee: Omit<
    Licensee,
    "_id" | "createdAt" | "updatedAt" | "lastEdited" | "countryName"
  >
) => {
  const response = await axios.post("/api/licensees", licensee);
  return response.data;
};

export const updateLicensee = async (
  licensee: Partial<Licensee> & { _id: string }
) => {
  const response = await axios.put("/api/licensees", licensee);
  return response.data.licensee;
};

export const deleteLicensee = async (id: string) => {
  const response = await axios.delete("/api/licensees", { data: { _id: id } });
  return response.data.success;
};
