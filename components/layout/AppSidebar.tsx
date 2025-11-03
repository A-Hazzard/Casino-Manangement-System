'use client';

import ProfileModal from '@/components/layout/ProfileModal';
import { ClientOnly } from '@/components/ui/ClientOnly';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SidebarContainer, useSidebar } from '@/components/ui/sidebar';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { logoutUser } from '@/lib/helpers/clientAuth';
import { fetchUserId } from '@/lib/helpers/user';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';
import { shouldShowNavigationLinkDb } from '@/lib/utils/permissionsDb';
import { CACHE_KEYS, fetchUserWithCache } from '@/lib/utils/userCache';
import {
  BarChart3,
  Clock,
  FileText,
  MapPin,
  MonitorSpeaker,
  PanelLeft,
  Receipt,
  UserCog,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
const DEFAULT_AVATAR = '/defaultAvatar.svg';

type Item = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const items: Item[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: BarChart3,
  },
  {
    label: 'Locations',
    href: '/locations',
    icon: MapPin,
  },
  {
    label: 'Cabinets',
    href: '/cabinets',
    icon: MonitorSpeaker,
  },
  {
    label: 'Collection Report',
    href: '/collection-report',
    icon: Receipt,
  },
  {
    label: 'Sessions',
    href: '/sessions',
    icon: Clock,
  },
  {
    label: 'Members',
    href: '/members',
    icon: Users,
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: FileText,
  },
  {
    label: 'Administration',
    href: '/administration',
    icon: UserCog,
  },
];

export default function AppSidebar() {
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

  const router = useRouter();

  // Close sidebar on mobile when pathname changes (navigation occurs)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsOpen(false);
    }
  }, [pathname, setIsOpen]);

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
          let pageName = item.href === '/' ? 'dashboard' : item.href.slice(1);
          // Map cabinets to machines for permission checking
          if (pageName === 'cabinets') {
            pageName = 'machines';
          }
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
          <nav className="relative flex-1 space-y-1 overflow-hidden px-2 py-4">
            {navigationLoading
              ? // Show loading skeleton for all items with square icon skeletons
                items.map(item => (
                  <div
                    key={item.href}
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
              : // Render items based on pre-loaded permissions
                items
                  .filter(item => navigationPermissions[item.href])
                  .map(item => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(item.href + '/');

                    return (
                      <div key={item.href} className="relative">
                        <Link
                          href={item.href}
                          className={cn(
                            'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                            active
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
                            }
                          }}
                          onMouseLeave={() => {
                            setHoveredItem(null);
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

                        {/* Tooltip for collapsed sidebar */}
                        {collapsed &&
                          hoveredItem === item.href &&
                          tooltipPosition && (
                            <div
                              className="pointer-events-none absolute z-50 rounded bg-gray-900 px-2 py-1 text-sm text-white shadow-lg"
                              style={{
                                top: tooltipPosition.top,
                                left: tooltipPosition.left,
                              }}
                            >
                              {item.label}
                            </div>
                          )}
                      </div>
                    );
                  })}
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
                    const newCurrency = value as 'USD' | 'TTD' | 'GYD' | 'BBD';
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
                  <SelectTrigger className="h-8 w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100000]">
                    <SelectItem value="USD">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">$</span>
                        <span className="text-sm text-gray-600">USD</span>
                        <span className="text-xs text-gray-500">US Dollar</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="TTD">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">TT$</span>
                        <span className="text-sm text-gray-600">TTD</span>
                        <span className="text-xs text-gray-500">
                          Trinidad Dollar
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="GYD">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">GY$</span>
                        <span className="text-sm text-gray-600">GYD</span>
                        <span className="text-xs text-gray-500">
                          Guyana Dollar
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="BBD">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Bds$</span>
                        <span className="text-sm text-gray-600">BBD</span>
                        <span className="text-xs text-gray-500">
                          Barbados Dollar
                        </span>
                      </div>
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
                <span
                  className={cn(
                    'ml-auto text-gray-600',
                    collapsed ? 'md:hidden' : ''
                  )}
                >
                  ?
                </span>
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
      {collapsed && hoveredItem && tooltipPosition && (
        <div
          className="pointer-events-none fixed z-[99999] -translate-y-1/2 whitespace-nowrap rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white shadow-xl"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          {items.find(item => item.href === hoveredItem)?.label}
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
                router.push('/login');
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
