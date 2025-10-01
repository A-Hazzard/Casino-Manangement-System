import type { CasinoMember as Member } from "@/shared/types/entities";
// TODO: Move MemberSortOption to shared types
type MemberSortOption = "name" | "playerId" | "points" | "sessions" | "totalHandle" | "totalWon" | "totalLost" | "lastSession" | "status" | "locationName" | "winLoss" | "lastLogin";

/**
 * Sort members based on sort option and order
 */
export function sortMembers(
  members: Member[],
  sortOption: MemberSortOption,
  sortOrder: "asc" | "desc"
): Member[] {
  return [...members].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortOption) {
      case "name":
        aValue = `${a.profile.firstName} ${a.profile.lastName}`.toLowerCase();
        bValue = `${b.profile.firstName} ${b.profile.lastName}`.toLowerCase();
        break;
      case "playerId":
        aValue = a._id;
        bValue = b._id;
        break;
      case "lastSession":
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      default:
        aValue = a._id;
        bValue = b._id;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortOrder === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortOrder === "asc"
      ? aValue < bValue
        ? -1
        : 1
      : bValue < aValue
      ? -1
      : 1;
  });
}

/**
 * Create pagination for members
 */
export function createMembersPagination<T>(
  data: T[],
  currentPage: number,
  itemsPerPage: number
): {
  currentItems: T[];
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} {
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = data.slice(startIndex, endIndex);

  return {
    currentItems,
    totalPages,
    hasNextPage: currentPage < totalPages - 1,
    hasPrevPage: currentPage > 0,
  };
}

/**
 * Create pagination handlers for members
 */
export function createMembersPaginationHandlers(
  currentPage: number,
  totalPages: number,
  setPage: (page: number) => void
) {
  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 0 && pageNumber < totalPages) {
      setPage(pageNumber);
    }
  };

  const goToFirstPage = () => goToPage(0);
  const goToLastPage = () => goToPage(totalPages - 1);
  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  return {
    goToPage,
    goToFirstPage,
    goToLastPage,
    goToPrevPage,
    goToNextPage,
    canGoPrev: currentPage > 0,
    canGoNext: currentPage < totalPages - 1,
  };
}

/**
 * Get member display name
 */
export function getMemberDisplayName(member: Member): string {
  return `${member.profile.firstName} ${member.profile.lastName}`;
}

/**
 * Get member initials
 */
export function getMemberInitials(member: Member): string {
  const firstName = member.profile.firstName || "";
  const lastName = member.profile.lastName || "";
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dateObj);
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
}

/**
 * Debounce function for search
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Validate member data
 */
export function validateMemberData(member: Partial<Member>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!member.profile?.firstName?.trim()) {
    errors.push("First name is required");
  }

  if (!member.profile?.lastName?.trim()) {
    errors.push("Last name is required");
  }

  if (!member.profile?.email?.trim()) {
    errors.push("Email is required");
  } else if (!isValidEmail(member.profile.email)) {
    errors.push("Invalid email format");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


