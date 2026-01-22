/**
 * Activity Log Card Component
 * Card component for displaying individual activity log entries.
 *
 * Features:
 * - Activity log entry display
 * - Expandable/collapsible details
 * - Copy to clipboard functionality
 * - Badge indicators for action types
 * - Date formatting
 * - User information display
 * - Description parsing for failed logins
 * - Toast notifications
 *
 * @param props - Component props
 */
'use client';

import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting';
import { toast } from 'sonner';
import type { ActivityLog } from '@/app/api/lib/types/activityLog';
import { useState } from 'react';

type AdministrationActivityLogCardProps = {
  log: ActivityLog;
  onDescriptionClick?: (log: ActivityLog) => void;
};

function AdministrationActivityLogCard({
  log,
  onDescriptionClick,
}: AdministrationActivityLogCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  // Extract attempted identifier from description for failed logins
  const getDisplayUsername = () => {
    // If username is "unknown" and description contains an identifier, extract it
    if (log.username === 'unknown' && log.description) {
      // Try to extract email/username from description like "Invalid password for: email@example.com"
      const emailMatch = log.description.match(/(?:for|:)\s*([^\s:]+@[^\s:]+)/i);
      if (emailMatch) return emailMatch[1];
      
      const userMatch = log.description.match(/(?:for|:)\s*([^\s:]+)/i);
      if (userMatch) return userMatch[1];
    }
    return log.username || 'Unknown User';
  };

  // Get display email (prefer actor.email, fallback to username if it's an email)
  const getDisplayEmail = () => {
    if (log.actor?.email && log.actor.email !== 'unknown') {
      return log.actor.email;
    }
    // If username looks like an email, use it
    const username = log.username || '';
    if (/\S+@\S+\.\S+/.test(username)) {
      return username;
    }
    return null;
  };

  const displayUsername = getDisplayUsername();
  const displayEmail = getDisplayEmail();
  const displayUserId = log.userId && log.userId !== 'unknown' ? log.userId : null;

  // Handle undefined _id
  if (!log._id) {
    return null;
  }

  // Get action badge styling with enhanced colors
  const getActionBadgeStyle = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 font-semibold';
      case 'update':
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 font-semibold';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200 font-semibold';
      case 'view':
        return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 font-semibold';
      case 'login':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 font-semibold';
      case 'logout':
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 font-semibold';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 font-semibold';
    }
  };

  // Get resource badge styling with enhanced colors
  const getResourceBadgeStyle = (resource: string) => {
    switch (resource.toLowerCase()) {
      case 'user':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200 font-medium';
      case 'machine':
      case 'cabinet':
        return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 font-medium';
      case 'location':
        return 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200 font-medium';
      case 'collection':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 font-medium';
      case 'member':
        return 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200 font-medium';
      case 'licensee':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200 font-medium';
      case 'session':
        return 'bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-200 font-medium';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 font-medium';
    }
  };

  const description = log.description || log.details || 'No description';
  const isLongDescription = description.length > 100;

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getActionBadgeStyle(log.action || 'unknown')}>
              {(log.action || 'unknown').toUpperCase()}
            </Badge>
            <Badge className={getResourceBadgeStyle(log.resource || 'unknown')}>
              {log.resource || 'unknown'}
            </Badge>
          </div>
          <div className="text-left sm:text-right">
            <div className="font-mono text-sm text-gray-600">
              {formatDate(log.timestamp)}
            </div>
            <div className="font-mono text-xs text-gray-500">
              <div className="flex items-center gap-2">
                {log.ipAddress && log.ipAddress !== 'unknown' ? (
                  <button
                    onClick={() => copyToClipboard(log.ipAddress!, 'IP Address', 'ip')}
                    className="flex items-center gap-1 hover:text-blue-600 hover:underline"
                    title="Click to copy IP address"
                  >
                    <span>{log.ipAddress}</span>
                    {copiedField === 'ip' ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                ) : (
                  <span>N/A</span>
                )}
                {log.ipAddress && log.ipAddress.includes('(Local)') && (
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                    Local
                  </span>
                )}
                {log.ipAddress && log.ipAddress.includes('(Public)') && (
                  <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-600">
                    Public
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="mb-3 space-y-1">
          {/* Username */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Username:</span>
            <button
              onClick={() => copyToClipboard(displayUsername, 'Username', 'username')}
              className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline"
              title="Click to copy username"
            >
              {displayUsername}
              {copiedField === 'username' ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 opacity-50" />
              )}
            </button>
          </div>
          
          {/* User ID */}
          {displayUserId && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">User ID:</span>
              <button
                onClick={() => copyToClipboard(displayUserId, 'User ID', 'userId')}
                className="flex items-center gap-1 font-mono text-xs text-gray-700 hover:text-blue-600 hover:underline"
                title="Click to copy user ID"
              >
                {displayUserId}
                {copiedField === 'userId' ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3 opacity-50" />
                )}
              </button>
            </div>
          )}
          
          {/* Email (only show if different from username) */}
          {displayEmail && displayEmail !== displayUsername && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Email:</span>
              <button
                onClick={() => copyToClipboard(displayEmail, 'Email', 'email')}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 hover:underline"
                title="Click to copy email"
              >
                {displayEmail}
                {copiedField === 'email' ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3 opacity-50" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mb-3">
          <div className="text-sm text-gray-700">
            {isExpanded ? (
              <div className="whitespace-pre-wrap break-words">
                {description}
              </div>
            ) : (
              <div className="overflow-hidden">
                {isLongDescription ? (
                  <>
                    <div
                      className="break-words"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {description.substring(0, 100)}...
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(true)}
                        className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Show More
                      </Button>
                      {onDescriptionClick && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDescriptionClick(log)}
                          className="h-auto p-0 text-xs text-green-600 hover:text-green-700"
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          View Full
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="break-words">
                    {onDescriptionClick ? (
                      <button
                        onClick={() => onDescriptionClick(log)}
                        className="cursor-pointer text-left transition-colors hover:text-blue-600 hover:underline"
                        title="Click to view full description"
                      >
                        <span className="inline-flex items-center gap-1">
                          {description}
                          <span className="text-xs text-blue-500">📋</span>
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          // Extract email/identifier from description if it's a login message
                          const emailMatch = description.match(/(?:Successful login|Invalid password|User not found)[\s:]+([^\s]+@[^\s]+)/i);
                          const textToCopy = emailMatch ? emailMatch[1] : description;
                          copyToClipboard(textToCopy, 'Description', 'description');
                        }}
                        className="text-left transition-colors hover:text-blue-600 hover:underline"
                        title="Click to copy description"
                      >
                        <span className="inline-flex items-center gap-1">
                          {description}
                          {copiedField === 'description' ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 opacity-50" />
                          )}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Show Less Button */}
        {isExpanded && isLongDescription && (
          <div className="mb-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
            >
              <EyeOff className="mr-1 h-3 w-3" />
              Show Less
            </Button>
          </div>
        )}

        {/* Resource Info */}
        {log.resourceName && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="break-words text-xs text-gray-500">
              Resource: <span className="font-medium">{log.resourceName}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AdministrationActivityLogCard;

