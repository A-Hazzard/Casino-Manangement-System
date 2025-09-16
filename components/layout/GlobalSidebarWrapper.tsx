"use client";

import { usePathname } from "next/navigation";
import AppSidebar from "@/components/layout/AppSidebar";
import { SidebarOverlay } from "@/components/ui/sidebar";

export default function GlobalSidebarWrapper() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return (
    <>
      <AppSidebar />
      <SidebarOverlay />
    </>
  );
}


