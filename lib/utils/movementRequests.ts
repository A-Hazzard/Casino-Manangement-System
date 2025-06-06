/**
 * Get the color class for a movement request status.
 * @param status MovementRequestStatus
 * @returns string (Tailwind color class)
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "approved":
      return "bg-greenHighlight/20 text-greenHighlight";
    case "pending":
      return "bg-orangeHighlight/20 text-orangeHighlight";
    case "rejected":
      return "bg-pinkHighlight/20 text-pinkHighlight";
    case "in progress":
      return "bg-blueHighlight/20 text-blueHighlight";
    default:
      return "bg-gray-200 text-gray-500";
  }
}

/**
 * Format a date for display in movement requests.
 * @param date Date or string
 * @returns string
 */
export function formatMovementRequestDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString();
}
