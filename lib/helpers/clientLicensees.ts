/**
 * Client-side helper functions for licensee operations
 * These functions make API calls instead of directly accessing the database
 */

import type { Licensee } from "@/lib/types/licensee";

/**
 * Fetches all licensees via API call
 */
export async function fetchLicensees(): Promise<Licensee[]> {
  try {
    const response = await fetch("/api/licensees", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.licensees || [];
  } catch (error) {
    console.error("Failed to fetch licensees:", error);
    return [];
  }
}

/**
 * Creates a new licensee via API call
 */
export async function createLicensee(data: {
  name: string;
  description?: string;
  country: string;
  startDate?: string;
  expiryDate?: string;
}): Promise<{ success: boolean; licensee?: Licensee; message?: string }> {
  try {
    const response = await fetch("/api/licensees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, message: result.message || "Failed to create licensee" };
    }

    return { success: true, licensee: result.licensee };
  } catch (error) {
    console.error("Failed to create licensee:", error);
    return { success: false, message: "Network error occurred" };
  }
}

/**
 * Updates an existing licensee via API call
 */
export async function updateLicensee(data: {
  _id: string;
  name?: string;
  description?: string;
  country?: string;
  startDate?: string;
  expiryDate?: string;
  isPaid?: boolean;
  prevStartDate?: string;
  prevExpiryDate?: string;
}): Promise<{ success: boolean; licensee?: Licensee; message?: string }> {
  try {
    const response = await fetch("/api/licensees", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, message: result.message || "Failed to update licensee" };
    }

    return { success: true, licensee: result.licensee };
  } catch (error) {
    console.error("Failed to update licensee:", error);
    return { success: false, message: "Network error occurred" };
  }
}

/**
 * Deletes a licensee via API call
 */
export async function deleteLicensee(_id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch("/api/licensees", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ _id }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, message: result.message || "Failed to delete licensee" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to delete licensee:", error);
    return { success: false, message: "Network error occurred" };
  }
}
