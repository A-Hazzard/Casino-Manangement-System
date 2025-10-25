import { gsap } from 'gsap';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import axios from 'axios';
import type { ActivityLog } from '@/app/api/lib/types/activityLog';

import type {
  ActivityGroup,
  ProcessedActivityEntry,
} from '@/lib/types/activity';

// Re-export frontend-specific types for convenience
export type { ActivityGroup, ProcessedActivityEntry };

/**
 * Gets appropriate icon and background color for activity action type
 * @param actionType - The type of action performed
 * @param entityType - The type of entity (for context-specific icons)
 * @returns Object with icon component and background color class
 */
export function getActionIcon(actionType: string, entityType?: string) {
  const isUserEntity = entityType?.toLowerCase() === 'user';

  switch (actionType.toLowerCase()) {
    case 'create':
      return {
        icon: isUserEntity ? 'UserPlus' : 'Building2',
        bg: 'bg-blue-500',
      };
    case 'update':
    case 'edit':
      return { icon: 'Settings', bg: 'bg-green-500' };
    case 'delete':
      return { icon: 'X', bg: 'bg-red-500' };
    case 'payment':
      return { icon: 'IdCard', bg: 'bg-purple-500' };
    default:
      return { icon: 'Settings', bg: 'bg-gray-500' };
  }
}

/**
 * Generates human-readable description for activity log entry
 * @param log - Activity log entry
 * @param entityType - Type of entity for context-specific descriptions
 * @returns String with formatted description
 */
export function generateActivityDescription(
  log: ActivityLog,
  entityType?: string
): string {
  const actorEmail = log.actor?.email || log.username || 'Unknown User';
  const entityName = log.entity?.name || log.resourceName || 'Unknown Resource';
  const isUserEntity = entityType?.toLowerCase() === 'user';
  const entityDisplayName = isUserEntity ? 'user' : 'licensee';

  if (log.changes && log.changes.length > 0) {
    if (log.changes.length === 1) {
      const change = log.changes[0];
      return `${actorEmail} changed the ${
        change.field
      } of ${entityName} from "${String(change.oldValue)}" to "${String(
        change.newValue
      )}"`;
    } else {
      return `${actorEmail} updated ${log.changes.length} fields for ${entityDisplayName} ${entityName} (Click to view details)`;
    }
  }

  switch ((log.actionType || log.action || 'unknown').toLowerCase()) {
    case 'create':
      return `${actorEmail} created a new ${entityDisplayName} ${
        isUserEntity ? 'account for' : ''
      } ${entityName}`;
    case 'delete':
      return `${actorEmail} deleted the ${entityDisplayName} ${
        isUserEntity ? 'account of' : ''
      } ${entityName}`;
    case 'payment':
      return `${actorEmail} processed payment for ${entityName}`;
    default:
      return `${actorEmail} performed ${log.actionType} action on ${entityName}`;
  }
}

/**
 * Groups activities by date with smart date labeling
 * @param activities - Array of activity log entries
 * @param entityType - Type of entity for context-specific processing
 * @returns Array of grouped activities by date
 */
export function groupActivitiesByDate(
  activities: ActivityLog[],
  entityType?: string
): ActivityGroup[] {
  const groups: { [key: string]: ActivityLog[] } = {};

  activities.forEach(activity => {
    const date = new Date(activity.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey: string;
    if (date.toDateString() === today.toDateString()) {
      dateKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = 'Yesterday';
    } else {
      dateKey = format(date, 'EEEE d, MMMM yyyy');
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
  });

  return Object.entries(groups).map(([range, entries]) => ({
    range,
    entries: entries.map(log => {
      const { icon, bg } = getActionIcon(
        log.actionType || log.action || 'unknown',
        entityType
      );
      return {
        id: log._id?.toString() || Math.random().toString(),
        time: format(new Date(log.timestamp), 'h:mm a'),
        type: (log.actionType || log.action || 'unknown').toLowerCase(),
        icon,
        iconBg: bg,
        user: {
          email: log.actor?.email || log.username || 'Unknown User',
          role: log.actor?.role || 'User',
        },
        description: generateActivityDescription(log, entityType),
        originalActivity: log,
      };
    }),
  }));
}

/**
 * Applies GSAP animation to activity modal
 * @param modalRef - React ref to modal element
 * @param isOpen - Whether modal is opening or closing
 */
export function animateActivityModal(
  modalRef: React.RefObject<HTMLDivElement | null>,
  isOpen: boolean
) {
  if (isOpen && modalRef.current) {
    gsap.fromTo(
      modalRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
    );
  }
}

/**
 * Fetches activity logs with filters
 * @param params - Parameters for fetching activities
 * @returns Promise resolving to activity data
 */
export async function fetchActivityLogs(params: {
  entityType: string;
  activeFilter: string;
  activityType?: string;
  dateRange?: DateRange;
  currentPage: number;
  itemsPerPage: number;
}): Promise<{
  activities: ActivityLog[];
  totalPages: number;
  error?: string;
}> {
  try {
    const searchParams = new URLSearchParams({
      entityType: params.entityType,
      limit: params.itemsPerPage.toString(),
      skip: ((params.currentPage - 1) * params.itemsPerPage).toString(),
    });

    if (params.activeFilter === 'type' && params.activityType) {
      searchParams.append('actionType', params.activityType.toUpperCase());
    }

    if (params.dateRange?.from) {
      searchParams.append('startDate', params.dateRange.from.toISOString());
    }

    if (params.dateRange?.to) {
      searchParams.append('endDate', params.dateRange.to.toISOString());
    }

    const response = await axios.get(`/api/activity-logs?${searchParams}`);
    const data = response.data;

    if (data.success) {
      return {
        activities: data.data || [],
        totalPages: Math.ceil(
          (data.total || data.count || 0) / params.itemsPerPage
        ),
      };
    } else {
      throw new Error(data.message || 'Failed to fetch activity logs');
    }
  } catch (err) {
    console.error('Error fetching activities:', err);
    return {
      activities: [],
      totalPages: 1,
      error:
        err instanceof Error ? err.message : 'Failed to load activity logs',
    };
  }
}

/**
 * Creates filter button configuration
 * @returns Array of filter button configurations
 */
export function getFilterButtons() {
  return [
    { label: 'Date Range', color: 'bg-buttonActive text-white', key: 'date' },
    { label: 'Activity Type', color: 'bg-green-500 text-white', key: 'type' },
  ];
}

/**
 * Gets activity type options for select dropdown
 * @param entityType - Type of entity to get relevant options
 * @returns Array of activity type options
 */
export function getActivityTypeOptions(entityType?: string) {
  const baseOptions = [
    { value: 'update', label: 'Update' },
    { value: 'create', label: 'Create' },
    { value: 'delete', label: 'Delete' },
  ];

  if (entityType?.toLowerCase() === 'licensee') {
    baseOptions.push({ value: 'payment', label: 'Payment' });
  }

  return baseOptions;
}
