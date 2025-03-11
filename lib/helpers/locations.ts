import axios from "axios";
import { locations } from "@/lib/types";

export default async function getAllGamingLocations(): Promise<locations[]> {
    try {
        const response = await axios.get<{ locations: locations[] }>("/api/locations");
        const fetchedLocations = response.data.locations;
        console.log("📍 Gaming Locations Status 200");
        return Array.isArray(fetchedLocations) ? fetchedLocations : [];
    } catch (error) {
        console.error("Error fetching gaming locations:", error);
        return [];
    }
}
