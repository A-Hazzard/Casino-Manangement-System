/**
 * Access Restricted Component
 *
 * Displays a message when a user doesn't have permission to access a section.
 * Used throughout the application for consistent access control messaging.
 */

type AccessRestrictedProps = {
  /**
   * The name of the section/feature that requires access
   * Example: "Activity Logs", "Users", "Licensees"
   */
  sectionName: string;
  /**
   * Optional custom message. If not provided, uses default message.
   */
  message?: string;
};

export const AccessRestricted = ({
  sectionName,
  message,
}: AccessRestrictedProps) => {
  const defaultMessage = `You don't have permission to access ${sectionName}. Please contact your administrator for access.`;

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          Access Restricted
        </h2>
        <p className="text-gray-600">{message || defaultMessage}</p>
      </div>
    </div>
  );
};

