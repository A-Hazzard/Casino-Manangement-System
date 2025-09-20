import axios from "axios";
import type { Member } from "@/lib/types/members";
import { createActivityLogger } from "@/lib/helpers/activityLogger";

export type MembersQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  licencee?: string;
};

export type MembersQueryResult = {
  members: Member[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalMembers: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

/**
 * Fetch members with pagination and filtering
 */
export async function fetchMembersData(
  options: MembersQueryOptions = {}
): Promise<MembersQueryResult> {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "name",
      sortOrder = "asc",
      licencee,
    } = options;

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search: search,
      sortBy: sortBy,
      sortOrder: sortOrder,
    });

    // Add licencee filter if provided
    if (licencee && licencee !== "All Licensees") {
      params.append("licencee", licencee);
    }

    const response = await axios.get(`/api/members?${params.toString()}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      console.error("Invalid response format:", response.data);
      return {
        members: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalMembers: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
  } catch (error) {
    console.error("❌ Error fetching members data:", error);
    return {
      members: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalMembers: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }
}

/**
 * Fetch member by ID
 */
export async function fetchMemberById(memberId: string): Promise<Member> {
  try {
    const response = await axios.get(`/api/members/${memberId}`);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching member by ID:", error);
    throw error;
  }
}

/**
 * Create new member
 */
export async function createMember(
  memberData: Partial<Member>
): Promise<Member> {
  try {
    const memberLogger = createActivityLogger({ id: "system", email: "system", role: "system" });
    
    const response = await axios.post("/api/members", memberData);
    
    // Log the member creation activity
    await memberLogger(
      "create",
      "member",
      { id: response.data._id || memberData.username || "unknown", name: `${memberData.profile?.firstName || "Unknown"} ${memberData.profile?.lastName || "Member"}` },
      [],
      `Created new member: ${memberData.profile?.firstName || "Unknown"} ${memberData.profile?.lastName || "Member"}`
    );
    
    return response.data;
  } catch (error) {
    console.error("❌ Error creating member:", error);
    throw error;
  }
}

/**
 * Update member
 */
export async function updateMember(
  memberId: string,
  memberData: Partial<Member>
): Promise<Member> {
  try {
    const memberLogger = createActivityLogger({ id: "system", email: "system", role: "system" });
    
    const response = await axios.put(`/api/members/${memberId}`, memberData);
    
    // Log the member update activity
    await memberLogger(
      "update",
      "member",
      { id: memberId, name: `${memberData.profile?.firstName || "Unknown"} ${memberData.profile?.lastName || "Member"}` },
      [],
      `Updated member: ${memberData.profile?.firstName || "Unknown"} ${memberData.profile?.lastName || "Member"}`
    );
    
    return response.data;
  } catch (error) {
    console.error("❌ Error updating member:", error);
    throw error;
  }
}

/**
 * Delete member
 */
export async function deleteMember(memberId: string): Promise<void> {
  try {
    const memberLogger = createActivityLogger({ id: "system", email: "system", role: "system" });
    
    await axios.delete(`/api/members/${memberId}`);
    
    // Log the member deletion activity
    await memberLogger(
      "delete",
      "member",
      { id: memberId, name: "Member" },
      [],
      `Deleted member with ID: ${memberId}`
    );
  } catch (error) {
    console.error("❌ Error deleting member:", error);
    throw error;
  }
}

/**
 * Search members
 */
export async function searchMembers(
  searchTerm: string,
  licencee?: string
): Promise<Member[]> {
  try {
    const params = new URLSearchParams({
      search: searchTerm,
    });

    if (licencee && licencee !== "All Licensees") {
      params.append("licencee", licencee);
    }

    const response = await axios.get(
      `/api/members/search?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("❌ Error searching members:", error);
    return [];
  }
}
