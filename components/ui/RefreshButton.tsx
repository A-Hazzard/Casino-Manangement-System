/**
 * Sync Button & Refresh Button Components
 * Button components for syncing/refreshing data with loading states.
 *
 * Features:
 * - SyncButton with sync/refresh variants
 * - RefreshButton wrapper
 * - Loading/syncing state with spinner
 * - Icon-only or with label option
 * - Disabled state during sync
 * - Accessible labels
 *
 * @param onClick - Callback when button is clicked
 * @param isSyncing - Whether sync/refresh is in progress
 * @param label - Button label text
 * @param iconOnly - Whether to show only icon
 * @param variant - Button variant (sync or refresh)
 */
import { Button, type ButtonProps } from '@/components/ui/button';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SyncButtonProps as BaseSyncButtonProps } from '@/lib/types/components';

// ============================================================================
// Types
// ============================================================================

type Props = Omit<ButtonProps, keyof BaseSyncButtonProps> & BaseSyncButtonProps;

// ============================================================================
// Components
// ============================================================================

export const SyncButton = ({
  onClick,
  isSyncing = false,
  className = '',
  label = 'Sync Meters',
  iconOnly = false,
  variant = 'sync',
  ...props
}: Props) => {
  const Icon = variant === 'sync' ? RotateCcw : RefreshCw;

  return (
    <Button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 bg-buttonActive text-white transition-colors hover:bg-buttonActive/90',
        className
      )}
      disabled={isSyncing}
      aria-label={label}
      {...props}
    >
      <Icon
        className={cn('h-4 w-4', isSyncing ? 'animate-spin' : '')}
        aria-hidden="true"
      />
      <span className={iconOnly ? 'hidden' : ''}>{label}</span>
    </Button>
  );
};

export const RefreshButton = (props: Omit<Props, 'variant'>) => {
  return <SyncButton {...props} variant="refresh" />;
};

export default SyncButton;
