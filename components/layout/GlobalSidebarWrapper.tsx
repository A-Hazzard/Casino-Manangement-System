"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import { SidebarOverlay } from "@/components/ui/sidebar";
import { setupAxiosInterceptors } from "@/lib/utils/axiosInterceptor";

export default function GlobalSidebarWrapper() {
  const pathname = usePathname();

  // Initialize axios interceptors for database mismatch detection
  useEffect(() => {
    setupAxiosInterceptors();
  }, []);

  if (pathname === "/login") return null;
  return (
    <>
      <AppSidebar />
      <SidebarOverlay />
    </>
  );
}
