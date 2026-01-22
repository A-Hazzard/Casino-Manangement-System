/**
 * App Sidebar Component
 * Main application sidebar navigation with role-based menu items.
 *
 * Features:
 * - Logo and branding
 * - Navigation menu with icons
 * - Role-based link visibility (developer, admin, manager, etc.)
 * - Active route highlighting
 * - Collapsible/expandable on desktop
 * - Slide-in/out on mobile
 * - User profile section with avatar
 * - Profile modal integration
 * - Currency selector
 * - Logout functionality
 * - Dynamic user data fetching with caching
 * - Permission checks for each menu item
 * - Smooth animations and transitions
 * - Responsive design
 *
 * Large component (~766 lines) managing primary application navigation.
 */
'use client';

import ProfileModal from '@/components/shared/layout/ProfileModal';
import { ClientOnly } from '@/components/shared/ui/ClientOnly';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { SidebarContainer, useSidebar } from '@/components/shared/ui/sidebar';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { logoutUser } from '@/lib/helpers/client';
import { fetchUserId } from '@/lib/helpers/user';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import type { NavigationConfig } from '@/lib/types/layout/navigation';
import { cn } from '@/lib/utils';
import { shouldShowNoRoleMessage } from '@/lib/utils/licensee';
import { shouldShowNavigationLinkDb } from '@/lib/utils/permissions';
import { CACHE_KEYS, fetchUserWithCache } from '@/lib/utils/userCache';
import type { CurrencyCode } from '@/shared/types/currency';
import { ChevronDown, ChevronUp, PanelLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cmsNavigationConfig } from '@/lib/constants';
const DEFAULT_AVATAR = '/defaultAvatar.svg';

// ============================================================================
// Types & Constants
// ============================================================================

type AppSidebarProps = {
  navConfig?: NavigationConfig;
};

export default function AppSidebar({
  navConfig = cmsNavigationConfig,
}: AppSidebarProps) {
  // Use provided navConfig or default to CMS config for backward compatibility
  const items = navConfig.items;
  const { collapsed, toggleCollapsed, setIsOpen } = useSidebar();
  const { user, clearUser } = useUserStore();
  const pathname = usePathname();
  const { displayCurrency, setDisplayCurrency } = useCurrency();
  const { setDisplayCurrency: setDashboardCurrency } = useDashBoardStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);
  const [displayName, setDisplayName] = useState<string>('User');
  const [email, setEmail] = useState<string>('');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoveredItemLabel, setHoveredItemLabel] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Navigation permissions state
  const [navigationPermissions, setNavigationPermissions] = useState<
    Record<string, boolean>
  >({});
  const [navigationLoading, setNavigationLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  const router = useRouter();

  // Close sidebar on mobile when pathname changes (navigation occurs)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsOpen(false);
    }
  }, [pathname, setIsOpen]);

  // Sections start closed by default as expandedSections is initialized to an empty Set

  useEffect(() => {
    // Seed with store info
    const seedEmail = user?.emailAddress || '';
    setEmail(seedEmail);
    setDisplayName(seedEmail ? seedEmail.split('@')[0] : 'User');

    // Set profile loading to false if we have basic user data
    if (user?.emailAddress) {
      setProfileLoading(false);
    }
  }, [user?.emailAddress]);

  // Load navigation permissions when user changes
  useEffect(() => {
    if (!user) {
      setNavigationLoading(false);
      return;
    }

    const loadNavigationPermissions = async () => {
      try {
        const permissions: Record<string, boolean> = {};

        // Check permissions for all navigation items
        const permissionPromises = items.map(async item => {
          // Use custom permission check if provided
          if (item.permissionCheck && user.roles) {
            const hasAccess = item.permissionCheck(user.roles);
            return { href: item.href, hasAccess };
          }

          // For CMS navigation, use existing permission system
          let pageName = item.href === '/' ? 'dashboard' : item.href.slice(1);
          // Map cabinets to machines for permission checking
          if (pageName === 'cabinets') {
            pageName = 'machines';
          }

          // Only check permissions for known CMS pages
          const cmsPages = [
            'dashboard',
            'machines',
            'locations',
            'members',
            'collection-report',
            'reports',
            'sessions',
            'administration',
          ] as const;

          if (cmsPages.includes(pageName as (typeof cmsPages)[number])) {
            const hasAccess = await shouldShowNavigationLinkDb(
              pageName as
                | 'dashboard'
                | 'machines'
                | 'locations'
                | 'members'
                | 'collection-report'
                | 'reports'
                | 'sessions'
                | 'administration'
            );
            return { href: item.href, hasAccess };
          }

          // For VAULT pages or unknown pages, default to true (will be filtered by role later)
          return { href: item.href, hasAccess: true };
        });

        const results = await Promise.all(permissionPromises);

        // Update permissions state
        results.forEach(({ href, hasAccess }) => {
          permissions[href] = hasAccess;
        });

        setNavigationPermissions(permissions);
      } catch (error) {
        console.error('Error loading navigation permissions:', error);
        // Set all to false on error
        const permissions: Record<string, boolean> = {};
        items.forEach(item => {
          permissions[item.href] = false;
        });
        setNavigationPermissions(permissions);
      } finally {
        setNavigationLoading(false);
      }
    };

    loadNavigationPermissions();
  }, [user]);

  useEffect(() => {
    // Try to fetch full user doc to get profilePicture and username
    (async () => {
      try {
        // Skip API call if we're in development and auth is bypassed
        const isDevAuthBypassed =
          process.env.NODE_ENV === 'development' &&
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost';

        if (isDevAuthBypassed && user?.emailAddress) {
          // In development with auth bypassed, just use store data
          setEmail(user.emailAddress);
          setDisplayName(user.emailAddress.split('@')[0] || 'User');
          setProfileLoading(false);
          return;
        }

        const id = await fetchUserId();
        if (!id) {
          // If no user ID from token API, but user exists in store, use store data
          if (user?.emailAddress) {
            setEmail(user.emailAddress);
            setDisplayName(user.emailAddress.split('@')[0] || 'User');
          }
          setProfileLoading(false);
          return;
        }

        try {
          const data = await fetchUserWithCache(
            `${CACHE_KEYS.USER_PROFILE}_${id}`,
            async () => {
              const res = await fetch(`/api/users/${id}`, {
                credentials: 'include',
              });
              if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
              }
              return await res.json();
            },
            10 * 60 * 1000 // 10 minute cache for profile data
          );

          if (data?.success && data?.user) {
            const u = data.user;
            if (u.profilePicture) setAvatarUrl(u.profilePicture as string);
            if (u.username) setDisplayName(u.username as string);
            if (u.email) setEmail(u.email as string);
          } else {
            // If API call fails but user exists in store, use store data
            if (user?.emailAddress) {
              setEmail(user.emailAddress);
              setDisplayName(user.emailAddress.split('@')[0] || 'User');
            }
          }
          setProfileLoading(false);
        } catch (fetchError) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Error fetching user data:', fetchError);
          }
          // If any error occurs but user exists in store, use store data
          if (user?.emailAddress) {
            setEmail(user.emailAddress);
            setDisplayName(user.emailAddress.split('@')[0] || 'User');
          }
          setProfileLoading(false);
        }
      } catch (error) {
        // If any error occurs but user exists in store, use store data
        if (user?.emailAddress) {
          setEmail(user.emailAddress);
          setDisplayName(user.emailAddress.split('@')[0] || 'User');
        }
        setProfileLoading(false);
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to fetch user profile data:', error);
        }
      }
    })();
    // Listen for profile updates from the modal to refresh avatar immediately
    const onProfileUpdated = (e: Record<string, unknown>) => {
      const detail = (e?.detail || {}) as Record<string, unknown>;
      if (detail.profilePicture) setAvatarUrl(detail.profilePicture as string);
      if (detail.username) setDisplayName(detail.username as string);
      if (detail.email) setEmail(detail.email as string);
      setProfileLoading(false);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(
        'profile-updated',
        onProfileUpdated as unknown as EventListener
      );
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(
          'profile-updated',
          onProfileUpdated as unknown as EventListener
        );
      }
    };
  }, [user?.emailAddress]);

  // Custom click outside handler - only for collapsed sidebar
  useEffect(() => {
    if (!menuOpen || !collapsed) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideTrigger = triggerRef.current?.contains(target);
      const isInsideDropdown = document
        .querySelector('[data-custom-dropdown]')
        ?.contains(target);

      if (!isInsideTrigger && !isInsideDropdown) {
        setMenuOpen(false);
        setDropdownPosition(null);
      }
    };

    // Use a small delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [menuOpen, collapsed]);

  return (
    <ClientOnly
      fallback={<div className="h-screen w-64 animate-pulse bg-gray-100" />}
    >
      <SidebarContainer>
        {/* Sidebar Container: Main sidebar layout and structure */}
        <div className="relative flex h-full w-full flex-col">
          {/* Sidebar Header Section: Logo, title, and collapse controls */}
          <div className="flex items-center gap-3 border-b border-border/50 px-3 py-5">
            {/* Mobile: close sidebar; Desktop: collapse/expand */}
            <button
              aria-label="Close sidebar"
              onClick={() => setIsOpen(false)}
              className="rounded p-2 hover:bg-accent md:hidden"
              title="Close sidebar"
            >
              <PanelLeft className="h-6 w-6" />
            </button>
            <button
              aria-label="Toggle sidebar"
              onClick={toggleCollapsed}
              className="hidden rounded p-2 hover:bg-accent md:inline-flex"
              title="Toggle sidebar"
            >
              <PanelLeft className={collapsed ? 'h-6 w-6' : 'h-5 w-5'} />
            </button>
            {!collapsed && (
              <div className="flex items-center gap-2">
                <Image
                  src="/EOS_Logo.png"
                  alt="Evolution1 CMS"
                  width={72}
                  height={72}
                  className="shrink-0"
                />
              </div>
            )}
          </div>
          {/* Navigation Section: Main navigation menu with permission-based filtering */}
          <nav className="relative flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-4">
            {shouldShowNoRoleMessage(user) ? (
              // Show empty state when user has no roles
              <div className="flex items-center justify-center py-8 text-center">
                <p className="text-sm text-gray-500">
                  {collapsed ? '' : 'No navigation available'}
                </p>
              </div>
            ) : navigationLoading ? (
              // Show loading skeleton for all items with square icon skeletons
              items.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="flex h-9 items-center gap-3 rounded-md px-3 py-2"
                >
                  {/* Square skeleton for icon */}
                  <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
                  {/* Text skeleton - hidden when collapsed */}
                  <div
                    className={cn(
                      'h-4 w-20 animate-pulse rounded bg-gray-200',
                      collapsed ? 'md:hidden' : ''
                    )}
                  />
                </div>
              ))
            ) : (
              // Render items based on pre-loaded permissions
              items
                .filter(item => {
                  // Use custom permission check if provided
                  if (item.permissionCheck && user?.roles) {
                    return item.permissionCheck(user.roles as string[]);
                  }

                  // Check if user is collector-only (CMS-specific logic)
                  const isCollectorOnly =
                    user?.roles &&
                    user.roles.length === 1 &&
                    user.roles.includes('collector');

                  // Hide Locations and Cabinets for collector-only users
                  if (
                    isCollectorOnly &&
                    (item.href === '/locations' || item.href === '/cabinets')
                  ) {
                    return false;
                  }

                  return navigationPermissions[item.href] ?? true;
                })
                .map(item => {
                  // Find the original index of this item in the items array for stable keys
                  const index = items.indexOf(item);
                  const Icon = item.icon;
                  const hasChildren = item.children && item.children.length > 0;

                  // Check if any child is active
                  const isChildActive = hasChildren
                    ? item.children?.some(
                        child =>
                          pathname === child.href ||
                          pathname.startsWith(child.href + '/')
                      )
                    : false;

                  // Use label + index as unique identifier since href might be '#' for multiple items
                  const uniqueKey = `${item.label}-${index}`;
                  const isExpanded = expandedSections.has(uniqueKey);
                  const isActive = hasChildren
                    ? isChildActive
                    : pathname === item.href ||
                      pathname.startsWith(item.href + '/');

                  return (
                    <div key={uniqueKey} className="relative">
                      {hasChildren ? (
                        // Expandable section with children
                        <>
                          <button
                            type="button"
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpandedSections(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(uniqueKey)) {
                                  newSet.delete(uniqueKey);
                                } else {
                                  newSet.add(uniqueKey);
                                }
                                return newSet;
                              });
                            }}
                            className={cn(
                              'relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-[11px] py-2 text-sm transition-colors',
                              isActive
                                ? 'bg-buttonActive font-medium text-white'
                                : 'text-gray-700 hover:bg-gray-100 hover:text-white dark:hover:bg-gray-800 dark:hover:text-white'
                            )}
                            onMouseEnter={e => {
                              if (collapsed) {
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                setTooltipPosition({
                                  top: rect.top + rect.height / 2,
                                  left: rect.right + 8,
                                });
                                setHoveredItem(uniqueKey);
                                // If not expanded, show parent label
                                setHoveredItemLabel(item.label);
                              }
                            }}
                            onMouseLeave={() => {
                              setHoveredItem(null);
                              setHoveredItemLabel(null);
                              setTooltipPosition(null);
                            }}
                          >
                            <div className="flex items-center gap-0">
                              <Icon
                                className={collapsed ? 'h-7 w-7' : 'h-5 w-5'}
                              />
                              <span
                                className={cn(
                                  'truncate',
                                  collapsed ? 'md:hidden' : ''
                                )}
                              >
                                {item.label}
                              </span>
                            </div>
                            <ChevronUp
                              className={cn(
                                'h-4 w-4 flex-shrink-0 transition-transform',
                                isExpanded ? '' : 'rotate-180'
                              )}
                            />
                          </button>
                          {/* Children items */}
                          {((isExpanded && !collapsed) || (isExpanded && collapsed)) && item.children && (
                            <div
                              className={cn(
                                'mt-1 space-y-1',
                                collapsed
                                  ? 'ml-2 md:ml-0 md:space-y-2'
                                  : 'ml-4 border-l-2 border-gray-200 pl-2'
                              )}
                            >
                              {item.children
                                .filter(child => {
                                  // Check child permissions
                                  if (child.permissionCheck && user?.roles) {
                                    return child.permissionCheck(user.roles);
                                  }
                                  return (
                                    navigationPermissions[child.href] ?? true
                                  );
                                })
                                //TODO Review

                                .map(child => {
                                  // Find the original index of this child in the item.children array for stable keys
                                  const childIndex = item.children?.indexOf(child) ?? 0;
                                  const ChildIcon = child.icon;
                                  const hasGrandchildren =
                                    child.children && child.children.length > 0;
                                  const childUniqueKey = `${item.label}-${index}-${child.label}-${childIndex}`;
                                  const isChildExpanded =
                                    expandedSections.has(childUniqueKey);

                                  // Check if any grandchild is active
                                  const isGrandchildActive = hasGrandchildren
                                    ? child.children?.some(
                                        grandchild =>
                                          pathname === grandchild.href ||
                                          pathname.startsWith(
                                            grandchild.href + '/'
                                          )
                                      )
                                    : false;

                                  const childActive =
                                    pathname === child.href ||
                                    pathname.startsWith(child.href + '/') ||
                                    isGrandchildActive;

                                  // If child has its own children (nested), render as expandable
                                  if (hasGrandchildren) {
                                    return (
                                      <div
                                        key={childUniqueKey}
                                        className="relative"
                                      >
                                        <button
                                          type="button"
                                          onClick={e => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setExpandedSections(prev => {
                                              const newSet = new Set(prev);
                                              if (newSet.has(childUniqueKey)) {
                                                newSet.delete(childUniqueKey);
                                              } else {
                                                newSet.add(childUniqueKey);
                                              }
                                              return newSet;
                                            });
                                          }}
                                          className={cn(
                                            'relative flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                                            childActive
                                              ? 'bg-buttonActive font-medium text-white'
                                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800',
                                            collapsed &&
                                              'md:justify-center md:gap-0'
                                          )}
                                          onMouseEnter={e => {
                                            if (collapsed) {
                                              const rect =
                                                e.currentTarget.getBoundingClientRect();
                                              setTooltipPosition({
                                                top: rect.top + rect.height / 2,
                                                left: rect.right + 8,
                                              });
                                              setHoveredItem(childUniqueKey);
                                              setHoveredItemLabel(child.label);
                                            }
                                          }}
                                          onMouseLeave={() => {
                                            if (collapsed) {
                                              setHoveredItem(null);
                                              setHoveredItemLabel(null);
                                              setTooltipPosition(null);
                                            }
                                          }}
                                        >
                                          <div className="flex items-center gap-3">
                                            <ChildIcon
                                              className={cn(
                                                'flex-shrink-0',
                                                collapsed
                                                  ? 'md:h-5 md:w-5'
                                                  : 'h-4 w-4'
                                              )}
                                            />
                                            <span
                                              className={cn(
                                                'truncate',
                                                collapsed ? 'md:hidden' : ''
                                              )}
                                            >
                                              {child.label}
                                            </span>
                                          </div>
                                          <ChevronUp
                                            className={cn(
                                              'h-4 w-4 flex-shrink-0 transition-transform',
                                              isChildExpanded
                                                ? ''
                                                : 'rotate-180'
                                            )}
                                          />
                                        </button>
                                        {/* Grandchildren items */}
                                        {isChildExpanded && child.children && (
                                          <div
                                            className={cn(
                                              'mt-1 space-y-1',
                                              collapsed
                                                ? 'ml-2 md:ml-0 md:space-y-2'
                                                : 'ml-6 border-l-2 border-gray-200 pl-2'
                                            )}
                                          >
                                            {child.children
                                              .filter(grandchild => {
                                                if (
                                                  grandchild.permissionCheck &&
                                                  user?.roles
                                                ) {
                                                  return grandchild.permissionCheck(
                                                    user.roles
                                                  );
                                                }
                                                return (
                                                  navigationPermissions[
                                                    grandchild.href
                                                  ] ?? true
                                                );
                                              })
                                              .map(grandchild => {
                                                const GrandchildIcon =
                                                  grandchild.icon;
                                                const grandchildActive =
                                                  pathname ===
                                                    grandchild.href ||
                                                  pathname.startsWith(
                                                    grandchild.href + '/'
                                                  );

                                                return (
                                                  <Link
                                                    key={grandchild.href}
                                                    href={grandchild.href}
                                                    className={cn(
                                                      'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                                                      grandchildActive
                                                        ? 'bg-buttonActive font-medium text-white'
                                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800',
                                                      collapsed &&
                                                        'md:justify-center md:gap-0'
                                                    )}
                                                    onClick={() => {
                                                      if (
                                                        typeof window !==
                                                          'undefined' &&
                                                        window.innerWidth < 768
                                                      ) {
                                                        setIsOpen(false);
                                                      }
                                                    }}
                                                    onMouseEnter={e => {
                                                      if (collapsed) {
                                                        const rect =
                                                          e.currentTarget.getBoundingClientRect();
                                                        setTooltipPosition({
                                                          top:
                                                            rect.top +
                                                            rect.height / 2,
                                                          left: rect.right + 8,
                                                        });
                                                        setHoveredItem(
                                                          grandchild.href
                                                        );
                                                        setHoveredItemLabel(
                                                          grandchild.label
                                                        );
                                                      }
                                                    }}
                                                    onMouseLeave={() => {
                                                      if (collapsed) {
                                                        setHoveredItem(null);
                                                        setHoveredItemLabel(
                                                          null
                                                        );
                                                        setTooltipPosition(
                                                          null
                                                        );
                                                      }
                                                    }}
                                                  >
                                                    <GrandchildIcon
                                                      className={cn(
                                                        'flex-shrink-0',
                                                        collapsed
                                                          ? 'md:h-5 md:w-5'
                                                          : 'h-4 w-4'
                                                      )}
                                                    />
                                                    <span
                                                      className={cn(
                                                        'truncate',
                                                        collapsed
                                                          ? 'md:hidden'
                                                          : ''
                                                      )}
                                                    >
                                                      {grandchild.label}
                                                    </span>
                                                  </Link>
                                                );
                                              })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }

                                  // Regular child link (no grandchildren)
                                  return (
                                    <Link
                                      key={child.href}
                                      href={child.href}
                                      className={cn(
                                        'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                                        childActive
                                          ? 'bg-buttonActive font-medium text-white'
                                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800',
                                        collapsed &&
                                          'md:justify-center md:gap-0'
                                      )}
                                      onClick={() => {
                                        // Close sidebar on mobile when a link is clicked
                                        if (
                                          typeof window !== 'undefined' &&
                                          window.innerWidth < 768
                                        ) {
                                          setIsOpen(false);
                                        }
                                      }}
                                      onMouseEnter={e => {
                                        if (collapsed) {
                                          const rect =
                                            e.currentTarget.getBoundingClientRect();
                                          setTooltipPosition({
                                            top: rect.top + rect.height / 2,
                                            left: rect.right + 8,
                                          });
                                          setHoveredItem(childUniqueKey);
                                          setHoveredItemLabel(child.label);
                                        }
                                      }}
                                      onMouseLeave={() => {
                                        if (collapsed) {
                                          setHoveredItem(null);
                                          setHoveredItemLabel(null);
                                          setTooltipPosition(null);
                                        }
                                      }}
                                    >
                                      <ChildIcon
                                        className={cn(
                                          'flex-shrink-0',
                                          collapsed
                                            ? 'md:h-5 md:w-5'
                                            : 'h-4 w-4'
                                        )}
                                      />
                                      <span
                                        className={cn(
                                          'truncate',
                                          collapsed ? 'md:hidden' : ''
                                        )}
                                      >
                                        {child.label}
                                      </span>
                                    </Link>
                                  );
                                })}
                            </div>
                          )}
                        </>
                      ) : (
                        // Regular navigation item
                        <Link
                          href={item.href}
                          className={cn(
                            'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                            isActive
                              ? 'bg-buttonActive font-medium text-white'
                              : 'text-gray-700 hover:bg-gray-100 hover:text-white dark:hover:bg-gray-800 dark:hover:text-white'
                          )}
                          onClick={() => {
                            // Close sidebar on mobile when a link is clicked
                            if (
                              typeof window !== 'undefined' &&
                              window.innerWidth < 768
                            ) {
                              setIsOpen(false);
                            }
                          }}
                          onMouseEnter={e => {
                            if (collapsed) {
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              setTooltipPosition({
                                top: rect.top + rect.height / 2,
                                left: rect.right + 8,
                              });
                              setHoveredItem(item.href);
                              setHoveredItemLabel(item.label);
                            }
                          }}
                          onMouseLeave={() => {
                            setHoveredItem(null);
                            setHoveredItemLabel(null);
                            setTooltipPosition(null);
                          }}
                        >
                          <Icon className={collapsed ? 'h-7 w-7' : 'h-5 w-5'} />
                          <span
                            className={cn(
                              'truncate',
                              collapsed ? 'md:hidden' : ''
                            )}
                          >
                            {item.label}
                          </span>
                        </Link>
                      )}
                    </div>
                  );
                })
            )}
          </nav>
          {/* Currency Filter Section - Mobile Only */}
          {collapsed && (
            <div className="border-t border-border/50 px-3 py-3 md:hidden">
              <div className="mb-2 text-xs font-medium text-gray-700">
                Currency
              </div>
              <div className="w-full">
                <Select
                  value={displayCurrency}
                  onValueChange={value => {
                    const newCurrency = value as CurrencyCode;
                    // Update BOTH currency states to keep them in sync
                    setDisplayCurrency(newCurrency);
                    setDashboardCurrency(newCurrency);

                    // Close sidebar immediately on mobile after selecting a currency
                    if (
                      typeof window !== 'undefined' &&
                      window.innerWidth < 768
                    ) {
                      setIsOpen(false);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 w-full text-sm [&>span:first-child]:absolute [&>span:first-child]:left-0 [&>span:first-child]:right-0 [&>span:first-child]:flex [&>span:first-child]:justify-center [&>span:first-child]:text-center">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100000]">
                    <SelectItem value="USD" className="text-center">
                      $ USD
                    </SelectItem>
                    <SelectItem value="TTD" className="text-center">
                      TT$ TTD
                    </SelectItem>
                    <SelectItem value="GYD" className="text-center">
                      GY$ GYD
                    </SelectItem>
                    <SelectItem value="BBD" className="text-center">
                      Bds$ BBD
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* User Profile Section: User information and profile controls */}
          <div className="relative mt-auto border-t border-border/50 px-3 py-3">
            {profileLoading ? (
              // Profile skeleton loader
              <div className="flex w-full items-center gap-3 rounded-md px-2 py-2">
                {/* Square skeleton for avatar */}
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-200" />
                {/* Text skeletons - hidden when collapsed */}
                <div
                  className={cn(
                    'min-w-0 max-w-[8rem] space-y-1',
                    collapsed ? 'md:hidden' : ''
                  )}
                >
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                </div>
                {/* Dropdown arrow skeleton - hidden when collapsed */}
                <div
                  className={cn(
                    'ml-auto h-4 w-4 animate-pulse rounded bg-gray-200',
                    collapsed ? 'md:hidden' : ''
                  )}
                />
              </div>
            ) : (
              <button
                ref={triggerRef}
                onClick={e => {
                  e.stopPropagation(); // Prevent event bubbling to click-outside handler

                  setMenuOpen(!menuOpen); // Toggle the menu state

                  // Only position outside on desktop (md+) when collapsed
                  if (
                    collapsed &&
                    typeof window !== 'undefined' &&
                    window.innerWidth >= 768
                  ) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDropdownPosition({
                      top: rect.top - 100, // Raise it up by 100px
                      left: rect.right + 8,
                    });
                  } else {
                    setDropdownPosition(null);
                  }
                }}
                className="flex w-full items-center gap-3 rounded-md bg-accent/30 px-2 py-2 text-left transition-colors hover:bg-accent/50"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                  <Image
                    src={avatarUrl || DEFAULT_AVATAR}
                    alt="avatar"
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                    onError={() => setAvatarUrl(DEFAULT_AVATAR)}
                    suppressHydrationWarning
                  />
                </div>
                {/* Hide user info when collapsed on desktop only */}
                <div
                  className={cn(
                    'min-w-0 max-w-[8rem]',
                    collapsed ? 'md:hidden' : ''
                  )}
                >
                  <div className="truncate text-sm font-medium text-gray-900">
                    {displayName}
                  </div>
                  <div className="truncate text-xs text-gray-600">{email}</div>
                </div>
                {menuOpen ? (
                  <ChevronUp
                    className={cn(
                      'ml-auto h-4 w-4 text-gray-600',
                      collapsed ? 'md:hidden' : ''
                    )}
                  />
                ) : (
                  <ChevronDown
                    className={cn(
                      'ml-auto h-4 w-4 text-gray-600',
                      collapsed ? 'md:hidden' : ''
                    )}
                  />
                )}
              </button>
            )}
            {menuOpen &&
              (typeof window === 'undefined' ||
                window.innerWidth < 768 ||
                !collapsed) && (
                <div
                  data-custom-dropdown
                  className="absolute bottom-14 left-3 right-3 z-[60] rounded-md border bg-white p-1 shadow-lg"
                >
                  <div className="flex items-center gap-3 px-2 py-2">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                      <Image
                        src={avatarUrl || DEFAULT_AVATAR}
                        alt="avatar"
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                        onError={() => setAvatarUrl(DEFAULT_AVATAR)}
                        suppressHydrationWarning
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-900">
                        {displayName}
                      </div>
                      <div className="truncate text-xs text-gray-600">
                        {email}
                      </div>
                    </div>
                  </div>
                  <div className="my-1 h-px bg-gray-200" />
                  <button
                    className="w-full cursor-pointer rounded-sm px-2 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
                    onClick={() => {
                      setMenuOpen(false);
                      setProfileOpen(true);
                    }}
                  >
                    Account
                  </button>
                  <button
                    className="w-full cursor-pointer rounded-sm px-2 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
                    onClick={async () => {
                      setMenuOpen(false);
                      await logoutUser();
                      clearUser();
                      router.push('/login');
                    }}
                  >
                    Log out
                  </button>
                </div>
              )}
          </div>
          <ProfileModal
            open={profileOpen}
            onClose={() => {
              setProfileOpen(false);
            }}
          />
        </div>
      </SidebarContainer>

      {/* Tooltip Section: Hover tooltips for collapsed sidebar navigation */}
      {collapsed && hoveredItem && hoveredItemLabel && tooltipPosition && (
        <div
          className="pointer-events-none fixed z-[99999] -translate-y-1/2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white shadow-xl"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          {/* Check if this is a parent item that's not expanded - show children list */}
          {(() => {
            // Find the item by matching the uniqueKey pattern
            const hoveredItemData = items.find((item, idx) => {
              const itemKey = `${item.label}-${idx}`;
              return itemKey === hoveredItem;
            });
            if (
              hoveredItemData &&
              hoveredItemData.children &&
              hoveredItemData.children.length > 0 &&
              !expandedSections.has(hoveredItem)
            ) {
              // Show parent label and list of children
              return (
                <div className="space-y-1">
                  <div className="font-medium whitespace-nowrap">{hoveredItemLabel}</div>
                  <div className="space-y-0.5 border-t border-gray-700 pt-1">
                    {hoveredItemData.children
                      .filter(child => {
                        if (child.permissionCheck && user?.roles) {
                          return child.permissionCheck(user.roles);
                        }
                        return navigationPermissions[child.href] ?? true;
                      })
                      .map((child, idx) => (
                        <div key={idx} className="text-xs text-gray-300 whitespace-nowrap">
                          {child.label}
                        </div>
                      ))}
                  </div>
                </div>
              );
            }
            // Regular tooltip for single items or expanded parents
            return (
              <div className="whitespace-nowrap">{hoveredItemLabel}</div>
            );
          })()}
          <div className="absolute right-full top-1/2 h-0 w-0 -translate-y-1/2 border-y-4 border-r-4 border-y-transparent border-r-gray-900"></div>
        </div>
      )}

      {/* Profile Dropdown Section: User profile dropdown for collapsed sidebar */}
      {collapsed &&
        menuOpen &&
        dropdownPosition &&
        typeof window !== 'undefined' &&
        window.innerWidth >= 768 && (
          <div
            data-custom-dropdown
            className="fixed z-[99999] w-64 rounded-md border bg-white p-1 shadow-xl"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
          >
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                <Image
                  src={avatarUrl || DEFAULT_AVATAR}
                  alt="avatar"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                  onError={() => setAvatarUrl(DEFAULT_AVATAR)}
                  suppressHydrationWarning
                />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-gray-900">
                  {displayName}
                </div>
                <div className="truncate text-xs text-gray-600">{email}</div>
              </div>
            </div>
            <div className="my-1 h-px bg-gray-200" />
            <button
              className="w-full cursor-pointer rounded-sm px-2 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
              onClick={() => {
                setMenuOpen(false);
                setProfileOpen(true);
              }}
            >
              Account
            </button>
            <button
              className="w-full cursor-pointer rounded-sm px-2 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
              onClick={async () => {
                setMenuOpen(false);
                await logoutUser();
                clearUser();
                router.push('/login?logout=success');
              }}
            >
              Log out
            </button>
            <div className="absolute right-full top-4 h-0 w-0 border-y-4 border-r-4 border-y-transparent border-r-gray-200"></div>
          </div>
        )}
    </ClientOnly>
  );
}
