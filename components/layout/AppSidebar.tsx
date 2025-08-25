"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarContainer, useSidebar } from "@/components/ui/sidebar";
import {
  SquareTerminal,
  Settings,
  Boxes,
  BookOpenText,
  Users,
  MapPin,
  ClipboardList,
} from "lucide-react";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/lib/store/userStore";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ProfileModal from "@/components/layout/ProfileModal";
import { logoutUser } from "@/lib/helpers/auth";
import { fetchUserId } from "@/lib/helpers/user";

const DEFAULT_AVATAR = "/defaultAvatar.svg";

type Item = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const items: Item[] = [
  { label: "Dashboard", href: "/", icon: SquareTerminal },
  { label: "Locations", href: "/locations", icon: MapPin },
  { label: "Cabinets", href: "/cabinets", icon: Boxes },
  {
    label: "Collection Report",
    href: "/collection-report",
    icon: ClipboardList,
  },
  { label: "Members", href: "/members", icon: Users },
  { label: "Reports", href: "/reports", icon: BookOpenText },
  { label: "Administration", href: "/administration", icon: Settings },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed, setIsOpen } = useSidebar();
  const { user } = useUserStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);
  const [displayName, setDisplayName] = useState<string>("User");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    // Seed with store info
    const seedEmail = user?.emailAddress || "";
    setEmail(seedEmail);
    setDisplayName(seedEmail ? seedEmail.split("@")[0] : "User");
  }, [user?.emailAddress]);

  useEffect(() => {
    // Try to fetch full user doc to get profilePicture and username
    (async () => {
      try {
        // Skip API call if we're in development and auth is bypassed
        const isDevAuthBypassed =
          process.env.NODE_ENV === "development" &&
          typeof window !== "undefined" &&
          window.location.hostname === "localhost";

        if (isDevAuthBypassed && user?.emailAddress) {
          // In development with auth bypassed, just use store data
          setEmail(user.emailAddress);
          setDisplayName(user.emailAddress.split("@")[0] || "User");
          return;
        }

        const id = await fetchUserId();
        if (!id) {
          // If no user ID from token API, but user exists in store, use store data
          if (user?.emailAddress) {
            setEmail(user.emailAddress);
            setDisplayName(user.emailAddress.split("@")[0] || "User");
            return;
          }
          return;
        }
        const res = await fetch(`/api/users/${id}`, { credentials: "include" });
        if (!res.ok) {
          // If API call fails but user exists in store, use store data
          if (user?.emailAddress) {
            setEmail(user.emailAddress);
            setDisplayName(user.emailAddress.split("@")[0] || "User");
          }
          return;
        }
        const data = await res.json();
        const u = data?.user;
        if (u) {
          if (u.profilePicture) setAvatarUrl(u.profilePicture as string);
          if (u.username) setDisplayName(u.username as string);
          if (u.email) setEmail(u.email as string);
        }
      } catch (error) {
        // If any error occurs but user exists in store, use store data
        if (user?.emailAddress) {
          setEmail(user.emailAddress);
          setDisplayName(user.emailAddress.split("@")[0] || "User");
        }
        console.warn("Failed to fetch user profile data:", error);
      }
    })();
    // Listen for profile updates from the modal to refresh avatar immediately
    const onProfileUpdated = (e: Record<string, unknown>) => {
      const detail = (e?.detail || {}) as Record<string, unknown>;
      if (detail.profilePicture) setAvatarUrl(detail.profilePicture as string);
      if (detail.username) setDisplayName(detail.username as string);
      if (detail.email) setEmail(detail.email as string);
    };
    if (typeof window !== "undefined") {
      window.addEventListener(
        "profile-updated",
        onProfileUpdated as unknown as EventListener
      );
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "profile-updated",
          onProfileUpdated as unknown as EventListener
        );
      }
    };
  }, [user?.emailAddress]);

  return (
    <SidebarContainer>
      <div className="relative flex h-full w-full flex-col">
        <div className="px-3 py-5 border-b border-border/50 flex items-center gap-3">
          {/* Mobile: close sidebar; Desktop: collapse/expand */}
          <button
            aria-label="Close sidebar"
            onClick={() => setIsOpen(false)}
            className="p-2 rounded hover:bg-accent md:hidden"
            title="Close sidebar"
          >
            <PanelLeft className="h-6 w-6" />
          </button>
          <button
            aria-label="Toggle sidebar"
            onClick={toggleCollapsed}
            className="p-2 rounded hover:bg-accent hidden md:inline-flex"
            title="Toggle sidebar"
          >
            <PanelLeft className={collapsed ? "h-6 w-6" : "h-5 w-5"} />
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
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-buttonActive text-white font-medium"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                style={{
                  color: active ? "white" : "black",
                }}
              >
                <Icon className={collapsed ? "h-7 w-7" : "h-5 w-5"} />
                {/* Show text on mobile when sidebar is open, hide on desktop when collapsed */}
                <span className={cn("truncate", collapsed ? "hidden" : "")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-3 py-3 border-t border-border/50 relative">
          <button
            ref={triggerRef}
            onClick={() => setMenuOpen((v) => !v)}
            className="w-full flex items-center gap-3 rounded-md px-2 py-2 bg-accent/30 hover:bg-accent/50 transition-colors text-left"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
              <Image
                src={avatarUrl || DEFAULT_AVATAR}
                alt="avatar"
                width={32}
                height={32}
                className="h-8 w-8 object-cover rounded-full"
                onError={() => setAvatarUrl(DEFAULT_AVATAR)}
              />
            </div>
            {/* Hide user info when collapsed */}
            <div
              className={cn("min-w-0 max-w-[8rem]", collapsed ? "hidden" : "")}
            >
              <div
                className="text-sm font-medium truncate"
                style={{ color: "black" }}
              >
                {displayName}
              </div>
              <div className="text-xs truncate" style={{ color: "#374151" }}>
                {email}
              </div>
            </div>
            <span
              className={cn("ml-auto", collapsed ? "hidden" : "")}
              style={{ color: "#374151" }}
            >
              ▾
            </span>
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute left-3 right-3 bottom-14 z-[60] rounded-md border bg-background p-1 shadow-md"
            >
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
                  <Image
                    src={avatarUrl || DEFAULT_AVATAR}
                    alt="avatar"
                    width={32}
                    height={32}
                    className="h-8 w-8 object-cover rounded-full"
                    onError={() => setAvatarUrl(DEFAULT_AVATAR)}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {displayName}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {email}
                  </div>
                </div>
              </div>
              <div className="my-1 h-px bg-border" />
              <button
                role="menuitem"
                className="w-full text-left cursor-pointer rounded-sm px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setMenuOpen(false);
                  setProfileOpen(true);
                }}
              >
                Account
              </button>
              <button
                role="menuitem"
                className="w-full text-left cursor-pointer rounded-sm px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setMenuOpen(false);
                  logoutUser();
                }}
              >
                Log out
              </button>
            </div>
          )}
        </div>
        <ProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
      </div>
    </SidebarContainer>
  );
}
