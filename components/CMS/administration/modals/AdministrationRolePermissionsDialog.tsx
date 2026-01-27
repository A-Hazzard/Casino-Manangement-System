/**
 * Administration Role Permissions Dialog Component
 * Dialog showing which pages a role has access to.
 *
 * @module components/administration/AdministrationRolePermissionsDialog
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { hasPageAccess, type PageName } from '@/lib/utils/permissions';
import { Info } from 'lucide-react';
import { UserRole } from '@/lib/constants';

export type AdministrationRolePermissionsDialogProps = {
  open: boolean;
  onClose: () => void;
  role: string;
  roleLabel: string;
};

// ============================================================================
// Constants
// ============================================================================

const PAGE_DISPLAY_NAMES: Record<PageName, string> = {
  dashboard: 'Dashboard',
  machines: 'Machines',
  locations: 'Locations',
  'location-details': 'Location Details',
  members: 'Members',
  'member-details': 'Member Details',
  'collection-report': 'Collection Reports',
  reports: 'Reports',
  sessions: 'Sessions',
  administration: 'Administration',
  'vault-management': 'Vault Management',
  'vault-cashier': 'Vault Cashier',
  'vault-role-selection': 'Vault Role Selection',
};

/**
 * Administration Role Permissions Dialog
 */
export function AdministrationRolePermissionsDialog({
  open,
  onClose,
  role,
  roleLabel,
}: AdministrationRolePermissionsDialogProps) {
  // ============================================================================
  // Computed Values
  // ============================================================================
  // Get all pages this role has access to
  const accessiblePages = Object.keys(PAGE_DISPLAY_NAMES).filter(page =>
    hasPageAccess([role as UserRole], page as PageName)
  ) as PageName[];

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            {roleLabel} - Accessible Pages
          </DialogTitle>
          <DialogDescription>
            The following pages are accessible to users with the{' '}
            <span className="font-semibold">{roleLabel}</span> role.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {accessiblePages.length > 0 ? (
            <div className="space-y-2">
              {accessiblePages.map(page => (
                <div
                  key={page}
                  className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Info className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {PAGE_DISPLAY_NAMES[page]}
                    </p>
                    <p className="text-sm text-gray-500">
                      {page.replace(/-/g, ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-center text-gray-500">
              No pages are accessible to this role.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
